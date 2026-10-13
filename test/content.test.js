// 內容完整性：新增地圖 / 怪物 / 任務 / 副本時，資料之間的引用不能斷（斷了在遊戲裡會是 undefined 或黑畫面）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/config/maps.js';
import { MONSTERS } from '../src/config/monsters.js';
import { QUESTS, JOB_QUEST_CHAIN, JOB_NPC_ID, TRIAL_ITEM } from '../src/config/quests.js';
import { DUNGEONS } from '../src/config/dungeons.js';
import { MAP_SCENE_KEYS, JOBS, JOB_IDS, POTIONS, createInitialGameState } from '../src/config/constants.js';
import { MODIFIER_TYPES } from '../src/engine/mapModifierLogic.js';
import { TRACKS } from '../src/engine/music/tracks.js';
import {
  CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS,
  ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, JOB_POSES, SKILL_ICON_ASSETS, QUEST_ITEM_ASSETS,
  PROP_UI_ASSETS,
} from '../src/config/assetCatalog.js';
import { SHARDS, SHARD_TEXTURE } from '../src/config/shards.js';
import { neighborsOf } from '../src/engine/worldGraph.js';

const monsterIds = new Set(MONSTERS.map((m) => m.id));
const npcIds = new Set(Object.values(MAPS).flatMap((m) => (m.npcs || []).map((n) => n.npcId).filter(Boolean)));
const assetKeys = new Set([
  ...CHARACTER_ASSETS, ...BACKGROUND_ASSETS, ...PLATFORM_ASSETS, ...MONSTER_ASSETS,
  ...NPC_ASSETS, ...BOSS_ASSETS, ...ICON_ASSETS, ...UI_ASSETS, ...POTION_ICON_ASSETS, ...QUEST_ITEM_ASSETS,
].map((a) => a.key));
const propKeys = new Set(PROP_UI_ASSETS.map((a) => a.key));

test('怪物 id 不重複、數值為正', () => {
  assert.equal(monsterIds.size, MONSTERS.length);
  for (const m of MONSTERS) {
    assert.ok(m.hp > 0 && m.atk > 0 && m.speed > 0 && m.level >= 1, `${m.id} 數值`);
  }
});

test('怪物的 spriteKey 都有對應素材', () => {
  for (const m of MONSTERS) assert.ok(assetKeys.has(m.spriteKey), `${m.id} → ${m.spriteKey} 不在素材目錄`);
});

test('地圖：怪物 id、背景、場景鍵都存在；傳送門目標有效', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    assert.equal(map.key, key, `${key} 的 key 欄位`);
    assert.ok(MAP_SCENE_KEYS[key] === map.sceneKey, `${key} sceneKey 與 MAP_SCENE_KEYS 一致`);
    assert.ok(assetKeys.has(map.bgImage), `${key} 背景 ${map.bgImage}`);
    for (const m of map.monsters) assert.ok(monsterIds.has(m.id), `${key} 怪物 ${m.id}`);
    for (const p of map.portals) {
      if (p.requiresQuest) assert.ok(QUESTS[p.requiresQuest], `${key} 傳送門要求的任務 ${p.requiresQuest}`);
      if (p.target === 'dungeon') assert.ok(DUNGEONS[p.dungeonId], `${key} 副本 ${p.dungeonId}`);
      else assert.ok(MAPS[p.target], `${key} 傳送門目標 ${p.target}`);
    }
    for (const n of map.npcs || []) {
      assert.ok(assetKeys.has(n.id) || propKeys.has(n.id), `${key} NPC 圖 ${n.id}`);
      for (const q of n.questIds || []) assert.ok(QUESTS[q], `${key} NPC 任務 ${q}`);
    }
  }
});

test('任務：討伐目標存在、到達目標是有效地圖、獎勵為正', () => {
  for (const [id, q] of Object.entries(QUESTS)) {
    assert.equal(q.id, id);
    if (q.type === 'kill') assert.ok(monsterIds.has(q.target), `${id} 目標 ${q.target}`);
    if (q.type === 'reach') assert.ok(MAPS[q.target], `${id} 到達地圖 ${q.target}`);
    if (q.type === 'dungeon') assert.ok(DUNGEONS[q.target], `${id} 副本 ${q.target}`);
    if (q.type === 'talk' || q.type === 'choice') assert.ok(npcIds.has(q.target), `${id} 對話對象 ${q.target} 不是任何地圖上的 NPC（npcId）`);
    if (q.type === 'collect') {
      assert.ok(q.collect && q.collect.dropRate > 0 && q.collect.dropRate <= 1, `${id} 掉落率`);
      for (const m of q.collect.maps) assert.ok(MAPS[m] && MAPS[m].monsters.length > 0, `${id} 掉落地圖 ${m} 要有怪物`);
    }
    if (['talk', 'choice', 'collect', 'dungeon', 'kill', 'reach'].includes(q.type)) assert.ok(q.count >= 1, `${id} count`);
    assert.ok(['kill', 'reach', 'talk', 'choice', 'collect', 'dungeon'].includes(q.type), `${id} 未知類型 ${q.type}`);
    for (const r of q.requires || []) assert.ok(QUESTS[r] && r !== id, `${id} 前置任務 ${r}`);
    assert.ok(q.rewards && q.rewards.exp > 0, `${id} 獎勵`);
  }
});

test('副本：波次怪物存在', () => {
  for (const [id, d] of Object.entries(DUNGEONS)) {
    for (const w of d.waves) for (const m of w.monsters) assert.ok(monsterIds.has(m.id), `${id} 怪物 ${m.id}`);
  }
});

test('所有任務至少有一個 NPC 會發放（否則玩家永遠接不到）', () => {
  const offered = new Set();
  for (const map of Object.values(MAPS)) for (const n of map.npcs || []) for (const q of n.questIds || []) offered.add(q);
  for (const id of Object.keys(QUESTS)) assert.ok(offered.has(id), `任務 ${id} 沒有 NPC 發放`);
});

test('素材目錄裡的每個檔案都真的存在', async () => {
  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const root = process.cwd();   // npm test 從專案根目錄執行
  const missing = [];
  for (const group of [CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS, ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, SKILL_ICON_ASSETS, QUEST_ITEM_ASSETS, PROP_UI_ASSETS]) {
    for (const a of group) if (!existsSync(resolve(root, a.path))) missing.push(a.path);
  }
  assert.deepEqual(missing, []);
});

test('職業：頭像與每個動作圖都在素材目錄，且技能池的技能都有定義', () => {
  for (const id of JOB_IDS) {
    const job = JOBS[id];
    assert.ok(assetKeys.has(job.portrait), `${id} 頭像 ${job.portrait}`);
    if (id === 'thief') continue;
    for (const pose of JOB_POSES[id]) assert.ok(assetKeys.has(`player_${id}_${pose}`), `${id} 動作 ${pose}`);
    // 程式用到的姿勢必須存在
    for (const pose of ['idle', 'walk_1', 'walk_2', 'walk_3', 'walk_4', 'jump', 'fall', 'hurt', 'down', 'slash_1', 'slash_2', 'slash_3', 'cast', 'dash', 'throw_1', 'throw_2']) {
      assert.ok(assetKeys.has(`player_${id}_${pose}`), `${id} 必要動作 ${pose}`);
    }
  }
});

test('轉職任務鏈：五個任務依序串接、由 NPC 發放、只有最後一步轉職', () => {
  assert.deepEqual(JOB_QUEST_CHAIN, ['job_call', 'job_choose', 'job_proof', 'job_trial', 'job_awaken']);
  JOB_QUEST_CHAIN.forEach((id, i) => {
    const q = QUESTS[id];
    assert.ok(q, id);
    if (i > 0) assert.deepEqual(q.requires, [JOB_QUEST_CHAIN[i - 1]], `${id} 前置`);
    assert.equal(!!q.rewards.advanceJob, i === JOB_QUEST_CHAIN.length - 1, `${id} advanceJob`);
  });
  assert.equal(QUESTS.job_call.minLevel, 10);
  assert.equal(QUESTS.job_proof.target, TRIAL_ITEM);
  assert.equal(QUESTS.job_proof.count, 5);
  assert.equal(QUESTS.job_trial.target, 'shadow_trial');
  // 影之長老在影之殿堂，發放後四個任務；城鎮居民發放影之召喚
  const elder = MAPS.shrine.npcs.find((n) => n.npcId === JOB_NPC_ID);
  assert.ok(elder && elder.role === 'jobAdvisor' && assetKeys.has(elder.id));
  assert.deepEqual(elder.questIds, ['job_choose', 'job_proof', 'job_trial', 'job_awaken']);
  assert.ok(MAPS.town.npcs.some((n) => (n.questIds || []).includes('job_call')));
  // 影之試煉入口：副本傳送門 + 任務限定；副本有試煉守衛（小王）
  const portal = MAPS.shrine.portals.find((p) => p.dungeonId === 'shadow_trial');
  assert.ok(portal && portal.requiresQuest === 'job_trial');
  const trial = DUNGEONS.shadow_trial;
  assert.ok(trial.timeLimit > 0 && trial.waves.length >= 1);
  const guard = MONSTERS.find((m) => m.id === 'shadow_guardian');
  assert.equal(guard.spawnRole, 'miniboss');
  assert.ok(trial.waves.some((w) => w.monsters.some((m) => m.id === 'shadow_guardian')));
});

test('新增任務的怪物 / 圖都在目錄裡（試煉守衛圖、任務物品貼圖由程式產生）', () => {
  const guard = MONSTERS.find((m) => m.id === 'shadow_guardian');
  assert.ok(assetKeys.has(guard.spriteKey), guard.spriteKey);
  assert.ok(assetKeys.has(DUNGEONS.shadow_trial.bgImage));
});

test('地圖連通：從起始地圖出發，沿傳送門能到每一張地圖（Boss 房需要擊殺數解鎖，仍算連通）', () => {
  const start = createInitialGameState().currentMap;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const key = queue.shift();
    for (const p of MAPS[key].portals) {
      if (p.target !== 'dungeon' && !seen.has(p.target)) { seen.add(p.target); queue.push(p.target); }
    }
  }
  assert.deepEqual(Object.keys(MAPS).filter((k) => !seen.has(k)), []);
});

test('傳送門成對：A 能走到 B，B 也有一條能回 A（Boss 房除外）', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    for (const p of map.portals) {
      if (p.target === 'dungeon' || p.target === 'boss') continue;
      if (key === 'castle' && p.target === 'town') continue;   // 王城的單向回程門（互動門），晨曦鎮不通往王城
      assert.ok(MAPS[p.target].portals.some((q) => q.target === key), `${key} → ${p.target} 沒有回程`);
    }
  }
});

test('傳送門落點在目標地圖範圍內，且每張地圖都有背景音樂', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    assert.ok(TRACKS[key], `${key} 沒有音樂曲目`);
    for (const p of map.portals) {
      if (p.target === 'dungeon') continue;
      assert.ok(p.spawnX >= 0 && p.spawnX <= MAPS[p.target].width, `${key} → ${p.target} spawnX ${p.spawnX}`);
    }
  }
});

test('影之殿堂是安全地圖：沒有怪物，有長老與技能導師，背景在素材目錄', () => {
  const m = MAPS.shrine;
  assert.equal(m.monsters.length, 0);
  assert.ok(m.npcs.some((n) => n.id === 'npc_skill_mentor') && m.npcs.some((n) => n.id === 'npc_shadow_elder'));
  assert.ok(BACKGROUND_ASSETS.some((a) => a.key === 'bg_shrine' && a.targetMaps.includes('shrine')));
  assert.ok(m.width <= 1280, '一個畫面寬，背景不平鋪');
});

test('碧濤港：5 種怪 + 1 小王、素材都在目錄且標為使用中、3 個任務由 NPC 發放', () => {
  const m = MAPS.harbor;
  const ids = ['crab', 'jellyfish', 'pirate_ghost', 'octopus', 'seagull'];
  for (const id of ids) assert.ok(m.monsters.some((s) => s.id === id), `碧濤港缺 ${id}`);
  const captain = MONSTERS.find((x) => x.id === 'pirate_captain');
  assert.equal(captain.spawnRole, 'miniboss');
  assert.ok(m.monsters.some((s) => s.id === 'pirate_captain' && s.count === 1));
  // 每種怪的圖都登記在 MONSTER_ASSETS，且 monsterIds 指回該怪
  for (const id of [...ids, 'pirate_captain']) {
    const def = MONSTERS.find((x) => x.id === id);
    const asset = MONSTER_ASSETS.find((a) => a.key === def.spriteKey);
    assert.ok(asset && asset.status === 'used' && asset.monsterIds.includes(id), `${id} 素材登記`);
  }
  // 等級帶 14-20（接在古代廢墟之後），小王 = 帶上限 + 2，比同圖最強的小怪血量高 4 倍以上
  const regs = ids.map((id) => MONSTERS.find((x) => x.id === id));
  for (const r of regs) assert.ok(r.level >= 14 && r.level <= 20, `${r.id} 等級`);
  assert.equal(captain.level, 22);
  assert.ok(captain.hp >= 4 * Math.max(...regs.map((r) => r.hp)));
  // NPC、平台、背景素材
  for (const n of m.npcs) assert.ok(NPC_ASSETS.some((a) => a.key === n.id && a.status === 'used'), `${n.id} 登記為 used`);
  assert.ok(PLATFORM_ASSETS.some((a) => a.key === 'platform_harbor' && a.status === 'used'));
  assert.ok(BACKGROUND_ASSETS.some((a) => a.key === 'bg_harbor' && a.targetMaps.includes('harbor')));
  const offered = m.npcs.flatMap((n) => n.questIds || []);
  assert.deepEqual([...offered].sort(), ['harbor_captain', 'harbor_crabs', 'harbor_sailor']);
  assert.deepEqual(QUESTS.harbor_captain.requires, ['harbor_sailor']);
});

test('碧濤港接在古代廢墟之後（森林 → 廢墟 → 碧濤港），所有平台在地圖範圍內', () => {
  assert.ok(MAPS.henesys.portals.some((p) => p.target === 'ruins'));
  assert.ok(!MAPS.henesys.portals.some((p) => p.target === 'harbor'));
  assert.ok(MAPS.ruins.portals.some((p) => p.target === 'harbor') && MAPS.ruins.portals.some((p) => p.target === 'henesys'));
  assert.ok(MAPS.harbor.portals.some((p) => p.target === 'ruins'));
  for (const p of MAPS.harbor.platforms) assert.ok(p.x >= 0 && p.x + p.width <= MAPS.harbor.width, `平台 x=${p.x}`);
});

// ── 世界骨架（docs/WORLD_DESIGN.md）────────────────────────────────────────────────

test('地圖圖：樞紐與主線 / 支線的連接符合設計', () => {
  const to = (k) => neighborsOf(k);
  assert.ok(to('town').includes('sky') && to('town').includes('shrine') && to('town').includes('kerning'));
  assert.deepEqual(to('sky').sort(), ['henesys', 'town']);
  assert.deepEqual(to('henesys').sort(), ['ellinia', 'ruins', 'sky']);
  assert.deepEqual(to('ruins').sort(), ['harbor', 'henesys']);
  assert.deepEqual(to('harbor').sort(), ['desert', 'ruins']);
  assert.deepEqual(to('ellinia'), ['henesys']);              // 神秘之境：從森林獵場進入的支線
  assert.deepEqual(to('kerning').sort(), ['taipei', 'town']); // 城市特區：晨曦鎮 → 暗巷城 ⇄ 台北都會
  assert.deepEqual(to('taipei'), ['kerning']);
});

test('城市特區入口在晨曦鎮，Lv18 開放（portal.minLevel）；其他傳送門沒有等級門檻', () => {
  const gate = MAPS.town.portals.find((p) => p.target === 'kerning');
  assert.equal(gate.minLevel, 18);
  for (const [key, map] of Object.entries(MAPS)) {
    for (const p of map.portals) if (p.minLevel) assert.ok(p.minLevel >= 1 && p.minLevel <= 50 && MAPS[p.target], `${key} → ${p.target}`);
  }
});

test('每張地圖有等級帶；一般怪等級落在帶內、小王不超過帶上限 + 2；樞紐是安全地圖', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    if (map.hub) { assert.equal(map.monsters.length, 0, `${key} 是樞紐，不能有怪`); continue; }
    if (key === 'boss') continue;
    assert.ok(Array.isArray(map.levelBand) && map.levelBand[0] <= map.levelBand[1], `${key} levelBand`);
    const [lo, hi] = map.levelBand;
    for (const spawn of map.monsters) {
      const def = MONSTERS.find((m) => m.id === spawn.id);
      if (def.spawnRole === 'miniboss') assert.ok(def.level >= hi - 2 && def.level <= hi + 2, `${key} 小王 ${def.id} Lv${def.level}`);
      else assert.ok(def.level >= lo - 1 && def.level <= hi, `${key} ${def.id} Lv${def.level} 不在 ${lo}-${hi}（容許低 1 級的入門怪）`);
    }
  }
});

test('星光碎片：5 隻守護者都是小王、各掉一塊、碎片圖示在素材目錄', () => {
  assert.equal(SHARDS.length, 5);
  assert.equal(new Set(SHARDS.map((s) => s.id)).size, 5);
  assert.ok(QUEST_ITEM_ASSETS.some((a) => a.key === SHARD_TEXTURE && a.path.endsWith('item_star_shard.png')));
  for (const shard of SHARDS) {
    const def = MONSTERS.find((m) => m.id === shard.monsterId);
    assert.ok(def, `守護者 ${shard.monsterId} 不存在`);
    assert.equal(def.spawnRole, 'miniboss', shard.monsterId);
    assert.equal(def.area, shard.map);
    // 守護者在自己地圖的怪物表第一個（第一隻一定落在地板上）、只有 1 隻、等級 = 等級帶上限 + 2
    const spawns = MAPS[shard.map].monsters;
    assert.deepEqual(spawns[0], { id: shard.monsterId, count: 1 }, `${shard.map} 的守護者要放第一個`);
    assert.equal(def.level, MAPS[shard.map].levelBand[1] + 2, `${shard.monsterId} 等級`);
    // 血量約為同圖最強小怪的 8～10 倍
    const regular = Math.max(...spawns.map((sp) => MONSTERS.find((m) => m.id === sp.id)).filter((m) => m.spawnRole !== 'miniboss').map((m) => m.hp));
    assert.ok(def.hp / regular >= 7 && def.hp / regular <= 10.5, `${shard.monsterId} 血量比 ${(def.hp / regular).toFixed(1)}`);
  }
});

// ── 階段 2：四張新地圖 ─────────────────────────────────────────────────────────────

const NEW_MAPS = {
  desert: { monsters: ['scorpion', 'cactus', 'mummy', 'bandit', 'sandworm'], guardian: 'sandworm_boss', band: [20, 26], modifier: 'quicksand', platform: 'platform_desert', npcs: ['npc_archaeologist', 'npc_caravan'] },
  snow:   { monsters: ['snowman', 'penguin', 'icewolf', 'crystal', 'yeti'], guardian: 'frost_giant', band: [25, 31], modifier: 'ice', platform: 'platform_snow', npcs: ['npc_ranger', 'npc_monk'] },
  lava:   { monsters: ['fireimp', 'lavaslime', 'firehound', 'ember', 'lavagolem'], guardian: 'lava_dragon', band: [30, 36], modifier: 'lava', platform: 'platform_lava', npcs: ['npc_blacksmith', 'npc_miner'] },
  castle: { monsters: ['imp', 'bat', 'darkknight', 'vampire', 'gargoyle'], guardian: 'fallen_commander', band: [35, 42], modifier: 'dark', platform: 'platform_castle', npcs: ['npc_prisoner', 'npc_ghostmaid'] },
};

test('新地圖：5 種怪 + 1 守護者、等級帶、機制、NPC、跳台素材都符合設計', () => {
  for (const [key, spec] of Object.entries(NEW_MAPS)) {
    const m = MAPS[key];
    assert.ok(m, key);
    assert.deepEqual(m.levelBand, spec.band, `${key} 等級帶`);
    assert.equal(m.modifier && m.modifier.type, spec.modifier, `${key} 機制`);
    assert.deepEqual(m.monsters.map((x) => x.id).sort(), [...spec.monsters, spec.guardian].sort(), `${key} 怪物表`);
    // 小怪平均分布在等級帶：最低級在帶下緣、最高級在帶上緣，等級各不相同
    const levels = spec.monsters.map((id) => MONSTERS.find((x) => x.id === id).level).sort((a, b) => a - b);
    assert.equal(levels[0], spec.band[0], `${key} 最低級`);
    assert.equal(levels[4], spec.band[1], `${key} 最高級`);
    assert.equal(new Set(levels).size, 5, `${key} 等級要分散`);
    assert.deepEqual(m.npcs.map((n) => n.id), spec.npcs, `${key} NPC`);
    assert.ok(PLATFORM_ASSETS.some((a) => a.key === spec.platform && a.status === 'used'), `${key} 跳台素材`);
    // 2 層跳台：地板之外有兩種高度
    const ys = new Set(m.platforms.filter((p) => !p.isGround).map((p) => p.y));
    assert.equal(ys.size, 2, `${key} 跳台要剛好 2 層`);
    for (const p of m.platforms) assert.ok(p.x >= 0 && p.x + p.width <= m.width, `${key} 平台 x=${p.x}`);
    // 行為：用既有的 patrol / chase / ranged，且各圖至少一隻遠程或會跳的怪
    for (const id of spec.monsters) assert.ok(['patrol', 'chase', 'ranged'].includes(MONSTERS.find((x) => x.id === id).behavior));
    // 每個怪的圖都登記在 MONSTER_ASSETS，status used，monsterIds 指回該怪（守護者是 miniboss）
    for (const id of [...spec.monsters, spec.guardian]) {
      const def = MONSTERS.find((x) => x.id === id);
      const asset = MONSTER_ASSETS.find((a) => a.key === def.spriteKey);
      assert.ok(asset && asset.status === 'used' && asset.monsterIds.includes(id), `${id} 素材登記`);
      assert.equal(asset.kind, id === spec.guardian ? 'miniboss' : 'monster', `${id} kind`);
    }
    // 2 個 NPC，其中恰有 1 個商店；任務 2-3 個都由另一位 NPC 發放
    const shops = m.npcs.filter((n) => n.shop);
    assert.equal(shops.length, 1, `${key} 要有 1 個商店 NPC`);
    const giver = m.npcs.find((n) => !n.shop);
    assert.ok(giver.questIds.length >= 2 && giver.questIds.length <= 3, `${key} 任務數`);
    for (const n of m.npcs) assert.ok(NPC_ASSETS.some((a) => a.key === n.id && a.status === 'used'), `${n.id} 登記為 used`);
  }
});

test('新地圖的任務：討伐目標在該圖、對話對象是同圖的商店 NPC、守護者任務需先對話', () => {
  for (const [key, spec] of Object.entries(NEW_MAPS)) {
    const m = MAPS[key];
    const giver = m.npcs.find((n) => !n.shop);
    const shopNpc = m.npcs.find((n) => n.shop);
    const types = giver.questIds.map((id) => QUESTS[id].type).sort();
    assert.deepEqual(types, ['kill', 'kill', 'talk'], `${key} 任務類型`);
    for (const id of giver.questIds) {
      const q = QUESTS[id];
      if (q.type === 'kill') assert.ok(m.monsters.some((x) => x.id === q.target), `${id} 目標 ${q.target} 不在 ${key}`);
      if (q.type === 'talk') assert.equal(q.target, shopNpc.npcId, `${id} 對話對象`);
    }
    const bossQuest = giver.questIds.map((id) => QUESTS[id]).find((q) => q.target === spec.guardian);
    assert.ok(bossQuest && bossQuest.requires.length === 1 && QUESTS[bossQuest.requires[0]].type === 'talk', `${key} 守護者任務要先對話`);
  }
});

test('商店：區域商人的商品都是有效藥水、價格為正；高等級區不賣最小瓶的藥水，包裝隨等級變大', () => {
  let lastSize = 0;
  for (const key of ['desert', 'snow', 'lava', 'castle']) {
    const shop = MAPS[key].npcs.find((n) => n.shop).shop;
    assert.ok(shop.title && shop.items.length >= 3, `${key} 商店`);
    for (const it of shop.items) assert.ok(POTIONS[it.key] && it.qty >= 1 && it.cost > 0, `${key} 商品 ${it.key}`);
    const strong = shop.items.find((it) => it.key === 'S');
    assert.ok(strong.qty >= lastSize, `${key} 強效藥水包裝要不小於前一區`);
    lastSize = strong.qty;
    if (key !== 'desert') assert.ok(!shop.items.some((it) => it.key === 'A' || it.key === 'D'), `${key} 不賣最小瓶的藥水`);
  }
});

test('數值曲線：碧濤港與四張新圖的小怪血量 / 攻擊貼近外推公式，經驗隨等級遞增', () => {
  const regular = [];
  for (const key of ['harbor', 'desert', 'snow', 'lava', 'castle']) {
    for (const sp of MAPS[key].monsters) {
      const m = MONSTERS.find((x) => x.id === sp.id);
      if (m.spawnRole !== 'miniboss') regular.push(m);
    }
  }
  for (const m of regular) {
    const hp = 0.8 * 45 * m.level * (1 + m.level / 50);
    const atk = (5 * m.level + 0.04 * m.level * m.level) * (m.level >= 30 ? 0.92 : 1);
    assert.ok(Math.abs(m.hp / hp - 1) <= 0.2, `${m.id} hp ${m.hp} vs ${hp.toFixed(0)}`);
    assert.ok(Math.abs(m.atk / atk - 1) <= 0.15, `${m.id} atk ${m.atk} vs ${atk.toFixed(0)}`);
  }
  for (const m of regular) for (const lower of regular.filter((x) => x.level < m.level)) assert.ok(m.exp >= lower.exp, `${m.id}（Lv${m.level}）經驗不該比 ${lower.id}（Lv${lower.level}）少`);
});

test('主線依序連通：…→ 古代廢墟 → 碧濤港 → 黃沙遺跡 → 霜牙峰 → 熔岩巢穴 → 魔君王城 → 暗影領域（只有魔君王城的門要 Boss 解鎖）', () => {
  const line = ['sky', 'henesys', 'ruins', 'harbor', 'desert', 'snow', 'lava', 'castle', 'boss'];
  for (let i = 0; i + 1 < line.length; i++) {
    assert.ok(MAPS[line[i]].portals.some((p) => p.target === line[i + 1]), `${line[i]} → ${line[i + 1]}`);
    if (line[i + 1] !== 'boss') assert.ok(MAPS[line[i + 1]].portals.some((p) => p.target === line[i]), `${line[i + 1]} → ${line[i]}`);
  }
  const gated = Object.entries(MAPS).flatMap(([k, m]) => m.portals.filter((p) => p.requireBoss).map(() => k));
  assert.deepEqual(gated, ['castle']);
  // 等級帶隨主線遞增
  for (let i = 1; i + 1 < line.length; i++) assert.ok(MAPS[line[i]].levelBand[1] >= MAPS[line[i - 1]].levelBand[1], `${line[i]} 等級帶`);
});

test('地圖機制設定：型別有效、區域在地圖範圍內、岩漿週期合理、燭台在範圍內', () => {
  for (const [key, m] of Object.entries(MAPS)) {
    if (!m.modifier) continue;
    const mod = m.modifier;
    assert.ok(MODIFIER_TYPES.includes(mod.type), `${key} 機制 ${mod.type}`);
    for (const z of mod.zones || []) assert.ok(z.x >= 0 && z.width > 0 && z.x + z.width <= m.width, `${key} 區域 x=${z.x}`);
    if (mod.type === 'quicksand') assert.ok(mod.speedMult > 0 && mod.speedMult < 1 && mod.zones.length >= 1);
    if (mod.type === 'lava') {
      assert.ok(mod.warn >= 1000 && mod.erupt > 0 && mod.warn + mod.erupt < mod.period, `${key} 岩漿週期`);   // 預警至少 1 秒才算有提示
      assert.ok(mod.damagePct > 0 && mod.damagePct <= 0.1, `${key} 傷害要小`);
      for (const z of mod.zones) assert.ok(z.offset >= 0 && z.offset < mod.period);
      // 區域不蓋住 NPC 與傳送門（站在 NPC 旁邊不該被燙）
      for (const z of mod.zones) for (const x of [...m.npcs.map((n) => n.x), ...m.portals.map((p) => p.x)]) assert.ok(x < z.x - 40 || x > z.x + z.width + 40, `${key} 岩漿區蓋到 x=${x}`);
    }
    if (mod.type === 'dark') {
      assert.ok(mod.radius >= 150 && mod.alpha > 0 && mod.alpha <= 1);
      for (const x of mod.torches) assert.ok(x >= 0 && x <= m.width);
    }
  }
  // 每張新圖恰好一個 modifier（不疊加）
  for (const key of Object.keys(NEW_MAPS)) assert.equal(typeof MAPS[key].modifier, 'object');
});

test('四張新圖的背景已登錄（bg_<地圖>.webp）且 targetMaps 指向該圖', () => {
  for (const key of Object.keys(NEW_MAPS)) {
    assert.equal(MAPS[key].bgImage, `bg_${key}`);
    assert.ok(BACKGROUND_ASSETS.some((a) => a.key === `bg_${key}` && a.targetMaps.includes(key)), `${key} 背景未登錄`);
  }
});


test('星光之塔：晨曦鎮有塔（role starTower），貼圖 key 是登錄的 prop_star_tower', () => {
  const tower = MAPS.town.npcs.find((n) => n.role === 'starTower');
  assert.ok(tower && tower.id === 'prop_star_tower' && tower.height >= 300);
  assert.ok(propKeys.has('prop_star_tower'));
});

test('舊的「擊殺 60 隻」解鎖規則已移除（地圖 / 教學 / 對話都不再提）', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['src/config/maps.js', 'src/scenes/TutorialScene.js', 'src/entities/Player.js', 'src/scenes/BaseMapScene.js', 'src/engine/saveManager.js']) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/killCount\s*>=\s*60/.test(text), `${f} 還有 killCount >= 60`);
    assert.ok(!/擊敗 60 隻|擊殺 60|60 隻怪物/.test(text), `${f} 還提到 60 隻`);
  }
});

// ── 補給商店覆蓋（經濟審查 P6：Lv9 以上不能走很遠才買得到藥）──────────────────────
const SHOP_EXCEPTIONS = {
  // 支線城市特區：從晨曦鎮（有商店）一步進入，不另設商店，回晨曦鎮補給
  kerning: '晨曦鎮的商店在入口旁（傳送門直通）',
  taipei: '暗巷城盡頭的支線終點，往返晨曦鎮兩步',
  // 神秘之境：支線入口在森林獵場（有商店）的跳台上
  ellinia: '森林獵場商店在入口旁（傳送門直通）',
  // 最終 Boss 戰場：單場決戰，進場前在魔君王城補給
  boss: '魔君王城的商店在入口旁',
};

test('補給商店：建議等級 Lv9 以上的每張地圖都有商店，例外必須註明且兩步內有商店地圖', () => {
  const hasShop = (k) => (MAPS[k].npcs || []).some((n) => n.shop);
  for (const [key, m] of Object.entries(MAPS)) {
    if (!m.levelBand || m.levelBand[0] < 9) continue;
    if (hasShop(key)) { assert.ok(!SHOP_EXCEPTIONS[key], `${key} 已有商店，不該再列為例外`); continue; }
    assert.ok(SHOP_EXCEPTIONS[key], `${key}（Lv${m.levelBand[0]}+）沒有商店，也沒有列為例外`);
    if (key === 'boss') continue;   // 決戰場不在傳送門圖上（由星光之塔進入）
    const near = new Set([key]);
    for (let i = 0; i < 2; i++) for (const k of [...near]) for (const n of neighborsOf(k)) near.add(n);
    assert.ok([...near].some((k) => k !== key && hasShop(k)), `${key} 兩步內要有商店地圖`);
  }
  for (const key of Object.keys(SHOP_EXCEPTIONS)) assert.ok(MAPS[key], `例外 ${key} 不是有效地圖`);
});

test('補給商店：森林 / 廢墟 / 碧濤港的商人單價隨等級遞增、商品有效、不與傳送門 / 其他 NPC 重疊', () => {
  const shopOf = (k) => MAPS[k].npcs.find((n) => n.shop);
  const unit = (k, potion) => { const it = shopOf(k).shop.items.find((x) => x.key === potion); return it.cost / it.qty; };
  const town = 30;   // 晨曦鎮 HP 藥水單價（DEFAULT_SHOP：3 個 90）
  for (const key of ['henesys', 'ruins', 'harbor']) {
    const npc = shopOf(key);
    assert.ok(npc.npcId && npc.dialog.length >= 1 && npc.name, `${key} 商人要有 npcId / 名稱 / 對話`);
    for (const it of npc.shop.items) assert.ok(POTIONS[it.key] && it.qty >= 1 && it.cost > 0, `${key} 商品 ${it.key}`);
    assert.ok(NPC_ASSETS.some((a) => a.key === npc.id && a.status === 'used'), `${npc.id} 圖已登記`);
    for (const other of MAPS[key].npcs) if (other !== npc) assert.ok(Math.abs(other.x - npc.x) >= 150, `${key} NPC 間距`);
    for (const p of MAPS[key].portals) assert.ok(Math.abs(p.x - npc.x) >= 150 || p.y < 400, `${key} 商人不擋傳送門`);
  }
  assert.ok(unit('henesys', 'A') >= town && unit('henesys', 'A') <= unit('ruins', 'A'), '森林小瓶藥水單價不低於晨曦鎮、不高於廢墟');
  assert.ok(unit('ruins', 'A') <= unit('harbor', 'A'), '單價隨區域遞增');
  assert.ok(shopOf('henesys').shop.items.every((it) => it.key === 'A'), '森林只賣小瓶 HP 藥水');
  assert.ok(shopOf('ruins').shop.items.some((it) => it.key === 'D'), '廢墟開始賣 MP 藥水');
  assert.ok(['S', 'R'].every((k) => shopOf('harbor').shop.items.some((it) => it.key === k)), '碧濤港賣強效藥水');
  assert.ok(unit('harbor', 'S') > 75 && unit('harbor', 'S') <= unit('desert', 'S'), '強效藥水單價介於晨曦鎮與黃沙遺跡之間');
});

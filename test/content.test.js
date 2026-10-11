// 內容完整性：新增地圖 / 怪物 / 任務 / 副本時，資料之間的引用不能斷（斷了在遊戲裡會是 undefined 或黑畫面）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/config/maps.js';
import { MONSTERS } from '../src/config/monsters.js';
import { QUESTS, JOB_QUEST_CHAIN, JOB_NPC_ID, TRIAL_ITEM } from '../src/config/quests.js';
import { DUNGEONS } from '../src/config/dungeons.js';
import { MAP_SCENE_KEYS, JOBS, JOB_IDS, createInitialGameState } from '../src/config/constants.js';
import { TRACKS } from '../src/engine/music/tracks.js';
import {
  CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS,
  ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, JOB_POSES, SKILL_ICON_ASSETS, QUEST_ITEM_ASSETS,
} from '../src/config/assetCatalog.js';

const monsterIds = new Set(MONSTERS.map((m) => m.id));
const npcIds = new Set(Object.values(MAPS).flatMap((m) => (m.npcs || []).map((n) => n.npcId).filter(Boolean)));
const assetKeys = new Set([
  ...CHARACTER_ASSETS, ...BACKGROUND_ASSETS, ...PLATFORM_ASSETS, ...MONSTER_ASSETS,
  ...NPC_ASSETS, ...BOSS_ASSETS, ...ICON_ASSETS, ...UI_ASSETS, ...POTION_ICON_ASSETS,
].map((a) => a.key));

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
      assert.ok(assetKeys.has(n.id), `${key} NPC 圖 ${n.id}`);
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
  for (const group of [CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS, ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, SKILL_ICON_ASSETS, QUEST_ITEM_ASSETS]) {
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

test('傳送門成對：A 能走到 B，B 也有一條能回 A（Boss 房與台北→暗巷城的環狀單向除外）', () => {
  const ONE_WAY = new Set(['taipei>kerning']);
  for (const [key, map] of Object.entries(MAPS)) {
    for (const p of map.portals) {
      if (p.target === 'dungeon' || p.target === 'boss' || ONE_WAY.has(`${key}>${p.target}`)) continue;
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
  // 等級帶 12-18，小王比同圖最強的小怪血量高 4 倍以上
  const regs = ids.map((id) => MONSTERS.find((x) => x.id === id));
  for (const r of regs) assert.ok(r.level >= 12 && r.level <= 18, `${r.id} 等級`);
  assert.equal(captain.level, 18);
  assert.ok(captain.hp >= 4 * Math.max(...regs.map((r) => r.hp)));
  // NPC、平台、背景素材
  for (const n of m.npcs) assert.ok(NPC_ASSETS.some((a) => a.key === n.id && a.status === 'used'), `${n.id} 登記為 used`);
  assert.ok(PLATFORM_ASSETS.some((a) => a.key === 'platform_harbor' && a.status === 'used'));
  assert.ok(BACKGROUND_ASSETS.some((a) => a.key === 'bg_harbor' && a.targetMaps.includes('harbor')));
  const offered = m.npcs.flatMap((n) => n.questIds || []);
  assert.deepEqual([...offered].sort(), ['harbor_captain', 'harbor_crabs', 'harbor_sailor']);
  assert.deepEqual(QUESTS.harbor_captain.requires, ['harbor_sailor']);
});

test('碧濤港接在森林獵場與古代廢墟之間，所有平台在地圖範圍內', () => {
  assert.ok(MAPS.henesys.portals.some((p) => p.target === 'harbor'));
  assert.ok(!MAPS.henesys.portals.some((p) => p.target === 'ruins'));
  assert.ok(MAPS.harbor.portals.some((p) => p.target === 'henesys') && MAPS.harbor.portals.some((p) => p.target === 'ruins'));
  assert.ok(MAPS.ruins.portals.some((p) => p.target === 'harbor'));
  for (const p of MAPS.harbor.platforms) assert.ok(p.x >= 0 && p.x + p.width <= MAPS.harbor.width, `平台 x=${p.x}`);
});

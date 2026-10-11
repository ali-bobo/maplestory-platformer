// 內容完整性：新增地圖 / 怪物 / 任務 / 副本時，資料之間的引用不能斷（斷了在遊戲裡會是 undefined 或黑畫面）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/config/maps.js';
import { MONSTERS } from '../src/config/monsters.js';
import { QUESTS, JOB_QUEST_CHAIN, JOB_NPC_ID, TRIAL_ITEM } from '../src/config/quests.js';
import { DUNGEONS } from '../src/config/dungeons.js';
import { MAP_SCENE_KEYS, JOBS, JOB_IDS } from '../src/config/constants.js';
import {
  CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS,
  ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, JOB_POSES, SKILL_ICON_ASSETS,
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
  for (const group of [CHARACTER_ASSETS, BACKGROUND_ASSETS, PLATFORM_ASSETS, MONSTER_ASSETS, NPC_ASSETS, BOSS_ASSETS, ICON_ASSETS, UI_ASSETS, POTION_ICON_ASSETS, FX_ASSETS, SKILL_ICON_ASSETS]) {
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
  // 影之長老在晨曦鎮，發放後四個任務；城鎮居民發放影之召喚
  const elder = MAPS.town.npcs.find((n) => n.npcId === JOB_NPC_ID);
  assert.ok(elder && elder.role === 'jobAdvisor' && assetKeys.has(elder.id));
  assert.deepEqual(elder.questIds, ['job_choose', 'job_proof', 'job_trial', 'job_awaken']);
  assert.ok(MAPS.town.npcs.some((n) => (n.questIds || []).includes('job_call')));
  // 影之試煉入口：副本傳送門 + 任務限定；副本有試煉守衛（小王）
  const portal = MAPS.town.portals.find((p) => p.dungeonId === 'shadow_trial');
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

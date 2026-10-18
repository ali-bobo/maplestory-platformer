import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcScore, baseStatsForLevel, applyDeathPenalty, countEquipment, LEVEL_GROWTH,
} from '../src/engine/death.js';
import { createInitialGameState, expNeeded, BOSS_FALLBACK_MAP } from '../src/config/constants.js';
import { generateEquipment } from '../src/config/equipment.js';

// 與 Player 的升級 / 換裝邏輯同步地推進狀態，用來驗證「由等級重算」與實際遊玩一致
function simulateLevelUps(gs, toLevel) {
  while (gs.level < toLevel) {
    gs.level++;
    gs.maxHp += 20; gs.maxMp += 12; gs.atk += 5; gs.speed = Math.min(320, gs.speed + 2);
  }
  gs.expNeeded = expNeeded(gs.level);
}
function equip(gs, slot) {
  const e = generateEquipment(slot, gs.level);
  gs.equipment[slot] = e;
  gs.atk += e.atk; gs.maxHp += e.hp; gs.maxMp += e.mp; gs.speed = Math.min(320, gs.speed + e.speed);
}

test('LEVEL_GROWTH 與 Player._onLevelUp 的常數一致', () => {
  assert.deepEqual(LEVEL_GROWTH, { maxHp: 20, maxMp: 12, atk: 5, speed: 2 });
});

test('分數公式：等級×100 + 擊殺×10 + 金幣÷10（+通關 5000）', () => {
  const gs = { level: 12, killCount: 80, meso: 1234 };
  assert.equal(calcScore(gs), 1200 + 800 + 123);
  assert.equal(calcScore(gs, true), 1200 + 800 + 123 + 5000);
  assert.equal(calcScore(createInitialGameState()), 100);
});

test('分數對壞輸入穩健：NaN / 負數 / 缺欄位 / null', () => {
  assert.equal(calcScore(null), 100);
  assert.equal(calcScore({}), 100);
  assert.equal(calcScore({ level: NaN, killCount: -5, meso: 'x' }), 100);
  assert.equal(calcScore({ level: 3.9, killCount: 2.9, meso: 19.9 }), 300 + 20 + 1);
});

test('baseStatsForLevel(1) 等於初始屬性，且與逐級升級的結果相同', () => {
  const fresh = createInitialGameState();
  assert.deepEqual(baseStatsForLevel(1), { maxHp: fresh.maxHp, maxMp: fresh.maxMp, atk: fresh.atk, speed: fresh.speed });
  for (const lv of [2, 10, 30, 50]) {
    const gs = createInitialGameState();
    simulateLevelUps(gs, lv);
    assert.deepEqual(baseStatsForLevel(lv), { maxHp: gs.maxHp, maxMp: gs.maxMp, atk: gs.atk, speed: gs.speed }, `Lv${lv}`);
  }
});

test('死亡懲罰：失去全部裝備、屬性回到無裝備的等級基礎值、其餘進度保留', () => {
  const gs = createInitialGameState();
  simulateLevelUps(gs, 15);
  for (const slot of ['weapon', 'armor', 'gloves', 'helmet', 'boots']) equip(gs, slot);
  gs.meso = 900; gs.killCount = 70; gs.exp = 40; gs.skillPoints = 4;
  gs.unlockedSkills = ['Z', 'X', 'C', 'V']; gs.skillLevels = { Z: 5, X: 3, C: 2, V: 1, B: 0 };
  gs.potions = { A: 7, S: 1, D: 0, R: 2, G: 3 };
  gs.quests = { active: [{ id: 'slime_hunt', progress: 2 }], completed: ['reach_town'] };
  gs.currentMap = 'mystic'; gs.hp = 0;
  assert.equal(countEquipment(gs), 5);

  const r = applyDeathPenalty(gs, 777.8);
  assert.equal(countEquipment(r), 0);
  assert.deepEqual(
    { maxHp: r.maxHp, maxMp: r.maxMp, atk: r.atk, speed: r.speed },
    baseStatsForLevel(15),
  );
  assert.equal(r.hp, r.maxHp);
  assert.equal(r.mp, r.maxMp);
  assert.equal(r.level, 15);
  assert.equal(r.exp, 40);
  assert.equal(r.meso, 900);
  assert.equal(r.killCount, 70);
  assert.equal(r.skillPoints, 4);
  assert.deepEqual(r.skillLevels, { Z: 5, X: 3, C: 2, V: 1, B: 0 });
  assert.deepEqual(r.potions, { A: 7, S: 1, D: 0, R: 2, G: 3 });
  assert.deepEqual(r.quests, gs.quests);
  assert.equal(r.currentMap, 'mystic');
  assert.equal(r.spawnX, 777);
});

test('死亡懲罰不修改傳入的狀態', () => {
  const gs = createInitialGameState();
  equip(gs, 'weapon');
  const snapshot = JSON.parse(JSON.stringify(gs));
  applyDeathPenalty(gs, 100);
  assert.deepEqual(JSON.parse(JSON.stringify(gs)), snapshot);
});

test('副本死亡 → 晨曦鎮重生；Boss 房死亡 → 主線最後一張地圖重生；兩者都用預設出生點', () => {
  const inDungeon = createInitialGameState(); inDungeon.currentMap = 'dungeon';
  const d = applyDeathPenalty(inDungeon, 999);
  assert.equal(d.currentMap, 'town');
  assert.notEqual(d.spawnX, 999);
  const inBoss = createInitialGameState(); inBoss.currentMap = 'boss';
  const b = applyDeathPenalty(inBoss, 999);
  assert.equal(b.currentMap, BOSS_FALLBACK_MAP);
  assert.notEqual(b.spawnX, 999);
});

test('沒給 deathX（或非有限值）時使用地圖預設出生點；負值被夾到 0', () => {
  const gs = createInitialGameState(); gs.currentMap = 'ruins';
  const base = applyDeathPenalty(gs).spawnX;
  assert.equal(applyDeathPenalty(gs, NaN).spawnX, base);
  assert.equal(applyDeathPenalty(gs, undefined).spawnX, base);
  assert.equal(applyDeathPenalty(gs, -50).spawnX, 0);
});

test('懲罰後的狀態可再存讀：沒有裝備加成殘留（等級 30 速度上限）', () => {
  const gs = createInitialGameState();
  simulateLevelUps(gs, 30);
  for (const slot of ['gloves', 'boots']) equip(gs, slot);
  const r = applyDeathPenalty(gs, 100);
  assert.equal(r.speed, Math.min(320, 220 + 2 * 29));
  assert.deepEqual(applyDeathPenalty(r, 100), r);   // 冪等
});

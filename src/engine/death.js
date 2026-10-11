// 死亡結算：分數計算與死亡懲罰（純邏輯，無 Phaser / DOM 依賴，可單元測試）
//
// 死亡規則：
//  - 保留等級、經驗、金幣、技能、藥水、任務與擊殺數。
//  - 失去身上所有裝備，裝備提供的屬性一併移除（屬性由等級重新推算）。
//  - 在死亡的地圖重生（副本 → 晨曦鎮、Boss 房 → 暗巷城）；HP / MP 回滿。

import { createInitialGameState } from '../config/constants.js';
import { EQUIPMENT_SLOTS } from '../config/equipment.js';
import { sanitizeState } from './saveManager.js';

// 每升一級的屬性成長，需與 Player._onLevelUp 保持一致（test/death.test.js 以固定值鎖定）
export const LEVEL_GROWTH = { maxHp: 20, maxMp: 12, atk: 5, speed: 2 };
const SPEED_CAP = 320;

// 分數 = 等級 × 100 + 擊殺數 × 10 + 金幣 ÷ 10；通關另加 5000
export const SCORE_WEIGHTS = { level: 100, kill: 10, mesoDivisor: 10, victoryBonus: 5000 };

export function calcScore(gs, victory = false) {
  const s = gs || {};
  const level = Math.max(1, Math.floor(Number(s.level) || 1));
  const kills = Math.max(0, Math.floor(Number(s.killCount) || 0));
  const meso = Math.max(0, Math.floor(Number(s.meso) || 0));
  return level * SCORE_WEIGHTS.level
    + kills * SCORE_WEIGHTS.kill
    + Math.floor(meso / SCORE_WEIGHTS.mesoDivisor)
    + (victory ? SCORE_WEIGHTS.victoryBonus : 0);
}

export function baseStatsForLevel(level) {
  const n = Math.max(0, Math.floor(level) - 1);
  const base = createInitialGameState();   // 1 級、無裝備的屬性
  return {
    maxHp: base.maxHp + LEVEL_GROWTH.maxHp * n,
    maxMp: base.maxMp + LEVEL_GROWTH.maxMp * n,
    atk: base.atk + LEVEL_GROWTH.atk * n,
    speed: Math.min(SPEED_CAP, base.speed + LEVEL_GROWTH.speed * n),
  };
}

export function countEquipment(gs) {
  const eq = (gs && gs.equipment) || {};
  return EQUIPMENT_SLOTS.filter((slot) => !!eq[slot]).length;
}

// 回傳死亡後重生用的新狀態（不修改傳入的 gs）。deathX 為死亡時的 X 座標，
// 僅在重生地圖與死亡地圖相同時才用來決定出生位置。
export function applyDeathPenalty(gs, deathX) {
  const diedIn = gs && gs.currentMap;
  const s = sanitizeState(gs);
  Object.assign(s, baseStatsForLevel(s.level));
  for (const slot of EQUIPMENT_SLOTS) s.equipment[slot] = null;
  s.hp = s.maxHp;
  s.mp = s.maxMp;
  // 地圖被回退（副本 / Boss）時沿用該地圖的預設出生點
  if (s.currentMap === diedIn && Number.isFinite(deathX)) s.spawnX = Math.max(0, Math.floor(deathX));
  return s;
}

// HP / MP 自然回復（純函式，不依賴 Phaser；Player.recoverHp / recoverMp 與 damageModel 共用）
//
// 舊版是固定每秒 HP +5、MP +10，中等級時一場戰鬥打完站一下就補滿，藥水幾乎用不到。
// 新版：
//  - 每秒回復量 = 底數 + 上限 × 比例（等級越高上限越大，回復也跟著小幅成長）
//    Lv.1（HP 400 / MP 250）：HP 1.4/s、MP 2.75/s；Lv.20（HP 780 / MP 478）：HP ≈2.0/s、MP ≈3.9/s
//    約為舊版的 30~40%（中等級）
//  - 受傷後 HP 暫停回復 HP_DELAY_MS；施放技能後 MP 暫停回復 MP_DELAY_MS（戰鬥中要靠藥水）
//  - 安全區（城鎮等沒有怪物的一般地圖）回復 × SAFE_ZONE_MULT，回城休息仍然很快

export const REGEN = {
  hpBase: 0.8,          // HP 每秒底數
  hpPct: 0.0015,        // HP 每秒 + 最大 HP × 0.15%
  mpBase: 1.5,          // MP 每秒底數
  mpPct: 0.005,         // MP 每秒 + 最大 MP × 0.5%
  hpDelayMs: 4000,      // 受傷後 HP 停止回復的時間
  mpDelayMs: 2000,      // 施放技能後 MP 停止回復的時間
  safeZoneMult: 6,      // 安全區倍率
};

// 舊版的固定回復量（只留給測試比較用）
export const LEGACY_REGEN = { hpPerSec: 5, mpPerSec: 10 };

export function hpRegenPerSec(maxHp, safeZone = false) {
  const base = REGEN.hpBase + Math.max(0, maxHp || 0) * REGEN.hpPct;
  return safeZone ? base * REGEN.safeZoneMult : base;
}

export function mpRegenPerSec(maxMp, safeZone = false) {
  const base = REGEN.mpBase + Math.max(0, maxMp || 0) * REGEN.mpPct;
  return safeZone ? base * REGEN.safeZoneMult : base;
}

/**
 * 回復一幀：回傳新的數值（不超過 max）。
 * 距離上次「打斷事件」（受傷 / 施法，lastEventAt）不到 delayMs 時不回復。
 * lastEventAt 為 null / undefined 表示沒有打斷事件。
 */
export function regenStep(cur, max, perSec, deltaMs, now, lastEventAt, delayMs) {
  if (!(cur < max) || !(deltaMs > 0)) return cur;
  if (lastEventAt != null && now - lastEventAt < delayMs) return cur;
  return Math.min(max, cur + perSec * (deltaMs / 1000));
}

/** 安全區：一般地圖（不是 Boss / 副本）而且沒有設定任何怪物，例如晨曦鎮、影之殿堂 */
export function isSafeZone(mapKey, mapData, inDungeon = false) {
  if (inDungeon || !mapData || mapKey === 'boss') return false;
  return Array.isArray(mapData.monsters) && mapData.monsters.length === 0;
}

/**
 * 連續施放技能時 MP 回復實際開著的時間比例：每次施放暫停 mpDelayMs，
 * 平均每秒施放 castsPerSec 次 → 約 1 − castsPerSec × delay 秒的時間在回復（下限 0）。
 */
export function mpRegenUptime(castsPerSec, delayMs = REGEN.mpDelayMs) {
  return Math.max(0, 1 - Math.max(0, castsPerSec) * (delayMs / 1000));
}

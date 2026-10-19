// 難度（簡單 / 普通 / 困難）：只調整怪物，不改玩家數值。純邏輯，方便單元測試。
//
// 設計重點：
//  - 是玩家偏好，跟音量一樣存在設定（engine/settings.js 的 difficulty），不進存檔、不隨存檔代碼匯出。
//  - 兩個倍率：hp（怪物最大 HP）與 dmg（怪物打玩家的傷害）。怪物對玩家的所有傷害
//    （近戰、特殊招式、投射物、震波）都由 monster.atk 算出，所以在生成時把 atk 乘上 dmg 就全部生效。
//  - 套用點只有一個：Monster 建構子（Boss、副本怪、分裂怪都經過這裡）。
//    遊戲中改難度只影響之後生成的怪物，已在場上的怪維持原數值（重生或換地圖後就會套用）。
//  - 普通 = 1 / 1，與加入難度前完全相同（e2e 與平衡數字不變）。
//  - 環境傷害（熔岩噴發）是依玩家最大 HP 的百分比，不屬於怪物，不受難度影響。

export const DIFFICULTY_IDS = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY = 'normal';

export const DIFFICULTIES = Object.freeze({
  easy:   Object.freeze({ id: 'easy',   label: '簡單', hp: 0.8, dmg: 0.7 }),
  normal: Object.freeze({ id: 'normal', label: '普通', hp: 1,   dmg: 1 }),
  hard:   Object.freeze({ id: 'hard',   label: '困難', hp: 1.4, dmg: 1.3 }),
});

export function isDifficultyId(id) {
  return typeof id === 'string' && DIFFICULTY_IDS.includes(id);
}

/** 取得難度定義；未知值一律當普通 */
export function difficultyOf(id) {
  return DIFFICULTIES[isDifficultyId(id) ? id : DEFAULT_DIFFICULTY];
}

/** 怪物最大 HP：四捨五入、至少 1。倍率 1 時原樣回傳（不改動既有數值） */
export function scaleMonsterHp(hp, id) {
  const m = difficultyOf(id).hp;
  if (m === 1 || !Number.isFinite(hp)) return hp;
  return Math.max(1, Math.round(hp * m));
}

/** 怪物攻擊力（決定對玩家的傷害）：不取整，最後的傷害公式自己會取整。倍率 1 時原樣回傳 */
export function scaleMonsterAtk(atk, id) {
  const m = difficultyOf(id).dmg;
  if (m === 1 || !Number.isFinite(atk)) return atk;
  return atk * m;
}

/** 一次算出怪物生成時的 { hp, atk } */
export function scaleMonsterStats(stats, id) {
  return { hp: scaleMonsterHp(stats.hp, id), atk: scaleMonsterAtk(stats.atk, id) };
}

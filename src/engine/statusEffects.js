// 職業技能用的狀態效果（純邏輯、不依賴 Phaser；效果掛在敵人物件的底線欄位上）：
//  - 斷命印記（刺客）：被標記者下次受到攻擊必暴擊並額外 +30% 傷害，之後印記消失
//  - 蝕心毒鏢（刺客）：持續傷害，可疊加到 3 層，重複命中會刷新持續時間
//  - 迷煙彈（俠盜）：煙霧範圍內的敵人傷害降低 50%、不會追擊
//  - 妙手空空 / 彎刀橫斬的機率與連擊判定
// 視覺（特效、傷害數字）由 src/entities/JobSkills.js 負責。

export const MARK_DURATION_MS = 6000;
export const MARK_DAMAGE_BONUS = 1.3;
export const POISON_MAX_STACKS = 3;
export const POISON_TICKS = 5;           // 5 秒、每秒一跳
export const POISON_TICK_MULT = 0.25;    // 每層每跳 0.25 倍攻擊力
export const SMOKE_DAMAGE_FACTOR = 0.5;
export const SMOKE_DURATION_MS = 5000;
export const SMOKE_RADIUS = 110;
export const STEAL_MESO_CHANCE = 0.35;
export const STEAL_POTION_CHANCE = 0.05;
export const COMBO_WINDOW_MS = 900;

// ── 斷命印記 ────────────────────────────────────────────────────────────────
export function setMark(enemy, now, durationMs = MARK_DURATION_MS) {
  clearMark(enemy, 'replaced');
  enemy._mark = { until: now + durationMs, onClear: null };
  return enemy._mark;
}

export function hasMark(enemy, now) {
  return !!enemy._mark && enemy._mark.until > now;
}

// 清除印記並通知視覺層（reason：'hit' 被打中引爆 / 'expired' 逾時 / 'replaced' 被新印記取代）
export function clearMark(enemy, reason) {
  const m = enemy._mark;
  if (!m) return;
  enemy._mark = null;
  if (m.onClear) m.onClear(reason);
}

// 受到攻擊時呼叫：有效印記 → 回傳 { amount, isCrit }（必暴擊、再 ×1.3）並移除印記；沒有則回傳 null。
// 已經是暴擊的傷害不重複乘暴擊倍率；非暴擊則先換算成暴擊傷害。
export function consumeMark(enemy, now, amount, isCrit, critMulti) {
  const m = enemy._mark;
  if (!m) return null;
  if (m.until <= now) { clearMark(enemy, 'expired'); return null; }
  const base = isCrit ? amount : amount * critMulti;
  clearMark(enemy, 'hit');
  return { amount: Math.max(1, Math.floor(base * MARK_DAMAGE_BONUS)), isCrit: true };
}

// ── 蝕心毒鏢 ────────────────────────────────────────────────────────────────
// 加一層毒（上限 3 層）並把持續時間重設為 5 跳；perTickDmg = 每層每跳的傷害
export function addPoison(enemy, perTickDmg) {
  const st = enemy._poison || (enemy._poison = { stacks: 0, ticksLeft: 0, dmg: 0, timer: null });
  st.stacks = Math.min(POISON_MAX_STACKS, st.stacks + 1);
  st.ticksLeft = POISON_TICKS;
  st.dmg = Math.max(st.dmg, perTickDmg);
  return st;
}

// 跳一次：回傳這一跳的傷害（層數 × 每層傷害）；最後一跳後清掉層數並回傳 0 表示毒已結束
export function tickPoison(st) {
  if (!st || st.ticksLeft <= 0 || st.stacks <= 0) return 0;
  st.ticksLeft -= 1;
  const dmg = Math.max(1, Math.floor(st.dmg * st.stacks));
  if (st.ticksLeft <= 0) { st.stacks = 0; st.dmg = 0; }
  return dmg;
}

// ── 迷煙彈 ──────────────────────────────────────────────────────────────────
// zones：[{ x, y, r, until }]；(x, y) 在任一未過期的煙霧範圍內回傳 true
export function inSmoke(zones, x, y, now) {
  if (!zones) return false;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (z.until <= now) continue;
    const dx = x - z.x, dy = y - z.y;
    if (dx * dx + dy * dy <= z.r * z.r) return true;
  }
  return false;
}

// 移除已過期的煙霧（就地修改，避免每次施放配置新陣列）
export function pruneSmoke(zones, now) {
  for (let i = zones.length - 1; i >= 0; i--) if (zones[i].until <= now) zones.splice(i, 1);
}

// ── 妙手空空 ────────────────────────────────────────────────────────────────
// r1、r2 為 [0,1) 隨機數；回傳 { meso, potion }
export function rollSteal(r1, r2) {
  return { meso: r1 < STEAL_MESO_CHANCE, potion: r2 < STEAL_POTION_CHANCE };
}

// ── 彎刀橫斬連擊 ────────────────────────────────────────────────────────────
// combo = { count, last }（就地更新）；在視窗內連續出手 count 遞增，超過 every 後回到 1。回傳這一下是第幾下（1..every）
export function comboStep(combo, now, every = 3, windowMs = COMBO_WINDOW_MS) {
  combo.count = now - combo.last <= windowMs && combo.count > 0 ? (combo.count % every) + 1 : 1;
  combo.last = now;
  return combo.count;
}

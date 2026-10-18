// 職業技能用的狀態效果（純邏輯、不依賴 Phaser；效果掛在敵人物件的底線欄位上）：
//  - 斷命印記（刺客）：印記期間（7 秒）被標記者受到的每次攻擊（持續傷害除外）都必暴擊，並把 30% 存進印記；
//    印記結束或目標死亡時「斷命」，把存下的傷害連同一記重斬一次打在周圍
//  - 蝕心毒鏢（刺客）：持續傷害，可疊加到 3 層，重複命中會刷新持續時間；疊滿 3 層立刻毒爆
//  - 迷煙彈（俠盜）：煙霧範圍內的敵人傷害降低 60%、不會追擊，並每秒受到持續傷害
//  - 妙手空空 / 彎刀橫斬的機率與連擊判定
// 視覺（特效、傷害數字）由 src/entities/JobSkills.js 負責。

export const MARK_DURATION_MS = 7000;
export const MARK_HIT_MULT = 1.0;        // 印記落下時的一擊（必暴擊）
export const MARK_STORE_RATIO = 0.25;    // 印記期間每擊把 25% 的傷害存進印記
export const MARK_FINISH_MULT = 2.5;     // 斷命重斬（必暴擊），再加上存下的傷害
export const MARK_FINISH_RADIUS = 130;   // 斷命的範圍（以目標為中心）
export const POISON_MAX_STACKS = 3;
export const POISON_TICKS = 6;           // 6 秒、每秒一跳
export const POISON_TICK_MULT = 0.4;     // 每層每跳 0.4 倍攻擊力
export const POISON_DARTS = 2;           // 一次施放丟出的毒鏢數（每支都能穿透）
export const POISON_DART_MULT = 0.8;
export const POISON_PIERCE = 4;          // 每支毒鏢最多穿透的敵人數
export const POISON_BURST_MULT = 2.2;    // 疊滿 3 層的毒爆（可暴擊），再加上剩下的毒傷
export const POISON_BURST_RADIUS = 110;  // 毒爆會讓這個範圍內的其他敵人中毒 1 層
export const SMOKE_DAMAGE_FACTOR = 0.4;  // 煙霧內的敵人只造成 40% 傷害
export const SMOKE_DURATION_MS = 7000;
export const SMOKE_RADIUS = 150;
export const SMOKE_TICK_MULT = 0.8;      // 煙霧內每名敵人每秒受到的灼燒傷害（倍攻擊力）
export const SMOKE_BLAST_MULT = 1.6;     // 落地爆炸（可暴擊）
export const SMOKE_FINALE_MULT = 1.8;    // 煙霧結束時收縮引爆（可暴擊）
export const STEAL_MESO_CHANCE = 0.6;
export const STEAL_POTION_CHANCE = 0.12;
export const STEAL_MP_REFUND = 10;       // 妙手空空命中回復的 MP
export const COMBO_WINDOW_MS = 900;

// ── 斷命印記 ────────────────────────────────────────────────────────────────
export function setMark(enemy, now, durationMs = MARK_DURATION_MS) {
  clearMark(enemy, 'replaced');
  enemy._mark = { until: now + durationMs, onClear: null, onHit: null, hits: 0, stored: 0 };
  return enemy._mark;
}

export function hasMark(enemy, now) {
  return !!enemy._mark && enemy._mark.until > now;
}

// 清除印記並通知視覺層（reason：'expired' 逾時 / 'died' 目標死亡 / 'replaced' 被新印記取代）；
// onClear(reason, stored) 拿到存下的傷害，由視覺層決定要不要斷命
export function clearMark(enemy, reason) {
  const m = enemy._mark;
  if (!m) return;
  enemy._mark = null;
  if (m.onClear) m.onClear(reason, m.stored || 0);
}

// 受到攻擊時呼叫：有效印記 → 回傳 { amount, isCrit }（必暴擊），並把 amount 的 30% 存進印記；沒有則回傳 null。
// 印記在持續時間內一直有效（不會被打一下就消失），逾時才移除。
// 已經是暴擊的傷害不重複乘暴擊倍率；非暴擊則先換算成暴擊傷害。
export function consumeMark(enemy, now, amount, isCrit, critMulti) {
  const m = enemy._mark;
  if (!m) return null;
  if (m.until <= now) { clearMark(enemy, 'expired'); return null; }
  const base = isCrit ? amount : amount * critMulti;
  const out = Math.max(1, Math.floor(base));
  m.hits = (m.hits || 0) + 1;
  m.stored = (m.stored || 0) + Math.floor(out * MARK_STORE_RATIO);
  if (m.onHit) m.onHit(m.hits, m.stored);
  return { amount: out, isCrit: true };
}

// ── 蝕心毒鏢 ────────────────────────────────────────────────────────────────
// 加一層毒（上限 3 層）並把持續時間重設為 6 跳；perTickDmg = 每層每跳的傷害
export function addPoison(enemy, perTickDmg) {
  const st = enemy._poison || (enemy._poison = { stacks: 0, ticksLeft: 0, dmg: 0, timer: null });
  st.stacks = Math.min(POISON_MAX_STACKS, st.stacks + 1);
  st.ticksLeft = POISON_TICKS;
  st.dmg = Math.max(st.dmg, perTickDmg);
  return st;
}

// 毒爆：回傳剩下還沒跳完的毒傷（層數 × 每層傷害 × 剩餘跳數），並清掉毒
export function detonatePoison(st) {
  if (!st || st.stacks <= 0 || st.ticksLeft <= 0) return 0;
  const rest = Math.floor(st.dmg * st.stacks * st.ticksLeft);
  st.stacks = 0; st.ticksLeft = 0; st.dmg = 0;
  return rest;
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

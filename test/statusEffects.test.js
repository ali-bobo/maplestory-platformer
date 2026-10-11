// 職業技能的狀態效果規則：斷命印記 / 蝕心毒鏢 / 迷煙彈 / 妙手空空 / 彎刀連擊
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  setMark, hasMark, clearMark, consumeMark, MARK_DURATION_MS, MARK_DAMAGE_BONUS,
  addPoison, tickPoison, POISON_MAX_STACKS, POISON_TICKS,
  inSmoke, pruneSmoke, SMOKE_DAMAGE_FACTOR, rollSteal, comboStep,
} from '../src/engine/statusEffects.js';

test('斷命印記：6 秒內有效；下一擊必暴擊並 +30%，之後印記消失', () => {
  const e = {};
  setMark(e, 1000);
  assert.equal(hasMark(e, 1000 + MARK_DURATION_MS - 1), true);
  assert.equal(hasMark(e, 1000 + MARK_DURATION_MS), false);
  // 非暴擊：先換成暴擊傷害（×2.1）再 ×1.3
  const r = consumeMark(e, 2000, 1000, false, 2.1);
  assert.deepEqual(r, { amount: Math.floor(1000 * 2.1 * MARK_DAMAGE_BONUS), isCrit: true });
  assert.equal(e._mark, null);
  assert.equal(consumeMark(e, 2000, 1000, false, 2.1), null);   // 第二擊沒有加成
  // 已經是暴擊：只 ×1.3，不重複乘暴擊倍率
  setMark(e, 0);
  assert.equal(consumeMark(e, 10, 2000, true, 2.1).amount, 2600);
});

test('斷命印記：逾時後被攻擊不引爆；重複標記會取代舊印記並通知視覺層', () => {
  const e = {};
  const reasons = [];
  const m1 = setMark(e, 0);
  m1.onClear = (r) => reasons.push(r);
  assert.equal(consumeMark(e, MARK_DURATION_MS + 1, 500, false, 2), null);
  assert.deepEqual(reasons, ['expired']);
  const m2 = setMark(e, 0);
  m2.onClear = (r) => reasons.push(r);
  setMark(e, 100);
  assert.deepEqual(reasons, ['expired', 'replaced']);
  clearMark(e, 'hit');          // 新印記沒有 onClear 也不會出錯
  assert.equal(e._mark, null);
  clearMark({}, 'hit');         // 沒有印記 → 不做事
  const e2 = {};
  const m3 = setMark(e2, 0);
  m3.onClear = (r) => reasons.push(r);
  consumeMark(e2, 5, 100, false, 2);
  assert.equal(reasons.at(-1), 'hit');
});

test('蝕心毒鏢：5 跳、可疊 3 層，每跳傷害 = 層數 × 每層傷害，重複命中刷新持續時間', () => {
  const e = {};
  const st = addPoison(e, 40);
  assert.equal(st.stacks, 1);
  assert.equal(st.ticksLeft, POISON_TICKS);
  assert.equal(tickPoison(st), 40);
  assert.equal(tickPoison(st), 40);
  addPoison(e, 40);                         // 第 2 層並重設持續時間
  assert.equal(st.stacks, 2);
  assert.equal(st.ticksLeft, POISON_TICKS);
  assert.equal(tickPoison(st), 80);
  addPoison(e, 40); addPoison(e, 40); addPoison(e, 40);
  assert.equal(st.stacks, POISON_MAX_STACKS);   // 上限 3 層
  let total = 0; let n = 0;
  for (;;) { const d = tickPoison(st); if (d === 0) break; total += d; n++; }
  assert.equal(n, POISON_TICKS);
  assert.equal(total, 120 * POISON_TICKS);
  assert.equal(st.stacks, 0);                   // 結束後清層數
  assert.equal(tickPoison(st), 0);
  assert.equal(tickPoison(null), 0);
});

test('迷煙彈：範圍判定含邊界、過期的不算；pruneSmoke 就地移除過期區', () => {
  const zones = [{ x: 100, y: 100, r: 50, until: 5000 }, { x: 400, y: 100, r: 50, until: 1000 }];
  assert.equal(inSmoke(zones, 100, 100, 0), true);
  assert.equal(inSmoke(zones, 150, 100, 0), true);       // 剛好在邊界
  assert.equal(inSmoke(zones, 151, 100, 0), false);
  assert.equal(inSmoke(zones, 400, 100, 500), true);
  assert.equal(inSmoke(zones, 400, 100, 1000), false);   // 已過期
  assert.equal(inSmoke(null, 0, 0, 0), false);
  assert.equal(inSmoke([], 0, 0, 0), false);
  pruneSmoke(zones, 2000);
  assert.equal(zones.length, 1);
  assert.equal(SMOKE_DAMAGE_FACTOR, 0.5);
});

test('妙手空空：35% 金幣、5% 藥水；彎刀橫斬連擊每 3 下一輪、逾時重算', () => {
  assert.deepEqual(rollSteal(0.34, 0.049), { meso: true, potion: true });
  assert.deepEqual(rollSteal(0.35, 0.05), { meso: false, potion: false });
  const c = { count: 0, last: 0 };
  assert.equal(comboStep(c, 100), 1);      // 遊戲剛開始也不會誤判成連擊
  assert.equal(comboStep(c, 600), 2);
  assert.equal(comboStep(c, 1100), 3);     // 第 3 下 = 擊飛
  assert.equal(comboStep(c, 1600), 1);     // 一輪結束重新計
  assert.equal(comboStep(c, 1700), 2);
  assert.equal(comboStep(c, 3000), 1);     // 停手超過視窗 → 重算
  const fresh = { count: 0, last: 0 };
  assert.equal(comboStep(fresh, 50), 1);
});

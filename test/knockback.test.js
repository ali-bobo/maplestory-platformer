// 玩家受擊反應：擊退方向 / 力道 / 硬直長度、重擊判定、何時不擊退
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOCKBACK, HURT_IFRAME_MS, knockbackDir, knockbackDistance, lockHardCapMs, knockbackVelocity, decayKnockbackVx, isHeavyHit, canKnockback, clampForce,
} from '../src/engine/knockback.js';

test('擊退方向：遠離攻擊來源；沒有來源時往面向的反方向', () => {
  assert.equal(knockbackDir(500, 400, true), 1);    // 怪在左邊 → 往右退
  assert.equal(knockbackDir(500, 600, false), -1);  // 怪在右邊 → 往左退
  assert.equal(knockbackDir(500, 600, true), -1);   // 面向無關，來源優先
  assert.equal(knockbackDir(500, undefined, true), -1);
  assert.equal(knockbackDir(500, undefined, false), 1);
  assert.equal(knockbackDir(500, NaN, true), -1);
  assert.equal(knockbackDir(500, 500, true), -1);   // 重疊：退向背後
});

test('力道：速度隨 force 放大、向上彈起有上限、硬直 150~250 ms 遠短於無敵時間', () => {
  const k1 = knockbackVelocity(500, 400, true, 1);
  assert.equal(k1.vx, KNOCKBACK.speed);
  assert.equal(k1.vy, -KNOCKBACK.pop);
  const k2 = knockbackVelocity(500, 600, true, 2);
  assert.equal(k2.vx, -2 * KNOCKBACK.speed);
  assert.ok(k2.vy < k1.vy && k2.vy >= -KNOCKBACK.maxPop);
  assert.ok(knockbackVelocity(0, 1, true, 99).vy >= -KNOCKBACK.maxPop && KNOCKBACK.maxPop < 520, '不會比跳躍高');
  for (const f of [0.3, 1, 1.5, 2, 2.5, 10]) {
    const { lockMs } = knockbackVelocity(0, 1, true, f);
    assert.ok(lockMs >= 150 && lockMs <= 250 && lockMs < HURT_IFRAME_MS, `force ${f} lock ${lockMs}`);
  }
  assert.ok(knockbackVelocity(0, 1, true, 2).lockMs > knockbackVelocity(0, 1, true, 1).lockMs);
  const k0 = knockbackVelocity(500, 400, true, 0);
  assert.equal(k0.lockMs, 0);
  assert.equal(k0.vy, 0);
  assert.equal(clampForce(undefined), 1);
  assert.equal(clampForce(-3), 0);
  assert.equal(clampForce(9), KNOCKBACK.maxForce);
});

test('硬直期間水平速度衰減：方向不變、量變小', () => {
  const v = decayKnockbackVx(300, 100);
  assert.ok(v > 0 && v < 300);
  assert.ok(decayKnockbackVx(-300, 100) < 0);
  assert.equal(decayKnockbackVx(300, 0), 300);
});

test('重擊：force ≥ 1.5 或一下扣 15% 以上 HP', () => {
  assert.equal(isHeavyHit(10, 1000, 1), false);
  assert.equal(isHeavyHit(10, 1000, 1.5), true);
  assert.equal(isHeavyHit(150, 1000, 1), true);
  assert.equal(isHeavyHit(149, 1000, 1), false);
});

test('不擊退：死亡、衝刺、傳送中、對話 / 選單開著', () => {
  assert.equal(canKnockback({}), true);
  for (const k of ['dead', 'dashing', 'transitioning', 'dialogOpen', 'modal']) assert.equal(canKnockback({ [k]: true }), false, k);
});

test('擊退距離：一般受擊約 30~60 px（退一點，不會被打飛），重擊 force 2 約 80~130 px', () => {
  const d1 = knockbackDistance(1), d2 = knockbackDistance(2), dMax = knockbackDistance(99);
  assert.ok(d1 >= 30 && d1 <= 60, `force1 ${d1}`);
  assert.ok(d2 >= 80 && d2 <= 130, `force2 ${d2}`);
  assert.ok(dMax <= 160, `max ${dMax}`);
});

test('硬直的遊戲時間上限：一定比無敵時間短（命中停頓頻繁時也不會被連續受擊鎖死）', () => {
  for (const f of [0.5, 1, 2, 2.5]) {
    const { lockMs } = knockbackVelocity(0, 1, true, f);
    const cap = lockHardCapMs(lockMs);
    assert.ok(cap >= lockMs && cap < HURT_IFRAME_MS, `force ${f} cap ${cap}`);
  }
});

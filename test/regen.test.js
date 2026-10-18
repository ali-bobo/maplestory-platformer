// HP / MP 自然回復：數值比舊版（HP 5/s、MP 10/s）慢很多，受傷 / 施法後暫停，安全區較快
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGEN, LEGACY_REGEN, hpRegenPerSec, mpRegenPerSec, regenStep, isSafeZone, mpRegenUptime,
} from '../src/engine/regen.js';
import { MAPS } from '../src/config/maps.js';
import { secondsUntilDry } from '../src/engine/damageModel.js';

const maxHpAt = (lv) => 400 + 20 * (lv - 1);
const maxMpAt = (lv) => 250 + 12 * (lv - 1);

test('回復量：中等級約為舊版的 30~45%，低等級更慢、滿級仍低於舊版', () => {
  for (const lv of [15, 20, 25]) {
    const hp = hpRegenPerSec(maxHpAt(lv)) / LEGACY_REGEN.hpPerSec;
    const mp = mpRegenPerSec(maxMpAt(lv)) / LEGACY_REGEN.mpPerSec;
    assert.ok(hp >= 0.3 && hp <= 0.45, `Lv${lv} HP ${hp}`);
    assert.ok(mp >= 0.3 && mp <= 0.45, `Lv${lv} MP ${mp}`);
  }
  assert.ok(Math.abs(hpRegenPerSec(400) - 1.4) < 1e-9);
  assert.ok(Math.abs(mpRegenPerSec(250) - 2.75) < 1e-9);
  assert.ok(hpRegenPerSec(maxHpAt(50)) < LEGACY_REGEN.hpPerSec);
  assert.ok(mpRegenPerSec(maxMpAt(50)) < LEGACY_REGEN.mpPerSec);
  // Lv20 從 0 站著回滿 HP 要超過 5 分鐘：受傷了就該喝藥水
  assert.ok(maxHpAt(20) / hpRegenPerSec(maxHpAt(20)) > 300);
});

test('安全區回復 × safeZoneMult；回城休息約一分鐘內補滿', () => {
  assert.equal(hpRegenPerSec(780, true), hpRegenPerSec(780) * REGEN.safeZoneMult);
  assert.equal(mpRegenPerSec(478, true), mpRegenPerSec(478) * REGEN.safeZoneMult);
  assert.ok(780 / hpRegenPerSec(780, true) < 75);
  assert.ok(478 / mpRegenPerSec(478, true) < 25);
});

test('regenStep：照時間累加、不超過上限、打斷後 delay 內不回復', () => {
  assert.equal(regenStep(100, 400, 2, 1000, 10000, null, 4000), 102);
  assert.equal(regenStep(399.5, 400, 2, 1000, 10000, null, 4000), 400);
  assert.equal(regenStep(400, 400, 2, 1000, 10000, null, 4000), 400);
  assert.equal(regenStep(100, 400, 2, 1000, 10000, 7000, 4000), 100);    // 受傷 3 秒前：還在暫停
  assert.equal(regenStep(100, 400, 2, 500, 10000, 6000, 4000), 101);    // 剛好滿 4 秒：恢復
  assert.equal(regenStep(100, 400, 2, 0, 10000, null, 4000), 100);
  assert.equal(regenStep(100, 400, 2, -50, 10000, null, 4000), 100);
});

test('安全區判定：晨曦鎮 / 影之殿堂是；有怪的地圖、Boss、副本不是', () => {
  assert.equal(isSafeZone('town', MAPS.town), true);
  assert.equal(isSafeZone('shrine', MAPS.shrine), true);
  assert.equal(isSafeZone('forest', MAPS.forest), false);
  assert.equal(isSafeZone('boss', MAPS.boss), false);
  assert.equal(isSafeZone('town', MAPS.town, true), false);
  assert.equal(isSafeZone('nowhere', undefined), false);
});

test('MP 回復開著的時間比例：施法越頻繁越低、下限 0', () => {
  assert.equal(mpRegenUptime(0), 1);
  assert.ok(Math.abs(mpRegenUptime(0.25) - 0.5) < 1e-9);
  assert.equal(mpRegenUptime(5), 0);
  const t = secondsUntilDry('thief', ['Z', 'X'], maxMpAt(10));
  assert.ok(Number.isFinite(t) && t > 0, `thief Z+X ${t}`);
});

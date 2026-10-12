// 低血量暈影與首次死亡提醒的判斷
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLowHp, shouldWarnDeath, LOW_HP_RATIO, WARN_HP_RATIO } from '../src/engine/danger.js';
import { applyDeathPenalty } from '../src/engine/death.js';
import { sanitizeState } from '../src/engine/saveManager.js';
import { createInitialGameState } from '../src/config/constants.js';
import { generateEquipment } from '../src/config/equipment.js';

test('isLowHp：低於 25% 才算，HP 0（已死亡）與壞數字不算', () => {
  assert.equal(isLowHp(24, 100), true);
  assert.equal(isLowHp(25, 100), false);       // 剛好 25% 不算「低於」
  assert.equal(isLowHp(1, 400), true);
  assert.equal(isLowHp(0, 100), false);
  assert.equal(isLowHp(-5, 100), false);
  assert.equal(isLowHp(10, 0), false);
  assert.equal(isLowHp(NaN, 100), false);
  assert.equal(isLowHp(undefined, 100), false);
  assert.equal(LOW_HP_RATIO < WARN_HP_RATIO, true);   // 先提醒、再出暈影
});

test('shouldWarnDeath：HP 首次低於 30%、身上有裝備、這個存檔沒提醒過才提醒', () => {
  const gs = { maxHp: 100 };
  assert.equal(shouldWarnDeath(gs, 29, 2), true);
  assert.equal(shouldWarnDeath(gs, 30, 2), false);
  assert.equal(shouldWarnDeath(gs, 50, 2), false);
  assert.equal(shouldWarnDeath(gs, 0, 2), false);       // 已經死了，提醒太晚
  assert.equal(shouldWarnDeath(gs, 20, 0), false);      // 沒裝備：死亡不會失去東西，不嚇人
  assert.equal(shouldWarnDeath({ maxHp: 100, deathWarned: true }, 10, 3), false);   // 只提醒一次
  assert.equal(shouldWarnDeath(null, 10, 3), false);
  assert.equal(shouldWarnDeath({ maxHp: 0 }, 10, 3), false);
});

test('提醒過的旗標會隨存檔保存，也在死亡重生後保留（不重複提醒）', () => {
  const gs = createInitialGameState();
  gs.level = 10;
  gs.equipment.weapon = generateEquipment('weapon', 10);
  gs.deathWarned = true;
  assert.equal(sanitizeState(JSON.parse(JSON.stringify(gs))).deathWarned, true);
  const respawn = applyDeathPenalty(gs, 300);
  assert.equal(respawn.equipment.weapon, null);          // 懲罰規則本身沒變
  assert.equal(respawn.deathWarned, true);
  const fresh = createInitialGameState();
  assert.equal(sanitizeState(fresh).deathWarned, undefined);   // 新遊戲還沒提醒過
});

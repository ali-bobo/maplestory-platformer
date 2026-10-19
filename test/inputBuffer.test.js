import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INPUT_BUFFER_MS, COYOTE_MS, createInputBuffer, bufferPress, hasBuffered, consumeBuffered, clearBuffer,
  createCoyote, updateCoyote, canCoyoteJump, isActionReady,
} from '../src/engine/inputBuffer.js';

test('常數：緩衝 120ms、土狼 100ms', () => {
  assert.equal(INPUT_BUFFER_MS, 120);
  assert.equal(COYOTE_MS, 100);
});

test('緩衝：窗內有效、剛好邊界有效、超過失效', () => {
  const b = createInputBuffer();
  bufferPress(b, 'jump', 1000);
  assert.equal(hasBuffered(b, 'jump', 1000), true);
  assert.equal(hasBuffered(b, 'jump', 1120), true);
  assert.equal(hasBuffered(b, 'jump', 1121), false);
  assert.equal(hasBuffered(b, 'attack', 1000), false);
});

test('緩衝：取出只會成功一次（不會重複施放）', () => {
  const b = createInputBuffer();
  bufferPress(b, 'skillZ', 500);
  assert.equal(consumeBuffered(b, 'skillZ', 550), true);
  assert.equal(consumeBuffered(b, 'skillZ', 560), false);
});

test('緩衝：過期的取出回傳 false 並被清掉', () => {
  const b = createInputBuffer();
  bufferPress(b, 'attack', 0);
  assert.equal(consumeBuffered(b, 'attack', 500), false);
  assert.equal(hasBuffered(b, 'attack', 10), false);
});

test('緩衝：各動作互相獨立；重按以最新時間為準；clear', () => {
  const b = createInputBuffer();
  bufferPress(b, 'a', 0); bufferPress(b, 'b', 0);
  bufferPress(b, 'a', 200);
  assert.equal(hasBuffered(b, 'a', 300), true);
  assert.equal(hasBuffered(b, 'b', 300), false);
  clearBuffer(b, 'a');
  assert.equal(hasBuffered(b, 'a', 300), false);
  bufferPress(b, 'c', 300); clearBuffer(b);
  assert.equal(hasBuffered(b, 'c', 300), false);
});

test('緩衝：未來時間戳（時鐘回撥）不算有效', () => {
  const b = createInputBuffer();
  bufferPress(b, 'x', 1000);
  assert.equal(hasBuffered(b, 'x', 900), false);
});

test('土狼：在地面一定可跳；剛離地窗內可跳、超過不可', () => {
  const c = createCoyote();
  updateCoyote(c, true, 1000);
  assert.equal(canCoyoteJump(c, true, 1000), true);
  updateCoyote(c, false, 1016);
  assert.equal(canCoyoteJump(c, false, 1016), true);
  assert.equal(canCoyoteJump(c, false, 1100), true);
  assert.equal(canCoyoteJump(c, false, 1101), false);
});

test('土狼：起跳後作廢（不會靠土狼連續起跳），再次著地才恢復', () => {
  const c = createCoyote();
  updateCoyote(c, true, 0);
  updateCoyote(c, false, 16, true);
  assert.equal(canCoyoteJump(c, false, 32), false);
  updateCoyote(c, true, 500);
  updateCoyote(c, false, 516);
  assert.equal(canCoyoteJump(c, false, 540), true);
});

test('土狼：從未著地（出生在空中）不可跳', () => {
  const c = createCoyote();
  assert.equal(canCoyoteJump(c, false, 50), false);
});

test('冷卻就緒判斷：>0 未就緒，0 / undefined 就緒', () => {
  assert.equal(isActionReady(0.01), false);
  assert.equal(isActionReady(0), true);
  assert.equal(isActionReady(undefined), true);
});

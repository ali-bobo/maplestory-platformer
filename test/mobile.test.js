import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTouchDevice, keyHint } from '../src/engine/device.js';
import { stickDirection, createKeyState, KEYS } from '../src/engine/touchControls.js';

function fakeWin({ search = '', coarse = false, fine = false, points = 0 } = {}) {
  return {
    location: { search },
    navigator: { maxTouchPoints: points },
    matchMedia: (q) => ({ matches: q.includes('(pointer: coarse)') ? coarse : q.includes('(any-pointer: fine)') ? fine : false }),
  };
}

test('isTouchDevice：手機（pointer: coarse）→ true；桌機 → false', () => {
  assert.equal(isTouchDevice(fakeWin({ coarse: true, points: 5 })), true);
  assert.equal(isTouchDevice(fakeWin({ fine: true })), false);
  assert.equal(isTouchDevice(fakeWin()), false);
});

test('isTouchDevice：網址參數 ?touch=1 / ?touch=0 優先於偵測', () => {
  assert.equal(isTouchDevice(fakeWin({ search: '?touch=1' })), true);
  assert.equal(isTouchDevice(fakeWin({ search: '?touch=0', coarse: true })), false);
  assert.equal(isTouchDevice(fakeWin({ search: '?debug=1&touch=1' })), true);
});

test('isTouchDevice：不支援 pointer 查詢時以觸控點數判斷；有精準指標（觸控筆電）不算', () => {
  assert.equal(isTouchDevice(fakeWin({ points: 3 })), true);
  assert.equal(isTouchDevice(fakeWin({ points: 3, fine: true })), false);
});

test('isTouchDevice：壞環境不丟例外', () => {
  assert.equal(isTouchDevice(null), false);
  assert.equal(isTouchDevice({}), false);
  assert.equal(isTouchDevice({ get location() { throw new Error('x'); } }), false);
});

test('keyHint 依裝置回傳對應文字', () => {
  assert.equal(keyHint('按 F', '點互動', fakeWin({ coarse: true })), '點互動');
  assert.equal(keyHint('按 F', '點互動', fakeWin({ fine: true })), '按 F');
});

test('stickDirection：死區、左右、極端值', () => {
  assert.equal(stickDirection(0, 50), 0);
  assert.equal(stickDirection(5, 50), 0);
  assert.equal(stickDirection(-5, 50), 0);
  assert.equal(stickDirection(-30, 50), -1);
  assert.equal(stickDirection(30, 50), 1);
  assert.equal(stickDirection(9999, 50), 1);
  assert.equal(stickDirection(NaN, 50), 0);
  assert.equal(stickDirection(30, 0), 0);
  assert.equal(stickDirection(30, -5), 0);
});

test('createKeyState：重複按下只送一次 keydown；放開才送 keyup；releaseAll 全放開', () => {
  const log = [];
  const ks = createKeyState((type, def) => log.push(`${type}:${def.key}`));
  assert.equal(ks.press('Z'), true);
  assert.equal(ks.press('Z'), false);
  assert.equal(ks.isDown('Z'), true);
  ks.press('left'); ks.press('F');
  assert.equal(ks.release('Z'), true);
  assert.equal(ks.release('Z'), false);
  ks.releaseAll();
  assert.equal(ks.isDown('left'), false);
  assert.deepEqual(log, [
    'keydown:z', 'keydown:ArrowLeft', 'keydown:f',
    'keyup:z', 'keyup:ArrowLeft', 'keyup:f',
  ]);
});

test('鍵位表與 Phaser KeyCodes 一致（keyCode 正確）', () => {
  const expected = { left: 37, up: 38, right: 39, down: 40, Z: 90, X: 88, C: 67, V: 86, B: 66, A: 65, S: 83, D: 68, R: 82, G: 71, F: 70, ESC: 27, SPACE: 32 };
  for (const [name, code] of Object.entries(expected)) assert.equal(KEYS[name].keyCode, code, name);
});

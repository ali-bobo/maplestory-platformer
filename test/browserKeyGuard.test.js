import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldBlockKey, isNavMouseButton } from '../src/engine/browserKeyGuard.js';

test('瀏覽器快捷鍵防護：擋 Alt 與 Alt 組合鍵，輸入框裡不擋', () => {
  assert.equal(shouldBlockKey({ key: 'Alt', altKey: true }), true);
  assert.equal(shouldBlockKey({ key: 'ArrowLeft', altKey: true }), true, 'Alt+← 上一頁');
  assert.equal(shouldBlockKey({ key: ' ', altKey: true }), true, 'Alt+Space 視窗選單');
  assert.equal(shouldBlockKey({ key: 'ArrowLeft', altKey: false }), false);
  assert.equal(shouldBlockKey({ key: 'q', altKey: false }), false);
  assert.equal(shouldBlockKey({ key: 'Alt', altKey: true, target: { tagName: 'INPUT' } }), false);
  assert.equal(shouldBlockKey({ key: 'd', altKey: true, target: { tagName: 'textarea' } }), false);
  assert.equal(shouldBlockKey({ key: 'Alt', altKey: true, target: { tagName: 'DIV', isContentEditable: true } }), false);
  assert.equal(shouldBlockKey(null), false);
});

test('瀏覽器快捷鍵防護：滑鼠側鍵（上一頁 / 下一頁）', () => {
  assert.equal(isNavMouseButton({ button: 3 }), true);
  assert.equal(isNavMouseButton({ button: 4 }), true);
  assert.equal(isNavMouseButton({ button: 0 }), false);
  assert.equal(isNavMouseButton({ button: 2 }), false);
  assert.equal(isNavMouseButton(null), false);
});

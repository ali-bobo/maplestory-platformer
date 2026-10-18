import test from 'node:test';
import assert from 'node:assert/strict';
import { JOY, createJoystickState, resetJoystick, updateJoystick, stickVector } from '../src/engine/joystick.js';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../src/engine/settings.js';

const R = 100;
// 以半徑比例餵入：nx, ny（上為負）
const feed = (st, nx, ny, t) => updateJoystick(st, nx * R, ny * R, R, t);

test('stickVector：超出半徑夾回圓周、非有限值回傳 0', () => {
  const v = stickVector(300, 400, 100);
  assert.ok(Math.abs(Math.hypot(v.kx, v.ky) - 100) < 1e-9);
  assert.ok(Math.abs(v.nx - 0.6) < 1e-9 && Math.abs(v.ny - 0.8) < 1e-9);
  assert.deepEqual(stickVector(NaN, 0, 100), { nx: 0, ny: 0, kx: 0, ky: 0, mag: 0 });
  assert.deepEqual(stickVector(5, 5, 0), { nx: 0, ny: 0, kx: 0, ky: 0, mag: 0 });
});

test('左右：死區內不動、超過死區才移動；遲滯避免邊界抖動', () => {
  const st = createJoystickState();
  assert.equal(feed(st, 0.2, 0, 0).right, false);
  assert.equal(feed(st, 0.3, 0, 10).right, true);
  assert.equal(feed(st, 0.24, 0, 20).right, true, '已在移動時，回到進入門檻與離開門檻之間仍維持');
  assert.equal(feed(st, 0.15, 0, 30).right, false);
  const r = feed(st, -0.8, 0, 40);
  assert.equal(r.left, true);
  assert.equal(r.right, false);
});

test('左右：往上用力推時需要更大的水平分量，直上不漂移', () => {
  const st = createJoystickState();
  assert.equal(feed(st, 0.32, -0.9, 0).right, false, '幾乎直上：不當成右移');
  assert.equal(feed(st, 0.7, -0.7, 10).right, true, '斜上 45 度：邊移動邊跳');
});

test('上推越過門檻 → 跳一次；持續按住不連跳', () => {
  const st = createJoystickState();
  assert.equal(feed(st, 0, -0.3, 0).jump, false);
  assert.equal(feed(st, 0, -0.7, 50).jump, true);
  assert.equal(feed(st, 0, -0.9, 100).jump, false);
  assert.equal(feed(st, 0, -1, 1000).jump, false);
});

test('二段跳：回到中立再上推才會再跳；沒回中立不會', () => {
  const st = createJoystickState();
  assert.equal(feed(st, 0, -0.8, 0).jump, true);
  assert.equal(feed(st, 0, -0.5, 300).jump, false, '還沒回到重新武裝線以內');
  assert.equal(feed(st, 0, -0.8, 600).jump, false, '沒回中立就再推，不算');
  assert.equal(feed(st, 0, 0, 900).jump, false);
  assert.equal(feed(st, 0, -0.8, 1200).jump, true, '回中立後再上推 = 二段跳');
});

test('快速上滑：短時間內往上移動夠遠，即使沒推到頂也算跳', () => {
  const st = createJoystickState();
  feed(st, 0, 0.1, 0);
  assert.equal(feed(st, 0, -0.45, 100).jump, true, '100 ms 內上移 0.55 半徑、到達 45% 高');
  assert.equal(feed(st, 0, -0.5, 130).jump, false, '同一個手勢不會再觸發');
});

test('慢慢上推到 45%（未達 60%、也不夠快）不跳', () => {
  const st = createJoystickState();
  for (let i = 0; i <= 9; i++) assert.equal(feed(st, 0, -0.05 * i, i * 100).jump, false);
});

test('下：往下推且垂直為主才算；斜下（水平為主）只移動不下穿', () => {
  const st = createJoystickState();
  assert.equal(feed(st, 0, 0.7, 0).down, true);
  assert.equal(feed(st, 0, 0.5, 10).down, true, '遲滯：離開門檻較低');
  assert.equal(feed(st, 0, 0.3, 20).down, false);
  const r = feed(createJoystickState(), 0.9, 0.65, 0);
  assert.equal(r.down, false);
  assert.equal(r.right, true);
  assert.equal(feed(createJoystickState(), 0, 0.7, 0).jump, false, '往下不會跳');
});

test('resetJoystick：放開後狀態歸零，下一次按下可重新跳', () => {
  const st = createJoystickState();
  feed(st, 0.9, -0.9, 0);
  resetJoystick(st);
  assert.equal(st.dir, 0);
  assert.equal(st.upHeld, false);
  assert.equal(st.hist.length, 0);
  assert.equal(feed(st, 0, -0.9, 10).jump, true);
});

test('超出最大半徑的位移被夾住，向量長度不超過 1', () => {
  const r = updateJoystick(createJoystickState(), 900, -900, R, 0);
  assert.ok(Math.hypot(r.nx, r.ny) <= 1 + 1e-9);
  assert.ok(Math.hypot(r.kx, r.ky) <= R + 1e-9);
});

test('閾值常數合理：重新武裝線 < 進入線，快速上滑進入線 < 進入線', () => {
  assert.ok(JOY.UP_REARM < JOY.UP_ENTER);
  assert.ok(JOY.FLICK_ENTER < JOY.UP_ENTER);
  assert.ok(JOY.DEADZONE_EXIT < JOY.DEADZONE);
  assert.ok(JOY.DOWN_EXIT < JOY.DOWN_ENTER);
});

test('設定 touchControls：預設虛擬搖桿；只認白名單', () => {
  assert.equal(DEFAULT_SETTINGS.touchControls, 'joystick');
  assert.equal(sanitizeSettings({ touchControls: 'buttons' }).touchControls, 'buttons');
  assert.equal(sanitizeSettings({ touchControls: 'gyro' }).touchControls, 'joystick');
  assert.equal(sanitizeSettings({ touchControls: 5 }).touchControls, 'joystick');
});

// 按鍵設定面板（設定視窗的「按鍵設定」鈕開啟，疊在設定視窗上）
//
// 點動作右邊的按鍵格 → 顯示「請按鍵…」→ 按下想用的鍵就換上。
//  - 新鍵已被別的動作使用：兩者互換，下方顯示說明。
//  - 保留鍵（ESC / M / J / 1 / 2）或不支援的鍵：拒絕並顯示原因。
//  - 等待按鍵時按 ESC 只取消，不會關掉視窗；這段期間的按鍵不會傳給遊戲（window capture 階段攔下）。
// 「恢復預設」把全部動作改回預設鍵位。鍵位存在設定（settings.keys），不進存檔。

import { settings } from '../engine/settings.js';
import { ACTIONS, rebind, keyLabel, keyNameFromEvent, actionLabel, defaultBindings, isDefaultBindings } from '../engine/keyBindings.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';

export const KEY_BIND_ROWS = 8;   // 每欄幾列（兩欄）

/**
 * 建立面板。回傳 { objects, destroy, isCapturing, capture(action), handleKey(ev) }。
 *  options.x0, y0, w, h  面板位置大小（和設定視窗同一塊）
 *  options.depth         底層深度
 *  options.onClose       按「返回」/ × 時呼叫
 */
export function buildKeyBindPanel(scene, options = {}) {
  const d = options.depth ?? 170;
  const { width, height } = scene.cameras.main;
  const W = options.w ?? 760;
  const H = options.h ?? 572;
  const x0 = options.x0 ?? Math.round((width - W) / 2);
  const y0 = options.y0 ?? 14;
  const objs = [];
  const push = (o) => { objs.push(o); return o; };
  const text = (x, y, str, size, color, extra = {}) => push(scene.add.text(x, y, str, {
    fontSize: `${size}px`, color, fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3, ...extra,
  }).setDepth(d + 3).setScrollFactor(0));
  const rect = (x, y, w, h, color, alpha = 1, depth = d + 2) => push(scene.add.rectangle(x, y, w, h, color, alpha)
    .setOrigin(0, 0).setDepth(depth).setScrollFactor(0));

  let capturing = null;   // 正在等按鍵的動作 id
  let message = '';
  let messageBad = false;

  // 擋住下面設定視窗的點擊；點空白處取消等待
  rect(0, 0, width, height, 0x000000, 0.35, d).setInteractive().on('pointerdown', () => { if (capturing) setCapture(null); });
  push(addParchmentPanel(scene, x0, y0, W, H, { depth: d + 1 }));
  text(x0 + 34, y0 + 20, '按鍵設定', 26, '#ffe9b0');
  text(x0 + 34, y0 + 66, '點按鍵格，再按想用的鍵（ESC 取消）。已被使用的鍵會和原本的動作互換。', 14, '#e8d3a8', { strokeThickness: 2 });

  // 關閉 ×
  const closeBg = rect(x0 + W - 66, y0 + 14, 40, 40, 0x553333, 0.95);
  closeBg.setStrokeStyle(2, 0xff8888, 0.7);
  text(x0 + W - 46, y0 + 34, '×', 26, '#ff9a9a').setOrigin(0.5, 0.5);
  push(scene.add.zone(x0 + W - 70, y0 + 10, 48, 48).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    .setDepth(d + 5).setScrollFactor(0)).on('pointerdown', () => options.onClose && options.onClose());

  // ── 動作列表（兩欄）────────────────────────────────────────────────────
  const rows = ACTIONS.map((a, i) => {
    const col = Math.floor(i / KEY_BIND_ROWS);
    const r = i % KEY_BIND_ROWS;
    const x = x0 + 40 + col * 356;
    const y = y0 + 100 + r * 44;
    text(x, y + 8, a.label, 16, '#fff3dc');
    const bx = x + 186;
    const box = rect(bx, y, 140, 36, 0x24160a, 1);
    box.setStrokeStyle(2, 0xc99a4a, 0.8);
    const label = text(bx + 70, y + 18, '', 16, '#ffee44').setOrigin(0.5, 0.5);
    const zone = push(scene.add.zone(bx - 2, y - 3, 144, 42).setOrigin(0, 0).setInteractive({ useHandCursor: true })
      .setDepth(d + 5).setScrollFactor(0));
    zone.on('pointerdown', () => setCapture(capturing === a.id ? null : a.id));
    zone.on('pointerover', () => { if (capturing !== a.id) box.setFillStyle(0x3a2412, 1); });
    zone.on('pointerout', () => { if (capturing !== a.id) box.setFillStyle(0x24160a, 1); });
    return { id: a.id, box, label, zone, cx: bx + 70, cy: y + 18 };
  });

  const msgText = text(x0 + 40, y0 + H - 116, '', 15, '#9fe29f', { strokeThickness: 2, wordWrap: { width: W - 80 } });
  text(x0 + 40, y0 + H - 86, '手把：搖桿 / 十字鍵移動、↑ 互動、A 跳、X 普攻、Y B LB RB 技能欄 1–4、LT RT 藥水 1 2、Start 暫停',
    13, '#b9a98a', { strokeThickness: 2, fontStyle: 'normal' });

  const by = y0 + H - 44;
  let confirmReset = false;
  let resetTimer = null;
  const resetBtn = addWoodButton(scene, x0 + W / 2 - 110, by, 190, 42, '恢復預設', () => {
    if (isDefaultBindings(settings.get().keys)) { showMessage('已經是預設鍵位', false); return; }
    if (!confirmReset) {
      confirmReset = true;
      resetBtn.label.setText('再按一次確認');
      resetTimer = scene.time.delayedCall(2500, () => {
        confirmReset = false;
        if (resetBtn.label.active) resetBtn.label.setText('恢復預設');
      });
      return;
    }
    confirmReset = false;
    resetBtn.label.setText('恢復預設');
    setCapture(null);
    settings.set({ keys: defaultBindings() });
    showMessage('已恢復預設鍵位', false);
  }, { depth: d + 3, fontSize: 17 });
  resetBtn.objects.forEach(push);
  addWoodButton(scene, x0 + W / 2 + 110, by, 190, 42, '返回', () => options.onClose && options.onClose(),
    { depth: d + 3, fontSize: 17 }).objects.forEach(push);

  function showMessage(str, bad) {
    message = str;
    messageBad = !!bad;
    if (msgText.active) msgText.setText(message).setColor(messageBad ? '#ff9a8a' : '#9fe29f');
  }

  function refresh() {
    const kb = settings.get().keys;
    for (const row of rows) {
      if (!row.label.active) continue;
      const on = capturing === row.id;
      row.label.setText(on ? '請按鍵…' : keyLabel(kb[row.id]));
      row.label.setColor(on ? '#ffffff' : '#ffee44');
      row.box.setFillStyle(on ? 0x8a5a20 : 0x24160a, 1);
      row.box.setStrokeStyle(2, on ? 0xffe9b0 : 0xc99a4a, on ? 1 : 0.8);
    }
  }

  function setCapture(action) {
    capturing = action;
    if (action) showMessage(`按下要給「${actionLabel(action)}」的鍵`, false);
    refresh();
  }

  // 等待按鍵時：在 window 的 capture 階段攔下，Phaser 與 UIScene（ESC）都收不到
  function handleKey(ev) {
    if (!capturing) return false;
    if (ev.preventDefault) ev.preventDefault();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if (ev.repeat) return true;
    const action = capturing;
    if (ev.key === 'Escape' || ev.code === 'Escape' || ev.keyCode === 27) {
      setCapture(null);
      showMessage('已取消', false);
      return true;
    }
    const name = keyNameFromEvent(ev);
    const res = rebind(settings.get().keys, action, name || '');
    capturing = null;
    if (!res.ok) {
      refresh();
      showMessage(res.message, true);
      return true;
    }
    settings.set({ keys: res.bindings });
    refresh();
    showMessage(res.message || `${actionLabel(action)}改為「${keyLabel(name)}」`, false);
    return true;
  }
  const onWindowKey = (ev) => { handleKey(ev); };
  const onWindowKeyUp = (ev) => {
    // 等待中按下的那個鍵放開時也一併攔下（剛換上的鍵不會被當成遊戲輸入）
    if (capturing && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onWindowKey, true);
    window.addEventListener('keyup', onWindowKeyUp, true);
  }

  refresh();
  const unsubscribe = settings.subscribe(refresh);

  return {
    objects: objs,
    rows,
    isCapturing: () => !!capturing,
    capture: (action) => setCapture(action),
    handleKey,
    destroy() {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onWindowKey, true);
        window.removeEventListener('keyup', onWindowKeyUp, true);
      }
      if (resetTimer) resetTimer.remove(false);
      for (const o of objs) { if (o && o.destroy) o.destroy(); }
      objs.length = 0;
    },
  };
}

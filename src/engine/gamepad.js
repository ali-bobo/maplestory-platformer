// 手把支援（navigator.getGamepads，標準配置 mapping: 'standard'）
//
// 做法和觸控操作層一樣：每幀讀手把狀態，按下 / 放開時送「目前綁定那個鍵」的合成 KeyboardEvent 給 window，
// 所以玩家移動、技能、互動、暫停選單（ESC 順序）、主選單「按任意鍵」全部沿用既有的鍵盤邏輯，玩家改了鍵位也跟著走。
//
// 標準配置：
//   左搖桿 / 十字鍵 左右 → 移動；下 → 下穿平台；上 → 互動（進支線傳送門、NPC 對話，等於互動鍵）
//   A → 跳躍　X → 普通攻擊　Y / B / LB / RB → 技能欄 1–4　LT / RT → 藥水 1 / 2　Start → 暫停（等於 ESC）
//   選單 / 教學畫面：A → Enter（確認），十字鍵左右 → ← →（教學換頁），Start → ESC
//
// padActions / createGamepadBridge 是純邏輯（不碰 DOM / Phaser），單元測試用假的手把。

// 標準配置的按鈕索引（W3C Gamepad 'standard' mapping）
export const PAD = Object.freeze({
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9,
  LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
});

// 按鈕 → 動作（動作 id 同 keyBindings.js 的 ACTIONS；'pause' 固定送 ESC）
export const PAD_BUTTON_ACTIONS = Object.freeze([
  [PAD.A, 'jump'],
  [PAD.X, 'attack'],
  [PAD.Y, 'skill1'],
  [PAD.B, 'skill2'],
  [PAD.LB, 'skill3'],
  [PAD.RB, 'skill4'],
  [PAD.LT, 'potA'],
  [PAD.RT, 'potS'],
  [PAD.START, 'pause'],
  [PAD.UP, 'interact'],
  [PAD.DOWN, 'down'],
  [PAD.LEFT, 'left'],
  [PAD.RIGHT, 'right'],
]);

export const STICK_DEADZONE = 0.5;

function pressed(btn) {
  if (!btn) return false;
  if (typeof btn === 'number') return btn > 0.5;
  return !!btn.pressed || (typeof btn.value === 'number' && btn.value > 0.5);
}

/** 一支手把目前按著的動作（Set） */
export function padActions(pad, deadZone = STICK_DEADZONE) {
  const out = new Set();
  if (!pad || pad.connected === false) return out;
  const buttons = pad.buttons || [];
  for (const [idx, action] of PAD_BUTTON_ACTIONS) if (pressed(buttons[idx])) out.add(action);
  const axes = pad.axes || [];
  const ax = Number(axes[0]) || 0;
  const ay = Number(axes[1]) || 0;
  if (ax <= -deadZone) out.add('left');
  if (ax >= deadZone) out.add('right');
  // 垂直方向門檻高一點，左右推搖桿時不會誤觸上下
  if (ay <= -Math.max(deadZone, 0.6)) out.add('interact');
  if (ay >= Math.max(deadZone, 0.6)) out.add('down');
  if (out.has('left') && out.has('right')) { out.delete('left'); out.delete('right'); }
  return out;
}

/** 選單 / 教學畫面：A / X 當作確認（Enter），其餘動作照常 */
export function menuActions(actions) {
  const out = new Set();
  for (const a of actions) out.add(a === 'jump' || a === 'attack' ? 'confirm' : a);
  return out;
}

/**
 * 建立手把橋接。
 *  getPads()         回傳手把陣列（navigator.getGamepads() 的結果，可含 null）
 *  emit(type, def)   送出 'keydown' / 'keyup'，def = { key, code, keyCode }
 *  resolveKey(action) 動作 → def（'pause' → ESC、'confirm' → Enter，其餘依按鍵設定）
 *  isMenu()          目前是否在選單 / 教學 / 結算畫面
 *  onConnect(pad) / onDisconnect(index)  手把接上 / 拔掉時呼叫（顯示提示用）
 * 回傳 { poll, releaseAll, pressedActions }
 */
export function createGamepadBridge({ getPads, emit, resolveKey, isMenu = () => false, onConnect, onDisconnect } = {}) {
  const down = new Map();      // action → 按下時送出的 def
  const known = new Set();     // 已連接的手把 index
  // 接上時就已經「按著」的輸入（方向盤、搖桿、某些耳機被當成手把，軸靜止時停在 -1）：放開過一次才算數，
  // 否則會一直送出互動 / 暫停，看起來像遊戲自己跳出選單
  const stuck = new Map();     // 手把 index → 尚未放開過的動作

  const release = (action) => {
    const def = down.get(action);
    down.delete(action);
    if (def) emit('keyup', def);
  };

  return {
    poll() {
      let pads = [];
      try { pads = (getPads && getPads()) || []; } catch (_) { pads = []; }
      const seen = new Set();
      let actions = new Set();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || pad.connected === false) continue;
        const idx = typeof pad.index === 'number' ? pad.index : i;
        seen.add(idx);
        const padNow = padActions(pad);
        if (!known.has(idx)) { known.add(idx); stuck.set(idx, new Set(padNow)); if (onConnect) onConnect(pad); }
        const held = stuck.get(idx);
        for (const a of [...held]) if (!padNow.has(a)) held.delete(a);
        for (const a of padNow) if (!held.has(a)) actions.add(a);
      }
      for (const idx of [...known]) {
        if (!seen.has(idx)) { known.delete(idx); stuck.delete(idx); if (onDisconnect) onDisconnect(idx); }
      }
      if (isMenu()) actions = menuActions(actions);
      for (const action of [...down.keys()]) if (!actions.has(action)) release(action);
      for (const action of actions) {
        if (down.has(action)) continue;
        const def = resolveKey(action);
        if (!def) continue;
        down.set(action, def);
        emit('keydown', def);
      }
    },
    releaseAll() { for (const action of [...down.keys()]) release(action); },
    pressedActions() { return [...down.keys()]; },
    connectedCount() { return known.size; },
  };
}

// ── 瀏覽器端：掛到 Phaser 主迴圈 ─────────────────────────────────────────────

function fireKeyboardEvent(type, def) {
  const ev = new KeyboardEvent(type, { key: def.key, code: def.code, bubbles: true, cancelable: true });
  // Phaser 讀 keyCode；KeyboardEvent 建構子不收 keyCode，直接覆寫
  Object.defineProperty(ev, 'keyCode', { get: () => def.keyCode });
  Object.defineProperty(ev, 'which', { get: () => def.keyCode });
  window.dispatchEvent(ev);
}

let toastEl = null;
let toastTimer = null;
export function showInputToast(text, ms = 2200) {
  if (typeof document === 'undefined') return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'gamepad-toast';
    toastEl.setAttribute('role', 'status');
    Object.assign(toastEl.style, {
      position: 'fixed', left: '50%', top: '14px', transform: 'translateX(-50%)', zIndex: '60',
      padding: '8px 18px', borderRadius: '10px', background: 'rgba(42, 26, 12, 0.92)', color: '#ffe9b0',
      border: '2px solid #c99a4a', font: 'bold 16px Arial, sans-serif', pointerEvents: 'none',
      transition: 'opacity 0.3s', opacity: '0',
    });
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, ms);
}

/**
 * 在遊戲主迴圈每一步之前讀手把。
 *  game         Phaser.Game
 *  resolveKey   動作 → def
 *  isMenu       () => boolean
 */
export function installGamepad({ game, resolveKey, isMenu }) {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
  const bridge = createGamepadBridge({
    getPads: () => navigator.getGamepads(),
    emit: fireKeyboardEvent,
    resolveKey,
    isMenu,
    onConnect: () => showInputToast('已連接手把'),
    onDisconnect: () => showInputToast('手把已中斷連線'),
  });
  game.events.on('prestep', () => bridge.poll());
  window.addEventListener('blur', () => bridge.releaseAll());
  return bridge;
}

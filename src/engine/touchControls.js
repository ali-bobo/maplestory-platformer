// 手機觸控操作層
//
// 以 DOM 疊在畫布上，把觸控轉成合成的 KeyboardEvent 送給 window，Phaser 的鍵盤系統
// 照原樣處理，因此玩家、NPC、暫停選單等既有的鍵盤邏輯完全不用改。
//
// - 移動區（預設在右手側）：搖桿左右移動、「↓」鈕下穿薄平台
// - 動作區（預設在左手側）：跳躍、普攻 Z、技能 X / C / V / B、互動 F
// - 暫停 ESC、全螢幕、左右手對調（記在 localStorage）
// - 藥水不放按鈕：直接點畫面下方的藥水槽（UIScene）
// - 每個按鈕以 pointer events + setPointerCapture 追蹤，可同時多指操作
// - 失焦 / 切背景 / 指標取消時一律放開所有按鍵，避免角色卡住一直跑

// 鍵位表：Phaser 以 keyCode 辨識按鍵
export const KEYS = {
  left:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
  up:    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  down:  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
  Z: { key: 'z', code: 'KeyZ', keyCode: 90 },
  X: { key: 'x', code: 'KeyX', keyCode: 88 },
  C: { key: 'c', code: 'KeyC', keyCode: 67 },
  V: { key: 'v', code: 'KeyV', keyCode: 86 },
  B: { key: 'b', code: 'KeyB', keyCode: 66 },
  A: { key: 'a', code: 'KeyA', keyCode: 65 },
  S: { key: 's', code: 'KeyS', keyCode: 83 },
  D: { key: 'd', code: 'KeyD', keyCode: 68 },
  R: { key: 'r', code: 'KeyR', keyCode: 82 },
  G: { key: 'g', code: 'KeyG', keyCode: 71 },
  F: { key: 'f', code: 'KeyF', keyCode: 70 },
  ESC: { key: 'Escape', code: 'Escape', keyCode: 27 },
};

// 搖桿水平偏移 → 方向。dx 為指標相對搖桿中心的位移（px），radius 為搖桿半徑。
// 回傳 -1（左）、0、1（右）。死區避免手指輕微抖動造成移動。
export function stickDirection(dx, radius, deadZone = 0.22) {
  if (!Number.isFinite(dx) || !(radius > 0)) return 0;
  const n = dx / radius;
  if (n <= -deadZone) return -1;
  if (n >= deadZone) return 1;
  return 0;
}

// 「按下 / 放開」的狀態管理，與 DOM 無關：同一個鍵重複 press 只會送一次 keydown。
export function createKeyState(emit) {
  const down = new Set();
  return {
    press(name) {
      if (down.has(name)) return false;
      down.add(name);
      emit('keydown', KEYS[name]);
      return true;
    },
    release(name) {
      if (!down.delete(name)) return false;
      emit('keyup', KEYS[name]);
      return true;
    },
    releaseAll() {
      for (const name of [...down]) this.release(name);
    },
    isDown(name) { return down.has(name); },
  };
}

function fireKeyboardEvent(type, def) {
  const ev = new KeyboardEvent(type, { key: def.key, code: def.code, bubbles: true, cancelable: true });
  // KeyboardEvent 建構子在部分瀏覽器不接受 keyCode，直接覆寫（Phaser 讀的是 keyCode）
  Object.defineProperty(ev, 'keyCode', { get: () => def.keyCode });
  Object.defineProperty(ev, 'which', { get: () => def.keyCode });
  window.dispatchEvent(ev);
}

const BUTTONS = [
  // [css class, 顯示文字, 鍵名, 說明, 所在群組]
  ['tc-jump',   '跳',  'up',  '跳躍', 'actions'],
  ['tc-attack', 'Z',   'Z',   '三連飛鏢', 'actions'],
  ['tc-skill tc-x', 'X', 'X', '暗影步伐', 'actions'],
  ['tc-skill tc-c', 'C', 'C', '暗殺', 'actions'],
  ['tc-skill tc-v', 'V', 'V', '暗影漩渦', 'actions'],
  ['tc-skill tc-b', 'B', 'B', '影分身', 'actions'],
  ['tc-util tc-interact', '互動', 'F', '互動 / 對話', 'actions'],
  ['tc-down',   '↓',   'down', '下穿平台', 'moves'],
  ['tc-util tc-pause', '暫停', 'ESC', '暫停選單 / 關閉', 'top'],
];

const HAND_KEY = 'thief-legend-touch-hand';   // 'left' = 移動在左手（傳統配置），其餘 = 移動在右手（預設）


// 建立並掛載觸控層。回傳 { setVisible, destroy }。
export function mountTouchControls({ canvasProvider, hudBottomRatio = 120 / 720 } = {}) {
  const root = document.createElement('div');
  root.id = 'touch-controls';
  root.className = 'tc-hidden';
  root.setAttribute('aria-hidden', 'true');

  const keys = createKeyState(fireKeyboardEvent);

  // 三個群組：移動區、動作區、頂部列。左右手對調只切換 root 的 class，內部排列自動鏡射
  const groups = {};
  for (const name of ['moves', 'actions', 'top']) {
    const g = document.createElement('div');
    g.className = `tc-group tc-group-${name}`;
    groups[name] = g;
    root.appendChild(g);
  }
  const readHand = () => { try { return localStorage.getItem(HAND_KEY); } catch (_) { return null; } };
  root.classList.toggle('tc-moves-left', readHand() === 'left');

  // ── 一般按鈕 ───────────────────────────────────────────────────────────────
  for (const [cls, label, keyName, title, group] of BUTTONS) {
    const btn = document.createElement('div');
    btn.className = `tc-btn ${cls}`;
    btn.textContent = label;
    btn.title = title;
    const release = (e) => {
      keys.release(keyName);
      btn.classList.remove('tc-active');
      if (e && e.pointerId !== undefined && btn.hasPointerCapture && btn.hasPointerCapture(e.pointerId)) {
        btn.releasePointerCapture(e.pointerId);
      }
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* 部分瀏覽器不支援 */ }
      keys.press(keyName);
      btn.classList.add('tc-active');
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    groups[group].appendChild(btn);
  }

  // ── 搖桿（左右）────────────────────────────────────────────────────────────
  const stick = document.createElement('div');
  stick.className = 'tc-stick';
  const knob = document.createElement('div');
  knob.className = 'tc-knob';
  stick.appendChild(knob);
  let stickPointer = null;
  const updateStick = (e) => {
    const r = stick.getBoundingClientRect();
    const radius = r.width / 2;
    const dx = e.clientX - (r.left + radius);
    const dir = stickDirection(dx, radius);
    if (dir < 0) { keys.press('left'); keys.release('right'); }
    else if (dir > 0) { keys.press('right'); keys.release('left'); }
    else { keys.release('left'); keys.release('right'); }
    const clamped = Math.max(-1, Math.min(1, dx / radius));
    knob.style.transform = `translateX(${Math.round(clamped * radius * 0.55)}px)`;
  };
  const endStick = (e) => {
    if (stickPointer !== null && e && e.pointerId !== undefined && e.pointerId !== stickPointer) return;
    stickPointer = null;
    keys.release('left');
    keys.release('right');
    knob.style.transform = 'translateX(0)';
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickPointer = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch (_) { /* 靜默 */ }
    updateStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickPointer) updateStick(e); });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);
  stick.addEventListener('lostpointercapture', endStick);
  groups.moves.appendChild(stick);

  // ── 全螢幕 ─────────────────────────────────────────────────────────────────
  const docEl = document.documentElement;
  if (docEl.requestFullscreen || docEl.webkitRequestFullscreen) {
    const fs = document.createElement('div');
    fs.className = 'tc-btn tc-util tc-fullscreen';
    fs.textContent = '全螢幕';
    fs.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
      Promise.resolve(req.call(docEl)).then(() => {
        // 進入全螢幕後嘗試鎖定橫向（Android Chrome 支援；iOS 不支援，會被忽略）
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    });
    groups.top.appendChild(fs);
  }

  // ── 左右手對調 ─────────────────────────────────────────────────────────────
  const swap = document.createElement('div');
  swap.className = 'tc-btn tc-util tc-swap';
  swap.textContent = '左右互換';
  swap.title = '把移動區與動作區左右對調';
  swap.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    keys.releaseAll(); endStick();
    const toLeft = !root.classList.contains('tc-moves-left');
    root.classList.toggle('tc-moves-left', toLeft);
    try { localStorage.setItem(HAND_KEY, toLeft ? 'left' : 'right'); } catch (_) { /* 靜默 */ }
  });
  groups.top.appendChild(swap);

  // ── 位置：貼齊畫布，避開底部 HUD 列 ────────────────────────────────────────
  // 左右兩側有黑邊（畫布比螢幕窄）且夠寬時，控制放進黑邊；否則疊在畫布內、HUD 列上方。
  const SIDE_NEEDED = 150;
  function layout() {
    const canvas = canvasProvider && canvasProvider();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const sideLeft = r.left;
    const sideRight = vw - r.right;
    const roomy = sideLeft >= SIDE_NEEDED && sideRight >= SIDE_NEEDED;
    const hudPx = r.height * hudBottomRatio;
    const bottom = roomy ? 14 : Math.max(10, vh - r.bottom) + hudPx + 10;
    const inset = roomy ? 8 : Math.max(8, r.left + 8);
    const insetR = roomy ? 8 : Math.max(8, vw - r.right + 8);
    // 以畫布高度決定按鈕尺寸（小螢幕不至於遮住太多畫面）
    const unit = Math.max(36, Math.min(56, Math.round(Math.min(vh, r.height) / 8.2)));
    const s = root.style;
    s.setProperty('--tc-unit', `${unit}px`);
    s.setProperty('--tc-bottom', `${Math.round(bottom)}px`);
    s.setProperty('--tc-left', `${Math.round(inset)}px`);
    s.setProperty('--tc-right', `${Math.round(insetR)}px`);
    s.setProperty('--tc-top', `${Math.round(Math.max(6, r.top + 6))}px`);
  }

  // ── 安全網：任何打斷都放開全部按鍵 ─────────────────────────────────────────
  const releaseAll = () => { keys.releaseAll(); endStick(); };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  // 擋掉長按選單、雙擊縮放等瀏覽器預設手勢
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  // 直向提示：CSS 以 orientation: portrait 控制顯示
  const hint = document.createElement('div');
  hint.id = 'rotate-hint';
  hint.className = 'rh-enabled';
  const hintIcon = document.createElement('div');
  hintIcon.className = 'rh-icon';
  hintIcon.textContent = '📱↻';
  const hintText = document.createElement('div');
  hintText.textContent = '請將手機橫放以獲得最佳遊玩體驗';
  hint.append(hintIcon, hintText);

  document.body.appendChild(root);
  document.body.appendChild(hint);
  layout();

  return {
    root,
    layout,
    keys,
    setVisible(visible) {
      const hidden = !visible;
      if (root.classList.contains('tc-hidden') === hidden) return;
      root.classList.toggle('tc-hidden', hidden);
      if (hidden) releaseAll(); else layout();
    },
    destroy() {
      releaseAll();
      window.removeEventListener('resize', layout);
      window.removeEventListener('orientationchange', layout);
      window.removeEventListener('blur', releaseAll);
      root.remove();
      hint.remove();
    },
  };
}

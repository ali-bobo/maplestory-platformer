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
  SPACE: { key: ' ', code: 'Space', keyCode: 32 },
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

// 觸控鈕名稱 → 按鍵設定裡的動作（ESC 固定，不在表內）
export const TOUCH_ACTIONS = Object.freeze({
  left: 'left', right: 'right', up: 'up', down: 'down',
  SPACE: 'attack', Z: 'skill1', X: 'skill2', C: 'skill3', V: 'skill4', F: 'interact',
});

// 「按下 / 放開」的狀態管理，與 DOM 無關：同一個鍵重複 press 只會送一次 keydown。
// resolve(name) 決定實際送出的按鍵（玩家改過鍵位時送新的鍵）；放開時送「按下當時」的那個鍵，
// 避免按住期間改了設定而卡鍵。
export function createKeyState(emit, resolve = (name) => KEYS[name]) {
  const down = new Map();   // name → 按下時送出的 def
  return {
    press(name) {
      if (down.has(name)) return false;
      const def = resolve(name) || KEYS[name];
      down.set(name, def);
      emit('keydown', def);
      return true;
    },
    release(name) {
      if (!down.has(name)) return false;
      const def = down.get(name);
      down.delete(name);
      emit('keyup', def);
      return true;
    },
    releaseAll() {
      for (const name of [...down.keys()]) this.release(name);
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
  // 移動區（同一隻手）：跳、↓、搖桿
  ['tc-jump',   '跳',  'up',  '跳躍（可二段跳）', 'moves'],
  ['tc-down',   '↓',   'down', '下穿平台', 'moves'],
  // 動作區：普通攻擊（空白鍵）、四個技能欄位（Z X C V，放哪個技能由玩家決定）、互動
  ['tc-attack', '普攻', 'SPACE', '普通攻擊', 'actions'],
  ['tc-skill tc-x', '鏢', 'Z', '技能欄 1', 'actions'],
  ['tc-skill tc-c', '步', 'X', '技能欄 2', 'actions'],
  ['tc-skill tc-v', '殺', 'C', '技能欄 3', 'actions'],
  ['tc-skill tc-b', '渦', 'V', '技能欄 4', 'actions'],
  ['tc-util tc-interact', '互動', 'F', '互動 / 對話', 'actions'],
  ['tc-util tc-pause', '暫停', 'ESC', '暫停選單 / 關閉', 'top'],
];

const HAND_KEY = 'thief-legend-touch-hand';   // 'left' = 移動在左手（傳統配置），其餘 = 移動在右手（預設）


// 建立並掛載觸控層。回傳 { setVisible, destroy }。
// resolveKey(name)：可選，回傳要送出的 { key, code, keyCode }（依按鍵設定）；沒給就用 KEYS 的預設鍵
export function mountTouchControls({ canvasProvider, hudBottomRatio = 120 / 720, resolveKey } = {}) {
  const root = document.createElement('div');
  root.id = 'touch-controls';
  root.className = 'tc-hidden';
  root.setAttribute('aria-hidden', 'true');

  const keys = createKeyState(fireKeyboardEvent, resolveKey);

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

  const buttonEls = {};
  const labelEls = {};
  const cdEls = {};   // 有冷卻的鈕（普攻與四個技能欄）：{ sweep, num, q, label }
  // ── 一般按鈕 ───────────────────────────────────────────────────────────────
  for (const [cls, label, keyName, title, group] of BUTTONS) {
    const btn = document.createElement('div');
    btn.className = `tc-btn ${cls}`;
    // 文字放在自己的 span（技能鈕的字會被換掉，不能用 btn.textContent，否則冷卻覆蓋層會被洗掉）
    const labelEl = document.createElement('span');
    labelEl.className = 'tc-label';
    labelEl.textContent = label;
    btn.appendChild(labelEl);
    labelEls[keyName] = labelEl;
    if (cls.includes('tc-skill') || cls.includes('tc-attack')) {
      // 冷卻：圓形掃描遮罩（conic-gradient，剩餘部分變暗，順時針收起）+ 剩餘秒數
      const sweep = document.createElement('div');
      sweep.className = 'tc-cd';
      const num = document.createElement('span');
      num.className = 'tc-cdnum';
      btn.append(sweep, num);
      cdEls[keyName] = { sweep, num, q: -1, label: '' };
    }
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
    buttonEls[keyName] = btn;
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
    // 四個技能鈕的字樣會跟著玩家排的技能欄位變：labels = { X: '步', ... }，locked = { X: true, ... }
    setSkillButtons(labels, locked) {
      for (const k of ['Z', 'X', 'C', 'V']) {
        const el = buttonEls[k];
        if (!el) continue;
        const lab = labelEls[k];
        if (labels[k] && lab && lab.textContent !== labels[k]) lab.textContent = labels[k];
        el.classList.toggle('tc-locked', !!(locked && locked[k]));
      }
    },
    // 冷卻顯示：keyName 是 'SPACE'（普攻）或 'Z' 'X' 'C' 'V'；ratio = 剩餘 / 總冷卻（0–1），secs = 剩餘秒數；
    // noMp = MP 不夠這個技能。只在量化後的值改變時才碰 DOM。
    setCooldown(keyName, ratio, secs, noMp) {
      const el = buttonEls[keyName];
      const cd = cdEls[keyName];
      if (!el || !cd) return;
      const r = ratio > 0 ? Math.min(1, ratio) : 0;
      const q = Math.round(r * 100);
      const label = secs >= 1 ? String(Math.ceil(secs)) : (r > 0 ? '1' : '');
      if (q !== cd.q) {
        cd.q = q;
        // --tc-done = 已經過的比例（亮的部分），其餘（剩餘冷卻）蓋暗色
        cd.sweep.style.setProperty('--tc-done', `${100 - q}%`);
        el.classList.toggle('tc-cooling', q > 0);
      }
      if (label !== cd.label) { cd.label = label; cd.num.textContent = label; }
      el.classList.toggle('tc-nomp', !!noMp);
    },
    // 視窗 / 暫停 / 對話開著時讓出畫面：隱藏移動區與動作區（暫停、全螢幕、左右互換仍在）
    setModal(flag) {
      const on = !!flag;
      if (root.classList.contains('tc-modal') === on) return;
      root.classList.toggle('tc-modal', on);
      if (on) releaseAll();
    },
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

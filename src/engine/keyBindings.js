// 按鍵設定（純邏輯，不依賴 Phaser / DOM，可單元測試）
//
// - ACTIONS：可重新指定按鍵的動作，以及「和今天完全一樣」的預設鍵位。
// - KEY_TABLE：允許指定的按鍵（名稱 → key / code / keyCode / 顯示文字）。Phaser 以 keyCode 辨識按鍵。
// - 保留鍵（ESC 暫停、M 世界地圖、J 任務日誌、1 / 2 對話選項）不能指定給其他動作。
// - rebind：指定新鍵；新鍵已被別的動作使用時兩者互換（回傳 swappedWith），保留鍵 / 不支援的鍵拒絕並附訊息。
// - sanitizeBindings：從設定讀回的資料一律當不可信輸入，未知動作丟棄、壞值與衝突回預設。
//
// 鍵位存在設定（src/engine/settings.js 的 keys 欄位），不進存檔。

// 技能欄位（gameState 裡的欄位 id 仍是 Z X C V）與藥水（A S D R G）對應的動作 id
export const SLOT_ACTIONS = Object.freeze({ Z: 'skill1', X: 'skill2', C: 'skill3', V: 'skill4' });
export const POTION_ACTIONS = Object.freeze({ A: 'potA', S: 'potS', D: 'potD', R: 'potR', G: 'potG' });

export const ACTIONS = Object.freeze([
  { id: 'left', label: '左', def: 'LEFT' },
  { id: 'right', label: '右', def: 'RIGHT' },
  { id: 'up', label: '上（也會跳躍）', def: 'UP' },
  { id: 'down', label: '下（下穿平台）', def: 'DOWN' },
  { id: 'jump', label: '跳躍', def: 'Q' },
  { id: 'interact', label: '互動 / 對話', def: 'F' },
  { id: 'attack', label: '普通攻擊', def: 'SPACE' },
  { id: 'skill1', label: '技能欄 1', def: 'Z' },
  { id: 'skill2', label: '技能欄 2', def: 'X' },
  { id: 'skill3', label: '技能欄 3', def: 'C' },
  { id: 'skill4', label: '技能欄 4', def: 'V' },
  { id: 'potA', label: '藥水 1', def: 'A' },
  { id: 'potS', label: '藥水 2', def: 'S' },
  { id: 'potD', label: '藥水 3', def: 'D' },
  { id: 'potR', label: '藥水 4', def: 'R' },
  { id: 'potG', label: '藥水 5', def: 'G' },
]);
export const ACTION_IDS = Object.freeze(ACTIONS.map((a) => a.id));
const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

// ── 按鍵表 ────────────────────────────────────────────────────────────────────
// name → { key, code, keyCode, label, codes（event.code 可能值）, alt（其他瀏覽器的 keyCode）}
function buildKeyTable() {
  const t = {};
  const add = (name, key, code, keyCode, label, extra = {}) => {
    t[name] = Object.freeze({ name, key, code, keyCode, label, codes: extra.codes || [code], alt: extra.alt || [] });
  };
  for (let i = 0; i < 26; i++) {
    const L = String.fromCharCode(65 + i);
    add(L, L.toLowerCase(), `Key${L}`, 65 + i, L);
  }
  for (let i = 0; i < 10; i++) add(String(i), String(i), `Digit${i}`, 48 + i, String(i));
  add('LEFT', 'ArrowLeft', 'ArrowLeft', 37, '←');
  add('UP', 'ArrowUp', 'ArrowUp', 38, '↑');
  add('RIGHT', 'ArrowRight', 'ArrowRight', 39, '→');
  add('DOWN', 'ArrowDown', 'ArrowDown', 40, '↓');
  add('SPACE', ' ', 'Space', 32, '空白鍵');
  add('ALT', 'Alt', 'AltLeft', 18, 'Alt', { codes: ['AltLeft', 'AltRight'] });
  add('SHIFT', 'Shift', 'ShiftLeft', 16, 'Shift', { codes: ['ShiftLeft', 'ShiftRight'] });
  add('CTRL', 'Control', 'ControlLeft', 17, 'Ctrl', { codes: ['ControlLeft', 'ControlRight'] });
  add('ENTER', 'Enter', 'Enter', 13, 'Enter', { codes: ['Enter', 'NumpadEnter'] });
  add('COMMA', ',', 'Comma', 188, ',');
  add('PERIOD', '.', 'Period', 190, '.');
  add('SLASH', '/', 'Slash', 191, '/');
  add('SEMICOLON', ';', 'Semicolon', 186, ';', { alt: [59] });
  add('QUOTE', "'", 'Quote', 222, "'");
  add('BRACKET_L', '[', 'BracketLeft', 219, '[');
  add('BRACKET_R', ']', 'BracketRight', 221, ']');
  add('BACKSLASH', '\\', 'Backslash', 220, '\\');
  add('MINUS', '-', 'Minus', 189, '-', { alt: [173] });
  add('EQUAL', '=', 'Equal', 187, '=', { alt: [61] });
  add('BACKQUOTE', '`', 'Backquote', 192, '`');
  // 固定鍵（不能指定，但手把 / 觸控要送出它們）
  add('ESC', 'Escape', 'Escape', 27, 'ESC');
  return Object.freeze(t);
}
export const KEY_TABLE = buildKeyTable();

// 保留鍵：其他系統寫死在用，指定給動作會兩邊一起觸發
export const RESERVED_KEYS = Object.freeze({
  ESC: '暫停 / 關閉視窗',
  M: '世界地圖',
  J: '任務日誌',
  1: '對話選項 1',
  2: '對話選項 2',
});

export function isAction(id) { return Object.prototype.hasOwnProperty.call(ACTION_BY_ID, id); }
export function actionLabel(id) { return ACTION_BY_ID[id] ? ACTION_BY_ID[id].label : String(id); }
export function isBindableKey(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(KEY_TABLE, name)
    && !Object.prototype.hasOwnProperty.call(RESERVED_KEYS, name);
}

export function defaultBindings() {
  const out = {};
  for (const a of ACTIONS) out[a.id] = a.def;
  return out;
}
export const DEFAULT_BINDINGS = Object.freeze(defaultBindings());

export function sameBindings(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return ACTION_IDS.every((id) => a[id] === b[id]);
}

export function isDefaultBindings(b) { return sameBindings(b, DEFAULT_BINDINGS); }

function duplicates(b) {
  const seen = new Map();
  const dup = new Set();
  for (const id of ACTION_IDS) {
    const k = b[id];
    if (seen.has(k)) { dup.add(id); dup.add(seen.get(k)); } else seen.set(k, id);
  }
  return dup;
}

// 任意輸入 → 完整、合法、不重複的鍵位表
// 舊版預設跳躍鍵是 Alt。Alt 和方向鍵 / 空白鍵 / D / F 一起按會觸發瀏覽器或系統快捷鍵
// （Alt+← 上一頁、Alt+Space 視窗選單、Alt+D 網址列），玩到一半就離開遊戲；預設改成 Q。
// 沒改過任何鍵（整份等於舊預設）的玩家一起換成新預設；自己指定 Alt 的照舊（browserKeyGuard 會擋快捷鍵）。
export const LEGACY_JUMP_DEFAULT = 'ALT';

function isLegacyDefault(raw) {
  return ACTIONS.every((a) => (a.id === 'jump' ? raw.jump === LEGACY_JUMP_DEFAULT : raw[a.id] === undefined || raw[a.id] === a.def));
}

export function sanitizeBindings(raw) {
  const out = defaultBindings();
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (isLegacyDefault(raw)) return out;
  for (const id of ACTION_IDS) {
    if (!Object.prototype.hasOwnProperty.call(raw, id)) continue;
    if (isBindableKey(raw[id])) out[id] = raw[id];
  }
  // 衝突：把衝突中「不是預設」的動作退回預設；還衝突就整份回預設
  let dup = duplicates(out);
  if (dup.size === 0) return out;
  for (const id of dup) out[id] = ACTION_BY_ID[id].def;
  dup = duplicates(out);
  return dup.size === 0 ? out : defaultBindings();
}

/**
 * 把 action 改成 keyName。
 * 回傳 { ok: true, bindings, swappedWith? , message } 或 { ok: false, bindings（原樣）, message }。
 * 新鍵已被其他動作使用時互換兩者的按鍵（不會產生重複）。
 */
export function rebind(bindings, action, keyName) {
  const cur = sanitizeBindings(bindings);
  if (!isAction(action)) return { ok: false, bindings: cur, message: '沒有這個動作' };
  if (typeof keyName === 'string' && Object.prototype.hasOwnProperty.call(RESERVED_KEYS, keyName)) {
    return { ok: false, bindings: cur, message: `「${keyLabel(keyName)}」保留給${RESERVED_KEYS[keyName]}，不能指定` };
  }
  if (!isBindableKey(keyName)) return { ok: false, bindings: cur, message: '這個按鍵不能指定' };
  if (cur[action] === keyName) return { ok: true, bindings: cur, message: '' };
  const other = ACTION_IDS.find((id) => id !== action && cur[id] === keyName);
  const next = { ...cur, [action]: keyName };
  if (other) {
    next[other] = cur[action];
    return {
      ok: true, bindings: next, swappedWith: other,
      message: `「${keyLabel(keyName)}」原本是${actionLabel(other)}，已互換（${actionLabel(other)}改為「${keyLabel(cur[action])}」）`,
    };
  }
  return { ok: true, bindings: next, message: '' };
}

// ── 顯示與事件 ────────────────────────────────────────────────────────────────
export function keyLabel(name) {
  const d = KEY_TABLE[name];
  return d ? d.label : String(name ?? '');
}

// HUD 角落的小字：空白鍵寫 SPACE 比較短
export function hudKeyLabel(name) {
  if (name === 'SPACE') return 'SPACE';
  return keyLabel(name);
}

export function keyCodeOf(name) {
  const d = KEY_TABLE[name];
  return d ? d.keyCode : 0;
}

/** 合成 KeyboardEvent 用的 { key, code, keyCode } */
export function eventDef(name) {
  const d = KEY_TABLE[name];
  return d ? { key: d.key, code: d.code, keyCode: d.keyCode } : null;
}

/** 從 KeyboardEvent（或 { code, keyCode }）找出按鍵名稱；不在表內回傳 null */
export function keyNameFromEvent(ev) {
  if (!ev) return null;
  const code = ev.code;
  if (code) {
    for (const name in KEY_TABLE) if (KEY_TABLE[name].codes.includes(code)) return name;
  }
  const kc = ev.keyCode;
  if (typeof kc === 'number' && kc > 0) {
    for (const name in KEY_TABLE) {
      const d = KEY_TABLE[name];
      if (d.keyCode === kc || d.alt.includes(kc)) return name;
    }
  }
  return null;
}

/** 這個鍵盤事件是不是 action 目前綁定的鍵 */
export function eventMatches(ev, bindings, action) {
  const name = bindings && bindings[action];
  if (!name || !ev) return false;
  const d = KEY_TABLE[name];
  if (!d) return false;
  if (typeof ev.keyCode === 'number' && ev.keyCode > 0) return ev.keyCode === d.keyCode || d.alt.includes(ev.keyCode);
  return keyNameFromEvent(ev) === name;
}

/** 技能欄位（Z X C V）目前的按鍵顯示文字 */
export function slotKeyLabel(bindings, slot) {
  const a = SLOT_ACTIONS[slot];
  return a ? keyLabel((bindings || DEFAULT_BINDINGS)[a]) : String(slot);
}

/** 藥水（A S D R G）目前的按鍵顯示文字 */
export function potionKeyLabel(bindings, potion) {
  const a = POTION_ACTIONS[potion];
  return a ? keyLabel((bindings || DEFAULT_BINDINGS)[a]) : String(potion);
}

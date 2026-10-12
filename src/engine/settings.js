// 玩家設定（音量、畫面效果、介面大小、減少動態）
//
// 設計重點：
//  - 裝置偏好，不是進度：存在獨立的 localStorage key（SETTINGS_KEY），不放進存檔，也不會隨存檔代碼匯出。
//  - 純邏輯，儲存體由呼叫端注入（createSettings(storage)），單元測試用假的 storage。
//  - localStorage 不可用或讀到垃圾時用預設值，記憶體裡的設定照常運作（這次分頁內仍有效）。
//  - 讀入的資料一律當不可信輸入：sanitizeSettings 只認白名單欄位並夾範圍。
//
// 其他模組只要 import { settings }：settings.get()、settings.shake(camera, ...)、settings.flash(camera, ...)。

import { getBrowserStorage } from './saveManager.js';

export const SETTINGS_KEY = 'thief-legend-settings';

export const UI_SCALES = ['small', 'normal', 'large'];
export const UI_SCALE_LABELS = { small: '小', normal: '標準', large: '大' };

export const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 70,       // 0–100
  sfxVolume: 100,        // 0–100
  shake: true,           // 畫面震動
  flash: true,           // 畫面閃光
  damageNumbers: true,   // 傷害數字
  reducedMotion: false,  // 減少動態：關閉震動、閃光、脈動與飄動效果
  uiScale: 'normal',     // small / normal / large
});

const BOOLEAN_KEYS = ['shake', 'flash', 'damageNumbers', 'reducedMotion'];
const VOLUME_KEYS = ['musicVolume', 'sfxVolume'];

function clampVolume(v, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(100, Math.max(0, n)));
}

// 把任意輸入轉成合法設定（缺的補預設值、未知欄位丟棄）
export function sanitizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const k of VOLUME_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = clampVolume(raw[k], DEFAULT_SETTINGS[k]);
  }
  for (const k of BOOLEAN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k) && typeof raw[k] === 'boolean') out[k] = raw[k];
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'uiScale') && UI_SCALES.includes(raw.uiScale)) out.uiScale = raw.uiScale;
  return out;
}

export function parseSettings(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 4096) return { ...DEFAULT_SETTINGS };
  try {
    return sanitizeSettings(JSON.parse(text));
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 建立設定倉庫。storage 為 null（不可用）時只保留在記憶體。
 * 回傳 { get, set, reset, subscribe, persistent, shakeAllowed, flashAllowed, motionAllowed, shake, flash }。
 */
export function createSettings(storage) {
  let current = { ...DEFAULT_SETTINGS };
  let persistent = !!storage;
  const listeners = new Set();

  if (storage) {
    try { current = parseSettings(storage.getItem(SETTINGS_KEY)); } catch (_) { persistent = false; }
  }

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(current));
      persistent = true;
    } catch (_) {
      persistent = false;   // 容量滿或被封鎖：設定只在這個分頁內有效
    }
  };
  const notify = () => { for (const fn of [...listeners]) { try { fn(current); } catch (_) { /* 訂閱者出錯不影響其他人 */ } } };

  const api = {
    /** 目前設定（唯讀快照：不要直接改它，用 set） */
    get() { return current; },
    /** 合併並存檔；回傳新的設定 */
    set(patch) {
      const next = sanitizeSettings({ ...current, ...(patch && typeof patch === 'object' ? patch : {}) });
      const changed = Object.keys(next).some((k) => next[k] !== current[k]);
      current = next;
      if (changed) { persist(); notify(); }
      return current;
    },
    reset() {
      current = { ...DEFAULT_SETTINGS };
      persist();
      notify();
      return current;
    },
    /** 設定改變時呼叫 fn(settings)；回傳取消訂閱函式 */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get persistent() { return persistent; },

    // 效果開關：「減少動態」優先，一開就全部關
    motionAllowed() { return !current.reducedMotion; },
    shakeAllowed() { return current.shake && !current.reducedMotion; },
    flashAllowed() { return current.flash && !current.reducedMotion; },

    /** 取代 camera.shake(...)：震動被關掉時什麼都不做。參數同 Phaser 的 Camera.shake。 */
    shake(camera, ...args) {
      if (!camera || !api.shakeAllowed()) return camera;
      return camera.shake(...args);
    },
    /** 取代 camera.flash(...)：閃光被關掉時什麼都不做。參數同 Phaser 的 Camera.flash。 */
    flash(camera, ...args) {
      if (!camera || !api.flashAllowed()) return camera;
      return camera.flash(...args);
    },
  };
  return api;
}

// 全域單例：開機時從 localStorage 讀一次（getBrowserStorage 內有 try/catch，不可用回傳 null）
export const settings = createSettings(getBrowserStorage());

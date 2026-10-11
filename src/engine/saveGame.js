// 存檔系統：把 gameState 存進 localStorage（單一存檔欄），並提供檔案匯出 / 匯入。
//
// 驗證與格式細節在 saveManager.js（純邏輯、有單元測試）；本檔負責接上瀏覽器與 Scene。
//
// - saveGame(gs)：一般地圖進場、每 30 秒、升級、回城時自動呼叫
// - loadGame()：讀回並經 sanitizeState 過濾（未知欄位丟棄、數值夾範圍、缺的欄位補預設值）
// - 副本 / Boss 戰中不存（currentMap 會是 dungeon / boss），讀檔一律回到最後的一般地圖
//
// localStorage 不可用（隱身模式等）時全部靜默失敗，遊戲照常進行。

import { MAP_SCENE_KEYS } from '../config/constants.js';
import {
  createSaveStore, getBrowserStorage, serializeSave, parseSave, MAX_SAVE_BYTES,
} from './saveManager.js';

const store = createSaveStore(getBrowserStorage());

export function isSavableMap(mapKey) {
  return !!MAP_SCENE_KEYS[mapKey] && mapKey !== 'boss';
}

export function canSave() {
  return store.available;
}

export function hasSave() {
  const res = store.load();
  return res.ok;
}

/** 存檔摘要（主選單顯示用），沒有可用存檔回傳 null */
export function getSaveSummary() {
  const res = store.load();
  if (!res.ok) return null;
  const gs = res.state;
  return {
    level: gs.level, map: gs.currentMap, killCount: gs.killCount,
    savedAt: res.savedAt || 0, playTime: gs.playTime || 0,
  };
}

/** 只在一般地圖存；副本 / Boss 中途的狀態不寫入，避免讀檔卡在戰鬥場景 */
export function saveGame(gs) {
  if (!gs || !isSavableMap(gs.currentMap)) return false;
  return store.save(gs);
}

/** 讀檔：回傳過濾後的 gameState，沒有或損毀回傳 null */
export function loadGame() {
  const res = store.load();
  return res.ok ? res.state : null;
}

export function deleteSave() {
  store.clear();
}

/** 頁面關閉 / 切到背景時存檔：此時可能正在副本或 Boss，沿用 sanitize 的地圖回退規則 */
export function saveOnExit(gs) {
  return gs ? store.save(gs) : false;
}

/** 把狀態寫入存檔（不檢查所在地圖；死亡重生時使用，狀態已是安全地圖） */
export function writeSave(gs) {
  return gs ? store.save(gs) : false;
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 把目前的存檔下載成 JSON 檔。回傳是否成功觸發下載。 */
export function exportSaveFile() {
  const res = store.load();
  if (!res.ok) return false;
  try {
    const blob = new Blob([serializeSave(res.state, res.savedAt)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thief-legend-save-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (_) {
    return false;
  }
}

/** 開啟檔案選取視窗並匯入存檔。回傳 Promise<{ ok, error?, cancelled? }>。 */
export function importSaveFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; input.remove(); resolve(r); } };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return done({ ok: false, cancelled: true });
      if (file.size > MAX_SAVE_BYTES) return done({ ok: false, error: '存檔檔案過大' });
      try {
        const res = parseSave(await file.text());
        if (!res.ok) return done(res);
        if (!store.save(res.state, res.savedAt || Date.now())) {
          return done({ ok: false, error: '無法寫入本機存檔（儲存空間不可用）' });
        }
        done({ ok: true });
      } catch (_) {
        done({ ok: false, error: '讀取檔案失敗' });
      }
    });
    input.addEventListener('cancel', () => done({ ok: false, cancelled: true }));
    document.body.appendChild(input);
    input.click();
  });
}

// 存檔系統：把 gameState 存進 localStorage（單一存檔欄），並提供存檔代碼與檔案匯出 / 匯入。
//
// 驗證與格式細節在 saveManager.js（純邏輯、有單元測試）；本檔負責接上瀏覽器與 Scene。
//
// - saveGame(gs)：一般地圖進場、每 30 秒、升級、回城時自動呼叫
// - loadGame()：讀回並經 sanitizeState 過濾（未知欄位丟棄、數值夾範圍、缺的欄位補預設值）
// - 副本 / Boss 戰中不存（currentMap 會是 dungeon / boss），讀檔一律回到最後的一般地圖
//
// localStorage 不可用（隱身模式、iframe 沙箱）時遊戲照常進行：最新存檔留在記憶體（同一分頁內可繼續、可匯出代碼），
// getSaveStatus().unsaved 為 true，HUD 顯示「未存檔」。

import { MAP_SCENE_KEYS } from '../config/constants.js';
import {
  createSaveStore, getBrowserStorage, serializeSave, MAX_SAVE_BYTES,
  encodeSaveCode, decodeSaveCode, describeSave,
} from './saveManager.js';

const store = createSaveStore(getBrowserStorage(), { memory: true });

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

/** 目前是否寫得進持久儲存：{ persistent, ok, unsaved }。unsaved 為 true 時 HUD 要顯示「未存檔」 */
export function getSaveStatus() {
  return store.status();
}

/**
 * 產生存檔代碼。給 gs 就編碼這份即時狀態（遊戲中），不給則編碼目前存的檔（主選單）。
 * 沒有東西可匯出回傳 null。
 */
export function makeSaveCode(gs) {
  try {
    if (gs) return encodeSaveCode(gs);
    const res = store.load();
    return res.ok ? encodeSaveCode(res.state, res.savedAt || Date.now()) : null;
  } catch (_) {
    return null;
  }
}

/** 目前存檔的一行摘要（匯入覆蓋確認用）；沒有存檔回傳 ''。 */
export function currentSaveSummaryText() {
  const res = store.load();
  return res.ok ? describeSave(res.state) : '';
}

/**
 * 驗證使用者貼上的存檔代碼（或存檔 JSON 文字），還不寫入。
 * 成功：{ ok: true, state, savedAt, summary }；失敗：{ ok: false, error }。
 */
export function checkSaveCode(text) {
  const res = decodeSaveCode(text);
  if (!res.ok) return res;
  return { ok: true, state: res.state, savedAt: res.savedAt, summary: describeSave(res.state) };
}

/**
 * 把 checkSaveCode 驗證過的存檔寫入（覆蓋目前存檔）。
 * 回傳 { ok: true, persisted }：persisted 為 false 表示只留在這個分頁的記憶體，關掉就沒了。
 */
export function commitImportedSave(checked) {
  if (!checked || !checked.ok) return { ok: false, error: '沒有可匯入的存檔' };
  const persisted = store.save(checked.state, checked.savedAt || Date.now());
  return { ok: true, persisted };
}

/** 瀏覽器是不是很可能擋下載（放在 iframe / 沙箱頁面裡）：這種環境「按下載」不會有任何回應。 */
export function downloadsLikelyBlocked() {
  try {
    if (typeof window === 'undefined') return false;
    if (window.self !== window.top) return true;
    return window.origin === 'null';
  } catch (_) {
    return true;   // 連 window.top 都不給讀，一定是跨來源 iframe
  }
}

/**
 * 把目前的存檔下載成 JSON 檔。
 * 瀏覽器沒有「下載是否真的開始」的回報，所以這裡只誠實回報能知道的部分：
 *  'nosave'   沒有存檔可匯出
 *  'failed'   建立檔案 / 觸發下載時丟了例外
 *  'blocked'  頁面在 iframe / 沙箱裡，下載多半被擋，沒有試（請用存檔代碼）
 *  'started'  已送出下載要求（不保證檔案真的出現）
 */
export function exportSaveFile() {
  const res = store.load();
  if (!res.ok) return 'nosave';
  if (downloadsLikelyBlocked()) return 'blocked';
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
    return 'started';
  } catch (_) {
    return 'failed';
  }
}

/** 開啟檔案選取視窗，讀出文字內容（不寫入）。回傳 Promise<{ ok, text? , error?, cancelled? }>。 */
export function pickSaveFileText() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; input.remove(); resolve(r); } };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return done({ ok: false, cancelled: true });
      if (file.size > MAX_SAVE_BYTES) return done({ ok: false, error: '存檔檔案過大' });
      try {
        done({ ok: true, text: await file.text() });
      } catch (_) {
        done({ ok: false, error: '讀取檔案失敗' });
      }
    });
    input.addEventListener('cancel', () => done({ ok: false, cancelled: true }));
    document.body.appendChild(input);
    input.click();
  });
}

/** 開啟檔案選取視窗並直接匯入存檔（不經確認；主選單改用存檔視窗，保留給測試與舊流程）。 */
export async function importSaveFile() {
  const picked = await pickSaveFileText();
  if (!picked.ok) return picked;
  const checked = checkSaveCode(picked.text);
  if (!checked.ok) return checked;
  const res = commitImportedSave(checked);
  if (res.ok && !res.persisted) return { ok: false, error: '無法寫入本機存檔（儲存空間不可用）' };
  return res;
}

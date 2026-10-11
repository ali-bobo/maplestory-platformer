// 存檔服務：把純邏輯的 saveManager 接上瀏覽器（localStorage / 檔案下載 / 檔案選取）與 Phaser Scene。

import { MAP_SCENE_KEYS } from '../config/constants.js';
import {
  createSaveStore, getBrowserStorage, serializeSave, parseSave, MAX_SAVE_BYTES,
} from './saveManager.js';

const store = createSaveStore(getBrowserStorage());

// 這些地圖 / 場景不做自動存檔：副本與 Boss 戰中途不是安全的檢查點，沿用上一次存檔
const NO_AUTOSAVE_MAPS = new Set(['dungeon', 'boss']);

export function hasSave() {
  return store.has();
}

export function loadSave() {
  return store.load();
}

export function clearSave() {
  store.clear();
}

export function canSave() {
  return store.available;
}

// 自動存檔。gs 為 registry 內的 gameState；回傳是否寫入成功。
export function autoSave(gs) {
  if (!gs || NO_AUTOSAVE_MAPS.has(gs.currentMap)) return false;
  return store.save(gs);
}

// 頁面關閉 / 切到背景時存檔：此時可能正在副本或 Boss，沿用 sanitize 的地圖回退規則
export function saveOnExit(gs) {
  if (!gs) return false;
  return store.save(gs);
}

// 以指定狀態開始（或繼續）遊戲：寫入 registry 並啟動該狀態所在地圖。
// spawnX 省略時使用地圖預設出生點。
export function startFromState(scene, gs, spawnX) {
  const key = MAP_SCENE_KEYS[gs.currentMap] || MAP_SCENE_KEYS.sky;
  scene.registry.set('gameState', gs);
  scene.scene.start(key, { gameState: gs, spawnX });
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// 把目前的存檔下載成 JSON 檔。回傳是否成功觸發下載。
export function exportSaveFile() {
  const res = store.load();
  if (!res.ok) return false;
  try {
    const blob = new Blob([serializeSave(res.state, res.savedAt)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maple-save-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (_) {
    return false;
  }
}

// 開啟檔案選取視窗並匯入存檔。回傳 Promise<{ ok, error? }>；使用者取消時 ok=false, cancelled=true。
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

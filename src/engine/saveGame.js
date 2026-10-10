// 存檔系統：把 gameState 存進 localStorage（單一存檔欄）
//
// - saveGame(gs)：一般地圖進場、每 30 秒、升級、回城時自動呼叫
// - loadGame()：讀回並與 createInitialGameState() 合併，舊存檔缺的欄位會補預設值
// - 副本 / Boss 戰中不存（currentMap 會是 dungeon / boss），讀檔一律回到最後的一般地圖
//
// localStorage 不可用（隱身模式等）時全部靜默失敗，遊戲照常進行。

import { createInitialGameState, MAP_SCENE_KEYS } from '../config/constants.js';

const STORAGE_KEY = 'thief-legend-save-v1';
const SAVE_VERSION = 1;

export function hasSave() {
  return !!readRaw();
}

/** 存檔摘要（主選單顯示用），沒有存檔回傳 null */
export function getSaveSummary() {
  const raw = readRaw();
  if (!raw?.gameState) return null;
  const gs = raw.gameState;
  return { level: gs.level || 1, map: gs.currentMap, savedAt: raw.savedAt || 0, playTime: gs.playTime || 0 };
}

export function saveGame(gs) {
  if (!gs) return false;
  // 只在一般地圖存；副本 / Boss 中途的狀態不寫入，避免讀檔卡在戰鬥場景
  if (!isSavableMap(gs.currentMap)) return false;
  try {
    const snapshot = JSON.parse(JSON.stringify(gs));
    snapshot.skillCooldowns = { Z: 0, X: 0, C: 0, V: 0, B: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      gameState: snapshot,
    }));
    return true;
  } catch (_) {
    return false;
  }
}

export function loadGame() {
  const raw = readRaw();
  if (!raw?.gameState) return null;
  const fresh = createInitialGameState();
  const saved = raw.gameState;
  const gs = { ...fresh, ...saved };
  // 巢狀物件逐一合併，舊存檔缺的鍵用預設值補上
  for (const key of ['equipment', 'potions', 'skillCooldowns', 'skillLevels', 'quests']) {
    if (fresh[key] && typeof fresh[key] === 'object' && !Array.isArray(fresh[key])) {
      gs[key] = { ...fresh[key], ...(saved[key] || {}) };
    }
  }
  if (!Array.isArray(gs.unlockedSkills) || gs.unlockedSkills.length === 0) gs.unlockedSkills = fresh.unlockedSkills;
  if (!isSavableMap(gs.currentMap)) gs.currentMap = 'town';
  gs.skillCooldowns = { ...fresh.skillCooldowns };
  gs.hp = Math.max(1, Math.min(gs.hp || gs.maxHp, gs.maxHp));
  gs.mp = Math.min(gs.mp ?? gs.maxMp, gs.maxMp);
  return gs;
}

export function deleteSave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* 靜默 */ }
}

export function isSavableMap(mapKey) {
  return !!MAP_SCENE_KEYS[mapKey] && mapKey !== 'boss';
}

function readRaw() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const data = JSON.parse(text);
    return data && data.version === SAVE_VERSION ? data : null;
  } catch (_) {
    return null;
  }
}

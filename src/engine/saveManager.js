// 存檔管理（localStorage + 匯出 / 匯入）
//
// 設計重點：
//  - 純邏輯、不依賴 Phaser / DOM，方便以 Node 單元測試；儲存體由呼叫端注入。
//  - 讀入的資料（包含玩家匯入的檔案）一律視為不可信：sanitizeState 以
//    createInitialGameState() 為底，只複製白名單欄位並限制範圍，缺的欄位補預設值。
//  - 存檔格式：{ format: 'thief-legend-save', version, savedAt, state }；
//    同時相容舊版 { version: 1, savedAt, gameState }（無 format 欄位）。
//  - 此處的範圍檢查只防止壞檔 / 型別錯誤導致遊戲崩潰，不是防作弊機制
//    （存檔在玩家端，無法保證數值真實）。
//
// 存檔不含：技能冷卻（讀檔時歸零）、裝置相關設定（qualityLevel）、副本每日次數（另有獨立 key）。

import {
  createInitialGameState, POTIONS, expNeeded, JOBS, isJobId, DEFAULT_JOB, JOB_CHANGE_LEVEL, SKILL_SLOT_KEYS,
} from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { EQUIPMENT_SLOTS, EQUIPMENT_BASES, RARITIES } from '../config/equipment.js';
import { getQuestDef } from '../config/quests.js';

export const SAVE_FORMAT = 'thief-legend-save';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'thief-legend-save-v1';   // 與舊版相同的 key，舊存檔可直接讀取
// 匯入檔案大小上限（正常存檔 < 5 KB），避免讀入惡意大檔
export const MAX_SAVE_BYTES = 64 * 1024;

const MAX_LEVEL = 30;
const MAX_SKILL_POINTS = 999;
const MAX_SKILL_LEVEL = 10;
const MAX_POTIONS = 999;
const MAX_MESO = 99999999;
const MAX_KILLS = 9999999;
const MAX_PLAYTIME = 60 * 60 * 24 * 365;   // 秒
const MAX_STAT = 99999;

// 存檔時不可落腳的地圖（副本 / Boss）：讀檔改回最近的安全地圖
const FALLBACK_MAP = { dungeon: 'town', boss: 'kerning' };
const DEFAULT_MAP = 'sky';

function num(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function int(v, min, max, fallback) {
  return Math.floor(num(v, min, max, fallback));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeEquipment(raw, slot) {
  if (!isPlainObject(raw)) return null;
  const base = EQUIPMENT_BASES[slot];
  if (!base) return null;
  const rarity = Object.prototype.hasOwnProperty.call(RARITIES, raw.rarity) ? raw.rarity : 'common';
  return {
    ...base,
    rarity,
    rarityColor: RARITIES[rarity].hex,
    displayName: `${RARITIES[rarity].name}${base.name}`,
    atk:   int(raw.atk, 0, MAX_STAT, 0),
    hp:    int(raw.hp, 0, MAX_STAT, 0),
    mp:    int(raw.mp, 0, MAX_STAT, 0),
    speed: int(raw.speed, 0, MAX_STAT, 0),
  };
}

function sanitizeMap(key) {
  const mapped = FALLBACK_MAP[key] || key;
  return typeof mapped === 'string' && Object.prototype.hasOwnProperty.call(MAPS, mapped)
    && !FALLBACK_MAP[mapped]
    ? mapped
    : DEFAULT_MAP;
}

function sanitizeQuests(raw) {
  const out = { active: [], completed: [] };
  if (!isPlainObject(raw)) return out;
  const seen = new Set();
  if (Array.isArray(raw.completed)) {
    for (const id of raw.completed) {
      if (typeof id === 'string' && getQuestDef(id) && !seen.has(id)) {
        seen.add(id);
        out.completed.push(id);
      }
    }
  }
  if (Array.isArray(raw.active)) {
    for (const q of raw.active) {
      if (!isPlainObject(q) || typeof q.id !== 'string') continue;
      const def = getQuestDef(q.id);
      if (!def || seen.has(q.id)) continue;
      seen.add(q.id);
      out.active.push({ id: q.id, progress: int(q.progress, 0, def.type === 'reach' ? 1 : (def.count || 9999), 0) });
    }
  }
  return out;
}

// 把任意輸入轉成一份合法、可直接放進 registry 的 gameState。
// 只依賴 createInitialGameState 的欄位，未知欄位一律丟棄。
export function sanitizeState(raw) {
  const gs = createInitialGameState();
  if (!isPlainObject(raw)) return gs;

  gs.level = int(raw.level, 1, MAX_LEVEL, 1);
  gs.expNeeded = expNeeded(gs.level);
  gs.exp = gs.level >= MAX_LEVEL
    ? Math.min(int(raw.exp, 0, Number.MAX_SAFE_INTEGER, 0), gs.expNeeded - 1)
    : int(raw.exp, 0, gs.expNeeded - 1, 0);

  gs.maxHp = int(raw.maxHp, 1, MAX_STAT, gs.maxHp);
  gs.maxMp = int(raw.maxMp, 1, MAX_STAT, gs.maxMp);
  gs.atk = int(raw.atk, 1, MAX_STAT, gs.atk);
  gs.speed = int(raw.speed, 1, 320, gs.speed);
  gs.critRate = num(raw.critRate, 0, 1, gs.critRate);
  gs.critMulti = num(raw.critMulti, 1, 10, gs.critMulti);
  // 讀檔一律滿血滿魔，避免載入後在 0 HP 狀態直接死亡
  gs.hp = gs.maxHp;
  gs.mp = gs.maxMp;

  gs.meso = int(raw.meso, 0, MAX_MESO, 0);
  gs.killCount = int(raw.killCount, 0, MAX_KILLS, 0);
  gs.playTime = int(raw.playTime, 0, MAX_PLAYTIME, 0);
  gs.skillPoints = int(raw.skillPoints, 0, MAX_SKILL_POINTS, 0);
  gs.bossUnlocked = raw.bossUnlocked === true || gs.killCount >= 60;

  if (isPlainObject(raw.equipment)) {
    for (const slot of EQUIPMENT_SLOTS) {
      gs.equipment[slot] = sanitizeEquipment(raw.equipment[slot], slot);
    }
  }

  if (isPlainObject(raw.potions)) {
    for (const key of Object.keys(POTIONS)) {
      gs.potions[key] = int(raw.potions[key], 0, MAX_POTIONS, gs.potions[key]);
    }
  }

  // 職業：未知值 → 盜賊；未達轉職等級也不承認轉職後的職業（避免改檔拿到專屬技能）
  gs.job = isJobId(raw.job) && gs.level >= JOB_CHANGE_LEVEL ? raw.job : DEFAULT_JOB;
  const job = JOBS[gs.job];
  gs.title = job.title;   // 稱號由職業決定，不信任存檔內容
  gs.jobChoice = gs.job === DEFAULT_JOB && (raw.jobChoice === 'assassin' || raw.jobChoice === 'bandit')
    ? raw.jobChoice : null;

  // 技能：只認該職業技能池內的 id。等級 0..10；已解鎖清單由等級門檻與存檔共同決定，池中第一個技能一律解鎖
  const skillLevels = isPlainObject(raw.skillLevels) ? raw.skillLevels : {};
  const unlockedRaw = Array.isArray(raw.unlockedSkills) ? raw.unlockedSkills : [];
  const unlocked = new Set();
  gs.skillLevels = {};
  job.pool.forEach((key, i) => {
    const def = job.skills[key];
    const lv = int(skillLevels[key], 0, MAX_SKILL_LEVEL, i === 0 ? 1 : 0);
    const levelOk = gs.level >= def.unlockLevel;
    if (i === 0 || (levelOk && (unlockedRaw.includes(key) || lv > 0))) unlocked.add(key);
    gs.skillLevels[key] = unlocked.has(key) ? Math.max(1, lv) : 0;
  });
  gs.unlockedSkills = job.pool.filter((k) => unlocked.has(k));

  // 技能欄位：4 格、各放該職業技能池中不同的一個技能，且都必須已解鎖，否則回預設（防壞檔 / 重複 / 夾帶普通攻擊）
  const slots = Array.isArray(raw.skillSlots) ? raw.skillSlots : null;
  const validSlots = slots && slots.length === SKILL_SLOT_KEYS.length
    && new Set(slots).size === slots.length && slots.every((id) => job.pool.includes(id) && unlocked.has(id));
  // 解鎖的技能還沒多過欄位數時不允許自訂（避免拿舊檔 / 改檔提前調整）
  gs.skillSlots = validSlots && unlocked.size > SKILL_SLOT_KEYS.length ? [...slots] : [...job.defaultSlots];

  gs.currentMap = sanitizeMap(raw.currentMap);
  gs.spawnX = MAPS[gs.currentMap].spawnX ?? gs.spawnX;
  gs.quests = sanitizeQuests(raw.quests);
  return gs;
}

export function serializeSave(gs, now = Date.now()) {
  return JSON.stringify({
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: now,
    state: sanitizeState(gs),
  });
}

// 解析存檔文字。成功回傳 { ok: true, state, savedAt }，失敗回傳 { ok: false, error }。
export function parseSave(text) {
  if (typeof text !== 'string' || text.length === 0) return { ok: false, error: '存檔是空的' };
  if (text.length > MAX_SAVE_BYTES) return { ok: false, error: '存檔檔案過大' };
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    return { ok: false, error: '存檔格式錯誤（不是有效的 JSON）' };
  }
  // 舊版存檔沒有 format 欄位，內容放在 gameState
  const legacy = isPlainObject(data) && data.format === undefined && isPlainObject(data.gameState);
  if (!isPlainObject(data) || (data.format !== SAVE_FORMAT && !legacy)) {
    return { ok: false, error: '不是本遊戲的存檔檔案' };
  }
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION) {
    return { ok: false, error: '存檔版本較新，請更新遊戲後再試' };
  }
  const rawState = legacy ? data.gameState : data.state;
  if (!isPlainObject(rawState)) return { ok: false, error: '存檔內容缺失' };
  return {
    ok: true,
    state: sanitizeState(rawState),
    savedAt: Number.isFinite(data.savedAt) ? data.savedAt : 0,
  };
}

// 取得瀏覽器 localStorage；不可用（隱私模式、被封鎖）時回傳 null
export function getBrowserStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__maple_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (_) {
    return null;
  }
}

// 以注入的 storage（具 getItem / setItem / removeItem）建立存檔操作。
export function createSaveStore(storage) {
  return {
    available: !!storage,
    save(gs, now) {
      if (!storage) return false;
      try {
        storage.setItem(SAVE_KEY, serializeSave(gs, now));
        return true;
      } catch (_) {
        return false;   // 容量滿或被封鎖：靜默失敗，不中斷遊戲
      }
    },
    load() {
      if (!storage) return { ok: false, error: '瀏覽器不支援本機存檔' };
      let text;
      try {
        text = storage.getItem(SAVE_KEY);
      } catch (_) {
        return { ok: false, error: '無法讀取本機存檔' };
      }
      if (text === null || text === undefined) return { ok: false, error: '沒有存檔', empty: true };
      return parseSave(text);
    },
    has() {
      if (!storage) return false;
      try {
        return storage.getItem(SAVE_KEY) !== null;
      } catch (_) {
        return false;
      }
    },
    clear() {
      if (!storage) return;
      try { storage.removeItem(SAVE_KEY); } catch (_) { /* 靜默 */ }
    },
  };
}

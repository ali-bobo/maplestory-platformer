// 存檔管理（localStorage + 匯出 / 匯入）
//
// 設計重點：
//  - 純邏輯、不依賴 Phaser / DOM，方便以 Node 單元測試；儲存體由呼叫端注入。
//  - 讀入的資料（包含玩家匯入的檔案）一律視為不可信：sanitizeState 以
//    createInitialGameState() 為底，只複製白名單欄位並限制範圍，缺的欄位補預設值。
//  - 存檔格式：{ format: 'thief-legend-save', version, savedAt, state }；
//    同時相容舊版 { version: 1, savedAt, gameState }（無 format 欄位）。
//  - 改過名的地圖 key / 徽章 id 由 legacyIds.js 在驗證前換成新名。
//  - 此處的範圍檢查只防止壞檔 / 型別錯誤導致遊戲崩潰，不是防作弊機制
//    （存檔在玩家端，無法保證數值真實）。
//
// 存檔不含：技能冷卻（讀檔時歸零）、裝置相關設定（qualityLevel）、副本每日次數（另有獨立 key）。

import {
  createInitialGameState, POTIONS, expNeeded, JOBS, isJobId, DEFAULT_JOB, JOB_CHANGE_LEVEL, SKILL_SLOT_KEYS,
  MAX_LEVEL, titleFor, BOSS_FALLBACK_MAP,
} from '../config/constants.js';
import { SHARD_IDS } from '../config/shards.js';
import { sanitizeBadges, sanitizeBadgeRewards } from './badges.js';
import { MAPS } from '../config/maps.js';
import { EQUIPMENT_SLOTS, EQUIPMENT_BASES, RARITIES } from '../config/equipment.js';
import { getQuestDef, QUESTS } from '../config/quests.js';
import { pathBetween } from './worldGraph.js';
import { migrateLegacyIds } from './legacyIds.js';

export const SAVE_FORMAT = 'thief-legend-save';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'thief-legend-save-v1';   // 與舊版相同的 key，舊存檔可直接讀取
// 匯入檔案大小上限（正常存檔 < 5 KB），避免讀入惡意大檔
export const MAX_SAVE_BYTES = 64 * 1024;

const MAX_SKILL_POINTS = 999;
const MAX_SKILL_LEVEL = 10;
const MAX_POTIONS = 999;
const MAX_MESO = 99999999;
const MAX_KILLS = 9999999;
const MAX_PLAYTIME = 60 * 60 * 24 * 365;   // 秒
const MAX_STAT = 99999;

// 存檔時不可落腳的地圖（副本 / Boss）：讀檔改回最近的安全地圖
const FALLBACK_MAP = { dungeon: 'town', boss: BOSS_FALLBACK_MAP };
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

// 星光碎片：只認 SHARD_IDS、去重，順序依 SHARD_IDS（和取得順序無關）
function sanitizeShards(raw) {
  if (!Array.isArray(raw)) return [];
  return SHARD_IDS.filter((id) => raw.includes(id));
}

// 去過的地圖：只認有效、可落腳的地圖（副本 / Boss 房不算）。舊存檔沒有這個欄位時，
// 用「從起點沿傳送門走到目前所在地圖的最短路徑」推算（玩家一定走過那條路），再補上目前地圖。
function sanitizeVisited(raw, currentMap) {
  const out = new Set();
  const ok = (k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(MAPS, k) && !FALLBACK_MAP[k];
  if (Array.isArray(raw)) {
    for (const k of raw) if (ok(k)) out.add(k);
  } else {
    for (const k of pathBetween(DEFAULT_MAP, currentMap)) if (ok(k)) out.add(k);
  }
  out.add(currentMap);
  return Object.keys(MAPS).filter((k) => out.has(k));   // 依地圖表順序，輸出穩定
}

// 任務 id 必須是 QUESTS 自己的鍵（'__proto__'、'constructor' 之類沿原型鏈取得的東西不算）
function knownQuest(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(QUESTS, id) ? getQuestDef(id) : null;
}

function sanitizeQuests(raw) {
  const out = { active: [], completed: [] };
  if (!isPlainObject(raw)) return out;
  const seen = new Set();
  if (Array.isArray(raw.completed)) {
    for (const id of raw.completed) {
      if (knownQuest(id) && !seen.has(id)) {
        seen.add(id);
        out.completed.push(id);
      }
    }
  }
  if (Array.isArray(raw.active)) {
    for (const q of raw.active) {
      if (!isPlainObject(q) || typeof q.id !== 'string') continue;
      const def = knownQuest(q.id);
      if (!def || seen.has(q.id)) continue;
      seen.add(q.id);
      out.active.push({ id: q.id, progress: int(q.progress, 0, def.type === 'reach' ? 1 : (def.count || 9999), 0) });
    }
  }
  return out;
}

// 把任意輸入轉成一份合法、可直接放進 registry 的 gameState。
// 只依賴 createInitialGameState 的欄位，未知欄位一律丟棄。
export function sanitizeState(input) {
  const gs = createInitialGameState();
  if (!isPlainObject(input)) return gs;
  // 舊版地圖 key / 徽章 id 先換成新名（見 legacyIds.js），否則會被當成未知值丟掉
  const raw = migrateLegacyIds(input);

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
  // 星光碎片主線：碎片 5/5 並點亮星光之塔才解鎖最終 Boss。
  // 舊存檔（以擊殺數解鎖的舊版）已解鎖的 bossUnlocked: true 照舊承認（grandfather）。
  gs.shards = sanitizeShards(raw.shards);
  gs.towerLit = raw.towerLit === true && gs.shards.length >= SHARD_IDS.length;
  gs.bossUnlocked = raw.bossUnlocked === true || gs.towerLit;
  // 盜賊徽章：只認已知 id、去重；舊存檔沒有這兩個欄位 → 空陣列
  gs.badges = sanitizeBadges(raw.badges);
  gs.badgeRewards = sanitizeBadgeRewards(raw.badgeRewards, gs.badges.length);

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
  gs.title = titleFor(gs.job, gs.shards.length);   // 稱號由職業與碎片數決定，不信任存檔內容
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

  // 死亡警告看過了沒（每個存檔只提示一次）；不屬於 createInitialGameState，只有為 true 時才存在
  if (raw.deathWarned === true) gs.deathWarned = true;
  // 已通關（擊敗暗影魔君）：同樣只有為 true 時才存在；決定魔君王城 / 暗影領域的回程傳送門是否出現
  if (raw.gameCleared === true) gs.gameCleared = true;

  gs.currentMap = sanitizeMap(raw.currentMap);
  gs.spawnX = MAPS[gs.currentMap].spawnX ?? gs.spawnX;
  gs.visitedMaps = sanitizeVisited(raw.visitedMaps, gs.currentMap);
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
    const probe = '__thief_legend_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (_) {
    return null;
  }
}

// 以注入的 storage（具 getItem / setItem / removeItem）建立存檔操作。
// options.memory = true：storage 不可用（隱私模式、iframe 沙箱）或寫入失敗時，把最新存檔留在記憶體裡，
// 同一個分頁內「繼續遊戲」、匯出存檔代碼仍然有效；但 save() 仍回傳 false、status().unsaved 為 true，
// 讓畫面能誠實顯示「未存檔」。
export function createSaveStore(storage, options = {}) {
  const useMemory = options.memory === true;
  let memory = null;      // 最新一次寫入的文字（只在 useMemory 時保留）
  let lastWriteOk = true; // 最近一次寫入 storage 是否成功
  const fromMemory = () => useMemory && (!storage || !lastWriteOk) && memory !== null;
  return {
    available: !!storage,
    // 目前存檔是否真的寫進持久儲存：沒有 storage，或最近一次寫入失敗，都算「未存檔」
    status() {
      const persistent = !!storage;
      return { persistent, ok: persistent && lastWriteOk, unsaved: !persistent || !lastWriteOk };
    },
    save(gs, now) {
      let text;
      try { text = serializeSave(gs, now); } catch (_) { return false; }
      if (useMemory) memory = text;
      if (!storage) return false;
      try {
        storage.setItem(SAVE_KEY, text);
        lastWriteOk = true;
        return true;
      } catch (_) {
        lastWriteOk = false;
        return false;   // 容量滿或被封鎖：靜默失敗，不中斷遊戲
      }
    },
    load() {
      if (fromMemory()) return parseSave(memory);
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
      if (fromMemory()) return true;
      if (!storage) return false;
      try {
        return storage.getItem(SAVE_KEY) !== null;
      } catch (_) {
        return false;
      }
    },
    clear() {
      memory = null;
      if (!storage) return;
      try { storage.removeItem(SAVE_KEY); } catch (_) { /* 靜默 */ }
    },
  };
}

// ── 存檔代碼（可複製貼上的文字，取代檔案下載）────────────────────────────────────
// 格式：TL1:<8 位 16 進位檢查碼>:<base64url(UTF-8 JSON)>。檢查碼只防手滑（少複製一截、貼錯），不是防作弊。
// 內容就是存檔 JSON（裝備只留稀有度與數值以縮短長度），解碼後一律走 parseSave → sanitizeState，
// 與匯入檔案同一套驗證，所以代碼內容同樣視為不可信輸入。
export const CODE_PREFIX = 'TL1';
// 解碼後的 JSON 不得超過 MAX_SAVE_BYTES；base64 約膨脹 4/3，再留一點前綴空間
export const MAX_CODE_CHARS = Math.ceil((MAX_SAVE_BYTES * 4) / 3) + 64;

const B64_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INDEX = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64_URL.length; i++) t[B64_URL.charCodeAt(i)] = i;
  return t;
})();

export function bytesToBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_URL[b0 >> 2] + B64_URL[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64_URL[((b1 & 15) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64_URL[b2 & 63];
  }
  return out;
}

// 解 base64url（不含填充 =）；格式不對回傳 null
export function base64UrlToBytes(str) {
  if (typeof str !== 'string' || str.length === 0 || str.length % 4 === 1) return null;
  const vals = new Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    const v = c < 128 ? B64_INDEX[c] : -1;
    if (v < 0) return null;
    vals[i] = v;
  }
  const out = new Uint8Array(Math.floor((str.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < vals.length; i += 4) {
    const v0 = vals[i];
    const v1 = vals[i + 1];
    const v2 = i + 2 < vals.length ? vals[i + 2] : 0;
    const v3 = i + 3 < vals.length ? vals[i + 3] : 0;
    out[o++] = (v0 << 2) | (v1 >> 4);
    if (i + 2 < vals.length) out[o++] = ((v1 & 15) << 4) | (v2 >> 2);
    if (i + 3 < vals.length) out[o++] = ((v2 & 3) << 6) | v3;
  }
  return out;
}

// FNV-1a 32 位元，輸出 8 位小寫 16 進位
export function codeChecksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// 代碼裡的裝備只留稀有度與四項數值（名稱、圖示等衍生欄位讀入時由 sanitizeEquipment 重建）
function compactStateForCode(state) {
  const out = { ...state, equipment: {} };
  for (const slot of EQUIPMENT_SLOTS) {
    const e = state.equipment && state.equipment[slot];
    out.equipment[slot] = e ? { rarity: e.rarity, atk: e.atk, hp: e.hp, mp: e.mp, speed: e.speed } : null;
  }
  return out;
}

export function encodeSaveCode(gs, now = Date.now()) {
  const state = compactStateForCode(sanitizeState(gs));
  const json = JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, savedAt: now, state });
  const payload = bytesToBase64Url(new TextEncoder().encode(json));
  return `${CODE_PREFIX}:${codeChecksum(payload)}:${payload}`;
}

// 解碼存檔代碼。成功回傳 { ok: true, state, savedAt }，失敗 { ok: false, error }。
// 也接受直接貼上存檔檔案的 JSON 內容（以 { 開頭）。
export function decodeSaveCode(input) {
  if (typeof input !== 'string') return { ok: false, error: '請貼上存檔代碼' };
  if (input.length > MAX_CODE_CHARS + 4096) return { ok: false, error: '存檔代碼過長，不是本遊戲的存檔' };
  // 貼上時常夾帶換行、空白、全形空白、零寬字元、前後引號
  let text = input.replace(/[\s​-‍﻿　]+/g, '');
  text = text.replace(/^["'「『`]+|["'」』`]+$/g, '');
  if (text.length === 0) return { ok: false, error: '請貼上存檔代碼' };
  if (text.startsWith('{')) return parseSave(input.trim());
  if (text.length > MAX_CODE_CHARS) return { ok: false, error: '存檔代碼過長，不是本遊戲的存檔' };
  const parts = text.split(':');
  if (parts.length !== 3) return { ok: false, error: '存檔代碼格式不對（應為 TL1:檢查碼:內容）' };
  const [prefix, sum, payload] = parts;
  if (prefix !== CODE_PREFIX) {
    return { ok: false, error: /^TL\d+$/.test(prefix) ? '存檔代碼版本不符，請更新遊戲後再試' : '不是本遊戲的存檔代碼' };
  }
  if (codeChecksum(payload) !== sum.toLowerCase()) {
    return { ok: false, error: '檢查碼不符：代碼可能少複製了一段或被改過' };
  }
  const bytes = base64UrlToBytes(payload);
  if (!bytes) return { ok: false, error: '存檔代碼含有無法辨識的字元' };
  if (bytes.length > MAX_SAVE_BYTES) return { ok: false, error: '存檔內容過大' };
  let json;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    return { ok: false, error: '存檔代碼內容損毀' };
  }
  return parseSave(json);
}

// 一行存檔摘要（匯入覆蓋確認用）：「Lv.20 · 晨曦鎮 · 擊殺 120」
export function describeSave(state) {
  if (!state) return '';
  const mapName = (MAPS[state.currentMap] && MAPS[state.currentMap].name) || '晨曦鎮';
  const job = JOBS[state.job] && state.job !== DEFAULT_JOB ? `${JOBS[state.job].name} ` : '';
  return `${job}Lv.${state.level} · ${mapName} · 擊殺 ${state.killCount || 0}`;
}

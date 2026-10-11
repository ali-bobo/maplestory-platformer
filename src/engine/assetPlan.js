// 素材載入計畫（純資料，無 Phaser 依賴，單元測試可直接跑）。
// 決定「進入某張地圖 / 使用某個職業時，哪些素材必須在記憶體裡」；實際載入與釋放在 assetLoader.js。
// 來源：assetCatalog.js 的 scope 標籤 + 地圖 / 怪物 / 副本資料（不在場景裡寫死清單）。
import { ALL_ASSETS, ASSET_BY_KEY, PLATFORM_THEMES } from '../config/assetCatalog.js';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { getDungeonDef } from '../config/dungeons.js';

const monsterById = new Map(MONSTERS.map((m) => [m.id, m]));
// status 'unused' = 登錄了但程式沒用到的備用圖，不載入
const wanted = (a) => a && a.status !== 'unused';

export const assetsOfScope = (scope) => ALL_ASSETS.filter((a) => a.scope === scope && wanted(a));
export const bootAssets = () => assetsOfScope('boot');
export const coreAssets = () => assetsOfScope('core');
export const jobAssets = (jobId) => ALL_ASSETS.filter((a) => a.scope === 'job' && wanted(a) && a.jobs && a.jobs.includes(jobId));
export const allJobIds = () => [...new Set(ALL_ASSETS.filter((a) => a.scope === 'job').flatMap((a) => a.jobs || []))];

// 一張地圖 / 副本用到的素材鍵：背景、跳台圖、怪物圖、NPC 圖，加上目錄裡靜態標註 maps 的圖（Boss 等）
export function mapAssetKeys(mapKey, opts = {}) {
  const keys = new Set();
  const add = (k) => { if (k && wanted(ASSET_BY_KEY.get(k))) keys.add(k); };
  let data = MAPS[mapKey];
  const monsterIds = [];
  if (mapKey === 'dungeon') {
    const def = getDungeonDef(opts.dungeonId);
    if (def) {
      add(def.bgImage);
      for (const w of def.waves) for (const m of w.monsters) monsterIds.push(m.id);
    }
    data = null;
  }
  if (data) {
    add(data.bgImage);
    for (const m of data.monsters || []) monsterIds.push(m.id);
    for (const n of data.npcs || []) add(n.id);
  }
  if (PLATFORM_THEMES[mapKey]) add(PLATFORM_THEMES[mapKey].key);
  for (const id of monsterIds) { const def = monsterById.get(id); if (def) add(def.spriteKey); }
  for (const a of ALL_ASSETS) if (a.scope === 'map' && a.maps && a.maps.includes(mapKey)) add(a.key);
  return keys;
}

// 傳送門通往的相鄰地圖（副本入口不算：進副本時才載）
export function neighborMapKeys(mapKey) {
  const data = MAPS[mapKey];
  if (!data) return [];
  return [...new Set((data.portals || []).map((p) => p.target).filter((t) => MAPS[t] && t !== 'dungeon'))];
}

export const toAssets = (keys) => [...keys].map((k) => ASSET_BY_KEY.get(k)).filter(Boolean);

// 進入 mapKey（用 jobId 的角色）時必須常駐的素材鍵：boot + core + 該職業 + 本地圖；withNeighbors 再加相鄰地圖
export function residentKeys(mapKey, jobId, opts = {}) {
  const keys = new Set([...bootAssets(), ...coreAssets(), ...jobAssets(jobId)].map((a) => a.key));
  for (const k of mapAssetKeys(mapKey, opts)) keys.add(k);
  if (opts.withNeighbors) for (const n of neighborMapKeys(mapKey)) for (const k of mapAssetKeys(n)) keys.add(k);
  return keys;
}

// 會被釋放的素材（map / job 範圍）
export const releasable = (a) => a.scope === 'map' || a.scope === 'job';

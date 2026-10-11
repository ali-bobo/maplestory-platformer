// 世界地圖與傳送的規則（純邏輯，不依賴 Phaser）：節點對應、解鎖狀態、傳送費、能不能傳送。
// 畫面在 src/ui/WorldMapOverlay.js。

import { MAPS } from '../config/maps.js';

// 主線（照底圖上的畫出來的路線由左到右）：10 個節點剛好對應 ui_world_map 的 10 個錨點
export const WORLD_ROUTE = ['town', 'sky', 'henesys', 'ruins', 'harbor', 'desert', 'snow', 'lava', 'castle', 'boss'];
// 支線（畫在側欄，不在底圖路線上）
export const SIDE_MAPS = ['shrine', 'ellinia', 'kerning', 'taipei'];

// ui_world_map.webp（960×558）上的節點位置，來自 docs/asset_src/ui_world_map_nodes.json
export const WORLD_MAP_SIZE = { w: 960, h: 558 };
export const WORLD_MAP_NODES = [
  { x: 155, y: 293 }, { x: 266, y: 225 }, { x: 359, y: 275 }, { x: 436, y: 253 }, { x: 499, y: 205 },
  { x: 570, y: 247 }, { x: 636, y: 279 }, { x: 688, y: 235 }, { x: 749, y: 237 }, { x: 808, y: 299 },
];

// 去這張地圖的等級門檻：取所有通往它的傳送門 minLevel 的最大值（目前只有城市特區 Lv18）
export function mapMinLevel(key) {
  let lv = 0;
  for (const m of Object.values(MAPS)) {
    for (const p of m.portals) if (p.target === key && p.minLevel) lv = Math.max(lv, p.minLevel);
  }
  return lv;
}

// 傳送費：樞紐（晨曦鎮、影之殿堂）免費；其他 = 30 + 20 × 玩家等級（約等於 10 隻同級怪的金幣）
export function travelFee(level, key) {
  const m = MAPS[key];
  if (!m || m.hub) return 0;
  return 30 + 20 * Math.max(1, Math.floor(level || 1));
}

// 傳送不去的地圖：Boss 房（只能走王城的傳送門進，避免直接傳進決戰）
export function isTravelTarget(key) {
  return !!MAPS[key] && key !== 'boss';
}

// 節點狀態：current 目前所在 / unlocked 去過且等級夠 / locked 其他
export function mapState(gs, key) {
  if (!gs || !MAPS[key]) return 'locked';
  if (gs.currentMap === key) return 'current';
  if (key === 'boss') return gs.bossUnlocked ? 'unlocked' : 'locked';
  const visited = Array.isArray(gs.visitedMaps) && gs.visitedMaps.includes(key);
  return visited && (gs.level || 1) >= mapMinLevel(key) ? 'unlocked' : 'locked';
}

// 這次傳送行不行。ctx：{ inInstance 副本 / Boss 房, inCombat 附近有怪 }。回傳 { ok, reason, fee }
export function travelCheck(gs, key, ctx = {}) {
  const fee = travelFee(gs && gs.level, key);
  const fail = (reason) => ({ ok: false, reason, fee });
  if (!gs || !MAPS[key]) return fail('找不到這張地圖');
  if (ctx.inInstance || gs.currentMap === 'boss') return fail('副本與 Boss 戰中無法傳送');
  if (gs.currentMap === key) return fail('你已經在這裡了');
  if (key === 'boss') return fail('請從魔君王城的傳送門進入暗影領域');
  const st = mapState(gs, key);
  if (st === 'locked') {
    const need = mapMinLevel(key);
    if ((gs.level || 1) < need) return fail(`需要 Lv.${need} 才能前往`);
    return fail('還沒去過這張地圖');
  }
  if (ctx.inCombat) return fail('附近有怪物，無法傳送');
  if ((gs.meso || 0) < fee) return fail(`楓幣不足（需要 ${fee}）`);
  return { ok: true, reason: '', fee };
}

// 底圖座標 → 螢幕座標（底圖左上角在 originX/originY、縮放 scale）
export function nodeScreenPos(index, originX, originY, scale) {
  const n = WORLD_MAP_NODES[index];
  return { x: originX + n.x * scale, y: originY + n.y * scale };
}

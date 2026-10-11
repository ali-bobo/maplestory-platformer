// 世界地圖的連接關係（純邏輯）：從 maps.js 的傳送門推出來，不另外維護一份，避免和實際地圖脫節。
// 副本入口（target 'dungeon'）不算地圖連接；最終 Boss 房（boss）只是主線終點，照樣算一個節點。

import { MAPS } from '../config/maps.js';

// 某張地圖傳送門直接通往的地圖 key（去重、不含副本）
export function neighborsOf(mapKey) {
  const map = MAPS[mapKey];
  if (!map) return [];
  const out = [];
  for (const p of map.portals) {
    if (p.target !== 'dungeon' && MAPS[p.target] && !out.includes(p.target)) out.push(p.target);
  }
  return out;
}

// 所有無向連線 [a, b]（a < b 依地圖表順序，去重）；世界地圖畫線用
export function worldEdges() {
  const keys = Object.keys(MAPS);
  const seen = new Set();
  const edges = [];
  for (const a of keys) {
    for (const b of neighborsOf(a)) {
      const [x, y] = keys.indexOf(a) < keys.indexOf(b) ? [a, b] : [b, a];
      const id = `${x}|${y}`;
      if (!seen.has(id)) { seen.add(id); edges.push([x, y]); }
    }
  }
  return edges;
}

// 沿傳送門從 from 走到 to 的最短路徑（含頭尾）；走不到回傳 [to]（至少包含目的地）
export function pathBetween(from, to) {
  if (!MAPS[from] || !MAPS[to]) return [];
  if (from === to) return [from];
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const key = queue.shift();
    for (const n of neighborsOf(key)) {
      if (n in prev) continue;
      prev[n] = key;
      if (n === to) {
        const path = [];
        for (let k = to; k !== null; k = prev[k]) path.unshift(k);
        return path;
      }
      queue.push(n);
    }
  }
  return [to];
}

// 記下玩家去過這張地圖（副本 / Boss 房不算）。回傳是否是第一次。
export function visitMap(gs, mapKey) {
  if (!gs || !MAPS[mapKey] || mapKey === 'boss') return false;
  if (!Array.isArray(gs.visitedMaps)) gs.visitedMaps = [];
  if (gs.visitedMaps.includes(mapKey)) return false;
  gs.visitedMaps.push(mapKey);
  return true;
}

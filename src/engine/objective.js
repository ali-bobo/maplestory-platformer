// 常駐目標與任務日誌的資料（純邏輯，不依賴 Phaser / DOM，可單元測試）
//
// getObjective(gs) 回答「玩家現在該做什麼」：
//   1. 有進行中的任務 → 該任務的進度（「擊敗果凍精 0/5」），目標在別張地圖時加上「→ 地圖名」
//   2. 沒有進行中的任務 → 最近、等級合適的可接任務（「找島嶼義工接任務「史萊姆獵手」」）；轉職任務鏈優先
//   3. 都沒有 → 依主線：練功地圖 → 守護者 → 星光之塔 → 暗影領域
// 地點資訊全部由 maps.js / quests.js / monsters.js / dungeons.js 推出，不另外維護，避免和資料脫節。
// questLog(gs) 給任務日誌視窗：進行中 / 可接取 / 已完成，各附描述與地點。

import { MAPS } from '../config/maps.js';
import { QUESTS, JOB_QUEST_CHAIN, TRIAL_ITEM_NAME } from '../config/quests.js';
import { MONSTERS } from '../config/monsters.js';
import { SHARDS, SHARD_COUNT } from '../config/shards.js';
import { DUNGEONS } from '../config/dungeons.js';
import { neighborsOf } from './worldGraph.js';
import { questAvailable } from './questManager.js';

// 沒有任務可做時，依等級帶推薦的練功地圖（主線順序）
export const MAIN_LINE = ['sky', 'henesys', 'ruins', 'harbor', 'desert', 'snow', 'lava', 'castle'];
// 可接任務的地點等級下限比玩家高這麼多以上就不推薦（避免叫 1 級的人去魔君王城接任務）
const QUEST_LEVEL_SLACK = 5;
// 守護者的等級下限比玩家高這麼多以內，就直接叫玩家去挑戰；再高就先練功
const BOSS_LEVEL_SLACK = 2;

let INDEX = null;

function buildIndex() {
  const keys = Object.keys(MAPS);
  const npcById = new Map();       // npcId → { mapKey, name }
  const giverOf = new Map();       // questId → { mapKey, npcName }
  const monsterMaps = new Map();   // monsterId → [mapKey]
  const dungeonMap = new Map();    // dungeonId → mapKey（入口所在的地圖）
  for (const key of keys) {
    const m = MAPS[key];
    for (const npc of m.npcs || []) {
      if (npc.npcId) npcById.set(npc.npcId, { mapKey: key, name: npc.name });
      for (const q of npc.questIds || []) if (!giverOf.has(q)) giverOf.set(q, { mapKey: key, npcName: npc.name });
    }
    for (const mon of m.monsters || []) {
      if (!monsterMaps.has(mon.id)) monsterMaps.set(mon.id, []);
      monsterMaps.get(mon.id).push(key);
    }
    for (const p of m.portals || []) if (p.dungeonId && !dungeonMap.has(p.dungeonId)) dungeonMap.set(p.dungeonId, key);
  }
  // 每張地圖出發的 BFS：距離與「第一步該走去哪張地圖」
  const dist = new Map();
  const hop = new Map();
  for (const from of keys) {
    const d = new Map([[from, 0]]);
    const first = new Map();
    const queue = [from];
    while (queue.length) {
      const k = queue.shift();
      for (const n of neighborsOf(k)) {
        if (d.has(n)) continue;
        d.set(n, d.get(k) + 1);
        first.set(n, k === from ? n : first.get(k));
        queue.push(n);
      }
    }
    dist.set(from, d);
    hop.set(from, first);
  }
  const monsterNames = new Map(MONSTERS.map((mon) => [mon.id, String(mon.name).replace(/^小王[：:]/, '')]));
  return { npcById, giverOf, monsterMaps, dungeonMap, dist, hop, monsterNames };
}

function idx() {
  if (!INDEX) INDEX = buildIndex();
  return INDEX;
}

export function mapName(key) {
  return (MAPS[key] && MAPS[key].name) || '';
}

// from → to 的傳送門步數；走不到回 Infinity
export function mapDistance(from, to) {
  if (from === to) return 0;
  const d = idx().dist.get(from);
  return d && d.has(to) ? d.get(to) : Infinity;
}

// 從 from 往 to 走，下一張要進的地圖；已在目的地或走不到回 null
export function nextHop(from, to) {
  if (from === to) return null;
  const h = idx().hop.get(from);
  return (h && h.get(to)) || null;
}

// 目標地圖群裡離 from 最近的一張（from 自己若在群裡就是 from）
function nearestOf(from, mapKeys) {
  let best = null;
  let bestD = Infinity;
  for (const k of mapKeys || []) {
    const d = mapDistance(from, k);
    if (d < bestD) { best = k; bestD = d; }
  }
  return best;
}

// 在文字後面加上「→ 地圖名」；目的地不在目前地圖時才加，還要換地圖才到時補「先到哪裡」
function withArrow(text, cur, target) {
  if (!target || target === cur) return text;
  let out = `${text} → ${mapName(target)}`;
  const hop = nextHop(cur, target);
  if (hop && hop !== target) out += `（先到${mapName(hop)}）`;
  return out;
}

// 一個進行中任務：{ text, mapKey }；mapKey 是玩家該去的地圖（null = 不用移動 / 不明）
function describeActive(def, progress, cur) {
  const I = idx();
  const pc = `${progress}/${def.count}`;
  switch (def.type) {
    case 'kill': {
      const name = I.monsterNames.get(def.target) || def.target;
      return { text: `擊敗${name} ${pc}`, mapKey: nearestOf(cur, I.monsterMaps.get(def.target)) };
    }
    case 'collect': {
      const maps = (def.collect && def.collect.maps) || [];
      return { text: `收集${def.target === 'trial_token' ? TRIAL_ITEM_NAME : def.target} ${pc}`, mapKey: nearestOf(cur, maps) };
    }
    case 'reach':
      return { text: `前往${mapName(def.target)}`, mapKey: def.target };
    case 'talk': {
      const npc = I.npcById.get(def.target);
      return { text: `和${npc ? npc.name : '對方'}說話`, mapKey: npc ? npc.mapKey : null };
    }
    case 'choice': {
      const npc = I.npcById.get(def.target);
      return { text: `找${npc ? npc.name : '長老'}選擇你的道路`, mapKey: npc ? npc.mapKey : null };
    }
    case 'dungeon': {
      const dg = DUNGEONS[def.target];
      return { text: `通關${dg ? dg.name : '副本'}`, mapKey: I.dungeonMap.get(def.target) || null };
    }
    default:
      return { text: def.name, mapKey: null };
  }
}

function questOrder(id) {
  return Object.keys(QUESTS).indexOf(id);
}

// 玩家目前可以接、而且值得推薦的任務（附發任務的 NPC 與地圖）。依「轉職鏈優先、距離近、表內順序」排序
function recommendedAvailable(gs) {
  const I = idx();
  const cur = gs.currentMap;
  const out = [];
  for (const id of Object.keys(QUESTS)) {
    if (!questAvailable(gs, id)) continue;
    const giver = I.giverOf.get(id);
    if (!giver) continue;
    const band = MAPS[giver.mapKey] && MAPS[giver.mapKey].levelBand;
    if (band && band[0] > gs.level + QUEST_LEVEL_SLACK) continue;
    out.push({ id, def: QUESTS[id], giver, job: JOB_QUEST_CHAIN.includes(id) ? 0 : 1, d: mapDistance(cur, giver.mapKey), order: questOrder(id) });
  }
  out.sort((a, b) => a.job - b.job || a.d - b.d || a.order - b.order);
  return out;
}

// 依等級帶推薦的練功地圖
export function grindMap(level) {
  let pick = MAIN_LINE[0];
  for (const k of MAIN_LINE) {
    const band = MAPS[k] && MAPS[k].levelBand;
    if (band && band[0] <= level) pick = k;
  }
  return pick;
}

function mainLine(gs, cur) {
  if (gs.bossUnlocked) {
    return { kind: 'main', text: withArrow('前往暗影領域，擊敗暗影魔君', cur, 'boss'), mapKey: 'boss' };
  }
  const owned = new Set(Array.isArray(gs.shards) ? gs.shards : []);
  if (owned.size >= SHARD_COUNT) {
    return { kind: 'main', text: withArrow('把碎片放上星光之塔並點亮它', cur, 'town'), mapKey: 'town' };
  }
  const next = SHARDS.find((s) => !owned.has(s.id));
  const band = (next && MAPS[next.map] && MAPS[next.map].levelBand) || [1, 99];
  if (next && band[0] <= gs.level + BOSS_LEVEL_SLACK) {
    return {
      kind: 'main',
      text: withArrow(`挑戰${mapName(next.map)}的守護者（星光碎片 ${owned.size}/${SHARD_COUNT}）`, cur, next.map),
      mapKey: next.map,
    };
  }
  const grind = grindMap(gs.level);
  const gb = MAPS[grind].levelBand;
  if (grind === cur) {
    return { kind: 'grind', text: `在這裡練功，升到 Lv.${band[0]} 再去挑戰守護者`, mapKey: grind };
  }
  return { kind: 'grind', text: withArrow(`去${mapName(grind)}練功（Lv.${gb[0]}–${gb[1]}）`, cur, grind), mapKey: grind };
}

/**
 * 現在的目標。回傳 { kind, text, mapKey, questId? , more? }：
 *   kind: 'quest' 進行中任務 / 'available' 可接任務 / 'main' 主線 / 'grind' 練功 / 'boss' Boss 房 / 'none' 不顯示
 *   more: 還有幾個進行中的任務沒顯示（只有 kind 'quest' 才有）
 * gs 沒有就回 null。
 */
export function getObjective(gs) {
  if (!gs) return null;
  const cur = gs.currentMap;
  if (cur === 'dungeon') return { kind: 'none', text: '', mapKey: null };   // 副本有自己的倒數 HUD
  if (cur === 'boss') return { kind: 'boss', text: '擊敗暗影魔君', mapKey: 'boss' };
  const qs = gs.quests && Array.isArray(gs.quests.active) ? gs.quests.active : [];
  const actives = [];
  for (const entry of qs) {
    const def = Object.prototype.hasOwnProperty.call(QUESTS, entry.id) ? QUESTS[entry.id] : null;
    if (def) actives.push({ def, progress: entry.progress | 0 });
  }
  if (actives.length) {
    // 優先顯示「在目前地圖就能推進」的任務，其次是離得近的，再其次是接取順序
    let best = null;
    for (const a of actives) {
      const where = describeActive(a.def, a.progress, cur);
      const d = where.mapKey ? mapDistance(cur, where.mapKey) : 0;
      if (!best || d < best.d) best = { a, where, d };
    }
    return {
      kind: 'quest',
      text: withArrow(best.where.text, cur, best.where.mapKey),
      mapKey: best.where.mapKey,
      questId: best.a.def.id,
      more: actives.length - 1,
    };
  }
  const cand = recommendedAvailable(gs);
  if (cand.length) {
    const c = cand[0];
    const base = c.giver.mapKey === cur
      ? `找${c.giver.npcName}說話，接任務「${c.def.name}」`
      : `接任務「${c.def.name}」：找${c.giver.npcName}`;
    return { kind: 'available', text: withArrow(base, cur, c.giver.mapKey), mapKey: c.giver.mapKey, questId: c.id };
  }
  return mainLine(gs, cur);
}

// ── 任務日誌 ─────────────────────────────────────────────────────────────────────

function rewardText(def) {
  const r = def.rewards || {};
  const parts = [];
  if (r.exp) parts.push(`${r.exp} EXP`);
  if (r.meso) parts.push(`${r.meso} 金幣`);
  return parts.join('　');
}

/**
 * 任務日誌資料：
 *   active    進行中：{ id, name, desc, progress, count, progressText, where, reward }
 *   available 現在可以接：{ id, name, desc, where（「地圖 · NPC」）, reward, far, distance }；
 *             等級合適的在前、近的在前；地點太高階的標 far: true 排最後
 *   completed 已完成：{ id, name }
 */
export function questLog(gs) {
  const out = { active: [], available: [], completed: [] };
  if (!gs) return out;
  const I = idx();
  const cur = gs.currentMap;
  const qs = gs.quests || { active: [], completed: [] };
  for (const entry of qs.active || []) {
    const def = Object.prototype.hasOwnProperty.call(QUESTS, entry.id) ? QUESTS[entry.id] : null;
    if (!def) continue;
    const progress = entry.progress | 0;
    const w = describeActive(def, progress, cur);
    out.active.push({
      id: def.id, name: def.name, desc: def.desc, progress, count: def.count,
      progressText: `${progress}/${def.count}`,
      where: w.mapKey ? `${mapName(w.mapKey)}${w.mapKey === cur ? '（就在這裡）' : ''}` : '',
      reward: rewardText(def),
    });
  }
  for (const id of Object.keys(QUESTS)) {
    if (!questAvailable(gs, id)) continue;
    const giver = I.giverOf.get(id);
    if (!giver) continue;
    const band = MAPS[giver.mapKey] && MAPS[giver.mapKey].levelBand;
    out.available.push({
      id, name: QUESTS[id].name, desc: QUESTS[id].desc,
      where: `${mapName(giver.mapKey)} · ${giver.npcName}`,
      reward: rewardText(QUESTS[id]),
      far: !!(band && band[0] > gs.level + QUEST_LEVEL_SLACK),
      distance: mapDistance(cur, giver.mapKey),
    });
  }
  // 等級合適的排前面，再依離目前地圖的步數，最後依任務表順序
  out.available.sort((a, b) => (a.far - b.far) || (a.distance - b.distance) || (questOrder(a.id) - questOrder(b.id)));
  for (const id of qs.completed || []) {
    if (Object.prototype.hasOwnProperty.call(QUESTS, id)) out.completed.push({ id, name: QUESTS[id].name });
  }
  return out;
}

// 盜賊徽章：擺放位置（用遊戲實際的平台資料驗證拿得到）、存檔驗證、收集獎勵只發一次。
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/config/maps.js';
import { WORLD_HEIGHT, createInitialGameState } from '../src/config/constants.js';
import {
  BADGES, BADGE_COUNT, BADGE_IDS, BADGE_REWARDS, BADGE_TOUCH_RADIUS, badgesOnMap,
} from '../src/config/badges.js';
import {
  badgeCount, grantBadge, claimBadgeRewards, mapBadgeProgress, remainingBadgesOnMap, badgeLog,
  sanitizeBadges, sanitizeBadgeRewards,
} from '../src/engine/badges.js';
import { sanitizeState, serializeSave, parseSave, encodeSaveCode, decodeSaveCode } from '../src/engine/saveManager.js';
import { applyDeathPenalty } from '../src/engine/death.js';
import { buildPlatformGraph, jumpHeight, jumpVelFor, EDGE_WALK, EDGE_JUMP } from '../src/engine/platformGraph.js';

const PLATFORM_H = 24;          // 與 BaseMapScene 的 PLATFORM_HEIGHT 一致
const PLAYER_JUMP_VEL = 520;    // Player.js 的起跳速度；可以二段跳
const MIN_LIFT = 20, MAX_LIFT = 115;   // 徽章中心要在支撐平台頂上方這個範圍內（站著碰得到，或原地一跳碰得到）
const EDGE_MARGIN = 8;          // 徽章離平台（或地圖邊界）至少這麼遠，不會懸在空中
const PORTAL_W = 44, PORTAL_H = 78;   // 傳送門碰撞框（portal 貼圖大小，中心在 pd.x / pd.y）
const PORTAL_CLEAR = 100;       // 徽章離傳送門框至少這麼遠：碰徽章不會順便踩進傳送門

// 遊戲中站得到的平台範圍：平台超出地圖寬度的部分站不到
const span = (p, width) => ({ left: Math.max(0, p.x), right: Math.min(width, p.x + p.width) });

// 徽章正下方第一個平台（含地面）
function supportOf(b) {
  const map = MAPS[b.map];
  let best = null;
  map.platforms.forEach((p, i) => {
    const s = span(p, map.width);
    if (b.x < s.left + EDGE_MARGIN || b.x > s.right - EDGE_MARGIN) return;
    if (p.y < b.y) return;
    if (!best || p.y < best.p.y) best = { p, i };
  });
  return best;
}

// 從地面出發、用跑 / 跳 / 二段跳能到的平台（platformGraph 的保守規則：上跳水平間隙 ≤ 90）
function reachablePlatforms(platforms) {
  const g = buildPlatformGraph(platforms);
  const maxVel = jumpVelFor(2 * jumpHeight(PLAYER_JUMP_VEL));
  const start = platforms.findIndex((p) => p.isGround);
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const a = queue.shift();
    for (let b = 0; b < g.n; b++) {
      if (seen.has(b)) continue;
      const e = a * g.n + b;
      if (g.kind[e] === EDGE_WALK || (g.kind[e] === EDGE_JUMP && g.need[e] <= maxVel)) { seen.add(b); queue.push(b); }
    }
  }
  return seen;
}

function rectDist(x, y, l, t, r, btm) {
  const dx = x < l ? l - x : x > r ? x - r : 0;
  const dy = y < t ? t - y : y > btm ? y - btm : 0;
  return Math.hypot(dx, dy);
}

test('徽章總數 30、id 不重複、地圖都存在', () => {
  assert.equal(BADGE_COUNT, 30);
  assert.equal(new Set(BADGE_IDS).size, BADGES.length);
  for (const b of BADGES) {
    assert.ok(Object.prototype.hasOwnProperty.call(MAPS, b.map), `${b.id} 的地圖 ${b.map}`);
    assert.match(b.id, /^[a-z]+_\d+$/);
  }
});

test('每張可探索地圖 2～3 枚；Boss 房與副本沒有', () => {
  for (const key of Object.keys(MAPS)) {
    const n = badgesOnMap(key).length;
    if (key === 'boss') assert.equal(n, 0, 'Boss 房不放徽章');
    else assert.ok(n >= 2 && n <= 3, `${key} 有 ${n} 枚`);
  }
  assert.equal(badgesOnMap('dungeon').length, 0);
});

test('每枚徽章都在地圖範圍內、浮在平台或地面上方一小段、不卡進平台', () => {
  for (const b of BADGES) {
    const map = MAPS[b.map];
    assert.ok(b.x > 0 && b.x < map.width && b.y > 0 && b.y < WORLD_HEIGHT, `${b.id} 超出地圖`);
    const sup = supportOf(b);
    assert.ok(sup, `${b.id} 下方沒有平台（會懸空）`);
    const lift = sup.p.y - b.y;
    assert.ok(lift >= MIN_LIFT && lift <= MAX_LIFT, `${b.id} 離平台 ${lift}px（應在 ${MIN_LIFT}～${MAX_LIFT}）`);
    for (const p of map.platforms) {
      const d = rectDist(b.x, b.y, p.x, p.y, p.x + p.width, p.y + PLATFORM_H);
      assert.ok(d >= BADGE_TOUCH_RADIUS - 2, `${b.id} 和平台 (${p.x},${p.y}) 重疊`);
    }
  }
});

test('每枚徽章的支撐平台從地面走得到（跑、跳、二段跳）', () => {
  for (const b of BADGES) {
    const map = MAPS[b.map];
    const reach = reachablePlatforms(map.platforms);
    const sup = supportOf(b);
    assert.ok(reach.has(sup.i), `${b.id} 所在平台 (${sup.p.x},${sup.p.y}) 到不了`);
  }
});

test('徽章離傳送門夠遠（碰徽章不會誤觸換圖）', () => {
  for (const b of BADGES) {
    for (const pd of MAPS[b.map].portals) {
      const d = rectDist(b.x, b.y, pd.x - PORTAL_W / 2, pd.y - PORTAL_H / 2, pd.x + PORTAL_W / 2, pd.y + PORTAL_H / 2);
      assert.ok(d >= PORTAL_CLEAR, `${b.id} 離傳送門 ${pd.label} 只有 ${Math.round(d)}px`);
    }
  }
});

test('獎勵門檻遞增、不超過總數，每個門檻都有說明文字', () => {
  let prev = 0;
  for (const r of BADGE_REWARDS) {
    assert.ok(r.at > prev && r.at <= BADGE_COUNT);
    assert.ok(typeof r.text === 'string' && r.text.length > 0);
    prev = r.at;
  }
  assert.deepEqual(BADGE_REWARDS.map((r) => r.at), [10, 20, 30]);
});

test('撿徽章：計數、重複與未知 id 不改動', () => {
  const gs = createInitialGameState();
  const r = grantBadge(gs, 'sky_1');
  assert.equal(r.count, 1);
  assert.equal(r.badge.map, 'sky');
  assert.deepEqual(r.rewards, []);
  assert.equal(grantBadge(gs, 'sky_1'), null);
  assert.equal(grantBadge(gs, 'nope'), null);
  assert.equal(grantBadge(gs, '__proto__'), null);
  assert.equal(badgeCount(gs), 1);
  assert.deepEqual(mapBadgeProgress(gs, 'sky'), { got: 1, total: 3 });
  assert.deepEqual(remainingBadgesOnMap(gs, 'sky').map((b) => b.id), ['sky_2', 'sky_3']);
  assert.deepEqual(mapBadgeProgress(gs, 'boss'), { got: 0, total: 0 });
});

test('獎勵：10 / 20 / 30 各發一次，重複呼叫不重複發', () => {
  const gs = createInitialGameState();
  const base = { meso: gs.meso, critRate: gs.critRate, critMulti: gs.critMulti };
  const got = [];
  for (const id of BADGE_IDS) {
    const r = grantBadge(gs, id);
    for (const rw of r.rewards) got.push([r.count, rw.at]);
    assert.deepEqual(claimBadgeRewards(gs), [], '同一個門檻不能再領');
  }
  assert.deepEqual(got, [[10, 10], [20, 20], [30, 30]]);
  assert.deepEqual(gs.badgeRewards, [10, 20, 30]);
  const meso = BADGE_REWARDS.reduce((s, r) => s + (r.meso || 0), 0);
  assert.equal(gs.meso, base.meso + meso);
  assert.ok(Math.abs(gs.critRate - (base.critRate + 0.02)) < 1e-9);
  assert.ok(Math.abs(gs.critMulti - (base.critMulti + 0.1)) < 1e-9);
  // 存檔往返後仍然不會再發
  const loaded = parseSave(serializeSave(gs)).state;
  assert.deepEqual(claimBadgeRewards(loaded), []);
  assert.equal(loaded.meso, gs.meso);
});

test('收集到一半跨過門檻：一次撿到多個門檻時全部發放（例如存檔被補滿）', () => {
  const gs = createInitialGameState();
  gs.badges = BADGE_IDS.slice(0, 25);
  const rw = claimBadgeRewards(gs);
  assert.deepEqual(rw.map((r) => r.at), [10, 20]);
  assert.deepEqual(gs.badgeRewards, [10, 20]);
});

test('存檔驗證：只認已知 id、去重、非陣列 → []，順序固定', () => {
  assert.deepEqual(sanitizeBadges(null), []);
  assert.deepEqual(sanitizeBadges('sky_1'), []);
  assert.deepEqual(sanitizeBadges({ 0: 'sky_1' }), []);
  assert.deepEqual(sanitizeBadges(['town_1', 'sky_1', 'sky_1', 'bogus', 7, null, '__proto__']), ['sky_1', 'town_1']);
  assert.deepEqual(sanitizeBadgeRewards([10, 20, 20, 15, '10', 30], 22), [10, 20]);
  assert.deepEqual(sanitizeBadgeRewards('10', 30), []);
  const s = sanitizeState({ badges: ['sky_2', 'sky_2', 'x'], badgeRewards: [10] });
  assert.deepEqual(s.badges, ['sky_2']);
  assert.deepEqual(s.badgeRewards, [], '收集數不到門檻，已領門檻不承認');
});

test('舊存檔沒有徽章欄位也能讀；存檔 / 存檔代碼往返保留徽章', () => {
  const legacy = JSON.stringify({ version: 1, savedAt: 1, gameState: { level: 5, currentMap: 'henesys' } });
  const res = parseSave(legacy);
  assert.ok(res.ok);
  assert.deepEqual(res.state.badges, []);
  assert.deepEqual(res.state.badgeRewards, []);

  const gs = createInitialGameState();
  for (const id of BADGE_IDS.slice(0, 12)) grantBadge(gs, id);
  const back = parseSave(serializeSave(gs)).state;
  assert.deepEqual(back.badges, BADGE_IDS.slice(0, 12));
  assert.deepEqual(back.badgeRewards, [10]);
  const viaCode = decodeSaveCode(encodeSaveCode(gs));
  assert.ok(viaCode.ok);
  assert.deepEqual(viaCode.state.badges, back.badges);
});

test('死亡不會失去徽章與永久暴擊加成', () => {
  const gs = createInitialGameState();
  for (const id of BADGE_IDS) grantBadge(gs, id);
  gs.currentMap = 'snow';
  const after = applyDeathPenalty(gs, 300);
  assert.equal(after.badges.length, BADGE_COUNT);
  assert.equal(after.critRate, gs.critRate);
  assert.equal(after.critMulti, gs.critMulti);
});

test('任務日誌摘要：沒去過的地圖不顯示名稱、獎勵標記已領', () => {
  const gs = createInitialGameState();
  gs.visitedMaps = ['sky', 'town'];
  grantBadge(gs, 'town_2');
  const log = badgeLog(gs);
  assert.equal(log.count, 1);
  assert.equal(log.total, 30);
  assert.equal(log.maps.length, 13);
  assert.equal(log.maps.reduce((s, m) => s + m.total, 0), 30);
  const town = log.maps.find((m) => m.key === 'town');
  assert.deepEqual([town.visited, town.got, town.total], [true, 1, 2]);
  assert.equal(log.maps.find((m) => m.key === 'castle').visited, false);
  assert.ok(log.rewards.every((r) => !r.claimed));
});

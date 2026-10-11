// 世界地圖傳送規則、支線入口（岔路跳台）的位置與可達性
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/config/maps.js';
import { createInitialGameState } from '../src/config/constants.js';
import { neighborsOf } from '../src/engine/worldGraph.js';
import {
  WORLD_ROUTE, SIDE_MAPS, WORLD_MAP_NODES, WORLD_MAP_SIZE, mapMinLevel, travelFee, mapState, travelCheck, isTravelTarget,
} from '../src/engine/worldTravel.js';

const GROUND_Y = 600;

const gsAt = (map, over = {}) => ({ ...createInitialGameState(), currentMap: map, level: 20, meso: 5000, visitedMaps: ['sky', 'henesys', 'town', 'shrine'], ...over });

test('世界地圖：主線 10 個節點對應 10 個錨點，加上 4 張支線剛好是全部地圖', () => {
  assert.equal(WORLD_ROUTE.length, WORLD_MAP_NODES.length);
  assert.deepEqual([...WORLD_ROUTE, ...SIDE_MAPS].sort(), Object.keys(MAPS).sort());
  for (const n of WORLD_MAP_NODES) assert.ok(n.x > 0 && n.x < WORLD_MAP_SIZE.w && n.y > 0 && n.y < WORLD_MAP_SIZE.h);
  // 錨點由左到右（畫出來的路線）
  for (let i = 1; i < WORLD_MAP_NODES.length; i++) assert.ok(WORLD_MAP_NODES[i].x > WORLD_MAP_NODES[i - 1].x);
  // 主線相鄰兩張地圖真的有傳送門連著（晨曦鎮 → 浮空島嶼 → 森林…→ 暗影領域）
  for (let i = 1; i < WORLD_ROUTE.length; i++) {
    const [a, b] = [WORLD_ROUTE[i - 1], WORLD_ROUTE[i]];
    assert.ok(neighborsOf(a).includes(b) || neighborsOf(b).includes(a), `${a} - ${b}`);
  }
});

test('傳送費：樞紐免費，其他隨玩家等級成長', () => {
  assert.equal(travelFee(30, 'town'), 0);
  assert.equal(travelFee(30, 'shrine'), 0);
  assert.equal(travelFee(10, 'henesys'), 230);
  assert.ok(travelFee(30, 'lava') > travelFee(10, 'lava'));
  assert.equal(travelFee(10, 'nope'), 0);
});

test('節點狀態：目前所在 / 去過且等級夠 = 解鎖 / 其餘鎖定；城市特區要 Lv18', () => {
  assert.equal(mapMinLevel('kerning'), 18);
  assert.equal(mapMinLevel('henesys'), 0);
  const gs = gsAt('sky');
  assert.equal(mapState(gs, 'sky'), 'current');
  assert.equal(mapState(gs, 'henesys'), 'unlocked');
  assert.equal(mapState(gs, 'ruins'), 'locked');        // 沒去過
  gs.visitedMaps.push('kerning');
  gs.level = 17;
  assert.equal(mapState(gs, 'kerning'), 'locked');      // 去過但等級不夠
  gs.level = 18;
  assert.equal(mapState(gs, 'kerning'), 'unlocked');
  assert.equal(mapState(gs, 'boss'), 'locked');
  gs.bossUnlocked = true;
  assert.equal(mapState(gs, 'boss'), 'unlocked');
});

test('傳送檢查：副本 / Boss 房 / 戰鬥中 / 錢不夠 / 未解鎖 都被拒絕', () => {
  const gs = gsAt('sky');
  const ok = travelCheck(gs, 'henesys');
  assert.deepEqual([ok.ok, ok.fee], [true, 430]);
  assert.equal(travelCheck(gs, 'town').fee, 0);
  assert.equal(travelCheck(gs, 'henesys', { inInstance: true }).ok, false);
  assert.equal(travelCheck(gs, 'henesys', { inCombat: true }).ok, false);
  assert.match(travelCheck(gs, 'ruins').reason, /還沒去過/);
  assert.equal(travelCheck(gs, 'sky').ok, false);                           // 已在這裡
  assert.equal(travelCheck({ ...gs, meso: 100 }, 'henesys').ok, false);
  assert.equal(travelCheck({ ...gs, meso: 100 }, 'town').ok, true);        // 免費的不看錢
  assert.equal(travelCheck({ ...gs, currentMap: 'boss' }, 'town').ok, false);
  assert.equal(travelCheck({ ...gs, bossUnlocked: true }, 'boss').ok, false);   // Boss 房只能走傳送門
  assert.equal(isTravelTarget('boss'), false);
  assert.match(travelCheck({ ...gs, level: 10, visitedMaps: ['sky', 'kerning'] }, 'kerning').reason, /Lv\.18/);
});

// ── 支線入口：岔路跳台 ─────────────────────────────────────────────────────────
const SIDE_TARGETS = ['ellinia', 'kerning', 'shrine'];

// 腳底站得上去的平台（含地面）
function platformUnder(map, p) {
  const feet = p.y + 48;
  return map.platforms.find((pl) => !pl.isGround && p.x >= pl.x + 20 && p.x <= pl.x + pl.width - 20 && Math.abs(pl.y - feet) <= 2);
}

// 沿「單步最多 200 往上、水平空隙最多 150」從地面往上爬，回傳可到達的平台集合（雙跳約 270、單跳約 135，這裡取保守值）
function reachable(map) {
  const plats = map.platforms.filter((p) => !p.isGround);
  const reached = new Set();
  const canStep = (fromY, fromX0, fromX1, to) => {
    const rise = fromY - to.y;
    const gap = Math.max(0, to.x - fromX1, fromX0 - (to.x + to.width));
    return rise <= 200 && rise >= -400 && gap <= 150;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const pl of plats) {
      if (reached.has(pl)) continue;
      const fromGround = GROUND_Y - pl.y <= 200;
      const fromOther = [...reached].some((r) => canStep(r.y, r.x, r.x + r.width, pl));
      if (fromGround || fromOther) { reached.add(pl); changed = true; }
    }
  }
  return reached;
}

test('支線入口（神秘之境 / 城市特區 / 影之殿堂）都在岔路跳台上，要按互動鍵，走地面碰不到', () => {
  const found = new Set();
  for (const [key, map] of Object.entries(MAPS)) {
    for (const p of map.portals) {
      if (!SIDE_TARGETS.includes(p.target)) continue;
      if (map.portals.some((q) => q === p) && (p.x <= 60 || p.x >= map.width - 60) && !p.interact) continue;   // 側邊地圖往回走的出口在地圖盡頭
      found.add(`${key}->${p.target}`);
      assert.equal(p.interact, true, `${key}->${p.target} 要互動鍵`);
      assert.ok(p.y + 48 < GROUND_Y - 150, `${key}->${p.target} 離地面至少 150`);
      const plat = platformUnder(map, p);
      assert.ok(plat, `${key}->${p.target} 腳下要有平台`);
      assert.ok(reachable(map).has(plat), `${key}->${p.target} 的平台要能用一般跳躍爬上去`);
      // 在畫面右上半部（地圖右半邊）
      assert.ok(p.x > map.width * 0.55, `${key}->${p.target} 在右半邊`);
    }
  }
  assert.deepEqual([...found].sort(), ['henesys->ellinia', 'town->kerning', 'town->shrine']);
});

test('地面（y=600 附近）上除了地圖兩端，沒有任何會自動觸發的傳送門擋在路中間', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    for (const p of map.portals) {
      const onGround = Math.abs(p.y + 48 - GROUND_Y) <= 2;
      if (!onGround || p.interact) continue;
      const atEdge = p.x <= 60 || p.x >= map.width - 60 || (key === 'shrine');
      assert.ok(atEdge, `${key} → ${p.target} 在地面中間 x=${p.x}`);
    }
  }
});

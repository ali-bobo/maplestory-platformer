// 地圖機制與商店的純邏輯
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  iceVelocity, zoneAt, lavaPhase, lavaDamage, ICE_ACCEL, ICE_DECEL, QUICKSAND_SPEED_MULT,
  LAVA_IDLE, LAVA_WARN, LAVA_ERUPT,
} from '../src/engine/mapModifierLogic.js';
import { buyShopItem, shopItemLabel } from '../src/engine/shop.js';
import { shopOf, DEFAULT_SHOP } from '../src/config/shops.js';
import { createInitialGameState } from '../src/config/constants.js';
import { MAPS } from '../src/config/maps.js';

test('冰面：加速與煞車都有慣性，放開方向鍵後要滑一段才停', () => {
  // 0 → 220：每秒 +700，不會瞬間到速
  let v = 0;
  for (let i = 0; i < 6; i++) v = iceVelocity(v, 220, 1 / 60);
  assert.ok(v > 0 && v < 220, `6 幀後速度 ${v}`);
  // 放開：220 → 0 約 220/230 ≈ 0.96 秒，比反向加速慢（煞車 < 加速）
  assert.ok(ICE_DECEL < ICE_ACCEL);
  let t = 0; v = 220;
  while (v !== 0 && t < 5) { v = iceVelocity(v, 0, 1 / 60); t += 1 / 60; }
  assert.ok(t > 0.8 && t < 1.2, `煞車時間 ${t.toFixed(2)}s`);
  // 到達目標速度不會越過
  assert.equal(iceVelocity(219, 220, 1), 220);
  assert.equal(iceVelocity(-10, 0, 1), 0);
  // 反向：從 +220 往 -220 先減速、過零、再加速
  v = 220; for (let i = 0; i < 20; i++) v = iceVelocity(v, -220, 1 / 60);
  assert.ok(v < 220 && v > -220);
});

test('流沙：區域判定含邊界；預設移速 ×0.6（慢 40%）', () => {
  const zones = [{ x: 900, width: 340 }, { x: 1700, width: 380 }];
  assert.equal(zoneAt(zones, 899), null);
  assert.equal(zoneAt(zones, 900), zones[0]);
  assert.equal(zoneAt(zones, 1240), zones[0]);
  assert.equal(zoneAt(zones, 1241), null);
  assert.equal(zoneAt(zones, 1800), zones[1]);
  assert.equal(zoneAt([], 5), null);
  assert.equal(QUICKSAND_SPEED_MULT, 0.6);
  assert.equal(MAPS.desert.modifier.speedMult, 0.6);
});

test('岩漿週期：待機 → 預警 → 噴發，各區用 offset 錯開；預警一定出現在噴發之前', () => {
  const cfg = { period: 5200, warn: 1400, erupt: 1000 };
  assert.equal(lavaPhase(0, cfg), LAVA_IDLE);
  assert.equal(lavaPhase(2799, cfg), LAVA_IDLE);
  assert.equal(lavaPhase(2800, cfg), LAVA_WARN);
  assert.equal(lavaPhase(4199, cfg), LAVA_WARN);
  assert.equal(lavaPhase(4200, cfg), LAVA_ERUPT);
  assert.equal(lavaPhase(5199, cfg), LAVA_ERUPT);
  assert.equal(lavaPhase(5200, cfg), LAVA_IDLE);                 // 下一個週期
  assert.equal(lavaPhase(0, cfg, 4200), LAVA_ERUPT);              // offset 錯開
  // 掃過整個週期：每次進入噴發前一定先經過預警（玩家有時間反應）
  let prev = lavaPhase(0, cfg);
  for (let t = 1; t < 15600; t += 10) {
    const ph = lavaPhase(t, cfg);
    if (ph === LAVA_ERUPT && prev !== LAVA_ERUPT) assert.equal(prev, LAVA_WARN, `t=${t}`);
    prev = ph;
  }
});

test('岩漿傷害：最大 HP 的小百分比（至少 20）', () => {
  assert.equal(lavaDamage(1000, 0.05), 50);
  assert.equal(lavaDamage(100, 0.05), 20);
  assert.ok(lavaDamage(1200, MAPS.lava.modifier.damagePct) < 1200 * 0.1);
});

test('商店：購買扣金幣加藥水；金幣不足不扣；庫存上限 999；shop:true 用預設雜貨店', () => {
  const gs = createInitialGameState();
  gs.meso = 100;
  const item = { key: 'S', qty: 3, cost: 70 };
  assert.equal(buyShopItem(gs, item), 'ok');
  assert.equal(gs.meso, 30);
  assert.equal(gs.potions.S, 3 + 3);
  assert.equal(buyShopItem(gs, item), 'poor');
  assert.equal(gs.meso, 30);
  assert.equal(gs.potions.S, 6);
  gs.meso = 1000; gs.potions.G = 998;
  buyShopItem(gs, { key: 'G', qty: 5, cost: 10 });
  assert.equal(gs.potions.G, 999);
  assert.equal(buyShopItem(gs, { key: 'ZZ', qty: 1, cost: 1 }), 'poor');
  assert.equal(shopItemLabel({ key: 'A', qty: 3 }), 'HP藥水 ×3');
  assert.equal(shopOf({ shop: true }), DEFAULT_SHOP);
  assert.equal(shopOf({}), null);
  assert.equal(shopOf(MAPS.town.npcs.find((n) => n.shop)), DEFAULT_SHOP);
});

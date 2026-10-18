// 地圖氛圍：每張地圖都有設定、粒子預算、減少動態 / 品質縮減、標題卡顯示規則
import test from 'node:test';
import assert from 'node:assert/strict';
import { AMBIENCE, AMBIENCE_BUDGET, RARITY_GLOW } from '../src/config/ambience.js';
import { ambienceFor, totalParticles, layerCount, spawnWidth, emitFrequency, shouldShowTitle } from '../src/engine/ambienceLogic.js';
import { MAPS } from '../src/config/maps.js';
import { RARITIES } from '../src/config/equipment.js';
import { QUALITY_PRESETS } from '../src/config/constants.js';

const KINDS = ['petal', 'leaf', 'firefly', 'mote', 'twinkle', 'rain', 'spray', 'dust', 'sand', 'flake', 'ember', 'ash', 'candle', 'bokeh'];

test('氛圍：每張一般地圖都有設定，且有標題卡副標', () => {
  for (const key of Object.keys(MAPS)) {
    const p = ambienceFor(key, MAPS[key].bgType);
    assert.ok(p, `${key} 沒有氛圍設定`);
    if (key !== 'boss') assert.ok(typeof p.subtitle === 'string' && p.subtitle.length > 0 && p.subtitle.length <= 16, `${key} 副標`);
  }
  assert.equal(ambienceFor('nope'), null);
  assert.equal(ambienceFor('nope', 'forest'), AMBIENCE.forest);
});

test('氛圍：每張地圖粒子總數 ≤ 預算，粒子種類都認得、暗角 / 色調在合理範圍', () => {
  for (const [key, p] of Object.entries(AMBIENCE)) {
    assert.ok(totalParticles(p) <= AMBIENCE_BUDGET, `${key} 粒子 ${totalParticles(p)}`);
    for (const l of p.layers || []) {
      assert.ok(KINDS.includes(l.kind), `${key} 未知粒子 ${l.kind}`);
      assert.ok(l.count > 0 && l.count <= 40, `${key} ${l.kind} count`);
      assert.ok(l.sf === undefined || (l.sf >= 0 && l.sf <= 1));
    }
    assert.ok(!p.vignette || (p.vignette > 0 && p.vignette <= 0.35), `${key} 暗角太重`);
    for (const side of ['top', 'bottom']) {
      if (p.wash?.[side]) assert.ok(p.wash[side][1] > 0 && p.wash[side][1] <= 0.3, `${key} ${side} 色調太重`);
    }
  }
  // 王城已有黑暗視野，不再疊暗角
  assert.ok(!AMBIENCE.castle.vignette);
});

test('氛圍：減少動態關掉粒子；品質越低粒子越少但至少 1 顆', () => {
  assert.equal(layerCount(20, { particleScale: 1, reducedMotion: true }), 0);
  assert.equal(layerCount(20, { particleScale: QUALITY_PRESETS.high.particleScale }), 20);
  assert.equal(layerCount(20, { particleScale: QUALITY_PRESETS.medium.particleScale }), 12);
  assert.equal(layerCount(20, { particleScale: QUALITY_PRESETS.low.particleScale }), 8);
  assert.equal(layerCount(1, { particleScale: 0 }), 1);
  assert.equal(layerCount(0, { particleScale: 1 }), 0);
  assert.equal(layerCount(999, { particleScale: 1 }), AMBIENCE_BUDGET);
});

test('氛圍：視差層生成寬度與發射頻率', () => {
  assert.equal(spawnWidth(1280, 2560, 0), 1280);
  assert.equal(spawnWidth(1280, 2560, 1), 2560);
  assert.equal(spawnWidth(1280, 2560, 0.5), 1920);
  assert.equal(spawnWidth(1280, 1280, 1, 200), 1480);
  assert.equal(spawnWidth(1280, 800, 1), 1280);   // 地圖比畫面窄也至少一個畫面寬
  assert.equal(emitFrequency(8000, 20), 400);
  assert.equal(emitFrequency(800, 100), 16);      // 下限 16 ms
  assert.equal(emitFrequency(800, 0), -1);
});

test('標題卡：換地圖才顯示，死亡重生 / 同圖重開 / 沒副標不顯示', () => {
  const preset = AMBIENCE.forest;
  assert.equal(shouldShowTitle({ preset, mapKey: 'forest', lastMapKey: 'sky' }), true);
  assert.equal(shouldShowTitle({ preset, mapKey: 'forest', lastMapKey: null }), true);
  assert.equal(shouldShowTitle({ preset, mapKey: 'forest', lastMapKey: 'forest' }), false);
  assert.equal(shouldShowTitle({ preset, mapKey: 'forest', lastMapKey: 'sky', respawn: true }), false);
  assert.equal(shouldShowTitle({ preset: AMBIENCE.boss, mapKey: 'boss', lastMapKey: 'castle' }), false);
});

test('掉落光暈：每種稀有度都有顏色，且與裝備稀有度一致', () => {
  for (const [id, r] of Object.entries(RARITIES)) {
    assert.ok(RARITY_GLOW[id], id);
    assert.equal(RARITY_GLOW[id].tint, r.hex);
  }
});

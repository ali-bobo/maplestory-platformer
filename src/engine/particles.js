// 粒子管理器

import { getQuality } from './quality.js';

// 依品質係數縮放粒子量，至少保留 1 顆（避免歸零看不到效果）
function scaledQty(scene, base) {
  const s = getQuality(scene).particleScale;
  return Math.max(1, Math.round(base * s));
}

export class ParticleManager {
  constructor() {}

  // 怪物死亡爆發
  spawnDeath(scene, x, y, color = 0xff4444) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-dot', {
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 600,
        // Phase 12（V 修復）：20→12，避免多怪同時死亡時粒子爆發造成尖峰
        quantity: scaledQty(scene, 12),
        tint: color,
        gravityY: 400,
      });
      emitter.setDepth(50);
      scene.time.delayedCall(700, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }

  // 升級光暈
  spawnLevelUp(scene, x, y) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-star', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 1200,
        quantity: scaledQty(scene, 40),
        tint: 0xffee00,
        gravityY: -100,
      });
      emitter.setDepth(60);
      scene.time.delayedCall(1300, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }

  // 技能光圈
  spawnVortex(scene, x, y) {
    try {
      const emitter = scene.add.particles(x, y, 'skill-orb', {
        speed: { min: 80, max: 160 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 800,
        quantity: scaledQty(scene, 8),
        tint: 0xaa44ff,
      });
      emitter.setDepth(45);
      scene.time.delayedCall(900, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }
}

export const particles = new ParticleManager();

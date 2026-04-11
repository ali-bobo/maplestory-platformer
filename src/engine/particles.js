// 粒子管理器

export class ParticleManager {
  constructor() {}

  // 傷害命中火花
  spawnHit(scene, x, y, color = 0xffffff) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-dot', {
        speed: { min: 80, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: 350,
        quantity: 8,
        tint: color,
        gravityY: 200,
      });
      emitter.setDepth(50);
      scene.time.delayedCall(400, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }

  // 怪物死亡爆發
  spawnDeath(scene, x, y, color = 0xff4444) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-dot', {
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 600,
        quantity: 20,
        tint: color,
        gravityY: 400,
      });
      emitter.setDepth(50);
      scene.time.delayedCall(700, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }

  // 物品拾取閃光
  spawnPickup(scene, x, y) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-star', {
        speed: { min: 60, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        quantity: 12,
        tint: 0xffdd44,
        gravityY: -50,
      });
      emitter.setDepth(50);
      scene.time.delayedCall(600, () => { if (emitter && emitter.active) emitter.destroy(); });
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
        quantity: 40,
        tint: 0xffee00,
        gravityY: -100,
      });
      emitter.setDepth(60);
      scene.time.delayedCall(1300, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }

  // 暗影步伐殘影
  spawnDashTrail(scene, x, y) {
    try {
      const emitter = scene.add.particles(x, y, 'particle-dot', {
        speed: { min: 10, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 2, end: 0 },
        lifespan: 300,
        quantity: 6,
        tint: 0x8800ff,
      });
      emitter.setDepth(40);
      scene.time.delayedCall(350, () => { if (emitter && emitter.active) emitter.destroy(); });
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
        quantity: 8,
        tint: 0xaa44ff,
      });
      emitter.setDepth(45);
      scene.time.delayedCall(900, () => { if (emitter && emitter.active) emitter.destroy(); });
    } catch (e) { /* 靜默 */ }
  }
}

export const particles = new ParticleManager();

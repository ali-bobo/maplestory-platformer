// VFX 工具 — 使用 rex PostFX pipelines 及 Phaser 原生特效
// 提供可重用的視覺效果函式，供技能系統調用

import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';

/**
 * 對遊戲物件施加短暫的發光效果
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} target
 * @param {number} intensity  — 發光強度（建議 0.01~0.06）
 * @param {number} duration   — 持續時間（ms）
 */
export function flashGlow(scene, target, intensity = 0.03, duration = 300) {
  try {
    if (!target || !target.active) return;
    target.setPostPipeline(GlowFilterPostFxPipeline);
    const pipe = target.getPostPipeline(GlowFilterPostFxPipeline);
    if (!pipe) return;
    pipe.setIntensity(intensity);
    scene.tweens.add({
      targets: pipe,
      intensity: 0,
      duration,
      onComplete: () => {
        if (target.active) target.removePostPipeline(GlowFilterPostFxPipeline);
      },
    });
  } catch (_) { /* 若 pipeline 不支援則靜默跳過 */ }
}

/**
 * 在相機上施加衝擊波效果
 * @param {Phaser.Scene} scene
 * @param {number} worldX — 衝擊波中心（世界座標）
 * @param {number} worldY
 * @param {number} duration — 持續時間（ms）
 */
export function cameraShockwave(scene, worldX, worldY, duration = 400) {
  try {
    const cam = scene.cameras.main;
    // 將世界座標轉換為相機歸一化座標 (0~1)
    const cx = (worldX - cam.scrollX) / cam.width;
    const cy = (worldY - cam.scrollY) / cam.height;

    cam.setPostPipeline(ShockwavePostFxPipeline);
    const pipe = cam.getPostPipeline(ShockwavePostFxPipeline);
    if (!pipe) return;
    pipe.setCenter(cx, cy);
    pipe.setWaveRadius(0);
    pipe.setWaveWidth(20);
    pipe.setPowBaseScale(0.8);
    pipe.setPowExponent(0.6);

    scene.tweens.add({
      targets: pipe,
      waveRadius: 0.6,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        cam.removePostPipeline(ShockwavePostFxPipeline);
      },
    });
  } catch (_) { /* pipeline 不可用則靜默跳過 */ }
}

/**
 * 產生能量拖尾粒子（跟隨指定物件）— 強化版：更密集、帶 ADD blend
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} follower — 要跟隨的物件
 * @param {number} color
 * @param {number} duration — 跟隨持續時間（ms）
 */
export function spawnEnergyTrail(scene, follower, color = 0x8888ff, duration = 500) {
  try {
    const emitter = scene.add.particles(follower.x, follower.y, 'particle-dot', {
      speed: { min: 15, max: 50 },
      scale: { start: 1.2, end: 0 },
      lifespan: 250,
      frequency: 20,
      tint: [color, 0xffffff],
      follow: follower,
      blendMode: 'ADD',
      alpha: { start: 0.8, end: 0 },
    });
    emitter.setDepth(35);
    scene.time.delayedCall(duration, () => {
      if (emitter && emitter.active) {
        emitter.stop();
        scene.time.delayedCall(300, () => { if (emitter.active) emitter.destroy(); });
      }
    });
    return emitter;
  } catch (_) { return null; }
}

/**
 * 畫面白閃（短暫的亮度脈衝）
 * @param {Phaser.Scene} scene
 * @param {number} duration — 閃光持續時間（ms）
 * @param {number} alpha    — 最大透明度
 */
export function screenFlash(scene, duration = 120, alpha = 0.35) {
  try {
    const flash = scene.add.rectangle(
      scene.cameras.main.scrollX + 640,
      scene.cameras.main.scrollY + 360,
      1280, 720, 0xffffff, alpha
    );
    flash.setDepth(100).setScrollFactor(0).setBlendMode('ADD');
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  } catch (_) { /* 靜默 */ }
}

/**
 * 能量爆發環（暗殺 / 大招用）— 強化版：雙層環 + 內部光暈
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color
 * @param {number} radius
 */
export function energyBurstRing(scene, x, y, color = 0xaa44ff, radius = 80) {
  try {
    // 外環
    const ring = scene.add.graphics();
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(x, y, 10);
    ring.setDepth(55);
    scene.tweens.add({
      targets: ring,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 內環（稍慢、稍亮）
    const innerRing = scene.add.graphics();
    innerRing.lineStyle(2, 0xffffff, 0.5);
    innerRing.strokeCircle(x, y, 8);
    innerRing.setDepth(56);
    scene.tweens.add({
      targets: innerRing,
      scaleX: (radius * 0.6) / 8,
      scaleY: (radius * 0.6) / 8,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => innerRing.destroy(),
    });

    // 中心光暈
    const glow = scene.add.graphics();
    glow.fillStyle(color, 0.3);
    glow.fillCircle(x, y, 6);
    glow.setDepth(54);
    scene.tweens.add({
      targets: glow,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => glow.destroy(),
    });
  } catch (_) { /* 靜默 */ }
}

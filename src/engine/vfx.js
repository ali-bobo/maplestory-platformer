// VFX 工具 — 使用 rex PostFX pipelines 及 Phaser 原生特效
// 提供可重用的視覺效果函式，供技能系統調用

import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';
import { VFX_TEX } from './vfxTextures.js';
import { getQuality } from './quality.js';

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
    // Phase 6.4：低品質關閉 PostFX 發光（省 framebuffer 切換）
    if (!getQuality(scene).postFX) return;
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
    // Phase 6.4：低品質關閉相機震波 shader
    if (!getQuality(scene).postFX) return;
    const cam = scene.cameras.main;
    // 將世界座標轉換為相機歸一化座標 (0~1)
    const cx = (worldX - cam.scrollX) / cam.width;
    const cy = (worldY - cam.scrollY) / cam.height;

    // 先清掉既有 Shockwave，避免 C/V 技能接力施放時相機疊加多層 shader
    cam.removePostPipeline(ShockwavePostFxPipeline);
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
    // Phase 6.4：中/低品質關閉持續性能量拖尾（高頻 ADD blend，GPU 開銷大）
    if (!getQuality(scene).energyTrail) return null;
    const emitter = scene.add.particles(follower.x, follower.y, 'particle-dot', {
      speed: { min: 15, max: 50 },
      scale: { start: 1.2, end: 0 },
      lifespan: 250,
      // frequency 20→40：每秒從 50 粒降到 25 粒。ADD blend 會強迫拆 batch，
      // 降低粒子數對 SpriteWebGLRenderer 開銷有顯著減益，視覺差異肉眼難察覺。
      frequency: 40,
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
    // 滿版白閃：物件設 scrollFactor(0) 固定貼螢幕，因此座標必須用「螢幕座標」
    // （相機尺寸中心），不可加 scrollX/scrollY，否則相機捲動後矩形會偏移、露出垂直邊界。
    const cam = scene.cameras.main;
    const flash = scene.add.rectangle(
      cam.width / 2, cam.height / 2,
      cam.width, cam.height, 0xffffff, alpha
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
// Phase 12（V 修復）：同時存在的 energyBurstRing 上限，避免 V 技能多怪同擊爆發
// 1 次 burst = 3 個 image。上限 8 個 burst = 最多 24 image 同時存在
let _activeBurstCount = 0;
const BURST_MAX_CONCURRENT = 8;

export function energyBurstRing(scene, x, y, color = 0xaa44ff, radius = 80) {
  try {
    // 超過同時上限就跳過——多怪密集擊中時不會疊加爆發成卡頓尖峰
    if (_activeBurstCount >= BURST_MAX_CONCURRENT) return;
    _activeBurstCount++;
    const releaseOne = () => { _activeBurstCount = Math.max(0, _activeBurstCount - 1); };
    // 外環：預渲染 texture（半徑 10，alpha 0.9 已烘焙）+ tint 染色 + scale 擴張
    const ring = scene.add.image(x, y, VFX_TEX.BURST_RING_OUTER);
    ring.setTint(color).setDepth(55);
    scene.tweens.add({
      targets: ring,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 內環（稍慢、稍亮）：預渲染 texture（半徑 8，白色 alpha 0.5 已烘焙，不染色）
    const innerRing = scene.add.image(x, y, VFX_TEX.BURST_RING_INNER);
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

    // 中心光暈：預渲染 texture（半徑 6 實心圓，alpha 0.3 已烘焙）
    const glow = scene.add.image(x, y, VFX_TEX.BURST_GLOW);
    glow.setTint(color).setDepth(54);
    scene.tweens.add({
      targets: glow,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => { glow.destroy(); releaseOne(); }, // 最後一個 tween 完成才釋放 counter
    });
  } catch (_) { releaseOne(); /* 失敗也要釋放 counter，避免上限永久卡住 */ }
}

/**
 * 畫面暫時暗化（增強大招對比度）
 */
export function screenDarken(scene, duration = 400, alpha = 0.4) {
  try {
    // 滿版暗化：同 screenFlash，scrollFactor(0) 物件須用螢幕座標定位
    const cam = scene.cameras.main;
    const dark = scene.add.rectangle(
      cam.width / 2, cam.height / 2,
      cam.width, cam.height, 0x000000, alpha,
    );
    dark.setDepth(39).setScrollFactor(0);
    scene.tweens.add({
      targets: dark,
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => dark.destroy(),
    });
    return dark;
  } catch (_) { return null; }
}

/**
 * 鏡頭衝擊縮放（zoom punch — 大招命中瞬間的衝擊感）
 */
export function cameraZoomPunch(scene, intensity = 0.08, duration = 200) {
  try {
    const cam = scene.cameras.main;
    const originalZoom = cam.zoom;
    scene.tweens.add({
      targets: cam,
      zoom: originalZoom + intensity,
      duration: duration * 0.3,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => { cam.zoom = originalZoom; },
    });
  } catch (_) { /* 靜默 */ }
}

/**
 * 放射狀光束（God Rays — 大招爆發時的光芒四射）
 */
export function spawnLightRays(scene, x, y, options = {}) {
  try {
    // Phase 6.4：低品質關閉放射光線（命中高頻特效）
    if (!getQuality(scene).lightRays) return null;
    const {
      // count 與 width 在預渲染版本中被忽略（統一 12 條、烘焙 width 2-3.5 隨機）。
      // 呼叫端的 count 範圍是 10-14，視覺差異肉眼難察覺。
      length = 120,
      color = 0xffffff,
      alpha = 0.5,
      duration = 500,
      rotation = 0,
      depth = 50,
    } = options;

    // 預渲染基底 length 120，alpha 已分層烘焙（每條 0.3-1.0 隨機）
    // 使用 setScale 對齊長度、setRotation 對齊角度
    const baseScale = length / 120;
    const rays = scene.add.image(x, y, VFX_TEX.LIGHT_RAYS).setDepth(depth);
    rays.setTint(color);
    rays.setAlpha(alpha * 2); // 因為基底已有 0.3-1.0 alpha，這裡乘 2 補足原本「alpha * (0.3 ~ 1.0)」的整體強度
    rays.setRotation(rotation);
    rays.setScale(baseScale);

    scene.tweens.add({
      targets: rays,
      scaleX: baseScale * 1.5,
      scaleY: baseScale * 1.5,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => rays.destroy(),
    });
    return rays;
  } catch (_) { return null; }
}

/**
 * 精緻魔法陣（召喚/漩渦用 — 自動旋轉+淡出）
 */
export function drawMagicCircle(scene, x, y, options = {}) {
  try {
    const {
      radius = 160,
      color = 0xaa44ff,
      // secondaryColor 與 runeCount 在預渲染版本中被忽略：
      // 預渲染統一用 8 條符文線 + 白色基底，靠 setTint(color) 統一染色，
      // secondaryColor 與 color 通常是同色系變體，視覺差異極小。
      alpha = 0.8,
      duration = 1200,
      rotationSpeed = 360,
      depth = 45,
      scale = { start: 0.3, end: 1.3 },
    } = options;

    // 預渲染紋理基底為 radius=100，alpha 分層烘焙
    // baseScale 對齊呼叫端 radius，再乘以動畫 scale 動畫
    const baseScale = radius / 100;
    const g = scene.add.image(x, y, VFX_TEX.MAGIC_CIRCLE).setDepth(depth);
    g.setTint(color);
    g.setAlpha(alpha);
    g.setScale(baseScale * scale.start);

    scene.tweens.add({
      targets: g,
      angle: rotationSpeed,
      scaleX: baseScale * scale.end,
      scaleY: baseScale * scale.end,
      duration,
      ease: 'Linear',
    });
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: duration * 0.3,
      delay: duration * 0.7,
      ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
    return g;
  } catch (_) { return null; }
}

/**
 * 弧形斬擊波（三層漸層弧光 — 暗殺/普攻用）
 */
export function spawnSlashWave(scene, x, y, facingRight, options = {}) {
  try {
    const {
      radius = 80,
      // arcStart/arcEnd 在預渲染版本中被固定為 -1.2 ~ 0.8（預設值）。
      // 連續三斬視覺差異微小，肉眼幾乎不可區分；換取消滅 3 個 arc + 3 個 strokePath 的 earcut。
      // glowColor 與 lineWidth 也被忽略：glowColor 與 color 是相近的紫色變體，
      // lineWidth 4-7 在快速消失動畫中差異 1-2 px 肉眼無感。
      color = 0xffffff,
      duration = 250,
      depth = 60,
      scale = 1.8,
    } = options;

    const dir = facingRight ? 1 : -1;
    const texKey = facingRight ? VFX_TEX.SLASH_ARC_R : VFX_TEX.SLASH_ARC_L;
    // 預渲染紋理基底為 radius=80（三層弧光合一，alpha 已烘焙）
    const baseScale = radius / 80;

    const slash = scene.add.image(x + dir * 20, y, texKey).setDepth(depth);
    slash.setTint(color);
    slash.setScale(baseScale);

    scene.tweens.add({
      targets: slash,
      scaleX: baseScale * scale,
      scaleY: baseScale * scale,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });
    return slash;
  } catch (_) { return null; }
}

/**
 * 速度線效果（衝刺殘影用）
 */
export function spawnSpeedLines(scene, x, y, facingRight, options = {}) {
  try {
    // Phase 11.2C：低品質關閉速度線（與 LIGHT_RAYS 同性質的線條特效）
    if (!getQuality(scene).lightRays) return null;
    const {
      // count / spread 在預渲染版本中被忽略（紋理固定 10 條、spread 80）
      length = 60,
      color = 0xffffff,
      alpha = 0.5,
      duration = 200,
      depth = 40,
    } = options;

    const dir = facingRight ? -1 : 1;
    // 預渲染基底 length 60，setScale 對齊；紋理是 +X 方向，靠 setFlipX 反向
    const baseScale = length / 60;
    const lines = scene.add.image(x, y, VFX_TEX.SPEED_LINES).setDepth(depth);
    lines.setTint(color);
    lines.setAlpha(alpha * 1.5); // 基底已有 0.3-1.0 隨機 alpha，補足整體強度
    lines.setScale(baseScale);
    lines.setFlipX(!facingRight);

    scene.tweens.add({
      targets: lines,
      x: x + dir * 40,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => lines.destroy(),
    });
    return lines;
  } catch (_) { return null; }
}

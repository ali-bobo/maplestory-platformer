import Phaser from 'phaser';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import {
  cameraShockwave, energyBurstRing, flashGlow, screenFlash,
  screenDarken, cameraZoomPunch, spawnLightRays, drawMagicCircle,
  spawnSlashWave, spawnSpeedLines,
} from '../engine/vfx.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { getQuality } from '../engine/quality.js';
import { getVisualCenterPoint } from '../config/alignment.js';
import { skillDamageScale } from '../config/constants.js';

function getEntityEffectPoint(entity) {
  if (entity?.body?.center) {
    return { x: entity.body.center.x, y: entity.body.center.y };
  }
  return getVisualCenterPoint(entity);
}

function calcDamage(atk, critRate, critMulti, multiplier = 1) {
  const base = atk * multiplier * (0.85 + Math.random() * 0.3);
  const isCrit = Math.random() < critRate;
  return { damage: Math.floor(isCrit ? base * critMulti : base), isCrit };
}

function stopEmitterAfter(scene, emitter, duration, linger = 320) {
  if (!emitter) return;
  scene.time.delayedCall(duration, () => {
    if (!emitter.active) return;
    emitter.stop();
    scene.time.delayedCall(linger, () => {
      if (emitter.active) emitter.destroy();
    });
  });
}

function spawnAfterimage(scene, sprite, options = {}) {
  if (!sprite?.active) return null;
  // Phase 9：殘影接品質系統——low 品質完全不生殘影（省高頻 image create/destroy）
  if (!getQuality(scene).afterimage) return null;
  const {
    alpha = 0.4,
    duration = 150,
    tint = null,
    depthOffset = -1,
  } = options;

  const ghost = scene.add.image(sprite.x, sprite.y, sprite.texture.key);
  ghost.setOrigin(sprite.originX, sprite.originY);
  ghost.setDisplaySize(sprite.displayWidth, sprite.displayHeight);
  ghost.setFlipX(sprite.flipX);
  ghost.setAngle(sprite.angle);
  ghost.setAlpha(alpha);
  ghost.setDepth((sprite.depth || 20) + depthOffset);
  if (tint !== null) ghost.setTint(tint);

  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    duration,
    ease: 'Quad.easeOut',
    onComplete: () => ghost.destroy(),
  });
  return ghost;
}

function spawnBurstEmitter(scene, x, y, config, count, lifetime = 320) {
  const emitter = scene.add.particles(x, y, 'particle-dot', {
    ...config,
    emitting: false,
  });
  emitter.setDepth(48);
  emitter.explode(count, x, y);
  scene.time.delayedCall(lifetime, () => {
    if (emitter.active) emitter.destroy();
  });
  return emitter;
}

function spawnFanBurst(scene, x, y, facingRight) {
  const baseAngle = facingRight ? 0 : 180;
  return spawnBurstEmitter(scene, x, y, {
    angle: { min: baseAngle - 42, max: baseAngle + 42 },
    speed: { min: 120, max: 240 },
    scale: { start: 1.2, end: 0 },
    alpha: { start: 0.85, end: 0 },
    lifespan: 300,
    tint: [0x8888ff, 0x6644ff, 0x4400ff],
    blendMode: 'ADD',
  }, 5, 320);
}

function spawnShockCircle(scene, x, y, options = {}) {
  const {
    startRadius = 24,
    endRadius = 80,
    duration = 250,
    color = 0xffffff,
    alpha = 0.8,
    lineWidth = 3,
    fillAlpha = 0,
    depth = 55,
  } = options;

  const radius = Math.max(4, startRadius);

  // fillAlpha > 0 的情況極罕見（目前所有呼叫點都沒用），fallback 走原本 graphics 邏輯保視覺正確
  if (fillAlpha > 0) {
    const circle = scene.add.graphics().setDepth(depth);
    circle.fillStyle(color, fillAlpha);
    circle.fillCircle(0, 0, radius);
    circle.lineStyle(lineWidth, color, alpha);
    circle.strokeCircle(0, 0, radius);
    circle.setPosition(x, y);
    scene.tweens.add({
      targets: circle,
      scaleX: endRadius / radius,
      scaleY: endRadius / radius,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => circle.destroy(),
    });
    return circle;
  }

  // 預渲染紋理：80x80 範圍內、半徑 24 的描邊圓（lineWidth 3）
  // 呼叫端的 startRadius 由 scale 對齊（initScale = startRadius / 24）
  // lineWidth 統一視為 3（呼叫端的 2/3 差異在快速消失動畫中肉眼無感）
  const image = scene.add.image(x, y, VFX_TEX.SHOCK_CIRCLE).setDepth(depth);
  image.setTint(color);
  image.setAlpha(alpha);
  image.setScale(radius / 24);
  scene.tweens.add({
    targets: image,
    scaleX: endRadius / 24,
    scaleY: endRadius / 24,
    alpha: 0,
    duration,
    ease: 'Quad.easeOut',
    onComplete: () => image.destroy(),
  });

  return image;
}

function spawnGroundBurst(scene, x, y, count = 6) {
  return spawnBurstEmitter(scene, x, y, {
    angle: { min: 210, max: 330 },
    speed: { min: 70, max: 180 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.65, end: 0 },
    lifespan: 420,
    gravityY: 420,
    tint: [0xb8a8d8, 0x8a6db7, 0x61506f],
  }, count, 450);
}

function spawnStunIcon(scene, target) {
  if (!target?.active) return null;
  const topY = target.body ? target.body.top : getEntityEffectPoint(target).y - 30;
  const icon = scene.add.text(target.x, topY - 14, '★', {
    fontSize: '22px',
    color: '#ffee88',
    fontFamily: 'Arial',
    stroke: '#550066',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(90);

  scene.tweens.add({
    targets: icon,
    angle: 360,
    duration: 600,
    repeat: 2,
    ease: 'Sine.easeInOut',
  });

  scene.time.delayedCall(1500, () => {
    if (!icon.active) return;
    scene.tweens.add({
      targets: icon,
      alpha: 0,
      y: icon.y - 18,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => icon.destroy(),
    });
  });

  return icon;
}

function blendColor(colorA, colorB, t) {
  const a = Phaser.Display.Color.IntegerToColor(colorA);
  const b = Phaser.Display.Color.IntegerToColor(colorB);
  return Phaser.Display.Color.GetColor(
    Phaser.Math.Linear(a.red, b.red, t),
    Phaser.Math.Linear(a.green, b.green, t),
    Phaser.Math.Linear(a.blue, b.blue, t),
  );
}

function createCloneLifeBar(scene, clone, duration = 5000) {
  // Phase 4.2：bg + fg 改用 Rectangle（規則 A），消除分身存活期間的 2 個持久 Graphics
  const barWidth = 40;
  const barHeight = 5;
  const bg = scene.add.rectangle(clone.x - barWidth / 2, clone.y, barWidth, barHeight, 0x000000, 0.65)
    .setOrigin(0, 0).setDepth(19);
  const fg = scene.add.rectangle(clone.x - barWidth / 2, clone.y, barWidth, barHeight, 0x44ff66)
    .setOrigin(0, 0).setDepth(20);

  const startedAt = scene.time.now;
  let destroyed = false;
  let lastRemaining = -1;
  let lastX = NaN;
  let lastY = NaN;

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    if (timer) timer.remove();
    if (bg) bg.destroy();
    if (fg) fg.destroy();
  };

  const redraw = () => {
    // clone 已不存在 → 立即清理，避免殭屍 timer
    if (!clone || !clone.active) {
      cleanup();
      return;
    }
    const progress = Phaser.Math.Clamp((scene.time.now - startedAt) / duration, 0, 1);
    const remaining = 1 - progress;
    const x = clone.x - barWidth / 2;
    const y = clone.y - clone.displayHeight * 0.9;

    // dirty flag：位置變化 < 0.5px 且剩餘量變化 < 0.02 時跳過更新
    if (
      Math.abs(remaining - lastRemaining) < 0.02 &&
      Math.abs(x - lastX) < 0.5 &&
      Math.abs(y - lastY) < 0.5
    ) {
      return;
    }
    lastRemaining = remaining;
    lastX = x;
    lastY = y;

    const color = remaining > 0.5
      ? blendColor(0x44ff66, 0xffdd44, (1 - remaining) / 0.5)
      : blendColor(0xffdd44, 0xff4444, (0.5 - remaining) / 0.5);

    // scaleX 控制長度（GPU 純 transform），fillColor 切換顏色
    bg.setPosition(x, y);
    fg.setPosition(x, y);
    fg.scaleX = remaining;
    fg.fillColor = color;
  };

  redraw();
  const timer = scene.time.addEvent({
    delay: 100,
    loop: true,
    callback: redraw,
  });

  // 分身一旦銷毀，立即清理 timer 與 rectangles
  clone.once('destroy', cleanup);

  return {
    destroy: cleanup,
  };
}

function spawnSlashArc(scene, x, y, facingRight) {
  const arc = scene.add.graphics().setDepth(60);
  arc.lineStyle(3, 0xffffff, 1);
  arc.beginPath();
  if (facingRight) {
    arc.arc(0, 0, 24, -1.1, 0.45, false);
  } else {
    arc.arc(0, 0, 24, Math.PI + 0.7, Math.PI - 0.45, true);
  }
  arc.strokePath();
  arc.setPosition(x + (facingRight ? 22 : -22), y - 6);

  scene.tweens.add({
    targets: arc,
    alpha: 0,
    scaleX: 1.45,
    scaleY: 1.15,
    duration: 150,
    ease: 'Quad.easeOut',
    onComplete: () => arc.destroy(),
  });
}

function resolveAssassinateWarpPoint(scene, target, desiredX) {
  const platforms = scene?.mapData?.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return {
      x: desiredX,
      topY: typeof scene._getClosestPlatformTopY === 'function'
        ? scene._getClosestPlatformTopY(desiredX, target.y)
        : target.y,
    };
  }

  const containingPlatforms = platforms.filter(
    (platform) => target.x >= platform.x && target.x <= platform.x + platform.width,
  );

  let anchorPlatform = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const platform of containingPlatforms) {
    const distance = Math.abs(platform.y - target.y);
    if (distance < closestDistance) {
      anchorPlatform = platform;
      closestDistance = distance;
    }
  }

  if (!anchorPlatform) {
    return {
      x: desiredX,
      topY: typeof scene._getClosestPlatformTopY === 'function'
        ? scene._getClosestPlatformTopY(desiredX, target.y)
        : target.y,
    };
  }

  const margin = 28;
  const minX = anchorPlatform.x + margin;
  const maxX = anchorPlatform.x + anchorPlatform.width - margin;

  return {
    x: Phaser.Math.Clamp(desiredX, minX, Math.max(minX, maxX)),
    topY: anchorPlatform.y,
  };
}

function cleanupProjectile(scene, projectile, overlap, emitter, timer) {
  if (overlap) scene.physics.world.removeCollider(overlap);
  if (timer) timer.remove();
  if (emitter?.active) {
    emitter.stop();
    scene.time.delayedCall(320, () => {
      if (emitter.active) emitter.destroy();
    });
  }
  if (projectile?.active) projectile.destroy();
}

export function castShuriken(scene, player, enemies) {
  audio.playSkill('Z');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;

  if (typeof player.playThrowAnimation === 'function') {
    player.playThrowAnimation(200);
  }

  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 80, () => {
      if (!scene.sys.isActive() || !player.active) return;

      const origin = getEntityEffectPoint(player);
      const shuriken = scene.physics.add.sprite(
        player.x + dir * 20,
        origin.y - 5 + (i - 1) * 12,
        'skill-shuriken',
      );
      shuriken.setDisplaySize(28, 28);
      shuriken.setDepth(20);
      shuriken.body.setAllowGravity(false);
      shuriken.body.setSize(18, 18);
      shuriken.setVelocity(dir * 650, -25 + (i - 1) * 25);
      shuriken.setFlipX(dir < 0);
      // Phase 9：移除手裡劍的 flashGlow PostFX（3 個同時 = 3 次 framebuffer 切換/幀，
      // 是 Z 技能停頓主因）。改靠 setTint 提供亮色 + 粒子拖尾撐視覺，差異極小。
      shuriken.setTint(0xe9eeff);

      spawnShockCircle(scene, shuriken.x, shuriken.y, {
        startRadius: 10,
        endRadius: 22,
        duration: 120,
        color: 0x88aaff,
        alpha: 0.55,
        lineWidth: 2,
      });

      scene.tweens.add({ targets: shuriken, angle: dir * 1080, duration: 600, ease: 'Linear' });

      const trail = scene.add.particles(0, 0, 'particle-dot', {
        follow: shuriken,
        // Phase 9：frequency 40→60（每秒 25→16.7 粒），減少 ADD blend 拆 batch 開銷
        frequency: 60,
        quantity: 1,
        lifespan: 300,
        speed: { min: 8, max: 35 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0x8888ff, 0x6666ff, 0x4400ff],
        blendMode: 'ADD',
      });
      trail.setDepth(18);
      stopEmitterAfter(scene, trail, 620, 320);

      const afterimageTimer = scene.time.addEvent({
        delay: 80, // Phase 9：50→80ms，殘影產生頻率每秒 60→37.5（每 3 顆手裡劍）
        loop: true,
        callback: () => {
          if (!shuriken.active) {
            afterimageTimer.remove();
            return;
          }
          spawnAfterimage(scene, shuriken, {
            alpha: 0.4,
            duration: 150,
            tint: 0x8b7cff,
          });
        },
      });

      let overlap = null;
      if (enemies?.getChildren) {
        overlap = scene.physics.add.overlap(shuriken, enemies, (proj, enemy) => {
          if (!enemy?.active || enemy.isDead || proj._hit) return;
          proj._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2 * skillDamageScale(gs.skillLevels.Z));
          enemy.takeDamage(damage, isCrit);
          const enemyCenter = getEntityEffectPoint(enemy);
          spawnFanBurst(scene, enemyCenter.x, enemyCenter.y, dir > 0);
          energyBurstRing(scene, enemyCenter.x, enemyCenter.y, 0x7755ff, 26);
          if (isCrit) {
            screenFlash(scene, 100, 0.25);
            spawnLightRays(scene, enemyCenter.x, enemyCenter.y, {
              count: 10, length: 80, color: 0x8888ff, alpha: 0.4, duration: 300,
            });
            scene.cameras.main.shake(100, 0.012);
          } else {
            scene.cameras.main.shake(50, 0.006);
          }
          cleanupProjectile(scene, proj, overlap, trail, afterimageTimer);
        });
      }

      scene.time.delayedCall(620, () => {
        cleanupProjectile(scene, shuriken, overlap, trail, afterimageTimer);
      });
    });
  }
}

export function castDash(scene, player, enemies) {
  audio.playSkill('X');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const startPoint = getEntityEffectPoint(player);
  const ghosts = [];

  if (!player?.active || !player.body) return;

  player.isDashing = true;
  player.body.setAllowGravity(false);
  player.setVelocity(dir * 900, 0);
  // Phase 11.2A：移除玩家 flashGlow PostFX——玩家已有 alpha yoyo 閃爍視覺
  // （下方 tween），不需 GlowFilter framebuffer 切換造成卡頓
  screenFlash(scene, 80, 0.15);

  spawnShockCircle(scene, startPoint.x, startPoint.y, {
    startRadius: 30,
    endRadius: 80,
    duration: 250,
    color: 0xffffff,
    alpha: 0.8,
    lineWidth: 3,
    fillAlpha: 0.12,
  });

  scene.tweens.add({
    targets: player,
    alpha: 0.3,
    duration: 80,
    yoyo: true,
    repeat: 3,
    onComplete: () => {
      if (player.active) player.setAlpha(1);
    },
  });

  const ghostTimer = scene.time.addEvent({
    // Phase 11.2B：25→50ms。250ms 衝刺期殘影 10→5 個 + 速度線 10→5 次，
    // 視覺仍是「衝刺帶殘影」感，但消除特效爆發造成的尖峰卡頓。
    delay: 50,
    loop: true,
    callback: () => {
      if (!player.active || !player.isDashing) {
        ghostTimer.remove();
        return;
      }
      const ghost = spawnAfterimage(scene, player, {
        alpha: 0.6,
        duration: 300,
        tint: 0x8800ff,
      });
      if (ghost) ghosts.push(ghost);
      spawnSpeedLines(scene, player.x, player.y, player.facingRight, {
        count: 5, length: 40, alpha: 0.3, duration: 150, color: 0xaa88ff,
      });
      while (ghosts.length > 4) {
        const oldest = ghosts.shift();
        if (oldest?.active) oldest.destroy();
      }
    },
  });

  let overlap = null;
  if (enemies?.getChildren) {
    const hitSet = new Set();
    overlap = scene.physics.add.overlap(player, enemies, (dashPlayer, enemy) => {
      if (!dashPlayer?.active || !enemy?.active || enemy.isDead || hitSet.has(enemy)) return;
      hitSet.add(enemy);
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.5 * skillDamageScale(gs.skillLevels.X));
      enemy.takeDamage(damage, isCrit);
      const enemyCenter = getEntityEffectPoint(enemy);
      energyBurstRing(scene, enemyCenter.x, enemyCenter.y, 0xaa55ff, 30);
    });
  }

  scene.time.delayedCall(250, () => {
    if (!player?.active || !player.body) return;
    player.isDashing = false;
    player.body.setAllowGravity(true);
    player.setVelocityX(0);
    player.setAlpha(1);
    if (overlap) scene.physics.world.removeCollider(overlap);
    ghostTimer.remove();
    spawnGroundBurst(scene, player.x, player.body.bottom, 8);
    spawnShockCircle(scene, player.x, player.body.bottom, {
      startRadius: 20, endRadius: 60, duration: 200,
      color: 0x8800ff, alpha: 0.6, lineWidth: 2,
    });
    energyBurstRing(scene, player.x, player.body.bottom, 0xaa55ff, 40);
  });
}

export function castAssassinate(scene, player, enemies) {
  audio.playSkill('C');
  const gs = player.gameState;
  const playerCenter = getEntityEffectPoint(player);
  screenDarken(scene, 350, 0.35);
  scene.cameras.main.flash(100, 255, 255, 255);

  let nearest = null;
  let minDist = 400;
  if (enemies?.getChildren) {
    enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const enemyCenter = getEntityEffectPoint(enemy);
      const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, enemyCenter.x, enemyCenter.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    });
  }

  if (!nearest || !nearest.active) return;

  player.isDashing = false;
  player.setAlpha(1);
  player.body.setAllowGravity(true);
  player.setVelocity(0, 0);

  const desiredX = Phaser.Math.Clamp(
    nearest.x + (player.facingRight ? -40 : 40),
    40,
    scene.physics.world.bounds.width - 40,
  );
  const warpPoint = resolveAssassinateWarpPoint(scene, nearest, desiredX);
  player.setX(warpPoint.x);
  if (typeof scene._alignDynamicEntityToPlatformTop === 'function') {
    scene._alignDynamicEntityToPlatformTop(player, warpPoint.topY);
  } else {
    player.setY(warpPoint.topY);
  }
  if (player.body) {
    player.body.reset(player.x, player.y);
  }
  player.dropThrough = false;

  const playerCenterAfterWarp = getEntityEffectPoint(player);
  const nearestCenter = getEntityEffectPoint(nearest);
  spawnShockCircle(scene, playerCenterAfterWarp.x, playerCenterAfterWarp.y, {
    startRadius: 8,
    endRadius: 120,
    duration: 350,
    color: 0xff00ff,
    alpha: 0.7,
    lineWidth: 3,
  });

  const damage = Math.floor(gs.atk * 3.5 * skillDamageScale(gs.skillLevels.C) * gs.critMulti * (0.9 + Math.random() * 0.2));
  nearest.takeDamage(damage, true);
  spawnStunIcon(scene, nearest);
  energyBurstRing(scene, nearestCenter.x, nearestCenter.y, 0xffffff, 60);
  scene.time.delayedCall(50, () => {
    energyBurstRing(scene, nearestCenter.x, nearestCenter.y, 0xcc44ff, 100);
  });
  scene.time.delayedCall(100, () => {
    energyBurstRing(scene, nearestCenter.x, nearestCenter.y, 0x6600cc, 140);
  });
  cameraShockwave(scene, nearestCenter.x, nearestCenter.y, 400);

  const cx = nearestCenter.x;
  const cy = nearestCenter.y;

  // 多層弧形斬擊（華麗刀光 — 三道交錯弧光）
  spawnSlashWave(scene, cx, cy, player.facingRight, {
    radius: 90, color: 0xffffff, glowColor: 0xcc44ff,
    lineWidth: 7, duration: 300,
  });
  scene.time.delayedCall(60, () => {
    spawnSlashWave(scene, cx, cy, !player.facingRight, {
      radius: 70, color: 0xee88ff, glowColor: 0x8822cc,
      lineWidth: 5, duration: 280, arcStart: -0.8, arcEnd: 1.0,
    });
  });
  scene.time.delayedCall(120, () => {
    spawnSlashWave(scene, cx, cy, player.facingRight, {
      radius: 60, color: 0xffffff, glowColor: 0xff00ff,
      lineWidth: 4, duration: 250, arcStart: -0.5, arcEnd: 1.3,
    });
  });

  // 中心爆裂光球（多層漸層）
  const impactGlow = scene.add.graphics().setDepth(62);
  impactGlow.fillStyle(0x8800cc, 0.3);
  impactGlow.fillCircle(0, 0, 30);
  impactGlow.fillStyle(0xcc44ff, 0.6);
  impactGlow.fillCircle(0, 0, 20);
  impactGlow.fillStyle(0xffffff, 0.9);
  impactGlow.fillCircle(0, 0, 12);
  impactGlow.setPosition(cx, cy);
  scene.tweens.add({
    targets: impactGlow,
    scaleX: 3, scaleY: 3, alpha: 0,
    duration: 400,
    ease: 'Quad.easeOut',
    onComplete: () => impactGlow.destroy(),
  });

  // 放射光束（雙層 God Rays）
  spawnLightRays(scene, cx, cy, {
    count: 16, length: 140, color: 0xdd88ff,
    alpha: 0.6, duration: 400, width: 2.5,
  });
  scene.time.delayedCall(80, () => {
    spawnLightRays(scene, cx, cy, {
      count: 12, length: 100, color: 0xffffff,
      alpha: 0.4, duration: 350, width: 1.5,
    });
  });

  // 發光碎片飛散（數量+色彩豐富度提升）
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const fragDist = 100 + Math.random() * 60;
    const frag = scene.add.graphics().setDepth(58);
    const fragColor = [0xcc66ff, 0xff88ff, 0xffffff, 0x8822cc][i % 4];
    frag.fillStyle(fragColor, 0.9);
    frag.fillRect(-2, -6, 4, 12);
    frag.fillStyle(0xffffff, 0.5);
    frag.fillRect(-1, -4, 2, 8);
    frag.setPosition(cx, cy);
    frag.setRotation(angle);
    scene.tweens.add({
      targets: frag,
      x: cx + Math.cos(angle) * fragDist,
      y: cy + Math.sin(angle) * fragDist,
      alpha: 0,
      scaleX: 0.2, scaleY: 0.2,
      duration: 300 + Math.random() * 150,
      ease: 'Quad.easeOut',
      onComplete: () => frag.destroy(),
    });
  }

  // 衝擊白閃 + 鏡頭縮放 + 強化震動
  screenFlash(scene, 120, 0.35);
  cameraZoomPunch(scene, 0.06, 250);
  scene.cameras.main.shake(250, 0.03);

  if (nearest.isDead && nearest.active) {
    scene.tweens.killTweensOf(nearest);
    nearest.setVelocity?.(0, 0);
    scene.tweens.add({
      targets: nearest,
      scaleX: nearest.scaleX * 0.1,
      scaleY: nearest.scaleY * 0.1,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (nearest.active) nearest.destroy();
      },
    });
  }
}

export function castVortex(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const center = getEntityEffectPoint(player);
  const cx = center.x;
  const cy = center.y;
  const radius = 172;
  const pulseCount = 3;
  const pulseInterval = 160;
  const hitCounts = new Map();

  const telegraph = scene.add.graphics().setDepth(42);
  telegraph.fillStyle(0xff3366, 0.14);
  telegraph.fillCircle(cx, cy, radius);
  telegraph.lineStyle(2, 0xff88aa, 0.5);
  telegraph.strokeCircle(cx, cy, radius);

  scene.time.delayedCall(240, () => {
    if (!scene.sys.isActive()) return;
    if (telegraph.active) telegraph.destroy();

    screenDarken(scene, 500, 0.25);
    screenFlash(scene, 80, 0.2);
    cameraShockwave(scene, cx, cy, 360);

    // 精緻魔法陣（多層環 + 齒紋 + 符文 + 六角星）→ 改用預渲染紋理 + tint 染色
    // 預渲染圖案為白色基底（alpha 已分層烘焙：外圈 0.85 / 內層 0.4 等），
    // 透過 setTint 統一染成 Vortex 主色（紫色），視覺效果接近原本配色。
    // 預渲染半徑 150 + 實際需要 172，用 setScale 對齊；最終消失 tween（L878）
    // 縮放比例會略小，視覺差異約 15%，肉眼幾乎無感。
    const circle = scene.add.image(cx, cy, VFX_TEX.VORTEX_CIRCLE).setDepth(45);
    circle.setTint(0xbb66ff);
    circle.setScale(radius / 150);

    // 放射光束
    spawnLightRays(scene, cx, cy, {
      count: 14, length: radius * 0.9, color: 0xbb66ff,
      alpha: 0.4, duration: 600, width: 2,
    });

    const core = scene.add.image(cx, cy, 'skill-orb');
    core.setDepth(46);
    core.setScale(1.4);
    core.setTint(0xbb66ff);
    core.setAlpha(0.78);
    flashGlow(scene, core, 0.045, 420);

    scene.tweens.add({ targets: circle, angle: 180, duration: pulseCount * pulseInterval + 320, ease: 'Linear' });
    scene.tweens.add({
      targets: core,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0.38,
      duration: pulseCount * pulseInterval + 240,
      yoyo: true,
      repeat: 0,
      ease: 'Sine.easeInOut',
    });

    particles.spawnVortex(scene, cx, cy);

    let pulseIndex = 0;
    const pulseTimer = scene.time.addEvent({
      delay: pulseInterval,
      repeat: pulseCount - 1,
      callback: () => {
        if (!scene.sys.isActive()) return;

        const ringRadius = radius * (0.56 + pulseIndex * 0.14);
        spawnShockCircle(scene, cx, cy, {
          startRadius: Math.max(28, ringRadius - 18),
          endRadius: ringRadius + 16,
          duration: 180,
          color: pulseIndex === pulseCount - 1 ? 0xffccff : 0xbb66ff,
          alpha: 0.72,
          lineWidth: 3,
          depth: 54,
        });

        if (pulseIndex === pulseCount - 1) {
          cameraZoomPunch(scene, 0.04, 180);
          screenFlash(scene, 80, 0.15);
          spawnLightRays(scene, cx, cy, {
            count: 10, length: radius * 0.7, color: 0xffaaff,
            alpha: 0.5, duration: 350,
          });
        }

        if (enemies?.getChildren) {
          enemies.getChildren().forEach((enemy) => {
            if (!enemy?.active || enemy.isDead) return;

            const enemyCenter = getEntityEffectPoint(enemy);
            const distance = Phaser.Math.Distance.Between(cx, cy, enemyCenter.x, enemyCenter.y);
            if (distance > radius) return;

            const previousHits = hitCounts.get(enemy) || 0;
            if (previousHits >= pulseCount) return;
            hitCounts.set(enemy, previousHits + 1);

            const pullVector = new Phaser.Math.Vector2(cx - enemy.x, cy - enemy.y);
            if (pullVector.lengthSq() > 0 && enemy.body) {
              pullVector.normalize().scale(110 + pulseIndex * 18);
              enemy.body.setVelocity(pullVector.x, Math.min(enemy.body.velocity.y, -30));
            }

            const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, (0.78 + pulseIndex * 0.16) * skillDamageScale(gs.skillLevels.V));
            enemy.takeDamage(damage, isCrit);
            energyBurstRing(scene, enemyCenter.x, enemyCenter.y, 0xbb66ff, 22 + pulseIndex * 8);
          });
        }

        pulseIndex += 1;
      },
    });

    scene.time.delayedCall(pulseCount * pulseInterval + 340, () => {
      pulseTimer.remove();
      scene.tweens.add({
        targets: [circle, core],
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (circle.active) circle.destroy();
          if (core.active) core.destroy();
        },
      });
    });
  });
}

export function castClone(scene, player, enemies) {
  audio.playSkill('B');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const playerCenter = getEntityEffectPoint(player);
  const clone = scene.physics.add.sprite(player.x - dir * 60, playerCenter.y, 'skill-clone');
  clone.setDepth(15);
  clone.setAlpha(0);
  clone.setScale(0.3);
  clone.setTint(0x8800ff);
  clone.setFlipX(player.flipX);
  clone.body.setAllowGravity(false);
  clone.setVelocity(0, 0);

  // 入場動畫（縮放彈跳 + 淡入）
  scene.tweens.add({
    targets: clone,
    scaleX: 1, scaleY: 1, alpha: 0.7,
    duration: 400,
    ease: 'Back.easeOut',
  });

  // 召喚魔法陣
  drawMagicCircle(scene, clone.x, clone.y + 20, {
    radius: 38, color: 0x8800ff, secondaryColor: 0xcc66ff,
    duration: 800, rotationSpeed: 180, depth: 14,
    scale: { start: 0.2, end: 1.1 },
  });

  // 光柱效果
  const pillar = scene.add.graphics().setDepth(16);
  pillar.fillStyle(0xaa55ff, 0.25);
  pillar.fillRect(-8, -120, 16, 120);
  pillar.fillStyle(0xffffff, 0.15);
  pillar.fillRect(-3, -120, 6, 120);
  pillar.setPosition(clone.x, clone.y);
  scene.tweens.add({
    targets: pillar,
    alpha: 0, scaleX: 2.5,
    duration: 600,
    ease: 'Quad.easeOut',
    onComplete: () => pillar.destroy(),
  });
  screenFlash(scene, 60, 0.12);

  spawnBurstEmitter(scene, clone.x, clone.y + 10, {
    angle: { min: 250, max: 290 },
    speed: { min: 90, max: 200 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 400,
    gravityY: 280,
    tint: [0xaa55ff, 0x8800ff, 0x551188],
    blendMode: 'ADD',
  }, 20, 420);

  const flickerTween = scene.tweens.add({
    targets: clone,
    alpha: 0.4,
    yoyo: true,
    repeat: -1,
    duration: 600,
    ease: 'Sine.easeInOut',
    delay: 450,
  });

  const lifeBar = createCloneLifeBar(scene, clone, 5000);
  flashGlow(scene, clone, 0.04, 800);

  // 持續環繞能量粒子
  const auraEmitter = scene.add.particles(clone.x, clone.y, 'particle-dot', {
    follow: clone,
    frequency: 800,
    quantity: 4,
    speed: { min: 15, max: 40 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.6, end: 0 },
    lifespan: 600,
    tint: [0xaa55ff, 0x8800ff, 0xcc88ff],
    blendMode: 'ADD',
    angle: { min: 0, max: 360 },
  });
  auraEmitter.setDepth(16);

  const attackInterval = scene.time.addEvent({
    delay: 500,
    repeat: 9,
    callback: () => {
      if (!clone.active || !enemies) return;
      let nearest = null;
      let minDist = 350;
      enemies.getChildren().forEach((enemy) => {
        if (!enemy?.active || enemy.isDead) return;
        const enemyCenter = getEntityEffectPoint(enemy);
        const dist = Phaser.Math.Distance.Between(clone.x, clone.y, enemyCenter.x, enemyCenter.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      });

      if (!nearest || !nearest.active) return;
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.8 * skillDamageScale(gs.skillLevels.B));
      nearest.takeDamage(damage, isCrit);
      const nearestCenter = getEntityEffectPoint(nearest);
      spawnSlashArc(scene, clone.x, clone.y, nearest.x >= clone.x);
      scene.tweens.add({
        targets: clone,
        x: clone.x + (nearest.x > clone.x ? 28 : -28),
        duration: 140,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
      energyBurstRing(scene, nearestCenter.x, nearestCenter.y, 0xddbbff, 18);
    },
  });

  scene.time.delayedCall(5000, () => {
    attackInterval.remove();
    flickerTween.remove();
    lifeBar.destroy();
    if (auraEmitter.active) auraEmitter.destroy();
    spawnBurstEmitter(scene, clone.x, clone.y - 10, {
      angle: { min: 0, max: 360 },
      speed: { min: 80, max: 220 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      tint: [0xaa55ff, 0x8800ff, 0xcc66ff, 0x552288],
      blendMode: 'ADD',
    }, 20, 520);
    energyBurstRing(scene, clone.x, clone.y, 0xaa55ff, 50);
    scene.tweens.add({
      targets: clone,
      scaleX: 0.3, scaleY: 0.3,
      y: clone.y - 50,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => { if (clone.active) clone.destroy(); },
    });
  });

  return clone;
}
import Phaser from 'phaser';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { cameraShockwave, energyBurstRing, flashGlow } from '../engine/vfx.js';
import { getVisualCenterPoint } from '../config/alignment.js';

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
    alpha: { start: 1, end: 0 },
    lifespan: 300,
    tint: [0x8888ff, 0x6644ff, 0x4400ff],
    blendMode: 'ADD',
  }, 8, 340);
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
  const circle = scene.add.graphics().setDepth(depth);
  if (fillAlpha > 0) {
    circle.fillStyle(color, fillAlpha);
    circle.fillCircle(0, 0, radius);
  }
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

function spawnGroundBurst(scene, x, y, count = 10) {
  return spawnBurstEmitter(scene, x, y, {
    angle: { min: 210, max: 330 },
    speed: { min: 70, max: 180 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.8, end: 0 },
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
  const bg = scene.add.graphics().setDepth(19);
  const fg = scene.add.graphics().setDepth(20);
  const startedAt = scene.time.now;

  const redraw = () => {
    if (!clone.active) return;
    const progress = Phaser.Math.Clamp((scene.time.now - startedAt) / duration, 0, 1);
    const remaining = 1 - progress;
    const barWidth = 40;
    const barHeight = 5;
    const x = clone.x - barWidth / 2;
    const y = clone.y - clone.displayHeight * 0.9;
    const color = remaining > 0.5
      ? blendColor(0x44ff66, 0xffdd44, (1 - remaining) / 0.5)
      : blendColor(0xffdd44, 0xff4444, (0.5 - remaining) / 0.5);

    bg.clear();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(x, y, barWidth, barHeight);

    fg.clear();
    fg.fillStyle(color, 1);
    fg.fillRect(x, y, barWidth * remaining, barHeight);
  };

  redraw();
  const timer = scene.time.addEvent({
    delay: 60,
    loop: true,
    callback: redraw,
  });

  return {
    destroy() {
      timer.remove();
      bg.destroy();
      fg.destroy();
    },
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
        frequency: 20,
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
        delay: 50,
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
          if (enemy.isDead || proj._hit) return;
          proj._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2);
          enemy.takeDamage(damage, isCrit);
          const enemyCenter = getEntityEffectPoint(enemy);
          spawnFanBurst(scene, enemyCenter.x, enemyCenter.y, dir > 0);
          energyBurstRing(scene, enemyCenter.x, enemyCenter.y, 0x7755ff, 26);
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
    delay: 25,
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
      while (ghosts.length > 6) {
        const oldest = ghosts.shift();
        if (oldest?.active) oldest.destroy();
      }
    },
  });

  let overlap = null;
  if (enemies?.getChildren) {
    const hitSet = new Set();
    overlap = scene.physics.add.overlap(player, enemies, (dashPlayer, enemy) => {
      if (!dashPlayer?.active || enemy.isDead || hitSet.has(enemy)) return;
      hitSet.add(enemy);
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.5);
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
    spawnGroundBurst(scene, player.x, player.body.bottom, 10);
  });
}

export function castAssassinate(scene, player, enemies) {
  audio.playSkill('C');
  const gs = player.gameState;
  const playerCenter = getEntityEffectPoint(player);
  scene.cameras.main.flash(80, 255, 255, 255);

  let nearest = null;
  let minDist = 400;
  if (enemies?.getChildren) {
    enemies.getChildren().forEach((enemy) => {
      if (enemy.isDead) return;
      const enemyCenter = getEntityEffectPoint(enemy);
      const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, enemyCenter.x, enemyCenter.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    });
  }

  if (!nearest) return;

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

  const damage = Math.floor(gs.atk * 3.5 * gs.critMulti * (0.9 + Math.random() * 0.2));
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
  const slash = scene.add.graphics().setDepth(60);
  slash.lineStyle(6, 0x8822cc, 0.7);
  slash.beginPath(); slash.moveTo(cx - 80, cy); slash.lineTo(cx + 80, cy); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx, cy - 80); slash.lineTo(cx, cy + 80); slash.strokePath();
  slash.lineStyle(3, 0xffffff, 0.9);
  slash.beginPath(); slash.moveTo(cx - 70, cy); slash.lineTo(cx + 70, cy); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx, cy - 70); slash.lineTo(cx, cy + 70); slash.strokePath();
  slash.lineStyle(4, 0xbb66ff, 0.7);
  slash.beginPath(); slash.moveTo(cx - 55, cy - 55); slash.lineTo(cx + 55, cy + 55); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx + 55, cy - 55); slash.lineTo(cx - 55, cy + 55); slash.strokePath();
  slash.fillStyle(0x1a0030, 0.9);
  slash.fillEllipse(cx, cy, 30, 38);
  slash.fillStyle(0xffffff, 1);
  slash.fillCircle(cx, cy, 8);
  scene.tweens.add({
    targets: slash,
    scaleX: 2.2,
    scaleY: 2.2,
    alpha: 0,
    duration: 450,
    ease: 'Quad.easeOut',
    onComplete: () => slash.destroy(),
  });

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frag = scene.add.graphics().setDepth(58);
    frag.fillStyle(0xcc66ff, 0.8);
    frag.fillRect(-3, -8, 6, 16);
    frag.setPosition(cx, cy);
    frag.setRotation(angle);
    scene.tweens.add({
      targets: frag,
      x: cx + Math.cos(angle) * 120,
      y: cy + Math.sin(angle) * 120,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => frag.destroy(),
    });
  }

  scene.cameras.main.shake(200, 0.025);

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
  const radius = 180;
  const hitSet = new Set();

  const telegraph = scene.add.graphics().setDepth(42);
  telegraph.fillStyle(0xff0000, 0.15);
  telegraph.fillCircle(cx, cy, radius);

  scene.time.delayedCall(300, () => {
    if (!scene.sys.isActive()) return;
    if (telegraph.active) telegraph.destroy();

    cameraShockwave(scene, cx, cy, 500);

    const circle = scene.add.graphics().setDepth(45);
    circle.lineStyle(5, 0x7722cc, 0.3);
    circle.strokeCircle(0, 0, radius + 10);
    circle.lineStyle(3, 0xaa44ff, 0.8);
    circle.strokeCircle(0, 0, radius);
    circle.lineStyle(2, 0x8833cc, 0.6);
    circle.strokeCircle(0, 0, radius * 0.75);
    circle.lineStyle(2, 0x6622bb, 0.6);
    circle.strokeCircle(0, 0, radius * 0.45);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const color = i % 2 === 0 ? 0x9933ff : 0xcc66ff;
      circle.lineStyle(1.5, color, 0.5);
      circle.beginPath();
      circle.moveTo(0, 0);
      circle.lineTo(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92);
      circle.strokePath();
    }
    circle.fillStyle(0xcc88ff, 0.35);
    circle.fillCircle(0, 0, 16);
    circle.setPosition(cx, cy);

    const innerCircle = scene.add.graphics().setDepth(44);
    innerCircle.lineStyle(2, 0xdd88ff, 0.5);
    innerCircle.strokeCircle(0, 0, radius * 0.5);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      innerCircle.lineStyle(1, 0xeeaaff, 0.4);
      innerCircle.beginPath();
      innerCircle.moveTo(0, 0);
      innerCircle.lineTo(Math.cos(angle) * radius * 0.48, Math.sin(angle) * radius * 0.48);
      innerCircle.strokePath();
    }
    innerCircle.setPosition(cx, cy);

    scene.tweens.add({ targets: circle, angle: 360, duration: 1200, ease: 'Linear' });
    scene.tweens.add({ targets: innerCircle, angle: -360, duration: 1200, ease: 'Linear' });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const orb = scene.physics.add.sprite(
        cx + Math.cos(angle) * radius * 0.55,
        cy + Math.sin(angle) * radius * 0.55,
        'skill-orb',
      );
      orb.setDepth(46);
      orb.body.setAllowGravity(false);
      orb.setScale(0);
      orb.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
      flashGlow(scene, orb, 0.05, 500);
      scene.tweens.add({
        targets: orb,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: 'Back.easeOut',
      });

      const tail = scene.add.particles(0, 0, 'particle-dot', {
        follow: orb,
        frequency: 20,
        quantity: 1,
        lifespan: 200,
        speed: { min: 6, max: 30 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.75, end: 0 },
        tint: [0x9933ff, 0xcc99ff],
        blendMode: 'ADD',
      });
      tail.setDepth(45);
      stopEmitterAfter(scene, tail, 700, 220);

      if (enemies?.getChildren) {
        scene.physics.add.overlap(orb, enemies, (projectile, enemy) => {
          if (enemy.isDead || hitSet.has(enemy) || projectile._hit) return;
          hitSet.add(enemy);
          projectile._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.0);
          enemy.takeDamage(damage, isCrit);
          const enemyCenter = getEntityEffectPoint(enemy);
          energyBurstRing(scene, enemyCenter.x, enemyCenter.y, 0xbb66ff, 25);
          if (tail.active) {
            tail.stop();
            scene.time.delayedCall(200, () => { if (tail.active) tail.destroy(); });
          }
          projectile.destroy();
        });
      }

      scene.time.delayedCall(700, () => {
        if (tail.active) {
          tail.stop();
          scene.time.delayedCall(200, () => { if (tail.active) tail.destroy(); });
        }
        if (orb.active) orb.destroy();
      });
    }

    particles.spawnVortex(scene, cx, cy);
    scene.time.delayedCall(800, () => {
      scene.tweens.add({
        targets: [circle, innerCircle],
        scaleX: 2.5,
        scaleY: 2.5,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (circle.active) circle.destroy();
          if (innerCircle.active) innerCircle.destroy();
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
  clone.setAlpha(0.7);
  clone.setTint(0x8800ff);
  clone.setFlipX(player.flipX);
  clone.body.setAllowGravity(false);
  clone.setVelocity(0, 0);

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
  });

  const lifeBar = createCloneLifeBar(scene, clone, 5000);
  flashGlow(scene, clone, 0.04, 800);

  const attackInterval = scene.time.addEvent({
    delay: 500,
    repeat: 9,
    callback: () => {
      if (!clone.active || !enemies) return;
      let nearest = null;
      let minDist = 350;
      enemies.getChildren().forEach((enemy) => {
        if (enemy.isDead) return;
        const enemyCenter = getEntityEffectPoint(enemy);
        const dist = Phaser.Math.Distance.Between(clone.x, clone.y, enemyCenter.x, enemyCenter.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      });

      if (!nearest) return;
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.8);
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
    spawnBurstEmitter(scene, clone.x, clone.y - 10, {
      angle: { min: 0, max: 360 },
      speed: { min: 60, max: 180 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.85, end: 0 },
      lifespan: 420,
      tint: [0xaa55ff, 0x8800ff, 0x552288],
      blendMode: 'ADD',
    }, 15, 440);
    scene.tweens.add({
      targets: clone,
      y: clone.y - 60,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => clone.destroy(),
    });
  });

  return clone;
}
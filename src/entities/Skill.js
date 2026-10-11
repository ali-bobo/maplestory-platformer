import Phaser from 'phaser';
import { audio } from '../engine/audio.js';
import {
  cameraShockwave, energyBurstRing, screenFlash,
  screenDarken, cameraZoomPunch, spawnLightRays,
  spawnSlashWave, spawnSpeedLines,
} from '../engine/vfx.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { getQuality } from '../engine/quality.js';
import { getVisualCenterPoint, ALIGNMENT_PROFILES, applyAlignmentProfile } from '../config/alignment.js';
import { skillDamageScale, BASIC_ATTACK_DEF } from '../config/constants.js';

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
    const y = clone.y - clone.displayHeight - 2;

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

/**
 * 命中停頓（hit-stop）：短暫放慢物理與補間，讓重擊有「卡一下」的手感。
 * 多次呼叫只會延長，不會疊加縮放。
 */
function hitStop(scene, duration = 60) {
  const world = scene.physics?.world;
  if (!world || scene._hitStopActive) return;
  scene._hitStopActive = true;
  const prevTimeScale = world.timeScale;
  world.timeScale = 6; // arcade 的 timeScale 越大越慢
  const release = () => {
    world.timeScale = prevTimeScale;
    scene._hitStopActive = false;
  };
  scene.time.delayedCall(duration, release);
  // 場景在停頓中切換時 delayedCall 會被清掉，旗標要一併重置（每個場景只掛一次）
  if (!scene._hitStopHooked) {
    scene._hitStopHooked = true;
    scene.events.once('shutdown', () => {
      scene._hitStopActive = false;
      scene._hitStopHooked = false;
    });
  }
}

/** 命中星芒：白色柔光 + 十字閃光，比單純圓環更有「打中」的感覺 */
function spawnImpactSpark(scene, x, y, color = 0xaaccff, size = 1) {
  const glow = scene.add.image(x, y, VFX_TEX.SOFT_GLOW).setDepth(61)
    .setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6 * size);
  scene.tweens.add({
    targets: glow, scale: 1.5 * size, alpha: 0, duration: 220, ease: 'Quad.easeOut',
    onComplete: () => glow.destroy(),
  });
  const rot = Math.random() * Math.PI;
  for (let i = 0; i < 2; i++) {
    const streak = scene.add.image(x, y, VFX_TEX.WHITE_PX).setDepth(62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(46 * size, 3)
      .setRotation(rot + i * Math.PI / 2);
    scene.tweens.add({
      targets: streak, scaleY: 0, alpha: 0, duration: 160, ease: 'Quad.easeIn',
      onComplete: () => streak.destroy(),
    });
  }
}

function findNearestEnemy(enemies, x, y, maxDist) {
  let nearest = null;
  let minDist = maxDist;
  enemies?.getChildren?.().forEach((enemy) => {
    if (!enemy?.active || enemy.isDead) return;
    const c = getEntityEffectPoint(enemy);
    const d = Phaser.Math.Distance.Between(x, y, c.x, c.y);
    if (d < minDist) { minDist = d; nearest = enemy; }
  });
  return nearest;
}

/**
 * 發射一顆飛鏢。玩家的 Z 技能與影分身共用。
 * opts: x, y, vx, vy, multiplier, skillKey, tint, scale, pierce, alpha
 */
function launchShuriken(scene, player, enemies, opts) {
  const gs = player.gameState;
  const dir = opts.vx >= 0 ? 1 : -1;
  const scale = opts.scale ?? 1;
  const shuriken = scene.physics.add.sprite(opts.x, opts.y, VFX_TEX.SHURIKEN);
  shuriken.setDepth(20);
  shuriken.setScale(0.85 * scale);
  shuriken.setAlpha(opts.alpha ?? 1);
  if (opts.tint) shuriken.setTint(opts.tint);
  shuriken.body.setAllowGravity(false);
  shuriken.body.setCircle(14, 10, 10);
  shuriken.setVelocity(opts.vx, opts.vy ?? 0);
  shuriken.setAngularVelocity(dir * 1440);

  const trail = scene.add.particles(0, 0, 'particle-dot', {
    follow: shuriken,
    frequency: 45,
    quantity: 1,
    lifespan: 260,
    speed: { min: 5, max: 25 },
    scale: { start: 0.9 * scale, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: opts.trailTint ?? [0xcfe0ff, 0x8fb0ff, 0x5a6cff],
    blendMode: 'ADD',
  });
  trail.setDepth(18);

  const afterimageTimer = scene.time.addEvent({
    delay: 70,
    loop: true,
    callback: () => {
      if (!shuriken.active) { afterimageTimer.remove(); return; }
      spawnAfterimage(scene, shuriken, { alpha: 0.35, duration: 140, tint: opts.trailTint?.[0] ?? 0x9fb4ff });
    },
  });

  let overlap = null;
  const hitSet = new Set();
  const maxHits = opts.pierce ?? 1;
  if (enemies?.getChildren) {
    overlap = scene.physics.add.overlap(shuriken, enemies, (proj, enemy) => {
      if (!proj.active || !enemy?.active || enemy.isDead || hitSet.has(enemy)) return;
      hitSet.add(enemy);
      const { damage, isCrit } = calcDamage(
        gs.atk, gs.critRate, gs.critMulti,
        opts.multiplier * skillDamageScale(gs.skillLevels[opts.skillKey] ?? 1),
      );
      enemy.takeDamage(damage, isCrit);
      enemy.applyKnockback?.(dir * (isCrit ? 260 : 150), isCrit ? 220 : 140);
      const c = getEntityEffectPoint(enemy);
      spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xaaccff, isCrit ? 1.3 : 1);
      spawnFanBurst(scene, c.x, c.y, dir > 0);
      audio.playImpact(isCrit);
      if (isCrit) {
        hitStop(scene, 50);
        spawnLightRays(scene, c.x, c.y, { count: 10, length: 80, color: 0xffe08a, alpha: 0.45, duration: 280 });
        scene.cameras.main.shake(90, 0.01);
      } else {
        scene.cameras.main.shake(40, 0.004);
      }
      if (hitSet.size >= maxHits) cleanupProjectile(scene, proj, overlap, trail, afterimageTimer);
    });
  }

  scene.time.delayedCall(opts.lifetime ?? 650, () => {
    cleanupProjectile(scene, shuriken, overlap, trail, afterimageTimer);
  });
  return shuriken;
}

// 普通攻擊：面前一個短距離的揮刀判定（不耗 MP、不吃技能等級），可同時命中範圍內所有敵人。
export function castSlash(scene, player, enemies) {
  audio.playSkill('ATK');
  const dir = player.facingRight ? 1 : -1;
  if (typeof player._lockPose === 'function') {
    player._lockPose('player_slash_1', 80);
    scene.time.delayedCall(80, () => { if (player.active && !player.isDead) player._lockPose('player_slash_2', 90); });
    scene.time.delayedCall(170, () => { if (player.active && !player.isDead) player._lockPose('player_slash_3', 130); });
  }

  scene.time.delayedCall(80, () => {
    if (!scene.sys.isActive() || !player.active || player.isDead) return;
    const gs = player.gameState;
    const origin = getEntityEffectPoint(player);
    const range = BASIC_ATTACK_DEF.range;
    spawnSlashWave(scene, origin.x, origin.y - 4, player.facingRight, {
      radius: range * 0.8, color: 0xe8f0ff, duration: 200, scale: 1.5,
    });
    let hits = 0;
    let crit = false;
    enemies?.getChildren?.().forEach((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const c = getEntityEffectPoint(enemy);
      const reach = range + (enemy.body ? enemy.body.halfWidth : 20);
      const ahead = (c.x - origin.x) * dir;
      if (ahead < -16 || ahead > reach || Math.abs(c.y - origin.y) > 62) return;
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, BASIC_ATTACK_DEF.damageMult);
      enemy.takeDamage(damage, isCrit);
      enemy.applyKnockback?.(dir * (isCrit ? 240 : 130), isCrit ? 200 : 110);
      spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xaaccff, isCrit ? 1.3 : 1);
      audio.playImpact(isCrit);
      hits++;
      crit = crit || isCrit;
    });
    if (hits > 0) {
      if (crit) hitStop(scene, 45);
      scene.cameras.main.shake(crit ? 80 : 35, crit ? 0.009 : 0.003);
    }
  });
}

export function castShuriken(scene, player, enemies) {
  audio.playSkill('Z');
  const dir = player.facingRight ? 1 : -1;

  if (typeof player.playThrowAnimation === 'function') {
    player.playThrowAnimation(220);
  }

  // 三連飛鏢：扇形散射（上 / 中 / 下），第三發會穿透一隻
  const spread = [-70, 0, 70];
  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 70, () => {
      if (!scene.sys.isActive() || !player.active) return;
      const origin = getEntityEffectPoint(player);
      const x = player.x + dir * 24;
      const y = origin.y - 6;
      spawnShockCircle(scene, x, y, {
        startRadius: 6, endRadius: 20, duration: 110, color: 0xcfe0ff, alpha: 0.6, lineWidth: 2,
      });
      launchShuriken(scene, player, enemies, {
        x, y,
        vx: dir * 720,
        vy: spread[i],
        multiplier: 1.2,
        skillKey: 'Z',
        pierce: i === 2 ? 2 : 1,
      });
    });
  }
  mirrorShurikenFromClone(scene, player, enemies);
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
        alpha: 0.55,
        duration: 320,
        tint: 0x3a1f6e,
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

  // 影襲：穿過的敵人先吃一刀並被「標記」，衝刺結束後所有標記同時引爆十字斬
  const marked = [];
  let overlap = null;
  if (enemies?.getChildren) {
    const hitSet = new Set();
    overlap = scene.physics.add.overlap(player, enemies, (dashPlayer, enemy) => {
      if (!dashPlayer?.active || !enemy?.active || enemy.isDead || hitSet.has(enemy)) return;
      hitSet.add(enemy);
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.6 * skillDamageScale(gs.skillLevels.X));
      enemy.takeDamage(damage, isCrit);
      audio.playImpact(isCrit);
      const c = getEntityEffectPoint(enemy);
      spawnImpactSpark(scene, c.x, c.y, 0xc9a0ff, 0.9);
      if (!enemy.isDead) {
        const mark = scene.add.image(c.x, c.y - 4, VFX_TEX.SHURIKEN).setDepth(63)
          .setTint(0xb070ff).setScale(0.2).setAlpha(0.95);
        scene.tweens.add({ targets: mark, scale: 0.75, angle: 180, duration: 180, ease: 'Back.easeOut' });
        marked.push({ enemy, mark });
      }
    });
  }

  const detonateMarks = () => {
    marked.forEach(({ enemy, mark }, i) => {
      scene.time.delayedCall(140 + i * 45, () => {
        if (mark.active) mark.destroy();
        if (!enemy?.active || enemy.isDead) return;
        const c = getEntityEffectPoint(enemy);
        const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2 * skillDamageScale(gs.skillLevels.X));
        enemy.takeDamage(damage, isCrit);
        enemy.applyKnockback?.(dir * 220, 200, -160);
        audio.playImpact(true);
        spawnSlashWave(scene, c.x, c.y, true, {
          radius: 46, color: 0xffffff, glowColor: 0xaa55ff, lineWidth: 5, duration: 220, arcStart: -1.2, arcEnd: 0.4,
        });
        spawnSlashWave(scene, c.x, c.y, false, {
          radius: 46, color: 0xffffff, glowColor: 0xaa55ff, lineWidth: 5, duration: 220, arcStart: -1.2, arcEnd: 0.4,
        });
        spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xd8b0ff, 1.4);
        if (i === 0) {
          hitStop(scene, 70);
          scene.cameras.main.shake(110, 0.012);
        }
      });
    });
  };

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
      color: 0x8844ff, alpha: 0.6, lineWidth: 2,
    });
    detonateMarks();
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

  // 瞬移到敵人「背後」（相對玩家原本的位置），轉身面向敵人
  const behind = player.x <= nearest.x ? 1 : -1;
  const desiredX = Phaser.Math.Clamp(
    nearest.x + behind * Math.max(40, (nearest.body?.width ?? 40) / 2 + 24),
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
  player.facingRight = nearest.x >= player.x;
  player.setFlipX(!player.facingRight);
  player.playThrowAnimation?.(320);

  // 背刺連段：兩下快斬（各 0.8×暴傷）→ 終結重擊（1.9×暴傷），總倍率與舊版 3.5 相同
  const flurryDir = player.facingRight;
  [0, 90].forEach((delay, idx) => {
    scene.time.delayedCall(delay, () => {
      if (!scene.sys.isActive() || !nearest.active || nearest.isDead) return;
      const c = getEntityEffectPoint(nearest);
      const dmg = Math.floor(gs.atk * 0.8 * skillDamageScale(gs.skillLevels.C) * gs.critMulti * (0.9 + Math.random() * 0.2));
      nearest.takeDamage(dmg, true);
      audio.playImpact(false);
      spawnSlashWave(scene, c.x, c.y, idx === 0 ? flurryDir : !flurryDir, {
        radius: 56, color: 0xf0e0ff, duration: 180, scale: 1.4,
      });
      spawnImpactSpark(scene, c.x, c.y, 0xd8b0ff, 1);
      scene.cameras.main.shake(50, 0.006);
    });
  });

  scene.time.delayedCall(200, () => {
    if (!scene.sys.isActive() || !nearest.active) return;
    if (nearest.isDead) return;
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

    const damage = Math.floor(gs.atk * 1.9 * skillDamageScale(gs.skillLevels.C) * gs.critMulti * (0.9 + Math.random() * 0.2));
    nearest.takeDamage(damage, true);
    audio.playImpact(true);
    hitStop(scene, 90);
    nearest.applyKnockback?.((player.facingRight ? 1 : -1) * 320, 260, -200);
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
  });
}

export function castVortex(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const origin = getEntityEffectPoint(player);
  // 漩渦開在玩家前方，把周圍的怪往同一點吸，最後引爆
  const cx = Phaser.Math.Clamp(origin.x + dir * 150, 60, scene.physics.world.bounds.width - 60);
  const cy = origin.y - 10;
  const radius = 210;
  const tickCount = 6;
  const tickInterval = 190;
  const feetY = player.body ? player.body.bottom : player.y;

  // ① 地面符文（壓扁成橢圓）預告
  const rune = scene.add.image(cx, feetY - 2, VFX_TEX.GROUND_RUNE).setDepth(9)
    .setTint(0xa066ff).setAlpha(0).setScale(0.2, 0.06).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: rune, alpha: 0.85, scaleX: 1.15, scaleY: 0.32, duration: 220, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: rune, angle: 360, duration: 2400, repeat: -1 });

  scene.time.delayedCall(200, () => {
    if (!scene.sys.isActive()) { rune.destroy(); return; }

    screenDarken(scene, 1100, 0.3);
    cameraZoomPunch(scene, 0.03, 200);

    // ② 漩渦本體：外層螺旋（紫）+ 內層反轉螺旋（亮紫）+ 黑洞核心
    // 深色底層螺旋：亮背景上也看得清楚輪廓
    const under = scene.add.image(cx, cy, VFX_TEX.VORTEX_SPIRAL).setDepth(43)
      .setTint(0x2a0f55).setAlpha(0.6).setScale(0.1);
    const outer = scene.add.image(cx, cy, VFX_TEX.VORTEX_SPIRAL).setDepth(44)
      .setTint(0x9a5cff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setAlpha(1);
    const inner = scene.add.image(cx, cy, VFX_TEX.VORTEX_SPIRAL).setDepth(45)
      .setTint(0xe0b8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.05).setAlpha(0.8).setFlipX(true);
    const core = scene.add.image(cx, cy, VFX_TEX.VORTEX_CORE).setDepth(46).setScale(0.1);
    const outerScale = (radius * 0.85) / 128;
    scene.tweens.add({ targets: [outer, under], scale: outerScale, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: inner, scale: outerScale * 0.55, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: core, scale: 0.9, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: [outer, under], angle: -1080, duration: tickCount * tickInterval + 300 });
    scene.tweens.add({ targets: inner, angle: 1440, duration: tickCount * tickInterval + 300 });
    scene.tweens.add({ targets: core, scale: 1.05, yoyo: true, repeat: -1, duration: 160, ease: 'Sine.easeInOut', delay: 260 });

    // 被吸入的粒子：從外圈生成、往中心收
    const suck = scene.add.particles(cx, cy, 'particle-dot', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, radius * 0.9), quantity: 24 },
      moveToX: cx,
      moveToY: cy,
      lifespan: 420,
      frequency: 30,
      quantity: 2,
      scale: { start: 1.1, end: 0.2 },
      alpha: { start: 0, end: 0.9 },
      tint: [0xb98bff, 0x7a3cff, 0xffffff],
      blendMode: 'ADD',
    });
    suck.setDepth(43);

    // ③ 持續牽引 + 多段傷害
    let ticks = 0;
    const tickTimer = scene.time.addEvent({
      delay: tickInterval,
      repeat: tickCount - 1,
      callback: () => {
        if (!scene.sys.isActive()) return;
        ticks += 1;
        enemies?.getChildren?.().forEach((enemy) => {
          if (!enemy?.active || enemy.isDead) return;
          const c = getEntityEffectPoint(enemy);
          const dx = cx - c.x;
          const dist = Math.hypot(dx, cy - c.y);
          if (dist > radius) return;
          if (Math.abs(dx) > 12) {
            enemy.applyKnockback?.(Math.sign(dx) * Math.min(300, Math.abs(dx) * 2.4 + 60), tickInterval);
          }
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.35 * skillDamageScale(gs.skillLevels.V));
          enemy.takeDamage(damage, isCrit);
          spawnImpactSpark(scene, c.x, c.y, 0xb98bff, 0.7);
        });
        if (ticks % 2 === 0) audio.playImpact(false);
      },
    });

    // ④ 收束引爆
    scene.time.delayedCall(tickCount * tickInterval + 120, () => {
      tickTimer.remove();
      if (suck.active) { suck.stop(); scene.time.delayedCall(450, () => suck.destroy()); }
      if (!scene.sys.isActive()) return;

      screenFlash(scene, 90, 0.3);
      cameraShockwave(scene, cx, cy, 380);
      scene.cameras.main.shake(180, 0.016);
      hitStop(scene, 80);
      audio.playImpact(true);
      energyBurstRing(scene, cx, cy, 0xffffff, 70);
      scene.time.delayedCall(60, () => energyBurstRing(scene, cx, cy, 0xaa66ff, 130));
      spawnLightRays(scene, cx, cy, { count: 16, length: radius, color: 0xd9b0ff, alpha: 0.55, duration: 380, width: 2.5 });
      spawnShockCircle(scene, cx, cy, {
        startRadius: 30, endRadius: radius + 20, duration: 260, color: 0xe0c0ff, alpha: 0.8, lineWidth: 4, depth: 54,
      });

      enemies?.getChildren?.().forEach((enemy) => {
        if (!enemy?.active || enemy.isDead) return;
        const c = getEntityEffectPoint(enemy);
        if (Phaser.Math.Distance.Between(cx, cy, c.x, c.y) > radius + 20) return;
        const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.9 * skillDamageScale(gs.skillLevels.V));
        enemy.takeDamage(damage, isCrit);
        const away = c.x >= cx ? 1 : -1;
        enemy.applyKnockback?.(away * 340, 260, -220);
        spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xe0c0ff, 1.3);
      });

      scene.tweens.add({
        targets: [outer, inner, under],
        scale: outerScale * 1.6,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
      });
      scene.tweens.killTweensOf(core);
      scene.tweens.add({ targets: core, scale: 0, duration: 200, ease: 'Back.easeIn' });
      scene.tweens.killTweensOf(rune);
      scene.tweens.add({ targets: rune, alpha: 0, scaleX: 1.5, duration: 300 });
      scene.time.delayedCall(320, () => {
        [outer, inner, under, core, rune].forEach((o) => o.active && o.destroy());
      });
    });
  });
}

/** 影分身跟著玩家丟 Z：由 castShuriken 呼叫 */
function mirrorShurikenFromClone(scene, player, enemies) {
  const clone = scene._shadowClone;
  if (!clone?.active) return;
  const dir = clone.flipX ? -1 : 1;
  scene.time.delayedCall(90, () => {
    if (!clone.active) return;
    clone.lockPose?.('player_attack', 180);
    launchShuriken(scene, player, enemies, {
      x: clone.x + dir * 22, y: clone.y - clone.displayHeight * 0.45, vx: dir * 680, vy: 0,
      multiplier: 0.6, skillKey: 'B', tint: 0xc9a0ff, alpha: 0.9,
      trailTint: [0xc9a0ff, 0x8a4dff, 0x4a1d99],
    });
  });
}

export function castClone(scene, player, enemies) {
  audio.playSkill('B');
  const DURATION = 12000;
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;

  // 同時只存在一個分身：重放時先收掉舊的
  if (scene._shadowClone?.active) scene._shadowClone.emit('expire');

  // 分身 = 有物理身體的黑影：會自己跑、跳、追怪，近身斬擊、遠距丟鏢
  const startX = player.x - dir * 40;
  const clone = scene.physics.add.sprite(startX, player.y, player.texture.key);
  applyAlignmentProfile(clone, ALIGNMENT_PROFILES.player);
  clone.setPosition(startX, player.y);
  clone.setDepth(15).setTint(0x1c0f33).setAlpha(0);
  clone.setFlipX(player.flipX);
  clone.setCollideWorldBounds(true);
  const aura = scene.add.image(clone.x, clone.y, clone.texture.key)
    .setOrigin(clone.originX, clone.originY).setDepth(14)
    .setTint(0x9a5cff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  aura.setDisplaySize(clone.displayWidth * 1.08, clone.displayHeight * 1.05);
  scene._shadowClone = clone;

  const colliders = [];
  if (scene.platforms) colliders.push(scene.physics.add.collider(clone, scene.platforms));
  if (scene.thinPlatforms) {
    colliders.push(scene.physics.add.collider(clone, scene.thinPlatforms, null,
      (c, plat) => !c._dropThrough && c.body.velocity.y >= 0 && c.body.bottom <= plat.body.top + 12));
  }

  let poseLockUntil = 0;
  let poseLockKey = null;
  clone.lockPose = (key, ms) => {
    if (!scene.textures.exists(key)) return;
    poseLockKey = key;
    poseLockUntil = scene.time.now + ms;
  };

  // 入場：黑煙 + 地面符文
  scene.tweens.add({ targets: clone, alpha: 0.85, duration: 300 });
  scene.tweens.add({ targets: aura, alpha: 0.35, duration: 300 });
  const smokeBurst = (x, y) => spawnBurstEmitter(scene, x, y, {
    angle: { min: 200, max: 340 },
    speed: { min: 40, max: 140 },
    scale: { start: 1.6, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 520,
    gravityY: -60,
    tint: [0x2a1450, 0x4a2a80, 0x8a4dff],
  }, 18, 560);
  smokeBurst(clone.x, clone.y - 4);
  const rune = scene.add.image(clone.x, clone.y - 2, VFX_TEX.GROUND_RUNE).setDepth(9)
    .setTint(0x8a4dff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1, 0.03).setAlpha(0.9);
  scene.tweens.add({
    targets: rune, scaleX: 0.42, scaleY: 0.12, alpha: 0, duration: 650, ease: 'Quad.easeOut',
    onComplete: () => rune.destroy(),
  });
  screenFlash(scene, 60, 0.1);

  const lifeBar = createCloneLifeBar(scene, clone, DURATION);

  const RUN_SPEED = Math.max(240, gs.speed + 30);
  const MELEE_RANGE = 70;
  const THROW_RANGE = 380;
  let nextMeleeAt = 0;
  let nextThrowAt = 0;
  let nextJumpAt = 0;
  let target = null;
  let retargetAt = 0;

  const slash = (enemy) => {
    const c = getEntityEffectPoint(enemy);
    const face = c.x >= clone.x ? 1 : -1;
    clone.setFlipX(face < 0);
    clone.lockPose('player_attack', 220);
    const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.9 * skillDamageScale(gs.skillLevels.B));
    enemy.takeDamage(damage, isCrit);
    enemy.applyKnockback?.(face * 180, 160);
    audio.playImpact(isCrit);
    spawnSlashWave(scene, c.x - face * 10, c.y, face > 0, { radius: 48, color: 0xd8b0ff, duration: 200, scale: 1.4 });
    spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xc9a0ff, 1);
  };

  const throwAt = (enemy) => {
    const c = getEntityEffectPoint(enemy);
    const face = c.x >= clone.x ? 1 : -1;
    clone.setFlipX(face < 0);
    clone.lockPose('player_attack', 200);
    const oy = clone.y - clone.displayHeight * 0.45;
    const angle = Math.atan2(c.y - oy, c.x - clone.x);
    launchShuriken(scene, player, enemies, {
      x: clone.x + face * 20, y: oy,
      vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720,
      multiplier: 0.7, skillKey: 'B', tint: 0xc9a0ff, alpha: 0.9,
      trailTint: [0xc9a0ff, 0x8a4dff, 0x4a1d99],
    });
  };

  // 每幀 AI：鎖定最近的怪 → 跑過去（必要時跳）→ 近身斬 / 中距丟鏢；沒有怪就跟回玩家身邊
  const think = (time) => {
    if (!clone.active || !clone.body) return;
    const onGround = clone.body.blocked.down || clone.body.touching.down;

    if (time >= retargetAt || !target?.active || target.isDead) {
      target = findNearestEnemy(enemies, clone.x, clone.y - 30, 650);
      retargetAt = time + 400;
    }

    let goalX;
    if (target) {
      const c = getEntityEffectPoint(target);
      const dx = c.x - clone.x;
      const dist = Math.abs(dx);
      const dy = target.body ? target.body.bottom - clone.body.bottom : 0;
      if (dist <= MELEE_RANGE && Math.abs(dy) < 70) {
        goalX = clone.x;
        if (time >= nextMeleeAt) { slash(target); nextMeleeAt = time + 420; }
      } else {
        goalX = c.x - Math.sign(dx) * 40;
        if (dist <= THROW_RANGE && time >= nextThrowAt) { throwAt(target); nextThrowAt = time + 900; }
      }
      // 目標在上層平台 → 跳；在下層 → 穿過薄平台
      if (onGround && dy < -60 && dist < 260 && time >= nextJumpAt) {
        clone.setVelocityY(-560);
        nextJumpAt = time + 700;
      }
      clone._dropThrough = dy > 60 && dist < 200;
    } else {
      const back = player.facingRight ? -1 : 1;
      goalX = player.x + back * 50;
      clone._dropThrough = false;
      const dyp = player.body ? player.body.bottom - clone.body.bottom : 0;
      if (onGround && dyp < -60 && time >= nextJumpAt) {
        clone.setVelocityY(-560);
        nextJumpAt = time + 700;
      }
      // 離玩家太遠（例如掉下去）就瞬移回來
      if (Math.abs(player.x - clone.x) > 700 || Math.abs(dyp) > 400) {
        smokeBurst(clone.x, clone.y - 20);
        clone.body.reset(goalX, player.y);
      }
    }

    const gap = goalX - clone.x;
    if (Math.abs(gap) > 8) {
      clone.setVelocityX(Math.sign(gap) * RUN_SPEED);
      if (time >= poseLockUntil) clone.setFlipX(gap < 0);
    } else {
      clone.setVelocityX(0);
    }

    // 姿勢
    let key;
    if (time < poseLockUntil && poseLockKey) key = poseLockKey;
    else if (!onGround) key = 'player_jump';
    else if (Math.abs(clone.body.velocity.x) > 10) key = Math.floor(time / 140) % 2 ? 'player_walk_1' : 'player_walk_2';
    else key = 'player_idle';
    if (scene.textures.exists(key) && clone.texture.key !== key) {
      clone.setTexture(key);
      aura.setTexture(key);
    }
    aura.setFlipX(clone.flipX);
    aura.setPosition(clone.x, clone.y);
  };
  scene.events.on('update', think);

  let expired = false;
  const expire = () => {
    if (expired) return;
    expired = true;
    scene.events.off('update', think);
    colliders.forEach((c) => scene.physics.world.removeCollider(c));
    lifeBar.destroy();
    if (scene._shadowClone === clone) scene._shadowClone = null;
    if (!clone.active) { aura.destroy(); return; }
    clone.body.enable = false;
    smokeBurst(clone.x, clone.y - 20);
    scene.tweens.add({
      targets: [clone, aura], alpha: 0, y: clone.y + 10, duration: 320, ease: 'Quad.easeIn',
      onComplete: () => { clone.destroy(); aura.destroy(); },
    });
  };
  clone.once('expire', expire);
  const expireTimer = scene.time.delayedCall(DURATION, expire);
  scene.events.once('shutdown', () => {
    expireTimer.remove();
    scene.events.off('update', think);
    if (scene._shadowClone === clone) scene._shadowClone = null;
  });

  return clone;
}

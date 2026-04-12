// 技能效果實作（Iteration 5 — 使用 rex PostFX 強化視覺）
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { flashGlow, cameraShockwave, spawnEnergyTrail, screenFlash, energyBurstRing } from '../engine/vfx.js';

// ── 共用：計算傷害 ──────────────────────────────────────────────────────────
function calcDamage(atk, critRate, critMulti, multiplier = 1) {
  const base = atk * multiplier * (0.85 + Math.random() * 0.3);
  const isCrit = Math.random() < critRate;
  return { damage: Math.floor(isCrit ? base * critMulti : base), isCrit };
}

// ── Z: 三連飛鏢（增強版 — 發光拖尾 + 衝擊閃光）───────────────────────────
export function castShuriken(scene, player, enemies) {
  audio.playSkill('Z');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const shurikens = [];

  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 80, () => {
      if (!scene || !scene.sys.isActive()) return;
      const s = scene.physics.add.sprite(
        player.x + dir * 20,
        player.y - 5 + (i - 1) * 10,
        'skill-shuriken'
      );
      s.setVelocityX(dir * 600);
      s.setVelocityY(-20 + (i - 1) * 20);
      s.setDepth(20);
      s.body.setAllowGravity(false);
      s.setFlipX(dir < 0);
      shurikens.push(s);

      // 旋轉動畫
      scene.tweens.add({ targets: s, angle: dir * 720, duration: 600, ease: 'Linear' });

      // ★ 發光拖尾粒子
      spawnEnergyTrail(scene, s, 0x88ccff, 550);

      // ★ 飛鏢本體短暫發光
      flashGlow(scene, s, 0.04, 500);

      // 碰撞偵測
      if (enemies && enemies.getChildren) {
        scene.physics.add.overlap(s, enemies, (shuriken, enemy) => {
          if (enemy.isDead || shuriken._hit) return;
          shuriken._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2);
          enemy.takeDamage(damage, isCrit);
          particles.spawnHit(scene, enemy.x, enemy.y, 0xaaaaff);

          // ★ 暴擊時增加衝擊閃光
          if (isCrit) {
            screenFlash(scene, 80, 0.2);
          }
          scene.cameras.main.shake(isCrit ? 100 : 50, isCrit ? 0.012 : 0.005);
          shuriken.destroy();
        });
      }

      // 自動銷毀
      scene.time.delayedCall(600, () => { if (s && s.active) s.destroy(); });
    });
  }
  return shurikens;
}

// ── X: 暗影步伐（增強版 — 殘影分身 + 發光 + 衝擊波）────────────────────────
export function castDash(scene, player, enemies) {
  audio.playSkill('X');
  const dir = player.facingRight ? 1 : -1;

  player.isDashing = true;
  player.body.setAllowGravity(false);
  player.setVelocity(dir * 900, 0);

  // ★ 玩家衝刺發光
  flashGlow(scene, player, 0.05, 350);

  // ★ 殘影（半透明的角色副本，取代舊的 dot 粒子）
  const trailInterval = scene.time.addEvent({
    delay: 35,
    repeat: 7,
    callback: () => {
      if (!player.active) return;
      const ghost = scene.add.image(player.x, player.y, 'final_char');
      ghost.setDisplaySize(80, 80);
      ghost.setFlipX(!player.facingRight);
      ghost.setAlpha(0.5);
      ghost.setTint(0x8800ff);
      ghost.setDepth(15);
      scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: ghost.scaleX * 1.1,
        scaleY: ghost.scaleY * 1.1,
        duration: 250,
        onComplete: () => ghost.destroy(),
      });
      // 同時保留粒子拖尾
      particles.spawnDashTrail(scene, player.x, player.y);
    },
  });

  // 傷害判定（穿越敵人時）
  if (enemies && enemies.getChildren) {
    const hitSet = new Set();
    const overlapCheck = scene.physics.add.overlap(player, enemies, (p, enemy) => {
      if (enemy.isDead || hitSet.has(enemy)) return;
      hitSet.add(enemy);
      const gs = p.gameState;
      const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.5);
      enemy.takeDamage(damage, isCrit);
      particles.spawnHit(scene, enemy.x, enemy.y, 0x8800ff);
    });
    scene.time.delayedCall(250, () => {
      scene.physics.world.removeCollider(overlapCheck);
    });
  }

  scene.time.delayedCall(250, () => {
    player.isDashing = false;
    player.body.setAllowGravity(true);
    player.setVelocityX(0);

    // ★ 衝刺結束時產生能量環
    energyBurstRing(scene, player.x, player.y, 0x6600cc, 60);
  });
}

// ── C: 暗殺（增強版 — 衝擊波 + 十字斬 + 能量環 + 畫面白閃）──────────────
export function castAssassinate(scene, player, enemies) {
  audio.playSkill('C');
  const gs = player.gameState;

  // 尋找最近敵人
  let nearest = null;
  let minDist = 400;
  if (enemies && enemies.getChildren) {
    enemies.getChildren().forEach(e => {
      if (e.isDead) return;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
  }

  if (!nearest) return;

  // 瞬移到目標
  player.setPosition(nearest.x + (player.facingRight ? -40 : 40), nearest.y);
  particles.spawnHit(scene, player.x, player.y, 0x440088);

  // 必定暴擊
  const damage = Math.floor(gs.atk * 3.5 * gs.critMulti * (0.9 + Math.random() * 0.2));
  nearest.takeDamage(damage, true);
  particles.spawnDeath(scene, nearest.x, nearest.y, 0xaa00ff);

  // ★ 畫面白閃（短暫強烈）
  screenFlash(scene, 150, 0.45);

  // ★ 相機衝擊波
  cameraShockwave(scene, nearest.x, nearest.y, 350);

  // ★ 能量爆發環
  energyBurstRing(scene, nearest.x, nearest.y, 0xcc44ff, 100);

  const cx = nearest.x, cy = nearest.y;

  // ★ 十字斬光效（取代舊的放射線）
  const slash = scene.add.graphics();
  slash.setDepth(60);

  // 水平斬
  slash.lineStyle(4, 0xffffff, 0.9);
  slash.beginPath();
  slash.moveTo(cx - 60, cy);
  slash.lineTo(cx + 60, cy);
  slash.strokePath();
  // 垂直斬
  slash.lineStyle(4, 0xFF48C4, 0.9);
  slash.beginPath();
  slash.moveTo(cx, cy - 60);
  slash.lineTo(cx, cy + 60);
  slash.strokePath();

  // 對角線斬
  slash.lineStyle(2, 0xffffff, 0.6);
  slash.beginPath();
  slash.moveTo(cx - 40, cy - 40);
  slash.lineTo(cx + 40, cy + 40);
  slash.strokePath();
  slash.beginPath();
  slash.moveTo(cx + 40, cy - 40);
  slash.lineTo(cx - 40, cy + 40);
  slash.strokePath();

  // 暗色中心剪影
  slash.fillStyle(0x1a0030, 0.8);
  slash.fillEllipse(cx, cy, 26, 34);

  // 中心白光
  slash.fillStyle(0xffffff, 0.9);
  slash.fillCircle(cx, cy, 7);

  scene.tweens.add({
    targets: slash, scaleX: 2.0, scaleY: 2.0, alpha: 0, duration: 400,
    ease: 'Quad.easeOut',
    onComplete: () => slash.destroy(),
  });
  scene.cameras.main.shake(200, 0.018);
}

// ── V: 暗影漩渦（增強版 — 旋轉魔法陣 + 衝擊波 + 發光能量球）──────────────
export function castVortex(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const cx = player.x, cy = player.y;
  const radius = 180;
  const hitSet = new Set();

  // ★ 相機衝擊波
  cameraShockwave(scene, cx, cy, 500);

  // ★ 畫面微白閃
  screenFlash(scene, 100, 0.2);

  // ★ 旋轉魔法陣
  const circle = scene.add.graphics();

  // 外圈
  circle.lineStyle(3, 0xaa44ff, 0.8);
  circle.strokeCircle(0, 0, radius);
  circle.lineStyle(2, 0x6622bb, 0.6);
  circle.strokeCircle(0, 0, radius * 0.6);

  // 8 條放射符文線（中心向外）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circle.lineStyle(1, 0x9933ff, 0.5);
    circle.beginPath();
    circle.moveTo(0, 0);
    circle.lineTo(Math.cos(a) * radius * 0.88, Math.sin(a) * radius * 0.88);
    circle.strokePath();
  }

  // 內部六角形符文
  circle.lineStyle(1, 0x5511aa, 0.45);
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
    const r2 = radius * 0.32;
    circle.beginPath();
    circle.moveTo(Math.cos(a1) * r2, Math.sin(a1) * r2);
    circle.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
    circle.strokePath();
  }

  circle.setPosition(cx, cy);
  circle.setDepth(45);

  // ★ 旋轉動畫（魔法陣持續旋轉）
  scene.tweens.add({
    targets: circle,
    angle: 360,
    duration: 1200,
    ease: 'Linear',
  });
  scene.tweens.add({
    targets: circle,
    alpha: 0,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 1200,
    ease: 'Cubic.easeIn',
    onComplete: () => circle.destroy(),
  });

  // ★ 能量環
  energyBurstRing(scene, cx, cy, 0x8833ff, radius);

  scene.cameras.main.shake(150, 0.01);

  // 8個能量球螺旋飛出
  for (let i = 0; i < 8; i++) {
    scene.time.delayedCall(i * 60, () => {
      if (!scene.sys.isActive()) return;
      const angle = (i / 8) * Math.PI * 2;
      const orb = scene.physics.add.sprite(cx, cy, 'skill-orb');
      orb.setDepth(46);
      orb.body.setAllowGravity(false);
      orb.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);

      // ★ 能量球發光
      flashGlow(scene, orb, 0.05, 600);

      // ★ 能量球拖尾
      spawnEnergyTrail(scene, orb, 0xaa44ff, 600);

      if (enemies && enemies.getChildren) {
        scene.physics.add.overlap(orb, enemies, (o, enemy) => {
          if (enemy.isDead || hitSet.has(enemy) || o._hit) return;
          hitSet.add(enemy);
          o._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.0);
          enemy.takeDamage(damage, isCrit);
          particles.spawnHit(scene, enemy.x, enemy.y, 0x8844ff);
          o.destroy();
        });
      }
      scene.time.delayedCall(700, () => { if (orb && orb.active) orb.destroy(); });
    });
  }
  particles.spawnVortex(scene, cx, cy);
}

// ── B: 影分身（增強版 — 發光光環 + 漸入漸出 + 能量粒子）───────────────────
export function castClone(scene, player, enemies) {
  audio.playSkill('B');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;

  const clone = scene.physics.add.sprite(
    player.x - dir * 60,
    player.y,
    'skill-clone'
  );
  clone.setDepth(15);
  clone.setAlpha(0);  // 漸入
  clone.setTint(0x8800ff);
  clone.setFlipX(player.flipX);

  // ★ 出場動畫：從透明漸入 + 放大效果
  scene.tweens.add({
    targets: clone,
    alpha: 0.7,
    scaleX: { from: 0.5, to: 1 },
    scaleY: { from: 0.5, to: 1 },
    duration: 300,
    ease: 'Back.easeOut',
  });

  // ★ 出場能量環
  energyBurstRing(scene, clone.x, clone.y, 0x6600cc, 50);

  // ★ 持續發光光環
  flashGlow(scene, clone, 0.04, 5000);

  // ★ 持續能量粒子（每秒噴發）
  let particleTimer = null;
  try {
    particleTimer = scene.time.addEvent({
      delay: 800,
      repeat: 5,
      callback: () => {
        if (!clone.active) return;
        const emitter = scene.add.particles(clone.x, clone.y, 'particle-dot', {
          speed: { min: 30, max: 80 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.8, end: 0 },
          lifespan: 400,
          quantity: 4,
          tint: 0x8800ff,
          blendMode: 'ADD',
        });
        emitter.setDepth(14);
        scene.time.delayedCall(500, () => { if (emitter.active) emitter.destroy(); });
      },
    });
  } catch (_) { /* 靜默 */ }

  // 分身自動攻擊
  const maxAttacks = 10;
  const attackInterval = scene.time.addEvent({
    delay: 500,
    repeat: maxAttacks - 1,
    callback: () => {
      if (!clone.active || !enemies) return;
      let nearest = null;
      let minDist = 350;
      if (enemies.getChildren) {
        enemies.getChildren().forEach(e => {
          if (e.isDead) return;
          const d = Phaser.Math.Distance.Between(clone.x, clone.y, e.x, e.y);
          if (d < minDist) { minDist = d; nearest = e; }
        });
      }
      if (nearest) {
        const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 0.8);
        nearest.takeDamage(damage, isCrit);
        particles.spawnHit(scene, nearest.x, nearest.y, 0x6600cc);
        // 移向目標
        const dx = nearest.x - clone.x;
        clone.setVelocityX(dx > 0 ? 150 : -150);
      } else {
        clone.setVelocityX(0);
      }
    },
  });

  // 5秒後消失
  scene.time.delayedCall(5000, () => {
    if (attackInterval) attackInterval.remove();
    if (particleTimer) particleTimer.remove();
    if (clone && clone.active) {
      // ★ 退場動畫：縮小 + 淡出
      scene.tweens.add({
        targets: clone,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 400,
        ease: 'Back.easeIn',
        onComplete: () => clone.destroy(),
      });
    }
  });

  return clone;
}

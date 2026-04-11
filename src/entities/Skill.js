// 技能效果實作
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';

// ── 共用：計算傷害 ──────────────────────────────────────────────────────────
function calcDamage(atk, critRate, critMulti, multiplier = 1) {
  const base = atk * multiplier * (0.85 + Math.random() * 0.3);
  const isCrit = Math.random() < critRate;
  return { damage: Math.floor(isCrit ? base * critMulti : base), isCrit };
}

// ── Z: 三連飛鏢 ─────────────────────────────────────────────────────────────
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

      // 碰撞偵測
      if (enemies && enemies.getChildren) {
        scene.physics.add.overlap(s, enemies, (shuriken, enemy) => {
          if (enemy.isDead || shuriken._hit) return;
          shuriken._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2);
          enemy.takeDamage(damage, isCrit);
          particles.spawnHit(scene, enemy.x, enemy.y, 0xaaaaff);
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

// ── X: 暗影步伐 ─────────────────────────────────────────────────────────────
export function castDash(scene, player, enemies) {
  audio.playSkill('X');
  const dir = player.facingRight ? 1 : -1;
  const dashDist = 350;
  const startX = player.x;

  player.isDashing = true;
  player.body.setAllowGravity(false);
  player.setVelocity(dir * 900, 0);

  // 殘影
  const trailInterval = scene.time.addEvent({
    delay: 30,
    repeat: 8,
    callback: () => particles.spawnDashTrail(scene, player.x, player.y),
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
  });
}

// ── C: 暗殺 ─────────────────────────────────────────────────────────────────
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

  // 能量爆發視覺（放射能量線：白/洋紅交替，配合規格「黑鳥放射能量」）
  const burst = scene.add.graphics();
  const cx = player.x, cy = player.y;

  // 暗色中心剪影（模擬黑鳥輪廓）
  burst.fillStyle(0x1a0030, 0.8);
  burst.fillEllipse(cx, cy, 26, 34);

  // 12 條鋒銳放射線（白色/洋紅交替）
  const lineCount = 12;
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const color = i % 2 === 0 ? 0xffffff : 0xFF48C4;
    const len = 55 + Math.floor(Math.random() * 55);
    burst.lineStyle(2.5, color, 1);
    burst.beginPath();
    burst.moveTo(cx, cy);
    burst.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    burst.strokePath();
  }

  // 中心白光
  burst.fillStyle(0xffffff, 0.9);
  burst.fillCircle(cx, cy, 7);
  burst.fillStyle(0xffeeff, 0.5);
  burst.fillCircle(cx, cy, 12);

  burst.setDepth(60);
  scene.tweens.add({
    targets: burst, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 450,
    onComplete: () => burst.destroy(),
  });
  scene.cameras.main.shake(200, 0.018);
}

// ── V: 暗影漩渦 ─────────────────────────────────────────────────────────────
export function castVortex(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const cx = player.x, cy = player.y;
  const radius = 180;
  const hitSet = new Set();

  // 魔法陣
  const circle = scene.add.graphics();
  circle.lineStyle(3, 0xaa44ff, 0.8);
  circle.strokeCircle(cx, cy, radius);
  circle.lineStyle(2, 0x6622bb, 0.6);
  circle.strokeCircle(cx, cy, radius * 0.6);

  // 8 條放射符文線（中心向外）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circle.lineStyle(1, 0x9933ff, 0.5);
    circle.beginPath();
    circle.moveTo(cx, cy);
    circle.lineTo(cx + Math.cos(a) * radius * 0.88, cy + Math.sin(a) * radius * 0.88);
    circle.strokePath();
  }

  // 內部六角形符文
  circle.lineStyle(1, 0x5511aa, 0.45);
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
    const r2 = radius * 0.32;
    circle.beginPath();
    circle.moveTo(cx + Math.cos(a1) * r2, cy + Math.sin(a1) * r2);
    circle.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
    circle.strokePath();
  }

  circle.setDepth(45);
  scene.cameras.main.shake(150, 0.01);
  scene.tweens.add({
    targets: circle, alpha: 0, duration: 1200,
    onComplete: () => circle.destroy(),
  });

  // 8個能量球螺旋飛出
  for (let i = 0; i < 8; i++) {
    scene.time.delayedCall(i * 60, () => {
      if (!scene.sys.isActive()) return;
      const angle = (i / 8) * Math.PI * 2;
      const orb = scene.physics.add.sprite(cx, cy, 'skill-orb');
      orb.setDepth(46);
      orb.body.setAllowGravity(false);
      orb.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);

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

// ── B: 影分身 ────────────────────────────────────────────────────────────────
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
  clone.setAlpha(0.7);
  clone.setTint(0x8800ff);
  clone.setFlipX(player.flipX);

  // 分身自動攻擊
  let attackCount = 0;
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
    if (clone && clone.active) {
      scene.tweens.add({
        targets: clone, alpha: 0, duration: 400,
        onComplete: () => clone.destroy(),
      });
    }
  });

  return clone;
}

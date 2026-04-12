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

// ── Z: 三連飛鏢（強化版 — 多層光效 + 衝擊閃光 + 軌跡光束）─────────────
export function castShuriken(scene, player, enemies) {
  audio.playSkill('Z');
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const shurikens = [];

  // ★ 發射瞬間：手部閃光
  energyBurstRing(scene, player.x + dir * 25, player.y - 5, 0x88DDFF, 30);

  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 80, () => {
      if (!scene || !scene.sys.isActive()) return;
      const s = scene.physics.add.sprite(
        player.x + dir * 20,
        player.y - 5 + (i - 1) * 12,
        'skill-shuriken'
      );
      s.setVelocityX(dir * 650);
      s.setVelocityY(-25 + (i - 1) * 25);
      s.setDepth(20);
      s.body.setAllowGravity(false);
      s.setFlipX(dir < 0);
      shurikens.push(s);

      // 旋轉動畫
      scene.tweens.add({ targets: s, angle: dir * 1080, duration: 600, ease: 'Linear' });

      // ★ 發光拖尾粒子（藍白色光束）
      spawnEnergyTrail(scene, s, 0x88CCFF, 550);

      // ★ 飛鏢本體發光
      flashGlow(scene, s, 0.05, 500);

      // 碰撞偵測
      if (enemies && enemies.getChildren) {
        scene.physics.add.overlap(s, enemies, (shuriken, enemy) => {
          if (enemy.isDead || shuriken._hit) return;
          shuriken._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.2);
          enemy.takeDamage(damage, isCrit);
          particles.spawnHit(scene, enemy.x, enemy.y, 0xAADDFF);

          // ★ 命中爆發光環
          energyBurstRing(scene, enemy.x, enemy.y, 0x66BBFF, 35);

          // ★ 暴擊時增加衝擊閃光 + 額外粒子
          if (isCrit) {
            screenFlash(scene, 80, 0.25);
            energyBurstRing(scene, enemy.x, enemy.y, 0xFFFFFF, 50);
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
  flashGlow(scene, player, 0.06, 400);

  // ★ 起始能量爆發
  energyBurstRing(scene, player.x, player.y, 0x8833FF, 45);

  // ★ 殘影（半透明的角色副本 + 拖尾粒子）
  const trailInterval = scene.time.addEvent({
    delay: 35,
    repeat: 7,
    callback: () => {
      if (!player.active) return;
      const ghost = scene.add.image(player.x, player.y, 'final_char');
      ghost.setDisplaySize(80, 80);
      ghost.setFlipX(!player.facingRight);
      ghost.setAlpha(0.55);
      ghost.setTint(0x8800ff);
      ghost.setDepth(15);
      scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: ghost.scaleX * 1.15,
        scaleY: ghost.scaleY * 1.15,
        duration: 280,
        onComplete: () => ghost.destroy(),
      });
      // 粒子拖尾
      particles.spawnDashTrail(scene, player.x, player.y);
    },
  });

  // ★ 衝刺路徑光帶（暗紫色長條光跡）
  spawnEnergyTrail(scene, player, 0xAA44FF, 280);

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
      // ★ 穿越命中光環
      energyBurstRing(scene, enemy.x, enemy.y, 0xBB55FF, 30);
    });
    scene.time.delayedCall(250, () => {
      scene.physics.world.removeCollider(overlapCheck);
    });
  }

  scene.time.delayedCall(250, () => {
    player.isDashing = false;
    player.body.setAllowGravity(true);
    player.setVelocityX(0);

    // ★ 衝刺結束能量環 + 微閃
    energyBurstRing(scene, player.x, player.y, 0x6600cc, 65);
    screenFlash(scene, 60, 0.15);
  });
}

// ── C: 暗殺（強化版 — 多層十字斬光 + 暗影爆裂 + 連鎖光效）────────────
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
  screenFlash(scene, 180, 0.5);

  // ★ 相機衝擊波
  cameraShockwave(scene, nearest.x, nearest.y, 400);

  // ★ 多層能量爆發環
  energyBurstRing(scene, nearest.x, nearest.y, 0xFFFFFF, 60);
  scene.time.delayedCall(50, () => {
    energyBurstRing(scene, nearest.x, nearest.y, 0xCC44FF, 100);
  });
  scene.time.delayedCall(100, () => {
    energyBurstRing(scene, nearest.x, nearest.y, 0x6600CC, 140);
  });

  const cx = nearest.x, cy = nearest.y;

  // ★ 多層十字斬光效（更華麗的分層效果）
  const slash = scene.add.graphics();
  slash.setDepth(60);

  // 外層紫色斬光（粗線）
  slash.lineStyle(6, 0x8822CC, 0.7);
  slash.beginPath(); slash.moveTo(cx - 80, cy); slash.lineTo(cx + 80, cy); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx, cy - 80); slash.lineTo(cx, cy + 80); slash.strokePath();

  // 中層白色斬光
  slash.lineStyle(3, 0xFFFFFF, 0.9);
  slash.beginPath(); slash.moveTo(cx - 70, cy); slash.lineTo(cx + 70, cy); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx, cy - 70); slash.lineTo(cx, cy + 70); slash.strokePath();

  // 對角線斬（紫色漸變）
  slash.lineStyle(4, 0xBB66FF, 0.7);
  slash.beginPath(); slash.moveTo(cx - 55, cy - 55); slash.lineTo(cx + 55, cy + 55); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx + 55, cy - 55); slash.lineTo(cx - 55, cy + 55); slash.strokePath();

  // 對角線白色內層
  slash.lineStyle(2, 0xFFFFFF, 0.5);
  slash.beginPath(); slash.moveTo(cx - 50, cy - 50); slash.lineTo(cx + 50, cy + 50); slash.strokePath();
  slash.beginPath(); slash.moveTo(cx + 50, cy - 50); slash.lineTo(cx - 50, cy + 50); slash.strokePath();

  // 中心暗影核心
  slash.fillStyle(0x1a0030, 0.9);
  slash.fillEllipse(cx, cy, 30, 38);

  // 中心白色光點
  slash.fillStyle(0xffffff, 1.0);
  slash.fillCircle(cx, cy, 8);
  slash.fillStyle(0xCC88FF, 0.6);
  slash.fillCircle(cx, cy, 14);

  scene.tweens.add({
    targets: slash, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 450,
    ease: 'Quad.easeOut',
    onComplete: () => slash.destroy(),
  });

  // ★ 暗影碎片（向外飛散的紫色光片）
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frag = scene.add.graphics();
    frag.setDepth(58);
    frag.fillStyle(0xCC66FF, 0.8);
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

  scene.cameras.main.shake(250, 0.022);
}

// ── V: 暗影漩渦（強化版 — 多層魔法陣 + 螺旋光帶 + 能量風暴）───────────
export function castVortex(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const cx = player.x, cy = player.y;
  const radius = 180;
  const hitSet = new Set();

  // ★ 相機衝擊波
  cameraShockwave(scene, cx, cy, 500);

  // ★ 畫面微白閃
  screenFlash(scene, 120, 0.25);

  // ★ 多層旋轉魔法陣
  const circle = scene.add.graphics();

  // 最外圈（淡紫光暈）
  circle.lineStyle(5, 0x7722CC, 0.3);
  circle.strokeCircle(0, 0, radius + 10);

  // 外圈
  circle.lineStyle(3, 0xAA44FF, 0.8);
  circle.strokeCircle(0, 0, radius);
  // 次外圈
  circle.lineStyle(2, 0x8833CC, 0.6);
  circle.strokeCircle(0, 0, radius * 0.75);
  // 內圈
  circle.lineStyle(2, 0x6622BB, 0.6);
  circle.strokeCircle(0, 0, radius * 0.45);

  // 12 條放射符文線（中心向外，交替顏色）
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const color = i % 2 === 0 ? 0x9933FF : 0xCC66FF;
    circle.lineStyle(1.5, color, 0.5);
    circle.beginPath();
    circle.moveTo(0, 0);
    circle.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
    circle.strokePath();
  }

  // 內部六角形符文（雙層）
  for (let layer = 0; layer < 2; layer++) {
    const r2 = radius * (layer === 0 ? 0.35 : 0.55);
    const rotOffset = layer * Math.PI / 6;
    circle.lineStyle(1.5, layer === 0 ? 0x7711CC : 0x5511AA, 0.5);
    for (let i = 0; i < 6; i++) {
      const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2 + rotOffset;
      const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2 + rotOffset;
      circle.beginPath();
      circle.moveTo(Math.cos(a1) * r2, Math.sin(a1) * r2);
      circle.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      circle.strokePath();
    }
  }

  // 中心光核
  circle.fillStyle(0xCC88FF, 0.3);
  circle.fillCircle(0, 0, 15);
  circle.fillStyle(0xFFFFFF, 0.5);
  circle.fillCircle(0, 0, 6);

  circle.setPosition(cx, cy);
  circle.setDepth(45);

  // ★ 旋轉動畫
  scene.tweens.add({
    targets: circle, angle: 360, duration: 1200, ease: 'Linear',
  });
  scene.tweens.add({
    targets: circle, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 1200,
    ease: 'Cubic.easeIn',
    onComplete: () => circle.destroy(),
  });

  // ★ 逆向旋轉的內層魔法陣
  const innerCircle = scene.add.graphics();
  innerCircle.lineStyle(2, 0xDD88FF, 0.5);
  innerCircle.strokeCircle(0, 0, radius * 0.5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    innerCircle.lineStyle(1, 0xEEAAFF, 0.4);
    innerCircle.beginPath();
    innerCircle.moveTo(0, 0);
    innerCircle.lineTo(Math.cos(a) * radius * 0.48, Math.sin(a) * radius * 0.48);
    innerCircle.strokePath();
  }
  innerCircle.setPosition(cx, cy);
  innerCircle.setDepth(44);
  scene.tweens.add({ targets: innerCircle, angle: -360, duration: 1000, ease: 'Linear' });
  scene.tweens.add({
    targets: innerCircle, alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 1000,
    ease: 'Cubic.easeIn',
    onComplete: () => innerCircle.destroy(),
  });

  // ★ 多層能量環
  energyBurstRing(scene, cx, cy, 0x8833FF, radius);
  scene.time.delayedCall(150, () => {
    energyBurstRing(scene, cx, cy, 0xCC66FF, radius * 0.6);
  });

  scene.cameras.main.shake(150, 0.012);

  // 10 個能量球螺旋飛出（增加數量和視覺效果）
  for (let i = 0; i < 10; i++) {
    scene.time.delayedCall(i * 50, () => {
      if (!scene.sys.isActive()) return;
      const angle = (i / 10) * Math.PI * 2;
      const orb = scene.physics.add.sprite(cx, cy, 'skill-orb');
      orb.setDepth(46);
      orb.body.setAllowGravity(false);
      orb.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
      orb.setScale(1.3);

      // ★ 能量球發光
      flashGlow(scene, orb, 0.06, 650);

      // ★ 能量球拖尾
      spawnEnergyTrail(scene, orb, 0xAA44FF, 650);

      if (enemies && enemies.getChildren) {
        scene.physics.add.overlap(orb, enemies, (o, enemy) => {
          if (enemy.isDead || hitSet.has(enemy) || o._hit) return;
          hitSet.add(enemy);
          o._hit = true;
          const { damage, isCrit } = calcDamage(gs.atk, gs.critRate, gs.critMulti, 1.0);
          enemy.takeDamage(damage, isCrit);
          particles.spawnHit(scene, enemy.x, enemy.y, 0x8844FF);
          energyBurstRing(scene, enemy.x, enemy.y, 0xBB66FF, 25);
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

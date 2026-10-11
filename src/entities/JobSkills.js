// 轉職後的技能與普通攻擊（刺客 / 俠盜）。數值見 docs/SKILLS_DESIGN.md；
// 共用的命中 / 特效小工具從 Skill.js 匯入，狀態效果的規則在 engine/statusEffects.js。
//
// 施放函式回傳 false 代表「沒有目標、沒有真的施放」，Player.castSkill 會把 MP / 冷卻退還。

import Phaser from 'phaser';
import { audio } from '../engine/audio.js';
import { spawnSlashWave, cameraShockwave, spawnLightRays } from '../engine/vfx.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import {
  skillDamageScale, effectiveCritMulti, effectiveCritRate, jobOf, jobPassive,
} from '../config/constants.js';
import { M } from '../config/skillModel.js';
import {
  calcDamage, getEntityEffectPoint, playFx, spawnImpactSpark, spawnShockCircle, spawnAfterimage,
  hitStop, findNearestEnemy, launchShuriken, resolveAssassinateWarpPoint,
} from './Skill.js';
import {
  setMark, clearMark, addPoison, tickPoison, POISON_TICK_MULT, MARK_DURATION_MS,
  pruneSmoke, SMOKE_DURATION_MS, SMOKE_RADIUS, SMOKE_TICK_MULT, STEAL_MP_REFUND, rollSteal, comboStep,
} from '../engine/statusEffects.js';

const alive = (e) => !!e && e.active && !e.isDead;

function floatText(scene, x, y, text, color = '#ffffff') {
  const t = scene.add.text(x, y, text, {
    fontSize: '15px', color, fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(90);
  scene.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  return t;
}

// 循環播放的特效動畫（持續型：印記、煙霧）；回傳 sprite，呼叫端負責 destroy
function loopFx(scene, key, x, y, opts = {}) {
  if (!scene.textures.exists(key)) return null;
  const animKey = `${key}_loop`;
  if (!scene.anims.exists(animKey)) {
    scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers(key), frameRate: opts.frameRate ?? 8, repeat: -1 });
  }
  const sp = scene.add.sprite(x, y, key).setDepth(opts.depth ?? 62).setScale(opts.scale ?? 1).setAlpha(opts.alpha ?? 1);
  if (opts.add !== false) sp.setBlendMode(Phaser.BlendModes.ADD);
  sp.play(animKey);
  return sp;
}

// 面前（朝 dir 方向）範圍內的敵人：回傳最近的一個
function nearestInFront(enemies, origin, dir, range, maxDy = 62) {
  let best = null;
  let bestAhead = Infinity;
  enemies?.getChildren?.().forEach((enemy) => {
    if (!alive(enemy)) return;
    const c = getEntityEffectPoint(enemy);
    const ahead = (c.x - origin.x) * dir;
    const reach = range + (enemy.body ? enemy.body.halfWidth : 20);
    if (ahead < -16 || ahead > reach || Math.abs(c.y - origin.y) > maxDy) return;
    if (ahead < bestAhead) { bestAhead = ahead; best = enemy; }
  });
  return best;
}

// 近戰揮砍判定：面前 range 內的所有敵人各吃一次傷害。回傳命中數
function meleeStrike(scene, player, enemies, o) {
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const origin = getEntityEffectPoint(player);
  const critRate = effectiveCritRate(gs, o.critBonus || 0);
  let hits = 0;
  let crit = false;
  enemies?.getChildren?.().forEach((enemy) => {
    if (!alive(enemy)) return;
    const c = getEntityEffectPoint(enemy);
    const reach = o.range + (enemy.body ? enemy.body.halfWidth : 20);
    const ahead = (c.x - origin.x) * dir;
    if (ahead < -16 || ahead > reach || Math.abs(c.y - origin.y) > 62) return;
    const { damage, isCrit } = calcDamage(gs.atk, critRate, effectiveCritMulti(gs), o.mult);
    enemy.takeDamage(damage, isCrit);
    if (o.knockup) enemy.applyKnockback?.(dir * 180, 260, o.knockup);
    else enemy.applyKnockback?.(dir * (isCrit ? 240 : 130), isCrit ? 200 : 110);
    spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xaaccff, isCrit ? 1.3 : 1);
    audio.playImpact(isCrit);
    hits++;
    crit = crit || isCrit;
  });
  if (hits > 0) {
    if (crit || o.knockup) hitStop(scene, o.knockup ? 70 : 45);
    scene.cameras.main.shake(crit || o.knockup ? 80 : 35, crit || o.knockup ? 0.009 : 0.003);
  }
  return hits;
}

function swingFx(scene, player, key, o = {}) {
  const dir = player.facingRight ? 1 : -1;
  const origin = getEntityEffectPoint(player);
  const fx = playFx(scene, key, origin.x + dir * (o.forward ?? 46), origin.y + (o.dy ?? -4), {
    scale: o.scale ?? 0.9, frameRate: o.frameRate ?? 30, flipX: dir < 0, rotation: (o.tilt ?? 0) * dir, normal: !!o.normal,
  });
  if (!fx) {
    spawnSlashWave(scene, origin.x, origin.y - 4, player.facingRight, { radius: 60, color: 0xe8f0ff, duration: 200, scale: 1.5 });
  }
}

const later = (scene, player, ms, fn) => scene.time.delayedCall(ms, () => {
  if (!scene.sys.isActive() || !player.active || player.isDead) return;
  fn();
});

// ── 雙刃連斬（刺客普通攻擊）：兩下、每下 0.55 倍、暴擊率 +10%（數值見 constants.js）────────
export function castTwinBlade(scene, player, enemies) {
  audio.playSkill('ATK');
  const basic = jobOf(player.gameState).basic;
  player._lockPose(player.pose('slash_1'), 70);
  later(scene, player, 70, () => player._lockPose(player.pose('slash_2'), 80));
  later(scene, player, 150, () => player._lockPose(player.pose('slash_3'), 110));
  [60, 140].forEach((delay, i) => later(scene, player, delay, () => {
    swingFx(scene, player, 'fx_slash_assassin', { tilt: i === 0 ? 0 : 0.35, dy: i === 0 ? -4 : -14, scale: 0.85 });
    meleeStrike(scene, player, enemies, { range: basic.range, mult: basic.damageMult, critBonus: basic.critBonus });
  }));
}

// ── 彎刀橫斬（俠盜普通攻擊）：範圍 120、1.2 倍；連打每第 3 下 1.6 倍並擊飛 ───────
export function castSabre(scene, player, enemies) {
  audio.playSkill('ATK');
  const basic = jobOf(player.gameState).basic;
  const combo = player._combo || (player._combo = { count: 0, last: 0 });
  const step = comboStep(combo, scene.time.now, basic.knockupEvery);
  const finisher = step === basic.knockupEvery;
  player._lockPose(player.pose('slash_1'), 80);
  later(scene, player, 80, () => player._lockPose(player.pose(finisher ? 'slash_alt' : 'slash_2'), 90));
  later(scene, player, 170, () => player._lockPose(player.pose('slash_3'), 130));
  later(scene, player, 80, () => {
    swingFx(scene, player, 'fx_slash_bandit', { scale: finisher ? 1.25 : 1.0, forward: 54, tilt: finisher ? -0.4 : 0, normal: true });
    meleeStrike(scene, player, enemies, {
      range: basic.range, mult: finisher ? basic.damageMult * basic.finisherMult : basic.damageMult,
      critBonus: basic.critBonus, knockup: finisher ? -430 : 0,
    });
  });
}

// ── 瞬影連刺（刺客）：瞬移到最近敵人背後連刺 3 下，每下 1.45 倍，背後攻擊必定暴擊 ─
export function castBackstab(scene, player, enemies) {
  const gs = player.gameState;
  const origin = getEntityEffectPoint(player);
  const target = findNearestEnemy(enemies, origin.x, origin.y, 420);
  if (!target) return false;
  audio.playSkill('C');

  // 在原位留下一道殘影，再瞬移到敵人身後
  spawnAfterimage(scene, player, { alpha: 0.6, duration: 380, tint: 0x4a2a80 });
  player.isDashing = false;
  player.body.setAllowGravity(true);
  player.setVelocity(0, 0);
  const behind = player.x <= target.x ? 1 : -1;
  const desiredX = Phaser.Math.Clamp(
    target.x + behind * Math.max(40, (target.body?.width ?? 40) / 2 + 24), 40, scene.physics.world.bounds.width - 40,
  );
  const warp = resolveAssassinateWarpPoint(scene, target, desiredX);
  player.setX(warp.x);
  if (typeof scene._alignDynamicEntityToPlatformTop === 'function') scene._alignDynamicEntityToPlatformTop(player, warp.topY);
  else player.setY(warp.topY);
  player.body.reset(player.x, player.y);
  player.dropThrough = false;
  player.facingRight = target.x >= player.x;
  player.setFlipX(!player.facingRight);

  player._lockPose(player.pose('crouch_low'), 90);
  later(scene, player, 90, () => player._lockPose(player.pose('backstab'), 420));

  const mult = M.BACKSTAB * skillDamageScale(gs.skillLevels.backstab);
  [120, 220, 320].forEach((delay, i) => later(scene, player, delay, () => {
    if (!alive(target)) return;
    const c = getEntityEffectPoint(target);
    const { damage } = calcDamage(gs.atk, 1, effectiveCritMulti(gs), mult);   // 背後 = 必暴擊
    target.takeDamage(damage, true);
    audio.playImpact(true);
    playFx(scene, 'fx_backstab', c.x + (i - 1) * 8, c.y - 4 + (i % 2) * 8, {
      scale: i === 2 ? 1.0 : 0.7, frameRate: 28, rotation: (i - 1) * 0.5,
    });
    spawnImpactSpark(scene, c.x, c.y, 0xd8b0ff, 1.1);
    scene.cameras.main.shake(i === 2 ? 110 : 50, i === 2 ? 0.012 : 0.006);
    if (i === 2) {
      hitStop(scene, 80);
      target.applyKnockback?.((player.facingRight ? 1 : -1) * 260, 220, -180);
    }
  }));
  return true;
}

// ── 蝕心毒鏢（刺客）：1.2 倍飛鏢，命中後中毒 6 秒（每秒 0.65 倍，最多 3 層）─────
export function applyPoison(scene, player, enemy) {
  if (!alive(enemy)) return;
  const gs = player.gameState;
  const perTick = Math.floor(gs.atk * POISON_TICK_MULT * skillDamageScale(gs.skillLevels.poison));
  const st = addPoison(enemy, perTick);
  const c = getEntityEffectPoint(enemy);
  playFx(scene, 'fx_poison', c.x, c.y - 6, { scale: 0.6, frameRate: 14, normal: true });
  floatText(scene, c.x, c.y - 30, `毒 x${st.stacks}`, '#8cff66');
  if (st.timer) return;   // 已有跳毒計時器：只刷新層數與持續時間
  st.timer = scene.time.addEvent({
    delay: 1000, loop: true,
    callback: () => {
      if (!enemy.active || enemy.isDead || !scene.sys.isActive()) { st.timer.remove(); st.timer = null; enemy._poison = null; return; }
      const dmg = tickPoison(st);
      if (dmg > 0) {
        enemy.takeDamage(dmg, false, { dot: true });
        if (!enemy.isDead) {
          const p = getEntityEffectPoint(enemy);
          playFx(scene, 'fx_poison', p.x, p.y - 4, { scale: 0.38, frameRate: 18, normal: true });
        }
      }
      if (st.ticksLeft <= 0) { st.timer.remove(); st.timer = null; enemy._poison = null; }
    },
  });
}

export function castPoison(scene, player, enemies) {
  audio.playSkill('Z');
  const dir = player.facingRight ? 1 : -1;
  player.playThrowAnimation?.(220);
  later(scene, player, 60, () => {
    const origin = getEntityEffectPoint(player);
    launchShuriken(scene, player, enemies, {
      x: player.x + dir * 24, y: origin.y - 6, vx: dir * 700, vy: 0,
      multiplier: M.POISON_DART, skillKey: 'poison', tint: 0x9dff6a, scale: 1.1,
      trailTint: [0xc8ff9a, 0x6edc3c, 0x2f8f1c],
      onHit: (enemy) => applyPoison(scene, player, enemy),
    });
  });
}

// ── 斷命印記（刺客）：標記最近敵人 7 秒，期間每次受擊（毒除外）必暴擊並 +20% 傷害 ───
export function castMark(scene, player, enemies) {
  const origin = getEntityEffectPoint(player);
  const target = findNearestEnemy(enemies, origin.x, origin.y, 460);
  if (!target) return false;
  audio.playSkill('V');
  player._lockPose(player.pose('cast'), 450);
  const c = getEntityEffectPoint(target);
  playFx(scene, 'fx_mark', c.x, c.y, { scale: 1.1, frameRate: 10 });
  spawnShockCircle(scene, c.x, c.y, { startRadius: 10, endRadius: 56, duration: 300, color: 0xff6a6a, alpha: 0.7, lineWidth: 2 });

  const mark = setMark(target, scene.time.now, MARK_DURATION_MS);
  // 印記圖示跟著敵人（一個 update 監聽，印記消失就移除）
  const icon = loopFx(scene, 'fx_mark', c.x, c.y - 50, { scale: 0.42, frameRate: 6, alpha: 0.95 });
  const follow = () => {
    if (!icon?.active || !target.active) return;
    const p = getEntityEffectPoint(target);
    icon.setPosition(p.x, (target.body ? target.body.top : p.y - 30) - 18);
  };
  scene.events.on('update', follow);
  const timer = scene.time.delayedCall(MARK_DURATION_MS, () => { if (target._mark === mark) clearMark(target, 'expired'); });
  // 第一擊演出「斷命」；之後每一擊只閃一下印記，避免多段攻擊洗版
  mark.onHit = (n) => {
    if (!target.active) return;
    const p = getEntityEffectPoint(target);
    if (n === 1) {
      playFx(scene, 'fx_mark', p.x, p.y, { scale: 1.4, frameRate: 24 });
      floatText(scene, p.x, p.y - 34, '斷命！', '#ff8a8a');
      spawnLightRays(scene, p.x, p.y, { count: 10, length: 90, color: 0xff6a6a, alpha: 0.5, duration: 280 });
    }
  };
  mark.onClear = () => {
    scene.events.off('update', follow);
    timer.remove();
    if (icon?.active) icon.destroy();
  };
  return true;
}

// ── 赤月迴旋（俠盜）：原地旋轉斬三圈，半徑 140 內全體每圈 1.2 倍，最後一圈擊退；每命中一隻回血 ──
const WHIRL_RADIUS = 140;
const WHIRL_HEAL_PER_HIT = 0.015;   // 每圈每隻回最大 HP 1.5%，單次施放最多 6%
export function castWhirl(scene, player, enemies) {
  audio.playSkill('V');
  const gs = player.gameState;
  const radius = WHIRL_RADIUS;
  player._lockPose(player.pose('spin_1'), 130);
  later(scene, player, 130, () => player._lockPose(player.pose('spin_2'), 150));
  later(scene, player, 280, () => player._lockPose(player.pose('spin_1'), 110));
  later(scene, player, 390, () => player._lockPose(player.pose('spin_2'), 150));
  const c0 = getEntityEffectPoint(player);
  playFx(scene, 'fx_whirl', c0.x, c0.y + 6, { scale: 1.5, frameRate: 16, normal: true });
  spawnShockCircle(scene, c0.x, c0.y, { startRadius: 20, endRadius: radius, duration: 360, color: 0xff9a5a, alpha: 0.7, lineWidth: 3 });
  let healed = 0;
  for (let n = 0; n < M.WHIRL_HITS; n++) {
    const last = n === M.WHIRL_HITS - 1;
    later(scene, player, 140 + n * 150, () => {
      const o = getEntityEffectPoint(player);
      let hits = 0;
      enemies?.getChildren?.().forEach((enemy) => {
        if (!alive(enemy)) return;
        const c = getEntityEffectPoint(enemy);
        if (Phaser.Math.Distance.Between(o.x, o.y, c.x, c.y) > radius + (enemy.body ? enemy.body.halfWidth : 0)) return;
        const { damage, isCrit } = calcDamage(gs.atk, effectiveCritRate(gs), effectiveCritMulti(gs), M.WHIRL * skillDamageScale(gs.skillLevels.whirl));
        enemy.takeDamage(damage, isCrit);
        enemy.applyKnockback?.((c.x >= o.x ? 1 : -1) * (last ? 320 : 90), 240, last ? -140 : 0);
        spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xffa070, 1.2);
        hits++;
      });
      audio.playImpact(hits > 0);
      if (hits > 0) {
        const heal = Math.min(0.06 - healed, hits * WHIRL_HEAL_PER_HIT);
        if (heal > 0 && gs.hp > 0) {
          healed += heal;
          const amt = Math.floor(gs.maxHp * heal);
          gs.hp = Math.min(gs.maxHp, gs.hp + amt);
          scene.registry.set('gameState', gs);
          scene.registry.events.emit('changedata-hp', null, gs.hp);
          floatText(scene, o.x, o.y - 50, `+${amt}`, '#7dff9a');
        }
        if (last) { hitStop(scene, 60); scene.cameras.main.shake(130, 0.012); cameraShockwave(scene, o.x, o.y, 300); }
      }
    });
  }
}

// ── 妙手空空（俠盜）：近戰兩連擊各 1.8 倍；命中回 10 MP、60% 多掉一份金幣、12% 偷到藥水 ───
export function castSteal(scene, player, enemies) {
  const gs = player.gameState;
  const dir = player.facingRight ? 1 : -1;
  const origin = getEntityEffectPoint(player);
  const target = nearestInFront(enemies, origin, dir, 130);
  if (!target) return false;
  audio.playSkill('ATK');
  player._lockPose(player.pose('slash_1'), 70);
  later(scene, player, 70, () => player._lockPose(player.pose('slash_2'), 160));
  for (let n = 0; n < M.STEAL_HITS; n++) {
    const last = n === M.STEAL_HITS - 1;
    later(scene, player, 70 + n * 110, () => {
      if (!alive(target)) return;
      const c = getEntityEffectPoint(target);
      swingFx(scene, player, 'fx_slash_bandit', { scale: 0.85, forward: 50, normal: true, tilt: n ? -0.3 : 0 });
      const { damage, isCrit } = calcDamage(gs.atk, effectiveCritRate(gs), effectiveCritMulti(gs), M.STEAL * skillDamageScale(gs.skillLevels.steal));
      target.takeDamage(damage, isCrit);
      target.applyKnockback?.(dir * 150, 120);
      spawnImpactSpark(scene, c.x, c.y, isCrit ? 0xffdd66 : 0xffcf70, 1.1);
      audio.playImpact(isCrit);
      if (!last) return;
      // 命中回 MP（讓妙手空空幾乎自給自足）
      gs.mp = Math.min(gs.maxMp, gs.mp + STEAL_MP_REFUND);
      scene.registry.events.emit('changedata-mp', null, gs.mp);
      const roll = rollSteal(Math.random(), Math.random());
      if (roll.meso && typeof target._spawnPickup === 'function') {
        const meso = Math.max(1, Math.floor((target.meso || 5) * (1 + Math.random()) * jobPassive(gs, 'mesoMult', 1)));
        target._spawnPickup('item-meso', meso, 'meso');
        floatText(scene, c.x, c.y - 34, '妙手！', '#ffe27a');
      }
      if (roll.potion && gs.potions) {
        const slot = Math.random() < 0.5 ? 'A' : 'D';
        gs.potions[slot] = (gs.potions[slot] || 0) + 1;
        scene.registry.set('gameState', gs);
        floatText(scene, c.x, c.y - 52, slot === 'A' ? '偷到 HP藥水！' : '偷到 MP藥水！', '#9ff0c8');
      }
    });
  }
  return true;
}

// ── 迷煙彈（俠盜）：落點 5 秒煙霧；範圍內敵人傷害 -50%、不再追擊 ───────────────
export function castSmoke(scene, player, enemies) {
  audio.playSkill('B');
  const dir = player.facingRight ? 1 : -1;
  const feetY = player.body ? player.body.bottom : player.y;
  const tx = Phaser.Math.Clamp(player.x + dir * 180, 60, scene.physics.world.bounds.width - 60);
  const ty = feetY - 36;
  player.playThrowAnimation?.(220);
  const origin = getEntityEffectPoint(player);
  const ball = scene.add.image(origin.x + dir * 20, origin.y - 10, VFX_TEX.SHURIKEN).setDepth(40).setScale(0.35).setTint(0x4a4a60);
  scene.tweens.add({ targets: ball, x: tx, y: ty, angle: 360, duration: 280, ease: 'Quad.easeIn', onComplete: () => ball.destroy() });

  scene.time.delayedCall(280, () => {
    if (!scene.sys.isActive() || !player.active) return;
    const zones = player.smokeZones || (player.smokeZones = []);
    pruneSmoke(zones, scene.time.now);
    const zone = { x: tx, y: ty, r: SMOKE_RADIUS, until: scene.time.now + SMOKE_DURATION_MS };
    zones.push(zone);
    // 煙霧內的敵人每秒受到持續傷害（不暴擊）；敵人移出範圍就不再受傷
    const gs = player.gameState;
    const ticks = Math.floor(SMOKE_DURATION_MS / 1000);
    scene.time.addEvent({
      delay: 1000, repeat: ticks - 1,
      callback: () => {
        if (!scene.sys.isActive()) return;
        const dmg = Math.max(1, Math.floor(gs.atk * SMOKE_TICK_MULT * skillDamageScale(gs.skillLevels.smoke)));
        enemies?.getChildren?.().forEach((enemy) => {
          if (!alive(enemy)) return;
          const c = getEntityEffectPoint(enemy);
          if (Phaser.Math.Distance.Between(tx, ty, c.x, c.y) > SMOKE_RADIUS) return;
          enemy.takeDamage(dmg, false, { dot: true });
        });
      },
    });
    spawnShockCircle(scene, tx, ty, { startRadius: 10, endRadius: SMOKE_RADIUS, duration: 400, color: 0xc8c8d8, alpha: 0.6, lineWidth: 3 });
    // 煙霧：用 fx_smoke 第一格（煙團）散布成一片；最後換第四格（消散）淡出。
    // 不直接循環整條動畫——第 2、3 格的煙圈橫跨格線，放大後會有明顯的方形接縫（素材待修）
    if (scene.textures.exists('fx_smoke')) {
      const puffs = [];
      for (let i = 0; i < 8; i++) {
        const px = tx + (Math.random() - 0.5) * SMOKE_RADIUS * 1.7;
        const py = ty + 6 + (Math.random() - 0.3) * 40;
        const puff = scene.add.image(px, py, 'fx_smoke', 0).setDepth(12).setTint(0xa0a0b8).setAlpha(0).setScale(0.3)
          .setFlipX(Math.random() < 0.5);
        const full = 0.95 + Math.random() * 0.6;
        scene.tweens.add({ targets: puff, scale: full, alpha: 0.72, duration: 380 + i * 30, ease: 'Quad.easeOut' });
        scene.tweens.add({ targets: puff, x: px + (Math.random() - 0.5) * 20, scale: full * 1.08, duration: 1800, yoyo: true, repeat: -1, delay: 500, ease: 'Sine.easeInOut' });
        puffs.push(puff);
      }
      scene.time.delayedCall(SMOKE_DURATION_MS - 700, () => {
        for (const puff of puffs) {
          if (!puff.active) continue;
          scene.tweens.killTweensOf(puff);
          puff.setFrame(3);
          scene.tweens.add({ targets: puff, alpha: 0, duration: 700, onComplete: () => puff.destroy() });
        }
      });
    }
  });
}

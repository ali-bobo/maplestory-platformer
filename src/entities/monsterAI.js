// 怪物特殊攻擊引擎：每隻怪一個 MonsterBrain，負責「選招 → 前搖（預警）→ 出招 → 收招」。
// 招式清單來自 config/monsterAttacks.js；選招 / 冷卻 / 傷害等純邏輯在 engine/aiLogic.js。
//
// 效能規則：
//  - 全程用時間累加（stage / t）推進，不建立 tween 與 timer；預警圖形是每隻怪各一份、重複使用的 Image
//  - 投射物與衝擊波集中在每個場景一個固定容量的 ProjectilePool（不用 physics collider）
//  - 紋理只在第一次用到時建立一次（ensureAiTextures）

import Phaser from 'phaser';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { SMOKE_DAMAGE_FACTOR } from '../engine/statusEffects.js';
import { getVisualTopY } from '../config/alignment.js';
import { getAttackProfile } from '../config/monsterAttacks.js';
import { playFx } from './Skill.js';
import {
  pickAttack, cooldownFor, attackDamage, phaseIndexFor, inGroundBlast, circleHitsRect,
  leapVelocity, leapVx,
} from '../engine/aiLogic.js';

export const ST_IDLE = 0, ST_WINDUP = 1, ST_EXEC = 2, ST_RECOVER = 3, ST_POP = 4, ST_ROAR = 5;

const TEX = { EXCL: 'ai_excl', RING: 'ai_ring', DISC: 'ai_disc', ARROW: 'ai_arrow', SHARD: 'ai_shard', WAVE: 'ai_wave' };
const DEG = Math.PI / 180;
const POOL_CAP = 32;
const WARN_TINT = 0xff5a3a;

// 除錯統計（e2e 用）：?debug=1 時掛在 window.__aiStats
export const aiStats = { started: {}, hit: {}, fired: 0, maxActive: 0 };
if (typeof window !== 'undefined' && typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)) {
  window.__aiStats = aiStats;
}
function bump(map, key) { map[key] = (map[key] || 0) + 1; }

// 投射物外觀：tex / 縮放 / 混合模式 / 判定半徑 / 是否依速度轉向 / 是否自旋
const KINDS = {
  orb:    { tex: 'skill-orb', scale: 1.3, add: true, r: 9 },
  bolt:   { tex: 'skill-orb', scale: 1.1, add: true, r: 8 },
  fire:   { tex: 'skill-orb', scale: 1.7, add: true, r: 11 },
  cannon: { tex: 'skill-orb', scale: 2.1, add: false, r: 14 },
  spit:   { tex: 'skill-orb', scale: 1.4, add: false, r: 10 },
  ice:    { tex: TEX.SHARD, scale: 1, add: false, r: 9, rot: true },
  arrow:  { tex: TEX.ARROW, scale: 1, add: false, r: 7, rot: true },
  bone:   { tex: TEX.ARROW, scale: 1, add: false, r: 8, spin: true },
};

export function ensureAiTextures(scene) {
  const tex = scene.textures;
  if (tex.exists(TEX.EXCL)) return;
  const g = scene.add.graphics();
  // 驚嘆號（黃底黑框，固定色）
  g.fillStyle(0x000000, 1); g.fillRoundedRect(3, 0, 14, 24, 4); g.fillCircle(10, 30, 5);
  g.fillStyle(0xffd633, 1); g.fillRoundedRect(6, 3, 8, 18, 3); g.fillCircle(10, 30, 3);
  g.generateTexture(TEX.EXCL, 20, 36); g.clear();
  // 圓環 / 圓盤（白色，靠 tint 上色）
  g.lineStyle(5, 0xffffff, 1); g.strokeCircle(64, 64, 58);
  g.generateTexture(TEX.RING, 128, 128); g.clear();
  g.fillStyle(0xffffff, 0.55); g.fillCircle(64, 64, 62);
  g.fillStyle(0xffffff, 0.45); g.fillCircle(64, 64, 40);
  g.generateTexture(TEX.DISC, 128, 128); g.clear();
  // 箭 / 冰錐
  g.fillStyle(0xffffff, 1); g.fillRect(0, 3, 16, 2); g.fillTriangle(16, 0, 24, 4, 16, 8);
  g.generateTexture(TEX.ARROW, 24, 8); g.clear();
  g.fillStyle(0xffffff, 1); g.fillTriangle(0, 6, 12, 0, 12, 12); g.fillTriangle(12, 0, 12, 12, 30, 6);
  g.generateTexture(TEX.SHARD, 30, 12); g.clear();
  // 地面衝擊波（三層半橢圓，底部貼齊）
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(24, 28, 48, 56);
  g.fillStyle(0xffffff, 0.6); g.fillEllipse(24, 28, 34, 40);
  g.fillStyle(0xffffff, 0.95); g.fillEllipse(24, 28, 18, 22);
  g.generateTexture(TEX.WAVE, 48, 28); g.clear();
  g.destroy();
}

// ── 投射物 / 衝擊波池 ───────────────────────────────────────────────────────
class Slot {
  constructor() {
    this.img = null; this.active = false; this.wave = false; this.kind = null;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.g = 0; this.life = 0;
    this.dmg = 0; this.r = 8; this.w = 0; this.h = 0; this.feetY = 0;
  }
}

export class ProjectilePool {
  constructor(scene) {
    this.scene = scene;
    this.slots = [];
    for (let i = 0; i < POOL_CAP; i++) this.slots.push(new Slot());
    this.active = 0;
    this._onUpdate = (time, delta) => this.update(delta);
    scene.events.on('update', this._onUpdate);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  _free() {
    for (let i = 0; i < POOL_CAP; i++) if (!this.slots[i].active) return this.slots[i];
    return null;
  }

  _image(s, tex) {
    if (!s.img) s.img = this.scene.add.image(0, 0, tex).setDepth(15);
    else s.img.setTexture(tex);
    return s.img;
  }

  fire(kind, x, y, vx, vy, grav, life, dmg, tint, scale) {
    const s = this._free();
    if (!s) return false;
    const k = KINDS[kind] || KINDS.orb;
    s.active = true; s.wave = false; s.kind = k;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.g = grav; s.life = life; s.dmg = dmg; s.r = k.r * (scale || 1);
    const img = this._image(s, k.tex);
    img.setVisible(true).setPosition(x, y).setScale(k.scale * (scale || 1)).setAlpha(1).setRotation(0)
      .setBlendMode(k.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setOrigin(0.5, 0.5).setFlipX(false);
    if (tint != null) img.setTint(tint); else img.clearTint();
    this.active++;
    aiStats.fired++;
    if (this.active > aiStats.maxActive) aiStats.maxActive = this.active;
    return true;
  }

  // 沿地面前進的衝擊波：玩家要跳起來躲
  wave(x, footY, dir, speed, len, dmg, tint) {
    const s = this._free();
    if (!s) return false;
    s.active = true; s.wave = true; s.kind = null;
    s.x = x; s.y = footY; s.feetY = footY; s.vx = dir * speed; s.vy = 0; s.g = 0;
    s.life = (len / speed) * 1000; s.dmg = dmg; s.w = 38; s.h = 26;
    const img = this._image(s, TEX.WAVE);
    img.setVisible(true).setOrigin(0.5, 1).setPosition(x, footY).setScale(1).setAlpha(1).setRotation(0)
      .setBlendMode(Phaser.BlendModes.ADD).setFlipX(dir < 0).setTint(tint);
    this.active++;
    if (this.active > aiStats.maxActive) aiStats.maxActive = this.active;
    return true;
  }

  _kill(s) {
    s.active = false;
    if (s.img) s.img.setVisible(false);
    this.active--;
  }

  clear() {
    for (let i = 0; i < POOL_CAP; i++) if (this.slots[i].active) this._kill(this.slots[i]);
  }

  update(delta) {
    if (this.active <= 0) return;
    const dt = Math.min(delta, 50) / 1000;
    const player = this.scene.player;
    const pb = player && player.active && !player.isDead ? player.body : null;
    const worldW = this.scene.physics?.world?.bounds?.width ?? 3000;
    for (let i = 0; i < POOL_CAP; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.life -= dt * 1000;
      if (s.life <= 0) { this._kill(s); continue; }
      if (s.g) s.vy += s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y > 700 || s.x < -80 || s.x > worldW + 80) { this._kill(s); continue; }
      const img = s.img;
      img.setPosition(s.x, s.y);
      if (s.wave) {
        img.setAlpha(Math.min(1, s.life / 250));
      } else if (s.kind.rot) {
        img.setRotation(Math.atan2(s.vy, s.vx));
      } else if (s.kind.spin) {
        img.setRotation(img.rotation + dt * 14);
      }
      if (!pb || player.isInvincible) continue;
      let hit;
      if (s.wave) {
        hit = Math.abs(pb.center.x - s.x) < pb.halfWidth + s.w / 2 && pb.bottom > s.feetY - s.h + 4 && pb.top < s.feetY;
      } else {
        hit = circleHitsRect(s.x, s.y, s.r, pb.center.x, pb.center.y, pb.halfWidth, pb.halfHeight);
      }
      if (hit) {
        player.takeDamage(s.dmg);
        bump(aiStats.hit, s.wave ? 'wave' : 'projectile');
        this._kill(s);
      }
    }
  }

  destroy() {
    if (this._dead) return;
    this._dead = true;
    this.scene.events.off('update', this._onUpdate);
    this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this);
    for (const s of this.slots) { if (s.img) { s.img.destroy(); s.img = null; } s.active = false; }
    this.active = 0;
    if (this.scene._aiPool === this) this.scene._aiPool = null;
  }
}

export function getProjectilePool(scene) {
  if (!scene._aiPool || scene._aiPool._dead) {
    ensureAiTextures(scene);
    scene._aiPool = new ProjectilePool(scene);
  }
  return scene._aiPool;
}

// 沒有任何「能打到不同層」招式的怪，補一個只在追不到時使用的撲擊
const IMPLICIT_LEAP = Object.freeze({
  type: 'leap', windup: 450, exec: 0, recover: 550, cd: 4500, min: 40, max: 460, dmg: 1.0, radius: 70,
  grounded: true, vert: true, weight: 1, fallbackOnly: true, implicit: true,
});
const VERT_TYPES = { shoot: 1, dive: 1, leap: 1, rain: 1, burst: 1 };
const withLeapCache = new Map();
function withFallback(list) {
  let out = withLeapCache.get(list);
  if (out) return out;
  out = list.some((a) => VERT_TYPES[a.type]) ? list : list.concat([IMPLICIT_LEAP]);
  withLeapCache.set(list, out);
  return out;
}

// ── 大腦 ────────────────────────────────────────────────────────────────────
export class MonsterBrain {
  constructor(owner) {
    this.m = owner;
    this.profile = getAttackProfile(owner.config);
    this.phaseIdx = 0;
    this.attacks = withFallback(this.profile.attacks);
    let maxN = this.attacks.length;
    for (const ph of this.profile.phases) maxN = Math.max(maxN, withFallback(ph.attacks).length);
    this.cds = new Float32Array(maxN);
    for (let i = 0; i < this.attacks.length; i++) this.cds[i] = this.attacks[i].cd * (0.2 + Math.random() * 0.5);
    this.cdMult = 1; this.dmgMult = 1; this.speedMult = 1;
    this.gcd = 800 + Math.random() * 800;
    this.stage = ST_IDLE; this.cur = -1; this.def = null; this.t = 0;
    this.dir = 1; this.aimX = 0; this.aimY = 0; this.aimFeet = 0; this.hit = false; this.pulse = -1;
    this.chainLeft = 0; this.bx = 0; this.footY = 0; this.roarMs = 0; this.openIdx = -1;
    this.rainX = new Float32Array(8);
    this.minions = [];
    this._excl = null; this._ring = null; this._disc = null; this._bar = null; this._marks = null;
    this.superArmor = owner.config.spawnRole === 'miniboss' || owner.config.id === 'boss';
  }

  get busy() { return this.stage !== ST_IDLE; }
  get uninterruptible() { return this.stage === ST_EXEC || this.stage === ST_POP || this.stage === ST_ROAR; }

  tickCd(delta) {
    this.gcd = Math.max(0, this.gcd - delta);
    const n = this.attacks.length;
    for (let i = 0; i < n; i++) if (this.cds[i] > 0) this.cds[i] = Math.max(0, this.cds[i] - delta);
  }

  // ── 選招 ──
  tryStart(player, dist, dyAbs, grounded, vertical) {
    if (this.stage !== ST_IDLE || this.gcd > 0 || this.m.isDead) return false;
    const idx = pickAttack(this.attacks, this.attacks.length, this.cds, dist, dyAbs, grounded, vertical, Math.random());
    if (idx < 0) return false;
    this._startAttack(idx, player);
    return true;
  }

  // ── 預警圖形 ──
  _img(name, tex, depth) {
    if (!this[name]) {
      this[name] = this.m.scene.add.image(0, 0, tex).setDepth(depth).setVisible(false);
    }
    return this[name];
  }

  _hideTelegraphs() {
    if (this._excl) this._excl.setVisible(false);
    if (this._ring) this._ring.setVisible(false);
    if (this._disc) this._disc.setVisible(false);
    if (this._bar) this._bar.setVisible(false);
    if (this._marks) for (const mk of this._marks) mk.setVisible(false);
  }

  _showExcl() {
    ensureAiTextures(this.m.scene);
    this._img('_excl', TEX.EXCL, 40).setVisible(true).setAlpha(1);
    this._followExcl(0);
  }

  _followExcl() {
    if (!this._excl || !this._excl.visible) return;
    const m = this.m;
    this._excl.setPosition(m.x, getVisualTopY(m) - 22 + Math.sin(m.scene.time.now / 70) * 2);
  }

  _ringAt(x, y, radius, alpha, flat, tint) {
    const r = this._img('_ring', TEX.RING, 13);
    r.setVisible(true).setPosition(x, y).setTint(tint).setAlpha(alpha);
    const s = (radius * 2) / 116;
    r.setScale(s, flat ? s * 0.3 : s);
  }

  _discAt(x, y, radius, alpha, flat, tint) {
    const d = this._img('_disc', TEX.DISC, 12);
    d.setVisible(true).setPosition(x, y).setTint(tint).setAlpha(alpha);
    const s = (radius * 2) / 128;
    d.setScale(s, flat ? s * 0.3 : s);
  }

  // ── 出招流程 ──
  _startAttack(idx, player) {
    const def = this.attacks[idx];
    const m = this.m;
    ensureAiTextures(m.scene);
    this.cur = idx; this.def = def; this.stage = ST_WINDUP; this.t = 0; this.hit = false; this.pulse = -1;
    this.cds[idx] = cooldownFor(def, this.cdMult, Math.random());
    bump(aiStats.started, def.type);
    m.setVelocityX(0);
    this._aimAt(player);
    this.footY = m.body.bottom;
    if (def.type === 'dive') { m.body.setAllowGravity(false); m.setVelocityY(-110); }
    else if (def.type === 'rain') this._planRain(player);
    this._showExcl();
  }

  _aimAt(player) {
    this.aimX = player.x; this.aimY = player.body.center.y; this.aimFeet = player.body.bottom;
    this.dir = player.x >= this.m.x ? 1 : -1;
    this.m.setFlipX(this.dir < 0);
  }

  _planRain(player) {
    const def = this.def;
    const n = Math.min(8, def.count);
    this.rainX[0] = player.x;
    for (let i = 1; i < n; i++) this.rainX[i] = player.x + (Math.random() - 0.5) * def.spread;
    if (!this._marks) this._marks = [];
    while (this._marks.length < n) this._marks.push(this.m.scene.add.image(0, 0, TEX.RING).setDepth(13).setVisible(false));
  }

  tick(delta, player) {
    const dt = Math.min(delta, 50);
    this.t += dt;
    switch (this.stage) {
      case ST_WINDUP: this._tickWindup(player); break;
      case ST_EXEC: this._tickExec(dt, player); break;
      case ST_POP: this._tickPop(player); break;
      case ST_RECOVER: this._tickRecover(); break;
      case ST_ROAR: this._tickRoar(player); break;
      default: break;
    }
    this._followExcl();
  }

  _pulseTint() {
    const ph = (this.t / 90) | 0;
    if (ph === this.pulse) return;
    this.pulse = ph;
    if (ph & 1) this.m.setTint(WARN_TINT); else this.m._restoreTint();
  }

  _tickWindup(player) {
    const def = this.def, m = this.m;
    const p = Math.min(1, this.t / def.windup);
    if (p < 0.7) this._aimAt(player);
    this._pulseTint();
    m.setVelocityX(0);
    switch (def.type) {
      case 'charge': {
        const len = m.speed * this.speedMult * def.speedMult * def.exec / 1000;
        const b = this._img('_bar', VFX_TEX.WHITE_PX, 12);
        b.setVisible(true).setOrigin(this.dir > 0 ? 0 : 1, 0.5).setTint(0xff3322).setAlpha(0.2 + 0.4 * p)
          .setPosition(m.x, this.footY - 6).setDisplaySize(len, 10);
        break;
      }
      case 'slam': this._ringAt(this.aimX, this.footY - 4, def.radius, 0.35 + 0.5 * p, true, 0xff7733); break;
      case 'pound': {
        this._ringAt(m.x, this.footY - 4, def.radius, 0.9, true, 0xff3322);
        this._discAt(m.x, this.footY - 4, def.radius * p, 0.55, true, 0xff3322);
        break;
      }
      case 'summon': this._ringAt(m.x, this.footY - 4, 70 + 20 * p, 0.8, true, 0xc070ff); break;
      case 'shoot': case 'kite': case 'burst':
        this._discAt(m.x + this.dir * 14, m.body.center.y - 6, 10 + 22 * p, 0.55 + 0.4 * p, false, def.tint ?? 0xffe9a0);
        break;
      case 'dive': m.setVelocityX(0); if (p > 0.7) m.setVelocityY(0); break;
      case 'rain': {
        const n = Math.min(8, def.count);
        for (let i = 0; i < n; i++) {
          const mk = this._marks[i];
          const s = 70 / 116;
          mk.setVisible(true).setPosition(this.rainX[i], this.aimFeet - 4).setTint(0xff4422).setAlpha(0.3 + 0.6 * p).setScale(s, s * 0.3);
        }
        break;
      }
      default: break;
    }
    if (this.t >= def.windup) this._enterExec(player);
  }

  _enterExec(player) {
    const def = this.def, m = this.m;
    this.stage = ST_EXEC; this.t = 0;
    m._restoreTint(); this.pulse = -1;
    if (this._excl) this._excl.setVisible(false);
    if (this._bar) this._bar.setVisible(false);
    if (this._disc) this._disc.setVisible(false);
    if (m.onAttackStart) m.onAttackStart(def);
    switch (def.type) {
      case 'charge': this.hit = false; break;
      case 'slam': {
        const vy = -540;
        m.setVelocity(leapVx(this.aimX - m.x, vy, 380), vy);
        break;
      }
      case 'pound':
        this._blast(m.x, this.footY, def.radius, def.hMax, def.dmg, player, 0xff5533);
        this._toRecover();
        break;
      case 'shoot': this._fireShots(def, player); this._toRecover(); break;
      case 'kite':
        m.setVelocity(-this.dir * def.hopVx, -def.hopVy);
        break;
      case 'burrow': this._goUnderground(def.chain); break;
      case 'dive': {
        const c = m.body.center;
        let dx = this.aimX - c.x, dy = this.aimY - c.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        m.setVelocity(dx / d * def.speed, dy / d * def.speed);
        this.dx0 = dx; this.dy0 = dy;
        break;
      }
      case 'summon': this._doSummon(def); this._toRecover(); break;
      case 'leap': {
        const rise = m.body.bottom - this.aimFeet;
        const vy = leapVelocity(rise, 740, 420);
        m.setVelocity(leapVx(this.aimX - m.x, vy, 340), vy);
        break;
      }
      case 'rain': this._fireRain(def, player); this._toRecover(); break;
      case 'burst': this._fireBurst(def); this._toRecover(); break;
      default: this._toRecover(); break;
    }
  }

  _toRecover() {
    this.stage = ST_RECOVER; this.t = 0;
    this.m.setVelocityX(0);
  }

  _tickExec(dt, player) {
    const def = this.def, m = this.m;
    switch (def.type) {
      case 'charge': {
        const v = this.dir * m.speed * this.speedMult * def.speedMult;
        m.setVelocityX(v);
        // 不衝出平台邊緣（沒有平台資訊時只受牆壁 / 時間限制）
        let stop = this.t >= def.exec || m.body.blocked.left || m.body.blocked.right;
        if (!stop && m.edgeAhead(this.dir, 8 + Math.abs(v) * 0.04)) stop = true;
        if (!this.hit && player && !player.isDead) {
          const pb = player.body;
          if (Math.abs(pb.center.x - m.x) < pb.halfWidth + m.body.halfWidth + 6 && Math.abs(pb.center.y - m.body.center.y) < pb.halfHeight + m.body.halfHeight) {
            this.hit = true;
            this._hurt(player, def.dmg, 'charge');
          }
        }
        if (stop) this._toRecover();
        break;
      }
      case 'slam':
        if ((this.t > 220 && m.body.blocked.down) || this.t > 2200) {
          this._blast(m.x, m.body.bottom, def.radius, 60, def.dmg, player, 0xff7733);
          const dmg = this._projDamage(def.waveDmg);
          const pool = getProjectilePool(m.scene);
          pool.wave(m.x, m.body.bottom, 1, def.waveSpeed, def.waveLen, dmg, 0xffaa55);
          pool.wave(m.x, m.body.bottom, -1, def.waveSpeed, def.waveLen, dmg, 0xffaa55);
          this._toRecover();
        }
        break;
      case 'kite':
        if ((this.t > 220 && m.body.blocked.down) || this.t > 1000) {
          m.setVelocityX(0);
          this._aimAt(player);
          this._fireShots(def, player);
          this._toRecover();
        }
        break;
      case 'burrow': {
        // 地底移動：朝玩家 x 滑行（限制在目前平台內）
        const dir = this.aimX >= this.bx ? 1 : -1;
        this.aimX = player.x;
        if (Math.abs(this.aimX - this.bx) > 6) this.bx += dir * 240 * dt / 1000;
        this.bx = m.clampToPlatform(this.bx);
        m.x = this.bx;
        if (this.t >= def.exec) {
          this.stage = ST_POP; this.t = 0;
        }
        break;
      }
      case 'dive': {
        const c = m.body.center;
        const passed = (this.aimX - c.x) * this.dx0 + (this.aimY - c.y) * this.dy0 <= 0;
        if (!this.hit && player && !player.isDead) {
          const pb = player.body;
          if (circleHitsRect(c.x, c.y, 26, pb.center.x, pb.center.y, pb.halfWidth, pb.halfHeight)) {
            this.hit = true;
            this._hurt(player, def.dmg, 'dive');
          }
        }
        if (this.t >= def.exec || passed || (this.t > 160 && (m.body.blocked.down || m.body.blocked.left || m.body.blocked.right || m.body.blocked.up))) {
          m.body.setAllowGravity(true);
          m.setVelocity(m.body.velocity.x * 0.3, Math.min(0, m.body.velocity.y) * 0.3);
          this._toRecover();
        }
        break;
      }
      case 'leap':
        if (!this.hit && player && !player.isDead && this.t > 120) {
          const pb = player.body;
          if (circleHitsRect(m.body.center.x, m.body.center.y, 30, pb.center.x, pb.center.y, pb.halfWidth, pb.halfHeight)) {
            this.hit = true;
            this._hurt(player, def.dmg * 0.8, 'leap');
          }
        }
        if ((this.t > 220 && m.body.blocked.down) || this.t > 2200) {
          if (!this.hit) this._blast(m.x, m.body.bottom, def.radius, 50, def.dmg * 0.7, player, 0xcc9966);
          else playFx(m.scene, 'fx_smoke', m.x, m.body.bottom - 14, { scale: 0.7, normal: true, depth: 14 });
          this._toRecover();
        }
        break;
      default: this._toRecover(); break;
    }
  }

  _tickPop(player) {
    const def = this.def, m = this.m;
    const p = Math.min(1, this.t / def.pop);
    if (this.t < def.pop - 350) {
      this.bx = m.clampToPlatform(this.bx + Math.max(-5, Math.min(5, player.x - this.bx)));
      m.x = this.bx;
    }
    this._ringAt(this.bx, this.footY - 4, def.radius * (1.1 - 0.2 * p), 0.4 + 0.5 * p, true, 0xe0a050);
    this._discAt(this.bx, this.footY - 4, def.radius * p, 0.5, true, 0xe0a050);
    if (this.t >= def.pop) this._erupt(player);
  }

  _goUnderground(chain) {
    const m = this.m;
    this.chainLeft = chain;
    this.bx = m.x; this.footY = m.body.bottom;
    this.aimX = this.bx;
    playFx(m.scene, 'fx_smoke', m.x, this.footY - 12, { scale: 0.8, normal: true, depth: 14 });
    m.setUnderground(true);
    this.stage = ST_EXEC; this.t = 0;
  }

  _erupt(player) {
    const def = this.def, m = this.m;
    m.setUnderground(false);
    m.setPosition(this.bx, this.footY);
    m.body.reset(this.bx, this.footY);
    m.setVelocityY(-260);
    this._blast(this.bx, this.footY, def.radius, 60, def.dmg, player, 0xc89040);
    if (this._disc) this._disc.setVisible(false);
    if (this.chainLeft > 0) {
      this.chainLeft--;
      this._goUnderground(this.chainLeft);
      return;
    }
    this._toRecover();
  }

  _tickRecover() {
    const def = this.def;
    const p = this.t / Math.max(1, def.recover);
    if (this._ring && this._ring.visible) this._ring.setAlpha(Math.max(0, 0.9 * (1 - p)));
    if (this._marks) for (const mk of this._marks) if (mk.visible) mk.setAlpha(Math.max(0, 0.8 * (1 - p)));
    if (this.t >= def.recover) this._endAttack(500 + Math.random() * 600);
  }

  _tickRoar(player) {
    const m = this.m;
    m.setVelocityX(0);
    this.pulse = -1;
    const ph = (this.t / 120) | 0;
    if (ph !== this.pulse2) { this.pulse2 = ph; if (ph & 1) m.setTint(0xffffff); else m._restoreTint(); }
    if (this.t >= this.roarMs) {
      m._restoreTint();
      this._endAttack(300);
      if (this.openIdx >= 0 && player && !m.isDead) {
        const idx = this.openIdx; this.openIdx = -1;
        this.gcd = 0;
        this._startAttack(idx, player);
      }
    }
  }

  _endAttack(gcd) {
    const m = this.m;
    this.stage = ST_IDLE; this.cur = -1; this.def = null; this.t = 0;
    this.gcd = gcd;
    this._hideTelegraphs();
    m._restoreTint();
    if (m.body) m.body.setAllowGravity(true);
    m.setUnderground(false);
  }

  // 前搖中被打到：中斷（超級護甲的怪不會被打斷）
  interrupt() {
    if (this.stage !== ST_WINDUP) return;
    this._endAttack(900);
  }

  cleanup() {
    this.stage = ST_IDLE;
    this._hideTelegraphs();
    for (const k of ['_excl', '_ring', '_disc', '_bar']) {
      if (this[k]) { this[k].destroy(); this[k] = null; }
    }
    if (this._marks) { for (const mk of this._marks) mk.destroy(); this._marks = null; }
  }

  // ── 階段（守衛 / Boss）──
  checkPhase(hpRatio) {
    const idx = phaseIndexFor(hpRatio, this.profile.phases);
    if (idx <= this.phaseIdx) return false;
    this.phaseIdx = idx;
    const ph = this.profile.phases[idx - 1];
    const m = this.m;
    if (this.stage === ST_EXEC && this.def && this.def.type === 'burrow') m.setUnderground(false);
    this.attacks = withFallback(ph.attacks);
    this.cdMult = ph.cdMult; this.dmgMult = ph.dmgMult; this.speedMult = ph.speedMult;
    if (ph.tint != null) m._baseTint = ph.tint;
    for (let i = 0; i < this.attacks.length; i++) {
      if (this.cds[i] <= 0 && i >= this.profile.attacks.length) this.cds[i] = 1500 + Math.random() * 2000;
    }
    this.openIdx = -1;
    if (ph.open) {
      for (let i = 0; i < this.attacks.length; i++) if (this.attacks[i].type === ph.open) { this.openIdx = i; break; }
    }
    this._hideTelegraphs();
    if (m.body) m.body.setAllowGravity(true);
    this.stage = ST_ROAR; this.t = 0; this.roarMs = ph.roar ?? 1000; this.pulse2 = -1;
    m.setVelocityX(0);
    m.phase = idx + 1;
    m._onPhaseChange(idx + 1, ph);
    return true;
  }

  // ── 招式實作 ──
  _projDamage(mult) {
    return attackDamage(this.m.atk, mult, this.dmgMult, this.m._smoked ? SMOKE_DAMAGE_FACTOR : 1, Math.random());
  }

  _hurt(player, mult, tag) {
    if (!player || player.isInvincible || player.isDead) return false;
    player.takeDamage(this._projDamage(mult));
    bump(aiStats.hit, tag);
    return true;
  }

  _blast(cx, footY, radius, hMax, mult, player, tint) {
    const m = this.m, scene = m.scene;
    if (player && !player.isDead && inGroundBlast(player.x, player.body.bottom, cx, footY, radius, hMax)) {
      this._hurt(player, mult, 'blast');
    }
    playFx(scene, 'fx_smoke', cx, footY - 16, { scale: Math.max(0.6, radius / 90), normal: true, depth: 14 });
    playFx(scene, 'fx_whirl', cx, footY - 30, { scale: Math.max(0.5, radius / 140), frameRate: 20, tint });
    this._ringAt(cx, footY - 4, radius, 0.9, true, tint);
    if (player && Math.abs(player.x - cx) < 700) scene.cameras.main.shake(160, radius > 100 ? 0.007 : 0.004);
  }

  _fireShots(def, player) {
    const m = this.m;
    const pool = getProjectilePool(m.scene);
    const sx = m.x + this.dir * 18, sy = m.body.center.y - 8;
    const dx = player.x - sx, dy = player.body.center.y - sy;
    const dist = Math.max(20, Math.hypot(dx, dy));
    let vx0, vy0;
    if (def.grav > 0) {
      const t = Math.max(0.35, Math.min(1.5, dist / def.speed));
      vx0 = dx / t; vy0 = dy / t - 0.5 * def.grav * t;
    } else {
      vx0 = dx / dist * def.speed; vy0 = dy / dist * def.speed;
    }
    const dmg = this._projDamage(def.dmg);
    const n = def.count;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * def.spread * DEG;
      const c = Math.cos(a), s = Math.sin(a);
      pool.fire(def.kind, sx, sy, vx0 * c - vy0 * s, vx0 * s + vy0 * c, def.grav, def.life, dmg, def.tint, def.scale);
    }
  }

  _fireRain(def, player) {
    const pool = getProjectilePool(this.m.scene);
    const dmg = this._projDamage(def.dmg);
    const n = Math.min(8, def.count);
    for (let i = 0; i < n; i++) {
      pool.fire(def.kind, this.rainX[i], -30 - i * 55, 0, def.speed, 0, 3000, dmg, def.tint, def.scale);
    }
  }

  _fireBurst(def) {
    const m = this.m;
    const pool = getProjectilePool(m.scene);
    const dmg = this._projDamage(def.dmg);
    const n = def.count;
    const off = Math.random() * Math.PI * 2;
    const cx = m.x, cy = m.body.center.y;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      pool.fire(def.kind, cx, cy, Math.cos(a) * def.speed, Math.sin(a) * def.speed, 0, def.life, dmg, def.tint, def.scale);
    }
    playFx(m.scene, 'fx_whirl', cx, cy, { scale: 1.2, frameRate: 20, tint: def.tint });
  }

  _doSummon(def) {
    const m = this.m;
    // 清掉已死的，再補到 cap
    let alive = 0;
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const mi = this.minions[i];
      if (!mi.active || mi.isDead) this.minions.splice(i, 1); else alive++;
    }
    const room = Math.max(0, def.cap - alive);
    const n = Math.min(def.count, room);
    for (let i = 0; i < n; i++) {
      const x = m.clampToPlatform(m.x + (i % 2 ? 1 : -1) * (70 + 40 * Math.floor(i / 2)));
      const mi = m.spawnMinion(def.minion, x);
      if (mi) this.minions.push(mi);
    }
    playFx(m.scene, 'fx_smoke', m.x, m.body.bottom - 20, { scale: 1.1, normal: true, tint: 0xc070ff, depth: 14 });
  }

  killMinions() {
    for (const mi of this.minions) {
      if (mi.active && !mi.isDead) { mi.isDead = true; mi.destroy(); }
    }
    this.minions.length = 0;
  }
}

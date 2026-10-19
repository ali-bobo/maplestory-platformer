// 怪物特殊攻擊引擎：每隻怪一個 MonsterBrain，負責「選招 → 前搖（預警）→ 出招 → 收招」。
// 招式清單來自 config/monsterAttacks.js；選招 / 冷卻 / 傷害等純邏輯在 engine/aiLogic.js。
//
// 效能規則：
//  - 全程用時間累加（stage / t）推進，不建立 tween 與 timer；預警圖形是每隻怪各一份、重複使用的 Image
//  - 投射物、衝擊波、命中爆光集中在每個場景一個固定容量的 ProjectilePool（不用 physics collider）
//  - 紋理只在第一次用到時建立一次（ensureAiTextures），出招時絕不產生新紋理
//  - 純裝飾的動畫特效（煙、旋風）有每場景的同時存在上限 FX_BUDGET，超過就略過（判定不受影響）
//
// 預警（telegraph）原則（v3，參考 Hollow Knight / Dead Cells / 魂系這類動作遊戲：「看怪物的動作就知道要躲」）：
//  - 不再畫平面的紅色範圍框，改由怪物本身演出前搖：身體往後蓄力傾斜、逐漸發熱變色、身上聚集能量光
//  - 出手前約 0.15 秒：身體白閃一下 + 武器位置亮起十字星芒（glint），這一下就是「現在要躲」
//  - 落點 / 範圍改用「世界裡的東西」暗示：從天而降的影子、地面裂縫透出的光與往上飄的火星、塵土
//  - 命中瞬間：衝擊環往外擴散、碎石飛散、塵土往兩側噴，比預警本身更有份量
//  - 減少動態：不傾斜、不抖動、不閃白、粒子減半，星芒與地面光仍保留（判讀資訊不能少）

import Phaser from 'phaser';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { SMOKE_DAMAGE_FACTOR } from '../engine/statusEffects.js';
import { getVisualTopY, getVisualCenterY } from '../config/alignment.js';
import { getAttackProfile, regularCdMult } from '../config/monsterAttacks.js';
import { settings } from '../engine/settings.js';
import { playFx } from './Skill.js';
import {
  pickAttack, cooldownFor, attackDamage, phaseIndexFor, inGroundBlast, circleHitsRect,
  leapVelocity, leapVx,
} from '../engine/aiLogic.js';

export const ST_IDLE = 0, ST_WINDUP = 1, ST_EXEC = 2, ST_RECOVER = 3, ST_POP = 4, ST_ROAR = 5;

const TEX = { RING: 'ai_ring', ARROW: 'ai_arrow', SHARD: 'ai_shard', WAVE: 'ai_wave', GLINT: 'ai_glint', SHADOW: 'ai_shadow', ROCK: 'ai_rock' };
const DEG = Math.PI / 180;
const POOL_CAP = 32;          // 投射物 + 衝擊波同時上限（與 v1 相同，e2e 以 32 為預算）
const TRAIL_SLOTS = 16;       // 只有前 16 格會配拖尾圖（拖尾是純裝飾，其餘格不建圖，省物件數）
const IMPACT_CAP = 16;        // 命中 / 爆發的柔光爆點與衝擊環同時上限
const MOTE_CAP = 48;          // 小粒子（塵土、碎石、火星）同時上限；池滿就略過（純裝飾）
export const FX_BUDGET = 18;  // 敵方裝飾動畫（playFx）同時上限
const HOT_TINT = 0xff8a5c;     // 蓄力中身體逐漸偏向的顏色（乘色）
const GROUND_TINT = 0xff5a26;  // 地面裂縫光的預設色
const DUST_TINT = 0xcfc0a2;
const ROCK_TINT = 0x8a7458;
const MAX_NOVA = 6;

// 除錯統計（e2e 用）：?debug=1 時掛在 window.__aiStats
export const aiStats = { started: {}, hit: {}, fired: 0, maxActive: 0, freezeWindup: null, fxSkipped: 0, maxFx: 0, maxMotes: 0 };
if (typeof window !== 'undefined' && typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)) {
  window.__aiStats = aiStats;
}
function bump(map, key) { map[key] = (map[key] || 0) + 1; }
function motionOk() { return settings.motionAllowed(); }

// 投射物外觀：tex / 縮放 / 混合模式 / 判定半徑 / 是否依速度轉向 / 是否自旋 / 拖尾大小（0 = 不拖尾）/ 是否重彈（擊退加重、命中震動）
// v2：外觀放大約 20%、判定半徑加 2px 左右，並加上柔光拖尾與命中爆光
const KINDS = {
  orb:    { tex: 'skill-orb', scale: 1.55, add: true, r: 11, trail: 0.9 },
  bolt:   { tex: 'skill-orb', scale: 1.3, add: true, r: 10, trail: 0.8 },
  fire:   { tex: 'skill-orb', scale: 2.0, add: true, r: 14, trail: 1.2, heavy: true },
  cannon: { tex: 'skill-orb', scale: 2.5, add: false, r: 17, trail: 1.1, heavy: true },
  spit:   { tex: 'skill-orb', scale: 1.7, add: false, r: 12, trail: 0.7 },
  ice:    { tex: TEX.SHARD, scale: 1.25, add: false, r: 11, rot: true, trail: 0.7 },
  arrow:  { tex: TEX.ARROW, scale: 1.2, add: false, r: 8, rot: true, trail: 0 },
  bone:   { tex: TEX.ARROW, scale: 1.25, add: false, r: 10, spin: true, trail: 0 },
};

export function ensureAiTextures(scene) {
  const tex = scene.textures;
  if (tex.exists(TEX.RING) && tex.exists(TEX.GLINT)) return;
  const g = scene.add.graphics();
  if (!tex.exists(TEX.RING)) {
    // 圓環（白色，靠 tint 上色）
    g.lineStyle(5, 0xffffff, 1); g.strokeCircle(64, 64, 58);
    g.generateTexture(TEX.RING, 128, 128); g.clear();
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
  }
  if (!tex.exists(TEX.GLINT)) {
    // 十字星芒（出手前一瞬的「閃」）：長十字 + 短斜十字 + 亮心
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, 32, 32, 28, 32, 36); g.fillTriangle(64, 32, 32, 28, 32, 36);
    g.fillTriangle(32, 0, 28, 32, 36, 32); g.fillTriangle(32, 64, 28, 32, 36, 32);
    g.fillStyle(0xffffff, 0.6);
    g.fillTriangle(14, 14, 34, 30, 30, 34); g.fillTriangle(50, 50, 34, 30, 30, 34);
    g.fillTriangle(50, 14, 30, 30, 34, 34); g.fillTriangle(14, 50, 30, 30, 34, 34);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(32, 32, 8);
    g.fillStyle(0xffffff, 1); g.fillCircle(32, 32, 4);
    g.generateTexture(TEX.GLINT, 64, 64); g.clear();
    // 柔邊橢圓影子（白色，用時 tint 成黑）：一層層疊上去，中心最濃
    for (let i = 0; i < 10; i++) {
      const k = 1 - i / 10;
      g.fillStyle(0xffffff, 0.1); g.fillEllipse(64, 16, 128 * k, 32 * k);
    }
    g.generateTexture(TEX.SHADOW, 128, 32); g.clear();
    // 碎石
    g.fillStyle(0xffffff, 1); g.fillTriangle(0, 6, 5, 0, 11, 4); g.fillTriangle(0, 6, 11, 4, 7, 10);
    g.fillStyle(0x000000, 0.25); g.fillTriangle(0, 6, 11, 4, 7, 10);
    g.generateTexture(TEX.ROCK, 12, 11); g.clear();
  }
  g.destroy();
}

// ── 投射物 / 衝擊波池 ───────────────────────────────────────────────────────
class Slot {
  constructor() {
    this.img = null; this.trail = null; this.active = false; this.wave = false; this.kind = null;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.g = 0; this.life = 0;
    this.dmg = 0; this.r = 8; this.w = 0; this.h = 0; this.feetY = 0; this.force = 1; this.tint = 0xffffff;
  }
}

class Impact {
  constructor() { this.img = null; this.active = false; this.t = 0; this.dur = 1; this.sx = 1; this.sy = 1; this.a = 1; }
}

// 小粒子：塵土 / 碎石 / 火星。位置、速度、重力自己算，不用 Phaser 粒子系統（不產生新物件）
class Mote {
  constructor() {
    this.img = null; this.active = false; this.t = 0; this.dur = 1;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.g = 0; this.s0 = 1; this.s1 = 1; this.a0 = 1; this.spin = 0; this.floor = 1e9;
  }
}

export class ProjectilePool {
  constructor(scene) {
    this.scene = scene;
    this.slots = [];
    for (let i = 0; i < POOL_CAP; i++) this.slots.push(new Slot());
    this.impacts = [];
    for (let i = 0; i < IMPACT_CAP; i++) this.impacts.push(new Impact());
    this.motes = [];
    for (let i = 0; i < MOTE_CAP; i++) this.motes.push(new Mote());
    this.active = 0;
    this.impactActive = 0;
    this.moteActive = 0;
    this.fxLive = 0;
    this._fxDone = () => { this.fxLive = Math.max(0, this.fxLive - 1); };
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

  fire(kind, x, y, vx, vy, grav, life, dmg, tint, scale, force = 1) {
    if (this._dead) return false;
    const s = this._free();
    if (!s) return false;
    const k = KINDS[kind] || KINDS.orb;
    const sc = scale || 1;
    s.active = true; s.wave = false; s.kind = k;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.g = grav; s.life = life; s.dmg = dmg; s.r = k.r * sc;
    s.force = force * (k.heavy ? 1.2 : 1); s.tint = tint ?? 0xffe9a0;
    const img = this._image(s, k.tex);
    img.setVisible(true).setPosition(x, y).setScale(k.scale * sc).setAlpha(1).setRotation(0)
      .setBlendMode(k.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setOrigin(0.5, 0.5).setFlipX(false);
    if (tint != null) img.setTint(tint); else img.clearTint();
    // 柔光拖尾：每格一張、重複使用
    if (k.trail > 0 && this.slots.indexOf(s) < TRAIL_SLOTS) {
      if (!s.trail) s.trail = this.scene.add.image(0, 0, VFX_TEX.SOFT_GLOW).setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
      s.trail.setVisible(true).setPosition(x, y).setTint(s.tint).setAlpha(0.55).setScale(k.trail * sc * 0.9, k.trail * sc * 0.6);
    } else if (s.trail) s.trail.setVisible(false);
    this.active++;
    aiStats.fired++;
    if (this.active > aiStats.maxActive) aiStats.maxActive = this.active;
    return true;
  }

  // 沿地面前進的衝擊波：玩家要跳起來躲
  wave(x, footY, dir, speed, len, dmg, tint, force = 1) {
    if (this._dead) return false;
    const s = this._free();
    if (!s) return false;
    s.active = true; s.wave = true; s.kind = null;
    s.x = x; s.y = footY; s.feetY = footY; s.vx = dir * speed; s.vy = 0; s.g = 0;
    s.life = (len / speed) * 1000; s.dmg = dmg; s.w = 46; s.h = 30; s.force = force; s.tint = tint;
    const img = this._image(s, TEX.WAVE);
    img.setVisible(true).setOrigin(0.5, 1).setPosition(x, footY).setScale(1.25).setAlpha(1).setRotation(0)
      .setBlendMode(Phaser.BlendModes.ADD).setFlipX(dir < 0).setTint(tint);
    if (s.trail) s.trail.setVisible(false);
    this.active++;
    if (this.active > aiStats.maxActive) aiStats.maxActive = this.active;
    return true;
  }

  /** 柔光爆點（命中 / 爆發 / 投射物消散）：sx / sy 為最終大小倍率，dur 毫秒。池滿就略過（純裝飾）。 */
  impact(x, y, tint, sx, sy, dur, tex = VFX_TEX.SOFT_GLOW) {
    if (this._dead) return;
    let it = null;
    for (let i = 0; i < IMPACT_CAP; i++) if (!this.impacts[i].active) { it = this.impacts[i]; break; }
    if (!it) return;
    if (!it.img) it.img = this.scene.add.image(0, 0, tex).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
    else if (it.img.texture.key !== tex) it.img.setTexture(tex);
    it.active = true; it.t = 0; it.dur = dur; it.sx = sx; it.sy = sy;
    it.img.setVisible(true).setPosition(x, y).setTint(tint).setAlpha(1).setScale(sx * 0.35, sy * 0.35);
    this.impactActive++;
  }

  /** 地面衝擊環：從中心往外擴散到 radius、壓扁成地面橢圓後淡出。 */
  shock(x, footY, radius, tint, dur = 380) {
    const s = radius / 58;
    this.impact(x, footY, tint, s, s * 0.28, dur, TEX.RING);
  }

  /**
   * 小粒子：tex 圖、(x, y) 起點、速度 / 重力（px/s）、dur 毫秒、大小由 s0 變到 s1、起始透明度 a0。
   * add = 疊加發光（火星），否則一般混色（塵土、碎石）。spin = 每秒旋轉弧度；floor = 落到這個 y 會小彈一下。池滿就略過。
   */
  mote(tex, x, y, vx, vy, g, dur, tint, s0, s1, a0, add, spin = 0, floor = 1e9) {
    if (this._dead) return;
    let mo = null;
    for (let i = 0; i < MOTE_CAP; i++) if (!this.motes[i].active) { mo = this.motes[i]; break; }
    if (!mo) return;
    if (!mo.img) mo.img = this.scene.add.image(0, 0, tex).setDepth(15);
    else if (mo.img.texture.key !== tex) mo.img.setTexture(tex);
    mo.active = true; mo.t = 0; mo.dur = dur;
    mo.x = x; mo.y = y; mo.vx = vx; mo.vy = vy; mo.g = g; mo.s0 = s0; mo.s1 = s1; mo.a0 = a0; mo.spin = spin; mo.floor = floor;
    mo.img.setVisible(true).setPosition(x, y).setTint(tint).setAlpha(0).setScale(s0).setRotation(Math.random() * 6.28)
      .setBlendMode(add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    this.moteActive++;
    if (this.moteActive > aiStats.maxMotes) aiStats.maxMotes = this.moteActive;
  }

  /** 敵方裝飾動畫：超過同時上限就不播（回傳 null）。essential = 不受上限限制（例如階段切換）。 */
  fx(key, x, y, opts, essential) {
    if (this._dead) return null;
    if (!essential && this.fxLive >= FX_BUDGET) { aiStats.fxSkipped++; return null; }
    const spr = playFx(this.scene, key, x, y, opts);
    if (spr) {
      this.fxLive++;
      if (this.fxLive > aiStats.maxFx) aiStats.maxFx = this.fxLive;
      spr.once('destroy', this._fxDone);
    }
    return spr;
  }

  _kill(s, burst) {
    s.active = false;
    if (s.img) s.img.setVisible(false);
    if (s.trail) s.trail.setVisible(false);
    this.active--;
    if (burst && !s.wave) this.impact(s.x, s.y, s.tint, 1.2 + s.r / 14, 1.2 + s.r / 14, 220);
  }

  clear() {
    for (let i = 0; i < POOL_CAP; i++) if (this.slots[i].active) this._kill(this.slots[i], false);
  }

  update(delta) {
    if (this._dead) return;
    if (this.impactActive > 0) this._updateImpacts(delta);
    if (this.moteActive > 0) this._updateMotes(delta);
    if (this.active <= 0) return;
    // 低 FPS 時把一幀切成最多 34ms 的小步，投射物才不會一幀飛過玩家
    const total = Math.min(delta, 100) / 1000;
    const steps = Math.max(1, Math.ceil(total / 0.034));
    const dt = total / steps;
    const player = this.scene.player;
    const pb = player && player.active && !player.isDead ? player.body : null;
    const worldW = this.scene.physics?.world?.bounds?.width ?? 3000;
    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < POOL_CAP; i++) {
        const s = this.slots[i];
        if (!s.active) continue;
        s.life -= dt * 1000;
        if (s.life <= 0) { this._kill(s, false); continue; }
        if (s.g) s.vy += s.g * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y > 700 || s.x < -80 || s.x > worldW + 80) { this._kill(s, false); continue; }
        if (pb && !player.isInvincible) {
          let hit;
          if (s.wave) {
            hit = Math.abs(pb.center.x - s.x) < pb.halfWidth + s.w / 2 && pb.bottom > s.feetY - s.h + 4 && pb.top < s.feetY;
          } else {
            hit = circleHitsRect(s.x, s.y, s.r, pb.center.x, pb.center.y, pb.halfWidth, pb.halfHeight);
          }
          if (hit) {
            // 擊退方向：從投射物「來的方向」把玩家推開（衝擊波沿前進方向推）
            const back = s.vx > 0 ? -12 : s.vx < 0 ? 12 : 0;
            player.takeDamage(s.dmg, { sourceX: s.x + back, force: s.force });
            if (s.force >= 1.6 && player.active) this.scene.cameras.main.shake(120, 0.006);
            bump(aiStats.hit, s.wave ? 'wave' : 'projectile');
            this._kill(s, true);
          }
        }
      }
    }
    // 外觀只在整幀更新一次
    for (let i = 0; i < POOL_CAP; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      const img = s.img;
      img.setPosition(s.x, s.y);
      if (s.wave) img.setAlpha(Math.min(1, s.life / 250));
      else {
        if (s.kind.rot) img.setRotation(Math.atan2(s.vy, s.vx));
        else if (s.kind.spin) img.setRotation(img.rotation + total * 14);
        if (s.trail && s.trail.visible) s.trail.setPosition(s.x - s.vx * 0.035, s.y - s.vy * 0.035);
      }
    }
  }

  _updateImpacts(delta) {
    for (let i = 0; i < IMPACT_CAP; i++) {
      const it = this.impacts[i];
      if (!it.active) continue;
      it.t += delta;
      const p = it.t / it.dur;
      if (p >= 1) { it.active = false; it.img.setVisible(false); this.impactActive--; continue; }
      const e = 1 - (1 - p) * (1 - p);
      it.img.setScale(it.sx * (0.35 + 0.65 * e), it.sy * (0.35 + 0.65 * e)).setAlpha(1 - p);
    }
  }

  _updateMotes(delta) {
    const dt = Math.min(delta, 100) / 1000;
    for (let i = 0; i < MOTE_CAP; i++) {
      const mo = this.motes[i];
      if (!mo.active) continue;
      mo.t += delta;
      const p = mo.t / mo.dur;
      if (p >= 1) { mo.active = false; mo.img.setVisible(false); this.moteActive--; continue; }
      mo.vy += mo.g * dt;
      mo.x += mo.vx * dt; mo.y += mo.vy * dt;
      if (mo.y > mo.floor && mo.vy > 0) { mo.y = mo.floor; mo.vy *= -0.3; mo.vx *= 0.6; mo.spin *= 0.5; }
      const img = mo.img;
      img.setPosition(mo.x, mo.y).setScale(mo.s0 + (mo.s1 - mo.s0) * p).setAlpha(mo.a0 * Math.min(1, p * 6) * (1 - p));
      if (mo.spin) img.setRotation(img.rotation + mo.spin * dt);
    }
  }

  destroy() {
    if (this._dead) return;
    this._dead = true;
    this.scene.events.off('update', this._onUpdate);
    this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this);
    for (const s of this.slots) {
      if (s.img) { s.img.destroy(); s.img = null; }
      if (s.trail) { s.trail.destroy(); s.trail = null; }
      s.active = false;
    }
    for (const it of this.impacts) { if (it.img) { it.img.destroy(); it.img = null; } it.active = false; }
    for (const mo of this.motes) { if (mo.img) { mo.img.destroy(); mo.img = null; } mo.active = false; }
    this.active = 0; this.impactActive = 0; this.moteActive = 0; this.fxLive = 0;
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
  type: 'leap', windup: 450, exec: 0, recover: 550, cd: 4500, min: 40, max: 460, dmg: 1.0, radius: 80,
  grounded: true, vert: true, weight: 1, fallbackOnly: true, implicit: true, combo: 0, comboWindup: 250, comboGap: 180,
});
const VERT_TYPES = { shoot: 1, dive: 1, leap: 1, rain: 1, burst: 1, nova: 1 };
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
    for (let i = 0; i < this.attacks.length; i++) {
      const a = this.attacks[i];
      // 衝撞 / 俯衝 / 撲擊是「接近時的開場招」：初始冷卻短一點，不然走到面前才好、就再也用不出來
      const opener = a.type === 'charge' || a.type === 'dive';
      this.cds[i] = a.fallbackOnly ? 0 : a.cd * (opener ? 0.05 + Math.random() * 0.25 : 0.2 + Math.random() * 0.5);
    }
    const cfg = owner.config;
    const isBoss = cfg.id === 'boss';
    const isMini = cfg.spawnRole === 'miniboss';
    // 整場的出招頻率：守衛 / Boss 看招式表頂層 cdMult，一般怪依等級帶
    this.baseCdMult = this.profile.cdMult ?? regularCdMult(cfg.level);
    this.baseGcdMult = this.profile.gcdMult ?? 1;
    this.cdMult = this.baseCdMult; this.gcdMult = this.baseGcdMult; this.dmgMult = 1; this.speedMult = 1;
    // 擊退力道倍率（傳給 Player#takeDamage 的 force）：Boss > 小王 > 一般怪
    this.forceBase = isBoss ? 1.6 : isMini ? 1.35 : 1;
    this.shakeMult = isBoss ? 1.6 : isMini ? 1.3 : 1;
    this.gcd = 800 + Math.random() * 800;
    this.stage = ST_IDLE; this.cur = -1; this.def = null; this.t = 0; this.windupMs = 0;
    this.dir = 1; this.aimX = 0; this.aimY = 0; this.aimFeet = 0; this.hit = false; this.pulse = -1;
    this.chainLeft = 0; this.comboLeft = 0; this.bx = 0; this.footY = 0; this.roarMs = 0; this.openIdx = -1;
    this.landX = 0;
    this.rainX = new Float32Array(8);
    this.novaX = new Float32Array(MAX_NOVA); this.novaN = 0;
    this.minions = [];
    this._marks = []; this._markN = 0;
    this._glow = null; this._glint = null; this._orb = null; this._ring = null; this._aura = null;
    this.emitT = 0; this.tintStep = -1;
    this.glintScale = isBoss ? 1.6 : isMini ? 1.25 : 0.95;
    this.superArmor = isMini || isBoss;
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
    this._startAttack(idx, player, false);
    return true;
  }

  // ── 預警演出用的圖（每隻怪各一份、重複使用，不在出招時 new）──
  _img(name, tex, depth, add) {
    if (!this[name]) {
      this[name] = this.m.scene.add.image(0, 0, tex).setDepth(depth).setVisible(false);
      if (add) this[name].setBlendMode(Phaser.BlendModes.ADD);
    }
    return this[name];
  }

  /** 第 i 張地面標記（影子 / 裂縫光 / 魔法陣）：紋理與混色依用途切換 */
  _mark(i, tex, add) {
    while (this._marks.length <= i) this._marks.push(this.m.scene.add.image(0, 0, tex).setDepth(12).setVisible(false));
    if (this._markN <= i) this._markN = i + 1;
    const mk = this._marks[i];
    if (mk.texture.key !== tex) mk.setTexture(tex);
    return mk.setBlendMode(add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setVisible(true);
  }

  _hideMarks() {
    for (let i = 0; i < this._markN; i++) this._marks[i].setVisible(false);
    this._markN = 0;
  }

  _hideTelegraphs() {
    if (this._glow) this._glow.setVisible(false);
    if (this._glint) this._glint.setVisible(false);
    if (this._orb) this._orb.setVisible(false);
    if (this._ring) this._ring.setVisible(false);
    this._hideMarks();
    this.tintStep = -1;
    if (this.m.active) this.m.setAngle(0);
  }

  /** 從天而降 / 跳躍落點的影子：寬 w，越接近落下越濃 */
  _shadowAt(i, x, footY, w, a) {
    this._mark(i, TEX.SHADOW, false).setPosition(x, footY - 2).setTint(0x000000).setAlpha(a).setDisplaySize(w, w * 0.24);
  }

  /**
   * 地面裂縫透出的光（範圍招的落點）：柔邊、貼地，最後一段微微閃爍。
   * 用一般混色而不是疊加：天空 / 雪地這類亮背景上疊加光會整片看不見。
   */
  _groundGlow(i, x, footY, radius, p, tint) {
    const flick = p > 0.75 && motionOk() ? 0.85 + 0.15 * Math.sin(this.t / 28) : 1;
    this._mark(i, VFX_TEX.SOFT_GLOW, false).setPosition(x, footY - 4).setTint(tint)
      .setAlpha(Math.min(1, 0.35 + 0.75 * p) * flick).setDisplaySize(radius * 2.6, 30 + 30 * p);
  }

  /** 從地面往上飄的火星（落在真正的判定寬度內，看得出範圍） */
  _embers(x, footY, radius, tint, n) {
    const pool = getProjectilePool(this.m.scene);
    for (let i = 0; i < n; i++) {
      pool.mote(VFX_TEX.SOFT_GLOW, x + (Math.random() * 2 - 1) * radius, footY - 3, (Math.random() - 0.5) * 24,
        -(60 + Math.random() * 90), 0, 520 + Math.random() * 300, tint, 0.34, 0.1, 1, false);
    }
  }

  /** 塵土：dir = 噴出方向（-1 / 0 / 1） */
  _dust(x, y, dir, n) {
    const pool = getProjectilePool(this.m.scene);
    for (let i = 0; i < n; i++) {
      const sx = dir || (Math.random() < 0.5 ? -1 : 1);
      pool.mote(VFX_TEX.SOFT_GLOW, x, y, sx * (40 + Math.random() * 70), -(25 + Math.random() * 45), 120,
        420 + Math.random() * 200, DUST_TINT, 0.3, 0.75, 0.6, false);
    }
  }

  /** 命中的碎石 + 往兩側噴的塵土；碎石落回 footY 會小彈一下 */
  _debris(cx, footY, radius, n) {
    const pool = getProjectilePool(this.m.scene);
    if (!motionOk()) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const side = i & 1 ? 1 : -1;
      pool.mote(TEX.ROCK, cx + side * Math.random() * radius * 0.5, footY - 6, side * (60 + Math.random() * 200),
        -(200 + Math.random() * 260), 950, 700 + Math.random() * 250, ROCK_TINT, 0.9 + Math.random() * 0.8, 0.8, 1, false,
        side * (6 + Math.random() * 8), footY - 3);
    }
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      pool.mote(VFX_TEX.SOFT_GLOW, cx + side * radius * 0.3, footY - 10, side * (90 + radius * 0.6), -18, 0, 620,
        DUST_TINT, 0.8, 2.2 + radius / 80, 0.5, false);
    }
  }

  /** 遠程招的蓄能：發射口一顆漸大的光球，四周的光點往中心收 */
  _gather(x, y, size, p, tint, emit, r) {
    this._img('_orb', VFX_TEX.SOFT_GLOW, 14, true).setVisible(true).setPosition(x, y).setTint(tint)
      .setAlpha(0.45 + 0.55 * p).setDisplaySize(size, size);
    if (!emit) return;
    const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    getProjectilePool(this.m.scene).mote(VFX_TEX.SOFT_GLOW, x + c * r, y + s * r, -c * r / 0.3, -s * r / 0.3, 0, 300,
      tint, 0.22, 0.08, 1, true);
  }

  /**
   * 前搖的身體演出：逐漸發熱變色、往後蓄力傾斜（lean 度）、尾段抖動，最後白閃一下 + 武器位置亮起星芒。
   * 顏色只在換段時才重設，不每幀 setTint。
   */
  _windupBody(p, lean) {
    const m = this.m, def = this.def;
    const motion = motionOk();
    const flash = motion && p >= 0.88 && p < 0.95;
    const step = flash ? 99 : Math.min(8, (p * 8) | 0);
    if (step !== this.tintStep) {
      this.tintStep = step;
      if (flash) m.setTintFill(0xffffff);
      else m.setTint(lerpColor(m._baseTint ?? 0xffffff, HOT_TINT, (step / 8) * 0.85));
    }
    if (motion && lean) {
      const e = 1 - (1 - p) * (1 - p);
      const shake = p > 0.55 ? Math.sin(this.t / 22) * 1.8 * (p - 0.55) / 0.45 : 0;
      m.setAngle(-this.dir * lean * e + shake);
    }
    const sz = Math.max(m.displayWidth, m.displayHeight) * (0.9 + 0.6 * p);
    this._img('_glow', VFX_TEX.SOFT_GLOW, 9, true).setVisible(true).setPosition(m.x, getVisualCenterY(m))
      .setTint(def.tint ?? HOT_TINT).setAlpha(0.1 + 0.5 * p).setDisplaySize(sz * 1.3, sz);
    if (p >= 0.74) {
      const q = (p - 0.74) / 0.26;
      const pop = motion ? (q < 0.35 ? q / 0.35 : 1 - 0.35 * (q - 0.35) / 0.65) : 1;
      this._img('_glint', TEX.GLINT, 41, true).setVisible(true)
        .setPosition(m.x + this.dir * m.displayWidth * 0.28, getVisualTopY(m) + m.displayHeight * 0.22)
        .setTint(0xfff3c4).setAlpha(1).setScale(this.glintScale * (0.3 + 0.9 * pop)).setRotation(motion ? this.t / 260 : 0);
    }
  }

  /** 每 70ms（減少動態 140ms）回傳一次 true，用來控制粒子噴發頻率 */
  _emitTick(dt) {
    const every = motionOk() ? 70 : 140;
    this.emitT = Math.min(this.emitT + dt, every * 2);
    if (this.emitT < every) return false;
    this.emitT -= every;
    return true;
  }

  // ── 狂暴光環（守衛 / Boss 進入狂暴階段後常駐，Monster.update 每幀跟隨）──
  updateAura() {
    const a = this._aura, m = this.m;
    if (!a) return;
    if (m._underground || !m.visible) { a.setVisible(false); return; }
    const k = motionOk() ? 0.5 + 0.18 * Math.sin(m.scene.time.now / 160) : 0.55;
    a.setVisible(true).setPosition(m.x, getVisualCenterY(m)).setAlpha(k);
  }

  _setAura(tint) {
    const m = this.m;
    if (!this._aura) {
      this._aura = m.scene.add.image(m.x, m.y, VFX_TEX.SOFT_GLOW).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    }
    const w = Math.max(80, m.displayWidth * 1.7), h = Math.max(80, m.displayHeight * 1.45);
    this._aura.setTint(tint).setDisplaySize(w, h);
    this.updateAura();
  }

  // ── 出招流程 ──
  _startAttack(idx, player, comboStep) {
    const def = this.attacks[idx];
    const m = this.m;
    ensureAiTextures(m.scene);
    this.cur = idx; this.def = def; this.stage = ST_WINDUP; this.t = 0; this.hit = false; this.pulse = -1;
    if (!comboStep) {
      this.cds[idx] = cooldownFor(def, this.cdMult, Math.random());
      this.comboLeft = def.combo || 0;
    }
    this.windupMs = comboStep ? def.comboWindup : def.windup;
    bump(aiStats.started, def.type);
    m.setVelocityX(0);
    this._aimAt(player);
    this.footY = m.body.bottom;
    if (def.type === 'dive') { m.body.setAllowGravity(false); m.setVelocityY(-110); }
    else if (def.type === 'rain') this._planRain(player);
    else if (def.type === 'nova') this._planNova(player);
    this.emitT = 0; this.tintStep = -1;
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
  }

  // 地面爆發：開始前搖就鎖定位置（玩家腳下 + 兩側），之後不再追蹤，給玩家走出去的時間
  _planNova(player) {
    const def = this.def;
    const n = Math.min(MAX_NOVA, def.count);
    const worldW = this.m._worldW || 3000;
    this.novaN = n;
    // 偶數個時讓玩家站在兩個之間的縫外側：一律以玩家為第一個中心，再左右交錯
    for (let i = 0; i < n; i++) {
      const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
      this.novaX[i] = Math.max(def.radius, Math.min(worldW - def.radius, player.x + k * def.spacing));
    }
    // 玩家在空中時，爆發點放在他最後站過的平台上（不然預警區會浮在半空）
    const g = this.m.graph, pb = player.body;
    const grounded = pb.blocked.down || pb.touching.down;
    this.aimFeet = (!grounded && g && player._aiPlat >= 0) ? g.top[player._aiPlat] : pb.bottom;
  }

  tick(delta, player) {
    const dt = Math.min(delta, 100);
    this.t += dt;
    switch (this.stage) {
      case ST_WINDUP: this._tickWindup(player, dt); break;
      case ST_EXEC: this._tickExec(dt, player); break;
      case ST_POP: this._tickPop(player, dt); break;
      case ST_RECOVER: this._tickRecover(player); break;
      case ST_ROAR: this._tickRoar(player); break;
      default: break;
    }
  }

  _slamLanding(m) {
    // 預測落點：與 _enterExec 的跳躍初速一致（vy = -540、水平最多 380 px/s，重力 1000 + 自身重力）
    const g = (m.scene.physics?.world?.gravity?.y ?? 1000) + (m.body.gravity?.y ?? 0);
    const air = 2 * 540 / Math.max(200, g);
    const vx = leapVx(this.aimX - m.x, -540, 380);
    return m.clampToPlatform(m.x + vx * air);
  }

  _tickWindup(player, dt) {
    const def = this.def, m = this.m;
    const wu = this.windupMs;
    if (aiStats.freezeWindup === def.type && this.t > wu * 0.85) this.t = wu * 0.85;   // e2e 截圖用：停在前搖尾段
    const p = Math.min(1, this.t / wu);
    if (p < 0.7 && def.type !== 'nova') this._aimAt(player);
    m.setVelocityX(0);
    const emit = this._emitTick(dt);
    switch (def.type) {
      case 'charge':
        // 低頭往後壓、蹄子刨地：腳後方踢起塵土
        this._windupBody(p, 9);
        if (emit && p > 0.25) this._dust(m.x - this.dir * m.body.halfWidth, m.body.bottom - 4, -this.dir, 1);
        break;
      case 'slam':
        // 蹲低蓄力；落點先出現一片淡影子（等跳起來後影子會跟著本體越來越濃）
        this._windupBody(p, 7);
        this.landX = this._slamLanding(m);
        this._shadowAt(0, this.landX, this.footY, def.radius * (0.9 + 0.6 * p), 0.12 + 0.28 * p);
        if (emit && p > 0.3) this._dust(m.x, m.body.bottom - 4, 0, 1);
        break;
      case 'pound':
        // 舉起蓄力；腳邊地面裂開透光、火星往上飄
        this._windupBody(p, 6);
        this._groundGlow(0, m.x, this.footY, def.radius, p, def.tint ?? GROUND_TINT);
        if (emit) this._embers(m.x, this.footY, def.radius, def.tint ?? 0xffb040, p > 0.6 ? 2 : 1);
        break;
      case 'nova':
        this._windupBody(p, 0);
        for (let i = 0; i < this.novaN; i++) {
          this._groundGlow(i, this.novaX[i], this.aimFeet, def.radius, p, def.tint ?? GROUND_TINT);
          if (emit) this._embers(this.novaX[i], this.aimFeet, def.radius, def.tint ?? 0xffb040, 1);
        }
        break;
      case 'summon': {
        this._windupBody(p, 0);
        const w = 150 + 50 * p;
        this._mark(0, VFX_TEX.GROUND_RUNE, true).setPosition(m.x, this.footY - 3).setTint(0xc070ff)
          .setAlpha(0.25 + 0.6 * p).setDisplaySize(w, w * 0.28);
        if (emit) this._embers(m.x, this.footY, 70, 0xc890ff, 1);
        break;
      }
      case 'shoot': case 'kite':
        this._windupBody(p, 3);
        this._gather(m.x + this.dir * 18, m.body.center.y - 8, 18 + 34 * p, p, def.tint ?? 0xffe9a0, emit, 44);
        break;
      case 'burst': {
        const tint = def.tint ?? 0xffe9a0;
        this._windupBody(p, 0);
        this._gather(m.x, m.body.center.y, 28 + 56 * p, p, tint, emit, 110);
        const s = ((170 - 100 * p) * 2) / 116;
        this._img('_ring', TEX.RING, 13, true).setVisible(true).setPosition(m.x, m.body.center.y)
          .setTint(tint).setAlpha(0.2 + 0.6 * p).setScale(s);
        break;
      }
      case 'dive':
        this._windupBody(p, 0);
        if (p > 0.7) m.setVelocityY(0);
        break;
      case 'rain': {
        // 落點：從天而降的影子，由小變大、由淡變濃
        this._windupBody(p, 0);
        const n = Math.min(8, def.count);
        const k = KINDS[def.kind] || KINDS.orb;
        const w = (k.r * (def.scale || 1) + 18) * 2 * (0.5 + 0.7 * p);
        for (let i = 0; i < n; i++) this._shadowAt(i, this.rainX[i], this.aimFeet, w, 0.1 + 0.4 * p);
        break;
      }
      case 'leap':
        this._windupBody(p, 8);
        if (emit && p > 0.3) this._dust(m.x - this.dir * m.body.halfWidth, m.body.bottom - 4, -this.dir, 1);
        break;
      default: this._windupBody(p, 4); break;
    }
    if (this.t >= wu) this._enterExec(player);
  }

  _enterExec(player) {
    const def = this.def, m = this.m;
    this.stage = ST_EXEC; this.t = 0;
    m._restoreTint(); this.tintStep = -1; this.emitT = 0;
    m.setAngle(0);
    if (this._glow) this._glow.setVisible(false);
    if (this._orb) this._orb.setVisible(false);
    if (this._glint) {
      // 星芒在出手瞬間炸成一小團白光
      if (this._glint.visible) getProjectilePool(m.scene).impact(this._glint.x, this._glint.y, 0xfff3c4, 1.5, 1.5, 150);
      this._glint.setVisible(false);
    }
    if (m.onAttackStart) m.onAttackStart(def);
    switch (def.type) {
      case 'charge': this.hit = false; break;
      case 'slam': {
        const vy = -540;
        m.setVelocity(leapVx(this.aimX - m.x, vy, 380), vy);
        break;
      }
      case 'pound':
        this._hideMarks();
        this._blast(m.x, this.footY, def.radius, def.hMax, def.dmg, player, 0xff5533, true);
        this._toRecover();
        break;
      case 'nova': this._hideMarks(); this._erupNova(def, player); this._toRecover(); break;
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
    this.m.setAngle(0);
    for (let i = 0; i < this._markN; i++) this._marks[i].a0 = this._marks[i].alpha;   // 收招期間由這個值淡出
  }

  _tickExec(dt, player) {
    const def = this.def, m = this.m;
    switch (def.type) {
      case 'charge': {
        const v = this.dir * m.speed * this.speedMult * def.speedMult;
        m.setVelocityX(v);
        // 往前衝：身體前傾、腳下一路揚起塵土
        if (motionOk()) m.setAngle(this.dir * 5);
        if (this._emitTick(dt)) this._dust(m.x - this.dir * m.body.halfWidth, m.body.bottom - 4, -this.dir, 1);
        // 不衝出平台邊緣（沒有平台資訊時只受牆壁 / 時間限制）
        let stop = this.t >= def.exec || m.body.blocked.left || m.body.blocked.right;
        if (!stop && m.edgeAhead(this.dir, 8 + Math.abs(v) * 0.04)) stop = true;
        if (!this.hit && player && !player.isDead) {
          const pb = player.body;
          if (Math.abs(pb.center.x - m.x) < pb.halfWidth + m.body.halfWidth + 6 && Math.abs(pb.center.y - m.body.center.y) < pb.halfHeight + m.body.halfHeight) {
            this.hit = true;
            if (this._hurt(player, def.dmg, 'charge', m.x - this.dir * 20, this._force(def))) {
              getProjectilePool(m.scene).impact(pb.center.x, pb.center.y, 0xffaa66, 1.8, 1.8, 220);
            }
          }
        }
        if (stop) this._toRecover();
        break;
      }
      case 'slam':
        if ((this.t > 220 && m.body.blocked.down) || this.t > 2200) {
          this._hideMarks();
          this._blast(m.x, m.body.bottom, def.radius, 60, def.dmg, player, 0xff7733, true);
          const dmg = this._projDamage(def.waveDmg);
          const pool = getProjectilePool(m.scene);
          const f = this._force(def);
          pool.wave(m.x, m.body.bottom, 1, def.waveSpeed, def.waveLen, dmg, 0xffaa55, f);
          pool.wave(m.x, m.body.bottom, -1, def.waveSpeed, def.waveLen, dmg, 0xffaa55, f);
          this._toRecover();
        } else {
          // 空中：影子跟著本體，越接近地面越大越濃
          const k = Math.max(0, Math.min(1, 1 - (this.footY - m.body.bottom) / 320));
          this._shadowAt(0, m.x, this.footY, def.radius * (0.9 + 0.7 * k), 0.15 + 0.4 * k);
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
          if (circleHitsRect(c.x, c.y, 30, pb.center.x, pb.center.y, pb.halfWidth, pb.halfHeight)) {
            this.hit = true;
            this._hurt(player, def.dmg, 'dive', c.x, this._force(def));
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
            this._hurt(player, def.dmg * 0.8, 'leap', m.x, this._force(def));
          }
        }
        if ((this.t > 220 && m.body.blocked.down) || this.t > 2200) {
          if (!this.hit) this._blast(m.x, m.body.bottom, def.radius, 50, def.dmg * 0.7, player, 0xcc9966, false);
          else getProjectilePool(m.scene).fx('fx_smoke', m.x, m.body.bottom - 14, { scale: 0.7, normal: true, depth: 14 });
          this._toRecover();
        }
        break;
      default: this._toRecover(); break;
    }
  }

  _tickPop(player, dt) {
    const def = this.def, m = this.m;
    const p = Math.min(1, this.t / def.pop);
    if (this.t < def.pop - 350) {
      this.bx = m.clampToPlatform(this.bx + Math.max(-5, Math.min(5, player.x - this.bx)));
      m.x = this.bx;
    }
    // 地底快鑽出來：地面隆起透光、碎石和塵土一直被頂起來
    this._groundGlow(0, this.bx, this.footY, def.radius, p, 0xe0a050);
    if (this._emitTick(dt)) {
      const pool = getProjectilePool(m.scene);
      pool.mote(TEX.ROCK, this.bx + (Math.random() * 2 - 1) * def.radius * 0.7, this.footY - 4, (Math.random() - 0.5) * 60,
        -(90 + 120 * p + Math.random() * 60), 900, 500, ROCK_TINT, 0.8 + Math.random() * 0.5, 0.7, 1, false, 8, this.footY - 3);
      if (p > 0.5) this._dust(this.bx, this.footY - 6, 0, 1);
    }
    if (this.t >= def.pop) this._erupt(player);
  }

  _goUnderground(chain) {
    const m = this.m;
    this.chainLeft = chain;
    this.bx = m.x; this.footY = m.body.bottom;
    this.aimX = this.bx;
    getProjectilePool(m.scene).fx('fx_smoke', m.x, this.footY - 12, { scale: 0.8, normal: true, depth: 14 });
    m.setUnderground(true);
    this.stage = ST_EXEC; this.t = 0;
  }

  _erupt(player) {
    const def = this.def, m = this.m;
    m.setUnderground(false);
    m.setPosition(this.bx, this.footY);
    m.body.reset(this.bx, this.footY);
    m.setVelocityY(-260);
    this._hideMarks();
    this._blast(this.bx, this.footY, def.radius, 60, def.dmg, player, 0xc89040, true);
    if (this.chainLeft > 0) {
      this.chainLeft--;
      this._goUnderground(this.chainLeft);
      return;
    }
    this._toRecover();
  }

  _tickRecover(player) {
    const def = this.def, m = this.m;
    const comboNext = this.comboLeft > 0;
    const len = Math.max(1, comboNext ? def.comboGap : def.recover);
    const k = Math.max(0, 1 - this.t / len);
    if (this._ring && this._ring.visible) this._ring.setAlpha(0.8 * k);
    for (let i = 0; i < this._markN; i++) {
      const mk = this._marks[i];
      if (mk.visible) mk.setAlpha((mk.a0 ?? 0.5) * k);
    }
    if (this.t < len) return;
    // 連段：同一招立刻再來一次（重新瞄準、較短的前搖、不重算冷卻）
    if (comboNext && player && player.active && !player.isDead && m.active && !m.isDead && m.body) {
      this.comboLeft--;
      const idx = this.cur;
      this._hideTelegraphs();
      m._restoreTint();
      this._startAttack(idx, player, true);
      return;
    }
    this._endAttack((500 + Math.random() * 600) * this.gcdMult);
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
      if (this.openIdx >= 0 && player && player.active && !player.isDead && !m.isDead) {
        const idx = this.openIdx; this.openIdx = -1;
        this.gcd = 0;
        this._startAttack(idx, player, false);
      }
    }
  }

  _endAttack(gcd) {
    const m = this.m;
    this.stage = ST_IDLE; this.cur = -1; this.def = null; this.t = 0; this.comboLeft = 0;
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
    this.stage = ST_IDLE; this.comboLeft = 0;
    this._hideTelegraphs();
    for (const k of ['_glow', '_glint', '_orb', '_ring', '_aura']) {
      if (this[k]) { this[k].destroy(); this[k] = null; }
    }
    for (const mk of this._marks) mk.destroy();
    this._marks.length = 0; this._markN = 0;
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
    this.cdMult = ph.cdMult * this.baseCdMult; this.gcdMult = ph.gcdMult * this.baseGcdMult;
    this.dmgMult = ph.dmgMult; this.speedMult = ph.speedMult;
    if (ph.tint != null) m._baseTint = ph.tint;
    for (let i = 0; i < this.attacks.length; i++) {
      if (this.cds[i] <= 0 && i >= this.profile.attacks.length) this.cds[i] = 1500 + Math.random() * 2000;
    }
    this.openIdx = -1;
    if (ph.open) {
      for (let i = 0; i < this.attacks.length; i++) if (this.attacks[i].type === ph.open) { this.openIdx = i; break; }
    }
    this.comboLeft = 0;
    this._hideTelegraphs();
    if (m.body) m.body.setAllowGravity(true);
    this.stage = ST_ROAR; this.t = 0; this.roarMs = ph.roar ?? 1000; this.pulse2 = -1;
    m.setVelocityX(0);
    m.phase = idx + 1;
    if (ph.aura != null) this._setAura(ph.aura);
    // 咆哮震波：一圈擴散的柔光（不造成傷害，只是「階段切換」的節點感）
    const pool = getProjectilePool(m.scene);
    pool.impact(m.x, getVisualCenterY(m), ph.aura ?? ph.tint ?? 0xffffff, 7, 4, 650);
    m._onPhaseChange(idx + 1, ph);
    return true;
  }

  // ── 招式實作 ──
  _projDamage(mult) {
    return attackDamage(this.m.atk, mult, this.dmgMult, this.m._smoked ? SMOKE_DAMAGE_FACTOR : 1, Math.random());
  }

  _force(def) {
    const heavy = def.heavy || def.type === 'charge' || def.type === 'dive';
    return this.forceBase * (heavy ? 1.25 : 1);
  }

  _hurt(player, mult, tag, sourceX, force) {
    if (!player || player.isInvincible || player.isDead) return false;
    player.takeDamage(this._projDamage(mult), { sourceX: sourceX ?? this.m.x, force: force ?? this.forceBase });
    bump(aiStats.hit, tag);
    if ((force ?? 1) >= 1.6 && player.active && this.m.scene?.cameras) this.m.scene.cameras.main.shake(140, 0.007);
    return true;
  }

  // 地面範圍判定 + 演出。big = 主要重擊（完整特效）；false = 次要（只有爆光）
  _blast(cx, footY, radius, hMax, mult, player, tint, big) {
    const m = this.m, scene = m.scene;
    const pool = getProjectilePool(scene);
    if (player && !player.isDead && inGroundBlast(player.x, player.body.bottom, cx, footY, radius, hMax)) {
      this._hurt(player, mult, 'blast', cx, this._force(this.def || IMPLICIT_LEAP));
    }
    pool.impact(cx, footY - 10, tint, radius / 20, Math.max(2, hMax / 22), 320);
    if (big) {
      pool.fx('fx_smoke', cx, footY - 16, { scale: Math.max(0.6, radius / 90), normal: true, depth: 14 });
      pool.fx('fx_whirl', cx, footY - 30, { scale: Math.max(0.5, radius / 140), frameRate: 20, tint });
    }
    pool.shock(cx, footY - 4, radius * 1.15, tint, big ? 420 : 320);
    this._debris(cx, footY, radius, big ? 8 : 4);
    if (player && Math.abs(player.x - cx) < 700) {
      scene.cameras.main.shake(big ? 180 : 120, (radius > 120 ? 0.007 : 0.0045) * this.shakeMult);
    }
  }

  // 地面爆發：每個預警區各判定一次（玩家最多吃一下：受傷後有無敵時間），爆出光柱
  _erupNova(def, player) {
    const m = this.m, scene = m.scene;
    const pool = getProjectilePool(scene);
    const tint = def.tint ?? GROUND_TINT;
    const f = this._force(def);
    let hitDone = false;
    for (let i = 0; i < this.novaN; i++) {
      const x = this.novaX[i];
      if (!hitDone && player && !player.isDead && inGroundBlast(player.x, player.body.bottom, x, this.aimFeet, def.radius, def.hMax)) {
        hitDone = this._hurt(player, def.dmg, 'nova', x, f);
      }
      pool.impact(x, this.aimFeet - def.hMax * 0.6, tint, def.radius / 22, def.hMax / 9, 380);   // 光柱
      pool.fx('fx_whirl', x, this.aimFeet - 28, { scale: Math.max(0.45, def.radius / 140), frameRate: 22, tint });
      pool.shock(x, this.aimFeet - 4, def.radius * 1.1, tint, 380);
      // 噴發的火星往上竄
      const n = motionOk() ? 3 : 2;
      for (let j = 0; j < n; j++) {
        pool.mote(VFX_TEX.SOFT_GLOW, x + (Math.random() * 2 - 1) * def.radius * 0.6, this.aimFeet - 8, (Math.random() - 0.5) * 60,
          -(240 + Math.random() * 200), 300, 520, tint, 0.32, 0.08, 1, true);
      }
    }
    if (player && Math.abs(player.x - this.novaX[0]) < 700) scene.cameras.main.shake(170, 0.006 * this.shakeMult);
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
      pool.fire(def.kind, sx, sy, vx0 * c - vy0 * s, vx0 * s + vy0 * c, def.grav, def.life, dmg, def.tint, def.scale, this.forceBase);
    }
    pool.impact(sx, sy, def.tint ?? 0xffe9a0, 1.6, 1.6, 160);   // 槍口閃光
  }

  _fireRain(def, player) {
    const pool = getProjectilePool(this.m.scene);
    const dmg = this._projDamage(def.dmg);
    const n = Math.min(8, def.count);
    for (let i = 0; i < n; i++) {
      pool.fire(def.kind, this.rainX[i], -30 - i * 55, 0, def.speed, 0, 3000, dmg, def.tint, (def.scale || 1) * 1.15, this.forceBase);
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
      pool.fire(def.kind, cx, cy, Math.cos(a) * def.speed, Math.sin(a) * def.speed, 0, def.life, dmg, def.tint, def.scale, this.forceBase);
    }
    pool.impact(cx, cy, def.tint ?? 0xffffff, 4, 4, 420);
    pool.fx('fx_whirl', cx, cy, { scale: 1.2, frameRate: 20, tint: def.tint });
    shakeCam(m.scene, 160, 0.005 * this.shakeMult);
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
    getProjectilePool(m.scene).fx('fx_smoke', m.x, m.body.bottom - 20, { scale: 1.1, normal: true, tint: 0xc070ff, depth: 14 });
  }

  killMinions() {
    for (const mi of this.minions) {
      // 可能正在 enemies.getChildren().forEach 裡（範圍技打死召喚者）：當下只停用，這一幀結束後才銷毀，免得陣列被抽掉一格
      if (mi.active && !mi.isDead) {
        mi.isDead = true;
        mi.setActive(false).setVisible(false);
        if (mi.body) mi.body.enable = false;
        mi.scene.events.once('postupdate', () => { if (mi.scene) mi.destroy(); });
      }
    }
    this.minions.length = 0;
  }
}

function shakeCam(scene, ms, k) {
  if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.shake(ms, k);
}

// 兩個 0xRRGGBB 顏色依 k（0..1）混合
function lerpColor(a, b, k) {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k);
  return ((r & 255) << 16) | ((g & 255) << 8) | (bl & 255);
}

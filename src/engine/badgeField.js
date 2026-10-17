// 盜賊徽章的場景端實作（畫面、碰觸判定、撿起演出）；資料在 config/badges.js，規則在 engine/badges.js。
// BaseMapScene 進圖時建立一次：只放這個存檔還沒撿的徽章；沒有徽章的地圖（Boss 房、副本）回傳 null。
// 效能：物件在建立時一次配好；update 每幀只對剩下的幾枚做矩形距離運算，不配置新物件。

import Phaser from 'phaser';
import { BADGE_COUNT, BADGE_NAME, BADGE_TEXTURE, BADGE_TOUCH_RADIUS } from '../config/badges.js';
import { grantBadge, remainingBadgesOnMap } from './badges.js';
import { VFX_TEX } from './vfxTextures.js';
import { spawnLightRays } from './vfx.js';
import { getQualityLevel } from './quality.js';
import { audio } from './audio.js';
import { saveGame } from './saveGame.js';

const DEPTH = 9;           // 在平台（5）與 NPC（8）之上、玩家（20）之下
const BOB_PX = 6;          // 上下浮動幅度
const TEX_W = 60, TEX_H = 68, TEX_SCALE = 0.6;   // 以較高解析度繪製再縮小，邊緣比較乾淨

// 程式繪製的徽章：金框盾牌、深紫底、中央一顆星與交叉的兩把短刀（冪等，只畫一次）
export function ensureBadgeTexture(scene) {
  if (scene.textures.exists(BADGE_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const shield = (inset) => {
    const l = 4 + inset, r = TEX_W - 4 - inset, t = 4 + inset, b = TEX_H - 4 - inset, cx = TEX_W / 2;
    return [
      new Phaser.Geom.Point(cx, t), new Phaser.Geom.Point(r, t + 10), new Phaser.Geom.Point(r, t + 30),
      new Phaser.Geom.Point(r - 6, b - 16), new Phaser.Geom.Point(cx, b), new Phaser.Geom.Point(l + 6, b - 16),
      new Phaser.Geom.Point(l, t + 30), new Phaser.Geom.Point(l, t + 10),
    ];
  };
  g.fillStyle(0x5a3208, 1); g.fillPoints(shield(0), true);          // 外緣暗金
  g.fillStyle(0xf2c14e, 1); g.fillPoints(shield(3), true);          // 金框
  g.fillStyle(0xffe69a, 1); g.fillPoints(shield(3).slice(0, 3).concat([new Phaser.Geom.Point(TEX_W / 2, 30)]), true);   // 右上高光
  g.fillStyle(0x2c1a52, 1); g.fillPoints(shield(9), true);          // 深紫底
  // 交叉短刀（銀色刀身 + 金色護手）
  const blade = (dir) => {
    const cx = TEX_W / 2, cy = 36;
    g.lineStyle(4, 0xd9e4f2, 1);
    g.lineBetween(cx - dir * 14, cy - 16, cx + dir * 11, cy + 12);
    g.lineStyle(4, 0xc8962a, 1);
    g.lineBetween(cx + dir * 6, cy + 1, cx + dir * 15, cy + 7);
  };
  blade(1); blade(-1);
  // 中央星星
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? 11 : 4.6;
    star.push(new Phaser.Geom.Point(TEX_W / 2 + Math.cos(a) * rad, 30 + Math.sin(a) * rad));
  }
  g.fillStyle(0xfff3b0, 1); g.fillPoints(star, true);
  g.lineStyle(1.5, 0xb8860b, 1); g.strokePoints(star, true);
  g.generateTexture(BADGE_TEXTURE, TEX_W, TEX_H);
  g.destroy();
}

export function createBadgeField(scene) {
  const gs = scene.registry.get('gameState');
  const list = remainingBadgesOnMap(gs, scene.mapKey);
  if (list.length === 0) return null;
  return new BadgeField(scene, list);
}

class BadgeField {
  constructor(scene, list) {
    this.scene = scene;
    this.tweens = [];
    this.items = [];
    ensureBadgeTexture(scene);
    const low = getQualityLevel(scene) === 'low';
    const hasGlow = scene.textures.exists(VFX_TEX.SOFT_GLOW);
    for (const def of list) {
      const glow = hasGlow
        ? scene.add.image(def.x, def.y, VFX_TEX.SOFT_GLOW).setDepth(DEPTH).setTint(0xffd86a)
          .setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.55)
        : null;
      const icon = scene.add.image(def.x, def.y, BADGE_TEXTURE).setDepth(DEPTH).setScale(TEX_SCALE);
      const targets = glow ? [icon, glow] : [icon];
      this.tweens.push(scene.tweens.add({
        targets, y: def.y - BOB_PX, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
      if (glow) {
        this.tweens.push(scene.tweens.add({
          targets: glow, alpha: 0.9, scale: 1.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        }));
      }
      // 閃光：周圍偶爾冒出小星星（低品質時不放）
      const sparkle = !low && scene.textures.exists('particle-star')
        ? scene.add.particles(def.x, def.y, 'particle-star', {
          x: { min: -16, max: 16 }, y: { min: -18, max: 14 }, lifespan: 800, frequency: 420, quantity: 1,
          scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, speedY: { min: -18, max: -6 },
          tint: [0xffffff, 0xfff0a0], blendMode: 'ADD',
        }).setDepth(DEPTH + 1)
        : null;
      this.items.push({ def, icon, glow, sparkle, taken: false });
    }
  }

  update() {
    const player = this.scene.player;
    const body = player && player.body;
    if (!body || player.isDead) return;
    const r2 = BADGE_TOUCH_RADIUS * BADGE_TOUCH_RADIUS;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.taken) continue;
      // 徽章中心（含浮動）到玩家身體方框的最近距離
      const bx = it.icon.x, by = it.icon.y;
      const dx = bx < body.left ? body.left - bx : bx > body.right ? bx - body.right : 0;
      const dy = by < body.top ? body.top - by : by > body.bottom ? by - body.bottom : 0;
      if (dx * dx + dy * dy <= r2) this._collect(it);
    }
  }

  _collect(it) {
    const scene = this.scene;
    const gs = scene.registry.get('gameState');
    it.taken = true;
    const res = grantBadge(gs, it.def.id);
    this._removeVisuals(it);
    if (!res) return;
    scene.registry.set('gameState', gs);
    audio.playBadge();
    const { x, y } = it.def;
    spawnLightRays(scene, x, y, { length: 70, color: 0xffe27a, alpha: 0.6, duration: 500, depth: 60 });
    const t = scene.add.text(x, y - 18, `${BADGE_NAME} ${res.count}/${BADGE_COUNT}`, {
      fontSize: '16px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#2a1606', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(90);
    scene.tweens.add({ targets: t, y: y - 64, alpha: 0, duration: 1600, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    if (res.rewards.length > 0) {
      scene.registry.events.emit('changedata-meso', null, gs.meso);
      const r = res.rewards[res.rewards.length - 1];
      if (typeof scene._showTransientMessage === 'function') {
        scene._showTransientMessage(`${BADGE_NAME}收集 ${r.at} 枚！\n獎勵：${res.rewards.map((o) => o.text).join('、')}`, 3600);
      }
    }
    saveGame(gs);   // 撿到就存，不等 30 秒自動存檔
  }

  _removeVisuals(it) {
    for (const o of [it.icon, it.glow]) {
      if (!o) continue;
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    if (it.sparkle) { it.sparkle.destroy(); it.sparkle = null; }
    it.icon = { x: it.def.x, y: it.def.y };   // update 的判定已略過 taken，留一個純座標避免讀到已銷毀物件
    it.glow = null;
  }

  // 除錯 / e2e 用：目前畫面上還沒撿的徽章
  remaining() {
    return this.items.filter((it) => !it.taken).map((it) => it.def);
  }

  destroy() {
    for (const tw of this.tweens) if (tw) tw.stop();
    this.tweens = [];
    for (const it of this.items) if (it.sparkle) { it.sparkle.destroy(); it.sparkle = null; }
    this.items = [];
  }
}

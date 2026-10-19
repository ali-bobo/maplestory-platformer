// 地圖氛圍（場景端實作）：色調漸層、暗角、背景光束、環境粒子、雲朵 / 海鷗 / 流星 / 霓虹等小彩蛋、
// 進圖標題卡，以及裝備掉落的稀有度光暈。設定在 config/ambience.js，數學在 ambienceLogic.js。
//
// 效能原則（與 mapModifiers.js 相同）：
//  - 紋理在 BootScene 一次生成（initAmbienceTextures），之後只建 Image / 粒子發射器
//  - 每層粒子用 maxAliveParticles 封頂，總數 ≤ AMBIENCE_BUDGET，依品質倍率縮減
//  - update 只做數字運算與 setPosition / setAlpha，不配置新物件
//  - 「減少動態」開啟時不建粒子、不播動畫，只保留靜態色調與暗角；設定 / 品質中途改變就重建動態層
//  - 場景 shutdown 時 destroy() 清掉 tween、計時器、事件監聽與物件

import Phaser from 'phaser';
import { WORLD_HEIGHT } from '../config/constants.js';
import { RARITY_GLOW } from '../config/ambience.js';
import { getQuality, getQualityLevel } from './quality.js';
import { settings } from './settings.js';
import { VFX_TEX } from './vfxTextures.js';
import { ambienceFor, ambienceScale, layerCount, spawnWidth, emitFrequency, shouldShowTitle } from './ambienceLogic.js';

const VIEW_W = 1280;
const GROUND_Y = WORLD_HEIGHT;
const ADD = Phaser.BlendModes.ADD;

export const AMB_TEX = {
  EDGE: 'amb_edge',           // 8×64 由黑到透明的邊緣漸層（暗角用：四條貼邊，角落自然疊深）
  RAY: 'amb_ray',             // 96×512 光束（左右、上下都淡出）
  CLOUD: 'amb_cloud',         // 256×112 柔邊雲朵
  PETAL: 'amb_petal',         // 10×7 花瓣
  LEAF: 'amb_leaf',           // 12×6 葉子
  STREAK: 'amb_streak',       // 2×26 雨絲
  SAND: 'amb_sand',           // 28×3 沙塵
  BOKEH: 'amb_bokeh',         // 32×32 散景光斑
  GULL: 'amb_gull',           // 24×10 海鷗剪影
  RIPPLE: 'amb_ripple',       // 24×6 雨滴漣漪
  STAR_STREAK: 'amb_star_streak', // 160×6 流星尾跡
};

// 深度：背景圖 -9、底色 -10；光束 / 雲 -8、背景粒子 -7；跳台 5、角色 20；
// 前景粒子 24、暗角 38（傷害數字 / 特效在更上層）
const D_RAYS = -8, D_BACK = -7, D_RIPPLE = 6, D_FRONT = 24, D_VIGNETTE = 38, D_TITLE = 200;

// ── 紋理（開機一次；重複呼叫只會略過已存在的） ─────────────────────────────────
function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext(), w, h);
  tex.refresh();
}

function graphicsTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function initAmbienceTextures(scene) {
  try {
    canvasTex(scene, AMB_TEX.EDGE, 8, 64, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.4, 'rgba(0,0,0,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    canvasTex(scene, AMB_TEX.RAY, 96, 512, (c, w, h) => {
      const gx = c.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(255,255,255,0)');
      gx.addColorStop(0.5, 'rgba(255,255,255,1)');
      gx.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gx; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'destination-in';
      const gy = c.createLinearGradient(0, 0, 0, h);
      gy.addColorStop(0, 'rgba(0,0,0,0.9)');
      gy.addColorStop(0.7, 'rgba(0,0,0,0.35)');
      gy.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gy; c.fillRect(0, 0, w, h);
    });
    canvasTex(scene, AMB_TEX.CLOUD, 256, 112, (c) => {
      const puffs = [[70, 70, 44], [120, 52, 52], [175, 66, 42], [210, 80, 30], [40, 84, 28], [140, 84, 40]];
      for (const [x, y, r] of puffs) {
        const gr = c.createRadialGradient(x, y, r * 0.2, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.85)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    });
    canvasTex(scene, AMB_TEX.BOKEH, 32, 32, (c) => {
      const gr = c.createRadialGradient(16, 16, 4, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 32, 32);
    });
    canvasTex(scene, AMB_TEX.STREAK, 2, 26, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    canvasTex(scene, AMB_TEX.SAND, 28, 3, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    canvasTex(scene, AMB_TEX.STAR_STREAK, 160, 6, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.85, 'rgba(255,255,255,0.8)');
      gr.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = gr; c.fillRect(0, 2, w, 2);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(w * 0.5, 1, w * 0.5, 4);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w - 3, h / 2, 3, 0, Math.PI * 2); c.fill();
    });
    graphicsTex(scene, AMB_TEX.PETAL, 10, 7, (g) => {
      g.fillStyle(0xffffff, 0.95); g.fillEllipse(5, 3.5, 10, 6);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(4, 3, 5, 3);
    });
    graphicsTex(scene, AMB_TEX.LEAF, 12, 6, (g) => {
      g.fillStyle(0xffffff, 1); g.fillEllipse(6, 3, 12, 5);
      g.lineStyle(1, 0x000000, 0.25); g.lineBetween(1, 3, 11, 3);
    });
    graphicsTex(scene, AMB_TEX.GULL, 24, 10, (g) => {
      g.lineStyle(2, 0xffffff, 1);
      g.beginPath(); g.moveTo(1, 3); g.lineTo(6, 1); g.lineTo(12, 7); g.lineTo(18, 1); g.lineTo(23, 3); g.strokePath();
    });
    graphicsTex(scene, AMB_TEX.RIPPLE, 24, 6, (g) => {
      g.lineStyle(1, 0xffffff, 1); g.strokeEllipse(12, 3, 22, 4);
    });
  } catch (_) { /* 紋理建立失敗：氛圍效果會自動略過缺圖的部分 */ }
}

// 乘法色調：把 color 以 a 的比例混進白色（a = 0 不變色）
function mixWhite(color, a) {
  const k = Math.min(1, Math.max(0, a));
  const r = 255 + (((color >> 16) & 255) - 255) * k;
  const g = 255 + (((color >> 8) & 255) - 255) * k;
  const b = 255 + ((color & 255) - 255) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ── 粒子層：kind → 發射器設定 ─────────────────────────────────────────────────
// 左右輕擺（花瓣 / 葉子 / 雪片 / 火星）：每幀 x 加一點正弦位移，相位依粒子壽命錯開
function sway(amp, waves) {
  const w = Math.PI * 2 * waves;
  return { onEmit: () => 0, onUpdate: (p, k, t, v) => v + Math.sin(t * w + p.life * 0.001) * amp };
}

const KINDS = {
  petal:   { tex: AMB_TEX.PETAL, life: [13000, 17000], band: [-20, -6], wind: 360, speedX: [-38, -14], speedY: [26, 46], rotate: { start: 0, end: 540 }, scale: [1.1, 1.7], alpha: [0.9, 0.6], sway: [0.55, 3] },
  leaf:    { tex: AMB_TEX.LEAF, life: [11000, 15000], band: [-20, -6], wind: 260, speedX: [-30, -8], speedY: [34, 58], rotate: { start: 0, end: 720 }, scale: [0.8, 1.2], alpha: [0.95, 0.7], sway: [0.7, 3] },
  firefly: { tex: 'particle-dot', add: true, life: [5000, 8000], band: [220, 580], speedX: [-14, 14], speedY: [-14, 8], scale: [0.8, 1.4], alphaValues: [0, 1, 0.35, 1, 0], sway: [0.35, 2] },
  mote:    { tex: 'particle-dot', add: true, life: [6000, 8000], band: [300, 600], speedX: [-8, 8], speedY: [-42, -20], scaleStart: [1.2, 0.3], alphaValues: [0, 0.95, 0], sway: [0.4, 2] },
  twinkle: { tex: 'particle-star', add: true, life: [2400, 4000], band: [20, 300], speedX: [0, 0], speedY: [0, 0], scale: [0.35, 0.8], alphaValues: [0, 1, 0] },
  rain:    { tex: AMB_TEX.STREAK, life: [760, 900], band: [-40, -20], wind: 160, speedX: [-130, -110], speedY: [720, 860], rotateFixed: 8.5, scale: [1, 1.5], alpha: [0.7, 0.7] },
  spray:   { tex: 'particle-dot', life: [1200, 1700], band: [560, 600], speedX: [-30, 30], speedY: [-130, -60], gravityY: 120, scaleStart: [0.6, 0.1], alpha: [0.75, 0] },
  dust:    { tex: 'particle-dot', life: [8000, 11000], band: [60, 580], speedX: [-9, 9], speedY: [-6, 6], scale: [0.4, 0.8], alphaValues: [0, 0.75, 0], sway: [0.25, 1] },
  sand:    { tex: AMB_TEX.SAND, life: [2200, 3000], band: [300, 600], wind: 700, speedX: [-400, -260], speedY: [-12, 16], scale: [0.7, 1.6], alphaValues: [0, 0.7, 0] },
  flake:   { tex: 'particle-dot', life: [9000, 12000], band: [-20, -6], wind: 160, speedX: [-20, -6], speedY: [44, 70], scale: [1.2, 1.8], alpha: [0.8, 0.5], sway: [0.6, 2] },
  ember:   { tex: 'particle-dot', add: true, life: [4000, 5200], band: [520, 600], speedX: [-22, 22], speedY: [-115, -55], scaleStart: [0.75, 0.15], alphaValues: [0, 1, 0], sway: [0.5, 2] },
  ash:     { tex: 'particle-dot', life: [12000, 15000], band: [-20, -6], wind: 160, speedX: [-16, -4], speedY: [18, 36], scale: [0.4, 0.7], alpha: [0.7, 0.4], sway: [0.4, 2] },
  candle:  { tex: 'particle-dot', add: true, life: [7000, 9000], band: [260, 600], speedX: [-6, 6], speedY: [-26, -10], scale: [0.45, 0.9], alphaValues: [0, 0.85, 0], sway: [0.3, 2] },
  bokeh:   { tex: AMB_TEX.BOKEH, add: true, life: [5000, 7000], band: [40, 380], speedX: [-6, 6], speedY: [-5, 5], scale: [0.5, 1.3], alphaValues: [0, 0.28, 0] },
};

function rng(a) { return { min: a[0], max: a[1] }; }

function buildEmitter(scene, layer, count, mapW) {
  const k = KINDS[layer.kind];
  if (!k || !scene.textures.exists(k.tex) || count <= 0) return null;
  const sf = layer.sf ?? 0.5;
  const w = spawnWidth(VIEW_W, mapW, sf, k.wind || 0);
  const band = layer.band || k.band;
  const life = (k.life[0] + k.life[1]) / 2;
  const mul = layer.scale || 1;
  const a = layer.alpha;
  const cfg = {
    emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, band[0], w, band[1] - band[0]), quantity: 1 },
    lifespan: rng(k.life),
    speedX: rng(k.speedX),
    speedY: rng(k.speedY),
    frequency: emitFrequency(life, count),
    quantity: 1,
    maxAliveParticles: count,
    tint: layer.tint || 0xffffff,
    advance: life,   // 一進圖就是「下了一陣子」的樣子，不會從空白開始
  };
  if (k.scale) cfg.scale = { min: k.scale[0] * mul, max: k.scale[1] * mul };
  if (k.scaleStart) cfg.scale = { start: k.scaleStart[0] * mul, end: k.scaleStart[1] * mul };
  if (k.alphaValues) cfg.alpha = { values: a !== undefined ? k.alphaValues.map((v) => v * a) : k.alphaValues };
  else if (k.alpha) cfg.alpha = { start: k.alpha[0] * (a ?? 1), end: k.alpha[1] * (a ?? 1) };
  if (k.rotate) cfg.rotate = k.rotate;
  if (k.rotateFixed !== undefined) cfg.rotate = k.rotateFixed;
  if (k.gravityY) cfg.gravityY = k.gravityY;
  if (k.sway) cfg.x = sway(k.sway[0], k.sway[1]);
  if (k.add) cfg.blendMode = 'ADD';
  const em = scene.add.particles(0, 0, k.tex, cfg);
  em.setScrollFactor(sf).setDepth(layer.front ? D_FRONT : D_BACK);
  return em;
}

// ── 主體 ─────────────────────────────────────────────────────────────────────
let lastTitleMap = null;   // 跨場景記住上一次顯示標題卡的地圖（同一張圖重新開始不重播）

export function createAmbience(scene, opts = {}) {
  const preset = ambienceFor(scene.mapKey, scene.mapData?.bgType);
  if (!preset) return null;
  initAmbienceTextures(scene);   // 冪等：開機已建過就直接略過
  return new Ambience(scene, preset, opts);
}

class Ambience {
  constructor(scene, preset, opts) {
    this.scene = scene;
    this.preset = preset;
    this.mapW = scene.mapData?.width || VIEW_W;
    this.overlayObjs = [];  // 光束 / 暗角（只在高品質；減少動態時不動但保留）
    this._bg = null;        // 背景圖（色調用頂點 tint 染在它上面）
    this.motionObjs = [];   // 粒子 / 彩蛋（減少動態時不建）
    this._starTimer = null;
    this._buzzTimer = null;
    this.clouds = [];
    this.gulls = [];
    this.glows = [];        // 掉落物光暈 { pickup, glow, beam }
    this.title = null;
    this._motion = settings.motionAllowed();
    this._quality = scene.registry?.get('qualityLevel');

    this._buildStatic();
    this._buildMotion();
    if (!this._motion) this._buildOverlays();
    if (shouldShowTitle({ preset, mapKey: scene.mapKey, lastMapKey: lastTitleMap, respawn: opts.respawn })) {
      this._showTitle(scene.mapData?.name || '', preset.subtitle);
    }
    lastTitleMap = scene.mapKey;

    this._onUpdate = (time, delta) => this.update(time, delta);
    scene.events.on('update', this._onUpdate);
    // 設定（減少動態）或自適應品質中途改變：重建動態層
    this._unsub = settings.subscribe(() => this._refresh());
    this._onQuality = () => this._refresh();
    scene.registry?.events.on('changedata-qualityLevel', this._onQuality);
  }

  // 光束 / 霓虹的呼吸：不另外記錄，拆掉時以 killTweensOf 一併清掉（品質切換重建不會累積）
  _overlayLoop(cfg) {
    this.scene.tweens.add({ repeat: -1, yoyo: true, ease: 'Sine.easeInOut', ...cfg });
  }

  // 色調：直接把背景圖的上 / 下兩邊頂點染色（乘法），不多畫一張全螢幕圖，零額外填充成本；
  // 只影響背景，角色 / 怪物 / 掉落物的顏色完全不變
  _buildStatic() {
    const p = this.preset;
    const bg = this.scene._bgImage;
    if (!p.wash || !bg || !bg.active) return;
    this._bg = bg;
    this._topTint = p.wash.top ? mixWhite(p.wash.top[0], p.wash.top[1]) : 0xffffff;
    this._applyWash(1);
  }

  _applyWash(bottomK) {
    const w = this.preset.wash;
    const bottom = w.bottom ? mixWhite(w.bottom[0], w.bottom[1] * bottomK) : 0xffffff;
    this._bg.setTint(this._topTint, this._topTint, bottom, bottom);
  }

  // 光束與暗角是半透明大圖（吃填充率）：只在高品質才畫，自適應品質降級時會自動拿掉
  _buildOverlays() {
    const s = this.scene, p = this.preset;
    if (getQualityLevel(s) !== 'high') return;
    if (p.rays && s.textures.exists(AMB_TEX.RAY)) {
      const n = p.rays.count || 2;
      for (let i = 0; i < n; i++) {
        const x = (VIEW_W / (n + 1)) * (i + 1) + (i % 2 ? 60 : -40);
        const ray = s.add.image(x, -20, AMB_TEX.RAY).setOrigin(0.5, 0).setScale(1.1 + (i % 2) * 0.4, 1.0)
          .setRotation(-0.32).setTint(p.rays.tint).setAlpha(p.rays.alpha).setBlendMode(ADD)
          .setScrollFactor(0.25).setDepth(D_RAYS);
        this.overlayObjs.push(ray);
        if (this._motion) this._overlayLoop({ targets: ray, alpha: p.rays.alpha * 0.45, duration: 4200 + Math.random() * 1800 });
      }
    }
    if (p.extras?.neon) this._buildNeon(p.extras.neon);
    if (p.vignette > 0 && s.textures.exists(AMB_TEX.EDGE)) {
      // 暗角：不用整張全螢幕圖（中間透明也要算填充），改成四條貼邊的漸層，面積不到一半；角落兩條疊在一起自然較深
      const H = GROUND_Y, a = p.vignette, top = 130, side = 170;
      const edge = (x, y, w, h, rot) => this.overlayObjs.push(s.add.image(x, y, AMB_TEX.EDGE).setOrigin(0, 0)
        .setDisplaySize(w, h).setRotation(rot).setAlpha(a).setScrollFactor(0).setDepth(D_VIGNETTE));
      edge(0, 0, VIEW_W, top, 0);                                   // 上
      edge(VIEW_W, H, VIEW_W, top, Math.PI);                        // 下（轉 180°）
      edge(0, H, H, side, -Math.PI / 2);                            // 左
      edge(VIEW_W, 0, H, side, Math.PI / 2);                        // 右
    }
  }

  // 動態層：粒子、雲、海鷗、流星、霓虹、漣漪，以及靜態層的呼吸動畫
  _buildMotion() {
    if (!this._motion) return;
    const s = this.scene, p = this.preset;
    const q = getQuality(s);
    for (const layer of p.layers || []) {
      const n = layerCount(layer.count, { particleScale: q.particleScale, reducedMotion: false });
      const em = buildEmitter(s, layer, n, this.mapW);
      if (em) { em._amb = { base: layer.count, life: (KINDS[layer.kind].life[0] + KINDS[layer.kind].life[1]) / 2 }; this.motionObjs.push(em); }
    }
    this._buildOverlays();
    const ex = p.extras || {};
    if (ex.clouds) this._buildClouds(ex.clouds);
    if (ex.gulls) this._buildGulls(ex.gulls);
    if (ex.shootingStar) this._buildShootingStar();
    if (ex.ripples) this._buildRipples(Math.max(1, Math.round(ex.ripples * ambienceScale(q.particleScale))));   // 品質中途改變時依 _amb.base 重算
  }

  _buildClouds(n) {
    const s = this.scene;
    if (!s.textures.exists(AMB_TEX.CLOUD)) return;
    for (let i = 0; i < n; i++) {
      const sc = 0.9 + Math.random() * 0.9;
      const c = s.add.image((VIEW_W / n) * i + Math.random() * 200, 40 + Math.random() * 170, AMB_TEX.CLOUD)
        .setScale(sc, sc * 0.8).setAlpha(0.45 + Math.random() * 0.3).setScrollFactor(0.12).setDepth(D_RAYS);
      c._vx = -(6 + Math.random() * 10);
      this.clouds.push(c);
      this.motionObjs.push(c);
    }
  }

  _buildGulls(n) {
    const s = this.scene;
    if (!s.textures.exists(AMB_TEX.GULL)) return;
    for (let i = 0; i < n; i++) {
      const g = s.add.image(0, 0, AMB_TEX.GULL).setTint(0x2a2f38).setAlpha(0.85).setScrollFactor(0.3).setDepth(D_BACK);
      this._resetGull(g, true);
      this.gulls.push(g);
      this.motionObjs.push(g);
    }
  }

  _resetGull(g, first) {
    const cam = this.scene.cameras.main;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const base = cam.scrollX * 0.3;
    g._dir = dir;
    g._vx = dir * (55 + Math.random() * 45);
    g._baseY = 50 + Math.random() * 170;
    g._phase = Math.random() * 6.28;
    g._wait = first ? Math.random() * 4000 : 2000 + Math.random() * 6000;
    const sc = 0.7 + Math.random() * 0.5;
    g.setScale(sc).setFlipX(dir > 0).setVisible(false);
    g.x = dir > 0 ? base - 40 : base + VIEW_W + 40;
    g.y = g._baseY;
  }

  _buildShootingStar() {
    const s = this.scene;
    if (!s.textures.exists(AMB_TEX.STAR_STREAK)) return;
    const star = s.add.image(0, 0, AMB_TEX.STAR_STREAK).setOrigin(1, 0.5).setBlendMode(ADD)
      .setScrollFactor(0).setDepth(D_RAYS).setVisible(false);
    this.motionObjs.push(star);
    const fire = () => {
      this._starTimer = null;
      if (!star.active) return;
      const x0 = 200 + Math.random() * 700, y0 = 30 + Math.random() * 120;
      const ang = 0.3 + Math.random() * 0.25;
      star.setPosition(x0, y0).setRotation(ang).setAlpha(0).setScale(0.6, 1).setVisible(true);
      const dist = 320 + Math.random() * 180;
      s.tweens.add({
        targets: star, x: x0 + Math.cos(ang) * dist, y: y0 + Math.sin(ang) * dist, scaleX: 1.1,
        duration: 900, ease: 'Quad.easeIn',
        onUpdate: (tw) => { const t = tw.progress; star.alpha = t < 0.2 ? t * 5 : (1 - t) * 1.25; },
        onComplete: () => { if (star.active) star.setVisible(false); },
      });
      this._starTimer = s.time.delayedCall(7000 + Math.random() * 8000, fire);
    };
    this._starTimer = s.time.delayedCall(2500 + Math.random() * 4000, fire);
  }

  // 霓虹招牌的光暈：畫面左右上角兩團柔光，偶爾「滋」地暗一下（閃光設定關閉時不閃）
  _buildNeon(colors) {
    const s = this.scene;
    if (!s.textures.exists(VFX_TEX.SOFT_GLOW)) return;
    const spots = [[70, 110], [VIEW_W - 90, 80]];
    const lights = spots.map(([x, y], i) => s.add.image(x, y, VFX_TEX.SOFT_GLOW).setTint(colors[i % colors.length])
      .setBlendMode(ADD).setScale(7, 5).setAlpha(0.26).setScrollFactor(0).setDepth(D_RAYS));
    this.overlayObjs.push(...lights);
    if (!this._motion) return;
    for (const l of lights) this._overlayLoop({ targets: l, alpha: 0.15, duration: 2200 + Math.random() * 1200 });
    if (!settings.flashAllowed()) return;
    const buzz = () => {
      this._buzzTimer = null;
      const l = lights[Math.random() < 0.5 ? 0 : 1];
      if (l?.active) s.tweens.add({ targets: l, alpha: 0.04, duration: 60, yoyo: true, repeat: 1 });
      this._buzzTimer = s.time.delayedCall(2500 + Math.random() * 4000, buzz);
    };
    this._buzzTimer = s.time.delayedCall(1500, buzz);
  }

  // 地面雨滴漣漪：世界座標，沿整張地圖的地面
  _buildRipples(n) {
    const s = this.scene;
    if (!s.textures.exists(AMB_TEX.RIPPLE)) return;
    const em = s.add.particles(0, 0, AMB_TEX.RIPPLE, {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, GROUND_Y - 4, this.mapW, 3), quantity: 1 },
      lifespan: 700, frequency: emitFrequency(700, n * 2), quantity: 1, maxAliveParticles: n * 2,
      scaleX: { start: 0.2, end: 1.3 }, scaleY: { start: 0.2, end: 1 }, alpha: { start: 0.55, end: 0 },
      tint: 0xcfe0ff, speedX: 0, speedY: 0,
    });
    em.setDepth(D_RIPPLE);
    em._amb = { base: (this.preset.extras.ripples || n) * 2, life: 700 };
    this.motionObjs.push(em);
  }

  _teardownMotion() {
    if (this._starTimer) { this._starTimer.remove(false); this._starTimer = null; }
    if (this._buzzTimer) { this._buzzTimer.remove(false); this._buzzTimer = null; }
    const tm = this.scene.tweens;
    for (const o of this.motionObjs) {
      if (!o || o.active === false) continue;
      tm.killTweensOf(o);   // 流星 / 霓虹的一次性 tween
      o.destroy();
    }
    this.motionObjs.length = 0;
    this.clouds.length = 0;
    this.gulls.length = 0;
    for (const o of this.overlayObjs) {
      if (!o || o.active === false) continue;
      tm.killTweensOf(o);
      o.destroy();
    }
    this.overlayObjs.length = 0;
    // 下緣色調的呼吸停了：回到原本的顏色
    if (this._bg?.active) this._applyWash(1);
  }

  _refresh() {
    const motion = settings.motionAllowed();
    const quality = this.scene.registry?.get('qualityLevel');
    if (motion === this._motion && quality === this._quality) return;
    if (motion === this._motion && motion) {
      // 只有品質變了：粒子層就地調整上限與發射頻率（不重建，畫面不會突然清空），光束 / 暗角依品質加減
      this._quality = quality;
      const scale = getQuality(this.scene).particleScale;
      for (const o of this.motionObjs) {
        if (!o._amb || !o.active) continue;
        const n = layerCount(o._amb.base, { particleScale: scale });
        o.maxAliveParticles = n;
        o.frequency = emitFrequency(o._amb.life, n);
      }
      const tm = this.scene.tweens;
      for (const o of this.overlayObjs) { if (o && o.active !== false) { tm.killTweensOf(o); o.destroy(); } }
      this.overlayObjs.length = 0;
      if (this._buzzTimer) { this._buzzTimer.remove(false); this._buzzTimer = null; }
      this._buildOverlays();
      return;
    }
    this._motion = motion;
    this._quality = quality;
    this._teardownMotion();
    this._buildMotion();
    if (!motion) this._buildOverlays();   // 減少動態：粒子不建，但光束 / 暗角（靜止）照樣保留
    for (const g of this.glows) this._styleGlow(g);
  }

  // ── 進圖標題卡 ─────────────────────────────────────────────────────────────
  _showTitle(name, subtitle) {
    const s = this.scene;
    if (!name) return;
    const cx = VIEW_W / 2, cy = 168;
    const c = s.add.container(cx, cy).setScrollFactor(0).setDepth(D_TITLE).setAlpha(0);
    if (s.textures.exists(VFX_TEX.SOFT_GLOW)) c.add(s.add.image(0, 4, VFX_TEX.SOFT_GLOW).setTint(0x000000).setScale(11, 2.1).setAlpha(0.55));
    const title = s.add.text(0, -8, name, {
      fontSize: '40px', fontFamily: 'Arial', fontStyle: 'bold', color: '#fff4d6', stroke: '#2a1606', strokeThickness: 6,
    }).setOrigin(0.5);
    const half = title.width / 2 + 22;
    const lineL = s.add.rectangle(-half, -6, 90, 2, 0xffe2a0, 0.9).setOrigin(1, 0.5);
    const lineR = s.add.rectangle(half, -6, 90, 2, 0xffe2a0, 0.9).setOrigin(0, 0.5);
    const gemL = s.add.rectangle(-half - 90, -6, 7, 7, 0xffe2a0).setAngle(45);
    const gemR = s.add.rectangle(half + 90, -6, 7, 7, 0xffe2a0).setAngle(45);
    c.add([lineL, lineR, gemL, gemR, title]);
    if (subtitle) {
      c.add(s.add.text(0, 30, subtitle, {
        fontSize: '16px', fontFamily: 'Arial', color: '#f2e6cc', stroke: '#1a0e04', strokeThickness: 4,
      }).setOrigin(0.5));
    }
    this.title = c;
    const motion = this._motion;
    if (motion) { c.y = cy + 14; lineL.scaleX = 0; lineR.scaleX = 0; }
    s.tweens.add({ targets: c, alpha: 1, y: cy, duration: 450, ease: 'Cubic.easeOut' });
    if (motion) s.tweens.add({ targets: [lineL, lineR], scaleX: 1, duration: 600, delay: 150, ease: 'Cubic.easeOut' });
    s.tweens.add({
      targets: c, alpha: 0, delay: 2300, duration: 700, ease: 'Sine.easeIn',
      onComplete: () => { if (this.title === c) this.title = null; c.destroy(); },
    });
  }

  // ── 掉落物光暈（裝備依稀有度、星光碎片金色） ─────────────────────────────────
  _decoratePickups() {
    const group = this.scene.pickups;
    if (!group || group.getLength() === 0) return;
    const list = group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const pk = list[i];
      if (pk._ambGlow || !pk.active) continue;
      pk._ambGlow = true;
      let style = null;
      if (pk.pickupType === 'equipment') style = RARITY_GLOW[pk.pickupData?.rarity] || RARITY_GLOW.common;
      else if (pk.pickupType === 'shard') style = RARITY_GLOW.legendary;
      if (!style) continue;
      this._addGlow(pk, style);
    }
  }

  _addGlow(pk, style) {
    const s = this.scene;
    if (!s.textures.exists(VFX_TEX.SOFT_GLOW)) return;
    const glow = s.add.image(pk.x, pk.y, VFX_TEX.SOFT_GLOW).setTint(style.tint).setBlendMode(ADD)
      .setScale(style.scale).setAlpha(style.alpha).setDepth((pk.depth || 8) - 0.5);
    let beam = null;
    if (style.beam && s.textures.exists(AMB_TEX.RAY)) {
      beam = s.add.image(pk.x, pk.y + 8, AMB_TEX.RAY).setOrigin(0.5, 1).setFlipY(true).setScale(0.32, 0.28)
        .setTint(style.tint).setBlendMode(ADD).setAlpha(style.alpha * 0.7).setDepth((pk.depth || 8) - 0.6);
    }
    const entry = { pickup: pk, glow, beam, style, tween: null };
    this._styleGlow(entry);
    this.glows.push(entry);
  }

  _styleGlow(entry) {
    if (entry.tween) { entry.tween.stop(); entry.tween = null; }
    if (!entry.glow.active) return;
    entry.glow.setScale(entry.style.scale).setAlpha(entry.style.alpha);
    if (this._motion) {
      entry.tween = this.scene.tweens.add({
        targets: entry.glow, scale: entry.style.scale * 1.25, alpha: entry.style.alpha * 0.6,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  _dropGlow(i) {
    const e = this.glows[i];
    if (e.tween) e.tween.stop();
    if (e.glow.active) e.glow.destroy();
    if (e.beam && e.beam.active) e.beam.destroy();
    const last = this.glows.length - 1;
    this.glows[i] = this.glows[last];
    this.glows.length = last;
  }

  update(time, delta) {
    const dt = (delta || 16) / 1000;
    // 熔岩 / 沙漠 / 王座的下緣色調緩慢呼吸（熱浪）；減少動態時不動
    if (this._motion && this._bg && this.preset.wash.pulse) {
      if (!this._bg.active) this._bg = null;
      else this._applyWash(0.6 + 0.4 * Math.sin(time * 0.0022));
    }
    // 雲：慢慢往左飄，飄出畫面左側就繞回右側
    const cam = this.scene.cameras.main;
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.x += c._vx * dt;
      const sx = c.x - cam.scrollX * 0.12;
      if (sx < -220) { c.x += VIEW_W + 440; c.y = 40 + Math.random() * 170; }
    }
    // 海鷗：等一下 → 橫越畫面（上下輕飄、翅膀拍動）→ 飛出去後重新排隊
    for (let i = 0; i < this.gulls.length; i++) {
      const g = this.gulls[i];
      if (g._wait > 0) { g._wait -= delta; if (g._wait <= 0) g.setVisible(true); continue; }
      g.x += g._vx * dt;
      g._phase += dt * 7;
      g.y = g._baseY + Math.sin(g._phase * 0.3) * 10;
      g.scaleY = g.scaleX * (0.6 + Math.abs(Math.sin(g._phase)) * 0.6);
      const sx = g.x - cam.scrollX * 0.3;
      if ((g._dir > 0 && sx > VIEW_W + 60) || (g._dir < 0 && sx < -60)) this._resetGull(g, false);
    }
    // 掉落物光暈跟著掉落物走；掉落物被撿走 / 消失就收掉
    this._decoratePickups();
    for (let i = this.glows.length - 1; i >= 0; i--) {
      const e = this.glows[i];
      const pk = e.pickup;
      if (!pk.active) { this._dropGlow(i); continue; }
      e.glow.setPosition(pk.x, pk.y);
      if (e.beam) e.beam.setPosition(pk.x, pk.y + 10);
    }
  }

  destroy() {
    const s = this.scene;
    s.events.off('update', this._onUpdate);
    s.registry?.events.off('changedata-qualityLevel', this._onQuality);
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this._teardownMotion();
    for (let i = this.glows.length - 1; i >= 0; i--) this._dropGlow(i);
    if (this._bg?.active) this._bg.clearTint();
    this._bg = null;
    if (this.title) { this.title.destroy(); this.title = null; }
  }
}

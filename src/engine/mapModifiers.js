// 地圖機制的場景端實作（畫面與玩家狀態；數學在 mapModifierLogic.js）。
// 每張地圖最多一個 modifier（maps.js 的 modifier 欄位）。效能原則：物件在建立時一次配好，
// update 每幀只做數字運算與 setPosition / setAlpha，不配置新物件；狀態沒變就不碰畫面。

import Phaser from 'phaser';
import { WORLD_HEIGHT } from '../config/constants.js';
import { ensureDarkVignette } from '../assets/ProceduralAssets.js';
import { VFX_TEX } from './vfxTextures.js';
import { getQualityLevel } from './quality.js';
import {
  zoneAt, lavaPhase, lavaDamage, QUICKSAND_SPEED_MULT, LAVA_IDLE, LAVA_WARN, LAVA_ERUPT,
} from './mapModifierLogic.js';

const GROUND_Y = WORLD_HEIGHT;
const ADD = Phaser.BlendModes.ADD;

export function createMapModifier(scene, cfg) {
  if (!cfg) return null;
  switch (cfg.type) {
    case 'ice': return new IceModifier(scene, cfg);
    case 'quicksand': return new QuicksandModifier(scene, cfg);
    case 'lava': return new LavaModifier(scene, cfg);
    case 'dark': return new DarkModifier(scene, cfg);
    default: return null;
  }
}

class BaseModifier {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.objects = [];    // 場景關閉時一併銷毀（場景的顯示物件本來就會被 Phaser 清掉，這裡只處理 tween / 事件）
    this.tweens = [];
  }
  add(obj) { this.objects.push(obj); return obj; }
  update() {}
  destroy() {
    for (const tw of this.tweens) if (tw) tw.stop();
    this.tweens = [];
    this.objects = [];
  }
}

// ── 冰面：地面上加速 / 煞車有慣性（Player.update 用 iceFloor）；飄雪 + 地面霜光 + 滑行時的冰屑 ──────────
class IceModifier extends BaseModifier {
  constructor(scene, cfg) {
    super(scene, cfg);
    const width = scene.mapData.width;
    // 地面霜光
    scene.add.rectangle(0, GROUND_Y - 6, width, 6, 0xcdf3ff, 0.4).setOrigin(0, 0).setDepth(6);
    scene.add.rectangle(0, GROUND_Y - 6, width, 1, 0xffffff, 0.8).setOrigin(0, 0).setDepth(6);
    // 飄雪（固定在畫面上）：低品質時減半
    const low = getQualityLevel(scene) === 'low';
    this.add(scene.add.particles(0, -10, 'particle-dot', {
      x: { min: 0, max: 1280 }, speedY: { min: 45, max: 95 }, speedX: { min: -25, max: 8 },
      lifespan: 8000, frequency: low ? 260 : 120, scale: { start: 0.55, end: 0.35 }, alpha: { start: 0.85, end: 0.5 },
      tint: 0xffffff,
    }).setScrollFactor(0).setDepth(40));
    // 滑行時腳邊的冰屑
    this._sparks = this.add(scene.add.particles(0, 0, 'particle-dot', {
      lifespan: 380, speed: { min: 15, max: 55 }, angle: { min: 200, max: 340 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 }, tint: [0xcdf3ff, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(19));
    this._nextSpark = 0;
  }
  update(time, delta, player) {
    player.iceFloor = true;
    if (player.body.blocked.down && time >= this._nextSpark && Math.abs(player.body.velocity.x) > 70) {
      this._nextSpark = time + 70;
      this._sparks.emitParticleAt(player.x - Math.sign(player.body.velocity.x) * 10, player.body.bottom - 2, 1);
    }
  }
}

// ── 流沙：站在區域內的地面上移速 ×speedMult。地面上畫有沙坑；腳邊揚沙；頭上顯示「流沙 -40%」 ────────────
class QuicksandModifier extends BaseModifier {
  constructor(scene, cfg) {
    super(scene, cfg);
    this.zones = cfg.zones;
    this.mult = cfg.speedMult ?? QUICKSAND_SPEED_MULT;
    const shimmer = [];
    for (const z of this.zones) {
      scene.add.rectangle(z.x, GROUND_Y - 14, z.width, 14, 0xb9822a, 0.8).setOrigin(0, 0).setDepth(6);
      shimmer.push(scene.add.rectangle(z.x, GROUND_Y - 14, z.width, 14, 0xf0cd6e, 0.5).setOrigin(0, 0).setDepth(6));
      scene.add.rectangle(z.x, GROUND_Y - 15, z.width, 2, 0x6e4a14, 0.9).setOrigin(0, 0).setDepth(6);
      scene.add.text(z.x + z.width / 2, GROUND_Y - 34, '≈ 流沙 ≈', {
        fontSize: '13px', color: '#fff0c0', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#4a2c08', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(7);
    }
    this.tweens.push(scene.tweens.add({ targets: shimmer, alpha: 0.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    this._dust = this.add(scene.add.particles(0, 0, 'particle-dot', {
      lifespan: 520, speed: { min: 10, max: 45 }, angle: { min: 220, max: 320 }, scale: { start: 1.0, end: 0 },
      alpha: { start: 0.8, end: 0 }, tint: [0xe6c27a, 0xc9a050], emitting: false,
    }).setDepth(19));
    this._label = this.add(scene.add.text(0, 0, `流沙 -${Math.round((1 - this.mult) * 100)}%`, {
      fontSize: '12px', color: '#ffe9a8', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#4a2c08', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(30).setVisible(false));
    this._nextDust = 0;
    this._warned = false;
  }
  update(time, delta, player) {
    const inSand = player.body.blocked.down && zoneAt(this.zones, player.x) !== null;
    player.speedMult = inSand ? this.mult : 1;
    if (inSand !== this._label.visible) this._label.setVisible(inSand);
    if (!inSand) return;
    this._label.setPosition(player.x, player.body.top - 6);
    if (!this._warned) {
      this._warned = true;
      this.scene._showTransientMessage(`流沙！移動速度 -${Math.round((1 - this.mult) * 100)}%\n跳起來可以暫時脫離`, 2200);
    }
    if (time >= this._nextDust && Math.abs(player.body.velocity.x) > 5) {
      this._nextDust = time + 90;
      this._dust.emitParticleAt(player.x, player.body.bottom - 2, 1);
    }
  }
}

// ── 岩漿地板：地面上的區域依週期待機 → 預警（地面發紅脈動 + 驚嘆號）→ 噴發（火柱，站在該區地面受傷）。平台上安全 ──
class LavaModifier extends BaseModifier {
  constructor(scene, cfg) {
    super(scene, cfg);
    this.zones = cfg.zones;
    this._phase = this.zones.map(() => LAVA_IDLE);
    this._glow = [];
    this._flame = [];
    this._mark = [];
    for (const z of this.zones) {
      const cx = z.x + z.width / 2;
      scene.add.rectangle(z.x, GROUND_Y - 6, z.width, 6, 0x4a1608, 0.85).setOrigin(0, 0).setDepth(6);       // 焦黑的地面
      scene.add.rectangle(z.x, GROUND_Y - 3, z.width, 2, 0xff7a20, 0.55).setOrigin(0, 0).setDepth(6);       // 裂縫的暗紅光
      this._glow.push(scene.add.rectangle(z.x, GROUND_Y - 10, z.width, 10, 0xff5a10, 0).setOrigin(0, 0).setDepth(7).setBlendMode(ADD));
      this._flame.push(scene.add.image(cx, GROUND_Y, 'lava-flame').setOrigin(0.5, 1).setDepth(19).setBlendMode(ADD)
        .setDisplaySize(z.width, 140).setAlpha(0).setVisible(false));
      this._mark.push(scene.add.text(cx, GROUND_Y - 40, '!', {
        fontSize: '22px', color: '#ffd36a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#7a1d00', strokeThickness: 4,
      }).setOrigin(0.5, 1).setDepth(21).setVisible(false));
    }
    this._embers = this.add(scene.add.particles(0, 0, 'particle-dot', {
      lifespan: 700, speedY: { min: -300, max: -140 }, speedX: { min: -50, max: 50 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffd060, 0xff7a20, 0xff4a10], blendMode: 'ADD', emitting: false,
    }).setDepth(20));
    this._nextEmber = 0;
  }
  update(time, delta, player) {
    const cfg = this.cfg;
    const onFloor = player.body.bottom >= GROUND_Y - 6;
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const phase = lavaPhase(time, cfg, z.offset || 0);
      if (phase !== this._phase[i]) {
        this._phase[i] = phase;
        this._flame[i].setVisible(phase === LAVA_ERUPT);
        this._mark[i].setVisible(phase !== LAVA_IDLE);
        if (phase === LAVA_IDLE) this._glow[i].setAlpha(0);
        if (phase === LAVA_ERUPT) this._flame[i].setAlpha(0.95);
      }
      if (phase === LAVA_WARN) {
        this._glow[i].setAlpha(0.2 + 0.35 * (0.5 + 0.5 * Math.sin(time / 55)));   // 預警：地面發紅快速脈動
      } else if (phase === LAVA_ERUPT) {
        this._glow[i].setAlpha(0.7);
        this._flame[i].setAlpha(0.8 + 0.15 * Math.sin(time / 45));   // 火柱閃動
        if (time >= this._nextEmber) {
          this._nextEmber = time + 60;
          this._embers.emitParticleAt(z.x + Math.random() * z.width, GROUND_Y - 4, 1);
        }
        if (onFloor && player.x >= z.x - 8 && player.x <= z.x + z.width + 8) {
          player.takeDamage(lavaDamage(player.gameState.maxHp, cfg.damagePct));
        }
      }
    }
  }
}

// ── 暗黑視野：整張圖罩一層暗角（單張預先畫好的漸層圖，跟著玩家移動），燭台周圍加一圈暖光 ────────────────
const DARK_RADIUS_BOOST = 1.45;
const DARK_ALPHA_CAP = 0.72;
class DarkModifier extends BaseModifier {
  constructor(scene, cfg) {
    super(scene, cfg);
    ensureDarkVignette(scene);   // 4 MB 的遮罩圖只在這張地圖需要時才建立，離開時移除
    // dark-vignette 貼圖（ProceduralAssets）：中心 0.14 半徑內全透明、到 0.22 半徑漸變成全黑；
    // 縮放到「全透明圈 = cfg.radius」，貼圖邊緣之外仍是整片黑，足以蓋住整個畫面
    const tex = scene.textures.get('dark-vignette').getSourceImage();
    // 試玩回報太暗：亮圈放大 DARK_RADIUS_BOOST 倍、最暗處不超過 DARK_ALPHA_CAP（地圖設定值仍是基準）
    const scale = (cfg.radius * DARK_RADIUS_BOOST) / (0.14 * tex.width / 2);
    this._veil = this.add(scene.add.image(0, 0, 'dark-vignette').setScale(scale).setAlpha(Math.min(cfg.alpha ?? 0.88, DARK_ALPHA_CAP)).setDepth(50));
    scene.events.on('postupdate', this._follow, this);   // 玩家位置在物理步進後才同步，這裡跟隨才不會慢一幀
    this._player = null;
    // 燭台：底座（在暗角下面，遠處看不到）+ 暖光（在暗角上面，遠處也看得到光點）
    const glows = [];
    for (const x of cfg.torches || []) {
      scene.add.image(x, GROUND_Y, 'prop-torch').setOrigin(0.5, 1).setDepth(8);
      glows.push(scene.add.image(x, GROUND_Y - 48, VFX_TEX.SOFT_GLOW).setTint(0xffa848).setBlendMode(ADD).setScale(2.6).setDepth(51).setAlpha(0.75));
    }
    if (glows.length) {
      this.tweens.push(scene.tweens.add({
        targets: glows, alpha: 0.5, scale: 2.3, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: scene.tweens.stagger(90),
      }));
    }
  }
  update(time, delta, player) { this._player = player; this._follow(); }
  _follow() {
    const p = this._player;
    if (p && p.active) this._veil.setPosition(p.x, p.y - 30);
  }
  destroy() {
    this.scene.events.off('postupdate', this._follow, this);
    super.destroy();
    if (this.scene.textures.exists('dark-vignette')) this.scene.textures.remove('dark-vignette');
  }
}

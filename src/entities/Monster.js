import Phaser from 'phaser';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { rollEquipmentDrop } from '../config/equipment.js';
import { MONSTER_ASSETS } from '../config/assetCatalog.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterPoint, getVisualCenterY, getVisualTopY } from '../config/alignment.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { consumeMark, clearMark, inSmoke, SMOKE_DAMAGE_FACTOR } from '../engine/statusEffects.js';
import { effectiveCritMulti, jobPassive } from '../config/constants.js';
import { SHARD_TEXTURE } from '../config/shards.js';
import { shardToDrop } from '../engine/shards.js';
import { MONSTERS } from '../config/monsters.js';
import { MonsterBrain, ST_IDLE, ST_WINDUP } from './monsterAI.js';
import { playFx } from './Skill.js';
import { getPlatformGraph, getTable, platformAt, jumpClassFor } from '../engine/platformGraph.js';
import { SteerState, makeSteerInput, makeSteerOut, steer } from '../engine/aiLogic.js';
import { settings } from '../engine/settings.js';
import { scaleMonsterStats } from '../engine/difficulty.js';

// Phase 10.3 PoC：HP 條渲染模式開關（'shape' = Rectangle 走 batchFillPath；
// 'image' = 白塊 texture 走 batchSprite）。預設 shape（維持 Phase 3 現狀）。
// console 用 window.__hpBarMode('image') 切換，影響之後生成的怪物，需重進地圖。
let HP_BAR_MODE = 'shape';
export function setHpBarMode(mode) {
  if (mode === 'shape' || mode === 'image') HP_BAR_MODE = mode;
}

// 怪物 AI 狀態
const STATE = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', HURT: 'hurt', DEAD: 'dead', RANGED: 'ranged' };
const LEGACY_MONSTER_SOURCE_SIZE = 80;
const STEER_JUMP_COOLDOWN_MS = 900;
const RETREAT_NEAR_SQ = 10000;   // 遠程怪：比 100px 近就後退
const RETREAT_FAR_SQ = 16900;    // 退到 130px 才停（遲滯，避免在邊界來回抖動）
const WARN_FLASH_MS = 100;

if (typeof window !== 'undefined' && typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)) {
  window.__MONSTERS = MONSTERS;   // e2e：直接生怪用
}

let MON_BY_ID = null;
function monsterDef(id) {
  if (!MON_BY_ID) {
    MON_BY_ID = new Map();
    for (const d of MONSTERS) MON_BY_ID.set(d.id, d);
  }
  return MON_BY_ID.get(id);
}
const MAX_MONSTER_DISPLAY_HEIGHT = 160;
const MAX_MINIBOSS_DISPLAY_HEIGHT = 220;
const MONSTER_ALPHA_NORMALIZATION_PREFIXES = [
  'monster_',
  'miniboss_',
];
const MONSTER_ALPHA_TRANSPARENT_CUTOFF = 36;
const MONSTER_ALPHA_SOLID_CUTOFF = 112;
const MONSTER_ALPHA_MIN_VISIBLE_ALPHA = 208;

function shouldNormalizeMonsterAlpha(textureKey, source) {
  if (!textureKey || !source?.width || !source?.height) {
    return false;
  }

  // Boss 動作圖在裁切階段已處理過 alpha（保留柔邊光暈），不可再做三段式正規化
  if (textureKey.startsWith('boss_')) {
    return false;
  }

  if (MONSTER_ALPHA_NORMALIZATION_PREFIXES.some((prefix) => textureKey.startsWith(prefix))) {
    return true;
  }

  return source.width > LEGACY_MONSTER_SOURCE_SIZE || source.height > LEGACY_MONSTER_SOURCE_SIZE;
}

function getNormalizedMonsterTextureKey(scene, textureKey) {
  if (!scene?.textures?.exists(textureKey)) {
    return textureKey;
  }

  const source = scene.textures.get(textureKey)?.getSourceImage?.();
  if (!shouldNormalizeMonsterAlpha(textureKey, source)) {
    return textureKey;
  }

  const processedKey = `${textureKey}--solid-alpha`;
  if (scene.textures.exists(processedKey)) {
    return processedKey;
  }

  const canvasTexture = scene.textures.createCanvas(processedKey, source.width, source.height);
  const context = canvasTexture.getContext();
  context.clearRect(0, 0, source.width, source.height);
  context.drawImage(source, 0, 0);

  const imageData = context.getImageData(0, 0, source.width, source.height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha === 0) continue;

    if (alpha <= MONSTER_ALPHA_TRANSPARENT_CUTOFF) {
      pixels[index + 3] = 0;
      continue;
    }

    if (alpha >= MONSTER_ALPHA_SOLID_CUTOFF) {
      pixels[index + 3] = 255;
      continue;
    }

    const ratio = Phaser.Math.Clamp(
      (alpha - MONSTER_ALPHA_TRANSPARENT_CUTOFF)
        / (MONSTER_ALPHA_SOLID_CUTOFF - MONSTER_ALPHA_TRANSPARENT_CUTOFF),
      0,
      1,
    );
    pixels[index + 3] = Math.round(Phaser.Math.Linear(
      MONSTER_ALPHA_MIN_VISIBLE_ALPHA,
      255,
      Math.pow(ratio, 0.32),
    ));
  }

  context.putImageData(imageData, 0, 0);
  canvasTexture.refresh();
  return processedKey;
}

// 在載入期（BootScene）預先處理所有怪物材質去背，
// 避免每種怪物首次生成時才即時逐像素處理而造成進圖瞬卡
export function prewarmMonsterTextures(scene) {
  for (const asset of MONSTER_ASSETS) {
    getNormalizedMonsterTextureKey(scene, asset.key);
  }
}

// 新版怪物圖已依體型分級預先縮放（S 56 / M 80 / L 120 / XL 200 px 高），
// 直接以原圖尺寸顯示，避免二次縮放造成模糊。
function getScaledMonsterProfile(entity, config) {
  const baseProfile = ALIGNMENT_PROFILES.monster;
  const sourceImage = entity?.texture?.getSourceImage?.();
  const sourceWidth = sourceImage?.width || LEGACY_MONSTER_SOURCE_SIZE;
  const sourceHeight = sourceImage?.height || LEGACY_MONSTER_SOURCE_SIZE;
  const maxHeight = config?.spawnRole === 'miniboss' ? MAX_MINIBOSS_DISPLAY_HEIGHT : MAX_MONSTER_DISPLAY_HEIGHT;
  const targetHeight = Math.min(maxHeight, sourceHeight);
  const targetWidth = Math.round(targetHeight * (sourceWidth / Math.max(1, sourceHeight)));
  const widthRatio = targetWidth / baseProfile.displayWidth;
  const heightRatio = targetHeight / baseProfile.displayHeight;

  if (widthRatio === 1 && heightRatio === 1) return baseProfile;
  return {
    ...baseProfile,
    displayWidth: targetWidth,
    displayHeight: targetHeight,
    bodyWidth: Math.round(baseProfile.bodyWidth * widthRatio),
    bodyOffsetX: Math.round(baseProfile.bodyOffsetX * widthRatio),
    bodyOffsetY: Math.round(baseProfile.bodyOffsetY * heightRatio),
  };
}

export class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    const textureKey = getNormalizedMonsterTextureKey(scene, config.spriteKey || 'monster_slime');
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.gameState = scene.registry.get('gameState');

    // 戰鬥數值（難度倍率只在生成時套用一次：HP 與攻擊力，見 engine/difficulty.js）
    const scaled = scaleMonsterStats(config, settings.get().difficulty);
    this.difficulty = settings.get().difficulty;
    this.maxHp = scaled.hp;
    this.hp = scaled.hp;
    this.atk = scaled.atk;
    this.exp = config.exp;
    this.speed = config.speed;
    this.meso = config.meso;
    this.behavior = config.behavior;
    this.isDead = false;
    this._smoked = false;

    // AI 狀態
    this.state = STATE.PATROL;
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.patrolOriginX = x;
    this.patrolRange = 160 + Math.random() * 80;
    this.detectionRange = 280;
    this.attackRange = 55;
    // Phase 3.4：預先快取平方門檻，避免每幀 sqrt
    this._attackRangeSq = this.attackRange * this.attackRange;
    this._detectionRangeSq = this.detectionRange * this.detectionRange;
    this._chaseExtendedSq = this._detectionRangeSq * 2.25; // (detectionRange × 1.5)²
    // AI 節流：每 3 幀做一次決策，跳過幀沿用上次 velocity（玩家無感）
    this._aiTick = 0;
    this.hurtTimer = 0;
    this._kbTimer = 0;
    this._kbVx = 0;
    this._kbDuration = 1;
    this.attackCooldown = 0;
    this.rangedCooldown = 0;
    this.jumpProfile = config.jumpProfile || null;
    this.jumpCooldown = this._rollJumpCooldown();

    // 平台感知追擊：平台圖每張地圖建一次，下一步表依自己的起跳能力取
    this._baseTint = config.tint ?? null;
    this.phase = 1;
    this._underground = false;
    this.graph = getPlatformGraph(scene.mapData?.platforms);
    this.plat = -1;
    this._tgtPlat = -1;
    this.steerJumpVel = this.jumpProfile ? (this.jumpProfile.velocity ?? 320) : 0;
    this._table = this.graph ? getTable(this.graph, jumpClassFor(this.steerJumpVel)) : null;
    this._steer = new SteerState();
    this._sinp = makeSteerInput();
    this._sout = makeSteerOut();
    this._steerJumpCd = 0;
    this._aiDt = 0;
    this._retreating = false;
    this._arriveDist = this.attackRange * 0.6;
    this._worldW = scene.physics.world.bounds.width;
    this.brain = new MonsterBrain(this);

    // 怪物站位由共享腳底基準 metadata 決定，避免不同圖片來源造成推算漂移。
    this.setCollideWorldBounds(true);
    this.body.setGravityY(0);
    this.setDepth(10);
    this.setAlpha(1);
    this.alignmentProfile = getScaledMonsterProfile(this, config);
    applyAlignmentProfile(this, this.alignmentProfile);
    if (config.tint) this.setTint(config.tint);

    // 血條背景
    this._hpBg = null;
    this._hpBar = null;
    this._createHpBar();

    this._flashTimer = null;
  }

  _createHpBar() {
    // Phase 3.1：HP 條改用 Rectangle 而非 Graphics
    // Rectangle 走 SpriteWebGLRenderer 批次渲染，多隻怪物可共享 1 個 draw call；
    // Graphics 即使內容沒變，每幀也會被 GraphicsWebGLRenderer 掃過渲染。
    // 小王 / 守衛的血條比一般怪寬，遠看也看得出打到哪個階段
    // 寬度取碰撞體寬（displayWidth 含圖片留白，150-230px 的守衛會被算得太寬或太窄）
    const isBoss = this.config.spawnRole === 'miniboss';
    const bodyW = (this.body && this.body.width) || this.displayWidth;
    this._hpBarW = isBoss
      ? Phaser.Math.Clamp(Math.round(bodyW * 1.1), 60, 140)
      : Phaser.Math.Clamp(Math.round(this.displayWidth * 0.62), 32, 64);
    this._hpBarH = isBoss ? 8 : 4;
    // Phase 10.3 PoC：依模式選 Rectangle(Shape) 或 Image(白塊 texture)
    this._isImageBar = (HP_BAR_MODE === 'image');
    if (this._isImageBar) {
      // Image 版：走 batchSprite，不走 batchFillPath。displayWidth 控制血量長度
      this._hpBg = this.scene.add.image(0, 0, VFX_TEX.WHITE_PX)
        .setOrigin(0, 0).setDepth(11).setTint(0x000000).setAlpha(0.7);
      this._hpBg.setDisplaySize(this._hpBarW, this._hpBarH);
      this._hpBar = this.scene.add.image(0, 0, VFX_TEX.WHITE_PX)
        .setOrigin(0, 0).setDepth(12).setTint(0x44ff44);
      this._hpBar.setDisplaySize(this._hpBarW, this._hpBarH);
    } else {
      // Shape 版（預設）：背景黑底 + 前景彩色血條，origin 左上，scaleX 對齊
      this._hpBg = this.scene.add.rectangle(0, 0, this._hpBarW, this._hpBarH, 0x000000, 0.7)
        .setOrigin(0, 0).setDepth(11);
      this._hpBar = this.scene.add.rectangle(0, 0, this._hpBarW, this._hpBarH, 0x44ff44)
        .setOrigin(0, 0).setDepth(12);
      if (isBoss) this._hpBg.setFillStyle(0x000000, 0.85).setStrokeStyle(1.5, 0xffe9a8, 0.95);   // 金邊深底：遠看也找得到
    }
    this._lastHpRatio = -1;
    this._lastBarX = -Infinity;   // 用 NaN 的話 Math.abs(NaN) >= 2 永遠為 false，血條就永遠停在 (0,0)
    this._lastBarY = -Infinity;
    this._updateHpBar();
  }

  // 每幀呼叫：只移動位置；scaleX 控制 HP 比例（GPU 純 transform，無重繪）
  _updateHpBar() {
    if (!this._hpBg || !this._hpBar) return;
    const bx = this.x - this._hpBarW / 2;
    const by = getVisualTopY(this) - 8;
    // 位置快取：差距 < 2px 不更新（怪物速度低，2px 粒度無視覺差異，減少 setPosition 調用次數）
    if (!(Math.abs(bx - this._lastBarX) < 2 && Math.abs(by - this._lastBarY) < 2)) {
      this._lastBarX = bx;
      this._lastBarY = by;
      this._hpBg.setPosition(bx, by);
      this._hpBar.setPosition(bx, by);
    }
    const ratio = Math.max(0, this.hp / this.maxHp);
    if (ratio !== this._lastHpRatio) {
      this._lastHpRatio = ratio;
      const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
      if (this._isImageBar) {
        this._hpBar.displayWidth = this._hpBarW * ratio; // Image：直接設顯示寬度
        this._hpBar.setTint(color);
      } else {
        this._hpBar.scaleX = ratio; // Shape：GPU transform，無 path 重繪
        this._hpBar.fillColor = color;
      }
    }
  }

  _destroyHpBar() {
    if (this._hpBg) { this._hpBg.destroy(); this._hpBg = null; }
    if (this._hpBar) { this._hpBar.destroy(); this._hpBar = null; }
  }

  // opts.dot = 持續傷害（毒）：不會引爆斷命印記，傷害數字改綠色
  takeDamage(amount, isCrit = false, opts = null) {
    if (this.isDead || this._underground) return;
    const dot = !!(opts && opts.dot);
    if (this._mark && !dot) {
      const m = consumeMark(this, this.scene.time.now, amount, isCrit, effectiveCritMulti(this.gameState));
      if (m) { amount = m.amount; isCrit = true; }
    }
    this.hp = Math.max(0, this.hp - amount);
    this._updateHpBar();

    // 傷害數字
    this._showDamageNumber(amount, isCrit, dot);

    // 命中閃白 → 轉紅 → 恢復，比單純閃紅更有打擊感
    this.setTintFill(0xffffff);
    if (this._flashTimer) this._flashTimer.remove();
    this._flashTimer = this.scene.time.delayedCall(60, () => {
      if (!this.active || this.isDead) return;
      this.setTint(0xff8888);
      this._flashTimer = this.scene.time.delayedCall(110, () => {
        if (this.active && !this.isDead) this._restoreTint();
      });
    });

    if (this.hp <= 0) {
      if (this._mark) clearMark(this, 'died');   // 帶著斷命印記死亡 → 當場斷命（打周圍的敵人）
      this.die();
    } else {
      this._checkPhase();
      const brain = this.brain;
      if (brain.stage === ST_WINDUP && !brain.superArmor) brain.interrupt();   // 前搖被打斷
      // 出招中（衝刺 / 跳躍 / 潛地 / 咆哮）與小王不會被打到僵直
      if (!brain.uninterruptible && !brain.superArmor) {
        this.state = STATE.HURT;
        this.hurtTimer = 300;
      }
    }
  }

  _checkPhase() {
    if (this.brain.profile.phases.length > 0) this.brain.checkPhase(this.hp / this.maxHp);
  }

  // 階段切換演出（守衛）：光環 + 震動 + 階段名稱浮字；Boss 會覆寫成更大的演出
  _onPhaseChange(n, ph) {
    const scene = this.scene;
    const c = getVisualCenterPoint(this);
    playFx(scene, 'fx_boss_aura', c.x, c.y, { scale: 1.3, frameRate: 10, tint: ph.tint ?? 0xff8844, depth: 14 });
    scene.cameras.main.shake(260, 0.008);
    if (ph.label) {
      const txt = scene.add.text(this.x, getVisualTopY(this) - 44, ph.label, {
        fontSize: '22px', color: '#ffcc66', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(90);
      scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }
    this._restoreTint();
  }

  _restoreTint() {
    if (this._baseTint != null) this.setTint(this._baseTint); else this.clearTint();
  }

  // 潛地時隱藏本體與血條、關閉碰撞，浮出時把物理 body 對齊回來
  setUnderground(on) {
    if (on === this._underground) return;
    this._underground = on;
    this.setVisible(!on);
    if (this._hpBg) this._hpBg.setVisible(!on);
    if (this._hpBar) this._hpBar.setVisible(!on);
    if (!this.body) return;
    if (on) { this.body.setVelocity(0, 0); this.body.enable = false; }
    else { this.body.enable = true; this.body.reset(this.x, this.y); }
  }

  // 平台邊緣偵測（有平台資訊時才有效）
  edgeAhead(dir, margin) {
    const g = this.graph, p = this.plat;
    if (!g || p < 0) return false;
    return dir > 0 ? this.x + margin > g.right[p] - 6 : this.x - margin < g.left[p] + 6;
  }

  clampToPlatform(x) {
    const g = this.graph, p = this.plat;
    if (!g || p < 0) return x;
    return Math.max(g.left[p] + 12, Math.min(g.right[p] - 12, x));
  }

  // 召喚小怪：不給經驗 / 掉落、不重生、不算任務擊殺（id 加 #minion 後綴）
  spawnMinion(id, x) {
    const def = monsterDef(id);
    const scene = this.scene;
    if (!def || !scene?.monsters) return null;
    const cfg = Object.assign({}, def, { attackId: def.id, id: `${def.id}#minion`, dropRate: 0, exp: 0, meso: 0, spawnRole: undefined });
    const mi = new Monster(scene, x, 0, cfg);
    if (scene._alignDynamicEntityToPlatformTop) scene._alignDynamicEntityToPlatformTop(mi, this.body.bottom);
    else mi.setY(this.body.bottom);
    mi._isMinion = true;
    mi.player = scene.player;
    mi.patrolOriginX = x;
    mi.patrolRange = 100;
    scene.monsters.add(mi);
    return mi;
  }

  /**
   * 擊退或牽引。vx 為初速（px/s），duration 內線性衰減到 0。
   * Boss 與小王有 knockbackResist，只吃一小部分。
   */
  applyKnockback(vx, duration = 180, vy = 0) {
    if (this.isDead || !this.body || this.brain.uninterruptible) return;
    const resist = this.knockbackResist ?? (this.config?.spawnRole === 'miniboss' ? 0.6 : 0);
    const scaled = vx * (1 - resist);
    if (Math.abs(scaled) < 1) return;
    this._kbVx = scaled;
    this._kbDuration = duration;
    this._kbTimer = duration;
    if (vy && resist < 0.5 && this.body.blocked.down) this.setVelocityY(vy);
  }

  _showDamageNumber(amount, isCrit, dot = false) {
    // 顏色分級：一般白 / 暴擊金 / 高傷橘（≥500）；持續傷害（毒）綠色小字
    let color = '#ffffff';
    let fontSize = '16px';
    if (dot) {
      color = '#8cff66'; fontSize = '14px';
    } else if (isCrit) {
      if (amount >= 500) {
        color = '#ff9933'; fontSize = '24px';   // 橘色：高暴擊
      } else {
        color = '#ffe066'; fontSize = '20px';   // 黃色：一般暴擊
      }
    }
    const center = getVisualCenterPoint(this);
    const txt = this.scene.add.text(
      center.x + (Math.random() - 0.5) * 20,
      center.y - 16,
      isCrit ? `${amount}!` : String(amount),
      { fontSize, color, fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3 }
    );
    txt.setDepth(80);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 50, alpha: 0, duration: 900,
      onComplete: () => txt.destroy(),
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.state = STATE.DEAD;
    this._destroyHpBar();
    this.brain.cleanup();
    this.brain.killMinions();
    if (this.body) this.body.setAllowGravity(true);

    audio.playKill();
    const center = getVisualCenterPoint(this);
    particles.spawnDeath(this.scene, center.x, center.y, 0xff4444);

    // 掉落物品
    this._dropLoot();

    // 通知場景
    this.scene.events.emit('monster-died', this);

    // 死亡後先退出碰撞，再用透明淡出離場。
    this.clearTint();
    this.setAlpha(1);
    this.setVelocity(0, 0);
    if (this.body) {
      this.body.enable = false;
    }
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0 },
      y: this.y - 22,
      scaleX: this.scaleX * 0.96,
      scaleY: this.scaleY * 0.92,
      duration: 720,
      ease: 'Sine.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  _dropLoot() {
    const gs = this.scene.registry.get('gameState');
    const level = gs ? gs.level : 1;

    // 掉金幣
    const mesoCount = Math.floor(this.meso * (0.5 + Math.random()) * jobPassive(gs, 'mesoMult', 1));
    if (mesoCount > 0) {
      this._spawnPickup('item-meso', mesoCount, 'meso');
    }

    // 區域守護者的星光碎片：100% 掉落、每個存檔只能拿一次（已取得就不再掉）；碎片不會消失，等玩家撿起
    const shard = shardToDrop(gs, this.config.id);
    if (shard) this._spawnPickup(SHARD_TEXTURE, shard.id, 'shard');

    // 掉裝備
    const equip = rollEquipmentDrop(level, this.config.dropRate);
    if (equip) {
      this._spawnPickup(equip.spriteKey, equip, 'equipment');
    }
  }

  _spawnPickup(textureKey, data, type) {
    const pickup = this.scene.physics.add.sprite(
      this.x + (Math.random() - 0.5) * 40,
      getVisualCenterY(this),
      textureKey
    );
    pickup.pickupType = type;
    pickup.pickupData = data;
    pickup.setDepth(8);
    pickup.setVelocity((Math.random() - 0.5) * 120, -200);
    pickup.setBounce(0.3);
    if (type !== 'shard') this.scene.time.delayedCall(30000, () => { if (pickup.active) pickup.destroy(); });
    else pickup.setScale(1.6);
    // 加入場景的 pickups 群組
    if (this.scene.pickups) this.scene.pickups.add(pickup);
  }

  update(player, delta) {
    if (this.isDead || !this.active) return;
    this._updateHpBar();

    const dt = delta / 1000;
    this.hurtTimer = Math.max(0, this.hurtTimer - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);
    this._steerJumpCd = Math.max(0, this._steerJumpCd - delta);
    const brain = this.brain;
    brain.tickCd(delta);

    if (this._kbTimer > 0) {
      // 擊退 / 牽引：速度隨剩餘時間線性衰減
      this._kbTimer = Math.max(0, this._kbTimer - delta);
      this.setVelocityX(this._kbVx * (this._kbTimer / this._kbDuration));
      if (this.hurtTimer > 0) return;
    }

    if (this.hurtTimer > 0) {
      this.setVelocityX(0);
      return;
    }

    if (!player || !player.active || player.isDead) {
      if (brain.stage !== ST_IDLE) brain.interrupt();
      this._doPatrol(dt);
      return;
    }

    // 出招中：由大腦接手（每幀推進，預警 / 判定不受 AI 節流影響）
    if (brain.stage !== ST_IDLE) {
      brain.tick(delta, player);
      return;
    }

    // Phase 3.4：AI 節流——每 3 幀做一次決策，跳過幀讓物理引擎用上次的 velocity 持續移動
    // 50 ms 決策延遲對玩家肉眼無感，但 CPU 開銷降到 1/3
    this._aiDt += delta;
    this._aiTick = (this._aiTick + 1) % 3;
    if (this._aiTick !== 0) return;
    const adt = this._aiDt;
    this._aiDt = 0;

    // distSq 平方比較取代 sqrt（規則 B）；aggroSq 把垂直距離打 6 折，上下樓層的玩家也算在警戒範圍內
    const distX = player.x - this.x;
    const distY = player.body.center.y - this.body.center.y;
    const distSq = distX * distX + distY * distY;
    const aggroSq = distX * distX + 0.36 * distY * distY;
    this._refreshPlat(player);

    // 迷煙彈：範圍內的敵人傷害減半；非遠程怪不再追擊（只在貼身時還手，其餘巡邏）
    const zones = player.smokeZones;
    this._smoked = !!zones && zones.length > 0 && inSmoke(zones, this.x, this.body.center.y, this.scene.time.now);
    if (this._smoked && this.behavior !== 'ranged') {
      if (distSq < this._attackRangeSq) this._doAttack(player); else this._doPatrol();
      return;
    }

    switch (this.behavior) {
      case 'chase':   this._behaviorChase(distSq, aggroSq, player, adt);  break;
      case 'ranged':  this._behaviorRanged(distSq, aggroSq, distX, player); break;
      default:        this._behaviorPatrol(distSq, aggroSq, player, adt); break;
    }
  }

  // 更新自己與玩家所在的平台（只在落地時更新，空中沿用上一個）
  _refreshPlat(player) {
    const g = this.graph;
    if (!g) return;
    if (this._isGrounded()) this.plat = platformAt(g, this.x, this.body.bottom, 14, Math.max(6, this.body.halfWidth));
    const f = this.scene.game.getFrame();
    if (player._aiFrame !== f) {
      player._aiFrame = f;
      const pb = player.body;
      if (pb.blocked.down || pb.touching.down) player._aiPlat = platformAt(g, player.x, pb.bottom);
    }
    this._tgtPlat = player._aiPlat ?? -1;
  }

  // 特殊攻擊：成功開始出招回傳 true（vertical = 只考慮能打到不同樓層的招式）
  _trySpecial(player, distSq, vertical) {
    const dyAbs = Math.abs(player.body.bottom - this.body.bottom);
    return this.brain.tryStart(player, Math.sqrt(distSq), dyAbs, this._isGrounded(), vertical);
  }

  _behaviorPatrol(distSq, aggroSq, player, adt) {
    if (aggroSq < this._detectionRangeSq && this._trySpecial(player, distSq, false)) return;
    if (distSq < this._attackRangeSq) {
      this._doAttack(player);
    } else if (aggroSq < this._detectionRangeSq) {
      this._doChase(player, distSq, adt);
    } else {
      this._doPatrol();
    }
  }

  _behaviorChase(distSq, aggroSq, player, adt) {
    if (aggroSq < this._chaseExtendedSq && this._trySpecial(player, distSq, false)) return;
    if (distSq < this._attackRangeSq) {
      this._doAttack(player);
    } else if (aggroSq < this._chaseExtendedSq) {
      this._doChase(player, distSq, adt);
    } else {
      this._doPatrol();
    }
  }

  _behaviorRanged(distSq, aggroSq, distX, player) {
    if (distSq < RETREAT_NEAR_SQ) this._retreating = true;
    else if (distSq > RETREAT_FAR_SQ) this._retreating = false;
    const dir = distX < 0 ? 1 : -1;   // 遠離玩家的方向
    if (aggroSq >= this._detectionRangeSq) { this._doPatrol(); return; }
    if (this._trySpecial(player, distSq, false)) return;   // 後跳射擊、遠程彈幕等
    if (this._retreating) {
      // 貼牆 / 到平台邊緣就不再後退：改成貼身還手，免得掉下去或卡住
      if (this.edgeAhead(dir, 14) || (dir > 0 ? this.body.blocked.right : this.body.blocked.left)) {
        this.setVelocityX(0);
        if (distSq < this._attackRangeSq) this._doAttack(player);
      } else {
        this.setVelocityX(dir * this.speed);
        this.setFlipX(distX < 0);
        this._tryJump();
      }
    } else {
      // 保持距離，等招式冷卻（投射物會算上高低差，玩家在別層也打得到）
      this.setVelocityX(0);
      this.setFlipX(distX < 0);
    }
  }

  _doPatrol() {
    const leftEdge = this.patrolOriginX - this.patrolRange;
    const rightEdge = this.patrolOriginX + this.patrolRange;
    if (this.x <= leftEdge) this.patrolDir = 1;
    if (this.x >= rightEdge) this.patrolDir = -1;
    // 站在平台上時不走出邊緣（地面平台很長，不受影響）
    if (this._isGrounded() && this.edgeAhead(this.patrolDir, 10)) this.patrolDir = -this.patrolDir;
    this.setVelocityX(this.patrolDir * this.speed * 0.6 * this.brain.speedMult);
    this.setFlipX(this.patrolDir < 0);
    this._tryJump();
  }

  // 平台感知追擊：同層直接追；玩家在別層就依平台圖找上跳 / 走下去的路；
  // 連續 UNREACH_MS 都到不了 → 改用能打到別層的招式（遠程 / 俯衝 / 撲擊），沒招就先巡邏，不會呆站
  _doChase(player, distSq, adt) {
    const inp = this._sinp, out = this._sout;
    const grounded = this._isGrounded();
    const speed = this.speed * this.brain.speedMult;
    inp.x = this.x;
    inp.dx = player.x - this.x;
    inp.dy = player.body.bottom - this.body.bottom;
    inp.selfPlat = this.plat;
    inp.tgtPlat = this._tgtPlat;
    inp.grounded = grounded;
    inp.speed = speed;
    inp.arrive = this._arriveDist;
    inp.jumpVel = this.steerJumpVel;
    inp.graph = this.graph;
    inp.table = this._table;
    inp.half = this.body.halfWidth;
    inp.minX = inp.half;
    inp.maxX = this._worldW - inp.half;
    steer(this._steer, inp, adt, out);
    if (out.unreach) {
      if (!this._trySpecial(player, distSq, true)) this._doPatrol();
      return;
    }
    this.setVelocityX(out.dir * speed);
    if (out.dir !== 0) this.setFlipX(out.dir < 0);
    if (out.jump && grounded && this._steerJumpCd <= 0) {
      this.setVelocityY(-out.jumpVel);
      this._steerJumpCd = STEER_JUMP_COOLDOWN_MS;
    } else {
      this._tryJump();
    }
  }

  _rollJumpCooldown() {
    if (!this.jumpProfile) return Number.POSITIVE_INFINITY;
    const minInterval = this.jumpProfile.minInterval ?? 3000;
    const maxInterval = this.jumpProfile.maxInterval ?? minInterval;
    return Phaser.Math.Between(minInterval, maxInterval);
  }

  _isGrounded() {
    return Boolean(this.body?.blocked?.down || this.body?.touching?.down);
  }

  _tryJump() {
    if (!this.jumpProfile || this.jumpCooldown > 0 || !this._isGrounded()) return;

    const chance = this.jumpProfile.chance ?? 0.35;
    this.jumpCooldown = this._rollJumpCooldown();
    if (Math.random() > chance) return;

    const jumpVelocity = this.jumpProfile.velocity ?? 320;
    this.setVelocityY(-jumpVelocity);
  }

  _doAttack(player) {
    this.setVelocityX(0);
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 1500;
    const dmg = Math.floor(this.atk * this.brain.dmgMult * (0.8 + Math.random() * 0.4) * (this._smoked ? SMOKE_DAMAGE_FACTOR : 1));
    if (player && !player.isInvincible) {
      player.takeDamage(dmg);
    }
    // 攻擊閃爍
    this.setTint(0xffffff);
    this.scene.time.delayedCall(WARN_FLASH_MS, () => { if (this.active && !this.isDead) this._restoreTint(); });
  }

  destroy(fromScene) {
    this._destroyHpBar();
    if (this.brain) this.brain.cleanup();
    if (this._flashTimer) this._flashTimer.remove();
    super.destroy(fromScene);
  }
}

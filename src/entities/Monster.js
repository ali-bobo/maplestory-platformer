import Phaser from 'phaser';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { rollEquipmentDrop } from '../config/equipment.js';
import { MONSTER_ASSETS } from '../config/assetCatalog.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterPoint, getVisualCenterY, getVisualTopY } from '../config/alignment.js';
import { VFX_TEX } from '../engine/vfxTextures.js';

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

function getScaledMonsterProfile(entity, config) {
  const baseProfile = ALIGNMENT_PROFILES.monster;
  const scale = Number.isFinite(config?.visualScale) && config.visualScale > 0 ? config.visualScale : 1;
  const sourceImage = entity?.texture?.getSourceImage?.();
  const sourceWidth = sourceImage?.width || LEGACY_MONSTER_SOURCE_SIZE;
  const sourceHeight = sourceImage?.height || LEGACY_MONSTER_SOURCE_SIZE;
  // 80x80 是 legacy 怪物圖的共同基準；改用平方根放大可保留大圖相對量感，
  // 又不會讓 200~600px 的新裁切怪直接依線性比例膨脹到失控。
  const heightScale = Math.sqrt(sourceHeight / LEGACY_MONSTER_SOURCE_SIZE);
  const targetHeight = Math.min(
    config?.spawnRole === 'miniboss' ? MAX_MINIBOSS_DISPLAY_HEIGHT : MAX_MONSTER_DISPLAY_HEIGHT,
    Math.max(baseProfile.displayHeight, Math.round(baseProfile.displayHeight * heightScale * scale)),
  );
  const aspectRatio = sourceWidth / Math.max(1, sourceHeight);
  const targetWidth = Math.max(baseProfile.displayWidth, Math.round(targetHeight * aspectRatio));
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
    footPadding: Math.max(1, Math.round(baseProfile.footPadding * heightRatio)),
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

    // 戰鬥數值
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.atk = config.atk;
    this.exp = config.exp;
    this.speed = config.speed;
    this.meso = config.meso;
    this.behavior = config.behavior;
    this.isDead = false;

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
    this.attackCooldown = 0;
    this.rangedCooldown = 0;
    this.jumpProfile = config.jumpProfile || null;
    this.jumpCooldown = this._rollJumpCooldown();

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
    this._hpBarW = Phaser.Math.Clamp(Math.round(this.displayWidth * 0.62), 32, 64);
    this._hpBarH = this.config.spawnRole === 'miniboss' ? 5 : 4;
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
    }
    this._lastHpRatio = -1;
    this._lastBarX = NaN;
    this._lastBarY = NaN;
    this._updateHpBar();
  }

  // 每幀呼叫：只移動位置；scaleX 控制 HP 比例（GPU 純 transform，無重繪）
  _updateHpBar() {
    if (!this._hpBg || !this._hpBar) return;
    const bx = this.x - this._hpBarW / 2;
    const by = getVisualTopY(this) - 8;
    // 位置快取：差距 < 0.5px 不更新（避免每幀都觸發 transform dirty）
    if (Math.abs(bx - this._lastBarX) >= 0.5 || Math.abs(by - this._lastBarY) >= 0.5) {
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

  takeDamage(amount, isCrit = false) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this._updateHpBar();

    // 傷害數字
    this._showDamageNumber(amount, isCrit);

    // 閃紅
    this.setTint(0xff8888);
    if (this._flashTimer) this._flashTimer.remove();
    this._flashTimer = this.scene.time.delayedCall(150, () => {
      if (this.active && !this.isDead) this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = STATE.HURT;
      this.hurtTimer = 300;
    }
  }

  _showDamageNumber(amount, isCrit) {
    // 顏色分級：一般白 / 暴擊金 / 高傷橘（≥500）
    let color = '#ffffff';
    let fontSize = '16px';
    if (isCrit) {
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

    audio.playDeath();
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
    const mesoCount = Math.floor(this.meso * (0.5 + Math.random()));
    if (mesoCount > 0) {
      this._spawnPickup('item-meso', mesoCount, 'meso');
    }

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
    this.scene.time.delayedCall(30000, () => { if (pickup.active) pickup.destroy(); });
    // 加入場景的 pickups 群組
    if (this.scene.pickups) this.scene.pickups.add(pickup);
  }

  update(player, delta) {
    if (this.isDead || !this.active) return;
    this._updateHpBar();

    const dt = delta / 1000;
    this.hurtTimer = Math.max(0, this.hurtTimer - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - delta);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);

    if (this.hurtTimer > 0) {
      this.setVelocityX(0);
      return;
    }

    if (!player || !player.active) {
      this._doPatrol(dt);
      return;
    }

    // Phase 3.4：AI 節流——每 3 幀做一次決策，跳過幀讓物理引擎用上次的 velocity 持續移動
    // 50 ms 決策延遲對玩家肉眼無感，但 CPU 開銷降到 1/3
    this._aiTick = (this._aiTick + 1) % 3;
    if (this._aiTick !== 0) return;

    // distSq 平方比較取代 sqrt（規則 B）
    const distX = player.x - this.x;
    const distY = player.body.center.y - this.body.center.y;
    const distSq = distX * distX + distY * distY;

    switch (this.behavior) {
      case 'patrol':  this._behaviorPatrol(distSq, distX, player); break;
      case 'chase':   this._behaviorChase(distSq, distX, player);  break;
      case 'ranged':  this._behaviorRanged(distSq, distX, player); break;
      default:        this._behaviorPatrol(distSq, distX, player); break;
    }
  }

  _behaviorPatrol(distSq, distX, player) {
    if (distSq < this._attackRangeSq) {
      this._doAttack(player);
    } else if (distSq < this._detectionRangeSq) {
      this._doChase(distX);
    } else {
      this._doPatrol();
    }
  }

  _behaviorChase(distSq, distX, player) {
    if (distSq < this._attackRangeSq) {
      this._doAttack(player);
    } else if (distSq < this._chaseExtendedSq) {
      this._doChase(distX);
    } else {
      this._doPatrol();
    }
  }

  _behaviorRanged(distSq, distX, player) {
    if (distSq < 10000) { // 100² = 10000，遠離玩家
      this.setVelocityX(distX < 0 ? this.speed : -this.speed);
    } else if (distSq < this._detectionRangeSq) {
      // 保持距離，發射投射物
      this.setVelocityX(0);
      this._doRangedAttack(player);
    } else {
      this._doPatrol();
    }
  }

  _doPatrol() {
    const leftEdge = this.patrolOriginX - this.patrolRange;
    const rightEdge = this.patrolOriginX + this.patrolRange;
    if (this.x <= leftEdge) this.patrolDir = 1;
    if (this.x >= rightEdge) this.patrolDir = -1;
    this.setVelocityX(this.patrolDir * this.speed * 0.6);
    this.setFlipX(this.patrolDir < 0);
    this._tryJump();
  }

  _doChase(distX) {
    // Phase 11.1：X 軸死區（12px）——太近時不繼續追擊，避免 distX 在 ±幾 px
    // 跳動造成 dir 反覆翻轉、原地左右震盪。常見於玩家跳到怪物正上/下方平台、
    // X 已對齊但 attackRange 不夠的情境。仍保留 _tryJump，怪物可嘗試跳上平台接近。
    if (Math.abs(distX) < 12) {
      this.setVelocityX(0);
      this._tryJump();
      return;
    }
    const dir = distX > 0 ? 1 : -1;
    this.setVelocityX(dir * this.speed);
    this.setFlipX(dir < 0);
    this._tryJump();
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
    const dmg = Math.floor(this.atk * (0.8 + Math.random() * 0.4));
    if (player && !player.isInvincible) {
      player.takeDamage(dmg);
    }
    // 攻擊閃爍
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => { if (this.active && !this.isDead) this.clearTint(); });
  }

  _doRangedAttack(player) {
    if (this.rangedCooldown > 0) return;
    this.rangedCooldown = 2000;
    // 用區域變數捕捉 scene 與傷害值：投射物存活 2 秒，期間怪物可能先死亡，
    // 屆時 this.scene 會被 Phaser 清為 null，沿用區域 scene 才不會在 cleanup 中崩潰。
    const scene = this.scene;
    const projDmg = Math.floor(this.atk * 0.7);
    const dir = player.x > this.x ? 1 : -1;
    const center = getVisualCenterPoint(this);
    const proj = scene.physics.add.sprite(this.x, center.y - 10, 'skill-orb');
    proj.setTint(0xff4444);
    proj.setDepth(20);
    proj.body.setAllowGravity(false);
    proj.setVelocity(dir * 250, -50);

    // 投射物銷毀時一併移除 overlap collider，避免長時間遊玩累積死碰撞器
    let overlap = null;
    const cleanup = () => {
      if (overlap && scene.physics?.world) {
        scene.physics.world.removeCollider(overlap);
        overlap = null;
      }
      if (proj.active) proj.destroy();
    };
    overlap = scene.physics.add.overlap(proj, player, (p, pl) => {
      if (!pl?.active || pl.isDead) { cleanup(); return; }
      if (!pl.isInvincible) {
        pl.takeDamage(projDmg);
        cleanup();
      }
    });
    scene.time.delayedCall(2000, cleanup);
  }

  destroy(fromScene) {
    this._destroyHpBar();
    if (this._flashTimer) this._flashTimer.remove();
    super.destroy(fromScene);
  }
}

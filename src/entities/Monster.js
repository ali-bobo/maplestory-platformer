import Phaser from 'phaser';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { rollEquipmentDrop } from '../config/equipment.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterPoint, getVisualCenterY, getVisualTopY } from '../config/alignment.js';

// 怪物 AI 狀態
const STATE = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', HURT: 'hurt', DEAD: 'dead', RANGED: 'ranged' };

function getScaledMonsterProfile(config) {
  const baseProfile = ALIGNMENT_PROFILES.monster;
  const scale = Number.isFinite(config?.visualScale) && config.visualScale > 0 ? config.visualScale : 1;
  if (scale === 1) return baseProfile;
  return {
    ...baseProfile,
    displayWidth: Math.round(baseProfile.displayWidth * scale),
    displayHeight: Math.round(baseProfile.displayHeight * scale),
    bodyWidth: Math.round(baseProfile.bodyWidth * scale),
    bodyOffsetX: Math.round(baseProfile.bodyOffsetX * scale),
    bodyOffsetY: Math.round(baseProfile.bodyOffsetY * scale),
    footPadding: Math.max(1, Math.round(baseProfile.footPadding * scale)),
  };
}

export class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x, y, config.spriteKey || 'monster_slime');
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
    this.hurtTimer = 0;
    this.attackCooldown = 0;
    this.rangedCooldown = 0;
    this.jumpProfile = config.jumpProfile || null;
    this.jumpCooldown = this._rollJumpCooldown();

    // 怪物站位由共享腳底基準 metadata 決定，避免不同圖片來源造成推算漂移。
    this.setCollideWorldBounds(true);
    this.body.setGravityY(0);
    this.setDepth(10);
    this.alignmentProfile = getScaledMonsterProfile(config);
    applyAlignmentProfile(this, this.alignmentProfile);
    if (config.tint) this.setTint(config.tint);

    // 血條背景
    this._hpBg = null;
    this._hpBar = null;
    this._createHpBar();

    this._flashTimer = null;
  }

  _createHpBar() {
    this._hpBg = this.scene.add.graphics();
    this._hpBar = this.scene.add.graphics();
    this._hpBg.setDepth(11);
    this._hpBar.setDepth(12);
    this._updateHpBar();
  }

  _updateHpBar() {
    if (!this._hpBg || !this._hpBar) return;
    const bw = Phaser.Math.Clamp(Math.round(this.displayWidth * 0.62), 32, 64);
    const bh = this.config.spawnRole === 'miniboss' ? 5 : 4;
    const bx = this.x - bw / 2;
    const by = getVisualTopY(this) - 8;
    this._hpBg.clear();
    this._hpBg.fillStyle(0x000000, 0.7);
    this._hpBg.fillRect(bx, by, bw, bh);
    this._hpBar.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this._hpBar.fillStyle(color, 1);
    this._hpBar.fillRect(bx, by, bw * ratio, bh);
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
    this.setTint(0xff6666);
    if (this._flashTimer) this._flashTimer.remove();
    this._flashTimer = this.scene.time.delayedCall(150, () => {
      if (this.active) this.clearTint();
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
        color = '#ff8800'; fontSize = '26px';   // 橘色：高暴擊
      } else {
        color = '#ffff00'; fontSize = '22px';   // 黃色：一般暴擊
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

    // 消失動畫
    this.scene.tweens.add({
      targets: this, alpha: 0, y: this.y - 20, duration: 500,
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

    const distX = player.x - this.x;
    const distY = player.body.center.y - this.body.center.y;
    const dist = Math.sqrt(distX * distX + distY * distY);

    switch (this.behavior) {
      case 'patrol':  this._behaviorPatrol(dist, distX, player); break;
      case 'chase':   this._behaviorChase(dist, distX, player);  break;
      case 'ranged':  this._behaviorRanged(dist, distX, player); break;
      default:        this._behaviorPatrol(dist, distX, player); break;
    }
  }

  _behaviorPatrol(dist, distX, player) {
    if (dist < this.attackRange) {
      this._doAttack(player);
    } else if (dist < this.detectionRange) {
      this._doChase(distX);
    } else {
      this._doPatrol();
    }
  }

  _behaviorChase(dist, distX, player) {
    if (dist < this.attackRange) {
      this._doAttack(player);
    } else if (dist < this.detectionRange * 1.5) {
      this._doChase(distX);
    } else {
      this._doPatrol();
    }
  }

  _behaviorRanged(dist, distX, player) {
    if (dist < 100) {
      // 遠離玩家
      this.setVelocityX(distX < 0 ? this.speed : -this.speed);
    } else if (dist < this.detectionRange) {
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
    this.scene.time.delayedCall(100, () => { if (this.active) this.clearTint(); });
  }

  _doRangedAttack(player) {
    if (this.rangedCooldown > 0) return;
    this.rangedCooldown = 2000;
    const dir = player.x > this.x ? 1 : -1;
    const center = getVisualCenterPoint(this);
    const proj = this.scene.physics.add.sprite(this.x, center.y - 10, 'skill-orb');
    proj.setTint(0xff4444);
    proj.setDepth(20);
    proj.body.setAllowGravity(false);
    proj.setVelocity(dir * 250, -50);
    this.scene.time.delayedCall(2000, () => { if (proj && proj.active) proj.destroy(); });
    // 傷害判定
    this.scene.physics.add.overlap(proj, player, (p, pl) => {
      if (!pl.isInvincible) {
        pl.takeDamage(Math.floor(this.atk * 0.7));
        proj.destroy();
      }
    });
  }

  destroy(fromScene) {
    this._destroyHpBar();
    if (this._flashTimer) this._flashTimer.remove();
    super.destroy(fromScene);
  }
}

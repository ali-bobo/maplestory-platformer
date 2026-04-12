import Phaser from 'phaser';
import { SKILLS, expNeeded, MAP_SCENE_KEYS } from '../config/constants.js';
import { castShuriken, castDash, castAssassinate, castVortex, castClone } from './Skill.js';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { isEquipmentBetter } from '../config/equipment.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, gameState) {
    super(scene, x, y, 'final_char');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.gameState = gameState;
    this.facingRight = true;
    this.jumpsLeft = 2;
    this.isInvincible = false;
    this.isDead = false;
    this.dropThrough = false;
    this.isDashing = false;
    this._jumpKeyWasDown = false;

    // 物理設定（body bottom 對齊 y+28，與怪物站立高度一致）
    this.setCollideWorldBounds(true);
    this.setDisplaySize(56, 56);
    this.body.setSize(28, 56);
    this.body.setOffset(14, 0);
    this.setDepth(20);

    // 技能施放群組快取
    this.enemies = null;

    // 輸入按鍵
    const { LEFT, RIGHT, UP, DOWN, ALT } = Phaser.Input.Keyboard.KeyCodes;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keyZ = scene.input.keyboard.addKey('Z');
    this.keyX = scene.input.keyboard.addKey('X');
    this.keyC = scene.input.keyboard.addKey('C');
    this.keyV = scene.input.keyboard.addKey('V');
    this.keyB = scene.input.keyboard.addKey('B');
    this.keyAlt = scene.input.keyboard.addKey(ALT);

    // 攻擊動畫計時
    this._attackAnimTimer = 0;
  }

  update(delta) {
    if (this.isDead) return;

    const gs = this.gameState;
    const dt = delta / 1000;
    const onGround = this.body.blocked.down;
    const left  = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const down  = this.cursors.down.isDown;
    const jumpNow = Phaser.Input.Keyboard.JustDown(this.keyAlt) || Phaser.Input.Keyboard.JustDown(this.cursors.up);

    // 冷卻計時
    for (const key of Object.keys(gs.skillCooldowns)) {
      gs.skillCooldowns[key] = Math.max(0, gs.skillCooldowns[key] - dt);
    }

    if (this.isDashing) {
      this._updateTexture(onGround);
      return;
    }

    // ─── 移動 ───────────────────────────────────────────────────────────────
    if (left) {
      this.setVelocityX(-gs.speed);
      this.facingRight = false;
      this.setFlipX(true);
    } else if (right) {
      this.setVelocityX(gs.speed);
      this.facingRight = true;
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    // ─── 跳躍 / 下落穿越 ────────────────────────────────────────────────────
    if (onGround) this.jumpsLeft = 2;

    // ↓ 鍵觸發薄平台下穿：按住 DOWN 持續穿越所有薄平台，鬆開後停在下一個平台
    if (down && onGround && !this.dropThrough) {
      this.dropThrough = true;
      this.setVelocityY(80);
    }
    if (!down) {
      this.dropThrough = false;
    }

    if (jumpNow && !down) {
      if (this.jumpsLeft > 0) {
        this.setVelocityY(-520);
        this.jumpsLeft--;
        audio.playSkill('Z');
      }
    }

    // ─── 技能施放 ───────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) this.castSkill('Z');
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) this.castSkill('X');
    if (Phaser.Input.Keyboard.JustDown(this.keyC)) this.castSkill('C');
    if (Phaser.Input.Keyboard.JustDown(this.keyV)) this.castSkill('V');
    if (Phaser.Input.Keyboard.JustDown(this.keyB)) this.castSkill('B');

    // ─── 更新材質 ────────────────────────────────────────────────────────────
    this._attackAnimTimer = Math.max(0, this._attackAnimTimer - delta);
    this._updateTexture(onGround);
  }

  _updateTexture(onGround) {
    // 使用新版 character_player 圖片
    this.setTexture('character_player');
    this.setFlipX(!this.facingRight);
  }

  castSkill(key) {
    const gs = this.gameState;
    const skillDef = SKILLS[key];
    if (!skillDef) return;

    // 解鎖檢查
    if (!gs.unlockedSkills.includes(key)) {
      this._showNotice(`${skillDef.name} 需要 Lv.${skillDef.unlockLevel}`);
      return;
    }

    // 冷卻檢查
    if (gs.skillCooldowns[key] > 0) return;

    // MP 檢查
    if (gs.mp < skillDef.mpCost) {
      this._showNotice('MP不足！');
      return;
    }

    // 消耗 MP 並設定冷卻
    gs.mp = Math.max(0, gs.mp - skillDef.mpCost);
    gs.skillCooldowns[key] = skillDef.cooldown;
    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-mp', null, gs.mp);

    this._attackAnimTimer = 400;

    const enemies = this.enemies;
    switch (key) {
      case 'Z': castShuriken(this.scene, this, enemies);    break;
      case 'X': castDash(this.scene, this, enemies);        break;
      case 'C': castAssassinate(this.scene, this, enemies); break;
      case 'V': castVortex(this.scene, this, enemies);      break;
      case 'B': castClone(this.scene, this, enemies);       break;
    }
    audio.resumeContext();
  }

  takeDamage(amount) {
    if (this.isInvincible || this.isDead) return;
    const gs = this.gameState;
    const defense = this._getDefenseBonus();
    const actual = Math.max(1, Math.floor(amount * (1 - defense)));
    gs.hp = Math.max(0, gs.hp - actual);
    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-hp', null, gs.hp);

    // 傷害閃紅
    this.setTint(0xff4444);
    this.scene.time.delayedCall(200, () => { if (this.active) this.clearTint(); });

    // 無敵時間
    this.isInvincible = true;
    this.scene.time.delayedCall(800, () => { this.isInvincible = false; });

    if (gs.hp <= 0) {
      this._die();
    }
  }

  _getDefenseBonus() {
    const gs = this.gameState;
    const armor = gs.equipment.armor;
    return armor ? Math.min(0.5, armor.hp / 500) : 0;
  }

  gainExp(amount) {
    const gs = this.gameState;
    gs.exp += amount;
    let leveledUp = false;

    while (gs.exp >= gs.expNeeded && gs.level < 30) {
      gs.exp -= gs.expNeeded;
      gs.level++;
      gs.expNeeded = expNeeded(gs.level);
      this._onLevelUp(gs);
      leveledUp = true;
    }
    if (gs.level >= 30) gs.exp = Math.min(gs.exp, gs.expNeeded - 1);

    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-exp', null, gs.exp);
    if (leveledUp) {
      this.scene.registry.events.emit('changedata-level', null, gs.level);
    }
  }

  _onLevelUp(gs) {
    // 屬性提升
    gs.maxHp  = Math.floor(gs.maxHp  + 20);
    gs.maxMp  = Math.floor(gs.maxMp  + 12);
    gs.atk    = Math.floor(gs.atk    + 5);
    gs.speed  = Math.min(320, gs.speed + 2);
    gs.hp = gs.maxHp;
    gs.mp = gs.maxMp;
    // 技能點數（每升一級 +3）
    gs.skillPoints = (gs.skillPoints || 0) + 3;
    this.scene.registry.events.emit('changedata-sp', null, gs.skillPoints);

    // 技能解鎖
    for (const [key, skill] of Object.entries(SKILLS)) {
      if (gs.level >= skill.unlockLevel && !gs.unlockedSkills.includes(key)) {
        gs.unlockedSkills.push(key);
        this._showNotice(`習得新技能：${skill.name}！`);
      }
    }

    // Boss 解鎖
    if (gs.killCount >= 60 && !gs.bossUnlocked) {
      gs.bossUnlocked = true;
      this._showNotice('暗影魔君現身！前往盜賊地下城右側傳送門！', 3000);
    }

    audio.playLevelUp();
    particles.spawnLevelUp(this.scene, this.x, this.y);
    this.scene.registry.events.emit('changedata-levelup', null, gs.level);
  }

  pickupEquipment(equip) {
    const gs = this.gameState;
    if (isEquipmentBetter(equip, gs.equipment[equip.slot])) {
      gs.equipment[equip.slot] = equip;
      gs.atk   += equip.atk   || 0;
      gs.maxHp += equip.hp    || 0;
      gs.maxMp += equip.mp    || 0;
      gs.speed  = Math.min(320, gs.speed + (equip.speed || 0));
      gs.hp = Math.min(gs.hp + (equip.hp || 0), gs.maxHp);
      gs.mp = Math.min(gs.mp + (equip.mp || 0), gs.maxMp);
      this.scene.registry.set('gameState', gs);
      this._showNotice(`裝備了 ${equip.displayName}！`);
    }
  }

  _showNotice(msg, duration = 2000) {
    const cam = this.scene.cameras.main;
    const txt = this.scene.add.text(
      this.x,
      this.y - 60,
      msg,
      { fontSize: '14px', color: '#ffff88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 }
    ).setDepth(90).setOrigin(0.5, 1);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration,
      onComplete: () => txt.destroy(),
    });
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setVelocity(0, -200);
    this.setTint(0xff0000);
    this.scene.time.delayedCall(1500, () => {
      this.scene.scene.start('GameOverScene', { victory: false, gameState: this.gameState });
    });
  }

  // MP 自然回復
  recoverMp(delta) {
    const gs = this.gameState;
    if (gs.mp < gs.maxMp) {
      gs.mp = Math.min(gs.maxMp, gs.mp + delta * 0.01);
      this.scene.registry.set('gameState', gs);
      this.scene.registry.events.emit('changedata-mp', null, gs.mp);
    }
  }

  // HP 自然回復（每秒 +5，受傷無敵期間暫停回復）
  recoverHp(delta) {
    const gs = this.gameState;
    if (gs.hp < gs.maxHp && !this.isInvincible) {
      gs.hp = Math.min(gs.maxHp, gs.hp + delta * 0.005);
      this.scene.registry.set('gameState', gs);
      this.scene.registry.events.emit('changedata-hp', null, gs.hp);
    }
  }
}

import Phaser from 'phaser';
import { SKILLS, expNeeded, MAP_SCENE_KEYS, POTIONS, createInitialGameState } from '../config/constants.js';
import { castShuriken, castDash, castAssassinate, castVortex, castClone } from './Skill.js';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { isEquipmentBetter } from '../config/equipment.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterPoint, getVisualTopY } from '../config/alignment.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, gameState) {
    super(scene, x, y, 'final_char');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // gameState 理應由場景從 registry 傳入；為空時用工廠建一份避免後續深層存取崩潰
    this.gameState = gameState || createInitialGameState();
    this.facingRight = true;
    this.jumpsLeft = 2;
    this.isInvincible = false;
    this.isDead = false;
    this.dropThrough = false;
    this.isDashing = false;
    this._jumpKeyWasDown = false;
    this._throwAnimTween = null;
    // HP/MP 自然回復的 UI 節流：只在顯示整數改變時才更新 registry/事件
    this._lastEmittedHp = -1;
    this._lastEmittedMp = -1;

    // 角色站位由共享腳底基準 metadata 決定，避免各類實體各自猜測底部留白。
    this.setCollideWorldBounds(true);
    applyAlignmentProfile(this, ALIGNMENT_PROFILES.player);
    this.setDepth(20);

    // 技能施放群組快取
    this.enemies = null;

    // 目標選取框（單一 Graphics 物件複用，每幀同步最近怪物的位置）
    this._targetGfx = scene.add.graphics().setDepth(13);

    // 輸入按鍵
    const { LEFT, RIGHT, UP, DOWN, ALT } = Phaser.Input.Keyboard.KeyCodes;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keyZ = scene.input.keyboard.addKey('Z');
    this.keyX = scene.input.keyboard.addKey('X');
    this.keyC = scene.input.keyboard.addKey('C');
    this.keyV = scene.input.keyboard.addKey('V');
    this.keyB = scene.input.keyboard.addKey('B');
    this.keyAlt = scene.input.keyboard.addKey(ALT);
    // 藥水快捷鍵
    this.keyPotA = scene.input.keyboard.addKey('A');
    this.keyPotS = scene.input.keyboard.addKey('S');
    this.keyPotD = scene.input.keyboard.addKey('D');
    // F 鍵保留給 NPC 對話 / 任務接收（BaseMapScene），這裡改用 R 鍵作為第 4 個藥水鍵
    this.keyPotR = scene.input.keyboard.addKey('R');
    this.keyPotG = scene.input.keyboard.addKey('G');

    // Phase 4.0：修復場景切換時冷卻卡死 bug
    // gs.skillCooldowns 持久化在 registry，但 Player 物件在傳送門切場景時會 new 一個新的。
    // 必須掃描現有冷卻值，重建 _coolingDownKeys Set，否則 update() 不會遞減 → 永卡冷卻。
    this._coolingDownKeys = new Set();
    const cds = this.gameState.skillCooldowns || {};
    for (const key in cds) {
      if (cds[key] > 0) this._coolingDownKeys.add(key);
    }
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

    // Phase 3.6 + 4.0：冷卻計時優化——用 Set 追蹤「正在冷卻」的技能 key
    // Set 在 constructor 中初始化並從 gs.skillCooldowns 重建（修復場景切換 bug）
    if (this._coolingDownKeys.size > 0) {
      for (const key of this._coolingDownKeys) {
        const cd = (gs.skillCooldowns[key] || 0) - dt;
        if (cd <= 0) {
          gs.skillCooldowns[key] = 0;
          this._coolingDownKeys.delete(key);
        } else {
          gs.skillCooldowns[key] = cd;
        }
      }
    }

    if (this.isDashing) {
      this._updateFacing();
      this._updateTargetBox();
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

    // ─── 藥水快捷鍵 ─────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyPotA)) this.usePotion('A');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotS)) this.usePotion('S');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotD)) this.usePotion('D');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotR)) this.usePotion('R');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotG)) this.usePotion('G');

    // ─── 更新面向 + 目標框 ──────────────────────────────────────────────────
    this._updateFacing();
    this._updateTargetBox();
  }

  _updateFacing() {
    this.setFlipX(!this.facingRight);
  }

  // 找到最近的活怪物（供目標選取框用）
  _findNearestMonster() {
    if (!this.enemies) return null;
    let nearest = null;
    let minDist = Infinity;
    for (const m of this.enemies.getChildren()) {
      if (!m.active || (m.hp !== undefined && m.hp <= 0)) continue;
      const dx = m.x - this.x;
      const dy = m.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = m;
      }
    }
    return nearest;
  }

  // 每幀更新目標選取框位置（橙色外框，跟隨最近怪物）
  _updateTargetBox() {
    if (!this._targetGfx || !this._targetGfx.active) return;
    const target = this._findNearestMonster();
    if (target && target.active) {
      const pad = 5;
      const hw = target.displayWidth / 2 + pad;
      const hh = target.displayHeight / 2 + pad;
      this._targetGfx.clear();
      this._targetGfx.lineStyle(2, 0xff8800, 0.85);
      this._targetGfx.strokeRect(target.x - hw, target.y - hh, hw * 2, hh * 2);
    } else {
      this._targetGfx.clear();
    }
  }

  playThrowAnimation(duration = 200) {
    if (this.anims && this.anims.animationManager && this.anims.animationManager.exists('throw')) {
      this.play('throw', true);
      this.scene.time.delayedCall(duration, () => {
        if (this.active && this.anims.isPlaying) this.anims.stop();
      });
      return;
    }

    if (this._throwAnimTween) this._throwAnimTween.remove();
    const throwAngle = this.facingRight ? -18 : 18;
    this.setAngle(throwAngle);
    this._throwAnimTween = this.scene.tweens.add({
      targets: this,
      angle: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.active) this.setAngle(0);
        this._throwAnimTween = null;
      },
    });
  }

  usePotion(slot) {
    const gs = this.gameState;
    if (!gs.potions) return;
    const qty = gs.potions[slot] || 0;
    if (qty <= 0) {
      this._showNotice('藥水不足！');
      return;
    }
    const potion = POTIONS[slot];
    if (!potion) return;

    gs.potions[slot]--;
    if (potion.hpRestore > 0) {
      gs.hp = Math.min(gs.maxHp, gs.hp + potion.hpRestore);
      this.scene.registry.events.emit('changedata-hp', null, gs.hp);
    }
    if (potion.mpRestore > 0) {
      gs.mp = Math.min(gs.maxMp, gs.mp + potion.mpRestore);
      this.scene.registry.events.emit('changedata-mp', null, gs.mp);
    }
    this.scene.registry.set('gameState', gs);
    // 顯示回復效果（萬靈藥同時回復 HP+MP 時顯示兩者）
    let restoreMsg;
    if (potion.hpRestore > 0 && potion.mpRestore > 0) {
      restoreMsg = 'HP/MP';
    } else if (potion.hpRestore > 0) {
      restoreMsg = 'HP';
    } else {
      restoreMsg = 'MP';
    }
    this._showNotice(`使用 ${potion.name}  +${restoreMsg}`, 1200);
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
    // Phase 3.6：把進入冷卻的 key 加入 Set，update() 才會去遞減它
    // （Set 已在 constructor 初始化，這裡不需 lazy check）
    this._coolingDownKeys.add(key);
    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-mp', null, gs.mp);

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
      // 升級音效 + 粒子 + UI 全屏演出一律發出一次（避免多級同時累加）
      audio.playLevelUp();
      const center = getVisualCenterPoint(this);
      particles.spawnLevelUp(this.scene, center.x, center.y);
      this.scene.registry.events.emit('changedata-levelup', null, gs.level);
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

    // 技能解鎖（解鎖即獲得 1 級，之後可在技能欄花 SP 升級）
    for (const [key, skill] of Object.entries(SKILLS)) {
      if (gs.level >= skill.unlockLevel && !gs.unlockedSkills.includes(key)) {
        gs.unlockedSkills.push(key);
        gs.skillLevels[key] = Math.max(1, gs.skillLevels[key] || 0);
        this._showNotice(`習得新技能：${skill.name}！`);
      }
    }

    // Boss 解鎖
    if (gs.killCount >= 60 && !gs.bossUnlocked) {
      gs.bossUnlocked = true;
      this._showNotice('暗影魔君現身！前往盜賊地下城右側傳送門！', 3000);
    }
  }

  pickupEquipment(equip) {
    const gs = this.gameState;
    const slot = equip.slot;
    if (isEquipmentBetter(equip, gs.equipment[slot])) {
      // 換裝前先扣除舊裝備的加成，避免每次撿裝備數值無限疊加
      const old = gs.equipment[slot];
      if (old) {
        gs.atk   -= old.atk   || 0;
        gs.maxHp -= old.hp    || 0;
        gs.maxMp -= old.mp    || 0;
        gs.speed -= old.speed || 0;
      }
      gs.equipment[slot] = equip;
      gs.atk   += equip.atk   || 0;
      gs.maxHp += equip.hp    || 0;
      gs.maxMp += equip.mp    || 0;
      gs.speed  = Math.min(320, gs.speed + (equip.speed || 0));
      gs.hp = Math.min(gs.hp, gs.maxHp);
      gs.mp = Math.min(gs.mp, gs.maxMp);
      this.scene.registry.set('gameState', gs);
      this._showNotice(`裝備了 ${equip.displayName}！`);
    }
  }

  _showNotice(msg, duration = 2000) {
    const topY = getVisualTopY(this);
    const txt = this.scene.add.text(
      this.x,
      topY - 8,
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
    this.isDashing = false;
    this.setAlpha(1);
    this.body.setAllowGravity(true);
    this.setVelocity(0, -200);
    this.setTint(0xff0000);
    this.scene.time.delayedCall(1500, () => {
      this.scene.scene.stop('UIScene');
      this.scene.scene.start('GameOverScene', { victory: false, gameState: this.gameState });
    });
  }

  // MP 自然回復（數值每幀平滑累加，但 registry/UI 只在顯示整數改變時更新 — 節流）
  recoverMp(delta) {
    const gs = this.gameState;
    if (gs.mp < gs.maxMp) {
      gs.mp = Math.min(gs.maxMp, gs.mp + delta * 0.01);
      const shown = Math.ceil(gs.mp);
      if (shown !== this._lastEmittedMp) {
        this._lastEmittedMp = shown;
        this.scene.registry.set('gameState', gs);
        this.scene.registry.events.emit('changedata-mp', null, gs.mp);
      }
    }
  }

  // HP 自然回復（每秒 +5，受傷無敵期間暫停回復；同樣節流 UI 更新）
  recoverHp(delta) {
    const gs = this.gameState;
    if (gs.hp < gs.maxHp && !this.isInvincible) {
      gs.hp = Math.min(gs.maxHp, gs.hp + delta * 0.005);
      const shown = Math.ceil(gs.hp);
      if (shown !== this._lastEmittedHp) {
        this._lastEmittedHp = shown;
        this.scene.registry.set('gameState', gs);
        this.scene.registry.events.emit('changedata-hp', null, gs.hp);
      }
    }
  }

  destroy(fromScene) {
    if (this._throwAnimTween) {
      this._throwAnimTween.remove();
      this._throwAnimTween = null;
    }
    if (this._targetGfx) {
      this._targetGfx.destroy();
      this._targetGfx = null;
    }
    super.destroy(fromScene);
  }
}

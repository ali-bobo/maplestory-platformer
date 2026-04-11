import { Monster } from './Monster.js';
import { particles } from '../engine/particles.js';

// 暗影魔君 — 3階段 Boss
export class Boss extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, {
      id: 'boss',
      name: '暗影魔君',
      level: 30,
      hp: 10000,
      atk: 160,
      exp: 5000,
      speed: 120,
      meso: 500,
      dropRate: 1.0,
      behavior: 'chase',
      spriteKey: 'monster-boss',
      area: 'boss',
    });

    this.phase = 1;
    this.maxHp = 10000;
    this.hp = 10000;
    this.setScale(2.5);
    this._phaseTransitioning = false;
    this._summonCooldown = 0;
    this._slamCooldown = 0;
    this._berserking = false;

    // Boss 名稱文字
    this._nameText = scene.add.text(scene.cameras.main.width / 2, 80, '暗影魔君', {
      fontSize: '24px', color: '#ff44ff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0.5);

    // Boss 血條（固定在畫面上方）
    this._bossHpBg = scene.add.graphics().setScrollFactor(0).setDepth(99);
    this._bossFgBar = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this._updateBossHpBar();
  }

  _updateBossHpBar() {
    const sw = this.scene.cameras.main.width;
    const bw = sw * 0.7, bh = 16, bx = sw * 0.15, by = 100;
    this._bossHpBg.clear();
    this._bossHpBg.fillStyle(0x000000, 0.8);
    this._bossHpBg.fillRect(bx, by, bw, bh);
    this._bossFgBar.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    this._bossFgBar.fillStyle(0xff0066);
    this._bossFgBar.fillRect(bx, by, bw * ratio, bh);
    // 相位標記
    this._bossFgBar.lineStyle(2, 0xffffff, 0.6);
    this._bossFgBar.strokeRect(bx, by, bw, bh);
    this._bossFgBar.strokeRect(bx + bw * 0.4, by, bw * 0.6, bh);
    this._bossFgBar.strokeRect(bx + bw * 0.7, by, bw * 0.3, bh);
  }

  takeDamage(amount, isCrit = false) {
    super.takeDamage(amount, isCrit);
    if (!this.isDead) {
      this._updateBossHpBar();
      this._checkPhaseTransition();
    }
  }

  _checkPhaseTransition() {
    if (this._phaseTransitioning) return;
    const ratio = this.hp / this.maxHp;
    if (this.phase === 1 && ratio <= 0.6) {
      this._transitionToPhase(2);
    } else if (this.phase === 2 && ratio <= 0.3) {
      this._transitionToPhase(3);
    }
  }

  _transitionToPhase(newPhase) {
    this._phaseTransitioning = true;
    this.phase = newPhase;

    // 相位過渡特效
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    flash.setScrollFactor(0).setDepth(200);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });

    particles.spawnDeath(this.scene, this.x, this.y, 0xff00ff);

    // 相位文字
    const phaseText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      `第${newPhase}階段！`,
      { fontSize: '48px', color: '#ff00ff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 6 }
    ).setScrollFactor(0).setDepth(201).setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: phaseText, y: phaseText.y - 80, alpha: 0, duration: 2000,
      onComplete: () => phaseText.destroy(),
    });

    // 第2階段：召喚援軍
    if (newPhase === 2) {
      this.scene.time.delayedCall(500, () => this._summonMinions());
    }
    // 第3階段：狂暴模式
    if (newPhase === 3) {
      this._berserking = true;
      this.speed *= 1.5;
      this.atk = Math.floor(this.atk * 1.5);
      this.setTint(0xff0000);
    }

    this.scene.time.delayedCall(1000, () => { this._phaseTransitioning = false; });
  }

  _summonMinions() {
    if (!this.scene || !this.scene.sys.isActive()) return;
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 400, () => {
        this.scene.events.emit('boss-summon-minion', {
          x: this.x + (i - 1) * 120,
          y: this.y,
        });
      });
    }
  }

  update(player, delta) {
    if (this.isDead) return;
    super.update(player, delta);
    this._updateBossHpBar();

    this._summonCooldown = Math.max(0, this._summonCooldown - delta);
    this._slamCooldown = Math.max(0, this._slamCooldown - delta);

    if (!player || !player.active) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 第1階段：地面重擊
    if (this.phase >= 1 && this._slamCooldown <= 0 && dist < 200) {
      this._groundSlam(player);
    }

    // 第2/3階段：召喚冷卻
    if (this.phase >= 2 && this._summonCooldown <= 0) {
      this._summonCooldown = 8000;
      this._summonMinions();
    }
  }

  _groundSlam(player) {
    this._slamCooldown = this._berserking ? 1500 : 3000;
    // 震動效果
    this.scene.cameras.main.shake(300, 0.015);
    particles.spawnDeath(this.scene, this.x, this.y + 20, 0x884400);

    // AoE 傷害
    const dmg = Math.floor(this.atk * (this._berserking ? 1.8 : 1.2));
    if (player && !player.isInvincible) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < 150) player.takeDamage(dmg);
    }
  }

  die() {
    super.die();
    if (this._nameText) this._nameText.destroy();
    if (this._bossHpBg) this._bossHpBg.destroy();
    if (this._bossFgBar) this._bossFgBar.destroy();
    this.scene.events.emit('boss-defeated');
  }

  destroy(fromScene) {
    if (this._nameText && this._nameText.active) this._nameText.destroy();
    if (this._bossHpBg && this._bossHpBg.active) this._bossHpBg.destroy();
    if (this._bossFgBar && this._bossFgBar.active) this._bossFgBar.destroy();
    super.destroy(fromScene);
  }
}

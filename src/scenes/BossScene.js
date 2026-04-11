import Phaser from 'phaser';
import { BaseMapScene } from './BaseMapScene.js';
import { Boss } from '../entities/Boss.js';
import { MONSTERS } from '../config/monsters.js';
import { Monster } from '../entities/Monster.js';
import { particles } from '../engine/particles.js';

// Boss 戰鬥場景
export class BossScene extends BaseMapScene {
  constructor() {
    super('BossScene', 'boss');
    this._boss = null;
    this._bossSpawned = false;
  }

  create() {
    super.create();
    this._spawnBoss();
    this._setupBossEvents();
  }

  _spawnBoss() {
    // 場景提示
    const { width } = this.cameras.main;
    const warningText = this.add.text(width / 2, 200, '⚠ 暗影魔君降臨！⚠', {
      fontSize: '36px', color: '#ff00ff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

    this.cameras.main.shake(500, 0.02);
    particles.spawnDeath(this, width / 2, 300, 0xaa00ff);

    this.time.delayedCall(1500, () => {
      warningText.destroy();
      this._boss = new Boss(this, 900, 620);
      this.monsters.add(this._boss);
      this._bossSpawned = true;

      // Boss 也可以站在平台上
      this.physics.add.collider(this._boss, this.platforms);
      this.physics.add.collider(this._boss, this.thinPlatforms);
    });
  }

  _setupBossEvents() {
    // Boss 召喚援軍
    this.events.on('boss-summon-minion', (data) => {
      const minionDef = MONSTERS.find(m => m.id === 'shadow-slime');
      if (!minionDef) return;
      const minion = new Monster(this, data.x, data.y - 30, minionDef);
      this.monsters.add(minion);
      this.physics.add.collider(minion, this.platforms);
      this.physics.add.collider(minion, this.thinPlatforms);
    });

    // Boss 被擊敗
    this.events.on('boss-defeated', () => {
      this._onBossDefeated();
    });
  }

  _onBossDefeated() {
    const { width, height } = this.cameras.main;

    // 勝利特效
    this.cameras.main.flash(1000, 255, 215, 0);
    particles.spawnLevelUp(this, width / 2, height / 2);

    const victoryText = this.add.text(width / 2, height / 2 - 60, '🏆 勝利！', {
      fontSize: '64px', color: '#ffcc00', fontFamily: 'Arial',
      stroke: '#aa6600', strokeThickness: 8,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(200);

    this.time.delayedCall(3000, () => {
      const gs = this.registry.get('gameState');
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { victory: true, gameState: gs });
    });
  }

  update(time, delta) {
    super.update(time, delta);
    if (this._boss && this._boss.active && !this._boss.isDead && this.player) {
      this._boss.update(this.player, delta);
    }
  }
}

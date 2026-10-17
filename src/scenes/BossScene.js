import Phaser from 'phaser';
import { BaseMapScene } from './BaseMapScene.js';
import { Boss } from '../entities/Boss.js';
import { particles } from '../engine/particles.js';
import { writeSave } from '../engine/saveGame.js';

// Boss 戰鬥場景
export class BossScene extends BaseMapScene {
  constructor() {
    super('BossScene', 'boss');
    this._boss = null;
    this._bossSpawned = false;
  }

  create() {
    super.create();
    this._bossDefeated = false;
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
      this._alignDynamicEntityToPlatformTop(this._boss, this._getClosestPlatformTopY(this._boss.x, 620));
      // monsters 群組已有地板 / 單向薄平台的 collider；不要再替 Boss 單獨加一組（會繞過單向判定）
      this.monsters.add(this._boss);
      this._bossSpawned = true;
    });
  }

  _setupBossEvents() {
    // Boss 被擊敗
    this._onBossDefeatedEvent = () => this._onBossDefeated();

    this.events.on('boss-defeated', this._onBossDefeatedEvent);

    // this.events 是場景級 EventEmitter，場景 shutdown 不會自動清空它，
    // 必須手動 off，否則重玩二度進入 BossScene 時監聽器會疊加（重複轉場）。
    this.events.once('shutdown', this._cleanupBossEvents, this);
  }

  _cleanupBossEvents() {
    if (this._onBossDefeatedEvent) {
      this.events.off('boss-defeated', this._onBossDefeatedEvent);
      this._onBossDefeatedEvent = null;
    }
  }

  _onBossDefeated() {
    if (this._bossDefeated) return;  // 防重入：boss-defeated 只處理一次
    this._bossDefeated = true;
    const { width, height } = this.cameras.main;

    // 通關旗標：立即寫進存檔（Boss 房讀檔會回魔君王城，那裡的回程傳送門因此出現）
    const gsNow = this.registry.get('gameState');
    if (gsNow) {
      gsNow.gameCleared = true;
      writeSave(gsNow);
    }

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
    // super.update() 已透過 monsters 群組迭代更新 Boss，不需額外呼叫
    super.update(time, delta);
  }
}

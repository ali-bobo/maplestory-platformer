import Phaser from 'phaser';
import { createInitialGameState } from '../config/constants.js';
import { audio } from '../engine/audio.js';
import { clearSave, autoSave, startFromState } from '../engine/saveService.js';
import { calcScore, applyDeathPenalty, countEquipment } from '../engine/death.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this._victory = data && data.victory;
    this._gs = data && data.gameState;
    this._deathX = data && data.deathX;
  }

  create() {
    audio.stopBgm();   // 結算畫面停止地圖 BGM
    const { width, height } = this.cameras.main;
    const gs = this._gs || {};
    // 通關後清除存檔，避免從已通關的狀態繼續。
    // 死亡：立即算出重生狀態（失去裝備）並寫入存檔，關閉分頁也無法逃避懲罰。
    this._lostEquipCount = 0;
    this._respawn = null;
    if (this._victory) {
      clearSave();
    } else {
      this._lostEquipCount = countEquipment(gs);
      this._respawn = applyDeathPenalty(gs, this._deathX);
      autoSave(this._respawn);
    }

    // 背景
    const bg = this.add.graphics();
    if (this._victory) {
      bg.fillGradientStyle(0x111100, 0x111100, 0x332200, 0x332200, 1);
    } else {
      bg.fillGradientStyle(0x110000, 0x110000, 0x220011, 0x220011, 1);
    }
    bg.fillRect(0, 0, width, height);

    // 裝飾粒子效果
    if (this._victory) {
      for (let i = 0; i < 40; i++) {
        const star = this.add.graphics();
        star.fillStyle(0xffcc00, Math.random() * 0.7 + 0.3);
        star.fillCircle(Math.random() * width, Math.random() * height, Math.random() * 3 + 1);
      }
    }

    // 標題
    const title = this._victory ? '🏆 勝利！' : '☠ 遊戲結束';
    const titleColor = this._victory ? '#ffcc00' : '#ff4444';
    this.add.text(width / 2, 120, title, {
      fontSize: '64px', color: titleColor, fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5, 0.5);

    if (this._victory) {
      this.add.text(width / 2, 190, '恭喜您擊敗了暗影魔君！', {
        fontSize: '24px', color: '#ffee88', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
    } else {
      const lost = this._lostEquipCount > 0
        ? `重新開始將失去身上的 ${this._lostEquipCount} 件裝備`
        : '重新開始不會損失任何裝備（目前未穿戴裝備）';
      this.add.text(width / 2, 190, lost, {
        fontSize: '20px', color: '#ffaa88', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
    }

    // 統計資訊
    const statsY = 260;
    const score = calcScore(gs, this._victory);
    const statsData = [
      ['分數',        `${score}`],
      ['達到等級',    `Lv.${gs.level || 1}`],
      ['擊殺數',      `${gs.killCount || 0} 隻`],
      ['獲得金幣',    `${gs.meso || 0} 金`],
      ['遊戲時間',    this._formatTime(gs.playTime || 0)],
    ];

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.6);
    panelBg.fillRoundedRect(width / 2 - 200, statsY - 20, 400, statsData.length * 44 + 40, 10);

    statsData.forEach(([label, value], i) => {
      const y = statsY + 10 + i * 44;
      this.add.text(width / 2 - 150, y, label, {
        fontSize: '20px', color: '#aaccff', fontFamily: 'Arial',
      });
      this.add.text(width / 2 + 150, y, value, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'Arial',
      }).setOrigin(1, 0);
    });

    // 按鈕
    const btnY = statsY + statsData.length * 44 + 80;
    // 死亡：從死亡點重新開始（失去裝備，其餘進度保留）；通關：開始新遊戲
    const retryLabel = this._victory ? '再玩一次' : '從死亡點重新開始';
    this._makeButton(width / 2 - 120, btnY, retryLabel, () => {
      if (this._respawn) {
        startFromState(this, this._respawn, this._respawn.spawnX);
        return;
      }
      const fresh = createInitialGameState();
      this.registry.set('gameState', fresh);
      this.scene.start('MapleIslandScene', { gameState: fresh });
    });

    this._makeButton(width / 2 + 120, btnY, '主選單', () => {
      this.scene.start('MenuScene');
    });
  }

  _makeButton(x, y, label, callback) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffff44' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', callback);
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  }
}

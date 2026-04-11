import Phaser from 'phaser';
import { DEFAULT_GAME_STATE } from '../config/constants.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this._victory = data && data.victory;
    this._gs = data && data.gameState;
  }

  create() {
    const { width, height } = this.cameras.main;
    const gs = this._gs || {};

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
    }

    // 統計資訊
    const statsY = 260;
    const statsData = [
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
    this._makeButton(width / 2 - 120, btnY, '再試一次', () => {
      const fresh = { ...DEFAULT_GAME_STATE };
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

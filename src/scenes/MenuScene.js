import Phaser from 'phaser';
import { createInitialGameState } from '../config/constants.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // 主選單背景（等比放大填滿畫面）
    if (this.textures.exists('title_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'title_bg');
      bg.setScale(Math.max(width / bg.width, height / bg.height));
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0xffffff);
    }

    // 遊戲標題
    this.add.text(width / 2, 140, '盜賊傳說', {
      fontSize: '72px', color: '#3a2410', fontFamily: 'Arial, sans-serif',
      stroke: '#fff4dc', strokeThickness: 8,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // 封面角色圖（title_hero，保持原比例，浮動動畫）
    const charImg = this.add.image(width / 2, 370, 'title_hero')
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: charImg, y: 370 - 14, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 開始遊戲按鈕
    const btnBg = this.add.rectangle(width / 2, 530, 260, 60, 0x222222, 1)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, 530, '開始遊戲', {
      fontSize: '30px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x444444);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x222222);
    });
    btnBg.on('pointerdown', () => this._startGame());

    // 按任意鍵也可開始
    this.input.keyboard.once('keydown', () => this._startGame());
  }

  _startGame() {
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);
    this.scene.start('MapleIslandScene');
  }
}

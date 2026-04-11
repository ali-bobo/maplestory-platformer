import Phaser from 'phaser';
import { DEFAULT_GAME_STATE } from '../config/constants.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // 背景漸層
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000033, 0x000033, 0x110022, 0x110022, 1);
    bg.fillRect(0, 0, width, height);

    // 裝飾星星
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.7;
      const r = Math.random() * 1.5 + 0.5;
      const star = this.add.graphics();
      star.fillStyle(0xffffff, Math.random() * 0.5 + 0.3);
      star.fillCircle(x, y, r);
    }

    // 雲朵背景
    for (let i = 0; i < 5; i++) {
      this.add.image(
        100 + i * 240 + Math.random() * 100,
        100 + Math.random() * 80,
        'bg-cloud'
      ).setAlpha(0.3).setScale(1.5 + Math.random());
    }

    // 遊戲標題
    this.add.text(width / 2, 160, '盜賊傳說', {
      fontSize: '72px', color: '#ffcc00', fontFamily: 'Arial',
      stroke: '#aa6600', strokeThickness: 8,
      shadow: { blur: 20, color: '#ff8800', fill: true },
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, 230, '楓之谷風格平台遊戲', {
      fontSize: '24px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#002244', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // 玩家預覽
    const previewPlayer = this.add.image(width / 2, 340, 'player-idle').setScale(3);
    this.tweens.add({
      targets: previewPlayer, y: 340 - 12, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 開始按鈕
    const startBtn = this.add.text(width / 2, 440, '[ 開始遊戲 ]', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ color: '#ffff00' }));
    startBtn.on('pointerout',  () => startBtn.setStyle({ color: '#ffffff' }));
    startBtn.on('pointerdown', () => this._startGame());

    // 閃爍動畫
    this.tweens.add({
      targets: startBtn, alpha: 0.4, duration: 600,
      yoyo: true, repeat: -1,
    });

    // 按任意鍵開始
    this.input.keyboard.once('keydown', () => this._startGame());

    // 操作說明
    const controlsY = 530;
    this.add.text(width / 2, controlsY, '操作說明', {
      fontSize: '18px', color: '#ffaa44', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    const controls = [
      '← → 移動     Alt / ↑ 跳躍（可二段跳）     ↓ + Alt 下落穿越平台',
      'Z 三連飛鏢   X 暗影步伐(Lv5)   C 暗殺(Lv10)   V 漩渦(Lv15)   B 影分身(Lv20)',
    ];
    controls.forEach((line, i) => {
      this.add.text(width / 2, controlsY + 30 + i * 28, line, {
        fontSize: '14px', color: '#cccccc', fontFamily: 'Arial',
      }).setOrigin(0.5, 0);
    });

    // 版本
    this.add.text(width - 10, height - 10, 'v3.0 Iteration 3', {
      fontSize: '12px', color: '#555566', fontFamily: 'Arial',
    }).setOrigin(1, 1);
  }

  _startGame() {
    // 重置遊戲狀態
    const gs = { ...DEFAULT_GAME_STATE };
    this.registry.set('gameState', gs);
    this.scene.start('MapleIslandScene');
  }
}

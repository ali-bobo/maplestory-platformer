import Phaser from 'phaser';
import { createInitialGameState, MAP_SCENE_KEYS } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { addWoodButton } from '../engine/woodUi.js';
import { getSaveSummary, loadGame } from '../engine/saveGame.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this._starting = false;
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

    const summary = getSaveSummary();
    if (summary) {
      // 有存檔：繼續遊戲（主按鈕）+ 新遊戲（要按兩次確認，避免誤蓋存檔）
      const mapName = MAPS[summary.map]?.name || '晨曦鎮';
      addWoodButton(this, width / 2, 520, 300, 58, '繼續遊戲', () => this._continueGame(), { fontSize: 26 });
      this.add.text(width / 2, 560, `Lv.${summary.level} · ${mapName}`, {
        fontSize: '16px', color: '#fff4dc', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#3a2410', strokeThickness: 4,
      }).setOrigin(0.5, 0);
      let confirmNew = false;
      const newBtn = addWoodButton(this, width / 2, 618, 220, 42, '新遊戲', () => {
        if (!confirmNew) {
          confirmNew = true;
          newBtn.label.setText('再按一次：覆蓋存檔');
          this.time.delayedCall(2500, () => { confirmNew = false; newBtn.label.setText('新遊戲'); });
          return;
        }
        this._startGame();
      }, { fontSize: 17 });
      this.input.keyboard.once('keydown', () => this._continueGame());
    } else {
      addWoodButton(this, width / 2, 530, 300, 60, '開始遊戲', () => this._startGame(), { fontSize: 28 });
      // 按任意鍵也可開始
      this.input.keyboard.once('keydown', () => this._startGame());
    }
  }

  _continueGame() {
    if (this._starting) return;
    const gs = loadGame();
    if (!gs) { this._startGame(); return; }
    this._starting = true;
    this.registry.set('gameState', gs);
    this.scene.start(MAP_SCENE_KEYS[gs.currentMap] || 'TownScene', { gameState: gs });
  }

  _startGame() {
    if (this._starting) return;
    this._starting = true;
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);
    this.scene.start('MapleIslandScene');
  }
}

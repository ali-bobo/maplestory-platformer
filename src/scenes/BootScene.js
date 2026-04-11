import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { DEFAULT_GAME_STATE } from '../config/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // 初始化遊戲狀態
    const gs = { ...DEFAULT_GAME_STATE };
    this.registry.set('gameState', gs);

    // 生成所有材質
    generateTextures(this);

    // 啟動主選單
    this.scene.start('MenuScene');
  }
}

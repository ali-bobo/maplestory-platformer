import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { DEFAULT_GAME_STATE } from '../config/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // ── 角色圖片 ──
    this.load.image('thief', 'dist/assets/thief.png');

    // ── 地圖背景 ──
    this.load.image('bg_sky',   'dist/assets/bg_sky.png');
    this.load.image('bg_ruins', 'dist/assets/bg_ruins.png');
    this.load.image('bg_city',  'dist/assets/bg_city.png');

    // ── 12 個怪物（各自獨立 PNG，去白底） ──
    const monsterKeys = [
      'slime', 'mushroom', 'snail', 'stump',
      'boar',  'robot',    'skeleton', 'snake',
      'dragon','cyclops',  'golem',    'mimic',
    ];
    for (const k of monsterKeys) {
      this.load.image(`monster_${k}`, `dist/assets/monster_${k}.png`);
    }
  }

  create() {
    // 初始化遊戲狀態
    const gs = { ...DEFAULT_GAME_STATE };
    this.registry.set('gameState', gs);

    // 生成平台、技能特效、UI 等程序材質（背景/角色/怪物已改用真實圖片）
    generateTextures(this);

    // 啟動主選單
    this.scene.start('MenuScene');
  }
}

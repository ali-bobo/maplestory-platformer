import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { DEFAULT_GAME_STATE } from '../config/constants.js';
import { PRELOAD_IMAGE_ASSETS } from '../config/assetCatalog.js';
import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    for (const asset of PRELOAD_IMAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
  }

  create() {
    // 初始化遊戲狀態
    const gs = { ...DEFAULT_GAME_STATE };
    this.registry.set('gameState', gs);

    // 註冊 rex PostFX pipelines（GlowFilter / Shockwave）
    const renderer = this.renderer;
    if (renderer && renderer.pipelines) {
      renderer.pipelines.addPostPipeline('GlowFilter', GlowFilterPostFxPipeline);
      renderer.pipelines.addPostPipeline('Shockwave', ShockwavePostFxPipeline);
    }

    // 生成平台、技能特效、UI 等程序材質（背景/角色/怪物已改用真實圖片）
    generateTextures(this);

    // 啟動主選單
    this.scene.start('MenuScene');
  }
}

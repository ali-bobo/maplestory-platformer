import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { createInitialGameState } from '../config/constants.js';
import { PRELOAD_IMAGE_ASSETS, PRELOAD_SPRITESHEET_ASSETS } from '../config/assetCatalog.js';
import { initVfxTextures } from '../engine/vfxTextures.js';
import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';
import { isTouchDevice } from '../engine/device.js';
import { downscaleTexture } from '../engine/assetLoader.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // 只載入 scope 'boot' 的小圖（HUD、圖示、主選單背景）；其餘依需要載入
  preload() {
    for (const asset of PRELOAD_IMAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
    for (const asset of PRELOAD_SPRITESHEET_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, { frameWidth: asset.frameWidth, frameHeight: asset.frameHeight });
    }
  }

  create() {
    // 初始化遊戲狀態
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);

    // Phase 6：自適應品質預設 high（FPS 監測器會依裝置能力動態調整）
    // 用獨立 registry key，不進存檔（裝置相關設定）
    if (!this.registry.get('qualityLevel')) {
      // 手機 GPU 較弱：預設 medium，FPS 監測器仍會依實際表現上下調整
      this.registry.set('qualityLevel', isTouchDevice() ? 'medium' : 'high');
    }

    // 註冊 rex PostFX pipelines（GlowFilter / Shockwave）
    const renderer = this.renderer;
    if (renderer && renderer.pipelines) {
      renderer.pipelines.addPostPipeline('GlowFilter', GlowFilterPostFxPipeline);
      renderer.pipelines.addPostPipeline('Shockwave', ShockwavePostFxPipeline);
    }

    // 生成平台、技能特效、UI 等程序材質（背景/角色/怪物已改用真實圖片）
    generateTextures(this);

    // 背景 / 怪物 / NPC / 跳台 / 職業動作圖 / 特效不在開機載入：進入地圖時由 BaseMapScene.preload 依需要載入
    // （src/engine/assetPlan.js 決定清單，assetCatalog.js 的 scope 標籤為準）；怪物去背在首次生成時才處理。

    downscaleTexture(this, 'title_bg');   // 主選單背景 1376×768 → 1280×714（與地圖背景一致）

    // 預渲染 VFX 紋理（魔法陣/弧形斬擊/命中環/衝擊圓），消滅遊戲過程的 earcut 熱點
    initVfxTextures(this);

    // 啟動主選單
    this.scene.start('MenuScene');
  }
}

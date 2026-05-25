import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { createInitialGameState } from '../config/constants.js';
import { PRELOAD_IMAGE_ASSETS, BACKGROUND_ASSETS } from '../config/assetCatalog.js';
import { prewarmMonsterTextures } from '../entities/Monster.js';
import { initVfxTextures } from '../engine/vfxTextures.js';
import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';

// Phase 5.1：背景紋理啟動時 downscale
// 把超過 maxW × maxH 的紋理用 canvas drawImage 縮小，並用同 key 重新註冊，
// 釋放原大圖 GPU 紋理。每幀紋理採樣頻寬從 1 GB/s 降到 220 MB/s。
// 規則 D：紋理尺寸應對齊顯示尺寸，禁止用 setScale 把大圖縮成小顯示。
function downscaleTexture(scene, key, maxW = 1280, maxH = 720) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  if (!src || (src.width <= maxW && src.height <= maxH)) return;

  // 保持原比例縮放
  const scale = Math.min(maxW / src.width, maxH / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);

  // 移除原大圖（釋放 GPU 紋理記憶體），用縮小版以同 key 重新註冊
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

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
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);

    // Phase 6：自適應品質預設 high（FPS 監測器會依裝置能力動態調整）
    // 用獨立 registry key，不進存檔（裝置相關設定）
    if (!this.registry.get('qualityLevel')) {
      this.registry.set('qualityLevel', 'high');
    }

    // 註冊 rex PostFX pipelines（GlowFilter / Shockwave）
    const renderer = this.renderer;
    if (renderer && renderer.pipelines) {
      renderer.pipelines.addPostPipeline('GlowFilter', GlowFilterPostFxPipeline);
      renderer.pipelines.addPostPipeline('Shockwave', ShockwavePostFxPipeline);
    }

    // 生成平台、技能特效、UI 等程序材質（背景/角色/怪物已改用真實圖片）
    generateTextures(this);

    // 預先處理怪物材質去背，避免遊戲中首次生成各種怪物時瞬卡
    prewarmMonsterTextures(this);

    // Phase 5.1：所有背景圖在啟動時 downscale 到 ≤ 1280×720
    // 原圖 2752×1536（17 MB GPU 紋理）→ 1280×~720（3.7 MB），省 78% 顯存頻寬
    // 啟動時間 +200-500 ms（一次性，可接受）
    for (const asset of BACKGROUND_ASSETS) {
      downscaleTexture(this, asset.key, 1280, 720);
    }

    // 預渲染 VFX 紋理（魔法陣/弧形斬擊/命中環/衝擊圓），消滅遊戲過程的 earcut 熱點
    initVfxTextures(this);

    // 啟動主選單
    this.scene.start('MenuScene');
  }
}

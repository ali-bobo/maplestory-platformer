import Phaser from 'phaser';
import { generateTextures } from '../assets/ProceduralAssets.js';
import { DEFAULT_GAME_STATE } from '../config/constants.js';
import GlowFilterPostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/glowfilter/GlowFilterPostFxPipeline.js';
import ShockwavePostFxPipeline from 'phaser3-rex-plugins/plugins/shaders/shockwave/ShockwavePostFxPipeline.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // ── 角色圖片 ──
    this.load.image('character_player', 'dist/assets/character_player.png');
    this.load.image('thief', 'dist/assets/thief.png');
    this.load.image('final_char', 'dist/assets/final_char.png');

    // ── 地圖背景（新版高解析度） ──
    this.load.image('bg_sky',    'dist/assets/bg_sky.png');
    this.load.image('bg_ruins',  'dist/assets/bg_ruins.png');
    this.load.image('bg_city',   'dist/assets/bg_city.png');
    this.load.image('bg_forest', 'dist/assets/bg_forest.png');
    this.load.image('bg_toytown','dist/assets/bg_toytown.png');

    // ── 原版 12 個怪物 ──
    const monsterKeys = [
      'slime', 'mushroom', 'snail', 'stump',
      'boar',  'robot',    'skeleton', 'snake',
      'dragon','cyclops',  'golem',    'mimic',
    ];
    for (const k of monsterKeys) {
      this.load.image(`monster_${k}`, `dist/assets/monster_${k}.png`);
    }

    // ── 新版怪物（從遊戲畫面擷取）──
    for (let i = 0; i <= 6; i++) {
      this.load.image(`monster_new_${i}`, `dist/assets/monster_new_${i}.png`);
    }
    for (let i = 0; i <= 4; i++) {
      this.load.image(`monster_big_${i}`, `dist/assets/monster_big_${i}.png`);
    }
    this.load.image('miniboss_0', 'dist/assets/miniboss_0.png');
    this.load.image('miniboss_1', 'dist/assets/miniboss_1.png');

    // ── Boss 真實圖片 ──
    this.load.image('boss_main', 'dist/assets/boss_main.png');

    // ── NPC 圖片 ──
    for (let i = 0; i <= 5; i++) {
      this.load.image(`npc_new_${i}`, `dist/assets/npc_new_${i}.png`);
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

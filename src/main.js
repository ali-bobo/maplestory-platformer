import Phaser from 'phaser';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MapleIslandScene } from './scenes/MapleIslandScene.js';
import { HenesysScene } from './scenes/HenesysScene.js';
import { ElliniaScene } from './scenes/ElliniaScene.js';
import { PerionScene } from './scenes/PerionScene.js';
import { KerningScene } from './scenes/KerningScene.js';
import { TaipeiScene } from './scenes/TaipeiScene.js';
import { TownScene } from './scenes/TownScene.js';
import { BossScene } from './scenes/BossScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { setGameFps } from './engine/fpsControl.js';
import { setHpBarMode } from './entities/Monster.js';

const config = {
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#87ceeb',
  // Phase 5.2：明確標 transparent: false → 瀏覽器配置 RGB canvas（省 25% 寫入頻寬）
  transparent: false,
  // 禁用右鍵選單，避免遊戲中誤觸瀏覽器選單
  disableContextMenu: true,
  render: {
    antialias: false,
    antialiasGL: false,
    pixelArt: true,
    roundPixels: true,
    powerPreference: 'high-performance',
    // 背景明確不透明後關閉預乘 alpha，省一次 shader 運算
    premultipliedAlpha: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  plugins: {
    scene: [
      {
        key: 'rexUI',
        plugin: RexUIPlugin,
        mapping: 'rexUI',
      },
    ],
  },
  scene: [
    BootScene,
    MenuScene,
    MapleIslandScene,
    HenesysScene,
    ElliniaScene,
    PerionScene,
    KerningScene,
    TaipeiScene,
    TownScene,
    BossScene,
    DungeonScene,
    UIScene,
    GameOverScene,
  ],
};

export const game = new Phaser.Game(config);

// Phase 8 PoC 測試入口：在 console 呼叫 __setFps(30) 驗證鎖 FPS 是否安全有效
// （預設不改，仍 60）。確認後由品質系統自動呼叫（Phase 8.2）
// 用法：__setFps(30) 鎖 30；__setFps(40) 鎖 40；__setFps(60, false) 回 rAF 60
// 開發 debug 工具：僅在 URL 含 ?debug=1 時啟用，避免暴露於一般玩家
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
  window.__setFps = (target, useTimeout = true) => setGameFps(game, target, useTimeout);
  window.__hpBarMode = (mode) => setHpBarMode(mode);
}

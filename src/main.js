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
import { saveOnExit } from './engine/saveGame.js';
import { isTouchDevice } from './engine/device.js';
import { mountTouchControls } from './engine/touchControls.js';
import { audio } from './engine/audio.js';

const config = {
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  parent: 'game-container',
  // 等比縮放進視窗並置中（桌機 / 手機橫放皆適用）；內部座標固定 1280×720
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
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
  window.__game = game;   // 供自動化測試取得遊戲實例
}

// 關閉分頁 / 切到背景時補存一次（只在實際遊玩的場景中；選單與結算畫面的狀態不覆蓋存檔）
function saveIfPlaying() {
  const idle = ['BootScene', 'MenuScene', 'GameOverScene'];
  if (idle.some((key) => game.scene.isActive(key))) return;
  saveOnExit(game.registry.get('gameState'));
}
window.addEventListener('pagehide', saveIfPlaying);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveIfPlaying();
});

// ── 手機支援 ────────────────────────────────────────────────────────────────
// 瀏覽器要求使用者操作後才能啟動音效：第一次點擊 / 觸碰 / 按鍵時恢復 AudioContext
function unlockAudio() {
  audio.resumeContext();
  if (!audio.ctx || audio.ctx.state === 'running') {
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  }
}
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);

// 觸控裝置：掛上操作層，只在實際遊玩（HUD 場景存在）時顯示
if (isTouchDevice()) {
  const controls = mountTouchControls({ canvasProvider: () => game.canvas });
  const gameplayScenes = ['BootScene', 'MenuScene', 'GameOverScene'];
  setInterval(() => {
    const idle = gameplayScenes.some((key) => game.scene.isActive(key));
    controls.setVisible(!idle && game.scene.isActive('UIScene'));
  }, 250);
  game.scale.on('resize', () => controls.layout());
}

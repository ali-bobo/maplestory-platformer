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
import { SKILL_SLOT_KEYS, skillForSlot } from './config/constants.js';
import { TutorialScene } from './scenes/TutorialScene.js';

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
    TutorialScene,
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
// 瀏覽器要求「使用者手勢」後才能啟動音效。觸控裝置上，手指按下（pointerdown / touchstart）不算有效手勢，
// 要在放開（pointerup / touchend）或 click 時才行 —— 這是手機版原本沒聲音的原因。所以這幾種事件都監聽。
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
function unlockAudio() {
  audio.resumeContext();
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* iOS 16.4+：讓網頁音訊不被靜音鍵擋住 */ }
  // resume() 是非同步的：稍後確認真的在跑了再移除監聽，否則下一次手勢再試
  setTimeout(() => {
    if (!audio.ctx || audio.ctx.state === 'running') {
      for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlockAudio, true);
    }
  }, 300);
}
for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlockAudio, true);
// 切回分頁時（iOS 切到背景會把 context 打斷）重新啟動
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') audio.resumeContext(); });

// 觸控裝置：掛上操作層，只在實際遊玩（HUD 場景存在）時顯示
if (isTouchDevice()) {
  const controls = mountTouchControls({ canvasProvider: () => game.canvas });
  const gameplayScenes = ['BootScene', 'MenuScene', 'GameOverScene', 'TutorialScene'];
  const SHORT = { Z: '普攻', X: '步', C: '殺', V: '渦', B: '影' };
  let lastSkillSig = '';
  setInterval(() => {
    const idle = gameplayScenes.some((key) => game.scene.isActive(key));
    controls.setVisible(!idle && game.scene.isActive('UIScene'));
    // 技能鈕字樣 / 鎖定狀態跟著 gameState.skillSlots 與解鎖進度
    const gs = game.registry.get('gameState');
    if (gs) {
      const labels = {}; const locked = {};
      for (const slot of SKILL_SLOT_KEYS) {
        const id = skillForSlot(gs, slot);
        labels[slot] = SHORT[id];
        locked[slot] = !(gs.unlockedSkills || []).includes(id);
      }
      const sig = JSON.stringify([labels, locked]);
      if (sig !== lastSkillSig) { lastSkillSig = sig; controls.setSkillButtons(labels, locked); }
    }
  }, 250);
  game.scale.on('resize', () => controls.layout());
}

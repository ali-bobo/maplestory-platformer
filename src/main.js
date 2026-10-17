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
import { ShrineScene } from './scenes/ShrineScene.js';
import { HarborScene } from './scenes/HarborScene.js';
import { DesertScene } from './scenes/DesertScene.js';
import { SnowScene } from './scenes/SnowScene.js';
import { LavaScene } from './scenes/LavaScene.js';
import { CastleScene } from './scenes/CastleScene.js';
import { BossScene } from './scenes/BossScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { setGameFps } from './engine/fpsControl.js';
import { setHpBarMode, Monster } from './entities/Monster.js';
import { settings } from './engine/settings.js';
import { installSettingsHooks } from './engine/settingsHooks.js';
import { saveOnExit } from './engine/saveGame.js';
import { isTouchDevice } from './engine/device.js';
import { mountTouchControls, TOUCH_ACTIONS } from './engine/touchControls.js';
import { installGamepad } from './engine/gamepad.js';
import { eventDef } from './engine/keyBindings.js';
import { audio } from './engine/audio.js';
import { installContextGuard } from './engine/contextGuard.js';
import { SKILL_SLOT_KEYS, BASIC_ATTACK, skillForSlot, jobOf } from './config/constants.js';
import { TutorialScene } from './scenes/TutorialScene.js';
import { debugSetJob } from './engine/jobChange.js';
import { QUESTS } from './config/quests.js';

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
    // 手繪美術：縮放時用平滑取樣（pixelArt: true 會用最近鄰，縮小後鋸齒明顯）。roundPixels 保留，文字與 UI 邊緣仍貼齊像素
    antialias: true,
    antialiasGL: false,
    pixelArt: false,
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
    ShrineScene,
    HarborScene,
    DesertScene,
    SnowScene,
    LavaScene,
    CastleScene,
    BossScene,
    DungeonScene,
    UIScene,
    GameOverScene,
    TutorialScene,
  ],
};

// 設定開關（震動 / 閃光 / 傷害數字 / 減少動態）對全部呼叫端生效：包住 Camera.shake / flash 與 Monster 的飄字
installSettingsHooks({ CameraClass: Phaser.Cameras.Scene2D.Camera, MonsterClass: Monster, settings });

export const game = new Phaser.Game(config);

// Phase 8 PoC 測試入口：在 console 呼叫 __setFps(30) 驗證鎖 FPS 是否安全有效
// （預設不改，仍 60）。確認後由品質系統自動呼叫（Phase 8.2）
// 用法：__setFps(30) 鎖 30；__setFps(40) 鎖 40；__setFps(60, false) 回 rAF 60
// 開發 debug 工具：僅在 URL 含 ?debug=1 時啟用，避免暴露於一般玩家
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
  window.__setFps = (target, useTimeout = true) => setGameFps(game, target, useTimeout);
  window.__hpBarMode = (mode) => setHpBarMode(mode);
  window.__game = game;   // 供自動化測試取得遊戲實例
  window.__settings = settings;   // 設定倉庫（e2e/ux.cjs 檢查設定是否生效）
  window.__audio = audio;         // 音訊單例（檢查音量節點）
  window.__QUESTS = QUESTS;   // 測試可調整任務參數（例如把試煉之證掉落率拉到 100%）
  // 直接設定職業與等級（跳過轉職任務）：__setJob('assassin', 24)；'thief' 可切回盜賊。回傳是否成功
  window.__setJob = (job, level) => {
    const gs = game.registry.get('gameState');
    if (!gs || !debugSetJob(gs, job, level)) return false;
    game.registry.set('gameState', gs);
    for (const sc of game.scene.getScenes(true)) {
      if (sc.player) sc.events.emit('job-changed', gs.job, { silent: true });
    }
    return true;
  };
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

// WebGL context 被瀏覽器回收（手機 / iframe 記憶體吃緊）時：存檔、顯示提示，恢復後自動收起，沒恢復給重新載入鈕
installContextGuard(game, { saveNow: saveIfPlaying });

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
// 分頁隱藏時暫停音訊（Phaser 的主迴圈本來就會停；音樂排程與振盪器不該在背景分頁繼續吃 CPU），切回來再恢復
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') audio.resumeContext();
  else audio.suspendContext();
});

// ── 手把 ────────────────────────────────────────────────────────────────────
// 手把按鈕轉成「目前綁定的鍵」的合成鍵盤事件（見 engine/gamepad.js）；選單 / 教學 / 結算畫面 A 當 Enter
const MENU_SCENES = ['BootScene', 'MenuScene', 'GameOverScene', 'TutorialScene'];
const inMenu = () => MENU_SCENES.some((key) => game.scene.isActive(key));
installGamepad({
  game,
  isMenu: inMenu,
  resolveKey: (action) => {
    if (action === 'pause') return eventDef('ESC');
    if (action === 'confirm') return eventDef('ENTER');
    // 選單裡左右固定送方向鍵（教學換頁用 ← →），不受鍵位設定影響
    if (inMenu() && (action === 'left' || action === 'right')) return eventDef(action === 'left' ? 'LEFT' : 'RIGHT');
    return eventDef(settings.get().keys[action]);
  },
});

// 觸控裝置：掛上操作層，只在實際遊玩（HUD 場景存在）時顯示
if (isTouchDevice()) {
  // 觸控鈕送「目前綁定的鍵」（玩家在設定裡改過鍵位也照樣能用）；ESC 固定
  const resolveKey = (name) => (TOUCH_ACTIONS[name] ? eventDef(settings.get().keys[TOUCH_ACTIONS[name]]) : null);
  const controls = mountTouchControls({ canvasProvider: () => game.canvas, resolveKey });
  const gameplayScenes = ['BootScene', 'MenuScene', 'GameOverScene', 'TutorialScene'];
  const SHORT = { Z: '鏢', X: '步', C: '殺', V: '渦', B: '影', backstab: '刺', poison: '毒', mark: '印', whirl: '旋', steal: '盜', smoke: '煙' };
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

  // 視窗 / 暫停 / 對話開著時，移動區與動作區讓出畫面（UIScene 設定 registry 的 uiModal）
  game.registry.events.on('changedata-uiModal', (parent, value) => controls.setModal(!!value));

  // 技能鈕冷卻：每 100ms 把冷卻比例與 MP 是否足夠同步到按鈕（只在操作層顯示時做事）
  const CD_BUTTONS = [['SPACE', BASIC_ATTACK], ...SKILL_SLOT_KEYS.map((k) => [k, k])];
  setInterval(() => {
    if (controls.root.classList.contains('tc-hidden')) return;
    const gs = game.registry.get('gameState');
    if (!gs || !gs.skillCooldowns) return;
    const job = jobOf(gs);
    for (const [btn, slot] of CD_BUTTONS) {
      const id = skillForSlot(gs, slot);
      const def = job.skills[id] || job.basic;
      const cd = gs.skillCooldowns[id] || 0;
      const max = def && def.cooldown > 0 ? def.cooldown : 1;
      controls.setCooldown(btn, cd / max, cd, !!def && (def.mpCost || 0) > gs.mp);
    }
  }, 100);
}

// FPS 控制（Phase 8）
//
// 直擊 GPU 填充率瓶頸：鎖 FPS 直接減少每秒寫入畫面的像素數（60→30 砍半），
// 且畫面/版面完全不變，只有動作流暢度數值改變。
//
// 技術現實：Phaser 3 在 requestAnimationFrame 模式下瀏覽器鎖 60，無法降到 30；
// 要鎖低於 60 必須用 forceSetTimeOut（setTimeout 驅動 loop）。runtime 切換需
// 重建 TimeStep（社群驗證的做法）。

import Phaser from 'phaser';

/**
 * runtime 設定遊戲 FPS（重建 TimeStep）
 * @param {Phaser.Game} game
 * @param {number} target 目標 FPS（30/45/60）
 * @param {boolean} forceSetTimeOut 是否用 setTimeout 驅動（鎖 < 60 時必須 true）
 */
export function setGameFps(game, target, forceSetTimeOut = true) {
  if (!game?.loop) return;
  const cfg = {
    target,
    forceSetTimeOut,
    min: Math.max(10, target - 10),
    limit: 0,
    smoothStep: true,
    panicMax: 120,
    deltaHistory: 10,
  };
  try {
    game.loop.stop();
    // 用新 config 重新初始化現有的 TimeStep 實例（不重建整個 game）
    Phaser.Core.TimeStep.call(game.loop, game, cfg);
    game.loop.start(game.step.bind(game));
  } catch (_) { /* 若 API 變動則靜默，維持原 FPS */ }
}

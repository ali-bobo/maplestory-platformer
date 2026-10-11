// WebGL context 遺失處理。
// 手機 / iframe 分頁在記憶體吃緊或 GPU 被回收時，瀏覽器會丟掉 WebGL context：Phaser 會停止繪圖（畫面凍結或整片白）。
// Phaser 自己會在 context 恢復時重建 GL 資源；這裡負責：存檔、告訴玩家發生什麼事、恢復後自動收起提示，
// 一直沒恢復就給「重新載入」按鈕，避免靜默白屏。

const RESTORE_WAIT_MS = 4000;

export function installContextGuard(game, { onLost, onRestored, saveNow } = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = game.canvas;
  if (!canvas) {   // Game 還沒開機（等 DOM ready）：開機完成再掛
    game.events.once('ready', () => installContextGuard(game, { onLost, onRestored, saveNow }));
    return null;
  }
  let box = null, timer = null;

  const hide = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (box) { box.remove(); box = null; }
  };
  const show = () => {
    if (box) return;
    box = document.createElement('div');
    box.id = 'gl-lost';
    box.setAttribute('role', 'alert');
    const msg = document.createElement('p');
    msg.textContent = '畫面暫時中斷（裝置回收了顯示資源），正在嘗試恢復…';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '重新載入遊戲';
    btn.hidden = true;
    btn.addEventListener('click', () => location.reload());
    box.append(msg, btn);
    document.body.appendChild(box);
    // 一段時間還沒恢復才顯示按鈕（多數情況幾百毫秒內就恢復了）
    timer = setTimeout(() => {
      btn.hidden = false;
      msg.textContent = '畫面無法自動恢復。進度已儲存，請重新載入遊戲。';
    }, RESTORE_WAIT_MS);
  };

  const lost = () => {
    try { if (saveNow) saveNow(); } catch (_) { /* 靜默：存檔失敗不能擋住提示 */ }
    show();
    if (onLost) onLost();
  };
  const restored = () => {
    hide();
    if (onRestored) onRestored();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return { destroy() { canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); hide(); } };
}

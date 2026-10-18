// 可見視窗追蹤：手機瀏覽器的網址列 / 工具列收放、旋轉、進出全螢幕時，window 的 resize 事件不一定及時（或根本不來），
// Phaser 的 Scale.FIT 就停在舊尺寸 → 畫布下緣被切掉或四周留黑邊。這裡改成：
//   1. 以 visualViewport（有的話）當可見視窗大小，沒有就用 innerWidth / innerHeight；
//   2. 任何可能改變可見視窗的事件（resize、orientationchange、visualViewport resize、fullscreenchange、pageshow）
//      都排程幾次 game.scale.refresh()（旋轉後 iOS 要等 100~400 ms 尺寸才穩定）；
//   3. 尺寸沒變就不動，避免白做工。
// 純函式（viewportSize / sizeChanged）可單元測試；installViewportFit 只負責接事件。

/** 目前可見視窗大小（CSS px，取整數）。visualViewport 優先（含網址列收放後的實際可見區），退而用 innerWidth / innerHeight */
export function viewportSize(win) {
  if (!win) return { w: 0, h: 0 };
  const vv = win.visualViewport;
  const w = vv && vv.width > 0 ? vv.width : win.innerWidth;
  const h = vv && vv.height > 0 ? vv.height : win.innerHeight;
  return { w: Math.round(w || 0), h: Math.round(h || 0) };
}

/** 兩次量測是否不同（任何一邊差 >= 1 px 就算） */
export function sizeChanged(a, b) {
  if (!a || !b) return true;
  return a.w !== b.w || a.h !== b.h;
}

const REFRESH_DELAYS = [0, 120, 400];   // ms：立即、旋轉動畫中、旋轉完成後

export function installViewportFit(game, win = typeof window !== 'undefined' ? window : null) {
  if (!win || !game || !game.scale) return () => {};
  let last = null;
  const timers = new Set();
  const refresh = (force) => {
    const now = viewportSize(win);
    if (!force && !sizeChanged(last, now)) return;
    last = now;
    try { game.scale.refresh(); } catch (_) { /* 場景尚未建立完成時略過 */ }
  };
  const schedule = () => {
    for (const ms of REFRESH_DELAYS) {
      const t = win.setTimeout(() => { timers.delete(t); refresh(ms > 0); }, ms);
      timers.add(t);
    }
  };
  const onViewportScroll = () => { if (win.scrollX || win.scrollY) win.scrollTo(0, 0); };   // iOS 縮放後被推離原點時拉回
  const events = ['resize', 'orientationchange', 'pageshow', 'fullscreenchange', 'webkitfullscreenchange'];
  for (const ev of events) win.addEventListener(ev, schedule);
  const vv = win.visualViewport;
  if (vv && vv.addEventListener) {
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', onViewportScroll);
  }
  schedule();
  return function uninstall() {
    for (const ev of events) win.removeEventListener(ev, schedule);
    if (vv && vv.removeEventListener) { vv.removeEventListener('resize', schedule); vv.removeEventListener('scroll', onViewportScroll); }
    for (const t of timers) win.clearTimeout(t);
    timers.clear();
  };
}

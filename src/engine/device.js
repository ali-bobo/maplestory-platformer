// 裝置偵測（純函式，可注入 window 以便單元測試）

// 是否以觸控為主要輸入（手機 / 平板）。網址參數 ?touch=1 強制開啟、?touch=0 強制關閉，方便桌機測試。
export function isTouchDevice(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  try {
    const override = new URLSearchParams(win.location && win.location.search).get('touch');
    if (override === '1') return true;
    if (override === '0') return false;
    if (win.matchMedia && win.matchMedia('(pointer: coarse)').matches) return true;
    // 少數瀏覽器不支援 pointer media query：退而求其次看觸控點數與是否有精準指標
    const points = (win.navigator && win.navigator.maxTouchPoints) || 0;
    const hasFine = !!(win.matchMedia && win.matchMedia('(any-pointer: fine)').matches);
    return points > 0 && !hasFine;
  } catch (_) {
    return false;
  }
}

// 依裝置顯示對應的操作提示文字
export function keyHint(keyLabel, touchLabel, win) {
  return isTouchDevice(win) ? touchLabel : keyLabel;
}

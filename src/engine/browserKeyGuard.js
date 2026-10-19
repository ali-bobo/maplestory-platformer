// 擋掉玩到一半會把玩家帶離遊戲的瀏覽器 / 系統快捷鍵。
//
// Phaser 只在「沒有按住修飾鍵」時對它管理的按鍵呼叫 preventDefault，所以按住 Alt 打怪時：
//  - Alt+← / Alt+→：瀏覽器上一頁 / 下一頁（直接離開遊戲）
//  - Alt+Space：Windows 視窗選單，接著按 C / N / X 會關閉 / 最小化 / 最大化視窗
//  - Alt+D / Alt+F：網址列 / 瀏覽器選單（之後按鍵都送不進遊戲）
//  - 單按 Alt：Firefox 顯示選單列並搶走鍵盤焦點
// 另外滑鼠側鍵（上一頁 / 下一頁）也會離開頁面。
// 輸入框（存檔碼、改鍵面板等）裡的按鍵照常，不攔。

/** 這個按鍵事件要不要擋。純函式（有單元測試）。ev：{ key, altKey, target } */
export function shouldBlockKey(ev) {
  if (!ev) return false;
  if (isTextField(ev.target)) return false;
  return ev.key === 'Alt' || ev.altKey === true;
}

/** 滑鼠側鍵（button 3 = 上一頁、4 = 下一頁） */
export function isNavMouseButton(ev) {
  return !!ev && (ev.button === 3 || ev.button === 4);
}

function isTextField(el) {
  if (!el || typeof el !== 'object') return false;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

/** 掛在 window 的捕獲階段（比 Phaser 早）。回傳 { destroy }；沒有 window 時回傳 null。 */
export function installBrowserKeyGuard() {
  if (typeof window === 'undefined') return null;
  const onKey = (ev) => { try { if (shouldBlockKey(ev)) ev.preventDefault(); } catch (_) { /* 靜默 */ } };
  const onMouse = (ev) => { try { if (isNavMouseButton(ev)) ev.preventDefault(); } catch (_) { /* 靜默 */ } };
  const opts = { capture: true };
  window.addEventListener('keydown', onKey, opts);
  window.addEventListener('keyup', onKey, opts);
  window.addEventListener('mousedown', onMouse, opts);
  window.addEventListener('mouseup', onMouse, opts);
  window.addEventListener('auxclick', onMouse, opts);
  return {
    destroy() {
      window.removeEventListener('keydown', onKey, opts);
      window.removeEventListener('keyup', onKey, opts);
      window.removeEventListener('mousedown', onMouse, opts);
      window.removeEventListener('mouseup', onMouse, opts);
      window.removeEventListener('auxclick', onMouse, opts);
    },
  };
}

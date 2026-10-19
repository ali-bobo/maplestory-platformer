// 全域錯誤防護：遊戲中出現未捕捉的例外（window 'error' / 'unhandledrejection'）時，
// 先試著存檔（不丟例外），再顯示一個小提示框（DOM，不用 alert / confirm）：說明遊戲出錯、進度是否已存，
// 給「重新載入」與「繼續」兩個按鈕。風格比照 contextGuard.js（WebGL context 遺失提示）。
//
// - 只處理本站來源的錯誤：瀏覽器擴充功能、其他網域的腳本（filename 不是本站、跨來源的 "Script error."）不理會
// - 已知無害的雜訊（ResizeObserver 迴圈、媒體播放被瀏覽器擋下）不理會
// - 每次載入頁面只顯示一次（之後的錯誤只照常記在 console，不再跳提示）
// - 提示框本身全程包 try/catch，絕不再丟例外（e2e 腳本把頁面例外當成失敗）

const EXTENSION_SCHEMES = /(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i;
const BENIGN_MESSAGES = [/ResizeObserver loop/i];
const BENIGN_NAMES = ['AbortError', 'NotAllowedError'];

/**
 * 判斷這個錯誤要不要提示玩家。純函式（有單元測試）。
 *  info：{ filename, message, stack, name }
 *  origin：本站來源（location.origin；file:// 時瀏覽器給 'null'）
 */
export function isOwnError(info, origin) {
  if (!info) return false;
  const filename = typeof info.filename === 'string' ? info.filename : '';
  const message = typeof info.message === 'string' ? info.message : '';
  const stack = typeof info.stack === 'string' ? info.stack : '';
  if (EXTENSION_SCHEMES.test(filename) || EXTENSION_SCHEMES.test(stack)) return false;
  if (BENIGN_MESSAGES.some((re) => re.test(message))) return false;
  if (info.name && BENIGN_NAMES.includes(info.name)) return false;
  if (filename) {
    if (origin && origin !== 'null') return filename === origin || filename.startsWith(origin + '/');
    return filename.startsWith('file:');   // file:// 開啟：只認本機檔案
  }
  // 沒有檔名：跨來源腳本被瀏覽器遮成 "Script error." → 不是我們的
  if (/^Script error\.?$/i.test(message.trim())) return false;
  return true;
}

/** 從 error 事件或 rejection 的 reason 取出 isOwnError 需要的欄位 */
export function describeErrorEvent(ev) {
  if (!ev) return null;
  if ('reason' in ev) {   // unhandledrejection
    const r = ev.reason;
    if (r && typeof r === 'object') {
      return { filename: '', message: String(r.message || ''), stack: String(r.stack || ''), name: r.name || '' };
    }
    return { filename: '', message: r === undefined ? '' : String(r), stack: '', name: '' };
  }
  const err = ev.error;
  return {
    filename: ev.filename || '',
    message: String(ev.message || (err && err.message) || ''),
    stack: err && err.stack ? String(err.stack) : '',
    name: (err && err.name) || '',
  };
}

/** 限流：只放行前 limit 次（預設 1，即每次載入頁面一次） */
export function createReportGate(limit = 1) {
  let count = 0;
  return {
    tryOpen() {
      if (count >= limit) return false;
      count += 1;
      return true;
    },
    get count() { return count; },
  };
}

/** 依存檔結果決定提示文字。saveResult：'saved' | 'failed' | 'skipped'（不在遊玩中，沒有存） */
export function errorMessageFor(saveResult) {
  const head = '遊戲發生錯誤，部分功能可能不正常。';
  if (saveResult === 'saved') return `${head}進度已自動儲存，建議重新載入。`;
  if (saveResult === 'failed') return `${head}進度未能儲存，請盡快回到一般地圖或重新載入。`;
  return `${head}建議重新載入。`;
}

/**
 * 掛上全域錯誤處理。saveNow() 回傳 'saved' | 'failed' | 'skipped'（丟例外視為 'failed'）。
 * 回傳 { destroy }；沒有 window / document 時回傳 null。
 */
export function installErrorGuard({ saveNow, limit = 1 } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const gate = createReportGate(limit);
  let box = null;

  const hide = () => {
    try { if (box) box.remove(); } catch (_) { /* 靜默 */ }
    box = null;
  };
  const show = (saveResult) => {
    if (box || !document.body) return;
    box = document.createElement('div');
    box.id = 'err-guard';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-live', 'assertive');
    const msg = document.createElement('p');
    msg.textContent = errorMessageFor(saveResult);
    const row = document.createElement('div');
    row.className = 'err-guard-buttons';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = '重新載入';
    reload.addEventListener('click', () => { try { location.reload(); } catch (_) { /* 靜默 */ } });
    const resume = document.createElement('button');
    resume.type = 'button';
    resume.className = 'err-guard-secondary';
    resume.textContent = '繼續';
    resume.addEventListener('click', hide);
    row.append(reload, resume);
    box.append(msg, row);
    document.body.appendChild(box);
  };

  const handle = (ev) => {
    try {
      const info = describeErrorEvent(ev);
      const origin = (typeof location !== 'undefined' && location.origin) || '';
      if (!isOwnError(info, origin)) return;
      if (!gate.tryOpen()) return;
      let saveResult = 'skipped';
      try { saveResult = saveNow ? saveNow() || 'skipped' : 'skipped'; } catch (_) { saveResult = 'failed'; }
      show(saveResult);
    } catch (_) { /* 防護本身絕不丟例外 */ }
  };
  window.addEventListener('error', handle);
  window.addEventListener('unhandledrejection', handle);
  return {
    destroy() {
      window.removeEventListener('error', handle);
      window.removeEventListener('unhandledrejection', handle);
      hide();
    },
  };
}

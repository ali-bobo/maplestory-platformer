// Service Worker 註冊（sw.js 在專案根目錄，負責離線快取，見該檔說明）。
//
// 什麼時候註冊（shouldRegisterSW，純函式有單元測試）：
//  - 只在 http: / https:（file:// 不支援 Service Worker）
//  - 不在 localhost / 127.0.0.1 / [::1]：開發與 e2e 都在本機跑，快取優先會讓剛建置的 bundle 被舊版蓋住
//  - 不在 ?debug=1：除錯時要拿到最新的檔案
//  - 不在 iframe 裡（例如嵌入式預覽頁）：那種環境的 sw.js 多半不存在，或被沙箱擋下
// 本機開發時若之前註冊過（例如用區網 IP 測過再切回 localhost），順手解除註冊並清掉快取。

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

export function isLocalHost(hostname) {
  return LOCAL_HOSTS.includes(hostname) || /\.localhost$/.test(hostname || '');
}

/** loc：{ protocol, hostname, search }；inIframe：是否在 iframe 中 */
export function shouldRegisterSW(loc, inIframe = false) {
  if (!loc) return false;
  if (loc.protocol !== 'http:' && loc.protocol !== 'https:') return false;
  if (isLocalHost(loc.hostname)) return false;
  if (new URLSearchParams(loc.search || '').get('debug') === '1') return false;
  return !inIframe;
}

function inIframe() {
  try { return window.self !== window.top; } catch (_) { return true; }
}

/** 依環境註冊或（本機開發時）解除註冊。全程不丟例外，失敗只是沒有離線功能。 */
export function setupServiceWorker() {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const loc = window.location;
    if (shouldRegisterSW(loc, inIframe())) {
      const register = () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* 沒有 sw.js 或被瀏覽器拒絕：照常遊玩 */ });
      };
      // 等頁面載完再註冊，避免和遊戲開機搶頻寬
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    } else if (isLocalHost(loc.hostname)) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => (typeof caches !== 'undefined' ? caches.keys() : []))
        .then((names) => Promise.all(names.filter((n) => n.startsWith('thief-legend-')).map((n) => caches.delete(n))))
        .catch(() => {});
    }
  } catch (_) { /* 靜默 */ }
}

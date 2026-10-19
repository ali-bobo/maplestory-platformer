// 盜賊傳說 Service Worker：離線遊玩與安裝到主畫面。
//
// 註冊：src/engine/serviceWorker.js（只在 http(s)、非 localhost / 127.0.0.1、非 ?debug=1、非 iframe 時註冊；
//       開發機上若之前註冊過會自動解除，避免舊快取蓋住剛建置的 bundle）。
//
// 快取策略：
//  - dist/bundle.js、dist/assets/*：快取優先（cache-first）。安裝時預先快取 bundle 與頁面外殼，
//    素材清單從 dist/version.json 讀，背景下載（失敗不擋安裝）；之後沒抓過的素材第一次用到時存入
//  - 頁面本身（導覽請求）與 dist/version.json：網路優先，離線時退回快取
//  - 其他同源靜態檔（style.css、圖示、manifest）：先回快取、背景更新（stale-while-revalidate）
//
// 版本：下面兩行由 build.js 依 dist/bundle.js 與 dist/assets 的內容雜湊自動改寫（勿手改）。
// sw.js 內容一變，瀏覽器就會安裝新版；啟用時刪掉名稱不符的舊快取。
const SHELL_VERSION = '51d99f39d5d1';
const ASSETS_VERSION = '75f6e605c18e';

const SHELL_CACHE = `thief-legend-shell-${SHELL_VERSION}`;
const ASSETS_CACHE = `thief-legend-assets-${ASSETS_VERSION}`;
const KEEP = [SHELL_CACHE, ASSETS_CACHE];
const SHELL_FILES = ['index.html', 'style.css', 'manifest.webmanifest', 'dist/bundle.js', 'dist/version.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

const scopeUrl = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_FILES.map((p) => new Request(scopeUrl(p), { cache: 'reload' })));
    // 素材清單：背景預先快取（不擋安裝；單一檔案失敗略過）
    precacheAssets().catch(() => {});
    await self.skipWaiting();
  })());
});

async function precacheAssets() {
  const res = await fetch(scopeUrl('dist/version.json'), { cache: 'no-store' });
  if (!res.ok) return;
  const info = await res.json();
  if (!info || !Array.isArray(info.assets)) return;
  const cache = await caches.open(ASSETS_CACHE);
  for (const p of info.assets) {
    const url = scopeUrl(p);
    if (await cache.match(url)) continue;
    try {
      const r = await fetch(url, { cache: 'reload' });
      if (r.ok) await cache.put(url, r);
    } catch (_) { /* 離線或單檔失敗：之後用到時再抓 */ }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('thief-legend-') && !KEEP.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackPath ? scopeUrl(fallbackPath) : request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackPath ? scopeUrl(fallbackPath) : request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  const update = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  });
  if (hit) { update.catch(() => {}); return hit; }
  return update;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length);

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, 'index.html'));
  } else if (rel === 'dist/version.json') {
    event.respondWith(networkFirst(req));
  } else if (rel === 'dist/bundle.js') {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
  } else if (rel.startsWith('dist/assets/')) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
  } else if (rel === 'sw.js') {
    // 不攔截自己
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// 遊戲版本：package.json 的版號 + 建置雜湊（build.js 依 dist/bundle.js 內容算出，寫在 dist/version.json）。
//
// bundle 本身不能內嵌自己的雜湊（會變成循環），所以雜湊在執行時讀 dist/version.json；
// 讀不到（file:// 開啟、離線且沒有快取）時只顯示版號，不影響遊戲。

import { version as PKG_VERSION } from '../../package.json';

export const APP_VERSION = PKG_VERSION;
export const VERSION_FILE = 'dist/version.json';
const SHORT_HASH_LEN = 7;

/** 雜湊只保留前 7 碼十六進位；格式不對回傳 '' */
export function shortHash(hash) {
  if (typeof hash !== 'string') return '';
  const h = hash.trim().toLowerCase();
  return /^[0-9a-f]{4,}$/.test(h) ? h.slice(0, SHORT_HASH_LEN) : '';
}

/** 顯示用版本字串：'3.0.0-1a2b3c4'；沒有雜湊就只有 '3.0.0' */
export function formatVersion(base, hash) {
  const b = typeof base === 'string' && base ? base : '0.0.0';
  const s = shortHash(hash);
  return s ? `${b}-${s}` : b;
}

/** 驗證 dist/version.json 的內容：{ version, hash }；不合格回傳 null */
export function parseBuildInfo(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const hash = shortHash(obj.hash);
  if (!hash) return null;
  const version = typeof obj.version === 'string' && /^[0-9A-Za-z.+-]{1,32}$/.test(obj.version) ? obj.version : APP_VERSION;
  return { version, hash };
}

let pending = null;

/**
 * 讀建置資訊（只讀一次，之後共用同一個 Promise）。永遠 resolve：成功 { version, hash }，失敗 null。
 * fetchFn 可注入（測試用）。
 */
export function loadBuildInfo(fetchFn) {
  if (pending) return pending;
  const f = fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!f || (typeof location !== 'undefined' && location.protocol === 'file:')) {
    pending = Promise.resolve(null);
    return pending;
  }
  pending = Promise.resolve()
    .then(() => f(VERSION_FILE, { cache: 'no-store' }))
    .then((res) => (res && res.ok ? res.json() : null))
    .then(parseBuildInfo)
    .catch(() => null);
  return pending;
}

/** 測試用：清掉已讀的結果 */
export function resetBuildInfoCache() {
  pending = null;
}

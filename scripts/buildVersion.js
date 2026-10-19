// 建置版本資訊（build.js 呼叫；純函式部分有單元測試 test/stability.test.js）。
//
// 每次 `npm run build` 後：
//  - 依 dist/bundle.js 內容算出 bundleHash，依 dist/assets 全部檔案（檔名 + 內容，排序後）算出 assetsHash
//  - 寫 dist/version.json：{ version, hash, assetsHash, assets: [...] }（遊戲顯示版本、Service Worker 預先快取清單）
//  - 改寫 sw.js 開頭的兩行版本常數 → sw.js 位元組改變，瀏覽器才會安裝新的 Service Worker 並刪掉舊快取
// 輸出只取決於檔案內容（不含時間戳），同樣的原始碼建置兩次結果完全相同（CI 會比對已提交的檔案）。

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HASH_LEN = 12;

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, HASH_LEN);
}

/** 依檔名排序後把「相對路徑 + 內容」串進同一個雜湊；回傳 { hash, files } */
function hashFiles(entries) {
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const h = crypto.createHash('sha256');
  for (const e of sorted) {
    h.update(e.name);
    h.update('\0');
    h.update(e.data);
    h.update('\0');
  }
  return { hash: h.digest('hex').slice(0, HASH_LEN), files: sorted.map((e) => e.name) };
}

const SHELL_RE = /^const SHELL_VERSION = '[^']*';$/m;
const ASSETS_RE = /^const ASSETS_VERSION = '[^']*';$/m;

/** 把 sw.js 原始碼中的兩行版本常數換成新值；找不到這兩行就丟例外（避免默默沒更新） */
function injectSwVersions(source, { shell, assets }) {
  if (!SHELL_RE.test(source) || !ASSETS_RE.test(source)) throw new Error('sw.js 缺少 SHELL_VERSION / ASSETS_VERSION 常數');
  return source
    .replace(SHELL_RE, `const SHELL_VERSION = '${shell}';`)
    .replace(ASSETS_RE, `const ASSETS_VERSION = '${assets}';`);
}

/** dist/version.json 的內容（固定欄位順序與換行，確保可重現） */
function versionJson({ version, hash, assetsHash, assets }) {
  return JSON.stringify({ version, hash, assetsHash, assets }, null, 1) + '\n';
}

/** 實際寫檔：回傳 { hash, assetsHash } */
function writeVersionFiles(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const hash = hashBuffer(fs.readFileSync(path.join(root, 'dist/bundle.js')));
  const assetDir = path.join(root, 'dist/assets');
  const entries = fs.existsSync(assetDir)
    ? fs.readdirSync(assetDir, { withFileTypes: true }).filter((d) => d.isFile())
      .map((d) => ({ name: `dist/assets/${d.name}`, data: fs.readFileSync(path.join(assetDir, d.name)) }))
    : [];
  const { hash: assetsHash, files } = hashFiles(entries);
  const writeIfChanged = (file, text) => {
    const p = path.join(root, file);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) fs.writeFileSync(p, text);
  };
  writeIfChanged('dist/version.json', versionJson({ version: pkg.version, hash, assetsHash, assets: files }));
  const swPath = path.join(root, 'sw.js');
  writeIfChanged('sw.js', injectSwVersions(fs.readFileSync(swPath, 'utf8'), { shell: hash, assets: assetsHash }));
  return { hash, assetsHash };
}

module.exports = { hashBuffer, hashFiles, injectSwVersions, versionJson, writeVersionFiles, HASH_LEN };

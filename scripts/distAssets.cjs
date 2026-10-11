// 建置時掃描 dist/assets，回傳 esbuild 的 define：__DIST_ASSET_FILES__ = 檔名以 | 串起來的字串。
// assetCatalog.js 的「選配素材」（背景、星光之塔、世界地圖 UI 等還沒到位的美術）靠這份清單決定要不要預載：
// 檔案不在就不登錄，遊戲啟動時不會發出 404 請求，改用程式畫的占位圖。
// 美術檔放進 dist/assets 之後只要重新 `npm run build`，下次載入就會自動改用真圖。
const fs = require('fs');
const path = require('path');

function listDistAssets(root = path.join(__dirname, '..')) {
  const dir = path.join(root, 'dist', 'assets');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith('.')).sort() : [];
}

function distAssetDefine(root) {
  return { __DIST_ASSET_FILES__: JSON.stringify(listDistAssets(root).join('|')) };
}

module.exports = { listDistAssets, distAssetDefine };

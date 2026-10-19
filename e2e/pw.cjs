// 共用：找 Playwright 與 Chromium（本機容器與 CI 都能跑）
// - Playwright：先 require('playwright')（CI 用 npx 安裝、或 NODE_PATH 找得到），找不到再用 /opt 的版本
// - Chromium：環境變數 PW_CHROMIUM > Playwright 預設下載的瀏覽器 > /opt 的版本；都沒有就交給 Playwright 自己決定
const fs = require('fs');

const OPT_PW = '/opt/node-tools/node_modules/playwright';
const OPT_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function loadPlaywright() {
  try { return require('playwright'); } catch (_) { /* 改用 /opt */ }
  return require(OPT_PW);
}

const pw = loadPlaywright();

function resolveExecutable() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  try {
    const p = pw.chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch (_) { /* 沒裝預設瀏覽器 */ }
  if (fs.existsSync(OPT_CHROME)) return OPT_CHROME;
  return undefined;
}

module.exports = { chromium: pw.chromium, devices: pw.devices, executablePath: resolveExecutable() };

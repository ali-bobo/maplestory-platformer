const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8231;
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
async function launch(opts = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url()); });
  await page.addInitScript((save) => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); if (save) localStorage.setItem('thief-legend-save-v1', save); } catch (_) {} }, opts.save || null);
  return { browser, page, errors };
}
async function start(page, waitMs = 4000) {
  await page.goto(BASE); await page.waitForTimeout(waitMs + 3000);
  await page.keyboard.press('Enter');
  // 機器忙時載入會慢：等到真的進了有玩家的地圖場景
  await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 });
  await page.waitForTimeout(1500);
}
const api = (page) => ({
  ev: (fn, arg) => page.evaluate(fn, arg),
  scene: () => page.evaluate(() => { const s = window.__game.scene.getScenes(true).find((x) => x.player); return s ? s.sys.settings.key : null; }),
  gs: () => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.registry.get('gameState')))),
  // 直接換地圖
  go: async (sceneKey, spawnX) => {
    await page.evaluate(([k, x]) => { const g = window.__game; const sc = g.scene.getScenes(true).find((o) => o.player) || g.scene.getScenes(true)[0]; const gs = g.registry.get('gameState'); g.scene.getScenes(true).forEach((s) => { if (s.sys.settings.key === 'UIScene') s.scene.stop(); }); sc.scene.start(k, { gameState: gs, spawnX: x }); }, [sceneKey, spawnX]);
    await page.waitForTimeout(2600);
    await page.waitForFunction((k) => { const sc = window.__game.scene.getScenes(true).find((o) => o.sys.settings.key === k); return !!(sc && sc.player && sc.player.enemies && sc.monsters); }, sceneKey, { timeout: 30000, polling: 100 }).catch(() => {});
  },
  tp: (x, y) => page.evaluate(([x, y]) => { const s = window.__game.scene.getScenes(true).find((o) => o.player); const p = s.player; p.setPosition(x, y ?? p.y); p.body.setVelocity(0, 0); p.isInvincible = true; }, [x, y ?? null]),
  press: async (key, ms = 80) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); },
});
module.exports = { launch, start, api, check, BASE, fails: () => fails };

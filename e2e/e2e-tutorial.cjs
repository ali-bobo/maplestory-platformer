const { chromium } = require('/opt/node-tools/node_modules/playwright');
const SPDIR = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const tap = async (page, key) => { await page.keyboard.down(key); await page.waitForTimeout(140); await page.keyboard.up(key); await page.waitForTimeout(250); };
(async () => {
  // ───────── 電腦版 ─────────
  const b = await launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/index.html?debug=1`); await page.waitForTimeout(4500);
  const info = () => page.evaluate(() => { const g = window.__game; const t = g.scene.getScene('TutorialScene');
    return { active: g.scene.getScenes(true).map((s) => s.sys.settings.key), idx: t && t._index, total: t && t._pages && t._pages.length, title: t && t._pages && t._pages[t._index].title, seen: localStorage.getItem('thief-legend-tutorial-seen') }; });
  check('全新玩家：首次進入前尚未看過教學', (await info()).seen === null);
  await tap(page, 'Enter'); await page.waitForTimeout(1200);
  let i = await info();
  check('按 Enter 開始 → 先進入新手教學（第 1 頁：故事）', i.active.includes('TutorialScene') && !i.active.includes('MapleIslandScene') && i.idx === 0, JSON.stringify(i));
  await page.screenshot({ path: SPDIR + '/tut-1.png' });
  await tap(page, 'Enter'); i = await info();
  check('Enter → 下一頁', i.idx === 1, 'idx=' + i.idx);
  await tap(page, 'ArrowLeft'); i = await info();
  check('← → 上一頁', i.idx === 0);
  // 走到按鍵頁
  for (let k = 0; k < 4; k++) await tap(page, 'Enter');
  i = await info();
  check('第 5 頁是按鍵說明（電腦版）', i.idx === 4 && /電腦版/.test(i.title), i.title);
  await page.screenshot({ path: SPDIR + '/tut-keys.png' });
  await tap(page, 'Enter'); await page.screenshot({ path: SPDIR + '/tut-skills.png' });
  await tap(page, 'Enter'); await page.screenshot({ path: SPDIR + '/tut-quest.png' });
  await tap(page, 'Enter'); await tap(page, 'Enter');
  i = await info();
  check('最後一頁（準備好了嗎）', i.idx === i.total - 1, `${i.idx + 1}/${i.total}`);
  await page.screenshot({ path: SPDIR + '/tut-last.png' });
  await tap(page, 'Enter'); await page.waitForTimeout(3500);
  i = await info();
  check('最後一頁按 Enter → 進入遊戲，並記住看過教學', i.active.includes('MapleIslandScene') && !i.active.includes('TutorialScene') && i.seen === '1', JSON.stringify(i.active));

  // 暫停選單 → 操作說明（浮層）；Esc 只關閉說明，不會連暫停選單一起關掉
  await tap(page, 'Escape'); await page.waitForTimeout(800);
  await page.screenshot({ path: SPDIR + '/pause-menu.png' });
  const helpPos = await page.evaluate(() => ({ x: window.__game.scale.width / 2, y: window.__game.scale.height / 2 + 116 }));
  await page.mouse.move(helpPos.x, helpPos.y); await page.waitForTimeout(250); await page.mouse.click(helpPos.x, helpPos.y); await page.waitForTimeout(900);
  i = await info();
  check('暫停選單「操作說明」→ 教學浮層開啟', i.active.includes('TutorialScene'), JSON.stringify(i.active));
  await tap(page, 'Escape'); await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ tut: window.__game.scene.isActive('TutorialScene'), paused: window.__game.scene.getScene('UIScene')._isPaused, help: window.__game.registry.get('helpOpen') }));
  check('Esc 關閉說明，暫停選單仍在', !after.tut && after.paused === true && !after.help, JSON.stringify(after));
  await tap(page, 'Escape'); await page.waitForTimeout(600);

  // 重新整理後不再自動出現教學
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/__blank__`);
  await page.evaluate(() => localStorage.removeItem('thief-legend-save-v1'));
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/index.html?debug=1`); await page.waitForTimeout(4500);
  await tap(page, 'Enter'); await page.waitForTimeout(3500);
  i = await info();
  check('已看過教學 → 新遊戲直接進入遊戲', i.active.includes('MapleIslandScene') && !i.active.includes('TutorialScene'), JSON.stringify(i.active));

  // Esc 跳過全部（用新的 profile 測）
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/__blank__`);   // 先離開遊戲頁（離開時的自動存檔會寫回存檔），再清除
  await page.evaluate(() => { localStorage.removeItem('thief-legend-tutorial-seen'); localStorage.removeItem('thief-legend-save-v1'); });
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/index.html?debug=1`); await page.waitForTimeout(4500);
  await tap(page, 'Enter'); await page.waitForTimeout(1200);
  await tap(page, 'Enter');
  await tap(page, 'Escape'); await page.waitForTimeout(3500);
  i = await info();
  check('Esc → 跳過全部教學並進入遊戲', i.active.includes('MapleIslandScene') && !i.active.includes('TutorialScene') && i.seen === '1', JSON.stringify(i.active));
  check('電腦版全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  await b.close();

  // ───────── 手機版 ─────────
  const b2 = await launch();
  const ctx = await b2.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await ctx.newPage();
  const merrors = []; m.on('pageerror', (e) => merrors.push(e.message));
  m.on('console', (x) => { if (x.type() === 'error' && !x.text().includes('Failed to load')) merrors.push(x.text()); });
  await m.goto(`http://127.0.0.1:${process.env.PORT || 8123}/index.html?debug=1`); await m.waitForTimeout(4500);
  const r = await m.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { l: c.left, t: c.top, w: c.width, h: c.height }; });
  const toPage = (x, y) => ({ x: r.l + x * r.w / 1280, y: r.t + y * r.h / 720 });
  let p = toPage(640, 530); await m.touchscreen.tap(p.x, p.y); await m.waitForTimeout(1500);
  const mi = () => m.evaluate(() => { const g = window.__game; const t = g.scene.getScene('TutorialScene'); return { active: g.scene.getScenes(true).map((s) => s.sys.settings.key), idx: t && t._index, title: t && t._pages && t._pages[t._index].title, ctrl: getComputedStyle(document.getElementById('touch-controls')).display }; });
  let s = await mi();
  check('手機：點「開始遊戲」→ 進入教學', s.active.includes('TutorialScene'), JSON.stringify(s));
  check('教學期間隱藏觸控操作層', s.ctrl === 'none' || await m.evaluate(() => document.getElementById('touch-controls').classList.contains('tc-hidden')));
  p = toPage(640, 300); await m.touchscreen.tap(p.x, p.y); await m.waitForTimeout(500);
  s = await mi(); check('手機：點畫面 → 下一頁', s.idx === 1, 'idx=' + s.idx);
  for (let k = 0; k < 3; k++) { await m.touchscreen.tap(p.x, p.y); await m.waitForTimeout(400); }
  s = await mi(); check('手機：第 5 頁是觸控操作說明', s.idx === 4 && /觸控/.test(s.title), s.title);
  await m.screenshot({ path: SPDIR + '/tut-touch-keys.png' });
  const skip = toPage(1280 - 210, 66); await m.touchscreen.tap(skip.x, skip.y); await m.waitForTimeout(3500);
  s = await mi(); check('手機：點「跳過全部」→ 進入遊戲', s.active.includes('MapleIslandScene') && !s.active.includes('TutorialScene'), JSON.stringify(s.active));
  check('手機版全程沒有 JS 錯誤', merrors.length === 0, merrors.join(' | '));
  await b2.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

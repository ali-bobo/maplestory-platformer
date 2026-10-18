const { chromium, devices, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2];
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('__t')) { localStorage.setItem('thief-legend-tutorial-seen', '1'); } } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

  await page.goto(BASE);
  await page.waitForTimeout(4500);

  // 1. 偵測與顯示
  check('自動偵測為觸控裝置並建立操作層', await page.evaluate(() => !!document.getElementById('touch-controls')));
  check('選單畫面不顯示操作層', await page.evaluate(() => document.getElementById('touch-controls').classList.contains('tc-hidden')));
  const canvasRect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  check('畫布等比縮放進視窗（不超出、置中）', canvasRect.w <= 844.5 && canvasRect.h <= 390.5 && Math.abs(canvasRect.w / canvasRect.h - 16 / 9) < 0.02, JSON.stringify(canvasRect));
  check('頁面不會捲動', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
  const toPage = (x, y) => ({ x: canvasRect.l + x * canvasRect.w / 1280, y: canvasRect.t + y * canvasRect.h / 720 });
  await page.screenshot({ path: SP + '/m-menu.png' });

  // 2. 以觸控點「開始遊戲」
  const start = toPage(640, 530);
  await page.touchscreen.tap(start.x, start.y);
  await page.waitForTimeout(4000);
  check('觸控點選開始遊戲 → 進入遊戲且顯示操作層', await page.evaluate(() => !document.getElementById('touch-controls').classList.contains('tc-hidden')));
  await page.screenshot({ path: SP + '/m-game.png' });

  const state = () => page.evaluate(() => {
    const g = window.__game; const sc = g.scene.getScene('SkyIslandScene');
    const p = sc && sc.player; const gs = g.registry.get('gameState');
    return { x: p ? p.x : null, y: p ? p.y : null, vx: p ? p.body.velocity.x : null, vy: p ? p.body.velocity.y : null, cdZ: gs.skillCooldowns.ATK, mp: gs.mp,
      paused: g.scene.isPaused('SkyIslandScene'), left: p && p.cursors.left.isDown, right: p && p.cursors.right.isDown };
  });
  const rect = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);

  // 3. 搖桿：按住右 → 角色向右移動；放開 → 停止（無卡鍵）
  const stick = await rect('.tc-stick');
  const s0 = await state();
  await touch('touchStart', [{ x: stick.x + stick.w * 0.4, y: stick.y, id: 1 }]);
  await page.waitForTimeout(900);
  const s1 = await state();
  check('搖桿向右 → 角色往右移動', s1.x > s0.x + 40 && s1.right === true, `x ${Math.round(s0.x)} → ${Math.round(s1.x)}`);
  await touch('touchEnd', []);
  await page.waitForTimeout(400);
  const s2 = await state();
  check('放開搖桿 → 停止、按鍵狀態釋放', s2.right === false && Math.abs(s2.vx) < 1, `vx=${s2.vx}`);

  // 4. 多指：一指按住左，另一指點 Z 與跳躍
  const z = await rect('.tc-attack'); const jump = await rect('.tc-jump');
  await touch('touchStart', [{ x: stick.x - stick.w * 0.4, y: stick.y, id: 1 }]);
  await page.waitForTimeout(300);
  const before = await state();
  await touch('touchStart', [{ x: stick.x - stick.w * 0.4, y: stick.y, id: 1 }, { x: z.x, y: z.y, id: 2 }]);
  await page.waitForTimeout(150);
  const afterZ = await state();
  await touch('touchEnd', [{ x: z.x, y: z.y, id: 2 }]);
  await page.waitForTimeout(300);
  check('左移中同時點 Z（多指）→ 施放技能且仍在移動', afterZ.cdZ > 0 && afterZ.left === true, `cdZ=${afterZ.cdZ} left=${afterZ.left}`);
  await touch('touchStart', [{ x: stick.x - stick.w * 0.4, y: stick.y, id: 1 }, { x: jump.x, y: jump.y, id: 3 }]);
  await page.waitForTimeout(120);
  const jumping = await state();
  check('多指跳躍 → 垂直速度向上', jumping.vy < -100, `vy=${jumping.vy}`);
  await touch('touchEnd', []);
  await page.waitForTimeout(500);
  const rel = await state();
  check('全部放開後沒有卡鍵', rel.left === false && rel.right === false);

  // 4b. 版面：預設移動在右、動作在左；沒有藥水按鈕；點 HUD 藥水槽使用藥水
  const stickR = await rect('.tc-stick'); const zR = await rect('.tc-attack');
  check('預設：搖桿在右半邊、攻擊鍵在左半邊', stickR.x > 844 / 2 && zR.x < 844 / 2, `stick.x=${Math.round(stickR.x)} Z.x=${Math.round(zR.x)}`);
  const jumpR = await rect('.tc-jump'); const downR = await rect('.tc-down');
  check('跳躍與「↓」在右半邊（和移動同一隻手）', jumpR.x > 844 / 2 && downR.x > 844 / 2, `jump.x=${Math.round(jumpR.x)} down.x=${Math.round(downR.x)}`);
  check('跳躍鈕位在搖桿上方、不重疊', jumpR.y < stickR.y - stickR.h / 2 + 8, `jump.y=${Math.round(jumpR.y)} stick.y=${Math.round(stickR.y)}`);
  check('四個技能鈕在左半邊', await page.evaluate(() => ['.tc-x', '.tc-c', '.tc-v', '.tc-b'].every((q) => document.querySelector(q).getBoundingClientRect().left < innerWidth / 2)));
  check('已移除藥水按鈕', await page.evaluate(() => document.querySelectorAll('.tc-pot').length === 0));
  const potBefore = await page.evaluate(() => window.__game.registry.get('gameState').potions.A);
  const slotPos = await page.evaluate(() => { const s = window.__game.scene.getScene('UIScene')._potionSlots.A.bg; return { x: s.x + 21, y: s.y + 21 }; });
  const tp = toPage(slotPos.x, slotPos.y);
  await page.touchscreen.tap(tp.x, tp.y);
  await page.waitForTimeout(500);
  const potAfter = await page.evaluate(() => window.__game.registry.get('gameState').potions.A);
  check('點 HUD 的藥水槽 → 使用 HP 藥水（數量 -1）', potAfter === potBefore - 1, `A: ${potBefore} → ${potAfter}`);
  await page.screenshot({ path: SP + '/m-game2.png' });

  // 4c. 左右互換
  const swapB = await rect('.tc-swap');
  await touch('touchStart', [{ x: swapB.x, y: swapB.y, id: 7 }]); await page.waitForTimeout(80); await touch('touchEnd', []);
  await page.waitForTimeout(400);
  const stickL = await rect('.tc-stick'); const zL = await rect('.tc-attack');
  check('按「左右互換」→ 搖桿到左、攻擊鍵到右，並記住設定', stickL.x < 844 / 2 && zL.x > 844 / 2
    && await page.evaluate(() => localStorage.getItem('thief-legend-touch-hand') === 'left'), `stick.x=${Math.round(stickL.x)} Z.x=${Math.round(zL.x)}`);
  await page.screenshot({ path: SP + '/m-game-swapped.png' });
  const sNow = await state(); 
  await touch('touchStart', [{ x: stickL.x + stickL.w * 0.4, y: stickL.y, id: 1 }]);
  await page.waitForTimeout(700);
  const sMoved = await state();
  check('互換後搖桿仍可正常移動', sMoved.x > sNow.x + 30, `x ${Math.round(sNow.x)} → ${Math.round(sMoved.x)}`);
  await touch('touchEnd', []);
  await touch('touchStart', [{ x: swapB.x, y: swapB.y, id: 7 }]); await page.waitForTimeout(80); await touch('touchEnd', []);
  await page.waitForTimeout(300);

  // 5. 暫停鈕（ESC）與繼續
  const pause = await rect('.tc-pause');
  await touch('touchStart', [{ x: pause.x, y: pause.y, id: 4 }]); await page.waitForTimeout(80); await touch('touchEnd', []);
  await page.waitForTimeout(600);
  const paused = await state();
  check('點「暫停」→ 開啟暫停選單（地圖場景暫停）', paused.paused === true);
  await page.screenshot({ path: SP + '/m-pause.png' });
  await touch('touchStart', [{ x: pause.x, y: pause.y, id: 4 }]); await page.waitForTimeout(80); await touch('touchEnd', []);
  await page.waitForTimeout(600);
  check('再點一次 → 關閉暫停', (await state()).paused === false);

  // 6. 失焦安全網：按住右時切走分頁 → 放開
  await touch('touchStart', [{ x: stick.x + stick.w * 0.4, y: stick.y, id: 1 }]);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(300);
  check('視窗失焦時自動放開按鍵', (await state()).right === false);
  await touch('touchEnd', []);

  // 7. 直向提示
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  check('直向時顯示「請橫放」提示並隱藏操作層', await page.evaluate(() =>
    getComputedStyle(document.getElementById('rotate-hint')).display !== 'none' && getComputedStyle(document.getElementById('touch-controls')).display === 'none'));
  await page.screenshot({ path: SP + '/m-portrait.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  check('轉回橫向後提示消失', await page.evaluate(() => getComputedStyle(document.getElementById('rotate-hint')).display === 'none'));

  // 8. 不同尺寸：16:9 平板（無黑邊）操作層不遮住 HUD 列
  await page.setViewportSize({ width: 1024, height: 576 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: SP + '/m-tablet.png' });

  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

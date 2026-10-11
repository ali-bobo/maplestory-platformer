const { chromium } = require('/opt/node-tools/node_modules/playwright');
const SPDIR = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto('http://127.0.0.1:8123/index.html?debug=1'); await page.waitForTimeout(4000);
  await page.keyboard.press('Enter'); await page.waitForTimeout(4000);
  const gsInfo = () => page.evaluate(() => { const g = window.__game; const gs = g.registry.get('gameState'); const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player;
    return { cd: { ...gs.skillCooldowns }, mp: gs.mp, maxMp: gs.maxMp, slots: gs.skillSlots, vy: p.body.velocity.y, onGround: p.body.blocked.down, level: gs.level }; });

  // 1. 空白鍵 = 普通攻擊：不耗 MP、進入冷卻
  const s0 = await gsInfo();
  await page.keyboard.down('Space'); await page.waitForTimeout(200); const s1 = await gsInfo(); await page.keyboard.up('Space');
  check('空白鍵施放普通攻擊（Z 冷卻開始）', s1.cd.Z > 0, 'cdZ=' + s1.cd.Z);
  check('普通攻擊不耗 MP', s1.mp >= s0.mp, `mp ${s0.mp} → ${s1.mp}`);

  // 2. 方向鍵上 = 跳躍
  await page.waitForTimeout(600);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(100);
  const j = await gsInfo(); await page.keyboard.up('ArrowUp');
  check('按「↑」跳躍（垂直速度向上）', j.vy < -100, 'vy=' + j.vy);

  // 3. 技能欄：未解鎖時拖曳被擋下
  const pos = (k) => page.evaluate((k) => { const u = window.__game.scene.getScene('UIScene'); const d = u._cdOverlays[k]; return { x: d.sx + d.slotW / 2, y: d.sy + d.slotW / 2 }; }, k);
  let px = await pos('X'), pc = await pos('C');
  await page.mouse.move(px.x, px.y); await page.mouse.down(); await page.mouse.move(pc.x, pc.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
  check('等級不足時拖曳不會調整順序', JSON.stringify((await gsInfo()).slots) === '["X","C","V","B"]');
  await page.screenshot({ path: SPDIR + '/skills-locked.png' });

  // 4. 全部解鎖後：拖 X 欄到 C 欄 → 交換；按 X 鍵施放的是原本在 C 的技能
  await page.evaluate(() => { const g = window.__game; const gs = g.registry.get('gameState'); gs.level = 20; gs.unlockedSkills = ['Z', 'X', 'C', 'V', 'B']; gs.skillLevels = { Z: 1, X: 1, C: 1, V: 1, B: 1 }; gs.mp = gs.maxMp = 999; g.registry.set('gameState', gs); });
  await page.waitForTimeout(400);
  await page.mouse.move(px.x, px.y); await page.mouse.down(); await page.mouse.move(pc.x, pc.y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(400);
  const sw = await gsInfo();
  check('全部解鎖後拖曳 → 兩個技能欄位交換', JSON.stringify(sw.slots) === '["C","X","V","B"]', JSON.stringify(sw.slots));
  await page.screenshot({ path: SPDIR + '/skills-swapped.png' });
  await page.keyboard.down('x'); await page.waitForTimeout(220); const cx = await gsInfo(); await page.keyboard.up('x');
  check('按 X 鍵施放的是被換到 X 欄的技能（暗殺 C）', cx.cd.C > 0 && !(cx.cd.X > 0), JSON.stringify({ C: cx.cd.C, X: cx.cd.X }));
  // 存檔保留
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('thief-legend-save-v1') || '{}'));
  check('欄位順序寫入存檔', !!saved.state && JSON.stringify(saved.state.skillSlots) === '["C","X","V","B"]', JSON.stringify(saved.state && saved.state.skillSlots));

  // 5. 聲音按鈕（右上）：靜音 / 取消靜音
  const hud = await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); return { x: u._soundBtn.bg.x, y: u._soundBtn.bg.y }; });
  await page.mouse.move(hud.x, hud.y); await page.waitForTimeout(200); await page.mouse.click(hud.x, hud.y); await page.waitForTimeout(500);
  check('點聲音按鈕 → 靜音並記住', await page.evaluate(() => localStorage.getItem('thief-legend-sound') === 'off'));
  await page.screenshot({ path: SPDIR + '/sound-off.png' });
  await page.mouse.click(hud.x, hud.y); await page.waitForTimeout(300);
  check('再點一次 → 恢復', await page.evaluate(() => localStorage.getItem('thief-legend-sound') === 'on'));

  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

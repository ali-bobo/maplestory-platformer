// 操作的 e2e：手把（以 addInitScript 假造 navigator.getGamepads）與按鍵設定。
//  1. 接上手把 → 「已連接手把」提示；主選單按 A 開始遊戲
//  2. 設定 → 按鍵設定：把技能欄 1 改成 Q（HUD 字樣、localStorage、Q 施放 / Z 不再施放）、
//     衝突互換、保留鍵拒絕、等待按鍵時 ESC 只取消、恢復預設、重新載入後保留
//  3. 手把：十字鍵 / 搖桿移動、A 跳、X 普攻、Y 技能欄 1（跟著改過的鍵位）、Start 暫停 / 繼續
// 用法：PORT=8132 node e2e/controls.cjs /tmp/shots
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
const SETTINGS_KEY = 'thief-legend-settings';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const errors = [];

(async () => {
  const b = await chromium.launch({ executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errors.push(m.text()); });
  await page.addInitScript(() => {
    try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {}
    // 假手把：window.__setPad([按著的按鈕索引], [左搖桿 x, y])；window.__unplug() 拔掉
    window.__pads = [];
    const mk = (pressed, axes) => ({
      index: 0, id: 'Fake Standard Gamepad', connected: true, mapping: 'standard', timestamp: performance.now(),
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
      axes: axes || [0, 0, 0, 0],
    });
    window.__setPad = (pressed = [], axes) => { window.__pads = [mk(pressed, axes)]; };
    window.__unplug = () => { window.__pads = []; };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads });
  });

  const frames = (n) => page.evaluate((n) => new Promise((res) => {
    const f0 = window.__game.loop.frame;
    const t = setInterval(() => { if (window.__game.loop.frame >= f0 + n) { clearInterval(t); res(); } }, 15);
  }), n);
  const sc = () => page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState'); const p = g.scene.getScene('MapleIslandScene').player;
    return { x: p.x, vy: p.body.velocity.y, onGround: p.body.blocked.down, cd: { ...gs.skillCooldowns }, mp: gs.mp };
  });
  const keys = () => page.evaluate(() => ({ ...window.__settings.get().keys }));
  // 按住鍵盤鍵到遊戲跑過 2 幀再放開（無頭瀏覽器 FPS 低，固定毫秒數可能落在兩幀之間）
  const tap = async (key) => { await page.keyboard.down(key); await frames(2); await page.keyboard.up(key); await frames(1); };
  // UIScene 裡找文字物件的位置（畫布 1280x720 對齊視窗，座標可直接點）
  const textPos = (str) => page.evaluate((str) => {
    const u = window.__game.scene.getScene('UIScene');
    const t = u.children.list.filter((o) => o.type === 'Text' && o.active && o.visible && o.text === str).sort((a, b) => b.depth - a.depth)[0];
    return t ? { x: t.x, y: t.y, ox: t.originX } : null;
  }, str);
  const clickText = async (str) => { const p = await textPos(str); if (!p) return false; await page.mouse.click(p.x, p.y); await frames(1); return true; };
  // 按鍵設定面板：動作名稱左上角 (x, y+8)，按鍵格中心在 (x+256, y+18)
  const clickBindBox = async (label) => { const p = await textPos(label); if (!p) return false; await page.mouse.click(p.x + 256, p.y + 10); await frames(1); return true; };
  const hasText = (re) => page.evaluate((src) => {
    const r = new RegExp(src); const u = window.__game.scene.getScene('UIScene');
    return u.children.list.some((o) => o.type === 'Text' && o.active && r.test(o.text));
  }, re.source);

  // ── 1. 手把接上提示、主選單按 A ────────────────────────────────────────────
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 40000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__setPad([]));
  await page.waitForFunction(() => { const t = document.getElementById('gamepad-toast'); return t && t.textContent === '已連接手把' && t.style.opacity === '1'; }, null, { timeout: 5000 })
    .then(() => check('接上手把 → 顯示「已連接手把」', true))
    .catch(() => check('接上手把 → 顯示「已連接手把」', false));
  await page.screenshot({ path: `${SP}/controls-pad-toast.png` });
  await page.evaluate(() => window.__setPad([0]));   // A
  const started = await page.waitForFunction(() => window.__game.scene.isActive('MapleIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('主選單按手把 A → 開始遊戲', started);
  if (!started) { await b.close(); process.exit(1); }
  await page.waitForTimeout(1500);
  // 不讓怪物干擾：補滿 MP
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.mp = gs.maxMp; });

  // ── 2. 按鍵設定 ─────────────────────────────────────────────────────────────
  await page.mouse.click(1230, 671);   // HUD「設定」鈕
  await frames(2);
  check('開啟設定視窗', await page.evaluate(() => { const p = window.__game.scene.getScene('UIScene')._popup; return !!p && p.type === 'settings'; }));
  check('點「按鍵設定」開啟面板', await clickText('按鍵設定') && await hasText(/^點按鍵格/));
  await page.screenshot({ path: `${SP}/controls-keybind.png` });

  await clickBindBox('技能欄 1');
  check('點技能欄 1 的按鍵格 → 等待按鍵', await hasText(/^請按鍵…$/));
  await page.keyboard.press('q');
  await frames(1);
  let kb = await keys();
  check('按 Q → 技能欄 1 改成 Q', kb.skill1 === 'Q', JSON.stringify(kb));
  const stored = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, SETTINGS_KEY);
  check('鍵位存進設定的 localStorage key', !!stored && stored.keys && stored.keys.skill1 === 'Q');
  check('設定視窗的操作說明跟著改', await hasText(/^Q X C V$/));

  // 衝突：技能欄 2 也要 Q → 互換
  await clickBindBox('技能欄 2');
  await page.keyboard.press('q');
  await frames(1);
  kb = await keys();
  check('衝突：技能欄 2 改成 Q → 與技能欄 1 互換', kb.skill2 === 'Q' && kb.skill1 === 'X', JSON.stringify(kb));
  check('互換時顯示說明', await hasText(/互換/));
  // 換回來：技能欄 1 = Q、技能欄 2 = X
  await clickBindBox('技能欄 1');
  await page.keyboard.press('q');
  await frames(1);
  kb = await keys();
  check('再換回：技能欄 1 = Q、技能欄 2 = X', kb.skill1 === 'Q' && kb.skill2 === 'X', JSON.stringify(kb));

  // 保留鍵：跳躍不能用 M
  await clickBindBox('跳躍');
  await page.keyboard.press('m');
  await frames(2);
  kb = await keys();
  check('保留鍵 M 被拒絕，跳躍仍是 Alt', kb.jump === 'ALT' && await hasText(/保留給世界地圖/), JSON.stringify(kb));
  check('按 M 沒有打開世界地圖', !(await page.evaluate(() => { const w = window.__game.scene.getScene('UIScene')._worldMap; return !!(w && w.isOpen); })));
  // 等待按鍵時 ESC 只取消，不關視窗
  await clickBindBox('普通攻擊');
  await page.keyboard.press('Escape');
  await frames(2);
  check('等待按鍵時按 ESC 只取消（設定視窗仍開著、鍵位不變）',
    (await keys()).attack === 'SPACE' && await page.evaluate(() => !!window.__game.scene.getScene('UIScene')._popup) && await hasText(/^已取消$/));
  await page.screenshot({ path: `${SP}/controls-keybind-done.png` });

  // 關掉設定（不在等待中：ESC 關最上層視窗）
  await page.keyboard.press('Escape');
  await frames(3);
  check('ESC 關閉設定視窗', await page.evaluate(() => !window.__game.scene.getScene('UIScene')._popup));
  check('HUD 技能欄 1 的字樣變成 Q', await page.evaluate(() => {
    const u = window.__game.scene.getScene('UIScene');
    return u._hudKeyTexts.some((r) => r.action === 'skill1' && r.text.text === 'Q');
  }));

  // 遊戲中：Z 不再施放，Q 施放技能欄 1（三連飛鏢）
  await page.waitForTimeout(500);
  await tap('z');
  await page.waitForTimeout(300);
  let s = await sc();
  check('改鍵後按 Z 不施放技能欄 1', !(s.cd.Z > 0), 'cdZ=' + s.cd.Z);
  await page.keyboard.down('q'); await frames(2);
  s = await sc(); await page.keyboard.up('q');
  check('改鍵後按 Q 施放技能欄 1', s.cd.Z > 0, 'cdZ=' + s.cd.Z);

  // 重新載入後保留
  await page.reload();
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 40000 });
  check('重新載入後鍵位仍在', (await keys()).skill1 === 'Q');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('MapleIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.mp = gs.maxMp; gs.skillCooldowns.Z = 0; });

  // ── 3. 手把遊玩 ─────────────────────────────────────────────────────────────
  await page.evaluate(() => window.__setPad([]));
  await frames(2);
  let s0 = await sc();
  // 等到走夠遠（最多 4 秒；機器忙時 FPS 很低，固定毫秒數走不遠）
  const moved = (dir, x0) => page.waitForFunction(([dir, x0]) => {
    const p = window.__game.scene.getScene('MapleIslandScene').player; return dir > 0 ? p.x > x0 + 30 : p.x < x0 - 30;
  }, [dir, x0], { polling: 30, timeout: 4000 }).catch(() => {});
  await page.evaluate(() => window.__setPad([15]));   // 十字鍵右
  await moved(1, s0.x);
  let s1 = await sc();
  await page.evaluate(() => window.__setPad([]));
  check('手把十字鍵右 → 往右移動', s1.x > s0.x + 30, `x ${Math.round(s0.x)} → ${Math.round(s1.x)}`);
  await page.waitForTimeout(300);
  s0 = await sc();
  await page.evaluate(() => window.__setPad([], [-1, 0]));   // 左搖桿往左
  await moved(-1, s0.x);
  s1 = await sc();
  await page.evaluate(() => window.__setPad([]));
  check('左搖桿往左 → 往左移動', s1.x < s0.x - 30, `x ${Math.round(s0.x)} → ${Math.round(s1.x)}`);
  await page.waitForTimeout(400);

  // A 跳
  await page.waitForFunction(() => window.__game.scene.getScene('MapleIslandScene').player.body.blocked.down, null, { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => window.__setPad([0]));
  const jumped = await page.waitForFunction(() => window.__game.scene.getScene('MapleIslandScene').player.body.velocity.y < -100, null, { polling: 20, timeout: 3000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('手把 A → 跳躍', jumped);
  await page.waitForTimeout(1200);

  // X 普攻
  await page.evaluate(() => window.__setPad([2]));
  const attacked = await page.waitForFunction(() => (window.__game.registry.get('gameState').skillCooldowns.ATK || 0) > 0, null, { polling: 20, timeout: 3000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('手把 X → 普通攻擊', attacked);
  await page.waitForTimeout(400);

  // Y 技能欄 1（送的是改過的 Q 鍵）
  await page.evaluate(() => window.__setPad([3]));
  const cast = await page.waitForFunction(() => (window.__game.registry.get('gameState').skillCooldowns.Z || 0) > 0, null, { polling: 20, timeout: 3000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('手把 Y → 技能欄 1（跟著改過的鍵位）', cast);
  await frames(2);

  // Start 暫停 / 再按一次繼續
  await page.evaluate(() => window.__setPad([9]));
  const paused = await page.waitForFunction(() => window.__game.scene.getScene('UIScene')._isPaused, null, { polling: 20, timeout: 3000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('手把 Start → 暫停選單', paused);
  await page.screenshot({ path: `${SP}/controls-pad-pause.png` });
  await frames(3);
  await page.evaluate(() => window.__setPad([9]));
  const resumed = await page.waitForFunction(() => !window.__game.scene.getScene('UIScene')._isPaused, null, { polling: 20, timeout: 3000 }).then(() => true).catch(() => false);
  await page.evaluate(() => window.__setPad([]));
  check('再按 Start → 關閉暫停選單', resumed);

  // 拔掉手把 → 沒有卡鍵
  await page.evaluate(() => window.__setPad([15]));
  await frames(2);
  await page.evaluate(() => window.__unplug());
  await frames(3);
  check('拔掉手把 → 按鍵全部放開', await page.evaluate(() => !window.__game.scene.getScene('MapleIslandScene').player.cursors.right.isDown));

  // 恢復預設
  await page.evaluate(() => window.__game.scene.getScene('UIScene')._openPopup('settings'));
  await frames(2);
  await clickText('按鍵設定');
  await clickText('恢復預設');
  await clickText('再按一次確認');
  const def = await keys();
  check('恢復預設 → 技能欄 1 回到 Z', def.skill1 === 'Z' && def.skill2 === 'X' && def.jump === 'ALT');

  check('全程沒有 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

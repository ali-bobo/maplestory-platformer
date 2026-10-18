// 受擊擊退 + 暫停選單「儲存並離開」實測。
// 用法：PORT=8123 node e2e/savequit.cjs /tmp/shots
//  1. 怪物從左邊打 → 玩家往右被擊退、短暫硬直、無敵閃爍；受傷後 HP 自然回復暫停
//  2. 從右邊重擊（force 2）→ 往左退得更遠
//  3. ESC → 暫停選單有「儲存並離開」→ 回到主選單、存檔正確、場景與監聽都清乾淨 → 繼續遊戲回到同一張地圖 / 等級
//  4. 副本中「儲存並離開」→ 先確認 → 回主選單，繼續遊戲落在晨曦鎮
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const SHOT_DIR = process.env.SHOT_DIR || '';   // 另外存一份說明用截圖（可不給）
const URL = `http://127.0.0.1:${PORT}/index.html?debug=1`;
const KEY = 'thief-legend-save-v1';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => {
    await page.screenshot({ path: `${SP}/${name}` });
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${name}` });
  };

  const seeded = { format: 'thief-legend-save', version: 1, savedAt: Date.now(), state: {
    level: 10, exp: 5, maxHp: 580, maxMp: 358, atk: 115, speed: 238, meso: 1234, killCount: 40,
    unlockedSkills: ['Z', 'X'], skillLevels: { Z: 2, X: 1, C: 0, V: 0, B: 0 }, currentMap: 'forest',
    potions: { A: 6, S: 2, D: 3, R: 1, G: 1 },
  } };
  await page.goto(`http://127.0.0.1:${PORT}/__blank__`);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seeded)]);
  await page.goto(URL);
  await page.waitForTimeout(3500);
  await page.mouse.move(640, 520); await page.waitForTimeout(400); await page.mouse.click(640, 520);   // 繼續遊戲
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('ForestScene'); return window.__game.scene.isActive('ForestScene') && s.player && s.player.body; }, null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('繼續遊戲 → 森林獵場', await ev(() => window.__game.scene.isActive('ForestScene')));

  // ── 1. 怪物從左邊打（走 Monster._doAttack 的實際呼叫路徑）──
  // 其他怪全部停用，免得測試期間被別隻打到；玩家放在地圖中段的地面上
  const prep = () => ev(() => {
    const sc = window.__game.scene.getScene('ForestScene'); const p = sc.player; const gs = window.__game.registry.get('gameState');
    const ms = sc.monsters.getChildren().filter((m) => m.active && !m.isDead);
    const m = ms[0];
    for (const o of ms.slice(1)) { o.setActive(false).setVisible(false); if (o.body) o.body.enable = false; }
    m.update = () => {};
    p.body.reset(1280, 560); p.setVelocity(0, 0);
    gs.hp = gs.maxHp - 200; p.isInvincible = false; p._invUntil = 0; p._hitLockLeft = 0;
    window.__m = m;
    return { ok: !!m };
  });
  check('準備：找到一隻怪物當攻擊者', (await prep()).ok);
  await page.waitForTimeout(800);   // 等玩家落地
  const hit1 = await ev(() => {
    const sc = window.__game.scene.getScene('ForestScene'); const p = sc.player; const m = window.__m; const gs = window.__game.registry.get('gameState');
    m.body.reset(p.x - 60, p.y); m.attackCooldown = 0;
    const x0 = p.x, hp0 = gs.hp;
    m._doAttack(p);
    return { x0, hp0, hp1: gs.hp, vx: p.body.velocity.x, vy: p.body.velocity.y, locked: p.isHitLocked(), inv: p.isInvincible };
  });
  await page.waitForTimeout(60);
  await shot('hit-knockback.png');
  // 無敵 800 ms 是遊戲時間：用等待條件而不是固定秒數
  await page.waitForFunction(() => !window.__game.scene.getScene('ForestScene').player.isInvincible, null, { timeout: 15000, polling: 100 }).catch(() => {});
  await page.waitForFunction(() => window.__game.scene.getScene('ForestScene').player.body.blocked.down, null, { timeout: 5000, polling: 50 }).catch(() => {});
  const after1 = await ev(() => { const sc = window.__game.scene.getScene('ForestScene'); const p = sc.player; const gs = window.__game.registry.get('gameState');
    return { x: p.x, locked: p.isHitLocked(), inv: p.isInvincible, alpha: p.alpha, hp: gs.hp, onGround: p.body.blocked.down, y: p.y }; });
  check('被打到扣血', hit1.hp1 < hit1.hp0, `${hit1.hp0} → ${hit1.hp1}`);
  check('攻擊者在左 → 往右擊退、向上彈起、進入硬直與無敵', hit1.vx > 0 && hit1.vy < 0 && hit1.locked && hit1.inv, JSON.stringify(hit1));
  check('擊退後玩家 x 往遠離攻擊者的方向移動', after1.x > hit1.x0 + 10, `x ${Math.round(hit1.x0)} → ${Math.round(after1.x)}`);
  check('無敵結束後：硬直解除、不透明、站回地面', !after1.locked && !after1.inv && after1.alpha === 1 && after1.onGround, JSON.stringify(after1));

  // ── 2. 右邊重擊（force 2）→ 往左退，比一般受擊更遠 ──
  // 同時在頁面內每 50 ms 取樣：無敵期間的透明度（閃爍）、受傷後 3.5 秒（遊戲時間）內 HP 不自然回復
  // （無頭瀏覽器 FPS 低，遊戲時間比真實時間慢，不用固定秒數）
  const hit2 = await ev(() => new Promise((resolve) => {
    const sc = window.__game.scene.getScene('ForestScene'); const p = sc.player; const gs = window.__game.registry.get('gameState');
    const x0 = p.x; p.takeDamage(20, { sourceX: p.x + 50, force: 2 });
    const r = { x0, vx: p.body.velocity.x, hp1: gs.hp, hps: [], minAlpha: 1 }; const t0 = Date.now();
    const tick = () => {
      const since = sc.time.now - p._lastHurtAt;
      if (p.isInvincible) r.minAlpha = Math.min(r.minAlpha, p.alpha);
      if (since < 3500) r.hps.push(gs.hp);
      if (since >= 3500 || Date.now() - t0 > 30000) { r.since = Math.round(since); resolve(r); } else setTimeout(tick, 50);
    };
    tick();
  }));
  await page.waitForFunction(() => !window.__game.scene.getScene('ForestScene').player.isHitLocked(), null, { timeout: 15000 }).catch(() => {});
  const x2 = await ev(() => window.__game.scene.getScene('ForestScene').player.x);
  check('攻擊者在右（重擊）→ 往左擊退、初速是一般的 2 倍', hit2.vx < 0 && Math.abs(hit2.vx) > Math.abs(hit1.vx) * 1.8, `vx=${hit2.vx} vs ${hit1.vx}`);
  check('重擊後玩家 x 往左移動', x2 < hit2.x0 - 10, `x ${Math.round(hit2.x0)} → ${Math.round(x2)}`);
  check('無敵期間閃爍（半透明）', hit2.minAlpha < 0.8, `min alpha=${hit2.minAlpha}`);
  check('受傷後 3.5 秒內 HP 自然回復暫停', hit2.hps.length > 0 && hit2.hps.every((h) => h === hit2.hp1), `${hit2.hp1} → ${Math.min(...hit2.hps)}..${Math.max(...hit2.hps)} (${hit2.hps.length} 筆)`);

  // ── 3. ESC → 儲存並離開 ──
  await ev(() => { const gs = window.__game.registry.get('gameState'); gs.meso = 4321; });
  const listenersBefore = await ev(() => window.__game.registry.events.listenerCount('changedata-hp'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const btn = await ev(() => {
    const ui = window.__game.scene.getScene('UIScene');
    const t = ui.children.list.find((o) => o.type === 'Text' && o.text === '儲存並離開' && o.active);
    return { paused: ui._isPaused, x: t ? t.x : null, y: t ? t.y : null };
  });
  check('ESC 開啟暫停選單，有「儲存並離開」按鈕', btn.paused && btn.x !== null, JSON.stringify(btn));
  await shot('pause-save-quit.png');
  await page.mouse.move(btn.x, btn.y); await page.waitForTimeout(200); await page.mouse.click(btn.x, btn.y);
  await page.waitForTimeout(250);
  const toast = await ev(() => window.__game.scene.getScene('UIScene').children.list.some((o) => o.type === 'Text' && o.text === '已儲存 ✓'));
  check('顯示「已儲存」確認', toast);
  await page.waitForFunction(() => window.__game.scene.isActive('MenuScene'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const menu = await ev((k) => {
    const g = window.__game;
    const raw = localStorage.getItem(k);
    return {
      active: g.scene.getScenes(true).map((s) => s.sys.settings.key),
      save: raw ? JSON.parse(raw).state : null,
      hpListeners: g.registry.events.listenerCount('changedata-hp'),
      heavyListeners: g.registry.events.listenerCount('player-heavy-hit'),
    };
  }, KEY);
  check('回到主選單，地圖場景與 UIScene 都已停止', menu.active.includes('MenuScene') && !menu.active.includes('ForestScene') && !menu.active.includes('UIScene'), menu.active.join(','));
  check('存檔寫入：森林、Lv10、最新金幣', menu.save && menu.save.currentMap === 'forest' && menu.save.level === 10 && menu.save.meso === 4321,
    menu.save && JSON.stringify({ map: menu.save.currentMap, lv: menu.save.level, meso: menu.save.meso }));
  check('HUD 監聽全部解除（沒有殘留）', menu.hpListeners === 0 && menu.heavyListeners === 0, `hp ${listenersBefore} → ${menu.hpListeners}, heavy ${menu.heavyListeners}`);

  await page.mouse.move(640, 520); await page.waitForTimeout(300); await page.mouse.click(640, 520);   // 繼續遊戲
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('ForestScene'); return window.__game.scene.isActive('ForestScene') && s.player && s.player.body; }, null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const cont = await ev(() => { const g = window.__game; const gs = g.registry.get('gameState');
    return { active: g.scene.getScenes(true).map((s) => s.sys.settings.key), lv: gs.level, map: gs.currentMap, meso: gs.meso, hpL: g.registry.events.listenerCount('changedata-hp') }; });
  check('繼續遊戲 → 回到同一張地圖、同等級', cont.active.includes('ForestScene') && cont.active.includes('UIScene') && cont.lv === 10 && cont.map === 'forest' && cont.meso === 4321, JSON.stringify(cont));
  check('重新進入後 HUD 監聽數與離開前相同', cont.hpL === listenersBefore, `${listenersBefore} → ${cont.hpL}`);

  // ── 4. 副本中：先確認 → 回主選單 → 繼續遊戲落在晨曦鎮 ──
  await ev(() => { const g = window.__game; const gs = g.registry.get('gameState'); const sc = g.scene.getScene('ForestScene');
    sc.scene.stop('UIScene'); sc.scene.start('DungeonScene', { dungeonId: 'slime_cave', gameState: gs }); });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('DungeonScene'); return window.__game.scene.isActive('DungeonScene') && s.player && s.player.body && window.__game.scene.isActive('UIScene'); }, null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await ev(() => { const p = window.__game.scene.getScene('DungeonScene').player; p.isInvincible = true; window.__game.registry.get('gameState').hp = 99999; });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const dBtn = await ev(() => {
    const ui = window.__game.scene.getScene('UIScene');
    const t = ui.children.list.find((o) => o.type === 'Text' && o.text === '儲存並離開' && o.active);
    const note = ui.children.list.find((o) => o.type === 'Text' && /副本 \/ Boss 中/.test(o.text));
    return { paused: ui._isPaused, x: t ? t.x : null, y: t ? t.y : null, note: note ? note.text : null };
  });
  check('副本中暫停選單註明下次從安全地圖開始', dBtn.paused && dBtn.note && dBtn.note.includes('晨曦鎮'), JSON.stringify(dBtn));
  await page.mouse.click(dBtn.x, dBtn.y);
  await page.waitForTimeout(500);
  const confirm = await ev(() => {
    const ui = window.__game.scene.getScene('UIScene');
    const btns = ui.children.list.filter((o) => o.type === 'Text' && o.text === '儲存並離開' && o.active);
    const top = btns.sort((a, b) => b.depth - a.depth)[0];
    return { n: ui._pauseConfirmObjs.length, x: top.x, y: top.y, menu: window.__game.scene.isActive('MenuScene') };
  });
  check('副本中先跳出確認視窗（還沒離開）', confirm.n > 0 && !confirm.menu, JSON.stringify(confirm));
  await page.mouse.click(confirm.x, confirm.y);
  await page.waitForFunction(() => window.__game.scene.isActive('MenuScene'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const dMenu = await ev(() => ({ active: window.__game.scene.getScenes(true).map((s) => s.sys.settings.key) }));
  check('確認後回到主選單，副本場景已停止', dMenu.active.includes('MenuScene') && !dMenu.active.includes('DungeonScene') && !dMenu.active.includes('UIScene'), dMenu.active.join(','));
  await page.mouse.move(640, 520); await page.waitForTimeout(300); await page.mouse.click(640, 520);
  await page.waitForFunction(() => window.__game.scene.isActive('TownScene'), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
  const town = await ev(() => { const gs = window.__game.registry.get('gameState'); return { town: window.__game.scene.isActive('TownScene'), lv: gs.level }; });
  check('繼續遊戲 → 晨曦鎮、等級保留', town.town && town.lv === 10, JSON.stringify(town));

  check('全程沒有 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(fails ? `${fails} FAIL` : 'ALL PASS');
  process.exit(fails ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(3); });

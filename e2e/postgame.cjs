// 通關後內容 + 難度 + 載入提示的 e2e：
//  1. 通關前魔君王城 / 暗影領域沒有回程門；打倒暗影魔君 → 結算 → 通關旗標寫進存檔
//  2. 「繼續冒險」回晨曦鎮、HUD 在、世界地圖可傳送到魔君王城
//  3. 魔君王城的「回晨曦鎮」傳送門出現，按 F 回到晨曦鎮；暗影領域也有回程門
//  4. 困難難度讓新生成的怪物 HP ×1.4、攻擊力 ×1.3（普通 = 原數值）
//  5. 載入條下方顯示提示（故意延遲素材下載讓載入條出現）；死亡結算畫面有提示
// 用法：PORT=8134 node e2e/postgame.cjs /tmp/shots
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const URL = `http://127.0.0.1:${PORT}/index.html?debug=1`;
const KEY = 'thief-legend-save-v1';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });

  const ROUTE = ['town', 'sky', 'henesys', 'ruins', 'harbor', 'desert', 'snow', 'lava', 'castle'];
  const seeded = { format: 'thief-legend-save', version: 1, savedAt: Date.now(), state: {
    level: 45, exp: 0, maxHp: 4000, maxMp: 2000, atk: 900, meso: 200000, killCount: 3000,
    shards: ['harbor', 'desert', 'snow', 'lava', 'castle'], towerLit: true, bossUnlocked: true,
    currentMap: 'castle', visitedMaps: ROUTE, potions: { A: 50, S: 50, D: 50, R: 50, G: 50 },
  } };
  await page.goto(`http://127.0.0.1:${PORT}/__blank__`);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.removeItem('thief-legend-settings'); }, [KEY, JSON.stringify(seeded)]);
  await page.goto(URL);
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.waitForTimeout(800);

  const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.sys.settings.key));
  const waitScene = (key, timeout = 30000) => page.waitForFunction((k) => {
    const s = window.__game.scene.getScene(k);
    return window.__game.scene.isActive(k) && s && s.player && s.player.body;
  }, key, { timeout });
  const savedState = () => page.evaluate((k) => { const r = localStorage.getItem(k); return r ? JSON.parse(r).state : null; }, KEY);
  const portalsOf = (key) => page.evaluate((k) => window.__game.scene.getScene(k).portals.getChildren().map((p) => ({ x: p.x, target: p.targetMap, interact: p.interact })), key);
  const heal = (key) => page.evaluate((k) => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; const s = window.__game.scene.getScene(k); if (s && s.player) s.player.isInvincible = true; }, key);
  // 按住互動鍵到遊戲跑過幾幀（headless FPS 低，JustDown / keydown 一幀才讀一次）
  const pressF = async () => { await page.keyboard.down('f'); await page.waitForTimeout(250); await page.keyboard.up('f'); };
  const standOnPortal = (key, x) => page.evaluate(([k, px]) => {
    const s = window.__game.scene.getScene(k); const p = s.player;
    p.body.reset(px, p.y); p.setVelocity(0, 0);
    s.cameras.main.centerOn(px, s.cameras.main.midPoint.y);   // 鏡頭直接跟過去（截圖看得到門）
  }, [key, x]);
  const monsterStats = (key) => page.evaluate((k) => window.__game.scene.getScene(k).monsters.getChildren()
    .filter((m) => m.active && !m._isMinion).map((m) => ({ id: m.config.id, hp: m.maxHp, cfgHp: m.config.hp, atk: m.atk, cfgAtk: m.config.atk, diff: m.difficulty })), key);

  // ── 1. 繼續遊戲 → 魔君王城（還沒通關：沒有回程門）─────────────────────────
  await page.evaluate(() => window.__game.scene.getScene('MenuScene')._continueGame());
  await waitScene('CastleScene');
  await page.waitForTimeout(1200);
  let ports = await portalsOf('CastleScene');
  check('通關前魔君王城沒有回晨曦鎮的傳送門', !ports.some((p) => p.target === 'town'), JSON.stringify(ports));
  check('通關前魔君王城有 Boss 決戰門', ports.some((p) => p.target === 'boss'));
  let ms = await monsterStats('CastleScene');
  check('普通難度：怪物 HP / 攻擊力等於設定值', ms.length > 5 && ms.every((m) => m.hp === m.cfgHp && m.atk === m.cfgAtk && m.diff === 'normal'), JSON.stringify(ms.slice(0, 3)));

  // ── 2. 進暗影領域、擊敗 Boss ────────────────────────────────────────────
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState'); const s = g.scene.getScene('CastleScene');
    gs.currentMap = 'boss'; s.scene.stop('UIScene'); s.scene.start('BossScene', { gameState: gs, spawnX: 200 });
  });
  await waitScene('BossScene');
  ports = await portalsOf('BossScene');
  check('通關前暗影領域沒有回程門', ports.length === 0, JSON.stringify(ports));
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('BossScene'); return s && s._boss && s._boss.active; }, null, { timeout: 20000 });
  const bossHpNormal = await page.evaluate(() => window.__game.scene.getScene('BossScene')._boss.maxHp);
  check('普通難度 Boss 血量 28000', bossHpNormal === 28000, `${bossHpNormal}`);
  for (let i = 0; i < 40; i++) {
    await heal('BossScene');
    const done = await page.evaluate(() => {
      const s = window.__game.scene.getScene('BossScene');
      if (!s || !s.sys.isActive()) return true;
      if (s._bossDefeated) return true;
      const b = s._boss; if (b && !b.isDead) b.takeDamage(Math.max(1, b.hp), false);
      return !!s._bossDefeated;
    });
    if (done) break;
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => window.__game.scene.isActive('GameOverScene'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  let saved = await savedState();
  check('擊敗 Boss 後通關旗標寫進存檔（地圖存成魔君王城）', saved && saved.gameCleared === true && saved.currentMap === 'castle', JSON.stringify(saved && { c: saved.gameCleared, m: saved.currentMap }));
  const footer = await page.evaluate(() => { const t = window.__game.scene.getScene('GameOverScene')._footerText; return t && t.text; });
  check('勝利結算畫面說明回程傳送門', !!footer && footer.includes('回晨曦鎮'), footer);
  await page.screenshot({ path: `${SP}/postgame-victory.png` });

  // ── 3. 繼續冒險 → 晨曦鎮，世界地圖可用 ─────────────────────────────────
  await page.mouse.move(510, 540); await page.waitForTimeout(300); await page.mouse.click(510, 540);
  await waitScene('TownScene');
  await page.waitForFunction(() => window.__game.scene.isActive('UIScene'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  let gs = await page.evaluate(() => { const g = window.__game.registry.get('gameState'); return { map: g.currentMap, hp: g.hp, maxHp: g.maxHp, cleared: g.gameCleared }; });
  check('繼續冒險回到晨曦鎮、滿血、仍是通關狀態', gs.map === 'town' && gs.hp === gs.maxHp && gs.cleared === true, JSON.stringify(gs));
  await page.keyboard.press('m'); await page.waitForTimeout(800);
  const wm = await page.evaluate(() => { const w = window.__game.scene.getScene('UIScene')._worldMap; return { open: !!w.open, castle: w.nodes.some((n) => n.key === 'castle') }; });
  check('晨曦鎮按 M 開啟世界地圖', wm.open && wm.castle, JSON.stringify(wm));
  await page.evaluate(() => { const w = window.__game.scene.getScene('UIScene')._worldMap; w._select('castle'); w._go(); });
  await waitScene('CastleScene');
  await page.waitForTimeout(1500);

  // ── 4. 魔君王城的回程門 → 按 F 回晨曦鎮 ───────────────────────────────
  ports = await portalsOf('CastleScene');
  const ret = ports.find((p) => p.target === 'town');
  check('通關後魔君王城出現回晨曦鎮的傳送門（按 F 進入）', !!ret && ret.interact, JSON.stringify(ports));
  if (ret) {
    await heal('CastleScene');
    await standOnPortal('CastleScene', ret.x);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SP}/postgame-portal.png` });
    const stillCastle = await page.evaluate(() => window.__game.scene.isActive('CastleScene'));
    check('只站在門上（沒按 F）不會傳送', stillCastle);
    for (let i = 0; i < 4 && !(await page.evaluate(() => window.__game.scene.isActive('TownScene'))); i++) {
      await standOnPortal('CastleScene', ret.x).catch(() => {});
      await pressF();
      await page.waitForTimeout(900);
    }
    await waitScene('TownScene', 15000).catch(() => {});
    check('按 F 經回程門回到晨曦鎮', (await active()).includes('TownScene'), (await active()).join(','));
  }

  // 暗影領域也有回程門（再次挑戰時的退路）
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState'); const s = g.scene.getScene('TownScene');
    gs.currentMap = 'boss'; s.scene.stop('UIScene'); s.scene.start('BossScene', { gameState: gs, spawnX: 200 });
  });
  await waitScene('BossScene');
  ports = await portalsOf('BossScene');
  check('通關後暗影領域有回晨曦鎮的傳送門', ports.some((p) => p.target === 'town' && p.interact), JSON.stringify(ports));

  // ── 5. 困難難度：新生成的怪物 HP ×1.4、攻擊 ×1.3 ─────────────────────────
  await page.evaluate(() => window.__settings.set({ difficulty: 'hard' }));
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('BossScene'); return s && s._boss && s._boss.active; }, null, { timeout: 20000 });
  const bossHard = await page.evaluate(() => { const b = window.__game.scene.getScene('BossScene')._boss; return { hp: b.maxHp, atk: b.atk }; });
  check('困難難度 Boss 血量 39200、攻擊 ×1.3', bossHard.hp === 39200 && Math.abs(bossHard.atk - 160 * 1.3) < 1e-6, JSON.stringify(bossHard));
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState'); const s = g.scene.getScene('BossScene');
    gs.currentMap = 'castle'; s.scene.stop('UIScene'); s.scene.start('CastleScene', { gameState: gs, spawnX: 200 });
  });
  await waitScene('CastleScene');
  await page.waitForTimeout(1200);
  ms = await monsterStats('CastleScene');
  check('困難難度：新生成的怪物 HP ×1.4（大於設定值）、攻擊 ×1.3', ms.length > 5 && ms.every((m) => m.hp === Math.round(m.cfgHp * 1.4) && m.hp > m.cfgHp && Math.abs(m.atk - m.cfgAtk * 1.3) < 1e-6 && m.diff === 'hard'),
    JSON.stringify(ms.slice(0, 3)));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('thief-legend-settings')));
  saved = await savedState();
  check('難度存在設定（不在存檔裡）', stored && stored.difficulty === 'hard' && saved && !('difficulty' in saved), JSON.stringify(stored));

  // 設定視窗裡的難度三段：點「簡單」
  await page.evaluate(() => window.__game.scene.getScene('UIScene')._openPopup('settings'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SP}/postgame-settings.png` });
  // 難度列在介面大小下方：x0=260, y0=14 → 「簡單」鈕中心約 (296 + 300 - 208 + 32, 14 + 444 + 52 + 19)
  await page.mouse.click(296 + 300 - 208 + 32, 14 + 444 + 52 + 19);
  await page.waitForTimeout(400);
  check('設定視窗點「簡單」切換難度', await page.evaluate(() => window.__settings.get().difficulty === 'easy'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // ── 6. 載入提示：延遲素材下載讓載入條出現（台北都會還沒載過）──────────────
  await page.route('**/dist/assets/**', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue().catch(() => {}); });
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState'); const s = g.scene.getScene('CastleScene');
    gs.currentMap = 'taipei'; s.scene.stop('UIScene'); s.scene.start('TaipeiScene', { gameState: gs, spawnX: 200 });
  });
  let tipSeen = null;
  for (let i = 0; i < 60 && !tipSeen; i++) {
    tipSeen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('TaipeiScene');
      if (!s || !s.children) return null;
      const texts = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
      if (!texts.includes('載入中…')) return null;
      return texts.filter((t) => t !== '載入中…');
    });
    if (!tipSeen) await page.waitForTimeout(100);
  }
  if (tipSeen) await page.screenshot({ path: `${SP}/postgame-loading-tip.png` });
  check('載入條下方有一行提示', !!tipSeen && tipSeen.some((t) => t.length >= 8), JSON.stringify(tipSeen));
  await waitScene('TaipeiScene', 60000);
  await page.unroute('**/dist/assets/**');
  await page.waitForTimeout(800);
  const leftover = await page.evaluate(() => window.__game.scene.getScene('TaipeiScene').children.list.filter((o) => o.type === 'Text' && o.text === '載入中…').length);
  check('載入完成後載入條與提示被移除', leftover === 0);

  // 死亡結算畫面的提示
  await page.evaluate(() => { const g = window.__game; g.registry.get('gameState').hp = 0; const s = g.scene.getScene('TaipeiScene'); s.player.isInvincible = false; s.player._die(); });
  await page.waitForFunction(() => window.__game.scene.isActive('GameOverScene'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const deathTip = await page.evaluate(() => { const t = window.__game.scene.getScene('GameOverScene')._footerText; return t && t.text; });
  check('死亡結算畫面顯示一則提示', !!deathTip && deathTip.startsWith('提示：') && deathTip.length > 8, deathTip);
  await page.screenshot({ path: `${SP}/postgame-death-tip.png` });

  check('沒有頁面錯誤', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} 項失敗` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

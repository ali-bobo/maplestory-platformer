const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2];
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
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('__t')) { localStorage.setItem('thief-legend-tutorial-seen', '1'); } } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });

  const eq = (slot, atk, hp, mp, speed) => ({ slot, rarity: 'epic', atk, hp, mp, speed });
  // Lv15：無裝備基礎 atk=70+5*14=140, maxHp=400+20*14=680, maxMp=250+12*14=418, speed=220+28=248
  const seeded = { format: 'thief-legend-save', version: 1, savedAt: Date.now(), state: {
    level: 15, exp: 10, maxHp: 680 + 100, maxMp: 418 + 50, atk: 140 + 60, speed: 248 + 17, meso: 5000, killCount: 90,
    unlockedSkills: ['Z', 'X', 'C', 'V'], skillLevels: { Z: 4, X: 3, C: 2, V: 1, B: 0 }, currentMap: 'ruins',
    potions: { A: 6, S: 2, D: 3, R: 1, G: 1 },
    equipment: { weapon: eq('weapon', 60, 0, 0, 0), boots: eq('boots', 0, 100, 50, 17) },
  }};
  await page.goto(`http://127.0.0.1:${PORT}/__blank__`);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seeded)]);
  await page.goto(URL);
  await page.waitForTimeout(3500);
  await page.mouse.move(640, 520); await page.waitForTimeout(400); await page.mouse.click(640, 520);   // 繼續遊戲
  await page.waitForTimeout(3000);

  const info = () => page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState');
    const active = g.scene.getScenes(true).map((s) => s.sys.settings.key);
    const sc = g.scene.getScene('PerionScene');
    return { active, gs: JSON.parse(JSON.stringify(gs)), px: sc && sc.player ? sc.player.x : null };
  });
  let i = await info();
  check('繼續後在古代廢墟、穿著 2 件裝備', i.active.includes('PerionScene') && i.gs.equipment.weapon && i.gs.equipment.boots, i.active.join(','));
  check('裝備加成還在屬性上 (atk 200)', i.gs.atk === 200, 'atk=' + i.gs.atk);

  // 移動玩家到非預設位置後讓他死亡
  await page.evaluate(() => { const p = window.__game.scene.getScene('PerionScene').player; p.x = 900; });
  await page.waitForTimeout(800);
  const deathX = (await info()).px;
  await page.evaluate(() => { const g = window.__game; g.registry.get('gameState').hp = 0; g.scene.getScene('PerionScene').player._die(); });
  await page.waitForFunction(() => window.__game.scene.isActive('GameOverScene'), null, { timeout: 30000 }).catch(() => {});   // 倒地 1.5 秒（遊戲時間）後才進結算；機器忙時 FPS 低，不用固定等待
  await page.waitForTimeout(600);
  i = await info();
  check('進入結算畫面', i.active.includes('GameOverScene'), i.active.join(','));
  await page.screenshot({ path: SP + '/gameover-death.png' });
  let saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY)).state;
  check('死亡當下就把「失去裝備」寫入存檔', !saved.equipment.weapon && !saved.equipment.boots && saved.atk === 140 && saved.maxHp === 680 && saved.speed === 248,
    JSON.stringify({ atk: saved.atk, maxHp: saved.maxHp, speed: saved.speed }));
  check('存檔保留等級/金幣/擊殺/技能/藥水', saved.level === 15 && saved.meso === 5000 && saved.killCount === 90 && saved.skillLevels.X === 3 && saved.potions.A === 6);
  check('存檔地圖為死亡地圖 ruins', saved.currentMap === 'ruins');

  await page.mouse.move(510, 540); await page.waitForTimeout(400); await page.mouse.click(510, 540);   // 從死亡點重新開始
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('PerionScene'); return window.__game.scene.isActive('PerionScene') && s.player && s.player.body; }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
  i = await info();
  check('重新開始後回到古代廢墟', i.active.includes('PerionScene') && !i.active.includes('GameOverScene'), i.active.join(','));
  check('裝備為空、屬性為無裝備基礎值、HP/MP 回滿', !i.gs.equipment.weapon && i.gs.atk === 140 && i.gs.hp === 680 && i.gs.mp === 418,
    JSON.stringify({ atk: i.gs.atk, hp: i.gs.hp, mp: i.gs.mp }));
  check('在死亡點附近重生', Math.abs(i.px - deathX) < 150, `deathX=${Math.round(deathX)} px=${Math.round(i.px)}`);
  check('等級與金幣保留', i.gs.level === 15 && i.gs.meso === 5000);
  await page.screenshot({ path: SP + '/respawn.png' });

  // 死亡後關掉分頁再回來：懲罰仍然有效（不能靠重開網頁拿回裝備）
  await page.goto(`http://127.0.0.1:${PORT}/__blank__`);
  await page.goto(URL);
  await page.waitForTimeout(3500);
  await page.mouse.move(640, 520); await page.waitForTimeout(400); await page.mouse.click(640, 520);
  await page.waitForTimeout(3000);
  i = await info();
  check('重開頁面後仍沒有裝備', !i.gs.equipment.weapon && !i.gs.equipment.boots && i.gs.atk === 140);

  // 無裝備時死亡：提示文字不同，且不會壞掉
  await page.evaluate(() => { const g = window.__game; g.scene.getScene('PerionScene').player._die(); });
  await page.waitForFunction(() => window.__game.scene.isActive('GameOverScene'), null, { timeout: 30000 }).catch(() => {});   // 倒地 1.5 秒（遊戲時間）後才進結算；機器忙時 FPS 低，不用固定等待
  await page.waitForTimeout(600);
  await page.screenshot({ path: SP + '/gameover-noequip.png' });
  i = await info();
  check('無裝備死亡可正常進入結算', i.active.includes('GameOverScene'));

  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

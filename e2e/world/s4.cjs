// 階段 3：支線岔路入口（跳台 + 互動鍵）與世界地圖傳送浮層。用法：PORT=8403 node e2e/world/s4.cjs <截圖目錄>
const { launch, start, api, check, fails } = require('./lib.cjs');
const SP = process.argv[2] || '.';

(async () => {
  const { browser, page, errors } = await launch();
  const A = api(page);
  await start(page);
  const shot = (n) => page.screenshot({ path: `${SP}/${n}.png` });
  const press = A.press;

  // 讀目前玩家狀態
  const me = () => A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); const p = s.player; return { x: p.x, y: p.y, feet: p.body.bottom, ground: p.body.blocked.down || p.body.touching.down, key: s.sys.settings.key }; });

  // 用真的按鍵走到 (tx, topY)：往目標水平移動，腳比目標平台低時連續跳（可雙跳）
  async function climbTo(tx, topY, maxMs = 12000) {
    const t0 = Date.now(); let lastJump = 0; let dir = null;
    while (Date.now() - t0 < maxMs) {
      const m = await me();
      if (Math.abs(m.feet - topY) < 6 && Math.abs(m.x - tx) < 40 && m.ground) break;
      const want = m.x < tx - 8 ? 'ArrowRight' : m.x > tx + 8 ? 'ArrowLeft' : null;
      if (want !== dir) { if (dir) await page.keyboard.up(dir); if (want) await page.keyboard.down(want); dir = want; }
      const below = m.feet > topY + 10;
      if (below && Date.now() - lastJump > 380 && Math.abs(m.x - tx) < 260) { await page.keyboard.down('Alt'); await page.waitForTimeout(40); await page.keyboard.up('Alt'); lastJump = Date.now(); }
      await page.waitForTimeout(40);
    }
    if (dir) await page.keyboard.up(dir);
    await page.waitForTimeout(250);
    return me();
  }

  // 沿著地面從 x0 走到 x1，回傳途中是否離開過這張地圖
  async function walkGround(sceneKey, x0, x1) {
    await A.tp(x0); await page.waitForTimeout(500);
    await page.keyboard.down('ArrowRight');
    let left = false;
    for (let i = 0; i < 400; i++) {
      const m = await me();
      if (m.key !== sceneKey) { left = true; break; }
      if (m.x >= x1) break;
      await page.waitForTimeout(40);
    }
    await page.keyboard.up('ArrowRight');
    return left;
  }

  // ── 1. 森林獵場：神秘之境入口在右上角跳台 ──
  await A.ev(() => window.__setJob('thief', 20)); await page.waitForTimeout(300);
  await A.go('ForestScene', 2000);
  check('走地面 x=100 → 2380 不會誤入任何支線', !(await walkGround('ForestScene', 100, 2380)));
  await shot('forest-ground');
  await A.tp(2200, 560); await page.waitForTimeout(700);
  await A.ev(() => { window.__game.scene.getScenes(true).find((o) => o.player).player.isInvincible = true; });
  // 一路往上跳：地面 → y=400 平台 → y=240 平台 → y=180 岔路跳台
  await climbTo(2150, 400); let m = await me(); check('跳上 y=400 平台', Math.abs(m.feet - 400) < 8, JSON.stringify(m));
  await climbTo(2100, 240); m = await me(); check('跳上 y=240 平台', Math.abs(m.feet - 240) < 8, JSON.stringify(m));
  await climbTo(2290, 180); m = await me(); check('跳上岔路跳台（y=180）', Math.abs(m.feet - 180) < 8 && Math.abs(m.x - 2290) < 50, JSON.stringify(m));
  await page.waitForTimeout(900);
  check('站在金色傳送門上沒按互動鍵不會進入', (await A.scene()) === 'ForestScene');
  await shot('forest-branch');
  await A.press('f'); await page.waitForTimeout(2800);
  check('按 F → 神秘之境', (await A.scene()) === 'MysticScene', await A.scene());
  await shot('mystic-arrive');
  // 回程：神秘之境左端 → 森林獵場地面，不會自動再被吸進去
  await A.tp(30); await page.waitForTimeout(2800);
  check('神秘之境左端 → 森林獵場', (await A.scene()) === 'ForestScene');
  await page.waitForTimeout(1500);
  check('回到森林後留在森林（落在地面）', (await A.scene()) === 'ForestScene');

  // ── 2. 晨曦鎮：影之殿堂與城市特區在右上角高台 ──
  await A.go('TownScene', 900);
  check('晨曦鎮地面 x=100 → 1420 不會誤入（含史萊姆洞窟與兩個支線）', !(await walkGround('TownScene', 100, 1420)));
  await A.tp(1000, 560); await page.waitForTimeout(700);
  await A.ev(() => { window.__game.scene.getScenes(true).find((o) => o.player).player.isInvincible = true; });
  await climbTo(1250, 430); m = await me(); check('晨曦鎮：跳上 y=430 平台', Math.abs(m.feet - 430) < 8, JSON.stringify(m));
  await climbTo(1300, 320); m = await me(); check('晨曦鎮：跳上 y=320 階梯', Math.abs(m.feet - 320) < 8, JSON.stringify(m));
  await climbTo(1170, 200); m = await me(); check('晨曦鎮：跳上高台（影之殿堂入口）', Math.abs(m.feet - 200) < 8 && Math.abs(m.x - 1170) < 50, JSON.stringify(m));
  await page.waitForTimeout(800);
  check('高台上沒按 F 不會進入', (await A.scene()) === 'TownScene');
  await shot('town-branch');
  console.log('  dbg', JSON.stringify(await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); return { k: s.sys.settings.key, pressed: s._interactPressedAt, now: s.time.now, tr: s._transitioning, hints: s._branchHints.map((h) => h.hint.alpha), px: s.player.x, py: s.player.y }; })));
  await A.press('f'); await page.waitForTimeout(300);
  console.log('  dbg', JSON.stringify(await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); return { k: s.sys.settings.key, pressed: s._interactPressedAt, now: s.time.now, tr: s._transitioning, hints: s._branchHints.map((h) => h.hint.alpha), px: s.player.x, py: s.player.y }; })));
  await page.waitForTimeout(2500);
  check('按 F → 影之殿堂', (await A.scene()) === 'ShrineScene', await A.scene());
  await A.tp(30); await page.waitForTimeout(2800);
  check('殿堂左端 → 晨曦鎮', (await A.scene()) === 'TownScene');
  // 城市特區：Lv<18 擋下、Lv>=18 進入
  await A.ev(() => window.__setJob('thief', 12)); await page.waitForTimeout(300);
  await A.go('TownScene', 1200);
  await A.tp(1360, 130); await page.waitForTimeout(900);
  await A.press('f'); await page.waitForTimeout(900);
  check('Lv12 按 F 被擋下（留在晨曦鎮）', (await A.scene()) === 'TownScene');
  await A.ev(() => window.__setJob('thief', 20)); await page.waitForTimeout(300);
  await A.go('TownScene', 1200);
  await A.tp(1360, 130); await page.waitForTimeout(900);
  await A.press('f'); await page.waitForTimeout(2800);
  check('Lv20 按 F → 暗巷城', (await A.scene()) === 'AlleyScene', await A.scene());

  // ── 3. 世界地圖浮層 ──
  await A.go('ForestScene', 300);
  await A.ev(() => {
    const gs = window.__game.registry.get('gameState');
    gs.level = 20; gs.meso = 5000; gs.currentMap = 'forest';
    gs.visitedMaps = ['town', 'sky', 'forest', 'ruins', 'harbor', 'shrine'];
    // 清掉附近的怪，避免「戰鬥中」擋傳送
    const s = window.__game.scene.getScenes(true).find((o) => o.player);
    s.monsters.getChildren().slice().forEach((mm) => mm.destroy());
  });
  await page.waitForTimeout(600);
  const btn = await A.ev(() => { const u = window.__game.scene.getScene('UIScene'); const b = u._worldMapBtn.plate; return { x: b.x, y: b.y, w: b.displayWidth, h: b.displayHeight }; });
  console.log('地圖鈕', JSON.stringify(btn));
  check('右上角地圖鈕不與小地圖(1112,8)/聲音鈕(1064-1104)重疊', btn.x + btn.w / 2 < 1060 && btn.h >= 40);
  await shot('hud-topright');
  await page.mouse.click(btn.x, btn.y); await page.waitForTimeout(600);
  check('點地圖鈕開啟世界地圖', await A.ev(() => window.__game.scene.getScene('UIScene')._worldMap.isOpen));
  await shot('worldmap-open');
  const nodes = await A.ev(() => window.__game.scene.getScene('UIScene')._worldMap.nodes.map((n) => ({ key: n.key, x: n.x, y: n.y, tex: n.icon.texture ? n.icon.texture.key : 'circle' })));
  console.log(nodes.map((n) => `${n.key}:${n.tex.replace('ui_map_node_', '')}`).join(' '));
  check('節點狀態：森林=目前、古代廢墟=解鎖、黃沙=鎖定',
    nodes.find((n) => n.key === 'forest').tex === 'ui_map_node_current' && nodes.find((n) => n.key === 'ruins').tex === 'ui_map_node_unlocked' && nodes.find((n) => n.key === 'desert').tex === 'ui_map_node_locked');
  // 點鎖定的節點：選取但不能傳送
  const desert = nodes.find((n) => n.key === 'desert');
  await page.mouse.click(desert.x, desert.y); await page.waitForTimeout(250);
  await page.mouse.click(desert.x, desert.y); await page.waitForTimeout(500);
  check('鎖定的地圖點兩下也不會傳送', (await A.scene()) === 'ForestScene');
  await shot('worldmap-locked-selected');
  // 傳送到古代廢墟
  const ruins = nodes.find((n) => n.key === 'ruins');
  await page.mouse.click(ruins.x, ruins.y); await page.waitForTimeout(300);
  const info = await A.ev(() => { const o = window.__game.scene.getScene('UIScene')._worldMap; return o._infoMain.text; });
  console.log('資訊列:', info);
  check('選取後資訊列顯示名稱、等級帶與傳送費', info.includes('古代廢墟') && info.includes('Lv.9-17') && info.includes('430'), info);
  await shot('worldmap-ruins-selected');
  const meso0 = await A.ev(() => window.__game.registry.get('gameState').meso);
  await page.mouse.click(ruins.x, ruins.y); await page.waitForTimeout(3000);
  check('再點一次 → 傳送到古代廢墟', (await A.scene()) === 'RuinsScene', await A.scene());
  const meso1 = await A.ev(() => window.__game.registry.get('gameState').meso);
  check('扣傳送費 430', meso0 - meso1 === 430, `${meso0} -> ${meso1}`);
  check('傳送後存檔現在位置', (await A.gs()).currentMap === 'ruins');
  // 免費的樞紐
  await page.waitForTimeout(800);
  await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); s.monsters.getChildren().slice().forEach((mm) => mm.destroy()); });
  await page.keyboard.press('m'); await page.waitForTimeout(500);
  const t = await A.ev(() => window.__game.scene.getScene('UIScene')._worldMap.nodes.find((n) => n.key === 'town'));
  await page.mouse.click(t.x, t.y); await page.waitForTimeout(250);
  await page.mouse.click(t.x, t.y); await page.waitForTimeout(3000);
  check('按 M 開啟；晨曦鎮免費傳送', (await A.scene()) === 'TownScene' && (await A.gs()).meso === meso1, `${await A.scene()} meso ${(await A.gs()).meso}`);
  // 副本中不能傳送
  await A.ev(() => { const g = window.__game; const sc = g.scene.getScenes(true).find((o) => o.player); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('DungeonScene', { dungeonId: 'slime_cave', gameState: gs }); });
  await page.waitForTimeout(3500);
  await page.keyboard.press('m'); await page.waitForTimeout(500);
  const chk = await A.ev(() => { const o = window.__game.scene.getScene('UIScene')._worldMap; o._select('town'); o._go(); return { sc: window.__game.scene.getScenes(true).map((x) => x.sys.settings.key), info: o._infoSub.text }; });
  check('副本中傳送被拒絕', chk.sc.includes('DungeonScene') && /副本/.test(chk.info), JSON.stringify(chk));
  await shot('worldmap-in-dungeon');
  const real = errors.filter((e) => !e.includes('favicon') && !e.startsWith('console: Failed to load resource'));
  check('沒有 pageerror 與非 favicon 的載入失敗', real.length === 0, real.slice(0, 4).join(' | '));
  console.log('其餘訊息', JSON.stringify(errors));
  await browser.close();
  console.log(fails() ? 'FAILED' : 'ALL PASS');
  process.exit(fails() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

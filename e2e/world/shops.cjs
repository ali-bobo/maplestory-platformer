// 補給商店：森林 / 廢墟 / 碧濤港的商人可開啟、購買會增加藥水。用法 PORT=8413 node e2e/world/shops.cjs <截圖目錄>
const L = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await L.launch();
  await L.start(page); const A = L.api(page);
  await A.ev(() => window.__setJob('thief', 25));
  for (const [sc, x, name] of [['ForestScene', 720, '行商阿福'], ['RuinsScene', 720, '遺跡商販老莫'], ['HarborScene', 1100, '船具商阿海']]) {
    await A.go(sc, x - 120);
    await A.ev(() => { const gs = window.__game.registry.get('gameState'); gs.meso = 2000; gs.hp = gs.maxHp; });
    await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); s.monsters.getChildren().forEach((m) => m.destroy()); });
    await A.tp(x - 40, 560);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${process.argv[2] || '.'}/shop-${sc}-field.png` });
    const a0 = await A.ev(() => window.__game.registry.get('gameState').potions.A);
    await page.keyboard.down('f'); await page.waitForTimeout(250); await page.keyboard.up('f'); await page.waitForTimeout(600);
    await page.screenshot({ path: `${process.argv[2] || '.'}/shop-${sc}-ui.png` });
    const open = await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); return !!(s._npcDialog && s._npcDialog._shop); });
    L.check(name + ' shop opens', open);
    await page.mouse.click(660, 175); await page.waitForTimeout(400);
    const a1 = await A.ev(() => window.__game.registry.get('gameState').potions.A);
    L.check(name + ' buy first item adds stock', a1 > a0, a0 + '->' + a1);
    await page.keyboard.down('f'); await page.waitForTimeout(250); await page.keyboard.up('f');
  }
  console.log('ERR', errors.filter((e) => !e.includes('Failed to load')));
  await browser.close(); console.log('fails', L.fails());
})().catch((e) => { console.error(e); process.exit(1); });

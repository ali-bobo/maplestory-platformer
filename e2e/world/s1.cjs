const { launch, start, api, check, fails } = require('./lib.cjs');
const OUT = __dirname + '/shots';
(async () => {
  const { browser, page, errors } = await launch();
  await start(page);
  const A = api(page);
  const shot = (n, o = {}) => page.screenshot({ path: `${OUT}/s1-${n}.png`, ...o });

  check('起始場景是浮空島嶼', (await A.scene()) === 'MapleIslandScene');
  let gs = await A.gs();
  check('初始狀態 shards=[] towerLit=false visitedMaps=[sky]', gs.shards.length === 0 && gs.towerLit === false && gs.visitedMaps.join() === 'sky');

  // 1. 晨曦鎮：星光之塔
  await A.go('TownScene', 300);
  await shot('town');
  await A.tp(130); await page.waitForTimeout(400);
  await A.press('f'); await page.waitForTimeout(500);
  const dlg = await A.ev(() => { const d = window.__game.scene.getScene('TownScene')._npcDialog; return d ? d.msgText.text : null; });
  check('塔前按 F：顯示 0/5 進度', dlg && dlg.includes('0/5'), dlg);
  await shot('tower-0');
  await A.press('f'); await page.waitForTimeout(300);

  // 2. 等級門檻：Lv<18 擋下城市特區
  await A.tp(1200); await page.waitForTimeout(1200);
  check('Lv1 走進城市特區傳送門被擋下', (await A.scene()) === 'TownScene');
  await shot('gate-msg');
  await A.ev(() => window.__setJob('thief', 20)); await page.waitForTimeout(300);
  await A.tp(1000); await page.waitForTimeout(300); await A.tp(1200); await page.waitForTimeout(2600);
  check('Lv20 可進入城市特區（暗巷城）', (await A.scene()) === 'KerningScene');
  // 暗巷城 → 台北 → 回暗巷 → 回晨曦鎮
  await A.tp(2560 - 50); await page.waitForTimeout(2600);
  check('暗巷城右端 → 台北都會', (await A.scene()) === 'TaipeiScene');
  await A.tp(30); await page.waitForTimeout(2600);
  check('台北都會左端 → 暗巷城', (await A.scene()) === 'KerningScene');
  await A.tp(30); await page.waitForTimeout(2600);
  check('暗巷城左端 → 晨曦鎮', (await A.scene()) === 'TownScene');

  // 3. 主線走一遍：sky → henesys → ruins → harbor
  await A.go('MapleIslandScene', 300);
  const hop = async (x, expect) => { await A.tp(x); await page.waitForTimeout(2800); const sc = await A.scene(); check(`傳送門 → ${expect}`, sc === expect, sc); };
  await hop(2560 - 50, 'HenesysScene');
  await hop(2560 / 2, 'ElliniaScene');
  await hop(30, 'HenesysScene');
  await hop(2560 - 50, 'PerionScene');
  await hop(2560 - 50, 'HarborScene');
  gs = await A.gs();
  check('visitedMaps 記下走過的地圖', ['sky', 'henesys', 'ellinia', 'ruins', 'harbor', 'town', 'kerning', 'taipei'].every((k) => gs.visitedMaps.includes(k)), gs.visitedMaps.join());
  // 沒解鎖 Boss：右端傳送門不存在，站上去不會進 Boss
  await A.tp(2560 - 50); await page.waitForTimeout(1500);
  check('Boss 未解鎖：碧濤港右端沒有傳送門', (await A.scene()) === 'HarborScene');

  // 4. 碧濤港：海盜船長掉星光碎片
  await A.ev(() => { window.__setJob('thief', 22); });
  await A.tp(300); await page.waitForTimeout(500);
  const boss = () => A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const m = sc.player.enemies.getChildren().find((e) => e.active && !e.isDead && e.config.id === 'pirate_captain'); return m ? { x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, lvl: m.config.level } : null; });
  const b0 = await boss();
  await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const m = sc.player.enemies.getChildren().find((e) => e.config.id === 'pirate_captain'); window.__cap = m._respawnDef; });
  check('海盜船長存在', !!b0, JSON.stringify(b0));
  await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const m = sc.player.enemies.getChildren().find((e) => e.active && !e.isDead && e.config.id === 'pirate_captain'); sc.player.setPosition(m.x - 260, m.y); sc.player.isInvincible = true; });
  await page.waitForTimeout(400);
  await shot('captain');
  await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const m = sc.player.enemies.getChildren().find((e) => e.active && !e.isDead && e.config.id === 'pirate_captain'); m.takeDamage(999999, false); });
  await page.waitForTimeout(900);
  let shards = await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); return sc.pickups.getChildren().filter((p) => p.pickupType === 'shard').map((p) => p.pickupData); });
  check('擊殺後掉出 1 塊星光碎片（harbor）', shards.length === 1 && shards[0] === 'harbor', JSON.stringify(shards));
  await shot('shard-drop');
  await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const pk = sc.pickups.getChildren().find((p) => p.pickupType === 'shard'); sc.player.setPosition(pk.x, pk.y - 4); });
  await page.waitForTimeout(1500);
  gs = await A.gs();
  check('撿起後 gs.shards = [harbor]、稱號未變', gs.shards.join() === 'harbor' && gs.title === '星光學徒', JSON.stringify(gs.shards));
  const hud = await A.ev(() => { const ui = window.__game.scene.getScene('UIScene'); return { txt: ui._shardText.text, alphas: ui._shardIcons.map((i) => i.alpha) }; });
  check('HUD 顯示 1/5，第一顆亮起', hud.txt.includes('1/5') && hud.alphas[0] === 1 && hud.alphas[1] < 1, JSON.stringify(hud));
  await page.screenshot({ path: `${OUT}/s1-hud1.png`, clip: { x: 0, y: 560, width: 900, height: 160 } });
  // 再殺一隻（模擬重生）：已取得就不再掉
  await A.ev(() => { const sc = window.__game.scene.getScene('HarborScene'); const def = window.__cap; const m = sc._spawnMonsterOn(def, sc._spawnPlatforms[0]); m.takeDamage(999999, false); });
  await page.waitForTimeout(900);
  shards = await A.ev(() => window.__game.scene.getScene('HarborScene').pickups.getChildren().filter((p) => p.pickupType === 'shard').length);
  check('第二次擊殺不再掉碎片', shards === 0, String(shards));
  gs = await A.gs();
  check('shards 仍只有 1 塊', gs.shards.length === 1);

  // 5. 星光之塔：1/5 → 5/5 點亮
  await A.go('TownScene', 300);
  await A.tp(130); await page.waitForTimeout(400);
  await A.press('f'); await page.waitForTimeout(500);
  let d2 = await A.ev(() => window.__game.scene.getScene('TownScene')._npcDialog.msgText.text);
  check('塔前顯示 1/5', d2.includes('1/5') && d2.includes('★ 海盜船長'), d2);
  await shot('tower-1');
  await A.press('f'); await page.waitForTimeout(300);
  await A.ev(() => { const gs = window.__game.registry.get('gameState'); for (const id of ['desert', 'snow', 'lava', 'castle']) gs.shards.push(id); gs.title = '星光守護者・星光學徒'; window.__game.registry.events.emit('changedata-shards', null, 5); });
  await page.waitForTimeout(300);
  check('集滿未點亮：bossUnlocked 仍為 false', !(await A.gs()).bossUnlocked);
  await shot('tower-ready', { clip: { x: 0, y: 560, width: 900, height: 160 } });
  await A.press('f'); await page.waitForTimeout(250);
  await shot('tower-celebrate-a');
  await page.waitForTimeout(700);
  await shot('tower-celebrate-b');
  await page.waitForTimeout(1500);
  gs = await A.gs();
  check('點亮後 towerLit && bossUnlocked', gs.towerLit && gs.bossUnlocked);
  await shot('tower-lit');
  await page.screenshot({ path: `${OUT}/s1-hud5.png`, clip: { x: 0, y: 560, width: 900, height: 160 } });
  const hud5 = await A.ev(() => window.__game.scene.getScene('UIScene')._shardText.text + '|' + window.__game.scene.getScene('UIScene')._classText.text);
  check('HUD：Boss 解鎖字樣與星光守護者稱號', hud5.includes('Boss 已解鎖') && hud5.includes('星光守護者'), hud5);

  // 6. Boss 傳送門在碧濤港（階段 1 暫放）出現
  await A.go('HarborScene', 2200);
  await A.tp(2560 - 50); await page.waitForTimeout(2800);
  check('解鎖後碧濤港右端傳送門 → 暗影領域', (await A.scene()) === 'BossScene');

  console.log('ERRORS', errors.filter((e) => !e.includes('Failed to load resource')));
  await browser.close();
  console.log('fails', fails());
})().catch((e) => { console.error(e); process.exit(1); });

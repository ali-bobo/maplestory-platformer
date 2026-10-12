const { launch, start, api, check, fails } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await launch();
  await start(page);
  const A = api(page);
  await A.ev(() => window.__setJob('thief', 40));
  await A.go('HarborScene', 300);
  // player.isInvincible 只是受擊後 800 ms 的無敵幀，腳本設的 true 會被清掉；沙漠 / 熔岩 / 王城的怪、守護者的新攻擊與熔岩地面
  // 會一路把血打光，死亡就換場景，後面讀 s.pickups 才會讀到已銷毀的群組（原本的 entries 錯誤）。所以整段用計時器持續補滿血
  await A.ev(() => { clearInterval(window.__keep); window.__keep = setInterval(() => { const gs = window.__game.registry.get('gameState'); if (gs && gs.hp > 0) gs.hp = gs.maxHp; }, 80); });
  const hop = async (x, e) => { await A.tp(x); await page.waitForTimeout(2800); const s = await A.scene(); check('portal -> ' + e, s === e, s); };
  await hop(2510, 'DesertScene'); await hop(2510, 'SnowScene'); await hop(2510, 'LavaScene'); await hop(2510, 'CastleScene');
  await A.tp(2510); await page.waitForTimeout(1500); check('castle boss portal hidden when locked', (await A.scene()) === 'CastleScene');
  await page.screenshot({ path: 'shots/s3-castle.png' });
  // each guardian: kill -> shard once
  for (const [sc, id, shard] of [['DesertScene', 'sandworm_boss', 'desert'], ['SnowScene', 'frost_giant', 'snow'], ['LavaScene', 'lava_dragon', 'lava'], ['CastleScene', 'fallen_commander', 'castle']]) {
    await A.go(sc, 300);
    await A.ev(([sc, id]) => { const s = window.__game.scene.getScene(sc); const m = s.monsters.getChildren().find((e) => e.config.id === id); s.player.setPosition(Math.min(2300, Math.max(300, m.x > 1300 ? m.x - 300 : m.x + 300)), 560); s.player.isInvincible = true; m.takeDamage(1e7, false); }, [sc, id]);
    await page.waitForTimeout(1200);
    await A.ev((sc) => { const s = window.__game.scene.getScene(sc); const pk = s.pickups.getChildren().find((p) => p.pickupType === 'shard'); if (pk) s.player.setPosition(Math.min(2400, Math.max(200, pk.x)), pk.y); }, sc);
    await page.waitForTimeout(1500);
    const g = await A.gs();
    check(sc + ' shard ' + shard, g.shards.includes(shard), g.shards.join());
  }
  // modifiers
  await A.go('SnowScene', 300);
  await A.ev(() => { const s = window.__game.scene.getScene('SnowScene'); s.player.setPosition(500, 560); });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(150);
  const vx = await A.ev(() => window.__game.scene.getScene('SnowScene').player.body.velocity.x);
  check('ice slide: still moving after release', Math.abs(vx) > 20, String(vx));
  await A.go('DesertScene', 300);
  await A.ev(() => { const s = window.__game.scene.getScene('DesertScene'); s.player.setPosition(1000, 560); });
  await page.waitForTimeout(800); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250);
  const v2 = await A.ev(() => { const s = window.__game.scene.getScene('DesertScene'); return [s.player.body.velocity.x, s.player.gameState.speed]; });
  await page.keyboard.up('ArrowRight');
  check('quicksand slows 40%', Math.abs(v2[0] - v2[1] * 0.6) < 5, JSON.stringify(v2));
  await A.go('LavaScene', 300);
  await A.ev(() => { clearInterval(window.__keep); const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; });   // 熔岩地面扣血測試：停止補血
  const hp0 = await A.ev(() => { const s = window.__game.scene.getScene('LavaScene'); s.player.isInvincible = false; s.player.setPosition(1000, 560); s.player.body.setVelocity(0, 0); return s.player.gameState.hp; });
  await page.waitForTimeout(6500);
  const hp1 = await A.ev(() => window.__game.scene.getScene('LavaScene').player.gameState.hp);
  check('lava floor damages', hp1 < hp0, hp0 + '->' + hp1);
  await page.screenshot({ path: 'shots/s3-lava.png' });
  console.log('ERR', errors.filter((e) => !e.includes('Failed to load resource')));
  await browser.close(); console.log('fails', fails());
})().catch((e) => { console.error(e); process.exit(1); });

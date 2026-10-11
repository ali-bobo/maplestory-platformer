const { launch, start, api, check, fails } = require('./lib.cjs');
const OUT = __dirname + '/shots';
(async () => {
  const { browser, page, errors } = await launch();
  await start(page);
  const A = api(page);
  await A.ev(() => window.__setJob('thief', 30));
  for (const [scene, key, lv] of [['DesertScene', 'desert', 24], ['SnowScene', 'snow', 28], ['LavaScene', 'lava', 33], ['CastleScene', 'castle', 38]]) {
    await A.ev((lv) => window.__setJob('thief', lv), lv);
    await A.go(scene, 400);
    check(`${key} 進入場景`, (await A.scene()) === scene);
    const info = await A.ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); return { n: s.monsters.getChildren().length, ids: [...new Set(s.monsters.getChildren().map((m) => m.config.id))], mod: s._modifier && s._modifier.constructor.name, bg: s.textures.exists(s.mapData.bgImage) }; });
    console.log(key, JSON.stringify(info));
    await page.screenshot({ path: `${OUT}/s2-${key}-a.png` });
    await A.tp(1300, 560); await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/s2-${key}-b.png` });
  }
  console.log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

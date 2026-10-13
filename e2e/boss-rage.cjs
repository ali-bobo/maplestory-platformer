// Boss 狂暴姿勢 e2e：第 3 階段起待機 / 移動 / 攻擊都換成 boss_rage_*。用法：PORT=8471 node e2e/boss-rage.cjs [截圖目錄]
const fs = require('fs');
const { launch, start, api, check, fails } = require('./world/lib.cjs');
const OUT = process.argv[2] || '/tmp/rage-shots';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const { browser, page, errors } = await launch();
  await start(page);
  const a = api(page);
  await a.go('BossScene', 100);
  await page.waitForFunction(() => window.__game.scene.getScene('BossScene')._boss, null, { timeout: 40000 });
  const r = await page.evaluate(async () => {
    const sc = window.__game.scene.getScene('BossScene'), b = sc._boss, gs = window.__game.registry.get('gameState');
    gs.hp = gs.maxHp = 99999; sc.player.isInvincible = true;
    const out = { tex: ['boss_rage_idle', 'boss_rage_move', 'boss_rage_attack'].map((k) => sc.textures.exists(k)) };
    await new Promise((r) => setTimeout(r, 1500));
    out.before = b.texture.key;
    b.hp = b.maxHp * 0.25; b.takeDamage(1);
    out.phase = b.phase; out.rage = b._rage;
    await new Promise((r) => setTimeout(r, 600));   // 讓切換瞬間仍在播的舊姿勢結束
    const seen = new Set();
    let untinted = 0;
    for (let i = 0; i < 100; i++) { await new Promise((r) => setTimeout(r, 100)); seen.add(b.texture.key); if (!b.isTinted) untinted++; }
    out.untinted = untinted;
    out.seen = [...seen];
    return out;
  });
  check('三張狂暴貼圖已載入', r.tex.every(Boolean), JSON.stringify(r.tex));
  check('第 3 階段前使用一般姿勢', /^boss_(idle|move|attack)$/.test(r.before), r.before);
  check('進入第 3 階段後標記狂暴', r.phase === 3 && r.rage === true, JSON.stringify({ phase: r.phase, rage: r.rage }));
  check('狂暴階段只用 boss_rage_* 姿勢', r.seen.length > 0 && r.seen.every((k) => /^boss_rage_/.test(k) || /^boss_death/.test(k)), r.seen.join(','));
  check('狂暴階段多數時間沒有疊紅色染色（預警閃爍除外）', r.untinted >= 30, `untinted=${r.untinted}/100`);
  await page.screenshot({ path: `${OUT}/boss-rage.png` });
  const real = errors.filter((e) => !/Failed to load resource.*404/.test(e));   // 瀏覽器自動要 favicon.ico 的 404
  check('頁面沒有錯誤', real.length === 0, real.slice(0, 5).join(' | '));
  await browser.close();
  console.log(fails() ? `FAILED ${fails()}` : 'ALL PASS');
  process.exit(fails() ? 1 : 0);
})();

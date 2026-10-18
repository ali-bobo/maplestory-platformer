// 盜賊徽章 e2e：在兩張地圖把角色瞬移到徽章上，檢查計數、浮字、立即存檔；重新整理後讀檔仍在、
// 已撿的徽章不再出現；跨過 10 枚門檻時金幣獎勵只發一次；任務日誌與世界地圖顯示進度。
// 用法：PORT=8133 node e2e/badges.cjs /tmp/shots
const fs = require('fs');
const { launch, start, api, check, fails } = require('./world/lib.cjs');
const SP = process.argv[2] || '.';
const KEY = 'thief-legend-save-v1';

(async () => {
  fs.mkdirSync(SP, { recursive: true });
  const { browser, page, errors } = await launch();
  const a = api(page);
  const savedBadges = () => page.evaluate((k) => { const r = localStorage.getItem(k); return r ? JSON.parse(r).state.badges : null; }, KEY);
  const field = () => page.evaluate(() => {
    const s = window.__game.scene.getScenes(true).find((o) => o.player);
    return s && s._badgeField ? s._badgeField.remaining().map((b) => b.id) : [];
  });
  const badgeDef = (id) => page.evaluate((i) => {
    const s = window.__game.scene.getScenes(true).find((o) => o.player);
    return s && s._badgeField ? s._badgeField.remaining().find((b) => b.id === i) || null : null;
  }, id);
  // 持續補血、怪物不追，避免測到一半被打死
  const calm = () => page.evaluate(() => {
    const s = window.__game.scene.getScenes(true).find((o) => o.player);
    const gs = window.__game.registry.get('gameState');
    gs.hp = gs.maxHp;
    for (const m of s.monsters.getChildren()) { m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; }
  });
  // 瞬移到徽章正中央並停住（重力會讓角色往下掉，但碰觸判定在下一幀就成立）
  const touch = async (id) => {
    const b = await badgeDef(id);
    if (!b) return false;
    await calm();
    await a.tp(b.x, b.y);
    await page.waitForTimeout(700);
    return true;
  };

  await start(page);
  check('新遊戲在浮空島嶼', (await a.scene()) === 'MapleIslandScene');
  check('浮空島嶼有 3 枚徽章', JSON.stringify(await field()) === JSON.stringify(['sky_1', 'sky_2', 'sky_3']), JSON.stringify(await field()));

  // 截圖：站在徽章旁（左上草地平台），看得到徽章的浮動與光暈
  await calm();
  await a.tp(520, 180);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SP}/badge-sky.png` });

  // 1. 浮空島嶼：撿 sky_1
  check('瞬移到 sky_1', await touch('sky_1'));
  let gs = await a.gs();
  check('撿到 sky_1：計數 1', gs.badges.length === 1 && gs.badges[0] === 'sky_1', JSON.stringify(gs.badges));
  check('撿到後畫面上不再有 sky_1', !(await field()).includes('sky_1'));
  check('浮字顯示「盜賊徽章 1/30」', await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true).find((o) => o.player);
    return s.children.list.some((o) => o.type === 'Text' && o.text === '盜賊徽章 1/30');
  }));
  check('立即存檔（不等 30 秒自動存檔）', JSON.stringify(await savedBadges()) === '["sky_1"]', JSON.stringify(await savedBadges()));
  check('再碰同一個位置不會重複計數', (await a.tp(400, 140), await page.waitForTimeout(500), (await a.gs()).badges.length === 1));

  // 2. 森林獵場：撿 henesys_2
  await a.go('HenesysScene', 300);
  check('進入森林獵場', (await a.scene()) === 'HenesysScene');
  check('瞬移到 henesys_2', await touch('henesys_2'));
  gs = await a.gs();
  check('撿到 henesys_2：計數 2', gs.badges.length === 2 && gs.badges.includes('henesys_2'), JSON.stringify(gs.badges));
  check('存檔裡有 2 枚', (await savedBadges() || []).length === 2);

  // 3. 重新整理 → 繼續遊戲：徽章還在，森林獵場的 henesys_2 不再出現
  await page.reload();
  await page.waitForTimeout(6000);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 });
  await page.waitForTimeout(1500);
  gs = await a.gs();
  check('讀檔後落在森林獵場', (await a.scene()) === 'HenesysScene', await a.scene());
  check('讀檔後徽章仍是 2 枚', JSON.stringify(gs.badges) === '["sky_1","henesys_2"]', JSON.stringify(gs.badges));
  check('讀檔後 henesys_2 不再出現、另外兩枚還在', JSON.stringify(await field()) === '["henesys_1","henesys_3"]', JSON.stringify(await field()));

  // 4. 跨過 10 枚門檻：先把存檔補到 9 枚（別張圖的），再撿 henesys_1 → 金幣 +2000、只發一次
  await page.evaluate(() => {
    const gs = window.__game.registry.get('gameState');
    gs.badges = ['sky_1', 'henesys_2', 'ruins_1', 'ruins_2', 'harbor_1', 'harbor_2', 'harbor_3', 'desert_1', 'desert_2'];
  });
  const mesoBefore = (await a.gs()).meso;
  check('瞬移到 henesys_1', await touch('henesys_1'));
  gs = await a.gs();
  check('第 10 枚：金幣 +2000、已領門檻 [10]', gs.meso === mesoBefore + 2000 && JSON.stringify(gs.badgeRewards) === '[10]',
    JSON.stringify({ meso: gs.meso, before: mesoBefore, rw: gs.badgeRewards }));
  await page.screenshot({ path: `${SP}/badge-reward.png` });
  check('瞬移到 henesys_3', await touch('henesys_3'));
  gs = await a.gs();
  check('第 11 枚不再發 10 枚獎勵', gs.meso === mesoBefore + 2000 && gs.badges.length === 11, JSON.stringify({ meso: gs.meso, n: gs.badges.length }));

  // 5. 任務日誌與世界地圖顯示徽章進度
  await page.waitForTimeout(3000);
  await page.keyboard.press('j');
  await page.waitForTimeout(800);
  const uiTexts = () => page.evaluate(() => {
    const ui = window.__game.scene.getScene('UIScene');
    return ui.children.list.filter((o) => o.type === 'Text' && o.visible).map((o) => o.text);
  });
  let texts = await uiTexts();
  check('任務日誌標題列有「盜賊徽章 11/30」', texts.includes('盜賊徽章 11/30'), texts.filter((t) => t.includes('徽章')).join(' | '));
  await page.screenshot({ path: `${SP}/badge-questlog.png` });
  // 翻到最後一頁：每張地圖的收集數與獎勵
  await page.mouse.move(640, 300);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(250); }
  texts = await uiTexts();
  check('任務日誌列出每張地圖的進度與已領獎勵', texts.some((t) => t.includes('森林獵場 3/3') && t.includes('浮空島嶼 1/3'))
    && texts.some((t) => t.includes('收集 10 枚') && t.includes('已領取')), texts.filter((t) => t.includes('3/3') || t.includes('枚')).join(' | '));
  await page.screenshot({ path: `${SP}/badge-questlog-last.png` });
  await page.keyboard.press('j');
  await page.waitForTimeout(500);
  await page.keyboard.press('m');
  await page.waitForTimeout(800);
  texts = await uiTexts();
  check('世界地圖有總數與本圖進度', texts.includes('盜賊徽章 11/30') && texts.some((t) => t.includes('森林獵場') && t.includes('徽章 3/3')),
    texts.filter((t) => t.includes('徽章')).join(' | '));
  await page.screenshot({ path: `${SP}/badge-worldmap.png` });
  await page.keyboard.press('m');
  await page.waitForTimeout(500);

  // 6. 暗角地圖（魔君王城）：徽章在玩家視野內要看得到
  await a.go('CastleScene', 300);
  check('魔君王城有 2 枚徽章', JSON.stringify(await field()) === '["castle_1","castle_2"]', JSON.stringify(await field()));
  await calm();
  await a.tp(2400, 200);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SP}/badge-castle.png` });

  // 瀏覽器自動要 /favicon.ico（專案沒有）造成的 404 不算
  const real = errors.filter((e) => !e.includes('favicon.ico'));
  const http404 = real.some((e) => e.startsWith('http 4'));
  const pageErrors = real.filter((e) => http404 || !e.includes('Failed to load resource'));
  check('沒有頁面錯誤', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
  await browser.close();
  console.log(fails() === 0 ? 'ALL PASS' : `${fails()} FAIL`);
  process.exit(fails() === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

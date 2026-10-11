// 轉職任務鏈 e2e（真實流程：對話 → 選職業 → 收集 → 副本 → 覺醒）。用法：node e2e-quest.cjs <截圖目錄>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const SPDIR = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const BASE = `http://127.0.0.1:${process.env.PORT || 8231}/index.html?debug=1`;

async function flow(browser, choice) {   // choice: 'assassin' | 'bandit'
  const label = choice;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto(BASE); await page.waitForTimeout(7000);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 }); await page.waitForTimeout(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = (n) => page.screenshot({ path: `${SPDIR}/quest-${label}-${n}.png` });
  const gsq = () => ev(() => { const gs = window.__game.registry.get('gameState'); return { job: gs.job, level: gs.level, choice: gs.jobChoice, active: gs.quests.active.map((q) => q.id + ':' + q.progress), done: gs.quests.completed, sp: gs.skillPoints, title: gs.title }; });
  const activeScene = () => ev(() => { const s = window.__game.scene.getScenes(true).find((x) => x.player); return s ? s.sys.settings.key : null; });
  const press = async (key, ms = 80) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
  const tp = (x) => ev((x) => { const s = window.__game.scene.getScenes(true).find((o) => o.player); const p = s.player; p.setPosition(x, p.y); p.body.setVelocity(0, 0); p.isInvincible = true; }, x);

  // Lv.10 的盜賊進入晨曦鎮
  await ev(() => window.__setJob('thief', 10));
  await ev(() => { const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('TownScene', { gameState: gs, spawnX: 700 }); });
  await page.waitForTimeout(2500);
  check(`[${label}] 進入晨曦鎮`, (await activeScene()) === 'TownScene');

  // 影之殿堂在晨曦鎮右上角高台的金色傳送門（x=1170, y=200），要站上去按 F；殿堂裡的試煉傳送門在沒接任務時進不去
  await ev(() => { const s = window.__game.scene.getScenes(true).find((o) => o.player); s.player.setPosition(1170, 130); s.player.body.setVelocity(0, 0); s.player.isInvincible = true; });
  await page.waitForTimeout(900); await press('f'); await page.waitForTimeout(2800);
  check(`[${label}] 晨曦鎮傳送門 → 影之殿堂`, (await activeScene()) === 'ShrineScene');
  await tp(1150); await page.waitForTimeout(1200);
  check(`[${label}] 沒接任務時影之試煉傳送門被擋下`, (await activeScene()) === 'ShrineScene');
  await ev(() => { const g = window.__game; const sc = g.scene.getScene('ShrineScene'); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('TownScene', { gameState: gs, spawnX: 700 }); });
  await page.waitForTimeout(2500);

  // 1. 城鎮居民：先 reach_town，再 job_call
  await tp(1000); await page.waitForTimeout(300);
  await press('f'); await page.waitForTimeout(300); await press('f'); await page.waitForTimeout(200);   // 開 + 關
  let q = await gsq();
  check(`[${label}] 第一次對話：接到並完成「初訪晨曦鎮」`, q.done.includes('reach_town'), JSON.stringify(q.done));
  await press('f'); await page.waitForTimeout(300); await shot('1-letter'); await press('f'); await page.waitForTimeout(200);
  q = await gsq();
  check(`[${label}] 第二次對話：接到「影之召喚」`, q.active.some((a) => a.startsWith('job_call')), JSON.stringify(q));

  // 2. 影之長老（在影之殿堂）：完成影之召喚，接到選擇你的道路，對話出現兩個選項
  await ev(() => { const g = window.__game; const sc = g.scene.getScene('TownScene'); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('ShrineScene', { gameState: gs, spawnX: 700 }); });
  await page.waitForTimeout(2500);
  await tp(780); await page.waitForTimeout(300);
  await press('f'); await page.waitForTimeout(500);
  q = await gsq();
  check(`[${label}] 影之召喚完成、選擇你的道路進行中`, q.done.includes('job_call') && q.active.some((a) => a.startsWith('job_choose')), JSON.stringify(q));
  const dlg = await ev(() => { const s = window.__game.scene.getScene('ShrineScene'); const d = s._npcDialog; return d ? { n: d.extras.length, text: d.msgText.text } : null; });
  check(`[${label}] 對話出現 2 個選項（4 個物件：按鈕 + 文字）`, dlg && dlg.n === 4, JSON.stringify(dlg));
  await shot('2-choices');
  // 選職業：assassin 用滑鼠點第一顆按鈕，bandit 用按鍵 2
  if (choice === 'assassin') {
    const pos = await ev(() => { const s = window.__game.scene.getScene('ShrineScene'); const b = s._npcDialog.extras[0]; const cam = s.cameras.main; return { x: (b.x - cam.scrollX) * cam.zoom, y: (b.y - cam.scrollY) * cam.zoom }; });
    await page.mouse.move(pos.x, pos.y); await page.waitForTimeout(200); await page.mouse.click(pos.x, pos.y);
  } else {
    await press('2');
  }
  await page.waitForTimeout(600);
  q = await gsq();
  check(`[${label}] 選擇職業 → jobChoice=${choice}、選擇你的道路完成`, q.choice === choice && q.done.includes('job_choose'), JSON.stringify(q));
  await shot('3-after-choice');
  await press('f'); await page.waitForTimeout(200);   // 關閉對話
  await press('f'); await page.waitForTimeout(300);   // 再按：接到試煉之證
  q = await gsq();
  check(`[${label}] 接到「試煉之證」`, q.active.some((a) => a.startsWith('job_proof')), JSON.stringify(q));
  await press('f'); await page.waitForTimeout(100);

  // 3. 收集：到浮空島嶼打怪（掉落率拉到 100%，走真實擊殺 → 掉落 → 撿取流程）
  await ev(() => { window.__QUESTS.job_proof.collect.dropRate = 1; });
  await ev(() => { const g = window.__game; const sc = g.scene.getScene('TownScene'); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('MapleIslandScene', { gameState: gs, spawnX: 300 }); });
  await page.waitForTimeout(2500);
  check(`[${label}] 到達浮空島嶼`, (await activeScene()) === 'MapleIslandScene');
  for (let i = 0; i < 40; i++) {
    const prog = await ev(() => { const a = window.__game.registry.get('gameState').quests.active.find((x) => x.id === 'job_proof'); return a ? a.progress : 99; });
    if (prog >= 5 || prog === 99) break;
    await ev(() => {
      const sc = window.__game.scene.getScene('MapleIslandScene'); const p = sc.player; p.isInvincible = true;
      const m = p.enemies.getChildren().find((e) => e.active && !e.isDead);
      if (m) { m.takeDamage(999999, false); }
      for (const pk of sc.pickups.getChildren()) if (pk.pickupType === 'quest') { p.setPosition(pk.x, pk.y); break; }
    });
    await page.waitForTimeout(700);
    await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); const p = sc.player; for (const pk of sc.pickups.getChildren()) if (pk.pickupType === 'quest') { p.setPosition(pk.x, pk.y - 5); } });
    await page.waitForTimeout(300);
  }
  q = await gsq();
  check(`[${label}] 收集 5 個試煉之證 → 試煉之證完成`, q.done.includes('job_proof'), JSON.stringify(q));

  // 4. 回晨曦鎮接影之試煉，進傳送門，擊敗守衛
  await ev(() => { const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const gs = g.registry.get('gameState'); sc.scene.stop('UIScene'); sc.scene.start('ShrineScene', { gameState: gs, spawnX: 700 }); });
  await page.waitForTimeout(2500);
  await tp(780); await page.waitForTimeout(300);
  await press('f'); await page.waitForTimeout(400);
  q = await gsq();
  check(`[${label}] 接到「影之試煉」`, q.active.some((a) => a.startsWith('job_trial')), JSON.stringify(q));
  await shot('4-trial-dialog');
  await press('f'); await page.waitForTimeout(200);
  await tp(1150); await page.waitForTimeout(2800);
  check(`[${label}] 進入影之試煉副本`, (await activeScene()) === 'DungeonScene');
  await page.waitForTimeout(1500);
  const guardian = await ev(() => { const sc = window.__game.scene.getScene('DungeonScene'); const ms = sc.monsters.getChildren(); return { n: ms.length, ids: ms.map((m) => m.config.id) }; });
  check(`[${label}] 副本有試煉守衛 + 2 隻影子史萊姆`, guardian.ids.includes('shadow_guardian') && guardian.n === 3, JSON.stringify(guardian));
  await shot('5-trial');
  await ev(() => { const sc = window.__game.scene.getScene('DungeonScene'); sc.player.isInvincible = true; for (const m of sc.monsters.getChildren()) if (m.active && !m.isDead) m.takeDamage(999999, false); });
  await page.waitForTimeout(3500);
  q = await gsq();
  check(`[${label}] 擊敗守衛 → 影之試煉完成`, q.done.includes('job_trial'), JSON.stringify(q));
  await ev(() => { window.__game.scene.getScene('DungeonScene').exitDungeon(); });
  await page.waitForTimeout(2500);
  check(`[${label}] 回到影之殿堂`, (await activeScene()) === 'ShrineScene');

  // 5. 覺醒
  const before = await gsq();
  await tp(780); await page.waitForTimeout(300);
  await press('f'); await page.waitForTimeout(500);
  await shot('6-awaken-fx');
  await page.waitForTimeout(900);
  q = await gsq();
  check(`[${label}] 覺醒 → 職業 ${choice}、稱號、SP 獎勵`, q.job === choice && q.title === (choice === 'assassin' ? '暗夜之刃' : '赤焰劫客') && q.sp >= before.sp + 5, JSON.stringify(q));
  const vis = await ev(() => { const g = window.__game; const sc = g.scene.getScene('ShrineScene'); const u = g.scene.getScene('UIScene'); return { tex: sc.player.texture.key, cls: u._classText.text, portrait: u._portrait.texture.key, slots: g.registry.get('gameState').skillSlots }; });
  check(`[${label}] 外觀與 HUD 已切換`, vis.tex.startsWith(`player_${choice}_`) && vis.portrait === `portrait_${choice}` && vis.cls.includes(choice === 'assassin' ? '刺客' : '俠盜'), JSON.stringify(vis));
  await page.waitForTimeout(1500);
  await shot('7-awakened');
  const saved = await ev(() => JSON.parse(localStorage.getItem('thief-legend-save-v1')));
  check(`[${label}] 自動存檔含新職業與任務完成`, saved.state.job === choice && saved.state.quests.completed.includes('job_awaken'), JSON.stringify(saved.state.job));

  // 覺醒當下開著的對話內容
  const after = await ev(() => { const d = window.__game.scene.getScene('ShrineScene')._npcDialog; return d ? d.msgText.text : null; });
  check(`[${label}] 覺醒後開著的長老對話已是轉職後的內容`, after && after.includes(choice === 'assassin' ? '暗夜之刃' : '赤焰劫客'), after);
  await press('f'); await page.waitForTimeout(200);

  // 重新載入後職業保留
  await page.reload(); await page.waitForTimeout(4000);
  await page.keyboard.press('Enter'); await page.waitForTimeout(4500);
  const rel = await gsq();
  check(`[${label}] 重新載入後職業保留`, rel.job === choice && rel.done.includes('job_awaken'), JSON.stringify(rel));

  check(`[${label}] 沒有頁面錯誤`, errors.length === 0, JSON.stringify(errors));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  await flow(browser, 'assassin');
  await flow(browser, 'bandit');
  console.log(fails === 0 ? 'ALL PASS' : `FAILS: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('E2E CRASH', e); process.exit(2); });

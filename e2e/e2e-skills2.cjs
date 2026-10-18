const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SPDIR = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?debug=1`); await page.waitForTimeout(7000);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 }); await page.waitForTimeout(1500);
  const gsInfo = () => page.evaluate(() => { const g = window.__game; const gs = g.registry.get('gameState'); const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player;
    return { cd: { ...gs.skillCooldowns }, mp: gs.mp, maxMp: gs.maxMp, slots: gs.skillSlots, vy: p.body.velocity.y, onGround: p.body.blocked.down, level: gs.level }; });

  // 1. 空白鍵 = 近戰普攻：不耗 MP、進入 ATK 冷卻、命中面前敵人
  await page.evaluate(() => { const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player; const m = p.enemies.getChildren()[0]; window.__m = m; m.setPosition(p.x + 50, p.y); m.body && m.body.setVelocity(0, 0); m.hp = m.maxHp = 99999;
    // 讓靶站著不動、不出手（新怪物 AI 會追擊 / 後退 / 衝撞，離開普攻範圍）；保留 Monster.update 本體
    m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; m.jumpCooldown = 1e9; m._steerJumpCd = 1e9; });
  await page.waitForTimeout(200);
  const hp0 = await page.evaluate(() => window.__m.hp);
  const s0 = await gsInfo();
  // 普攻的判定在按下後 80 ms（遊戲時間）才出手；無頭瀏覽器只有約 8~10 FPS，固定等 250 ms 偶爾讀在判定之前，
  // 所以按住到遊戲跑過 2 幀再放開，並輪詢最多 2 秒等命中
  await page.keyboard.down('Space');
  const f0 = await page.evaluate(() => window.__game.loop.frame);
  await page.waitForFunction((f0) => window.__game.loop.frame >= f0 + 2, f0, { polling: 20, timeout: 3000 });
  const s1 = await gsInfo(); await page.keyboard.up('Space');
  await page.waitForFunction((hp0) => window.__m.hp < hp0, hp0, { polling: 30, timeout: 2000 }).catch(() => {});
  const hp1 = await page.evaluate(() => window.__m.hp);
  check('空白鍵施放普通攻擊（ATK 冷卻開始）', s1.cd.ATK > 0, 'cdATK=' + s1.cd.ATK);
  check('普通攻擊不耗 MP', s1.mp >= s0.mp, `mp ${s0.mp} → ${s1.mp}`);
  check('普通攻擊命中面前的怪', hp1 < hp0, `hp ${hp0} → ${hp1}`);
  await page.screenshot({ path: SPDIR + '/slash.png' });
  // 敵人在身後 → 打不到
  await page.waitForTimeout(600);
  await page.evaluate(() => { const p = window.__game.scene.getScene('MapleIslandScene').player; window.__m.setPosition(p.x - 80, p.y); });
  const hp2 = await page.evaluate(() => window.__m.hp);
  await page.keyboard.down('Space'); await page.waitForTimeout(250); await page.keyboard.up('Space'); await page.waitForTimeout(600);   // 多等一下，確定那一下的判定已經過了
  check('身後的怪不會被打到', (await page.evaluate(() => window.__m.hp)) === hp2);

  // 2. Z = 三連飛鏢技能：耗 MP 10
  await page.waitForTimeout(600);
  const z0 = await gsInfo();
  await page.keyboard.down('z'); await page.waitForTimeout(250); const z1 = await gsInfo(); await page.keyboard.up('z');
  check('Z 施放三連飛鏢：冷卻開始', z1.cd.Z > 0, 'cdZ=' + z1.cd.Z);
  check('Z 耗 10 MP（含回魔誤差）', z0.mp - z1.mp >= 6 && z0.mp - z1.mp < 12, `mp ${z0.mp} → ${z1.mp}`);
  check('技能欄預設 Z X C V', JSON.stringify(z1.slots) === '["Z","X","C","V"]', JSON.stringify(z1.slots));

  // 3. 方向鍵上 = 跳躍
  // 固定按 100 ms 再讀速度，在約 10 FPS 的無頭瀏覽器常常讀在跳躍那一幀之前（vy=0）：
  // 先等站穩，再按住並輪詢最多 1.5 秒看有沒有起跳
  await page.waitForTimeout(600);
  const onGround = () => page.evaluate(() => window.__game.scene.getScene('MapleIslandScene').player.body.blocked.down);
  await page.waitForFunction(() => window.__game.scene.getScene('MapleIslandScene').player.body.blocked.down, null, { polling: 30, timeout: 2000 }).catch(() => {});
  const grounded = await onGround();
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__game.scene.getScene('MapleIslandScene').player.body.velocity.y < -100, null, { polling: 20, timeout: 1500 }).catch(() => {});
  const j = await gsInfo(); await page.keyboard.up('ArrowUp');
  check('按「↑」跳躍（垂直速度向上）', j.vy < -100, 'vy=' + j.vy + (grounded ? '' : '（按下前不在地面）'));

  // 4. 技能欄：未全解鎖時拖曳被擋下
  const pos = (k) => page.evaluate((k) => { const u = window.__game.scene.getScene('UIScene'); const d = u._cdOverlays[k]; return { x: d.sx + d.slotW / 2, y: d.sy + d.slotW / 2 }; }, k);
  let px = await pos('Z'), pc = await pos('X');
  await page.mouse.move(px.x, px.y); await page.mouse.down(); await page.mouse.move(pc.x, pc.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
  check('等級不足時拖曳不會調整順序', JSON.stringify((await gsInfo()).slots) === '["Z","X","C","V"]');
  await page.screenshot({ path: SPDIR + '/skills-locked.png' });

  // 5. 全部解鎖後：拖 Z 欄到 X 欄 → 交換；按 Z 鍵施放暗影步伐
  await page.evaluate(() => { const g = window.__game; const gs = g.registry.get('gameState'); gs.level = 20; gs.unlockedSkills = ['Z', 'X', 'C', 'V', 'B']; gs.skillLevels = { Z: 1, X: 1, C: 1, V: 1, B: 1 }; gs.mp = gs.maxMp = 999; gs.skillCooldowns = { ATK: 0, Z: 0, X: 0, C: 0, V: 0, B: 0 }; g.registry.set('gameState', gs); });
  await page.waitForTimeout(400);
  await page.mouse.move(px.x, px.y); await page.mouse.down(); await page.mouse.move(pc.x, pc.y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(400);
  const sw = await gsInfo();
  check('全部解鎖後拖曳 → 兩個技能欄位交換', JSON.stringify(sw.slots) === '["X","Z","C","V"]', JSON.stringify(sw.slots));
  await page.keyboard.down('z'); await page.waitForTimeout(220); const cz = await gsInfo(); await page.keyboard.up('z');
  check('按 Z 鍵施放的是被換到 Z 欄的暗影步伐（X）', cz.cd.X > 0 && !(cz.cd.Z > 0), JSON.stringify({ X: cz.cd.X, Z: cz.cd.Z }));
  // 換入第 5 個技能（B）到 V 欄
  await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); u._equipToSlot('V', 'B'); });
  check('換入 B 到 V 欄', JSON.stringify((await gsInfo()).slots) === '["X","Z","C","B"]', JSON.stringify((await gsInfo()).slots));
  // 技能視窗不報錯
  await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); u._equipPick = 'V'; u._openPopup('skills'); });
  await page.waitForTimeout(300); await page.screenshot({ path: SPDIR + '/skills-popup.png' });
  await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); u._closePopup(); });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('thief-legend-save-v1') || '{}'));
  check('欄位寫入存檔', !!saved.state && JSON.stringify(saved.state.skillSlots) === '["X","Z","C","B"]', JSON.stringify(saved.state && saved.state.skillSlots));

  // 5. 聲音按鈕（右上）：靜音 / 取消靜音
  const hud = await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); return { x: u._soundBtn.bg.x, y: u._soundBtn.bg.y }; });
  await page.mouse.move(hud.x, hud.y); await page.waitForTimeout(200); await page.mouse.click(hud.x, hud.y); await page.waitForTimeout(500);
  check('點聲音按鈕 → 靜音並記住', await page.evaluate(() => localStorage.getItem('thief-legend-sound') === 'off'));
  await page.screenshot({ path: SPDIR + '/sound-off.png' });
  await page.mouse.click(hud.x, hud.y); await page.waitForTimeout(300);
  check('再點一次 → 恢復', await page.evaluate(() => localStorage.getItem('thief-legend-sound') === 'on'));

  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

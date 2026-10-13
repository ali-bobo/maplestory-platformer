// 戰鬥手感 e2e：輸入緩衝（跳 / 攻擊 / 技能）與土狼時間。用法：PORT=8437 node e2e/e2e-feel.cjs [截圖目錄]
// 無頭瀏覽器只有約 7 FPS（一幀 150 ms，比 120 ms 的緩衝窗還長），真實時間按鍵無法穩定落在窗內。
// 所以這支腳本先讓主迴圈休眠，改用 game.step(time, 16.7) 手動以 60 FPS 的虛擬時間推進，
// 並以 window 的 KeyboardEvent 餵給 Phaser 鍵盤（走真正的輸入路徑），結果完全可重現。
const PORT = process.env.PORT || 8123;
const { chromium } = require('/opt/node-tools/node_modules/playwright');
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?debug=1`); await page.waitForTimeout(7000);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 });
  await page.waitForTimeout(1500);

  // 在頁面內建立虛擬時鐘與按鍵工具
  await page.evaluate(() => {
    const g = window.__game; g.loop.sleep();
    const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player; const gs = g.registry.get('gameState');
    let t = performance.now();
    const KC = { up: ['ArrowUp', 38], space: ['Space', 32], z: ['KeyZ', 90] };
    const ev = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { code: KC[k][0], key: KC[k][0], keyCode: KC[k][1], which: KC[k][1], bubbles: true }));
    window.__T = {
      sc, p, gs,
      step(n = 1) { for (let i = 0; i < n; i++) { t += 16.7; g.step(t, 16.7); } },
      tap(k) { ev('keydown', k); this.step(1); ev('keyup', k); },   // 按下那一幀 JustDown 成立，下一幀放開
      ms(ms) { this.step(Math.round(ms / 16.7)); },
      // 暫時關掉玩家的所有碰撞器 = 走離平台邊緣的效果
      cut() { this.cols = sc.physics.world.colliders.getActive().filter((c) => c.object1 === p || c.object2 === p); this.cols.forEach((c) => (c.active = false)); },
      restore() { (this.cols || []).forEach((c) => (c.active = true)); this.cols = []; },
      reset() {
        this.restore(); gs.hp = gs.maxHp = 9999; gs.mp = gs.maxMp = 999; p.isInvincible = true; gs.skillCooldowns = { ATK: 0 };
        for (const m of p.enemies.getChildren()) { m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; m.jumpCooldown = 1e9; m._steerJumpCd = 1e9; m.setPosition(-5000, -5000); }
        p.setPosition(600, 560); p.body.setVelocity(0, 0); this.ms(800);
      },
    };
  });
  const T = (fn, arg) => page.evaluate(fn, arg);
  const grounded = await T(() => { const { p } = window.__T; window.__T.reset(); return p.body.blocked.down; });
  check('虛擬時鐘就緒：玩家站在地面', grounded === true);

  // ── 1. 土狼時間 ──
  const base = await T(() => { const { p } = window.__T; window.__T.reset(); window.__T.tap('up'); window.__T.ms(40); return { jl: p.jumpsLeft, vy: p.body.velocity.y }; });
  check('基準：地面起跳後剩 1 次跳躍', base.jl === 1 && base.vy < -300, JSON.stringify(base));

  const coy = await T(() => {
    const T = window.__T; const { p } = T; T.reset();
    T.cut(); T.ms(50);                                 // 走離邊緣 50 ms：已在空中
    const air = !p.body.blocked.down;
    T.tap('up'); T.ms(16);
    const r = { air, jl: p.jumpsLeft, vy: p.body.velocity.y };
    T.restore(); return r;
  });
  check('離邊 50 ms 內按跳：視為地面跳（起跳、仍剩 1 次空中跳）', coy.air && coy.vy < -300 && coy.jl === 1, JSON.stringify(coy));

  const late = await T(() => {
    const T = window.__T; const { p } = T; T.reset();
    T.cut(); T.ms(200);                                // 離邊 200 ms：土狼時間已過
    T.tap('up'); T.ms(16);
    const r = { jl: p.jumpsLeft, vy: p.body.velocity.y };
    T.restore(); return r;
  });
  check('離邊 200 ms 後按跳：地面那一跳已失效（只剩空中跳，起跳後 0 次）', late.jl === 0 && late.vy < -300, JSON.stringify(late));

  const noInf = await T(() => {
    const T = window.__T; const { p } = T; T.reset();
    T.tap('up'); T.ms(16); T.tap('up'); T.ms(16); T.tap('up'); T.ms(16);   // 地面跳 + 二段跳 + 第三下（不應再跳）
    const r = { jl: p.jumpsLeft }; return r;
  });
  check('起跳後土狼時間作廢：不能靠它三連跳', noInf.jl === 0, JSON.stringify(noInf));

  // ── 2. 跳躍緩衝 ──
  const jb = await T(() => {
    const T = window.__T; const { p } = T; T.reset();
    p.setPosition(600, 300); T.step(2);                // 先離地兩幀（setPosition 後 blocked.down 要一幀才更新）
    p.jumpsLeft = 0; p.setPosition(600, 600 - 22); p.body.setVelocity(0, 300);   // 空中、無跳躍次數、即將落地（約 70 ms）
    T.step(1);
    const before = { air: !p.body.blocked.down, jl: p.jumpsLeft };
    T.tap('up');                                       // 落地前按跳
    let minVy = 0; for (let i = 0; i < 30; i++) { T.step(1); minVy = Math.min(minVy, p.body.velocity.y); }
    return { before, minVy, jl: p.jumpsLeft };
  });
  check('落地前提前按跳：落地後自動起跳（連跳）', jb.before.air && jb.before.jl === 0 && jb.minVy < -400 && jb.jl === 1, JSON.stringify(jb));

  const jbFar = await T(() => {
    const T = window.__T; const { p } = T; T.reset();
    p.setPosition(600, 300); T.step(2);
    p.jumpsLeft = 0; p.setPosition(600, 600 - 160); p.body.setVelocity(0, 0); T.step(1);   // 還要約 0.5 秒才落地
    T.tap('up');
    let minVy = 0; for (let i = 0; i < 60; i++) { T.step(1); minVy = Math.min(minVy, p.body.velocity.y); }
    return { minVy, jl: p.jumpsLeft, ground: p.body.blocked.down };
  });
  check('太早按跳（超過 120 ms）：不會被記住', jbFar.minVy > -50 && jbFar.jl === 2 && jbFar.ground, JSON.stringify(jbFar));

  // ── 3. 攻擊緩衝 ──
  const atk = await T(() => {
    const T = window.__T; const { p, gs } = T; T.reset();
    let casts = 0; const orig = p.basicAttack.bind(p); p.basicAttack = () => { if ((gs.skillCooldowns.ATK || 0) <= 0) casts++; orig(); };
    T.tap('space'); T.step(1);
    const first = casts;
    while (gs.skillCooldowns.ATK > 0.08) T.step(1);    // 冷卻只剩 ~80 ms
    const cdAtPress = gs.skillCooldowns.ATK;
    T.tap('space');                                    // 攻擊尚在冷卻時再按
    const during = casts;
    T.ms(150);
    const r = { first, during, after: casts, cdAtPress, cdNow: gs.skillCooldowns.ATK };
    p.basicAttack = orig; return r;
  });
  check('攻擊冷卻最後 ~80 ms 內再按：冷卻一結束自動接上下一刀', atk.first === 1 && atk.during === 1 && atk.after === 2, JSON.stringify(atk));
  check('銜接的第二刀重新進入冷卻（沒有無視冷卻）', atk.cdNow > 0, JSON.stringify(atk));

  const atkEarly = await T(() => {
    const T = window.__T; const { p, gs } = T; T.reset();
    let casts = 0; const orig = p.basicAttack.bind(p); p.basicAttack = () => { if ((gs.skillCooldowns.ATK || 0) <= 0) casts++; orig(); };
    T.tap('space'); T.step(1);
    T.ms(50); T.tap('space');                          // 冷卻還有 ~350 ms，遠超過緩衝窗
    T.ms(250);
    const r = { casts, cd: gs.skillCooldowns.ATK }; p.basicAttack = orig; return r;
  });
  check('冷卻剩餘遠大於 120 ms 時按下：不會被記住', atkEarly.casts === 1, JSON.stringify(atkEarly));

  // ── 4. 技能緩衝：不多扣 MP、不無視冷卻 ──
  const sk = await T(() => {
    const T = window.__T; const { gs } = T; T.reset();
    gs.mp = 100;
    T.tap('z'); T.step(1);
    const mp1 = gs.mp;
    while (gs.skillCooldowns.Z > 0.08) T.step(1);
    T.tap('z');                                        // 冷卻剩 ~80 ms 時再按
    const mpAtPress = gs.mp;
    T.ms(150);
    return { mp1, mpAtPress, mp2: gs.mp, cd: gs.skillCooldowns.Z };
  });
  check('Z 技能：第一次扣 10 MP', 100 - sk.mp1 >= 9 && 100 - sk.mp1 <= 11, JSON.stringify(sk));
  check('Z 技能：冷卻中的按鍵不立即扣 MP', sk.mpAtPress >= sk.mp1 - 1, JSON.stringify(sk));
  check('Z 技能：緩衝補放只多扣一次 10 MP 並重新進入冷卻', sk.mpAtPress - sk.mp2 >= 8 && sk.mpAtPress - sk.mp2 <= 11 && sk.cd > 0, JSON.stringify(sk));

  const skSpam = await T(() => {
    const T = window.__T; const { gs } = T; T.reset();
    gs.mp = 100;
    T.tap('z'); T.step(1);
    const mp1 = gs.mp;
    for (let i = 0; i < 6; i++) { T.tap('z'); T.step(1); }   // 冷卻中連按（約 200 ms，都遠早於窗外或僅最後一次有效）
    T.ms(100);
    return { used: mp1 - gs.mp, cd: gs.skillCooldowns.Z };
  });
  check('冷卻中連按不會連扣：最多補放一次', skSpam.used <= 11, JSON.stringify(skSpam));

  const skNoMp = await T(() => {
    const T = window.__T; const { gs } = T; T.reset();
    gs.mp = 12;
    T.tap('z'); T.step(1);
    while (gs.skillCooldowns.Z > 0.08) T.step(1);
    gs.mp = 0;                                         // 排隊期間 MP 被花光
    T.tap('z'); T.ms(150);
    return { mp: gs.mp, cd: gs.skillCooldowns.Z };
  });
  check('排隊的技能遇到 MP 不足：丟棄，MP 不為負、不進冷卻', skNoMp.mp >= 0 && skNoMp.mp < 10 && skNoMp.cd === 0, JSON.stringify(skNoMp));

  await T(() => { window.__T.restore(); window.__game.loop.wake(); });
  check('頁面沒有未捕捉錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

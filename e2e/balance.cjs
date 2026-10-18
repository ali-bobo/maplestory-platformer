// 技能平衡實測：每個職業、每個技能對靜止的高血量靶施放數次，量「實際造成的傷害 / 攻擊力 / MP」，並斷言設計意圖。
// 用法：PORT=8403 node e2e/balance.cjs   （atk 固定 100，暴擊 20% / ×1.8，所有技能 1 級）
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8403;
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto(BASE); await page.waitForTimeout(7000);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 });
  await page.waitForTimeout(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // 擺 n 隻靜止靶（hp 極高、AI 關閉），回傳靶數。
  // 注意（之前中途崩潰的原因）：
  //  1. 只用 setPosition 搬怪，Arcade body 要到下一個物理步才跟上；headless 約 10 FPS，搬完馬上施放時 body 還留在舊位置。
  //     暗殺用 body.center 找最近敵人、卻用 sprite.x 算「背後」：舊版把多餘的怪 setPosition(-5000) 停到畫面外，
  //     牠的 body 還在玩家身邊 → 被選成目標 → 瞬移點夾到地圖左緣 x=40，剛好踩上通往村莊的傳送門 → 換場景、所有怪被 destroy。
  //     所以搬怪一律用 body.reset（sprite 與 body 同步），多餘的怪直接停用（不顯示、不參與碰撞、不會被技能選中）。
  //  2. 量測原點固定在地面上離傳送門最遠的位置，不沿用玩家「目前」位置（瞬移 / 擊退會讓原點越漂越靠近地圖邊緣）。
  const setup = (n) => ev((n) => {
    const g = window.__game; const sc = g.scene.getScenes(true).find((x) => x.player); const p = sc.player; const gs = g.registry.get('gameState');
    if (!window.__balScene) window.__balScene = sc.scene.key;
    if (sc.scene.key !== window.__balScene) throw new Error(`場景從 ${window.__balScene} 換成 ${sc.scene.key}（玩家被傳送或死亡）`);
    if (!window.__anchor) {
      const ground = sc.mapData.platforms.find((pl) => pl.isGround) || sc.mapData.platforms[0];
      const portalXs = sc.portals.getChildren().map((o) => o.x);
      const W = sc.physics.world.bounds.width;
      let best = W / 2, bestD = -1;
      for (let x = 300; x <= W - 300; x += 20) {
        const d = portalXs.length ? Math.min(...portalXs.map((px) => Math.abs(px - x))) : W;
        if (d > bestD) { bestD = d; best = x; }
      }
      window.__anchor = { x: best, y: ground.y };
    }
    window.__px = window.__anchor.x; window.__py = window.__anchor.y;
    p.setPosition(window.__px, window.__py); p.body.reset(window.__px, window.__py);
    const all = p.enemies.getChildren();
    window.__ms = all.slice(0, n);
    for (const o of all.slice(n)) {   // 其他怪停用（不 destroy，下一次還要用）
      o.update = () => {}; o.hp = o.maxHp = 1e9; o._mark = null; o._poison = null;
      o.setActive(false).setVisible(false); if (o.body) { o.body.reset(o.x, o.y); o.body.enable = false; }
    }
    window.__ms.forEach((m, i) => {
      m.update = () => {}; m.setActive(true).setVisible(true); m.body.enable = true;
      m.body.reset(window.__px + 70 + i * 28, window.__py);
      m.hp = m.maxHp = 1e9; m._mark = null; m._poison = null;
    });
    gs.atk = 100; gs.critRate = 0.2; gs.critMulti = 1.8; gs.hp = gs.maxHp = 9999; gs.mp = gs.maxMp = 9999; p.isInvincible = true;
    return window.__ms.length;
  }, n);
  const lost = () => ev(() => window.__ms.reduce((a, m) => a + (m.maxHp - m.hp), 0));
  const reset = () => ev(() => {
    const g = window.__game; const sc = g.scene.getScenes(true).find((x) => x.player); const p = sc.player; const gs = g.registry.get('gameState');
    for (const k of Object.keys(gs.skillCooldowns)) gs.skillCooldowns[k] = 0;
    if (sc.scene.key !== window.__balScene) throw new Error(`場景從 ${window.__balScene} 換成 ${sc.scene.key}（玩家被傳送或死亡）`);
    if (window.__ms.some((m) => !m.active || !m.body)) throw new Error('靶被移除了（body 消失）');
    gs.mp = gs.maxMp; gs.hp = gs.maxHp; p.facingRight = true; p.setFlipX(false); p.isInvincible = true;
    // 瞬移類技能會把玩家帶走：每次施放前回到原位、靶回到身前（body.reset：sprite 與 body 立刻同步、速度歸零）
    p.setPosition(window.__px, window.__py); p.body.reset(window.__px, window.__py);
    window.__ms.forEach((m, i) => { m.body.reset(window.__px + 70 + i * 28, window.__py); m._poison = null; m._mark = null; });
  });
  const mpOf = () => ev(() => window.__game.registry.get('gameState').mp);

  // 對 n 隻靶連放 casts 次技能（每次等 windowMs 讓持續傷害結算），回傳 { perCast(倍攻擊力), mp }
  async function measure(skillId, n, casts, windowMs) {
    await setup(n);
    let total = 0; let mpUsed = 0;
    for (let i = 0; i < casts; i++) {
      await reset();
      const hp0 = await lost(); const mp0 = await mpOf();
      const mp1 = await ev((id) => {
        const sc = window.__game.scene.getScenes(true).find((x) => x.player);
        sc.player.castSkill(id);
        return window.__game.registry.get('gameState').mp;   // 施放當下的 MP（還沒被自然回復或妙手空空回補）
      }, skillId);
      await page.waitForTimeout(windowMs);
      total += (await lost()) - hp0; mpUsed += mp0 - mp1;
    }
    return { perCast: total / casts / 100, mp: mpUsed / casts };
  }
  async function measureBasic(casts) {
    await setup(1);
    let total = 0; const t0 = Date.now();
    for (let i = 0; i < casts; i++) {
      await reset(); const hp0 = await lost();
      await ev(() => window.__game.scene.getScenes(true).find((x) => x.player).player.basicAttack());
      await page.waitForTimeout(520);
      total += (await lost()) - hp0;
    }
    return total / casts / 100;
  }

  const setJob = (job, lv) => ev(({ job, lv }) => {
    const ok = window.__setJob(job, lv);
    const gs = window.__game.registry.get('gameState');
    for (const k of Object.keys(gs.skillLevels)) if (gs.unlockedSkills.includes(k)) gs.skillLevels[k] = 1;
    return ok;
  }, { job, lv });

  const LONG = new Set(['poison', 'B', 'smoke']);
  const result = {};
  const POOL = { thief: ['Z', 'X', 'C', 'V', 'B'], assassin: ['Z', 'X', 'C', 'backstab', 'poison', 'mark'], bandit: ['X', 'V', 'B', 'whirl', 'steal', 'smoke'] };
  const LV = { thief: 25, assassin: 30, bandit: 30 };
  for (const job of ['thief', 'assassin', 'bandit']) {
    check(`__setJob(${job})`, await setJob(job, LV[job]));
    await page.waitForTimeout(1500);
    result[job] = { skills: {} };
    result[job].basic = await measureBasic(24);
    console.log(`\n== ${job} Lv${LV[job]} ==  basic attack: ${result[job].basic.toFixed(2)} x atk per swing`);
    console.log('skill      mp   1 target (x atk)  per MP   3 targets  per MP');
    for (const id of POOL[job]) {
      if (id === 'mark') continue;   // 下面單獨量
      const win = LONG.has(id) ? (id === 'B' ? 13000 : 8000) : 2200;
      const casts = LONG.has(id) ? 3 : 8;
      const one = await measure(id, 1, id === 'B' ? 1 : casts, win);
      const three = ['X', 'V', 'whirl', 'smoke'].includes(id) ? await measure(id, 3, casts, win) : null;
      result[job].skills[id] = { mp: one.mp, one: one.perCast, three: three && three.perCast };
      console.log(`${id.padEnd(9)} ${String(Math.round(one.mp)).padStart(4)}  ${one.perCast.toFixed(2).padStart(10)}  ${(one.perCast / Math.max(1, one.mp)).toFixed(3).padStart(8)}  ${three ? three.perCast.toFixed(2).padStart(9) : '        -'}  ${three ? (three.perCast / Math.max(1, one.mp)).toFixed(3) : ''}`);
    }
    if (job === 'assassin') {
      // 斷命印記：對照有 / 無印記時 8 下普通攻擊的總傷害
      const base = await measureBasic(24);
      await setup(1);
        let marked = 0;
      for (let i = 0; i < 16; i++) {
        await reset(); const hp0 = await lost();
        await ev(() => window.__game.scene.getScenes(true).find((x) => x.player).player.castSkill('mark'));   // reset 會清掉印記，每下重標
        await page.waitForTimeout(300);
        const h1 = await lost();
        await ev(() => window.__game.scene.getScenes(true).find((x) => x.player).player.basicAttack());
        await page.waitForTimeout(520);
        marked += (await lost()) - h1;
      }
      result.assassin.markRatio = marked / 16 / 100 / base;
      console.log(`mark       50  basic swing with mark ${(marked / 16 / 100).toFixed(2)} vs ${base.toFixed(2)} without  (x${result.assassin.markRatio.toFixed(2)})`);
    }
  }

  // ── 設計意圖斷言（實測，容許隨機暴擊的誤差）──
  const A = result.assassin, B = result.bandit, T = result.thief;
  check('刺客普攻 > 盜賊普攻 ×1.2', A.basic > T.basic * 1.2, `${A.basic.toFixed(2)} vs ${T.basic.toFixed(2)}`);
  check('俠盜普攻 > 盜賊普攻 ×1.15', B.basic > T.basic * 1.15, `${B.basic.toFixed(2)} vs ${T.basic.toFixed(2)}`);
  const pm = (r, id, key = 'one') => r.skills[id][key] / Math.max(1, r.skills[id].mp);
  check('瞬影連刺 每 MP > 暗殺', pm(A, 'backstab') > pm(A, 'C'), `${pm(A, 'backstab').toFixed(3)} vs ${pm(A, 'C').toFixed(3)}`);
  check('蝕心毒鏢 每 MP ≈ 或高於暗殺（單體，實測有暴擊雜訊，容許 -20%；持續疊毒更高）', pm(A, 'poison') > pm(A, 'C') * 0.8, `${pm(A, 'poison').toFixed(3)} vs ${pm(A, 'C').toFixed(3)}`);
  check('斷命印記：印記期間普攻傷害 ≥ 1.2 倍（存下的 25% 在斷命時才釋放）', A.markRatio >= 1.2, 'x' + A.markRatio.toFixed(2));
  check('赤月迴旋 打 3 隻每 MP > 暗影漩渦', pm(B, 'whirl', 'three') > pm(B, 'V', 'three'), `${pm(B, 'whirl', 'three').toFixed(3)} vs ${pm(B, 'V', 'three').toFixed(3)}`);
  check('妙手空空 MP 成本 24（命中另回 10，見 damageModel 單元測試）', Math.abs(B.skills.steal.mp - 24) < 1.5, 'mp ' + B.skills.steal.mp.toFixed(1));
  check('迷煙彈 有實際傷害（打 3 隻 > 3 倍攻擊力）', B.skills.smoke.three > 3, B.skills.smoke.three.toFixed(2));
  check('沒有 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

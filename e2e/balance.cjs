// 技能平衡實測：每個職業、每個技能對靜止的高血量靶施放數次，量「實際造成的傷害 / 攻擊力 / MP」，並斷言設計意圖。
// 用法：PORT=8403 node e2e/balance.cjs   （atk 固定 100，暴擊 20% / ×1.8，所有技能 1 級）
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8403;
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
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

  // 讓怪物不動：不能把 m.update 換成空函式（擊退 / 擊飛計時與煙霧偵測都在 Monster.update 裡），改成關掉追擊 / 攻擊 / 跳躍
  // 並刪掉上一段可能加在實例上的函式樁（見 e2e/README.md「穩定性筆記」）
  const FREEZE = `(m) => {
    delete m.update; delete m.applyKnockback; delete m.takeDamage;
    m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; m.jumpCooldown = 1e9; m._steerJumpCd = 1e9;
  }`;
  // 擺 n 隻靜止靶（hp 極高、AI 關閉），回傳靶數
  const setup = (n) => ev(({ n, FREEZE }) => {
    const freeze = eval(FREEZE);
    const g = window.__game; const sc = g.scene.getScenes(true).find((x) => x.player); const p = sc.player; const gs = g.registry.get('gameState');
    // 根因 1：技能（暗影步伐 / 瞬影連刺…）會把玩家帶進傳送門，場景換成別張地圖，之前拿到的靶全被 shutdown 銷毀 → body 消失。
    // 量測期間鎖住傳送門（_transitioning 是傳送門的重入鎖），並記下場景以便偵測被換掉。
    sc._transitioning = true; window.__scKey = sc.scene.key;
    const all = p.enemies.getChildren().filter((o) => o.active && !o.isDead);
    window.__ms = all.slice(0, n);
    for (const o of all.slice(n)) { freeze(o); o.setPosition(-5000, 0); o.body.setAllowGravity(false); o.body.setVelocity(0, 0); o.hp = o.maxHp = 1e9; }   // 其他怪停到畫面外（不 destroy，下一次還要用）
    window.__ms.forEach((m, i) => {
      freeze(m); m.setPosition(p.x + (window.__off ?? 70) + i * 28, p.y); m.body.setVelocity(0, 0);
      m.hp = m.maxHp = 1e9; m._mark = null; m._poison = null;
    });
    gs.atk = 100; gs.critRate = 0.2; gs.critMulti = 1.8; gs.hp = gs.maxHp = 9999; gs.mp = gs.maxMp = 9999; p.isInvincible = true;
    return window.__ms.length;
  }, { n, FREEZE });
  const lost = () => ev(() => window.__ms.reduce((a, m) => a + (m.maxHp - m.hp), 0));
  // 根因 3：出手與命中之間有 scene.time.delayedCall（遊戲時間，命中停頓 / 機器忙時會拖延）。固定 sleep 會讓遲到的命中漏進下一下
  // 的量測，或在靶被 reset 搬走後落空，造成 0 / 雙倍的雜訊。改成「至少等 minMs，之後傷害 quietMs 內不再變動」才結算。
  // 機器忙時一幀可能拖很久，所以「靜止」要同時滿足：真實時間 quietMs 沒變 + 遊戲時間（scene.time.now）至少又走了 gameQuietMs。
  async function settle(minMs, quietMs = 450, capMs = 8000, gameQuietMs = 400) {
    const t0 = Date.now(); await page.waitForTimeout(minMs);
    const snap = () => ev(() => { const sc = window.__game.scene.getScenes(true).find((x) => x.player); return [window.__ms.reduce((a, m) => a + (m.maxHp - m.hp), 0), sc.time.now]; });
    let [last, gLast] = await snap(); let since = Date.now();
    while (Date.now() - t0 < capMs) {
      await page.waitForTimeout(80);
      const [cur, g] = await snap();
      if (cur !== last) { last = cur; since = Date.now(); gLast = g; } else if (Date.now() - since >= quietMs && g - gLast >= gameQuietMs) break;
    }
    return last;
  }
  const reset = () => ev(() => {
    const g = window.__game; const sc = g.scene.getScenes(true).find((x) => x.player); const p = sc.player; const gs = g.registry.get('gameState');
    // 根因 2 的防線：場景被換掉或靶被銷毀 / 打死時直接報出原因，不要讓後面丟 'setVelocity' of undefined
    if (!sc || sc.scene.key !== window.__scKey) throw new Error('場景被換掉：' + window.__scKey + ' -> ' + (sc && sc.scene.key));
    const bad = window.__ms.findIndex((m) => !m.active || m.isDead || !m.body);
    if (bad >= 0) throw new Error('靶 #' + bad + ' 已被銷毀 / 打死（hp ' + window.__ms[bad].hp + '）');
    for (const k of Object.keys(gs.skillCooldowns)) gs.skillCooldowns[k] = 0;
    gs.mp = gs.maxMp; p.facingRight = true; p.setFlipX(false); p.isInvincible = true;
    // 瞬移類技能會把玩家帶走：每次施放前回到原位、靶回到身前
    p.setPosition(window.__px, window.__py); p.body.reset(window.__px, window.__py);
    window.__ms.forEach((m, i) => { m.setPosition(window.__px + (window.__off ?? 70) + i * 28, window.__py); m.body.setVelocity(0, 0); m._poison = null; m._mark = null; m._kbTimer = 0; m._kbVx = 0; });
  });

  // 對 n 隻靶連放 casts 次技能（每次等 windowMs 讓持續傷害結算），回傳 { perCast(倍攻擊力), mp }
  async function measure(skillId, n, casts, windowMs) {
    await setup(n);
    await ev(() => { const p = window.__game.scene.getScenes(true).find((x) => x.player).player; window.__px = p.x; window.__py = p.y; });
    let total = 0; let mpUsed = 0; let refused = 0;
    for (let i = 0; i < casts; i++) {
      await reset();
      const hp0 = await lost();
      // MP 前後在同一次 evaluate 內讀（跨呼叫之間遊戲迴圈會把 mp 夾回真正的上限、自然回復，量到的成本會飄）
      const { mp0, mp1 } = await ev((id) => {
        const sc = window.__game.scene.getScenes(true).find((x) => x.player);
        const gs = window.__game.registry.get('gameState');
        const mp0 = gs.mp;
        sc.player.castSkill(id);
        return { mp0, mp1: gs.mp };   // 施放當下的 MP（還沒被自然回復或妙手空空回補）
      }, skillId);
      // 持續傷害（毒 / 煙 / 分身）要等滿 windowMs；其餘出手後等命中靜止
      if (LONG.has(skillId)) await page.waitForTimeout(windowMs); else await settle(300);
      // 沒真的施放（範圍內沒有目標 → 退還 MP 與冷卻）不算一次：重放，最多重放 casts 次，超過就報錯
      if (mp0 - mp1 === 0) { if (++refused > casts) throw new Error(skillId + ' 連續沒有施放成功（沒目標？）'); i--; continue; }
      total += (await lost()) - hp0; mpUsed += mp0 - mp1;
    }
    return { perCast: total / casts / 100, mp: mpUsed / casts };
  }
  async function measureBasic(casts) {
    // 普攻貼身打（40 px）：第一下的擊退會把靶推開，離得遠時刺客第二下常落在範圍外，量到的不是設計的「兩下都中」
    await ev(() => { window.__off = 40; });
    await setup(1);
    await ev(() => { const p = window.__game.scene.getScenes(true).find((x) => x.player).player; window.__px = p.x; window.__py = p.y; });
    let total = 0; const t0 = Date.now();
    for (let i = 0; i < casts; i++) {
      await reset(); const hp0 = await lost();
      // 連擊（彎刀橫斬）視窗 900 ms，機器忙時兩下之間會超過：每下前把時間戳更新到現在（視窗本身由單元測試 comboStep 涵蓋）
      await ev(() => { const sc = window.__game.scene.getScenes(true).find((x) => x.player); if (sc.player._combo) sc.player._combo.last = sc.time.now; sc.player.basicAttack(); });
      total += (await settle(300)) - hp0;
    }
    await ev(() => { window.__off = 70; });
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
      await ev(() => { const p = window.__game.scene.getScenes(true).find((x) => x.player).player; window.__px = p.x; window.__py = p.y; });
      let marked = 0;
      for (let i = 0; i < 16; i++) {
        await reset(); const hp0 = await lost();
        await ev(() => window.__game.scene.getScenes(true).find((x) => x.player).player.castSkill('mark'));   // reset 會清掉印記，每下重標
        const h1 = await settle(300);
        await ev(() => window.__game.scene.getScenes(true).find((x) => x.player).player.basicAttack());
        marked += (await settle(300)) - h1;
      }
      result.assassin.markRatio = marked / 16 / 100 / base;
      console.log(`mark       50  basic swing with mark ${(marked / 16 / 100).toFixed(2)} vs ${base.toFixed(2)} without  (x${result.assassin.markRatio.toFixed(2)})`);
    }
  }

  // ── 設計意圖斷言（實測，容許隨機暴擊的誤差）──
  const A = result.assassin, B = result.bandit, T = result.thief;
  // 普攻 DPS 量級（設計值見 SKILLS_DESIGN 8.3：刺客 4.00 / 俠盜 3.71 / 盜賊 2.61；每下 / 冷卻秒；誤差容許 ±20%，來自隨機暴擊）
  const dps = { assassin: A.basic / 0.4, bandit: B.basic / 0.45, thief: T.basic / 0.4 };
  for (const [j, want] of [['assassin', 4.0], ['bandit', 3.71], ['thief', 2.61]]) {
    check(`${j} 普攻 DPS ≈ ${want}（±20%）`, Math.abs(dps[j] - want) <= want * 0.2, dps[j].toFixed(2));
  }
  check('刺客普攻 > 盜賊普攻 ×1.2', A.basic > T.basic * 1.2, `${A.basic.toFixed(2)} vs ${T.basic.toFixed(2)}`);
  check('俠盜普攻 > 盜賊普攻 ×1.15', B.basic > T.basic * 1.15, `${B.basic.toFixed(2)} vs ${T.basic.toFixed(2)}`);
  const pm = (r, id, key = 'one') => r.skills[id][key] / Math.max(1, r.skills[id].mp);
  check('瞬影連刺 每 MP > 暗殺', pm(A, 'backstab') > pm(A, 'C'), `${pm(A, 'backstab').toFixed(3)} vs ${pm(A, 'C').toFixed(3)}`);
  check('蝕心毒鏢 每 MP ≈ 或高於暗殺（單體，實測有暴擊雜訊，容許 -20%；持續疊毒更高）', pm(A, 'poison') > pm(A, 'C') * 0.8, `${pm(A, 'poison').toFixed(3)} vs ${pm(A, 'C').toFixed(3)}`);
  check('斷命印記：印記期間普攻傷害 ≥ 1.4 倍', A.markRatio >= 1.4, 'x' + A.markRatio.toFixed(2));
  check('赤月迴旋 打 3 隻每 MP > 暗影漩渦', pm(B, 'whirl', 'three') > pm(B, 'V', 'three'), `${pm(B, 'whirl', 'three').toFixed(3)} vs ${pm(B, 'V', 'three').toFixed(3)}`);
  check('妙手空空 MP 成本 24（命中另回 10，見 damageModel 單元測試）', Math.abs(B.skills.steal.mp - 24) < 1.5, 'mp ' + B.skills.steal.mp.toFixed(1));
  check('迷煙彈 有實際傷害（打 3 隻 > 3 倍攻擊力）', B.skills.smoke.three > 3, B.skills.smoke.three.toFixed(2));
  check('沒有 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

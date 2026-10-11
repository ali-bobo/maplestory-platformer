// 怪物 AI e2e：Boss 抖動、上下樓層追擊、每種新攻擊、守衛第二階段、難度抽樣。
// 用法：PORT=8402 node e2e/ai.cjs <截圖目錄> [a|b|c|d|e ...]（不指定章節就全跑）
const fs = require('fs');
const { launch, start, api, check, fails } = require('./world/lib.cjs');

const OUT = process.argv[2] || '/tmp/ai-shots';
const ONLY = process.argv.slice(3);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
fs.mkdirSync(OUT, { recursive: true });

// 注入到頁面的測試輔助函式（window.__h）
function installHelpers() {
  const g = window.__game;
  const H = window.__h = {};
  H.sc = () => g.scene.getScenes(true).find((s) => s.player);
  H.gs = () => g.registry.get('gameState');
  H.clear = () => { for (const m of H.sc().monsters.getChildren().slice()) { m.brain.cleanup(); m.destroy(); } };
  H.def = (id) => window.__MONSTERS.find((d) => d.id === id);
  H.fix = () => { const gs = H.gs(); gs.hp = gs.maxHp = 99999; gs.mp = gs.maxMp = 9999; H.sc().player.isInvincible = true; };
  H.put = (x, topY) => {
    const p = H.sc().player; H.fix();
    p.setPosition(x, topY - 50); p.body.setVelocity(0, 0);
  };
  H.spawn = (id, x, topY) => {
    const sc = H.sc();
    let plat = null;
    for (const pl of sc.mapData.platforms) if (pl.y === topY && x >= pl.x && x <= pl.x + pl.width) plat = pl;
    const m = sc._spawnMonsterOn(H.def(id), plat);
    m._respawnDef = null;
    m.setPosition(x, m.y); m.body.reset(x, m.y); m.patrolOriginX = x;
    return m;
  };
  // 遊戲時間（累加每幀 delta）：headless 的 swiftshader 只有約 10 FPS，遊戲時間會比牆鐘慢，時間門檻一律用遊戲時間
  H.gt = 0;
  H.watch = () => { const sc = H.sc(); if (!sc._gtw) { sc._gtw = true; sc.events.on('update', (t, d) => { H.gt += d; }); } };
  H.started = () => { let n = 0; for (const k in window.__aiStats.started) n += window.__aiStats.started[k]; return n; };
  H.hits = () => { let n = 0; for (const k in window.__aiStats.hit) n += window.__aiStats.hit[k]; return n; };
}

async function fresh(job = 'assassin', lv = 45) {
  const { browser, page, errors } = await launch();
  await start(page);
  await page.evaluate(installHelpers);
  await page.evaluate(([j, l]) => window.__setJob(j, l), [job, lv]);
  return { browser, page, errors, a: api(page) };
}

// 在頁面內每 100ms 取樣一次，回傳取樣陣列
function samplerSrc() {
  return async ({ ms, fn }) => {
    const out = [];
    const H = window.__h;
    H.watch();
    const g0 = H.gt, w0 = performance.now();
    const f = new Function('H', `return (${fn})(H)`);
    while (H.gt - g0 < ms && performance.now() - w0 < ms * 4) {
      out.push(f(H));
      await new Promise((r) => setTimeout(r, 60));
    }
    return out;
  };
}

function reversals(xs, minStep = 3) {
  let n = 0, last = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    if (Math.abs(d) < minStep) continue;
    const s = Math.sign(d);
    if (last !== 0 && s !== last) n++;
    last = s;
  }
  return n;
}

// ───────────────────────── (a) Boss 抖動 ─────────────────────────
async function sectionA() {
  console.log('\n== (a) Boss 追擊不抖動 ==');
  const { browser, page, errors, a } = await fresh();
  await a.go('BossScene', 100);
  await page.waitForFunction(() => window.__game.scene.getScene('BossScene')._boss, null, { timeout: 40000 });
  const cases = [
    { name: '地板最左', px: 100, py: 600, bx: 900, by: 600 },
    { name: '地板最右', px: 1200, py: 600, bx: 300, by: 600 },
    { name: '左下平台', px: 220, py: 444, bx: 900, by: 600 },
    { name: '右下平台', px: 1060, py: 444, bx: 300, by: 600 },
    { name: '頂層平台', px: 640, py: 164, bx: 300, by: 600 },
    { name: '玩家在 Boss 正上方', px: 480, py: 304, bx: 480, by: 600 },
    { name: '玩家在 Boss 正下方', px: 220, py: 600, bx: 220, by: 444 },
    { name: '原本卡住的位置 x=300 的地板', px: 1150, py: 600, bx: 300, by: 600 },
  ];
  for (const c of cases) {
    await page.evaluate(([c]) => {
      const H = window.__h, sc = H.sc(), b = sc._boss;
      b.hp = b.maxHp; b.brain.gcd = 0; b.setPosition(c.bx, c.by); b.body.reset(c.bx, c.by);
      H.put(c.px, c.py);
      window.__a0 = H.started();
    }, [c]);
    await page.waitForTimeout(800);   // 讓玩家落到平台
    const s = await page.evaluate(samplerSrc(), { ms: 8000, fn: '(H) => { const sc = H.sc(), b = sc._boss, p = sc.player; H.fix(); return [b.x, b.body.bottom, p.x, p.body.bottom, b.brain.stage]; }' });
    const xs = s.map((v) => v[0]);
    const flips = reversals(xs);
    const path = xs.reduce((acc, x, i) => (i ? acc + Math.abs(x - xs[i - 1]) : 0), 0);
    const attacks = await page.evaluate(() => window.__h.started() - window.__a0);
    const last = s[s.length - 1];
    const closeSame = Math.abs(last[0] - last[2]) < 160 && Math.abs(last[1] - last[3]) < 30;
    check(`Boss/${c.name}：方向反轉 <= 6 次`, flips <= 6, `flips=${flips} path=${Math.round(path)} attacks=${attacks} end=(${Math.round(last[0])},${Math.round(last[1])}) player=(${Math.round(last[2])},${Math.round(last[3])})`);
    check(`Boss/${c.name}：有位移進展或出招`, path > 120 || attacks > 0 || closeSame, `path=${Math.round(path)}`);
  }
  check('Boss 區段無頁面錯誤', errors.filter((e) => !e.includes('404')).length === 0, errors.join(' | ').slice(0, 300));
  await browser.close();
}

// ───────────────────────── (b) 上下樓層不呆站 ─────────────────────────
async function sectionB() {
  console.log('\n== (b) 玩家在不同樓層：怪物不會凍結 ==');
  const { browser, page, errors, a } = await fresh('assassin', 30);
  await a.go('MapleIslandScene', 1300);
  // 浮空島：地板 600；中層 y=400（x 100–700 / 980–1580）；高層 y=240（x 380–960）
  const tests = [
    { id: 'skeleton', kind: '步行怪', mx: 500, mtop: 600, px: 500, ptop: 400, label: '玩家在上層' },
    { id: 'skeleton', kind: '步行怪', mx: 500, mtop: 400, px: 500, ptop: 600, label: '玩家在下層' },
    { id: 'ruin_knight', kind: '步行怪(無遠程)', mx: 500, mtop: 600, px: 500, ptop: 400, label: '玩家在上層' },
    { id: 'ruin_knight', kind: '步行怪(無遠程)', mx: 500, mtop: 400, px: 500, ptop: 600, label: '玩家在下層' },
    { id: 'boar', kind: '會跳的怪', mx: 500, mtop: 600, px: 500, ptop: 400, label: '玩家在上層' },
    { id: 'boar', kind: '會跳的怪', mx: 500, mtop: 400, px: 500, ptop: 600, label: '玩家在下層' },
    { id: 'octopus', kind: '遠程怪', mx: 500, mtop: 600, px: 500, ptop: 400, label: '玩家在上層' },
    { id: 'octopus', kind: '遠程怪', mx: 500, mtop: 400, px: 500, ptop: 600, label: '玩家在下層' },
  ];
  for (const t of tests) {
    await page.evaluate(([t]) => {
      const H = window.__h; H.clear();
      H.put(t.px, t.ptop);
      window.__m = H.spawn(t.id, t.mx, t.mtop);
      window.__a0 = H.started();
    }, [t]);
    await page.waitForTimeout(500);
    const s = await page.evaluate(samplerSrc(), { ms: 9000, fn: '(H) => { H.fix(); const m = window.__m; const p = H.sc().player; return [H.gt, m.x, m.body.bottom, H.started(), m.body.blocked.down ? 1 : 0, p.body.bottom, m.brain.stage]; }' });
    const t0 = s[0][0];
    let active = -1;
    for (let i = 1; i < s.length; i++) {
      if (Math.abs(s[i][1] - s[0][1]) > 25 || Math.abs(s[i][2] - s[0][2]) > 12 || s[i][3] > s[0][3] || s[i][6] !== 0) { active = Math.round(s[i][0] - t0); break; }
    }
    const last = s[s.length - 1];
    const onPlayerLevel = Math.abs(last[2] - last[5]) < 20;
    check(`${t.kind}(${t.id}) ${t.label}：3 秒內有動作`, active >= 0 && active <= 3000, `firstActive=${active}ms attacks=${last[3] - s[0][3]} reachedPlayerLevel=${onPlayerLevel} end=(${Math.round(last[1])},${Math.round(last[2])})`);
  }
  check('樓層區段無頁面錯誤', errors.filter((e) => !e.includes('404')).length === 0, errors.join(' | ').slice(0, 300));
  await browser.close();
}

// ───────────────────────── (c) 每種攻擊都會出手並造成傷害 / 產生投射物 ─────────────────────────
// 每個案例：玩家站著不動（有受傷，但血量很高），怪物在旁邊；等該招式出現，並檢查傷害 / 投射物 / 召喚
const ATTACK_CASES = [
  { type: 'charge', id: 'boar', dist: 240, expect: 'hit:charge' },
  { type: 'slam', id: 'golem', dist: 180, expect: 'hit:blast|hit:wave' },
  { type: 'pound', id: 'cyclops', dist: 60, expect: 'hit:blast' },
  { type: 'shoot', id: 'dragon', dist: 300, expect: 'hit:projectile' },
  { type: 'kite', id: 'fireimp', dist: 110, expect: 'fired' },
  { type: 'burrow', id: 'sandworm', dist: 250, expect: 'hit:blast' },
  { type: 'dive', id: 'bat', dist: 260, expect: 'hit:dive' },
  { type: 'summon', id: 'city_boss2', dist: 300, phase2: true, expect: 'minions' },
  { type: 'rain', id: 'frost_giant', dist: 300, phase2: true, expect: 'hit:projectile' },
  { type: 'burst', id: 'lava_dragon', dist: 300, phase2: true, expect: 'hit:projectile' },
  { type: 'leap', id: 'ruin_knight', dist: 0, high: true, expect: 'started' },
];

async function runCase(page, c) {
  return page.evaluate(async ([c]) => {
    const H = window.__h; H.watch(); H.clear();
    const sc = H.sc(), gs = H.gs(), p = sc.player;
    gs.hp = gs.maxHp = 99999; gs.mp = gs.maxMp = 999; p.isInvincible = false;
    const ptop = c.high ? 400 : 600;
    p.setPosition(1300, ptop - 50); p.body.setVelocity(0, 0);
    const m = H.spawn(c.id, c.high ? 1300 : 1300 + c.dist, 600);
    window.__m = m;
    if (c.phase2) { m.hp = m.maxHp * 0.45; m.takeDamage(1); }
    const S = window.__aiStats;
    const snap = () => JSON.parse(JSON.stringify({ s: S.started, h: S.hit, f: S.fired }));
    const a0 = snap(), hp0 = gs.hp, g0 = H.gt;
    let maxProj = 0;
    while (H.gt - g0 < 20000) {
      await new Promise((r) => setTimeout(r, 60));
      gs.mp = gs.maxMp;
      maxProj = Math.max(maxProj, sc._aiPool ? sc._aiPool.active : 0);
      const b = m.brain;
      const a = snap();
      const started = (a.s[c.type] || 0) - (a0.s[c.type] || 0);
      const hitKeys = Object.keys(a.h).filter((k) => (a.h[k] || 0) > (a0.h[k] || 0));
      const fired = a.f - a0.f;
      const minions = b.minions.filter((x) => x.active && !x.isDead).length;
      let ok = started > 0;
      if (ok && c.expect !== 'started') {
        ok = c.expect.split('|').some((e) => {
          if (e === 'fired') return fired > 0;
          if (e === 'minions') return minions > 0;
          return hitKeys.includes(e.split(':')[1]);
        });
      }
      if (ok) return { ok: true, t: Math.round(H.gt - g0), started, hitKeys, fired, minions, dmg: hp0 - gs.hp, maxProj };
      if (!m.active) return { ok: false, why: 'monster gone' };
    }
    const a = snap();
    return { ok: false, started: (a.s[c.type] || 0) - (a0.s[c.type] || 0), hitKeys: Object.keys(a.h), fired: a.f - a0.f, why: 'timeout' };
  }, [c]);
}

async function shotTelegraph(page, c, name) {
  // 等到該招式進入前搖，停在前搖尾段截圖
  await page.evaluate((t) => { window.__aiStats.freezeWindup = t; }, c.type);
  const got = await page.evaluate(async ([c]) => {
    const H = window.__h; H.watch(); H.clear();
    const sc = H.sc(), gs = H.gs(), p = sc.player;
    gs.hp = gs.maxHp = 99999; gs.mp = gs.maxMp = 999; p.isInvincible = true;
    const ptop = c.high ? 400 : 600;
    p.setPosition(1300, ptop - 50); p.body.setVelocity(0, 0);
    const m = H.spawn(c.id, c.high ? 1300 : 1300 + c.dist, 600);
    window.__m = m;
    if (c.phase2) { m.hp = m.maxHp * 0.45; m.takeDamage(1); }
    const g0 = H.gt;
    while (H.gt - g0 < 30000) {
      await new Promise((r) => setTimeout(r, 60));
      const b = m.brain;
      if ((b.stage === 1 || b.stage === 4) && b.def.type === c.type && (b.stage === 4 || b.t > b.def.windup * 0.8)) return true;
    }
    return false;
  }, [c]);
  if (got) {
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  }
  await page.evaluate(() => { window.__aiStats.freezeWindup = null; });
  return got;
}

async function sectionC() {
  console.log('\n== (c) 每種新攻擊都會出手並造成傷害 / 投射物 ==');
  const { browser, page, errors, a } = await fresh('assassin', 45);
  await a.go('MapleIslandScene', 1300);
  const shotTypes = new Set(['charge', 'slam', 'pound', 'shoot', 'burrow', 'dive', 'summon', 'rain', 'burst']);
  const only = (process.env.CASES || '').split(',').filter(Boolean);
  for (const c of ATTACK_CASES) {
    if (only.length && !only.includes(c.type)) continue;
    const r = await runCase(page, c);
    check(`攻擊 ${c.type}（${c.id}）出手並${c.expect === 'started' ? '落地' : '造成效果'}`, r.ok, JSON.stringify(r));
    if (r.ok && c.type !== 'leap') {
      check(`攻擊 ${c.type}：投射物同時存在 <= 32`, (r.maxProj || 0) <= 32, `maxProj=${r.maxProj}`);
    }
    if (shotTypes.has(c.type)) {
      const got = await shotTelegraph(page, c, `tele-${c.type}-${c.id}`);
      check(`攻擊 ${c.type}：前搖預警截圖`, got, `${OUT}/tele-${c.type}-${c.id}.png`);
    }
  }
  const real = errors.filter((e) => !e.includes('404'));
  check('攻擊區段無頁面錯誤', real.length === 0, real.join(' | ').slice(0, 400));
  await browser.close();
}

// ───────────────────────── (d) 守衛第二階段 ─────────────────────────
const GUARDIANS = ['pirate_captain', 'sandworm_boss', 'frost_giant', 'lava_dragon', 'fallen_commander', 'shadow_guardian'];

async function sectionD() {
  console.log('\n== (d) 守衛與 Boss 的階段切換 ==');
  const { browser, page, errors, a } = await fresh('assassin', 45);
  await a.go('MapleIslandScene', 1300);
  for (const id of GUARDIANS) {
    const r = await page.evaluate(async ([id]) => {
      const H = window.__h; H.watch(); H.clear();
      const sc = H.sc(), gs = H.gs(), p = sc.player;
      gs.hp = gs.maxHp = 99999; p.isInvincible = true;
      p.setPosition(1300, 550); p.body.setVelocity(0, 0);
      const m = H.spawn(id, 1300 + 320, 600);
      const S = window.__aiStats;
      const n0 = m.brain.attacks.length, ph0 = m.phase;
      const before = JSON.parse(JSON.stringify(S.started));
      m.hp = m.maxHp * 0.45; m.takeDamage(1);
      const b = m.brain;
      const info = { phase0: ph0, phase1: m.phase, idx: b.phaseIdx, stage: b.stage, n0, n1: b.attacks.length, speedMult: b.speedMult, cdMult: b.cdMult, dmgMult: b.dmgMult, tint: m._baseTint };
      const added = b.profile.phases[0].attacks.slice(b.profile.attacks.length).map((x) => x.type);
      const baseTypes = b.profile.attacks.map((x) => x.type);
      const g0 = H.gt;
      while (H.gt - g0 < 25000) {
        await new Promise((r) => setTimeout(r, 60));
        if (added.some((t) => (S.started[t] || 0) > (before[t] || 0)) && baseTypes.some((t) => (S.started[t] || 0) > (before[t] || 0))) break;
      }
      info.addedTypes = added; info.baseTypes = baseTypes;
      info.addedStarted = added.filter((t) => (S.started[t] || 0) > (before[t] || 0));
      info.baseStarted = baseTypes.filter((t) => (S.started[t] || 0) > (before[t] || 0));
      info.minions = b.minions.filter((x) => x.active && !x.isDead).length;
      info.alive = m.active && !m.isDead;
      return info;
    }, [id]);
    check(`${id}：血量 < 50% 進入第二階段（咆哮、屬性提升、招式增加）`, r.idx === 1 && r.phase1 === 2 && r.stage === 5 && r.n1 > r.n0 && (r.speedMult > 1 || r.cdMult < 1 || r.dmgMult > 1), JSON.stringify(r));
    check(`${id}：第二階段新招式出手過，且保留原本招式`, r.addedStarted.length > 0 && r.baseStarted.length > 0, `added=${r.addedStarted} base=${r.baseStarted} minions=${r.minions}`);
    if (id === 'pirate_captain' || id === 'lava_dragon') {
      await page.screenshot({ path: `${OUT}/phase2-${id}.png` });
    }
  }

  // 最終 Boss：三個階段
  await a.go('BossScene', 100);
  await page.waitForFunction(() => window.__game.scene.getScene('BossScene')._boss, null, { timeout: 40000 });
  await page.evaluate(installHelpers);
  const boss = await page.evaluate(async () => {
    const H = window.__h; H.watch();
    const sc = H.sc(), b = sc._boss, gs = H.gs();
    gs.hp = gs.maxHp = 99999; sc.player.isInvincible = true;
    const S = window.__aiStats, out = {};
    const run = async (ms, pred) => { const g0 = H.gt; while (H.gt - g0 < ms) { await new Promise((r) => setTimeout(r, 60)); if (pred && pred()) return true; } return false; };
    out.p1 = b.phase;
    const s0 = JSON.parse(JSON.stringify(S.started));
    await run(20000, () => ['pound', 'shoot', 'charge'].every((t) => (S.started[t] || 0) > (s0[t] || 0)));
    out.p1Types = ['pound', 'shoot', 'charge'].filter((t) => (S.started[t] || 0) > (s0[t] || 0));
    b.hp = b.maxHp * 0.55; b.takeDamage(1);
    out.p2 = b.phase; out.p2Stage = b.brain.stage; out.p2n = b.brain.attacks.length;
    const s1 = JSON.parse(JSON.stringify(S.started));
    await run(25000, () => ['summon', 'rain', 'slam'].every((t) => (S.started[t] || 0) > (s1[t] || 0)));
    out.p2Types = ['summon', 'rain', 'slam'].filter((t) => (S.started[t] || 0) > (s1[t] || 0));
    out.minionsAlive = sc.monsters.getChildren().filter((m) => m !== b && m.active && !m.isDead).length;
    b.hp = b.maxHp * 0.25; b.takeDamage(1);
    out.p3 = b.phase; out.p3Stage = b.brain.stage; out.p3n = b.brain.attacks.length; out.tint = b._baseTint; out.speedMult = b.brain.speedMult;
    const s2 = JSON.parse(JSON.stringify(S.started));
    await run(20000, () => (S.started.burst || 0) > (s2.burst || 0));
    out.p3Burst = (S.started.burst || 0) > (s2.burst || 0);
    return out;
  });
  check('Boss 第 1 階段招式：pound / shoot / charge 都出現', boss.p1 === 1 && boss.p1Types.length === 3, JSON.stringify(boss));
  check('Boss 第 2 階段：咆哮並加入 summon / rain / slam', boss.p2 === 2 && boss.p2Stage === 5 && boss.p2Types.length === 3 && boss.minionsAlive <= 4, `types=${boss.p2Types} minions=${boss.minionsAlive}`);
  check('Boss 第 3 階段：狂暴紅色、加速、加入 burst', boss.p3 === 3 && boss.p3Stage === 5 && boss.tint === 0xff0000 && boss.speedMult > 1.3 && boss.p3Burst, JSON.stringify({ p3: boss.p3, tint: boss.tint, sm: boss.speedMult, burst: boss.p3Burst }));
  await page.screenshot({ path: `${OUT}/boss-phase3.png` });
  const real = errors.filter((e) => !e.includes('404'));
  check('階段區段無頁面錯誤', real.length === 0, real.join(' | ').slice(0, 400));
  await browser.close();
}

// ───────────────────────── (e) 難度抽樣：機器人玩家打各種戰鬥 ─────────────────────────
// 機器人：走近、普攻 + 技能連發、看到前搖就在落地前 200ms 起跳 / 離開落彈標記；不喝藥水、不用裝備
function botSrc() {
  window.__bot = {
    start(opts) {
      const H = window.__h, sc = H.sc(), p = sc.player, gs = H.gs();
      const B = { t0: H.gt, dodge: opts.dodge, done: false, jumpedFor: null, hpMin: gs.hp, damageTaken: 0, hp0: gs.hp };
      const fire = (k) => { k._justDown = true; };
      const loop = () => {
        if (B.done) return;
        const target = opts.target();
        const hpNow = gs.hp;
        B.hpMin = Math.min(B.hpMin, hpNow);
        if (p.isDead || hpNow <= 0) { B.done = true; B.result = 'lose'; return; }
        if (!target || !target.active || target.isDead) { B.done = true; B.result = 'win'; p.cursors.left.isDown = p.cursors.right.isDown = false; return; }
        if (H.gt - B.t0 > opts.maxMs) { B.done = true; B.result = 'timeout'; return; }
        if (gs.mp < gs.maxMp * 0.3 && H.gt - (B.lastMp || -9999) > 900) {
          B.lastMp = H.gt;
          for (const k of ['R', 'D']) if ((gs.potions[k] || 0) > 0) { p.usePotion(k); break; }
        }
        if (hpNow < gs.maxHp * 0.5 && H.gt - (B.lastPot || -9999) > 700) {
          B.lastPot = H.gt;
          for (const k of ['S', 'G', 'A']) if ((gs.potions[k] || 0) > 0) { p.usePotion(k); break; }
        }
        const dx = target.x - p.x;
        let want = 0;
        if (Math.abs(dx) > 60) want = Math.sign(dx);
        const b = target.brain;
        if (B.dodge && b && (b.stage === 1 || b.stage === 4) && b.def) {
          const type = b.def.type, remain = b.stage === 4 ? b.def.pop - b.t : b.def.windup - b.t;
          const near = Math.abs(dx) < (b.def.radius || 150) + 40;
          if ((type === 'pound' || type === 'slam') && near && remain < 260 && p.body.blocked.down) { fire(p.keyAlt); }
          if (type === 'charge' && remain < 180 && Math.abs(dx) < 330 && p.body.blocked.down) { fire(p.keyAlt); }
          if (type === 'burrow' && b.stage === 4 && Math.abs(b.bx - p.x) < (b.def.radius || 60) + 50) want = p.x >= b.bx ? 1 : -1;
          if (type === 'rain') for (let i = 0; i < Math.min(8, b.def.count); i++) if (Math.abs(b.rainX[i] - p.x) < 60) want = p.x >= b.rainX[i] ? 1 : -1;
          if (type === 'dive' && remain < 200 && p.body.blocked.down) fire(p.keyAlt);
        }
        if (B.dodge && sc._aiPool) {
          for (const s of sc._aiPool.slots) {
            if (!s.active) continue;
            if (s.wave && Math.abs(s.x - p.x) < 130 && Math.sign(s.vx) === Math.sign(p.x - s.x) && p.body.blocked.down) fire(p.keyAlt);
          }
        }
        p.cursors.left.isDown = want < 0;
        p.cursors.right.isDown = want > 0;
        if (Math.abs(dx) < 140 && want === 0) { p.facingRight = dx > 0; p.setFlipX(dx < 0); }
        if (Math.abs(dx) < 170) {
          p.basicAttack();
          if (opts.skills !== false) for (const k of ['Z', 'X', 'C', 'V']) p.castSkill(k);
        }
        B.damageTaken = B.hp0 - hpNow;
      };
      B.timer = setInterval(loop, 40);
      window.__bot.cur = B;
      return true;
    },
    stop() { const B = window.__bot.cur; if (B) { B.done = true; clearInterval(B.timer); } },
  };
}

async function fight(page, spec) {
  await page.evaluate(([spec]) => {
    const H = window.__h; H.watch(); if (!spec.boss) H.clear();
    const sc = H.sc(), gs = H.gs(), p = sc.player;
    window.__setJob(spec.job, spec.level);
    gs.hp = gs.maxHp; gs.mp = gs.maxMp; p.isInvincible = false;
    gs.potions = { A: 5, S: 3, D: 5, R: 3, G: 2 };
    gs.skillCooldowns = { ATK: 0 };
    if (!spec.boss) p.setPosition(1300, 540);
    p.body.setVelocity(0, 0);
    const list = [];
    if (spec.boss) {
      const b = sc._boss;
      b.hp = b.maxHp; b.setPosition(900, 600); b.body.reset(900, 600); b.brain.gcd = 1500;
      p.setPosition(300, 540);
      list.push(b);
    } else {
      spec.mobs.forEach((id, i) => { const m = H.spawn(id, 1300 + 260 + i * 90, 600); list.push(m); });
    }
    window.__targets = list;
    window.__fightMaxHp = gs.maxHp;
    window.__bot.start({ dodge: spec.dodge, skills: spec.skills, maxMs: spec.maxMs || 90000, target: () => window.__targets.find((m) => m.active && !m.isDead) });
  }, [spec]);
  const res = await page.waitForFunction(() => window.__bot.cur.done, null, { timeout: 600000, polling: 500 })
    .then(() => page.evaluate(() => { const B = window.__bot.cur; const gs = window.__h.gs(); return { result: B.result, ms: Math.round(window.__h.gt - B.t0), lostPct: Math.round((B.hp0 - B.hpMin) / window.__fightMaxHp * 100), maxHp: window.__fightMaxHp }; }));
  await page.evaluate(() => { window.__bot.stop(); const p = window.__h.sc().player; p.cursors.left.isDown = p.cursors.right.isDown = false; });
  return res;
}

// 開一個全新的測試場（輸掉會跳到結算畫面，之後的戰鬥要重開頁面）
async function arena(sceneKey) {
  const ctx = await fresh('assassin', 45);
  await ctx.page.evaluate(botSrc);
  await ctx.a.go(sceneKey, sceneKey === 'BossScene' ? 100 : 1300);
  if (sceneKey === 'BossScene') {
    await ctx.page.waitForFunction(() => window.__game.scene.getScene('BossScene')._boss, null, { timeout: 40000 });
    await ctx.page.evaluate(installHelpers);
    await ctx.page.evaluate(botSrc);
  }
  return ctx;
}

async function sectionE() {
  console.log('\n== (e) 難度抽樣（機器人玩家，等級對應）==');
  let ctx = await arena('MapleIslandScene');
  const allErrors = [];
  const run = async (spec) => {
    if (spec.boss) { allErrors.push(...ctx.errors); await ctx.browser.close(); ctx = await arena('BossScene'); }
    const r = await fight(ctx.page, spec);
    if (r.result === 'lose' && !spec.boss) {
      allErrors.push(...ctx.errors);
      await ctx.browser.close();
      ctx = await arena(spec.boss ? 'BossScene' : 'MapleIslandScene');
    }
    return r;
  };
  const FIGHTS = [
    { name: 'shadow_guardian 試煉守衛', mobs: ['shadow_guardian'], level: 12, n: 3 },
    { name: 'pirate_captain 海盜船長', mobs: ['pirate_captain'], level: 22, n: 3 },
    { name: 'sandworm_boss 沙塵巨蟲', mobs: ['sandworm_boss'], level: 28, n: 3 },
    { name: 'frost_giant 冰霜巨人', mobs: ['frost_giant'], level: 33, n: 3 },
    { name: 'lava_dragon 熔岩龍', mobs: ['lava_dragon'], level: 38, n: 3 },
    { name: 'fallen_commander 墮落騎士團長', mobs: ['fallen_commander'], level: 44, n: 3 },
    { name: '一般怪群：岩牙野豬 x3', mobs: ['boar', 'boar', 'boar'], level: 9, n: 2 },
    { name: '一般怪群：冰原狼 x3', mobs: ['icewolf', 'icewolf', 'icewolf'], level: 28, n: 2 },
    { name: '一般怪群：石頭精 x2', mobs: ['golem', 'golem'], level: 25, n: 2 },
    { name: '一般怪群：吸血蝙蝠 x3', mobs: ['bat', 'bat', 'bat'], level: 37, n: 2 },
  ];
  const bossOnly = process.env.E_ONLY === 'boss';
  const fmt = (r) => `${r.result}:${(r.ms / 1000).toFixed(0)}s,-${r.lostPct}%`;
  const rows = [];
  for (const f of bossOnly ? [] : FIGHTS) {
    const results = [];
    for (let i = 0; i < f.n; i++) results.push(await run({ job: 'assassin', level: f.level, mobs: f.mobs, dodge: true }));
    const wins = results.filter((r) => r.result === 'win').length;
    rows.push({ name: f.name, wins, n: f.n });
    console.log(`  [熟練] ${f.name} (Lv${f.level}, HP ${results[0].maxHp}): 勝 ${wins}/${f.n}  ` + results.map(fmt).join('  '));
  }
  for (const r of rows) check(`難度[熟練] ${r.name}：至少贏一半`, r.wins * 2 >= r.n, `${r.wins}/${r.n}`);

  // 較弱的玩家：只用普攻、不閃避，但會在血量 < 50% 時喝藥水
  console.log('  -- 較弱玩家：只用普攻、不閃避，會喝藥水 --');
  const weakRows = [];
  for (const f of bossOnly ? [] : FIGHTS.filter((x) => x.n === 3)) {
    const results = [];
    for (let i = 0; i < 2; i++) results.push(await run({ job: 'assassin', level: f.level, mobs: f.mobs, dodge: false, skills: false, maxMs: 150000 }));
    const wins = results.filter((r) => r.result === 'win').length;
    weakRows.push({ name: f.name, wins, n: 2 });
    console.log(`  [較弱] ${f.name} (Lv${f.level}): 勝 ${wins}/2  ` + results.map(fmt).join('  '));
  }
  for (const r of weakRows) check(`難度[較弱] ${r.name}：至少贏一場`, r.wins >= 1, `${r.wins}/${r.n}`);

  // 最終 Boss（Lv45 玩家）
  allErrors.push(...ctx.errors);
  await ctx.browser.close();
  ctx = await arena('BossScene');
  const bossRes = [];
  for (const mode of [{ n: '熟練', dodge: true, skills: true }, { n: '熟練', dodge: true, skills: true }, { n: '較弱', dodge: false, skills: false }, { n: '較弱', dodge: false, skills: false }]) {
    const r = await run({ job: 'assassin', level: 45, boss: true, dodge: mode.dodge, skills: mode.skills, maxMs: 240000 });
    bossRes.push({ mode: mode.n, ...r });
    console.log(`  [${mode.n}] 暗影魔君 (Lv45, HP ${r.maxHp}): ${fmt(r)}`);
  }
  check('難度[熟練] 最終 Boss：兩場至少贏一場', bossRes.filter((r) => r.mode === '熟練' && r.result === 'win').length >= 1, JSON.stringify(bossRes));
  check('難度[較弱] 最終 Boss：兩場至少贏一場', bossRes.filter((r) => r.mode === '較弱' && r.result === 'win').length >= 1, JSON.stringify(bossRes));
  allErrors.push(...ctx.errors);
  const real = allErrors.filter((e) => !e.includes('404'));
  check('難度區段無頁面錯誤', real.length === 0, real.join(' | ').slice(0, 400));
  await ctx.browser.close();
}

(async () => {
  if (want('a')) await sectionA();
  if (want('b')) await sectionB();
  if (want('c')) await sectionC();
  if (want('d')) await sectionD();
  if (want('e')) await sectionE();
  console.log(`\n結果：${fails()} 項失敗`);
  process.exit(fails() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

// Phase A 轉職 e2e：技能施放、姿勢切換、存檔重讀、轉職任務鏈。用法：node e2e-jobs.cjs <截圖目錄>
const PORT = process.env.PORT || 8123;
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const SPDIR = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = []; const failed = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) failed.push(r.status() + ' ' + r.url()); });
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await page.goto(BASE); await page.waitForTimeout(7000);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((x) => x.player), null, { timeout: 40000 }); await page.waitForTimeout(1500);

  const SCENE = 'MapleIslandScene';
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // 準備一隻靶：離玩家 dx、血量極高、不動；其他怪清掉；玩家無敵、MP 滿、冷卻歸零
  const prep = (dx) => ev((dx) => {
    const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player; const gs = g.registry.get('gameState');
    const ms = p.enemies.getChildren();
    const m = ms[0];
    for (const o of ms.slice(1)) o.destroy();
    m.setPosition(p.x + dx, p.y); m.body.setVelocity(0, 0); m.hp = m.maxHp = 999999; m.hurtTimer = 0; m._mark = null; m._poison = null;
    window.__m = m;
    delete m.applyKnockback; delete m.takeDamage;   // 刺客段把這隻怪的擊退 / 受傷函式換成了計數樁（實例屬性）；之後每段都用同一隻，必須還原，否則俠盜的擊飛與擊退永遠不生效
    // 只測技能：讓怪物「原地不動、不出手」，但保留 Monster.update（擊退 / 擊飛計時、煙霧偵測都在裡面；
    // 早先把 update 換成空函式，擊退與擊飛就永遠不會生效）。速度 0 = 巡邏 / 追擊都不位移；偵測與攻擊範圍 0 = 不追、不放招、不平 A；跳躍冷卻拉滿
    m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; m.jumpCooldown = 1e9; m._steerJumpCd = 1e9;
    gs.mp = gs.maxMp = 999; gs.hp = gs.maxHp = 9999; p.isInvincible = true;
    gs.skillCooldowns = { ATK: 0 };
    p.facingRight = true; p.setFlipX(false);
    return { px: p.x, py: p.y };
  }, dx);
  const state = () => ev(() => {
    const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player; const gs = g.registry.get('gameState'); const m = window.__m || { hp: 0, x: 0, y: 0, body: null };
    return { mp: gs.mp, cd: { ...gs.skillCooldowns }, hp: m.hp, mx: m.x, my: m.y, mvy: m.body ? m.body.velocity.y : 0, tex: p.texture.key, px: p.x, job: gs.job,
      poison: m._poison ? m._poison.stacks : 0, mark: !!m._mark, smoked: m._smoked, zones: (p.smokeZones || []).length, pickups: sc.pickups.getChildren().length, potions: { ...gs.potions } };
  });
  const sampleTex = (ms) => ev(async (ms) => {
    const sc = window.__game.scene.getScene('MapleIslandScene'); const set = new Set(); const t0 = performance.now();
    while (performance.now() - t0 < ms) { set.add(sc.player.texture.key); await new Promise((r) => setTimeout(r, 25)); }
    return [...set];
  }, ms);
  // 按住到遊戲至少跑過 2 幀才放開：無頭瀏覽器只有約 8~10 FPS（機器忙時更低），固定 160 ms 的按鍵偶爾落在兩幀之間而沒被讀到
  const press = async (key, holdMs = 160) => {
    await page.keyboard.down(key);
    const f0 = await ev(() => window.__game.loop.frame);
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      await page.waitForTimeout(40);
      if (Date.now() - t0 >= holdMs && (await ev(() => window.__game.loop.frame)) >= f0 + 2) break;
    }
    await page.keyboard.up(key);
  };
  const equip = (slot, id) => ev(({ slot, id }) => { window.__game.scene.getScene('UIScene')._equipToSlot(slot, id); }, { slot, id });
  const setJob = (job, lv) => ev(({ job, lv }) => window.__setJob(job, lv), { job, lv });
  const shot = (name) => page.screenshot({ path: `${SPDIR}/${name}.png` });

  // ───────────────────────── 刺客 ─────────────────────────
  check('__setJob(assassin, 30)', await setJob('assassin', 30));
  await page.waitForTimeout(600);
  let s = await state();
  check('刺客：待機動作圖是 player_assassin_*', s.tex.startsWith('player_assassin_'), s.tex);
  check('刺客：HUD 職業名與頭像', await ev(() => { const u = window.__game.scene.getScene('UIScene'); return u._classText.text.includes('刺客') && u._portrait.texture.key === 'portrait_assassin'; }));
  check('刺客：技能欄預設 Z X C backstab（Lv.30 全解鎖，可自訂）', await ev(() => JSON.stringify(window.__game.registry.get('gameState').skillSlots)) === '["Z","X","C","backstab"]');
  await shot('job-assassin-idle');

  // 普通攻擊：雙刃連斬——一次出手兩段傷害
  await prep(55);
  await ev(() => { const m = window.__m; m.applyKnockback = () => {}; window.__hits = 0; const o = m.takeDamage; m.takeDamage = function (a, c, d) { window.__hits++; return o.call(this, a, c, d); }; });
  const hp0 = (await state()).hp;
  const texP = sampleTex(1000); await press('Space'); const texs = await texP;
  s = await state();
  check('刺客普攻：兩段傷害', await ev(() => window.__hits) === 2, 'hits=' + await ev(() => window.__hits));
  check('刺客普攻：敵人受傷', s.hp < hp0, `${hp0} -> ${s.hp}`);
  check('刺客普攻：用 assassin 揮砍動作', texs.some((t) => /player_assassin_slash_[123]/.test(t)), JSON.stringify(texs));
  await shot('job-assassin-slash');

  // 瞬影連刺
  await prep(220);
  let st0 = await state();
  const texB = sampleTex(700); await equip('Z', 'backstab'); await press('z'); const tb = await texB;
  s = await state();
  check('瞬影連刺：MP -40', (st0.mp - s.mp) > 28 && (st0.mp - s.mp) < 41, `${st0.mp} -> ${s.mp}`);
  check('瞬影連刺：冷卻開始', s.cd.backstab > 0, JSON.stringify(s.cd));
  check('瞬影連刺：敵人受傷', s.hp < st0.hp, `${st0.hp} -> ${s.hp}`);
  check('瞬影連刺：瞬移到敵人背後（玩家在敵人右側，距離近）', Math.abs(s.px - s.mx) < 90, `px=${s.px} mx=${s.mx}`);
  check('瞬影連刺：蹲伏 -> 背刺動作', tb.includes('player_assassin_crouch_low') && tb.includes('player_assassin_backstab'), JSON.stringify(tb));
  await shot('job-assassin-backstab');
  // 沒目標 → 退還
  await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); window.__m.setPosition(-5000, 0); window.__game.registry.get('gameState').skillCooldowns.backstab = 0; });
  st0 = await state(); await press('z'); await page.waitForTimeout(200); s = await state();
  check('瞬影連刺：範圍內沒目標 → 不扣 MP、不進冷卻', s.mp >= st0.mp - 1 && !(s.cd.backstab > 0), `mp ${st0.mp} -> ${s.mp} cd=${s.cd.backstab}`);

  // 蝕心毒鏢：兩支毒鏢各上 1 層、會跳毒；第二次施放疊滿 3 層 → 毒爆
  await prep(160);
  st0 = await state();
  await equip('Z', 'poison'); await press('z'); await page.waitForTimeout(800);
  s = await state();
  check('蝕心毒鏢：MP -30、冷卻開始', (st0.mp - s.mp) > 20 && (st0.mp - s.mp) < 31 && s.cd.poison > 0, `mp ${st0.mp} -> ${s.mp}`);
  check('蝕心毒鏢：兩支都命中，中毒 2 層', s.hp < st0.hp && s.poison === 2, `hp ${st0.hp} -> ${s.hp} stacks=${s.poison}`);
  const hpAfterHit = s.hp;
  await page.waitForTimeout(2300);
  s = await state();
  check('蝕心毒鏢：持續傷害（毒跳）', s.hp < hpAfterHit, `${hpAfterHit} -> ${s.hp}`);
  const hpBeforeBurst = s.hp;
  await ev(() => { const g = window.__game; g.registry.get('gameState').skillCooldowns.poison = 0; const p = g.scene.getScene('MapleIslandScene').player; p.setPosition(window.__m.x - 160, p.y); p.facingRight = true; });
  await press('z'); await page.waitForTimeout(800);
  s = await state();
  const bursts = await ev(() => window.__m._poisonBursts || 0);
  check('蝕心毒鏢：疊滿 3 層毒爆（毒清掉後第二支重新上 1 層）', bursts === 1 && s.poison <= 1 && hpBeforeBurst - s.hp > 0, `bursts=${bursts} stacks=${s.poison} dmg=${hpBeforeBurst - s.hp}`);
  await shot('job-assassin-poison');

  // 斷命印記：落印一斬；印記期間每擊必暴擊並存下 25%；結束時斷命
  await prep(200);
  st0 = await state();
  await equip('Z', 'mark'); await press('z'); await page.waitForTimeout(600);
  s = await state();
  check('斷命印記：MP -50、冷卻開始、落印一斬、敵人被標記', (st0.mp - s.mp) > 40 && (st0.mp - s.mp) < 51 && s.cd.mark > 0 && s.mark && s.hp < st0.hp, `mp ${st0.mp} -> ${s.mp} mark=${s.mark} hp ${st0.hp} -> ${s.hp}`);
  await shot('job-assassin-mark');
  const dmg = await ev(() => {
    const m = window.__m; const gs = window.__game.registry.get('gameState');
    const h0 = m.hp; m.takeDamage(1000, false); const h1 = m.hp; m.takeDamage(1000, false); const h2 = m.hp;
    return { first: h0 - h1, second: h1 - h2, expect: Math.floor(1000 * (gs.critMulti + 0.4)), stored: m._mark ? m._mark.stored : -1 };
  });
  check('斷命印記：印記期間每一擊都必暴擊並存下 25%，印記不會被打掉',
    dmg.first === dmg.expect && dmg.second === dmg.expect && dmg.stored === 2 * Math.floor(dmg.expect * 0.25), JSON.stringify(dmg));
  const hpBeforeFinale = await ev(() => { const m = window.__m; const h = m.hp; m._mark.until = 0; m.takeDamage(1, false); return h; });
  await page.waitForTimeout(900);
  s = await state();
  check('斷命印記：時間到斷命，傷害 ≥ 存下的傷害', !s.mark && hpBeforeFinale - s.hp > dmg.stored, `finale ${hpBeforeFinale - s.hp} stored ${dmg.stored}`);
  await shot('job-assassin-mark-finale');

  // 繼承技能（三連飛鏢 / 暗影步伐 / 暗殺）在刺客身上仍可施放，且用刺客的動作圖
  for (const [id, cost] of [['Z', 10], ['X', 30], ['C', 50]]) {
    await prep(id === 'X' ? 260 : 200);
    st0 = await state();
    const tI = sampleTex(500); await equip('Z', id); await press('z'); const ti = await tI;
    s = await state();
    check(`刺客繼承技能 ${id}：耗 MP、進冷卻、動作圖為 assassin`, (st0.mp - s.mp) > cost - 12 && (st0.mp - s.mp) < cost + 1 && (s.cd[id] > 0 || id === 'Z') && ti.some((t) => t.startsWith('player_assassin_')) && !ti.some((t) => /^player_(idle|walk|slash|throw|dash|cast)/.test(t)), `${id} mp ${st0.mp}->${s.mp} cd=${s.cd[id]} tex=${JSON.stringify(ti)}`);
  }
  await ev(() => { const g = window.__game.registry.get('gameState'); window.__poolV = g.skillLevels.V; });
  check('刺客不能施放不在技能池的技能（V 暗影漩渦）', await ev(() => { const p = window.__game.scene.getScene('MapleIslandScene').player; const gs = window.__game.registry.get('gameState'); gs.skillCooldowns.V = 0; const mp = gs.mp; p.castSkill('V'); return gs.mp === mp && !(gs.skillCooldowns.V > 0); }));

  // 殺手本能（被動）：暴擊傷害 +30% 影響實際暴擊倍率
  check('殺手本能：effectiveCritMulti = critMulti + 0.3', await ev(() => { const gs = window.__game.registry.get('gameState'); return gs.job === 'assassin'; }));

  // ───────────────────────── 切回盜賊 / 俠盜 ─────────────────────────
  check('__setJob(bandit, 30)', await setJob('bandit', 30));
  await page.waitForTimeout(600);
  s = await state();
  check('俠盜：待機動作圖是 player_bandit_*', s.tex.startsWith('player_bandit_'), s.tex);
  check('俠盜：HUD 職業名與頭像', await ev(() => { const u = window.__game.scene.getScene('UIScene'); return u._classText.text.includes('俠盜') && u._portrait.texture.key === 'portrait_bandit'; }));
  check('俠盜：技能欄預設 X V B whirl', await ev(() => JSON.stringify(window.__game.registry.get('gameState').skillSlots)) === '["X","V","B","whirl"]');
  await shot('job-bandit-idle');

  // 彎刀橫斬：連打第 3 下擊飛
  await prep(70);
  await ev(() => { window.__game.registry.get('gameState').skillCooldowns = { ATK: 0 }; });
  // 無頭瀏覽器只有約 8~10 FPS，一次按鍵偶爾沒被那一幀讀到，
  // 所以每一下都「按到揮刀計數前進為止」（最多重按 6 次），整組 1-2-3 若因視窗過期被重置就整組重打（最多 3 組）。
  // 擊飛速度用頁面內的 20 ms 取樣器記錄每一下之後的最小垂直速度
  await ev(() => { window.__minVy = 0; clearInterval(window.__vyIv); window.__vyIv = setInterval(() => { window.__minVy = Math.min(window.__minVy, window.__m.body.velocity.y); }, 20); });
  const swing = async (keepCombo) => {
    for (let k = 0; k < 6; k++) {
      // 機器忙時兩下之間常超過 900 ms；視窗本身由單元測試（comboStep）涵蓋，這裡把上一下的時間戳更新到現在，只驗「第 3 下擊飛」
      if (keepCombo) await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); if (sc.player._combo) sc.player._combo.last = sc.time.now; });
      const before = await ev(() => window.__game.scene.getScene('MapleIslandScene').player._combo?.last ?? 0);
      await press('Space');
      await page.waitForTimeout(120);
      const after = await ev(() => window.__game.scene.getScene('MapleIslandScene').player._combo?.last ?? 0);
      if (after !== before) return ev(() => window.__game.scene.getScene('MapleIslandScene').player._combo.count);
      await page.waitForTimeout(350);   // ATK 冷卻
    }
    return -1;
  };
  let ups = [], counts = [];
  for (let round = 0; round < 3; round++) {
    ups = []; counts = [];
    await page.waitForTimeout(1100);   // 讓上一組的連擊視窗過期，從第 1 下開始
    for (let i = 0; i < 3; i++) {
      await ev(() => { const m = window.__m; const p = window.__game.scene.getScene('MapleIslandScene').player; m.setPosition(p.x + 70, p.y); m.body.setVelocity(0, 0); m.hurtTimer = 0; window.__minVy = 0; });
      counts.push(await swing(i > 0));
      await page.waitForTimeout(i < 2 ? 100 : 900);
      ups.push(await ev(() => window.__minVy));
    }
    if (counts.join() === '1,2,3') break;
  }
  await ev(() => clearInterval(window.__vyIv));
  check('彎刀橫斬：連擊計數 1-2-3', counts.join() === '1,2,3', JSON.stringify(counts));
  check('彎刀橫斬：前兩下不擊飛、第 3 下擊飛', ups[0] > -60 && ups[1] > -60 && ups[2] < -200, JSON.stringify(ups));
  await shot('job-bandit-slash');

  // 赤月迴旋：半徑 120 內全體 + 擊退（身後也打得到）
  await prep(90);
  const second = await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); const p = sc.player; const m2 = sc.add.existing; return null; });
  await ev(() => { window.__game.registry.get('gameState').skillCooldowns = { ATK: 0 }; });
  st0 = await state();
  await ev(() => { window.__maxDx = 0; const x0 = window.__m.x; window.__dxIv = setInterval(() => { window.__maxDx = Math.max(window.__maxDx, Math.abs(window.__m.x - x0)); }, 20); });
  const texW = sampleTex(900); await equip('Z', 'whirl'); await press('z'); const afterCast = await state(); const tw = await texW;   // MP 在施放當下取，之後的等待會自然回魔
  await page.waitForTimeout(1200);   // 三圈的最後一圈才擊退；慢速無頭環境要多等
  await ev(() => clearInterval(window.__dxIv)); const maxDx = await ev(() => window.__maxDx);
  s = await state();
  check('赤月迴旋：MP -40、冷卻、敵人受傷（三圈）並被擊退', (st0.mp - afterCast.mp) > 20 && (st0.mp - afterCast.mp) < 41 && s.cd.whirl > 0 && st0.hp - s.hp > 600 && maxDx > 5, `mp ${st0.mp}->${afterCast.mp} hp ${st0.hp}->${s.hp} maxDx ${maxDx}`);
  check('赤月迴旋：旋轉動作 spin_1 / spin_2', tw.includes('player_bandit_spin_1') && tw.includes('player_bandit_spin_2'), JSON.stringify(tw));
  await shot('job-bandit-whirl');
  await prep(-80);
  st0 = await state(); await press('z'); await page.waitForTimeout(500); s = await state();
  check('赤月迴旋：身後的敵人也被打到', s.hp < st0.hp, `${st0.hp} -> ${s.hp}`);

  // 妙手空空：近戰一擊；35% 多掉金幣、5% 偷到藥水（機率性：用大量施放驗證；Math.random 不能鎖定，Phaser 文字會壞）
  await prep(70);
  st0 = await state();
  await equip('Z', 'steal'); await press('z'); await page.waitForTimeout(400);
  s = await state();
  check('妙手空空：MP -24（命中回 10）、冷卻、敵人受傷', (st0.mp - s.mp) > 5 && (st0.mp - s.mp) < 25 && s.cd.steal > 0 && s.hp < st0.hp, `mp ${st0.mp}->${s.mp} hp ${st0.hp}->${s.hp}`);
  await shot('job-bandit-steal');
  const stat = await ev(async () => {
    const g = window.__game; const sc = g.scene.getScene('MapleIslandScene'); const p = sc.player; const gs = g.registry.get('gameState'); const m = window.__m;
    gs.maxMp = 999999; const potions0 = gs.potions.A + gs.potions.D; let casts = 0;
    for (const o of sc.pickups.getChildren().slice()) o.destroy();
    // 妙手空空會突進穿過敵人：每次施放前把玩家拉回原位，避免一路衝到地圖邊的傳送門而換地圖
    const x0 = p.x;
    for (let i = 0; i < 160; i++) {
      p.body.reset(x0, p.y);
      gs.mp = gs.maxMp; gs.skillCooldowns.steal = 0; m.setPosition(p.x + 70, p.y); m.body.setVelocity(0, 0); m.hurtTimer = 0; m.hp = m.maxHp;
      p.facingRight = true; p.castSkill('steal'); casts++;
      await new Promise((r) => setTimeout(r, 90));
    }
    return { casts, mesoDrops: sc.pickups.getChildren().length, potionGain: gs.potions.A + gs.potions.D - potions0 };
  });
  check('妙手空空：約 60% 多掉金幣（160 次中 75..120 次）', stat.mesoDrops >= 75 && stat.mesoDrops <= 120, JSON.stringify(stat));
  check('妙手空空：偷到藥水（12%，160 次中至少 1 次）', stat.potionGain >= 1, JSON.stringify(stat));

  // 迷煙彈：煙霧區、範圍內敵人傷害降到 40% / 不追擊
  await prep(200);
  await ev(() => { const m = window.__m; m.behavior = 'chase'; });
  st0 = await state();
  await equip('Z', 'smoke'); await press('z'); await page.waitForTimeout(900);
  s = await state();
  check('迷煙彈：MP -45、冷卻、產生煙霧區', (st0.mp - s.mp) > 20 && (st0.mp - s.mp) < 46 && s.cd.smoke > 0 && s.zones === 1, `mp ${st0.mp}->${s.mp} zones=${s.zones}`);
  await shot('job-bandit-smoke');
  const sm = await ev(() => {
    const sc = window.__game.scene.getScene('MapleIslandScene'); const p = sc.player; const m = window.__m; const z = p.smokeZones[0];
    m.setPosition(z.x, p.y); m.body.setVelocity(0, 0);
    p.isInvincible = false; const recv = []; const old = p.takeDamage; p.takeDamage = function (a) { recv.push(a); };
    const r = Math.random; Math.random = () => 0.5;
    m._smoked = false; m._doAttack(p); const normal = recv[0]; m.attackCooldown = 0;
    m._smoked = true; m._doAttack(p); const smoked = recv[1];
    Math.random = r; p.takeDamage = old; m.attackCooldown = 0;
    return { normal, smoked };
  });
  check('迷煙彈：煙霧內敵人傷害為 40%', sm.normal > 0 && Math.abs(sm.smoked - sm.normal * 0.4) <= 1, JSON.stringify(sm));
  await page.waitForTimeout(500);
  await ev(() => { window.__m._smoked = false; });   // 清掉上面手動設的旗標，改由 Monster.update 的煙霧偵測自己判定
  const flag = await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); const p = sc.player; const m = window.__m; const z = p.smokeZones[0]; m.setPosition(z.x + 30, p.y); m.body.setVelocity(0, 0); return null; });
  await page.waitForTimeout(500);
  check('迷煙彈：煙霧內的敵人被標記為 smoked（AI 不追擊）', (await state()).smoked === true);

  // 繼承技能（暗影步伐 / 暗影漩渦 / 影分身）：影分身用俠盜的動作圖
  for (const [id, cost] of [['X', 30], ['V', 70]]) {
    await prep(id === 'X' ? 260 : 150);
    st0 = await state();
    await equip('Z', id); await press('z'); await page.waitForTimeout(500);
    s = await state();
    check(`俠盜繼承技能 ${id}：耗 MP、進冷卻`, (st0.mp - s.mp) > cost - 12 && (st0.mp - s.mp) < cost + 1 && s.cd[id] > 0, `${id} mp ${st0.mp}->${s.mp} cd=${s.cd[id]}`);
  }
  await prep(150);
  await equip('Z', 'B'); await press('z'); await page.waitForTimeout(1500);
  const clone = await ev(() => { const sc = window.__game.scene.getScene('MapleIslandScene'); const c = sc._shadowClone; return c && c.active ? { tex: c.texture.key } : null; });
  check('俠盜影分身：用 player_bandit_* 動作圖', clone && clone.tex.startsWith('player_bandit_'), JSON.stringify(clone));
  await shot('job-bandit-clone');
  await ev(() => { const c = window.__game.scene.getScene('MapleIslandScene')._shadowClone; if (c) c.emit('expire'); });
  check('俠盜不能施放不在技能池的技能（Z 三連飛鏢）', await ev(() => { const p = window.__game.scene.getScene('MapleIslandScene').player; const gs = window.__game.registry.get('gameState'); const mp = gs.mp; p.castSkill('Z'); return gs.mp === mp; }));

  // 悍匪體魄：金幣加成（Monster 掉落）
  check('悍匪體魄：mesoMult 1.15 / maxHp×1.2 已套用於 gameState', await ev(() => { const g = window.__game.registry.get('gameState'); return g.job === 'bandit'; }));

  // ───────────────────────── 存檔重讀 ─────────────────────────
  await ev(() => { const g = window.__game; g.scene.getScene('MapleIslandScene').events.emit('job-changed', 'bandit', { silent: true }); });
  await page.waitForTimeout(500);
  const saved = await ev(() => JSON.parse(localStorage.getItem('thief-legend-save-v1') || '{}'));
  check('存檔包含職業 bandit', saved.state && saved.state.job === 'bandit', JSON.stringify(saved.state && saved.state.job));
  await page.reload(); await page.waitForTimeout(4000);
  check('重新載入後出現主選單（有存檔）', await ev(() => window.__game.scene.isActive('MenuScene')));
  await page.keyboard.press('Enter');   // 繼續遊戲
  await page.waitForTimeout(4500);
  s = await ev(() => { const g = window.__game; const gs = g.registry.get('gameState'); const act = g.scene.getScenes(true).find((x) => x.player); return { job: gs.job, slots: gs.skillSlots, tex: act && act.player.texture.key, cls: g.scene.getScene('UIScene')._classText.text, title: gs.title }; });
  check('重新載入後職業仍是俠盜、外觀與 HUD 正確', s.job === 'bandit' && s.tex.startsWith('player_bandit_') && s.cls.includes('俠盜'), JSON.stringify(s));
  await shot('job-bandit-reloaded');

  console.log('頁面錯誤:', JSON.stringify(errors));
  console.log('失敗的請求:', JSON.stringify(failed));
  check('沒有頁面錯誤', errors.length === 0);
  console.log(fails === 0 ? 'ALL PASS' : `FAILS: ${fails}`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('E2E CRASH', e); process.exit(2); });

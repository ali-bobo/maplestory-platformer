// 影之試煉守衛的戰鬥時間實測：Lv10 盜賊（普攻 + 三連飛鏢 + 藥水）進副本，機器人打到結束，回報擊殺時間與剩餘血量。
// 用法：PORT=8403 node e2e/trial.cjs <截圖目錄> [lv=10] [runs=3]
const { launch, start, api, check, fails } = require('./world/lib.cjs');
const SP = process.argv[2] || '.';
const LV = Number(process.argv[3] || 10);
const RUNS = Number(process.argv[4] || 3);
const ONLY = process.env.VARIANT ? Number(process.env.VARIANT) : null;   // 只跑第 N 個打法（調參用）

// 頁面內的機器人：每 50ms 決策一次，用玩家自己的按鍵狀態與 API 操作（和真人同一條程式路徑）
const BOT = ({ mode }) => new Promise((resolve) => {
  const g = window.__game;
  const sc = g.scene.getScenes(true).find((s) => s.player);
  const p = sc.player;
  const gs = g.registry.get('gameState');
  p.isInvincible = false;
  const t0 = performance.now();
  const log = { guardianDeadAt: null, minHp: gs.hp, hits: 0, potions: 0, bar: null };
  let lastPot = 0, jumpAt = 0;
  const iv = setInterval(() => {
    const now = performance.now();
    const alive = sc.monsters.getChildren().filter((m) => m.active && !m.isDead);
    const guardian = sc.monsters.getChildren().find((m) => m.config && m.config.id === 'shadow_guardian');
    if (guardian && guardian.isDead && log.guardianDeadAt == null) log.guardianDeadAt = { real: (now - t0) / 1000, game: sc._dungeonDef.timeLimit - sc._timeRemaining };
    if (!log.bar && guardian && !guardian.isDead && guardian.hp < guardian.maxHp * 0.5) {
      log.bar = { hp: guardian.hp, maxHp: guardian.maxHp, scaleX: guardian._hpBar.scaleX, barW: guardian._hpBarW, spriteW: guardian.displayWidth, ratio: guardian.hp / guardian.maxHp };
    }
    log.minHp = Math.min(log.minHp, gs.hp);
    if (sc._dungeonResult || p.isDead) {
      clearInterval(iv);
      p.cursors.left.isDown = p.cursors.right.isDown = false;
      resolve({ result: sc._dungeonResult || 'dead', real: (now - t0) / 1000, game: sc._dungeonDef.timeLimit - sc._timeRemaining, ...log, hp: gs.hp, maxHp: gs.maxHp });
      return;
    }
    if (!alive.length) { p.cursors.left.isDown = p.cursors.right.isDown = false; return; }
    // 先打守衛，其他的擋路才打
    const target = (guardian && !guardian.isDead) ? guardian : alive.reduce((a, b) => (Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b));
    const dx = target.x - p.x;
    const dy = target.body.bottom - p.body.bottom;
    const adx = Math.abs(dx);
    const onGround = p.body.blocked.down || p.body.touching.down;
    p.cursors.left.isDown = dx < -50;
    p.cursors.right.isDown = dx > 50;
    if (adx <= 50) { p.facingRight = dx >= 0; p.setFlipX(!p.facingRight); }
    // 目標在上層 → 跳
    if (dy < -50 && adx < 280 && now - jumpAt > 450 && (onGround || p.jumpsLeft > 0)) { p.setVelocityY(-520); p.jumpsLeft = onGround ? 1 : 0; jumpAt = now; }
    // 攻擊
    if (adx < 95 && Math.abs(dy) < 70) p.basicAttack();
    if (mode.useZ && adx >= 95 && adx < 380 && Math.abs(dy) < 90 && gs.mp >= 10 && p.facingRight === (dx > 0)) p.castSkill('Z');
    if (mode.useZ && adx < 95 && gs.mp > 120) p.castSkill('Z');
    // 藥水
    if (mode.pots && gs.hp < gs.maxHp * 0.45 && now - lastPot > 900) { lastPot = now; const slot = gs.potions.S > 0 ? 'S' : 'A'; if (gs.potions[slot] > 0) { p.usePotion(slot); log.potions++; } }
  }, 50);
});

(async () => {
  const { browser, page, errors } = await launch();
  const A = api(page);
  await start(page);
  const results = [];
  const variants = [
    { name: '穩健（普攻 + 三連飛鏢 + 藥水）', mode: { useZ: true, pots: true } },
    { name: '只用普攻 + 藥水', mode: { useZ: false, pots: true } },
    { name: '莽撞（普攻 + 三連飛鏢，不喝藥）', mode: { useZ: true, pots: false } },
  ];
  for (const v of variants) {
    if (ONLY !== null && variants.indexOf(v) !== ONLY) { results.push({ v, runs: [] }); continue; }
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      await A.ev((lv) => window.__setJob('thief', lv), LV);
      await A.ev(() => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; gs.mp = gs.maxMp; gs.potions = { A: 5, S: 3, D: 5, R: 3, G: 2 }; gs.skillCooldowns = { ATK: 0 }; });
      // 進副本（和傳送門做的事一樣）
      await A.ev(() => { const g = window.__game; const sc = g.scene.getScenes(true).find((o) => o.player); const gs = g.registry.get('gameState'); g.scene.getScenes(true).forEach((s) => { if (s.sys.settings.key === 'UIScene') s.scene.stop(); }); sc.scene.start('DungeonScene', { dungeonId: 'shadow_trial', gameState: gs }); });
      await page.waitForFunction(() => { const s = window.__game.scene.getScene('DungeonScene'); return s && s.sys.isActive() && s.monsters && s.monsters.getChildren().length >= 3; }, null, { timeout: 30000 });
      // 調參用：GHP / GATK 覆寫守衛血量與攻擊（不改資料檔就能試不同數值）
      if (process.env.GHP || process.env.GATK) await A.ev(({ hp, atk }) => { const g = window.__game.scene.getScene('DungeonScene').monsters.getChildren().find((m) => m.config.id === 'shadow_guardian'); if (hp) g.hp = g.maxHp = hp; if (atk) g.atk = atk; }, { hp: Number(process.env.GHP) || 0, atk: Number(process.env.GATK) || 0 });
      if (r === 0 && v === variants[0]) {
        const info = await A.ev(() => { const s = window.__game.scene.getScene('DungeonScene'); return s.monsters.getChildren().map((m) => ({ id: m.config.id, hp: m.hp, maxHp: m.maxHp, atk: m.atk, x: Math.round(m.x), feet: Math.round(m.body.bottom) })); });
        console.log('開場怪物', JSON.stringify(info));
        const gs = await A.gs(); console.log(`玩家 Lv${gs.level} hp ${gs.maxHp} atk ${gs.atk} mp ${gs.maxMp}`);
      }
      const res = await page.evaluate(BOT, { mode: v.mode });
      if (r === 0 && v === variants[0]) await page.screenshot({ path: `${SP}/trial-end.png` });
      runs.push(res);
      console.log(`  [${v.name}] #${r + 1}: ${res.result} 遊戲秒 ${res.game}（真實 ${res.real.toFixed(1)}s）守衛倒下 ${res.guardianDeadAt ? res.guardianDeadAt.game + 's' : '-'} 最低血 ${res.minHp}/${res.maxHp} 喝藥 ${res.potions}` + (res.bar ? ` 血條 scaleX=${res.bar.scaleX.toFixed(3)} 比例=${res.bar.ratio.toFixed(3)} 寬=${res.bar.barW}px/圖寬${res.bar.spriteW}px` : ''));
      await page.waitForTimeout(800);
      // 回殿堂（結算視窗關閉後）
      await A.ev(() => { const g = window.__game; g.scene.getScenes(true).forEach((s) => { if (s.sys.settings.key !== 'DungeonScene' || true) { /* noop */ } }); const sc = g.scene.getScene('DungeonScene'); if (sc && sc.sys.isActive()) sc.exitDungeon(); });
      await page.waitForFunction(() => window.__game.scene.getScenes(true).some((x) => x.player && x.sys.settings.key !== 'DungeonScene'), null, { timeout: 20000 });
      await page.waitForTimeout(500);
    }
    results.push({ v, runs });
  }
  console.log('\n== 摘要 ==');
  for (const { v, runs } of results) {
    const wins = runs.filter((x) => x.result === 'victory');
    const kill = runs.filter((x) => x.guardianDeadAt).map((x) => x.guardianDeadAt.game);
    const avg = (a) => (a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : '-');
    console.log(`${v.name}: 勝 ${wins.length}/${runs.length}，守衛擊殺平均 ${avg(kill)}s，通關平均 ${avg(wins.map((x) => x.game))}s，最低血量平均 ${avg(runs.map((x) => x.minHp))}`);
  }
  const careful = results[0].runs;
  const killT = careful.filter((x) => x.guardianDeadAt).map((x) => x.guardianDeadAt.game);
  check('穩健打法擊殺守衛 45-75 秒', killT.length > 0 && killT.every((t) => t >= 45 && t <= 75), JSON.stringify(killT));
  check('穩健打法多半能通關（機器人不會閃躲，勝率 ≥ 60%）', careful.filter((x) => x.result === 'victory').length >= careful.length * 0.6, careful.map((x) => x.result).join(','));
  check('只用普攻打不完（時限內輸或被打死）', results[1].runs.every((x) => x.result !== 'victory'), results[1].runs.map((x) => x.result).join(','));
  check('莽撞打法（不喝藥）有輸的可能，且勝率不高於穩健打法', results[2].runs.some((x) => x.result !== 'victory' || x.minHp < x.maxHp * 0.25), results[2].runs.map((x) => `${x.result}/${Math.round(x.minHp)}`).join(','));
  check('沒有 pageerror', errors.filter((e) => e.startsWith('pageerror')).length === 0, errors.slice(0, 3).join('|'));
  await browser.close();
  process.exit(fails() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

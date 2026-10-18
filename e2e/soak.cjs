// 長時間浸泡測試（soak）：實際操作遊戲數分鐘，每分鐘印出記憶體 / 紋理 / 物件 / 計時器 / 音訊節點，
// 最後斷言「第二圈之後不再成長」。用來抓瀏覽器崩潰（記憶體洩漏、紋理累積、WebGL context lost）。
//
// 用法：PORT=8401 SOAK_MIN=6 node e2e/soak.cjs [輸出資料夾]
//   SOAK_MIN   總分鐘數（預設 6；每分鐘走完一圈：13 張地圖 + Boss 戰 + 副本）
//   SOAK_JSON  若設定，把每分鐘取樣寫成 JSON 檔（比較前後數據用）
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const fs = require('fs');
const PORT = process.env.PORT || 8123;
const URL = `http://127.0.0.1:${PORT}/index.html?debug=1`;
const MINUTES = Number(process.env.SOAK_MIN || 6);
const OUT = process.argv[2] || '.';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

const MAPS = ['MapleIslandScene', 'HenesysScene', 'HarborScene', 'PerionScene', 'DesertScene', 'SnowScene', 'LavaScene',
  'CastleScene', 'TownScene', 'ShrineScene', 'KerningScene', 'TaipeiScene', 'ElliniaScene',
  'BossScene', 'DungeonScene:slime_cave'];   // 後兩個：Boss 戰與副本（不是一般地圖，素材清單來源不同）
const JOB_CYCLE = [['thief', 12], ['assassin', 24], ['bandit', 24], ['thief', 30]];

// 在頁面載入前注入：包裝 AudioContext 工廠函式，統計「存活」節點（來源節點以 onended 計），並記錄 context lost 事件
const INIT = () => {
  try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) { /* 靜默 */ }
  const st = window.__soak = { created: { osc: 0, buf: 0, gain: 0, conv: 0 }, live: { osc: 0, buf: 0 }, ctxLost: 0, ctxRestored: 0, errors: 0 };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const wrapSrc = (proto, name, kind) => {
      const orig = proto[name];
      proto[name] = function (...a) {
        const n = orig.apply(this, a);
        st.created[kind]++; st.live[kind]++;
        n.addEventListener('ended', () => { st.live[kind]--; });
        return n;
      };
    };
    const wrapCount = (proto, name, kind) => { const orig = proto[name]; proto[name] = function (...a) { st.created[kind]++; return orig.apply(this, a); }; };
    wrapSrc(AC.prototype, 'createOscillator', 'osc');
    wrapCount(AC.prototype, 'createBufferSource', 'buf');
    wrapCount(AC.prototype, 'createGain', 'gain');
    wrapCount(AC.prototype, 'createConvolver', 'conv');
  }
  // 統計存活的 setInterval
  const si = window.setInterval, ci = window.clearInterval; const live = new Set(); st.intervals = 0;
  window.setInterval = function (...a) { const id = si.apply(this, a); live.add(id); st.intervals = live.size; return id; };
  window.clearInterval = function (id) { live.delete(id); st.intervals = live.size; return ci.call(this, id); };
  window.addEventListener('error', () => { st.errors++; });
  window.__runningMap = () => window.__game && window.__game.scene.getScenes(true).find((o) => o.mapKey !== undefined && o.sys.isActive() && o.player && o.player.active);
  const hook = setInterval(() => {
    const c = document.querySelector('canvas');
    if (!c) return;
    clearInterval(hook);
    c.addEventListener('webglcontextlost', () => { st.ctxLost++; });
    c.addEventListener('webglcontextrestored', () => { st.ctxRestored++; });
  }, 100);
};

const SAMPLE = () => {
  const g = window.__game; const tm = g.textures; let px = 0, n = 0;
  for (const k of tm.getTextureKeys()) {
    if (k.startsWith('__')) continue;
    const s = tm.get(k).getSourceImage(); px += (s.width || 0) * (s.height || 0); n++;
  }
  const scenes = g.scene.getScenes(false);
  let objs = 0, tweens = 0, timers = 0, bodies = 0, emitters = 0, ev = 0;
  const per = {};
  for (const s of scenes) {
    const active = s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping();
    const c = s.children ? s.children.list.length : 0;
    if (!active) { per[s.sys.settings.key] = c; if (c > 0) objs += c; continue; }
    objs += c;
    try { tweens += s.tweens.getTweens().length; } catch (_) { /* 靜默 */ }
    try { timers += s.time._active.length; } catch (_) { /* 靜默 */ }
    try { bodies += s.physics && s.physics.world ? s.physics.world.bodies.size : 0; } catch (_) { /* 靜默 */ }
    try { ev += s.events.eventNames().reduce((a, k) => a + s.events.listenerCount(k), 0); } catch (_) { /* 靜默 */ }
  }
  ev += g.registry.events.eventNames().reduce((a, k) => a + g.registry.events.listenerCount(k), 0);
  const m = performance.memory || {};
  const st = window.__soak;
  return {
    heapMB: +(m.usedJSHeapSize / 1048576).toFixed(1), textures: n, texMB: +(px * 4 / 1048576).toFixed(1),
    objs, tweens, timers, bodies, listeners: ev, intervals: st.intervals,
    oscLive: st.live.osc, oscMade: st.created.osc, gainMade: st.created.gain,
    ctxLost: st.ctxLost, quality: g.registry.get('qualityLevel'), fps: Math.round(g.loop.actualFps),
    active: g.scene.getScenes(true).map((s) => s.sys.settings.key).join(','),
  };
};

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({
    executablePath: PW_EXE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox',
      '--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  page.on('crash', () => { errors.push('PAGE CRASH'); });
  await page.addInitScript(INIT);
  await page.goto(URL);
  // 開機到可互動的時間：選單出現（MenuScene 啟動）為止
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 120000 });
  const bootMs = Date.now() - t0;
  console.log(`boot to menu: ${bootMs} ms`);
  const boot = await page.evaluate(SAMPLE);
  console.log('boot  ' + JSON.stringify(boot));
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');   // 新遊戲（教學已略過）；同時解鎖 AudioContext，音樂開著
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.player), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const gc = () => page.evaluate(() => { if (window.gc) window.gc(); });

  const samples = [];
  // 目前正在執行的地圖場景（有 mapKey 的 BaseMapScene；排除載入中 / 已停止的）。函式在 INIT 注入頁面
  // （頁面的 CSP 禁止 eval，所以不能用字串形式的 waitForFunction / eval）
  const hopTo = async (spec) => {
    const [key, dungeonId] = spec.split(':');
    // 上一段戰鬥中被怪物打死（不是 dieAndRespawn 安排的）→ 先從結算畫面重新開始，否則沒有地圖場景可跳
    if (await page.evaluate(() => window.__game.scene.isActive('GameOverScene'))) {
      await page.mouse.move(510, 540); await page.waitForTimeout(150); await page.mouse.click(510, 540);
    }
    await page.waitForFunction(() => !!window.__runningMap(), null, { timeout: 60000 });
    await page.evaluate(([k, dungeonId]) => {
      const g = window.__game; const sc = window.__runningMap();
      const gs = g.registry.get('gameState');
      g.scene.getScenes(true).forEach((s) => { if (s.sys.settings.key === 'UIScene') s.scene.stop(); });
      sc.scene.start(k, { gameState: gs, spawnX: 300, dungeonId });
    }, [key, dungeonId]);
    // 等「目標場景」跑起來（舊場景結束、新場景載入完 + create 完成），而不是只看有沒有任何場景在跑
    try {
      await page.waitForFunction((k) => { const sc = window.__game.scene.getScene(k); return sc && sc.sys.isActive() && sc.player && sc.player.active && window.__game.scene.isActive('UIScene'); }, key, { timeout: 60000 });
    } catch (e) {
      const st = await page.evaluate(() => window.__game.scene.getScenes(false).map((s) => `${s.sys.settings.key}:${s.sys.settings.status}`).join(' ')).catch(() => '?');
      console.log(`STUCK 轉場卡住：${spec}  場景狀態 ${st}`);
      await page.screenshot({ path: OUT + '/soak-stuck.png' }).catch(() => {});
      throw e;
    }
    await page.waitForFunction(() => window.__game.scene.getScenes(true).filter((o) => o.mapKey !== undefined).length === 1, null, { timeout: 5000 }).catch(() => {});
  };
  const fightFor = async (ms) => {
    // 把玩家傳到最近的怪旁邊，連打普攻 + 輪流施放所有技能
    await page.evaluate(() => {
      const g = window.__game; const sc = g.scene.getScenes(true).find((o) => o.player); if (!sc) return;
      const gs = g.registry.get('gameState'); gs.mp = gs.maxMp = Math.max(gs.maxMp, 999);
      const p = sc.player; const ms = sc.monsters ? sc.monsters.getChildren().filter((m) => m.active && !m.isDead) : [];
      if (ms.length) { const m = ms[Math.floor(Math.random() * ms.length)]; p.setPosition(m.x - 60, m.y - 20); p.body.setVelocity(0, 0); }
    });
    const end = Date.now() + ms; let i = 0;
    const keys = ['z', 'x', 'c', 'v', 'b'];
    await page.keyboard.down('Space');
    while (Date.now() < end) {
      await page.keyboard.press(keys[i++ % keys.length]);
      if (i % 3 === 0) await page.keyboard.press('ArrowUp');
      await page.keyboard.down(i % 2 ? 'ArrowRight' : 'ArrowLeft'); await page.waitForTimeout(220); await page.keyboard.up(i % 2 ? 'ArrowRight' : 'ArrowLeft');
    }
    await page.keyboard.up('Space');
  };
  const dieAndRespawn = async () => {
    await page.evaluate(() => {
      const g = window.__game; const sc = g.scene.getScenes(true).find((o) => o.player); if (!sc) return;
      g.registry.get('gameState').hp = 0; sc.player._die();
    });
    await page.waitForFunction(() => window.__game.scene.isActive('GameOverScene'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.move(510, 540); await page.waitForTimeout(150); await page.mouse.click(510, 540);   // 從死亡點重新開始
    await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.player), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  };
  const popup = async () => {
    await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); if (u && u.sys.isActive()) { u._equipPick = 'Z'; u._openPopup('skills'); } });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const u = window.__game.scene.getScene('UIScene'); if (u && u.sys.isActive()) u._closePopup(); });
  };

  for (let minute = 1; minute <= MINUTES; minute++) {
    const tMin = Date.now();
    const [job, lvl] = JOB_CYCLE[(minute - 1) % JOB_CYCLE.length];
    await page.evaluate(([j, l]) => window.__setJob && window.__setJob(j, l), [job, lvl]);
    for (let i = 0; i < MAPS.length; i++) {
      await hopTo(MAPS[(i + minute) % MAPS.length]);
      await fightFor(2200);
      if (i % 4 === 1) await popup();
      if (i % 5 === 2) { await dieAndRespawn(); await fightFor(800); }
    }
    // 每圈取樣前補足一分鐘（讓怪物重生、計時器自然運作），再強制 GC 讀取真正的存活堆積
    const rest = 60000 - (Date.now() - tMin);
    if (rest > 0) await page.waitForTimeout(rest);
    await gc(); await page.waitForTimeout(300); await gc();
    const s = await page.evaluate(SAMPLE);
    s.minute = minute; s.job = job; samples.push(s);
    console.log(`min ${minute} ${JSON.stringify(s)}`);
  }

  // ── 斷言：暖機（前 2 圈）之後不可再成長 ──────────────────────────────────────
  if (samples.length >= 4) {
    const a = samples[1], z = samples[samples.length - 1];
    check('同一時間只有一個地圖場景在跑', /^[A-Za-z]+Scene,UIScene$/.test(z.active) || /^UIScene,[A-Za-z]+Scene$/.test(z.active) || z.active.split(',').filter((x) => x !== 'UIScene').length === 1, z.active);
    check('JS 堆積在暖機後成長 < 12 MB', z.heapMB - a.heapMB < 12, `${a.heapMB} -> ${z.heapMB} MB`);
    check('紋理數量在暖機後成長 <= 4', z.textures - a.textures <= 4, `${a.textures} -> ${z.textures}`);
    check('紋理像素量在暖機後成長 < 8 MB', z.texMB - a.texMB < 8, `${a.texMB} -> ${z.texMB} MB`);
    check('顯示物件數在暖機後不暴增', z.objs - a.objs < 400, `${a.objs} -> ${z.objs}`);
    check('事件監聽器數量不累積', z.listeners - a.listeners <= 10, `${a.listeners} -> ${z.listeners}`);
    check('setInterval 數量不累積', z.intervals - a.intervals <= 0, `${a.intervals} -> ${z.intervals}`);
  } else {
    console.log('(分鐘數 < 4，略過成長斷言)');
  }
  const last = samples[samples.length - 1] || boot;
  check('存活振盪器 < 120（音訊節點沒有堆積）', last.oscLive < 120, `osc ${last.oscLive}`);
  check('沒有 WebGL context lost', last.ctxLost === 0, String(last.ctxLost));
  // ── WebGL context 遺失演練：丟掉 context → 要有提示；恢復後提示消失、畫面繼續繪製 ─────────
  const drill = await page.evaluate(async () => {
    const ext = window.__game.renderer.gl.getExtension('WEBGL_lose_context');
    if (!ext) return { skipped: true };
    ext.loseContext(); await new Promise((r) => setTimeout(r, 500));
    const shown = !!document.getElementById('gl-lost');
    ext.restoreContext(); await new Promise((r) => setTimeout(r, 1500));
    return { shown, hidden: !document.getElementById('gl-lost'), lostFlag: window.__game.renderer.contextLost, frame: window.__game.loop.frame };
  });
  if (!drill.skipped) {
    await page.waitForTimeout(1500);
    const frame2 = await page.evaluate(() => window.__game.loop.frame);
    const shot = await page.screenshot();
    check('context 遺失時顯示提示', drill.shown);
    check('context 恢復後提示收起、渲染器恢復', drill.hidden && !drill.lostFlag, JSON.stringify(drill));
    check('恢復後遊戲迴圈仍在跑、畫面不是空白', frame2 > drill.frame && shot.length > 30000, `frame ${drill.frame} -> ${frame2}, png ${shot.length} B`);
  }
  check('全程沒有 JS 錯誤 / 當機', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.screenshot({ path: OUT + '/soak-end.png' }).catch(() => {});
  if (process.env.SOAK_JSON) fs.writeFileSync(process.env.SOAK_JSON, JSON.stringify({ bootMs, boot, samples }, null, 1));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

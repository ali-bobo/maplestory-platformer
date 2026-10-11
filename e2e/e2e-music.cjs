const { chromium } = require('/opt/node-tools/node_modules/playwright');
let fails = 0; const SPDIR = process.argv[2] || '.';
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('__t')) { localStorage.setItem('thief-legend-tutorial-seen', '1'); } } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  // 在音訊輸出端（destination）旁路一個 AnalyserNode，量實際輸出
  await page.addInitScript(() => {
    const orig = AudioNode.prototype.connect;
    window.__ans = [];   // 每個 AudioContext 一個分析節點
    AudioNode.prototype.connect = function (dest, ...a) {
      const r = orig.call(this, dest, ...a);
      try {
        if (dest && dest.constructor && dest.constructor.name === 'AudioDestinationNode' && !this.__tap) {
          this.__tap = true;
          const ctx = dest.context;
          let rec = window.__ans.find((x) => x.ctx === ctx);
          if (!rec) {
            const an = ctx.createAnalyser(); an.fftSize = 2048;
            const sink = ctx.createGain(); sink.gain.value = 0;
            orig.call(an, sink); orig.call(sink, ctx.destination);
            rec = { ctx, an }; window.__ans.push(rec);
          }
          orig.call(this, rec.an);
        }
      } catch (_) {}
      return r;
    };
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8123}/index.html?debug=1`);
  await page.waitForTimeout(4000);
  await page.keyboard.press('Enter');       // 開始遊戲（第一次按鍵解鎖音訊）
  const rms = () => page.evaluate(async () => {
    const out = [];
    for (const { ctx, an } of window.__ans) {
      const buf = new Float32Array(an.fftSize); let sum = 0, n = 0, peak = 0;
      for (let k = 0; k < 20; k++) { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); } await new Promise((r) => setTimeout(r, 40)); }
      out.push({ rms: Math.sqrt(sum / n), peak, state: ctx.state });
    }
    // 音樂在合成器自己的 context；取整體最大者即可
    return { rms: Math.max(0, ...out.map((o) => o.rms)), peak: Math.max(0, ...out.map((o) => o.peak)), state: out.map((o) => o.state).join('/'), ctxs: out.length };
  });
  await page.waitForTimeout(5000);
  let r = await rms();
  check('進入遊戲後 AudioContext 為 running 且有音樂輸出', r && r.state.includes('running') && r.rms > 0.002, JSON.stringify(r));
  check('輸出沒有爆音（峰值 < 0.9）', r && r.peak < 0.9, 'peak=' + (r && r.peak.toFixed(3)));

  // 暫停選單的音樂開關：關 → 靜音並記住；再開 → 恢復
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await page.mouse.move(640, 420); await page.waitForTimeout(300); await page.mouse.click(640, 420);
  await page.waitForTimeout(2000);
  r = await rms();
  check('暫停選單按「聲音：開」→ 全部靜音', r && r.rms < 0.0015, JSON.stringify(r));
  check('偏好寫入 localStorage', await page.evaluate(() => localStorage.getItem('thief-legend-sound') === 'off'));
  await page.screenshot({ path: SPDIR + '/pause-music.png' });
  await page.mouse.click(640, 420); await page.waitForTimeout(3500);
  r = await rms();
  check('再按一次 → 音樂恢復', r && r.rms > 0.002, JSON.stringify(r));
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);

  // 切換地圖：舊曲淡出、新曲淡入，期間不丟例外、不靜音
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState');
    const sc = g.scene.getScene('MapleIslandScene');
    sc.scene.stop('UIScene'); gs.currentMap = 'kerning';
    sc.scene.start('KerningScene', { gameState: gs });
  });
  await page.waitForTimeout(4000);
  r = await rms();
  check('切到暗巷城後仍有音樂輸出', r && r.rms > 0.002, JSON.stringify(r));
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState');
    const sc = g.scene.getScene('KerningScene');
    sc.scene.stop('UIScene'); gs.currentMap = 'boss';
    sc.scene.start('BossScene', { gameState: gs });
  });
  await page.waitForTimeout(4000);
  r = await rms();
  check('切到 Boss 房後仍有音樂輸出', r && r.rms > 0.002, JSON.stringify(r));

  // 結算畫面：stopBgm → 淡出到安靜
  await page.evaluate(() => {
    const g = window.__game; const gs = g.registry.get('gameState');
    g.scene.getScene('BossScene').scene.stop('UIScene');
    g.scene.getScene('BossScene').scene.start('GameOverScene', { victory: false, gameState: gs, deathX: 400 });
  });
  await page.waitForTimeout(2500);
  r = await rms();
  check('進入結算畫面後音樂淡出（接近靜音）', r && r.rms < 0.0015, JSON.stringify(r));
  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

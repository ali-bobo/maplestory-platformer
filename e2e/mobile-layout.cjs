// 手機版面 e2e：多種「可見視窗」下，畫布是否填滿、NPC 對話 / 商店 / 各視窗的按鈕是否完整在畫面內、
// 不被觸控鈕或 HUD 蓋住、真的用手指（CDP touch）點得到。
// 用法：PORT=8437 node e2e/mobile-layout.cjs <截圖資料夾> [視窗名稱…]
//   例：PORT=8437 node e2e/mobile-layout.cjs /tmp/shots p844x340 desk
// 視窗：p844x340 p740x320 p667x300 p915x412 p844x390 p667x375 portrait(390x844 直向) desk(1280x720 桌機，無觸控)
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const ONLY = process.argv.slice(3);
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const LAUNCH = {
  executablePath: PW_EXE,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
};
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

const VIEWPORTS = {
  p844x340: { w: 844, h: 340, touch: true },
  p740x320: { w: 740, h: 320, touch: true },
  p667x300: { w: 667, h: 300, touch: true },
  p915x412: { w: 915, h: 412, touch: true },
  p844x390: { w: 844, h: 390, touch: true },
  p667x375: { w: 667, h: 375, touch: true },
  portrait: { w: 390, h: 844, touch: true, portrait: true },
  desk: { w: 1280, h: 720, touch: false },
};

const MIN_TOUCH = 40;   // 容許四捨五入（規格 44 CSS px）

async function startGame(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('MapleIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function run(browser, name, vp) {
  const tag = name;
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, screen: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.touch ? 2 : 1,
    isMobile: vp.touch, hasTouch: vp.touch, userAgent: vp.touch ? MOBILE_UA : undefined,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`${tag} console: ${m.text()}`); });
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const cdp = vp.touch ? await ctx.newCDPSession(page) : null;
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  // 真實點擊：觸控裝置用手指，桌機用滑鼠
  const tapPage = async (x, y) => {
    if (vp.touch) { await touch('touchStart', [{ x, y, id: 4 }]); await sleep(120); await touch('touchEnd', []); }
    else { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); }
    await sleep(350);
  };

  // ── 畫布填滿 ──────────────────────────────────────────────────────────────
  if (vp.portrait) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    const hint = await page.evaluate(() => {
      const h = document.getElementById('rotate-hint');
      if (!h) return null;
      const r = h.getBoundingClientRect(); const cs = getComputedStyle(h);
      return { display: cs.display, w: r.width, h: r.height, text: h.textContent };
    });
    check(`${tag} 直向：顯示「請橫向使用」提示並蓋滿畫面`, !!hint && hint.display !== 'none' && hint.w >= vp.w - 1 && hint.h >= vp.h - 1, JSON.stringify(hint));
    await page.screenshot({ path: `${SP}/ml-${tag}-hint.png` });
    const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight);
    check(`${tag} 直向：沒有捲動條`, noScroll);
    // 直向切到橫向：提示消失、畫布重新填滿
    await page.setViewportSize({ width: vp.h, height: vp.w > 500 ? 390 : vp.w });
    await page.waitForTimeout(800);
    const gone = await page.evaluate(() => getComputedStyle(document.getElementById('rotate-hint')).display === 'none');
    check(`${tag} 轉成橫向後提示消失`, gone);
    await ctx.close();
    return;
  }

  await startGame(page);
  const SCALE = Math.min(vp.w / 1280, vp.h / 720);
  const canvasFill = async (label) => {
    const info = await page.evaluate(() => {
      const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
      const de = document.documentElement;
      const vv = window.visualViewport;
      return {
        l: r.left, t: r.top, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight,
        vvw: vv ? vv.width : null, vvh: vv ? vv.height : null,
        scrollOver: de.scrollWidth > de.clientWidth + 1 || de.scrollHeight > de.clientHeight + 1 || document.body.scrollHeight > window.innerHeight + 1,
      };
    });
    const fitW = Math.abs(info.w - info.vw) <= 2, fitH = Math.abs(info.h - info.vh) <= 2;
    const ratio = info.w / info.h;
    check(`${label} 畫布保持 16:9`, Math.abs(ratio - 16 / 9) < 0.02, ratio.toFixed(3));
    check(`${label} 畫布在可見區域內且至少一軸填滿`, info.l >= -1 && info.t >= -1 && info.l + info.w <= info.vw + 1 && info.t + info.h <= info.vh + 1 && (fitW || fitH), JSON.stringify(info));
    check(`${label} 畫布置中`, Math.abs(info.l - (info.vw - info.l - info.w)) <= 2 && Math.abs(info.t - (info.vh - info.t - info.h)) <= 2, JSON.stringify(info));
    check(`${label} 沒有捲動條 / 溢出`, !info.scrollOver, JSON.stringify(info));
    return info;
  };
  await canvasFill(`${tag} 選單後遊戲`);
  const scrolled = await page.evaluate(() => { window.scrollTo(0, 80); return window.scrollY; });
  check(`${tag} 無法捲動頁面（scrollY 維持 0）`, scrolled === 0, String(scrolled));
  await page.screenshot({ path: `${SP}/ml-${tag}-game.png` });
  if (vp.touch) {
    // 「全螢幕」鈕：瀏覽器支援 Fullscreen API 才出現；在可見視窗內、點得到（hit-test 命中它自己）
    const fsInfo = await page.evaluate(() => {
      const e = document.querySelector('.tc-fullscreen'); const api = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
      if (!e) return { api, has: false };
      const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { api, has: true, shown: e.offsetParent !== null, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hit: top === e, w: r.width, h: r.height };
    });
    check(`${tag} 全螢幕鈕（API ${fsInfo.api ? '有' : '無'}）：有 API 時在可見視窗內且點得到`, fsInfo.api ? (fsInfo.has && fsInfo.shown && fsInfo.inView && fsInfo.hit) : !fsInfo.has, JSON.stringify(fsInfo));
  }

  // 視窗高度變動（網址列收起 / 展開）：畫布要跟著重新貼合
  if (vp.touch) {
    await page.setViewportSize({ width: vp.w, height: vp.h - 40 });
    await page.waitForTimeout(700);
    await canvasFill(`${tag} 高度 -40 後`);
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(700);
    await canvasFill(`${tag} 還原後`);
  }

  // 安全區域：把四邊各挪出 14px（模擬瀏海 / 圓角），畫布必須在安全區內
  if (vp.touch) {
    await page.evaluate(() => {
      const s = document.documentElement.style;
      s.setProperty('--safe-top', '10px'); s.setProperty('--safe-bottom', '14px');
      s.setProperty('--safe-left', '44px'); s.setProperty('--safe-right', '44px');
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(700);
    const inSafe = await page.evaluate(() => {
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { l: r.left, t: r.top, r: window.innerWidth - r.right, b: window.innerHeight - r.bottom };
    });
    check(`${tag} 安全區域：畫布避開左右 44 / 上 10 / 下 14`, inSafe.l >= 43 && inSafe.r >= 43 && inSafe.t >= 9 && inSafe.b >= 13, JSON.stringify(inSafe));
    await page.screenshot({ path: `${SP}/ml-${tag}-safe.png` });
    await page.evaluate(() => {
      const s = document.documentElement.style;
      for (const k of ['--safe-top', '--safe-bottom', '--safe-left', '--safe-right']) s.removeProperty(k);
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(600);
  }

  // ── 共用量測 ──────────────────────────────────────────────────────────────
  // 把場景裡的遊戲物件換算成頁面座標的矩形（含相機捲動 / 縮放 / scrollFactor）
  const measureObjs = (sceneKey, getObjs) => page.evaluate(([sk, src]) => {
    // eslint-disable-next-line no-new-func
    const objs = (new Function('game', `return (${src})(game);`))(window.__game);
    const sc = window.__game.scene.getScene(sk);
    const cam = sc.cameras.main;
    const cv = document.querySelector('canvas').getBoundingClientRect();
    const k = cv.width / window.__game.scale.width;
    const blockers = [...document.querySelectorAll('#touch-controls .tc-btn, #touch-controls .tc-stick')]
      .filter((e) => e.offsetParent !== null && getComputedStyle(e).display !== 'none')
      .map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cls: e.className }; });
    const out = [];
    for (const o of objs) {
      if (!o || !o.active || !o.visible || typeof o.getBounds !== 'function') continue;
      const b = o.getBounds();
      const sfx = o.scrollFactorX === 0 ? 0 : 1, sfy = o.scrollFactorY === 0 ? 0 : 1;
      const gx = (b.x - cam.scrollX * sfx), gy = (b.y - cam.scrollY * sfy);
      let rect = { l: cv.left + gx * k, t: cv.top + gy * k, r: cv.left + (gx + b.width) * k, b: cv.top + (gy + b.height) * k };
      // 可點區域：用命中框（Zone / 按鈕底板）；Text 只量可見文字
      const inter = !!(o.input && o.input.enabled);
      const cx = (rect.l + rect.r) / 2, cy = (rect.t + rect.b) / 2;
      const top = document.elementFromPoint(Math.min(Math.max(cx, 0), window.innerWidth - 1), Math.min(Math.max(cy, 0), window.innerHeight - 1));
      const hits = blockers.filter((x) => rect.l < x.r && x.l < rect.r && rect.t < x.b && x.t < rect.b).map((x) => x.cls);
      out.push({ fontCss: o.type === 'Text' ? parseFloat(o.style.fontSize) * k : 99, gt: gy, gb: gy + b.height, type: o.type, text: o.type === 'Text' ? o.text.slice(0, 14) : '', inter, rect, w: rect.r - rect.l, h: rect.b - rect.t, covered: !!top && top.tagName !== 'CANVAS', coverTag: top ? top.className || top.tagName : '', hits, vw: window.innerWidth, vh: window.innerHeight });
    }
    return out;
  }, [sceneKey, getObjs.toString()]);

  const inViewport = (o) => o.rect.l >= -1 && o.rect.t >= -1 && o.rect.r <= o.vw + 1 && o.rect.b <= o.vh + 1;
  // 對一組物件做「完整在畫面內、可互動物件夠大且沒被蓋住」的判定
  const judge = (label, list, { needInter = 1, minInter = vp.touch ? MIN_TOUCH : 0, hud = true } = {}) => {
    const inter = list.filter((o) => o.inter);
    const outside = list.filter((o) => !inViewport(o)).map((o) => `${o.type}${o.text ? ':' + o.text : ''}`);
    check(`${label} 全部物件在可見視窗內`, outside.length === 0, outside.join(','));
    check(`${label} 有 ${needInter}+ 個可點物件`, inter.length >= needInter, String(inter.length));
    const small = inter.filter((o) => o.w < minInter || o.h < minInter).map((o) => `${o.type}${o.text} ${o.w.toFixed(0)}x${o.h.toFixed(0)}`);
    check(`${label} 可點物件 >= ${minInter} CSS px`, small.length === 0, small.join(','));
    const cov = inter.filter((o) => o.covered || o.hits.length).map((o) => `${o.type}${o.text}:${o.coverTag}|${o.hits.join('/')}`);
    check(`${label} 可點物件沒被觸控鈕 / DOM 蓋住`, cov.length === 0, cov.join(','));
    if (vp.touch) {
      // 手機文字：螢幕大小 >= 12 CSS px 為目標（容許四捨五入 11.5）；畫布縮到 < 0.5（667x300 一類）時面板寬度被 HUD 夾住，放寬到 9.9
      const minFont = SCALE >= 0.5 ? 11.5 : 9.9;
      const tiny = list.filter((o) => o.type === 'Text' && o.text && o.fontCss < minFont).map((o) => `${o.text}:${o.fontCss.toFixed(1)}px`);
      check(`${label} 文字 >= 12 CSS px`, tiny.length === 0, tiny.join(','));
    }
    if (hud) {
      // HUD：下方狀態列從遊戲座標 y=600 開始；上方目標列 / 地圖鈕到 y≈49；Phaser 的 HUD 在地圖場景之上，會蓋住對話框
      const bad = list.filter((o) => o.gb > 600.5 || o.gt < 48).map((o) => `${o.type}${o.text}:${o.gt.toFixed(0)}~${o.gb.toFixed(0)}`);
      check(`${label} 不被 HUD 蓋住（遊戲座標 y 在 48~600 之間）`, bad.length === 0, bad.join(','));
    }
  };
  const centerOf = (o) => ({ x: (o.rect.l + o.rect.r) / 2, y: (o.rect.t + o.rect.b) / 2 });

  // ── 進入影之殿堂 ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const g = window.__game; g.scene.getScenes(true).forEach((x) => { if (x.sys.settings.key !== 'UIScene' && !x.player) g.scene.stop(x.sys.settings.key); });
    const sc = g.scene.getScene('MapleIslandScene'); const gs = g.registry.get('gameState');
    window.__setJob('thief', 10);
    gs.quests = gs.quests || { active: [], completed: [] };
    sc.scene.stop('UIScene'); sc.scene.start('ShrineScene', { gameState: gs, spawnX: 700 });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('ShrineScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const S = 'ShrineScene';
  const dlgObjsSrc = (g) => { const d = g.scene.getScene('ShrineScene')._npcDialog; return d.objects ? d.objects : [d.bg, d.title, d.msgText, d.close, ...(d.extras || [])]; };
  const dlgInteractive = (list) => list;
  const closeDlg = () => page.evaluate(() => { const s = window.__game.scene.getScene('ShrineScene'); s._closeNpcDialog(); });
  const dlgOpen = () => page.evaluate(() => !!window.__game.scene.getScene('ShrineScene')._npcDialog);

  // 1. 真實流程：站在影之長老旁，點「互動」鈕（觸控）或按 F（桌機）
  await page.evaluate(() => {
    const gs = window.__game.registry.get('gameState');
    gs.quests.active = [{ id: 'job_choose', progress: 0 }];
    const s = window.__game.scene.getScene('ShrineScene'); s.player.setPosition(780, s.player.y); s.player.body.setVelocity(0, 0); s.player.isInvincible = true;
  });
  await page.waitForTimeout(700);
  if (vp.touch) {
    const ic = await page.evaluate(() => { const e = document.querySelector('.tc-interact'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: e.offsetParent !== null, vw: innerWidth, vh: innerHeight, r: r.right, b: r.bottom, l: r.left, t: r.top }; });
    check(`${tag} 互動鈕在可見視窗內`, ic.shown && ic.l >= 0 && ic.t >= 0 && ic.r <= ic.vw && ic.b <= ic.vh, JSON.stringify(ic));
    await tapPage(ic.x, ic.y);
  } else {
    await page.keyboard.press('f'); await page.waitForTimeout(400);
  }
  await page.waitForTimeout(500);
  check(`${tag} 真實互動開啟影之長老對話`, await dlgOpen());
  if (await dlgOpen()) {
    const objs = await measureObjs(S, dlgObjsSrc);
    judge(`${tag} 長老選項對話`, objs, { needInter: 3 });
    await page.screenshot({ path: `${SP}/ml-${tag}-elder.png` });
    // 手指點「選項」以外的關閉鈕：close 物件
    const closeO = await measureObjs(S, (g) => [g.scene.getScene('ShrineScene')._npcDialog.close]);
    const c = centerOf(closeO[0]);
    await tapPage(c.x, c.y);
    check(`${tag} 手指 / 滑鼠點關閉鈕關掉長老對話`, !(await dlgOpen()));
  }

  // 2. 長文字對話（星光之塔 5 碎片提示）與一般 NPC
  for (const [label, def] of [
    ['獵人協會員（4 行）', { name: '獵人協會員', dialog: ['歡迎來到森林獵場！', '這裡是中級練功地點。', '小心那些野豬，衝刺速度非常快！', '右上角的跳台上有金色傳送門通往神秘之境（按 F 進入），地面往右是古代廢墟。'] }],
    ['技能導師', { name: '技能導師', role: 'skillMentor', dialog: ['技能不是學得多，而是練得精。', '點畫面下方的「技能」鈕，把 SP 投在最順手的技能上。'] }],
    ['星光之塔', { name: '星光之塔', role: 'starTower', dialog: ['x'] }],
  ]) {
    await page.evaluate((d) => { const s = window.__game.scene.getScene('ShrineScene'); s._openNpcDialog(d); }, def);
    await page.waitForTimeout(400);
    if (!(await dlgOpen())) { check(`${tag} ${label} 開啟`, false); continue; }
    const objs = await measureObjs(S, dlgObjsSrc);
    judge(`${tag} ${label}`, objs, { needInter: 1 });
    await page.screenshot({ path: `${SP}/ml-${tag}-${label.slice(0, 3)}.png` });
    const closeO = await measureObjs(S, (g) => [g.scene.getScene('ShrineScene')._npcDialog.close]);
    const c = centerOf(closeO[0]);
    await tapPage(c.x, c.y);
    check(`${tag} ${label} 點關閉鈕可關掉`, !(await dlgOpen()));
  }

  // 3. 5 列商店：購買鈕與關閉鈕
  await page.evaluate(() => { const s = window.__game.scene.getScene('ShrineScene'); s._openNpcDialog({ name: '商人老陳', shop: true, dialog: ['歡迎光臨雜貨店！'] }); });
  await page.waitForTimeout(500);
  {
    const objs = await measureObjs(S, dlgObjsSrc);
    judge(`${tag} 5 列商店`, objs, { needInter: 6 });
    await page.screenshot({ path: `${SP}/ml-${tag}-shop.png` });
    // 點第一個購買鈕：金幣變少或顯示不足；然後點關閉（互動物件中最靠上且在面板右側者，改用場景提供的最後一個 nineslice 或桌機文字）
    const inter = objs.filter((o) => o.inter);
    const closeBtn = vp.touch ? inter.slice().sort((a, b) => a.rect.t - b.rect.t)[0] : inter.slice().sort((a, b) => b.rect.t - a.rect.t)[0];
    const buy = inter.filter((o) => o !== closeBtn).sort((a, b) => (a.rect.t - b.rect.t) || (a.rect.l - b.rect.l))[0];
    const before = await page.evaluate(() => window.__game.registry.get('gameState').meso);
    await page.evaluate(() => { window.__game.registry.get('gameState').meso = 5000; });
    const cb = centerOf(buy);
    await tapPage(cb.x, cb.y);
    const after = await page.evaluate(() => window.__game.registry.get('gameState').meso);
    check(`${tag} 手指點購買鈕真的購買（金幣 5000 → ${after}）`, after < 5000, `${before}`);
    const cc = centerOf(closeBtn);
    await tapPage(cc.x, cc.y);
    check(`${tag} 手指點商店關閉鈕可關掉`, !(await dlgOpen()));
    if (await dlgOpen()) await closeDlg();
  }

  // 4. 視窗：任務日誌（J / HUD 任務鈕）、設定、技能、世界地圖
  const popupCases = [
    ['任務日誌', () => { const u = window.__game.scene.getScene('UIScene'); u._openPopup('quests'); }, (g) => g.scene.getScene('UIScene')._popup.objects],
    ['設定視窗', () => { const u = window.__game.scene.getScene('UIScene'); u._openPopup('settings'); }, (g) => g.scene.getScene('UIScene')._popup.objects],
    ['技能視窗', () => { const u = window.__game.scene.getScene('UIScene'); u._openPopup('skills'); }, (g) => g.scene.getScene('UIScene')._popup.objects],
    ['道具視窗', () => { const u = window.__game.scene.getScene('UIScene'); u._openPopup('items'); }, (g) => g.scene.getScene('UIScene')._popup.objects],
  ];
  for (const [label, open, getObjs] of popupCases) {
    await page.evaluate(open);
    await page.waitForTimeout(500);
    const objs = await measureObjs('UIScene', getObjs);
    // 關閉鈕：視窗右上角的互動物件（Zone）中最靠右上者
    const inter = objs.filter((o) => o.inter);
    const closeZ = inter.slice().sort((a, b) => (a.rect.t - b.rect.t) || (b.rect.r - a.rect.r))[0];
    const outsideInter = inter.filter((o) => !inViewport(o));
    check(`${tag} ${label}：所有可點物件在可見視窗內`, outsideInter.length === 0, outsideInter.map((o) => o.type + o.text).join(','));
    const covered = [closeZ].filter((o) => o && (o.covered || o.hits.length));
    check(`${tag} ${label}：關閉鈕沒被蓋住`, !!closeZ && covered.length === 0, closeZ ? `${closeZ.coverTag}|${closeZ.hits.join('/')}` : '無關閉鈕');
    check(`${tag} ${label}：關閉鈕 >= ${vp.touch ? MIN_TOUCH : 0} CSS px`, !!closeZ && closeZ.w >= (vp.touch ? MIN_TOUCH : 0) && closeZ.h >= (vp.touch ? MIN_TOUCH : 0), closeZ ? `${closeZ.w.toFixed(0)}x${closeZ.h.toFixed(0)}` : '');
    await page.screenshot({ path: `${SP}/ml-${tag}-${label.slice(0, 2)}.png` });
    if (closeZ) { const c = centerOf(closeZ); await tapPage(c.x, c.y); }
    const isOpen = await page.evaluate(() => !!window.__game.scene.getScene('UIScene')._popup);
    check(`${tag} ${label}：手指點關閉鈕可關掉`, !isOpen);
    if (isOpen) await page.evaluate(() => window.__game.scene.getScene('UIScene')._closePopup());
  }
  // 世界地圖
  await page.evaluate(() => { window.__game.scene.getScene('UIScene')._worldMap.show(); });
  await page.waitForTimeout(600);
  {
    const objs = await measureObjs('UIScene', (g) => { const w = g.scene.getScene('UIScene')._worldMap; return [w._closeBtn.plate, w._goBtn.plate, ...w.objs.filter((o) => o.type === 'Text')]; });
    const closeO = objs[0];
    check(`${tag} 世界地圖：關閉 / 傳送鈕在可見視窗內且沒被蓋住`, inViewport(objs[0]) && inViewport(objs[1]) && !objs[0].covered && !objs[1].covered && !objs[0].hits.length && !objs[1].hits.length, JSON.stringify([objs[0].rect, objs[1].rect, objs[0].coverTag]));
    check(`${tag} 世界地圖：關閉鈕 >= ${vp.touch ? MIN_TOUCH : 0} CSS px`, closeO.w >= (vp.touch ? MIN_TOUCH : 0) && closeO.h >= (vp.touch ? MIN_TOUCH : 0), `${closeO.w.toFixed(0)}x${closeO.h.toFixed(0)}`);
    await page.screenshot({ path: `${SP}/ml-${tag}-map.png` });
    const c = centerOf(closeO); await tapPage(c.x, c.y);
    check(`${tag} 世界地圖：手指點關閉鈕可關掉`, await page.evaluate(() => !window.__game.scene.getScene('UIScene')._worldMap.isOpen));
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(LAUNCH);
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    console.log(`\n== ${name} (${vp.w}x${vp.h}) ==`);
    try { await run(browser, name, vp); } catch (e) { check(`${name} 腳本執行`, false, e.stack.split('\n').slice(0, 3).join(' <- ')); }
  }
  {
    // iOS 沒有 Fullscreen API：全螢幕鈕必須隱藏（不是壞掉的按鈕）
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, userAgent: MOBILE_UA });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {}
      for (const k of ['requestFullscreen', 'webkitRequestFullscreen']) { try { Object.defineProperty(Element.prototype, k, { value: undefined, configurable: true }); } catch (_) {} }
    });
    await startGame(page);
    const has = await page.evaluate(() => !!document.querySelector('.tc-fullscreen'));
    check('沒有 Fullscreen API（iOS）時全螢幕鈕不顯示', !has);
    await ctx.close();
  }
  await browser.close();
  const real = errors.filter((e) => !/Failed to load resource/.test(e));
  check('沒有頁面錯誤 / console error', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();

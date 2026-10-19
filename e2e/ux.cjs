// UX 系統的 e2e：ESC 順序、存檔代碼往返、設定持久化、低血量暈影與首次死亡提醒、目標列、任務日誌、
// localStorage 不可用、手機版面（844x390）。
// 用法：PORT=8412 node e2e/ux.cjs /tmp/shots（第一個參數是截圖資料夾）
// 只跑手機 NPC 對話 / 商店 / 世界地圖的可讀性與觸控區檢查：UX_ONLY_PHONE_UI=1 PORT=8412 node e2e/ux.cjs /tmp/shots
const { chromium, executablePath: PW_EXE } = require('./pw.cjs');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
const SAVE_KEY = 'thief-legend-save-v1';
const SETTINGS_KEY = 'thief-legend-settings';
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const LAUNCH = {
  executablePath: PW_EXE,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
};
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

function watch(page, label) {
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`${label} console: ${m.text()}`); });
}

// 進入遊戲：選單 → Enter（新遊戲）→ 等地圖與 HUD 都在
async function startGame(page, { url = BASE, key = 'Enter' } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  if (key) await page.keyboard.press(key);
  await page.waitForFunction(() => window.__game.scene.isActive('SkyIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
}

const ui = (page, fn, arg) => page.evaluate(([src, a]) => {
  // eslint-disable-next-line no-new-func
  return (new Function('ui', 'game', 'a', `return (${src})(ui, game, a);`))(window.__game.scene.getScene('UIScene'), window.__game, a);
}, [fn.toString(), arg]);

// ── 手機橫放：NPC 對話框、商店、世界地圖浮層「可讀可點」─────────────────────────────
// 字級：螢幕等效 >= 12 CSS px；按鈕 / 觸控區：>= 44 CSS px；關閉鈕用真的手指點得掉。
async function phoneUiChecks(browser, vw, vh, tag) {
  const mctx = await browser.newContext({
    viewport: { width: vw, height: vh }, screen: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: MOBILE_UA,
  });
  const mp = await mctx.newPage();
  watch(mp, `phoneUi-${tag}`);
  await mp.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const cdp = await mctx.newCDPSession(mp);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await startGame(mp);
  const tapPage = async (x, y) => { await touch('touchStart', [{ x, y, id: 4 }]); await sleep(120); await touch('touchEnd', []); await sleep(350); };
  const rectOf = () => mp.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const gameToPage = (r, gx, gy) => ({ x: r.l + (gx * r.w) / 1280, y: r.t + (gy * r.h) / 720 });
  const MIN_FONT = 11.5, MIN_HIT = 43.5;   // 容許四捨五入
  // 量一組物件：文字最小螢幕字級、可互動物件的最小螢幕邊長
  const measure = (getObjs) => mp.evaluate(([src]) => {
    // eslint-disable-next-line no-new-func
    const objs = (new Function('game', `return (${src})(game);`))(window.__game);
    const cs = window.__game.scale.displaySize.width / window.__game.scale.width;
    let minFont = 1e9, minHitH = 1e9, minHitW = 1e9, texts = 0, hits = 0;
    for (const o of objs) {
      if (!o || !o.active) continue;
      if (o.type === 'Text' && o.visible && o.text) { texts++; minFont = Math.min(minFont, parseFloat(o.style.fontSize) * cs); }
      const clickable = o.input && o.input.enabled && (o.type !== 'Rectangle' || o.fillAlpha > 0.5) && o.type !== 'Zone';
      if (clickable) { hits++; minHitH = Math.min(minHitH, o.displayHeight * cs); minHitW = Math.min(minHitW, o.displayWidth * cs); }
    }
    return { cs, minFont, minHitH, minHitW, texts, hits };
  }, [getObjs.toString()]);

  // 1. 一般 NPC 對話：用手指點「互動」鈕開啟
  await mp.evaluate(() => { const s = window.__game.scene.getScene('SkyIslandScene'); s.player.setPosition(250, s.player.y); });
  await mp.waitForTimeout(600);
  const ic = await mp.evaluate(() => { const r = document.querySelector('.tc-interact').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await tapPage(ic.x, ic.y);
  await mp.waitForTimeout(500);
  check(`${tag} 手機：點互動鈕開啟 NPC 對話`, await mp.evaluate(() => !!window.__game.scene.getScene('SkyIslandScene')._npcDialog));
  const dlgObjs = () => { const d = window.__game.scene.getScene('SkyIslandScene')._npcDialog; return [d.title, d.msgText, d.close, ...(d.extras || [])]; };
  let m = await measure(dlgObjs);
  check(`${tag} 手機：NPC 對話文字 >= 12 CSS px`, m.minFont >= MIN_FONT, `最小 ${m.minFont.toFixed(1)}px（${m.texts} 段）`);
  check(`${tag} 手機：NPC 對話關閉鈕觸控區 >= 44 CSS px`, m.hits >= 1 && m.minHitH >= MIN_HIT, `高 ${m.minHitH.toFixed(1)} 寬 ${m.minHitW.toFixed(1)}`);
  const inside = await mp.evaluate(() => {
    const s = window.__game.scene.getScene('SkyIslandScene'); const d = s._npcDialog; const cam = s.cameras.main;
    const b = d.bg; const c = d.close;
    return { top: b.y - cam.scrollY, bottom: b.y + b.height - cam.scrollY, closeBottom: c.y + c.displayHeight / 2 - cam.scrollY, msgBottom: d.msgText.y + d.msgText.height - cam.scrollY, closeTop: c.y - c.displayHeight / 2 - cam.scrollY };
  });
  check(`${tag} 手機：對話面板在 HUD 列之上的畫面內，文字不壓到關閉鈕`, inside.top >= 0 && inside.bottom <= 600 && inside.closeBottom <= inside.bottom && inside.msgBottom <= inside.closeTop + 2, JSON.stringify(inside));
  await mp.screenshot({ path: `${SP}/ux-m-${tag}-npc.png` });
  // 用手指點關閉鈕
  let r = await rectOf();
  let cp = await mp.evaluate(() => { const s = window.__game.scene.getScene('SkyIslandScene'); const c = s._npcDialog.close; return { x: c.x - s.cameras.main.scrollX, y: c.y - s.cameras.main.scrollY }; });
  let pp = gameToPage(r, cp.x, cp.y);
  await tapPage(pp.x, pp.y);
  check(`${tag} 手機：手指點關閉鈕可關掉 NPC 對話`, await mp.evaluate(() => !window.__game.scene.getScene('SkyIslandScene')._npcDialog));

  // 2. 帶選項的對話（影之長老選職業）
  await mp.evaluate(() => {
    const s = window.__game.scene.getScene('SkyIslandScene'); const gs = window.__game.registry.get('gameState');
    gs.job = 'thief'; gs.quests = gs.quests || { active: [], completed: [] };
    gs.quests.active = [{ id: 'job_choose', progress: 0 }];
    s._openNpcDialog({ role: 'jobAdvisor', name: '影之長老' });
  });
  await mp.waitForTimeout(500);
  m = await measure(dlgObjs);
  check(`${tag} 手機：選項對話字級 >= 12、選項與關閉鈕 >= 44 CSS px`, m.minFont >= MIN_FONT && m.minHitH >= MIN_HIT && m.hits >= 3, `字 ${m.minFont.toFixed(1)} 高 ${m.minHitH.toFixed(1)} 可點 ${m.hits}`);
  const ins2 = await mp.evaluate(() => { const s = window.__game.scene.getScene('SkyIslandScene'); const b = s._npcDialog.bg; return { top: b.y - s.cameras.main.scrollY, bottom: b.y + b.height - s.cameras.main.scrollY }; });
  check(`${tag} 手機：選項對話面板在 HUD 列之上的畫面內`, ins2.top >= 0 && ins2.bottom <= 600, JSON.stringify(ins2));
  await mp.screenshot({ path: `${SP}/ux-m-${tag}-choices.png` });
  await mp.evaluate(() => window.__game.scene.getScene('SkyIslandScene')._closeNpcDialog());

  // 3. 商店
  await mp.evaluate(() => window.__game.scene.getScene('SkyIslandScene')._openNpcDialog({ name: '雜貨商', shop: true, dialog: ['歡迎光臨！'] }));
  await mp.waitForTimeout(500);
  const shopObjs = () => window.__game.scene.getScene('SkyIslandScene')._npcDialog.objects;
  m = await measure(shopObjs);
  check(`${tag} 手機：商店文字 >= 12 CSS px，購買 / 關閉鈕 >= 44 CSS px`, m.minFont >= MIN_FONT && m.minHitH >= MIN_HIT, `字 ${m.minFont.toFixed(1)} 高 ${m.minHitH.toFixed(1)}`);
  const ins3 = await mp.evaluate(() => { const o = window.__game.scene.getScene('SkyIslandScene')._npcDialog.objects[0]; return { top: o.y, bottom: o.y + o.height }; });
  check(`${tag} 手機：商店面板在 HUD 列之上的畫面內`, ins3.top >= 0 && ins3.bottom <= 600, JSON.stringify(ins3));
  await mp.screenshot({ path: `${SP}/ux-m-${tag}-shop.png` });
  // 關閉鈕 = 最後一塊 nineslice 底板
  cp = await mp.evaluate(() => { const o = window.__game.scene.getScene('SkyIslandScene')._npcDialog.objects; const plates = o.filter((x) => x.type === 'NineSlice'); const c = plates[plates.length - 1]; return { x: c.x, y: c.y }; });
  r = await rectOf(); pp = gameToPage(r, cp.x, cp.y);
  await tapPage(pp.x, pp.y);
  check(`${tag} 手機：手指點商店關閉鈕可關掉`, await mp.evaluate(() => !window.__game.scene.getScene('SkyIslandScene')._npcDialog));

  // 4. 世界地圖浮層
  await mp.evaluate(() => { window.__game.scene.getScene('UIScene')._worldMap.show(); });
  await mp.waitForTimeout(600);
  const mapObjs = () => [...window.__game.scene.getScene('UIScene')._worldMap.objs];
  m = await measure(mapObjs);
  check(`${tag} 手機：世界地圖文字 >= 12 CSS px`, m.minFont >= MIN_FONT, `最小 ${m.minFont.toFixed(1)}px（${m.texts} 段）`);
  const hit = await mp.evaluate(() => {
    const w = window.__game.scene.getScene('UIScene')._worldMap; const cs = window.__game.scale.displaySize.width / window.__game.scale.width;
    const c = w._closeBtn.plate; const g = w._goBtn.plate;
    return { closeH: c.displayHeight * cs, closeW: c.displayWidth * cs, goH: g.displayHeight * cs, goW: g.displayWidth * cs };
  });
  check(`${tag} 手機：世界地圖「關閉」「傳送」鈕 >= 44 CSS px`, hit.closeH >= MIN_HIT && hit.closeW >= MIN_HIT && hit.goH >= MIN_HIT && hit.goW >= MIN_HIT, JSON.stringify(hit));
  const fit = await mp.evaluate(() => {
    const w = window.__game.scene.getScene('UIScene')._worldMap; const bad = [];
    for (const o of w.objs) { if (o.type === 'Text' && o.visible) { const b = o.getBounds(); if (b.left < 0 || b.right > 1280 || b.top < 0 || b.bottom > 720) bad.push(o.text); } }
    const lab = w.nodes.filter((n) => !n.side).map((n) => n.label.getBounds());
    let overlap = 0;
    for (let i = 0; i < lab.length; i++) {
      for (let j = i + 1; j < lab.length; j++) {
        if (lab[i].left < lab[j].right && lab[j].left < lab[i].right && lab[i].top < lab[j].bottom && lab[j].top < lab[i].bottom) overlap++;
      }
    }
    return { bad, overlap };
  });
  check(`${tag} 手機：世界地圖文字都在畫面內、節點名稱互不重疊`, fit.bad.length === 0 && fit.overlap === 0, JSON.stringify(fit));
  await mp.screenshot({ path: `${SP}/ux-m-${tag}-map.png` });
  // 手指點在離節點 20 遊戲像素外（手指不準）→ 選到最近的節點；點右側支線列 → 選取
  const sel = await mp.evaluate(() => {
    const w = window.__game.scene.getScene('UIScene')._worldMap;
    const n = w.nodes.filter((o) => !o.side)[5]; const side = w.nodes.find((o) => o.side);
    return { key: n.key, x: n.x, y: n.y, sideKey: side.key, sx: side.x + 100, sy: side.y };
  });
  r = await rectOf();
  pp = gameToPage(r, sel.x + 14, sel.y + 14);
  await tapPage(pp.x, pp.y);
  check(`${tag} 手機：手指點在節點旁邊也能選到最近的節點`, await mp.evaluate(() => window.__game.scene.getScene('UIScene')._worldMap.selected) === sel.key);
  pp = gameToPage(r, sel.sx, sel.sy);
  await tapPage(pp.x, pp.y);
  check(`${tag} 手機：點支線地圖整列可選取`, await mp.evaluate(() => window.__game.scene.getScene('UIScene')._worldMap.selected) === sel.sideKey);
  await mp.screenshot({ path: `${SP}/ux-m-${tag}-map-sel.png` });
  cp = await mp.evaluate(() => { const c = window.__game.scene.getScene('UIScene')._worldMap._closeBtn.plate; return { x: c.x, y: c.y }; });
  pp = gameToPage(r, cp.x, cp.y);
  await tapPage(pp.x, pp.y);
  check(`${tag} 手機：手指點世界地圖關閉鈕可關掉`, await mp.evaluate(() => !window.__game.scene.getScene('UIScene')._worldMap.isOpen));
  await mctx.close();
}

(async () => {
  const browser = await chromium.launch(LAUNCH);
  if (process.env.UX_ONLY_PHONE_UI) {
    await phoneUiChecks(browser, 844, 390, 'p844');
    await phoneUiChecks(browser, 667, 375, 'p667');
    const real = errors.filter((e) => !/Failed to load resource/.test(e));
    check('全程沒有 JS 錯誤', real.length === 0, real.slice(0, 5).join(' | '));
    console.log(fails === 0 ? 'ALL PASS' : `FAILED: ${fails}`);
    await browser.close();
    process.exit(fails ? 1 : 0);
  }

  // ══ 桌機 1280x720 ═══════════════════════════════════════════════════════════
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  watch(page, 'desktop');
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('__t')) { localStorage.setItem('thief-legend-tutorial-seen', '1'); } } catch (_) {} });
  await startGame(page);
  await page.screenshot({ path: `${SP}/ux-d-game.png` });

  // 目標列（還沒和任何人說過話）
  const objText = () => page.evaluate(() => window.__game.scene.getScene('UIScene')._lastObjText);
  let obj = await objText();
  check('新遊戲的目標列：找島嶼義工接史萊姆獵手', /島嶼義工/.test(obj) && /史萊姆獵手/.test(obj), obj);

  // ── 1. ESC：先關最上層，不會同一次按鍵又打開暫停 ─────────────────────────────
  await page.evaluate(() => { const sc = window.__game.scene.getScene('SkyIslandScene'); sc.player.setPosition(250, sc.player.y); });
  await page.waitForTimeout(500);
  await page.keyboard.press('f'); await page.waitForTimeout(500);
  check('靠近 NPC 按 F 開啟對話', await page.evaluate(() => !!window.__game.scene.getScene('SkyIslandScene')._npcDialog));
  await page.screenshot({ path: `${SP}/ux-d-dialog.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  let st = await page.evaluate(() => ({ dialog: !!window.__game.scene.getScene('SkyIslandScene')._npcDialog, paused: window.__game.scene.isPaused('SkyIslandScene'), uiPaused: window.__game.scene.getScene('UIScene')._isPaused }));
  check('ESC 關閉 NPC 對話，且不會同時暫停', !st.dialog && !st.paused && !st.uiPaused, JSON.stringify(st));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  check('對話關掉後再按一次 ESC 才進入暫停', await page.evaluate(() => window.__game.scene.isPaused('SkyIslandScene')));
  await page.screenshot({ path: `${SP}/ux-d-pause.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  check('暫停中按 ESC 回到遊戲', !(await page.evaluate(() => window.__game.scene.isPaused('SkyIslandScene'))));

  // 視窗開著時 ESC 先關視窗
  await ui(page, (u) => u._openPopup('skills'));
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  st = await page.evaluate(() => ({ popup: !!window.__game.scene.getScene('UIScene')._popup, paused: window.__game.scene.isPaused('SkyIslandScene') }));
  check('技能視窗開著按 ESC：只關視窗、不暫停', !st.popup && !st.paused, JSON.stringify(st));
  // 手機暫停鈕是合成的 ESC：同樣的順序（以合成 KeyboardEvent 驗證）
  await page.evaluate(() => { const sc = window.__game.scene.getScene('SkyIslandScene'); sc.player.setPosition(250, sc.player.y); });
  await page.waitForTimeout(400);
  await page.keyboard.press('f'); await page.waitForTimeout(400);
  const synthEsc = (type) => page.evaluate((t) => {
    const ev = new KeyboardEvent(t, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => 27 });   // 與 touchControls 的合成事件相同
    Object.defineProperty(ev, 'which', { get: () => 27 });
    window.dispatchEvent(ev);
  }, type);
  await synthEsc('keydown');
  await page.waitForTimeout(100);
  await synthEsc('keyup');
  await page.waitForTimeout(700);
  st = await page.evaluate(() => ({ dialog: !!window.__game.scene.getScene('SkyIslandScene')._npcDialog, paused: window.__game.scene.isPaused('SkyIslandScene') }));
  check('合成 ESC（觸控暫停鈕）關對話也不會暫停', !st.dialog && !st.paused, JSON.stringify(st));

  // ── 2. 目標列：隨任務進度改變 ─────────────────────────────────────────────────
  await page.evaluate(() => { const sc = window.__game.scene.getScene('SkyIslandScene'); sc.player.setPosition(250, sc.player.y); });
  await page.waitForTimeout(400);
  await page.keyboard.press('f'); await page.waitForTimeout(500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(900);
  obj = await objText();
  check('接任務後目標列變成進度「擊敗果凍精 0/5」', /擊敗果凍精 0\/5/.test(obj), obj);
  await page.evaluate(() => { const a = window.__game.registry.get('gameState').quests.active; a.find((q) => q.id === 'slime_hunt').progress = 3; });
  await page.waitForFunction(() => /3\/5/.test(window.__game.scene.getScene('UIScene')._lastObjText || ''), null, { timeout: 5000 }).catch(() => {});
  obj = await objText();
  check('進度推進後目標列跟著更新「3/5」', /擊敗果凍精 3\/5/.test(obj), obj);
  await page.screenshot({ path: `${SP}/ux-d-objective.png` });
  await page.evaluate(() => { const qs = window.__game.registry.get('gameState').quests; const i = qs.active.findIndex((q) => q.id === 'slime_hunt'); qs.completed.push(qs.active.splice(i, 1)[0].id); });
  await page.waitForFunction(() => !/擊敗果凍精/.test(window.__game.scene.getScene('UIScene')._lastObjText || ''), null, { timeout: 5000 }).catch(() => {});
  obj = await objText();
  check('任務完成後目標列改指向下一件事', obj && !/擊敗果凍精/.test(obj), obj);

  // ── 3. 任務日誌：J 與 HUD 按鈕 ───────────────────────────────────────────────
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); if (!gs.quests.active.some((q) => q.id === 'snail_collect')) gs.quests.active.push({ id: 'snail_collect', progress: 1 }); });
  await page.waitForTimeout(400);
  await page.keyboard.press('j'); await page.waitForTimeout(600);
  check('按 J 開啟任務日誌', await page.evaluate(() => { const p = window.__game.scene.getScene('UIScene')._popup; return !!p && p.type === 'quests'; }));
  await page.screenshot({ path: `${SP}/ux-d-questlog.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  st = await page.evaluate(() => ({ popup: !!window.__game.scene.getScene('UIScene')._popup, paused: window.__game.scene.isPaused('SkyIslandScene') }));
  check('任務日誌按 ESC 關閉、不暫停', !st.popup && !st.paused, JSON.stringify(st));
  await page.mouse.click(1076, 671);   // HUD「任務」鈕
  await page.waitForTimeout(600);
  check('HUD 任務鈕開啟任務日誌', await page.evaluate(() => { const p = window.__game.scene.getScene('UIScene')._popup; return !!p && p.type === 'quests'; }));
  await page.keyboard.press('j'); await page.waitForTimeout(500);
  check('再按 J 關閉任務日誌', !(await page.evaluate(() => !!window.__game.scene.getScene('UIScene')._popup)));

  // ── 4. 設定視窗：滑桿 / 開關 / 介面大小，重新載入後保留 ───────────────────────
  await page.mouse.click(1230, 671);   // HUD「設定」鈕
  await page.waitForTimeout(700);
  check('HUD 設定鈕開啟設定視窗', await page.evaluate(() => { const p = window.__game.scene.getScene('UIScene')._popup; return !!p && p.type === 'settings'; }));
  await page.screenshot({ path: `${SP}/ux-d-settings.png` });
  // 音樂滑桿拖到約 30%（軌道 x 296–596，y 152）
  await page.mouse.move(296 + 210, 152); await page.mouse.down(); await page.mouse.move(296 + 90, 152, { steps: 5 }); await page.mouse.up();
  // 音效滑桿拖到 40%（y 218）
  await page.mouse.move(296 + 300, 218); await page.mouse.down(); await page.mouse.move(296 + 120, 218, { steps: 5 }); await page.mouse.up();
  await page.mouse.click(446, 295);    // 畫面震動 → 關
  await page.mouse.click(446, 339);    // 畫面閃光 → 關
  await page.mouse.click(446, 383);    // 傷害數字 → 關
  await page.mouse.click(446, 427);    // 減少動態 → 開
  await page.mouse.click(556, 477);    // 介面大小 → 大
  await page.waitForTimeout(500);
  let cfg = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SETTINGS_KEY);
  check('設定寫進獨立的 localStorage key', !!cfg && cfg.musicVolume >= 25 && cfg.musicVolume <= 35 && cfg.sfxVolume >= 35 && cfg.sfxVolume <= 45, JSON.stringify(cfg));
  check('開關與介面大小生效', cfg && cfg.shake === false && cfg.flash === false && cfg.damageNumbers === false && cfg.reducedMotion === true && cfg.uiScale === 'large', JSON.stringify(cfg));
  const live = await page.evaluate(() => ({
    musicGain: window.__audio._musicGain && +window.__audio._musicGain.gain.value.toFixed(2), sfx: window.__audio._sfxScale,
    shake: (() => { const cam = window.__game.scene.getScene('SkyIslandScene').cameras.main; cam.shakeEffect.reset(); cam.shake(200, 0.02); return cam.shakeEffect.isRunning; })(),
    flash: (() => { const cam = window.__game.scene.getScene('SkyIslandScene').cameras.main; cam.flashEffect.reset(); cam.flash(200, 255, 255, 255); return cam.flashEffect.isRunning; })(),
    fontPx: parseFloat(window.__game.scene.getScene('UIScene')._levelText.style.fontSize),
  }));
  check('音量滑桿套到音訊節點（音樂約 0.3、音效約 0.4）', live.musicGain > 0.2 && live.musicGain < 0.4 && live.sfx > 0.3 && live.sfx < 0.5, JSON.stringify(live));
  check('關閉震動 / 閃光後，相機的震動與閃光不會啟動', live.shake === false && live.flash === false, JSON.stringify(live));
  check('介面大小「大」讓 HUD 文字變大', live.fontPx > 14, `Lv 文字 ${live.fontPx}px`);
  await page.screenshot({ path: `${SP}/ux-d-settings-changed.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const reloaded = await page.evaluate(() => ({ s: { ...window.__settings.get() }, gain: window.__audio._musicGain && +window.__audio._musicGain.gain.value.toFixed(2) }));
  check('重新載入後設定仍在（含音量節點）', reloaded.s.shake === false && reloaded.s.reducedMotion === true && reloaded.s.uiScale === 'large' && reloaded.s.musicVolume >= 25 && reloaded.s.musicVolume <= 35 && reloaded.gain < 0.4, JSON.stringify(reloaded));
  await page.screenshot({ path: `${SP}/ux-d-menu.png` });
  // 重設設定
  await page.evaluate(() => window.__settings.reset());
  check('重設設定回到預設值', await page.evaluate(() => { const s = window.__settings.get(); return s.musicVolume === 70 && s.sfxVolume === 100 && s.shake && s.flash && s.damageNumbers && !s.reducedMotion && s.uiScale === 'normal'; }));

  // ── 5. 低血量暈影與首次死亡提醒 ──────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');   // 有存檔 → 繼續遊戲
  await page.waitForFunction(() => window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const ui = window.__game.scene.getScene('UIScene');
    window.__noticeCount = 0;
    const orig = ui._showDeathNotice.bind(ui);
    ui._showDeathNotice = () => { window.__noticeCount++; orig(); };
    const gs = window.__game.registry.get('gameState');
    gs.equipment.weapon = { slot: 'weapon', name: '短刀', displayName: '短刀', atk: 5, hp: 0, mp: 0, speed: 0, rarity: 'common' };
    gs.hp = Math.floor(gs.maxHp * 0.28);
    window.__game.registry.events.emit('changedata-hp', null, gs.hp);
  });
  await page.waitForTimeout(500);
  let danger = await ui(page, (u, g) => ({ low: u._lowHp, notice: !!(u._deathNotice && u._deathNotice.active), warned: g.registry.get('gameState').deathWarned === true }));
  check('HP 28%（未達 25%）：先出現一次提醒、還沒有暈影', danger.notice && danger.warned && !danger.low, JSON.stringify(danger));
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = Math.floor(gs.maxHp * 0.15); window.__game.registry.events.emit('changedata-hp', null, gs.hp); });
  await page.waitForTimeout(700);
  danger = await ui(page, (u) => ({ low: u._lowHp, vis: !!(u._vignette && u._vignette.visible), pulse: !!u._lowHpTween }));
  check('HP 15%：紅色邊緣暈影顯示並脈動', danger.low && danger.vis && danger.pulse, JSON.stringify(danger));
  await page.screenshot({ path: `${SP}/ux-d-lowhp.png` });
  await page.evaluate(() => window.__settings.set({ reducedMotion: true }));
  await page.waitForTimeout(300);
  danger = await ui(page, (u) => ({ vis: !!(u._vignette && u._vignette.visible), pulse: !!u._lowHpTween, alpha: +u._vignette.alpha.toFixed(2) }));
  check('減少動態：暈影仍在，但不脈動', danger.vis && !danger.pulse && danger.alpha > 0.5, JSON.stringify(danger));
  await page.evaluate(() => window.__settings.set({ reducedMotion: false }));
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; window.__game.registry.events.emit('changedata-hp', null, gs.hp); });
  await page.waitForTimeout(300);
  check('補滿 HP 後暈影消失', !(await ui(page, (u) => u._lowHp || (u._vignette && u._vignette.visible))));
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = 5; window.__game.registry.events.emit('changedata-hp', null, gs.hp); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; window.__game.registry.events.emit('changedata-hp', null, gs.hp); gs.hp = 20; window.__game.registry.events.emit('changedata-hp', null, gs.hp); });
  await page.waitForTimeout(400);
  check('提醒整個存檔只出現一次（再次低血量不會重複）', (await page.evaluate(() => window.__noticeCount)) === 1);
  const savedFlag = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).state.deathWarned, SAVE_KEY);
  check('提醒過的旗標已寫進存檔', savedFlag === true);
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; window.__game.registry.events.emit('changedata-hp', null, gs.hp); });

  // ── 6. 存檔代碼：匯出 → 全新設定檔匯入往返 ───────────────────────────────────
  await page.evaluate(() => {
    const gs = window.__game.registry.get('gameState');
    gs.level = 12; gs.meso = 4321; gs.killCount = 77;
  });
  await ui(page, (u) => u._openSaveCode());
  await page.waitForSelector('.sd-text', { timeout: 5000 });
  const code = await page.inputValue('.sd-text');
  check('遊戲中「存檔代碼」視窗顯示 TL1 代碼', /^TL1:[0-9a-f]{8}:[A-Za-z0-9_-]+$/.test(code), code.slice(0, 20));
  await page.waitForFunction(() => window.__game.scene.isPaused('SkyIslandScene'), null, { timeout: 3000 }).catch(() => {});
  check('開著視窗時遊戲被暫停（不會邊複製邊被打）', await page.evaluate(() => window.__game.scene.isPaused('SkyIslandScene')));
  await page.screenshot({ path: `${SP}/ux-d-savecode.png` });
  // 剪貼簿：授權後複製；沒授權時走後備（全選提示）
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('text=複製代碼');
  await page.waitForTimeout(500);
  const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  check('複製鈕把代碼放進剪貼簿', copied === code);
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  await page.click('text=複製代碼');
  await page.waitForTimeout(400);
  const fb = await page.evaluate(() => ({ status: document.querySelector('.sd-status').textContent, sel: document.querySelector('.sd-text').selectionEnd - document.querySelector('.sd-text').selectionStart }));
  check('剪貼簿被拒絕時：代碼被全選並提示手動複製', fb.sel > 100 && /(Ctrl\+C|拷貝|已複製)/.test(fb.status), JSON.stringify(fb));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  check('視窗按 ESC 關閉並恢復遊戲，且沒有順便暫停', !(await page.$('.sd-backdrop')) && !(await page.evaluate(() => window.__game.scene.isPaused('SkyIslandScene'))));

  // 全新設定檔（新的瀏覽器 context）匯入
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const p2 = await ctx2.newPage();
  watch(p2, 'fresh');
  await p2.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  await p2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p2.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await p2.waitForTimeout(800);
  check('全新設定檔沒有存檔', (await p2.evaluate((k) => localStorage.getItem(k), SAVE_KEY)) === null);
  await p2.mouse.click(640, 676);   // 匯入存檔（沒有存檔時只有一個連結）
  await p2.waitForSelector('.sd-text', { timeout: 5000 });
  await p2.fill('.sd-text', 'TL1:00000000:亂寫的內容');
  await p2.click('.sd-btn.sd-primary');
  await p2.waitForTimeout(300);
  check('壞代碼被拒絕並說明原因', /匯入失敗/.test(await p2.textContent('.sd-status')) && (await p2.evaluate((k) => localStorage.getItem(k), SAVE_KEY)) === null);
  await p2.fill('.sd-text', code.slice(0, -6));   // 少複製一段
  await p2.click('.sd-btn.sd-primary');
  await p2.waitForTimeout(300);
  check('少複製一段（檢查碼不符）被拒絕', /檢查碼/.test(await p2.textContent('.sd-status')));
  await p2.fill('.sd-text', `\n ${code.slice(0, 50)}\n${code.slice(50)} \n`);   // 夾帶換行與空白仍可
  await p2.click('.sd-btn.sd-primary');
  await p2.waitForFunction((k) => localStorage.getItem(k) !== null, SAVE_KEY, { timeout: 5000 });
  await p2.waitForTimeout(1200);
  const imported = await p2.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, SAVE_KEY);
  check('代碼匯入後存檔與原進度一致（Lv12、金幣、擊殺、地圖）', imported.level === 12 && imported.meso === 4321 && imported.killCount === 77 && imported.currentMap === 'sky', JSON.stringify({ l: imported.level, m: imported.meso, k: imported.killCount, map: imported.currentMap }));
  check('匯入後選單出現「繼續遊戲」', await p2.evaluate(() => /Lv\.12/.test(window.__game.scene.getScene('MenuScene').children.list.filter((o) => o.type === 'Text').map((o) => o.text).join('|'))));
  await p2.screenshot({ path: `${SP}/ux-d-menu-imported.png` });
  await p2.keyboard.press('Enter');
  await p2.waitForFunction(() => window.__game.scene.isActive('SkyIslandScene'), null, { timeout: 30000 }).catch(() => {});
  await p2.waitForTimeout(1500);
  check('繼續遊戲後進度與代碼相同', await p2.evaluate(() => { const gs = window.__game.registry.get('gameState'); return gs.level === 12 && gs.meso === 4321 && gs.killCount === 77 && gs.currentMap === 'sky'; }));
  await ctx2.close();

  // ── 7. localStorage 不可用：照常啟動，顯示「未存檔」，仍可匯出代碼 ─────────────
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p3 = await ctx3.newPage();
  watch(p3, 'nostorage');
  await p3.addInitScript(() => {
    const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny });
  });
  await p3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p3.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await p3.waitForTimeout(1000);
  check('沒有 localStorage：選單照常顯示並出現「未存檔」', await p3.evaluate(() => { const m = window.__game.scene.getScene('MenuScene'); return !!m._unsavedBadge && /未存檔/.test(m._unsavedBadge.text); }));
  await p3.screenshot({ path: `${SP}/ux-d-nostorage-menu.png` });
  await p3.keyboard.press('Enter');
  await p3.waitForTimeout(1500);
  if (await p3.evaluate(() => window.__game.scene.isActive('TutorialScene'))) { await p3.keyboard.press('Escape'); await p3.waitForTimeout(1200); }
  await p3.waitForFunction(() => window.__game.scene.isActive('SkyIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 }).catch(() => {});
  await p3.waitForTimeout(1500);
  const ns = await p3.evaluate(() => ({ playing: window.__game.scene.isActive('SkyIslandScene'), unsaved: window.__game.scene.getScene('UIScene')._unsavedBtn.visible, settingsOk: window.__settings.get().musicVolume === 70 }));
  check('沒有 localStorage：遊戲可以開始，HUD 常駐「未存檔」', ns.playing && ns.unsaved, JSON.stringify(ns));
  await p3.evaluate(() => window.__settings.set({ musicVolume: 10 }));
  check('沒有 localStorage：設定仍可在記憶體內修改', await p3.evaluate(() => window.__settings.get().musicVolume === 10 && window.__settings.persistent === false));
  await p3.screenshot({ path: `${SP}/ux-d-nostorage-game.png` });
  await p3.mouse.click(640, 52);   // 點「未存檔」提示 → 存檔代碼視窗
  await p3.waitForSelector('.sd-text', { timeout: 5000 });
  const memCode = await p3.inputValue('.sd-text');
  check('沒有 localStorage：點「未存檔」仍能取得存檔代碼（記憶體後備）並有警告', /^TL1:/.test(memCode) && /無法保存/.test(await p3.textContent('.sd-status')), memCode.slice(0, 12));
  await p3.screenshot({ path: `${SP}/ux-d-nostorage-code.png` });
  await ctx3.close();
  await ctx.close();

  // ══ 手機橫放 844x390 ═════════════════════════════════════════════════════════
  const mctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: MOBILE_UA,
  });
  const mp = await mctx.newPage();
  watch(mp, 'mobile');
  await mp.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const cdp = await mctx.newCDPSession(mp);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await mp.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await mp.waitForFunction(() => window.__game && window.__game.scene.isActive('MenuScene'), null, { timeout: 30000 });
  await mp.waitForTimeout(1000);
  const rect = await mp.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const toPage = (x, y) => ({ x: rect.l + (x * rect.w) / 1280, y: rect.t + (y * rect.h) / 720 });
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await touch('touchStart', [{ x: p.x, y: p.y, id: 3 }]); await sleep(120); await touch('touchEnd', []); await sleep(250); };
  check('手機橫放：畫布縮放約 0.54', Math.abs(rect.w / 1280 - 0.54) < 0.05, `${(rect.w / 1280).toFixed(2)}`);
  await tap(640, 530);   // 開始遊戲
  await mp.waitForFunction(() => window.__game.scene.isActive('SkyIslandScene') && window.__game.scene.isActive('UIScene'), null, { timeout: 30000 });
  await mp.waitForTimeout(1500);
  await mp.evaluate(() => { window.__setJob('assassin', 24); });
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: `${SP}/ux-m-game.png` });

  // 字級：HUD 文字在螢幕上不會小到看不見
  const fonts = await ui(mp, (u) => {
    const scale = u.scale.displaySize.width / u.scale.width;
    const out = (u._hudTexts || []).filter((r) => r.t.active && r.t.visible).map((r) => ({ base: r.base, css: parseFloat(r.t.style.fontSize) * scale }));
    return { scale, min: Math.min(...out.map((o) => o.css)), minBase12: Math.min(...out.filter((o) => o.base >= 12).map((o) => o.css)), count: out.length };
  });
  check('手機：HUD 文字螢幕大小下限提高（最小 ≥ 7 CSS px，12px 字 ≥ 9）', fonts.min >= 7 && fonts.minBase12 >= 8.9, JSON.stringify(fonts));

  // 冷卻遮罩：施放技能後觸控鈕出現掃描遮罩與秒數
  const center = (sel) => mp.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, sel);
  const press = async (sel) => { const c = await center(sel); await touch('touchStart', [{ x: c.x, y: c.y, id: 9 }]); await sleep(170); await touch('touchEnd', []); await sleep(250); };
  await press('.tc-c');   // 暗殺 5 秒冷卻
  await mp.waitForTimeout(400);
  const cd = await mp.evaluate(() => {
    const b = document.querySelector('.tc-c');
    const sweep = b.querySelector('.tc-cd');
    return { cooling: b.classList.contains('tc-cooling'), display: getComputedStyle(sweep).display, done: sweep.style.getPropertyValue('--tc-done'), num: b.querySelector('.tc-cdnum').textContent, bg: getComputedStyle(sweep).backgroundImage.slice(0, 20) };
  });
  check('手機：施放技能後，觸控技能鈕顯示冷卻掃描遮罩與剩餘秒數', cd.cooling && cd.display === 'block' && /conic/.test(cd.bg) && /^\d+$/.test(cd.num), JSON.stringify(cd));
  await mp.screenshot({ path: `${SP}/ux-m-cooldown.png` });
  await mp.waitForFunction(() => !document.querySelector('.tc-c').classList.contains('tc-cooling'), null, { timeout: 12000 }).catch(() => {});
  check('冷卻結束後遮罩消失', await mp.evaluate(() => !document.querySelector('.tc-c').classList.contains('tc-cooling')));
  // MP 不足：按鈕變灰
  await mp.evaluate(() => { window.__game.registry.get('gameState').mp = 0; });
  await mp.waitForTimeout(400);
  check('MP 不足的技能鈕變灰', await mp.evaluate(() => document.querySelector('.tc-c').classList.contains('tc-nomp')));
  await mp.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.mp = gs.maxMp; });

  // 技能視窗：觸控按鈕讓開，「+」點得到
  await tap(1076, 633);   // HUD「道具」鈕旁邊的列：技能鈕在 (1230, 633)
  await mp.evaluate(() => window.__game.scene.getScene('UIScene')._closePopup());
  await tap(1230, 633);   // 技能
  await mp.waitForTimeout(700);
  const modal = await mp.evaluate(() => ({
    type: window.__game.scene.getScene('UIScene')._popup && window.__game.scene.getScene('UIScene')._popup.type,
    cls: document.getElementById('touch-controls').classList.contains('tc-modal'),
    jump: document.querySelector('.tc-jump').offsetParent === null ? 'none' : 'shown', stick: document.querySelector('.tc-stick').offsetParent === null ? 'none' : 'shown',
    atk: document.querySelector('.tc-attack').offsetParent === null ? 'none' : 'shown', pause: document.querySelector('.tc-pause').offsetParent === null ? 'none' : 'shown',
    k: window.__game.scene.getScene('UIScene')._popup.container ? window.__game.scene.getScene('UIScene')._popup.container.scaleX : 1,
  }));
  check('手機：開技能視窗時，跳 / 搖桿 / 攻擊鈕隱藏，暫停鈕保留', modal.type === 'skills' && modal.cls && modal.jump === 'none' && modal.stick === 'none' && modal.atk === 'none' && modal.pause !== 'none', JSON.stringify(modal));
  // 技能視窗在觸控裝置上標題列加高（關閉鈕 >= 44 CSS px），可用高度固定，所以倍率剛好落在 1.3
  check('手機：技能視窗整體放大', modal.k >= 1.3, `scale ${modal.k}`);
  await mp.screenshot({ path: `${SP}/ux-m-skills.png` });
  // 找出第一個「+」的位置並用手指點
  const plus = await mp.evaluate(() => {
    const ui = window.__game.scene.getScene('UIScene');
    const zones = ui._popup.objects.filter((o) => o.type === 'Zone' && o.input && o.width === 26 && o.height === 22);
    if (!zones.length) return null;
    const z = zones[0]; const m = z.getWorldTransformMatrix();
    const k = ui._popup.container ? ui._popup.container.scaleX : 1;
    return { x: m.tx + (z.width * k) / 2, y: m.ty + (z.height * k) / 2, sp: window.__game.registry.get('gameState').skillPoints, lv: { ...window.__game.registry.get('gameState').skillLevels } };
  });
  check('手機：技能視窗找得到可點的「+」', !!plus);
  if (plus) {
    await tap(plus.x, plus.y);
    await mp.waitForTimeout(500);
    const after = await mp.evaluate(() => { const gs = window.__game.registry.get('gameState'); return { sp: gs.skillPoints, lv: { ...gs.skillLevels } }; });
    check('手機：用手指點「+」會升級技能並扣 SP', after.sp === plus.sp - 1, JSON.stringify({ before: plus.sp, after: after.sp }));
  }
  // 暫停鈕（合成 ESC）：先關視窗，不暫停
  const pc = await center('.tc-pause');
  await touch('touchStart', [{ x: pc.x, y: pc.y, id: 5 }]); await sleep(150); await touch('touchEnd', []); await sleep(700);
  st = await mp.evaluate(() => ({ popup: !!window.__game.scene.getScene('UIScene')._popup, paused: window.__game.scene.isPaused('SkyIslandScene') }));
  check('手機：暫停鈕在視窗開著時只關視窗、不暫停', !st.popup && !st.paused, JSON.stringify(st));
  check('視窗關閉後觸控按鈕恢復', await mp.evaluate(() => document.querySelector('.tc-jump').offsetParent !== null));
  // 設定視窗與任務日誌的手機截圖
  await mp.evaluate(() => window.__game.scene.getScene('UIScene')._openPopup('settings'));
  await mp.waitForTimeout(600);
  await mp.screenshot({ path: `${SP}/ux-m-settings.png` });
  await mp.evaluate(() => window.__game.scene.getScene('UIScene')._openPopup('quests'));
  await mp.waitForTimeout(600);
  await mp.screenshot({ path: `${SP}/ux-m-questlog.png` });
  await mp.evaluate(() => window.__game.scene.getScene('UIScene')._closePopup());
  // 手機的畫面渲染：canvas 不再用 pixelated
  check('畫布不再使用 image-rendering: pixelated（手繪美術用平滑取樣）', await mp.evaluate(() => getComputedStyle(document.querySelector('canvas')).imageRendering !== 'pixelated'));
  await mctx.close();

  // 手機 NPC 對話 / 商店 / 世界地圖：844x390 與 667x375
  await phoneUiChecks(browser, 844, 390, 'p844');
  await phoneUiChecks(browser, 667, 375, 'p667');

  const real = errors.filter((e) => !/Failed to load resource/.test(e));
  check('全程沒有 JS 錯誤', real.length === 0, real.slice(0, 5).join(' | '));
  console.log(fails === 0 ? 'ALL PASS' : `FAILED: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

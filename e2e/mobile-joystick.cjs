// 手機虛擬搖桿 e2e（844x390，CDP 多指觸控）
// 用法：PORT=8517 node e2e/mobile-joystick.cjs <截圖資料夾>
// 驗證：浮動搖桿出現在按下處、左右拖曳移動、放開停止、上推跳、回中立再上推二段跳、按住不連跳、
//       另一側點擊跳（含二段跳）、右手同時攻擊、被取消 / 拖出螢幕不卡鍵、下推下穿、設定切換舊式按鈕。
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8123;
const SP = process.argv[2] || '.';
const BASE = `http://127.0.0.1:${PORT}/index.html?debug=1`;
let fails = 0;
const check = (n, c, x = '') => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? ' :: ' + x : '')); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('thief-legend-tutorial-seen', '1'); } catch (_) {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const wait = (ms) => page.waitForTimeout(ms);

  await page.goto(BASE);
  await wait(4500);
  const canvasRect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await page.touchscreen.tap(canvasRect.l + 640 * canvasRect.w / 1280, canvasRect.t + 530 * canvasRect.h / 720);
  await wait(4000);

  check('預設為虛擬搖桿模式（root 有 tc-joy）', await page.evaluate(() => document.getElementById('touch-controls').classList.contains('tc-joy')));
  check('預設設定 touchControls = joystick', await page.evaluate(() => window.__settings.get().touchControls === 'joystick'));

  const state = () => page.evaluate(() => {
    const g = window.__game; const sc = g.scene.getScene('MapleIslandScene');
    const p = sc && sc.player; const gs = g.registry.get('gameState');
    return { x: p.x, y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y, jl: p.jumpsLeft, cdATK: gs.skillCooldowns.ATK, ground: p.body.blocked.down,
      left: p.cursors.left.isDown, right: p.cursors.right.isDown, down: p.cursors.down.isDown, up: p.cursors.up.isDown, alt: p.keyAlt.isDown,
      jumps: window.__jumps || 0, drop: !!p.dropThrough };
  });
  const rect = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, vis: getComputedStyle(document.querySelector(s)).display !== 'none' }; }, sel);
  const base = () => page.evaluate(() => { const b = document.querySelector('.tc-joy-base'); const r = b.getBoundingClientRect(); return { on: b.classList.contains('tc-on'), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }; });
  const unitPx = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('touch-controls')).getPropertyValue('--tc-unit')));
  const R = Math.round(unitPx * 1.3);
  // 計跳躍次數：包住 setVelocityY(-520)
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('MapleIslandScene').player;
    window.__jumps = 0;
    const orig = p.setVelocityY.bind(p);
    p.setVelocityY = (v) => { if (v === -520) window.__jumps++; return orig(v); };
  });
  const landed = async () => { for (let i = 0; i < 40; i++) { if ((await state()).ground) return; await wait(100); } };
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = gs.maxHp; });

  // 1. 浮動：按下的位置就是底盤中心；放開消失
  check('沒按時看不到搖桿底盤', !(await base()).on);
  const P1 = { x: 190, y: 290 };
  await T('touchStart', [{ ...P1, id: 1 }]);
  await wait(150);
  let b = await base();
  check('按下 → 底盤出現在手指處（浮動）', b.on && Math.abs(b.cx - P1.x) < 2 && Math.abs(b.cy - P1.y) < 2, JSON.stringify(b));
  check('底盤直徑 = 2 × 最大半徑', Math.abs(b.w - 2 * R) < 3, `w=${b.w} R=${R}`);
  await page.screenshot({ path: SP + '/j-1-idle-touch.png' });
  await T('touchEnd', []);
  await wait(150);
  check('放開 → 底盤消失', !(await base()).on);
  const P2 = { x: 120, y: 180 };
  await T('touchStart', [{ ...P2, id: 1 }]);
  await wait(120);
  b = await base();
  check('換個位置按 → 底盤跟著出現在新位置', b.on && Math.abs(b.cx - P2.x) < 2 && Math.abs(b.cy - P2.y) < 2);
  await T('touchEnd', []);
  await wait(150);
  let s = await state();
  check('死區內按著不動 → 不移動', !s.left && !s.right && !s.up);

  // 2. 左右移動
  const s0 = await state();
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }]);
  await wait(900);
  const s1 = await state();
  check('向右拖曳 → 角色往右移動', s1.x > s0.x + 40 && s1.right && !s1.left, `x ${Math.round(s0.x)} → ${Math.round(s1.x)}`);
  await page.screenshot({ path: SP + '/j-2-drag-right.png' });
  await T('touchMove', [{ x: P1.x - R * 0.8, y: P1.y, id: 1 }]);
  await wait(900);
  const s2 = await state();
  check('改往左拖曳 → 反向移動（按鍵與速度都反向；怪物擊退可能影響位移，所以不只看座標）', s2.left && !s2.right && (s2.x < s1.x - 20 || s2.vx < -50), `x ${Math.round(s1.x)} → ${Math.round(s2.x)}`);
  await T('touchMove', [{ x: P1.x + R * 0.1, y: P1.y, id: 1 }]);
  await wait(250);
  s = await state();
  check('拖回死區 → 停止移動', !s.left && !s.right);
  await T('touchEnd', []);
  await wait(300);
  s = await state();
  check('放開 → 按鍵全放開、速度為 0', !s.left && !s.right && !s.down && Math.abs(s.vx) < 1, `vx=${s.vx}`);

  // 3. 上推跳、回中立再上推 = 二段跳、第三次推不跳
  //    無頭瀏覽器負載高時，CDP 往返可能慢到第一跳已經落地；偵測到就整段重試（最多 3 次）
  let seq = null;
  for (let attempt = 1; attempt <= 3 && !seq; attempt++) {
    await landed();
    await wait(300);
    const j0 = (await state()).jumps;
    await T('touchStart', [{ ...P1, id: 1 }]);
    await T('touchMove', [{ x: P1.x, y: P1.y - R * 0.9, id: 1 }]);
    await wait(150);
    const a = await state();
    if (attempt === 1) await page.screenshot({ path: SP + '/j-3-up-jump.png' });
    await wait(120);
    const hold = await state();            // 持續按住上推：不連跳
    await T('touchMove', [{ x: P1.x, y: P1.y, id: 1 }]);
    await wait(60);
    await T('touchMove', [{ x: P1.x, y: P1.y - R * 0.9, id: 1 }]);
    await wait(150);
    const b2 = await state();
    await T('touchMove', [{ x: P1.x, y: P1.y, id: 1 }]);
    await wait(60);
    await T('touchMove', [{ x: P1.x, y: P1.y - R * 0.9, id: 1 }]);
    await wait(150);
    const c = await state();
    await T('touchEnd', []);
    if (b2.jl === 0 && b2.jumps === j0 + 2) seq = { j0, a, hold, b2, c };
    else console.log(`  (第 ${attempt} 次嘗試：二段跳時機被負載拖過，重試)`);
  }
  check('二段跳序列至少有一次在空中完成', !!seq);
  if (seq) {
    check('上推越過閾值 → 起跳（jumps+1、離地）', seq.a.jumps === seq.j0 + 1 && !seq.a.ground, `jumps +${seq.a.jumps - seq.j0} vy=${Math.round(seq.a.vy)}`);
    check('持續按住上推不會連跳', seq.hold.jumps === seq.j0 + 1);
    check('空中回中立再上推 → 二段跳（jumpsLeft=0）', seq.b2.jumps === seq.j0 + 2 && seq.b2.jl === 0, `jumps +${seq.b2.jumps - seq.j0} jumpsLeft=${seq.b2.jl}`);
    check('第三次推：跳躍次數用完，不再起跳', seq.c.jumps === seq.j0 + 2);
  }
  await landed();
  await wait(300);

  // 3a. 一直按住上推穿過整個跳躍與落地：不會自己連跳
  const jh = (await state()).jumps;
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x, y: P1.y - R * 0.9, id: 1 }]);
  await wait(2200);
  s = await state();
  check('按住上推不放（跳完落地後仍按著）→ 只跳一次、不連跳', s.jumps === jh + 1 && s.ground, `jumps +${s.jumps - jh}`);
  await T('touchEnd', []);
  await wait(300);

  // 3b. 快速上滑（沒推到頂）
  const j1 = (await state()).jumps;
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x, y: P1.y - R * 0.5, id: 1 }]);   // 單一事件上移 50%（慢速無頭瀏覽器上多事件會被拉長超過時間窗）
  await wait(300);
  check('快速上滑（只到 50% 高、沒到 60% 門檻）也算跳', (await state()).jumps === j1 + 1, `jumps +${(await state()).jumps - j1}`);
  await T('touchEnd', []);
  await landed();
  await wait(300);

  // 3c. 斜上推：邊移動邊跳
  const d0 = await state();
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x + R * 0.75, y: P1.y - R * 0.75, id: 1 }]);
  await wait(450);
  const d1 = await state();
  check('斜上推 → 同時右移與起跳', d1.x > d0.x + 15 && d1.jumps > d0.jumps && d1.right, `dx=${Math.round(d1.x - d0.x)} jumps +${d1.jumps - d0.jumps}`);
  await T('touchEnd', []);
  await landed();
  await wait(300);

  // 4. 另一側點擊跳（含二段跳）
  const j2 = (await state()).jumps;
  const tapPt = { x: 560, y: 110 };
  await T('touchStart', [{ ...tapPt, id: 5 }]); await wait(90); await T('touchEnd', []);
  await wait(300);
  check('點右側空白處 → 起跳', (await state()).jumps === j2 + 1);
  await T('touchStart', [{ x: tapPt.x - 40, y: tapPt.y + 20, id: 6 }]); await wait(90); await T('touchEnd', []);
  await wait(300);
  s = await state();
  check('空中再點一下 → 二段跳', s.jumps === j2 + 2 && s.jl === 0);
  await T('touchStart', [{ x: tapPt.x, y: tapPt.y, id: 7 }]); await wait(90); await T('touchEnd', []);
  await wait(250);
  check('第三下不再跳', (await state()).jumps === j2 + 2);
  await landed();
  await wait(300);
  const jumpBtn = await rect('.tc-jump');
  const j3 = (await state()).jumps;
  check('跳躍鈕在動作區（右半邊）且可見', jumpBtn.vis && jumpBtn.x > 844 / 2, `x=${Math.round(jumpBtn.x)}`);
  await T('touchStart', [{ x: jumpBtn.x, y: jumpBtn.y, id: 8 }]); await wait(120); await T('touchEnd', []);
  await wait(300);
  check('按跳躍鈕 → 起跳', (await state()).jumps === j3 + 1);
  await landed();
  await wait(300);

  // 5. 多指：左手搖桿持續右移，右手同時攻擊 / 點擊跳
  const atk = await rect('.tc-attack');
  check('攻擊鈕在右半邊', atk.x > 844 / 2, `x=${Math.round(atk.x)}`);
  const m0 = await state();
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }]);
  await wait(300);
  await T('touchStart', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }, { x: atk.x, y: atk.y, id: 2 }]);
  await wait(250);
  const m1 = await state();
  check('搖桿右移中同時按攻擊 → 攻擊冷卻啟動且仍在移動', m1.cdATK > 0 && m1.right && m1.x > m0.x + 10, `cd=${m1.cdATK} right=${m1.right}`);
  await page.screenshot({ path: SP + '/j-5-multitouch-attack.png' });
  await T('touchEnd', [{ x: atk.x, y: atk.y, id: 2 }]);   // CDP touchEnd 的 touchPoints = 要放開的那幾指
  await wait(200);
  const jm = (await state()).jumps;
  await T('touchStart', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }, { x: tapPt.x, y: tapPt.y, id: 3 }]);
  await wait(100);
  await T('touchEnd', [{ x: tapPt.x, y: tapPt.y, id: 3 }]);
  await wait(300);
  s = await state();
  check('搖桿右移中另一指點右側 → 跳起且搖桿方向不受影響', s.jumps === jm + 1 && s.right, `jumps +${s.jumps - jm} right=${s.right}`);
  await T('touchEnd', []);
  await wait(300);
  s = await state();
  check('全部放開後沒有卡鍵', !s.left && !s.right && !s.down && !s.up);
  await landed();

  // 6. 取消與拖出螢幕
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }]);
  await wait(350);
  check('（前置）搖桿按住中 → right 為真', (await state()).right);
  await T('touchCancel', []);
  await wait(300);
  s = await state();
  check('touchcancel → 立刻放開，不卡住移動', !s.right && !s.left && !(await base()).on, `right=${s.right}`);
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: 830, y: 20, id: 1 }]);   // 拖到對側角落（右上、超出圓盤與右半邊）
  await wait(500);
  s = await state();
  check('手指拖出圓盤很遠 / 進入另一側 → 仍依方向移動、不當成點擊再跳', s.right, `right=${s.right} jumps=${s.jumps}`);
  await T('touchEnd', []);
  await wait(300);
  s = await state();
  check('在遠處放開 → 正確釋放', !s.right && !s.left && !s.up);
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: -30, y: P1.y, id: 1 }]);   // 拖出螢幕左緣之外
  await wait(400);
  check('拖出螢幕邊緣仍持續左移', (await state()).left);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await wait(200);
  check('視窗失焦 → 放開', !(await state()).left && !(await base()).on);
  await T('touchEnd', []);
  await wait(200);
  // 第二根手指不搶搖桿
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }]);
  await wait(250);
  await T('touchStart', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }, { x: 60, y: 200, id: 2 }]);
  await T('touchMove', [{ x: P1.x + R * 0.8, y: P1.y, id: 1 }, { x: 20, y: 200, id: 2 }]);
  await wait(300);
  s = await state();
  check('左半邊第二根手指不會搶走搖桿控制', s.right && !s.left, `left=${s.left} right=${s.right}`);
  await T('touchEnd', [{ x: 20, y: 200, id: 2 }]);
  await wait(150);
  s = await state();
  check('第二指先放開，第一指的搖桿仍有效', s.right);
  await T('touchEnd', []);
  await wait(250);
  check('全部放開', !(await state()).right);

  // 7. 下推：下穿薄平台
  await T('touchStart', [{ ...P1, id: 1 }]);
  await T('touchMove', [{ x: P1.x, y: P1.y + R * 0.9, id: 1 }]);
  await wait(250);
  s = await state();
  check('下推 → down 鍵按下（下穿薄平台）', s.down, `down=${s.down}`);
  await T('touchEnd', []);
  await wait(250);
  check('放開 → down 釋放', !(await state()).down);

  // 8. HUD 藥水槽不被搖桿感應區吃掉
  const potBefore = await page.evaluate(() => window.__game.registry.get('gameState').potions.A);
  const slot = await page.evaluate(() => { const s = window.__game.scene.getScene('UIScene')._potionSlots.A.bg; return { x: s.x + 21, y: s.y + 21 }; });
  const cr = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await page.evaluate(() => { const gs = window.__game.registry.get('gameState'); gs.hp = Math.max(1, gs.maxHp - 20); });
  await page.touchscreen.tap(cr.l + slot.x * cr.w / 1280, cr.t + slot.y * cr.h / 720);
  await wait(500);
  const potAfter = await page.evaluate(() => window.__game.registry.get('gameState').potions.A);
  check('點 HUD 藥水槽仍可用（感應區讓開 HUD 列）', potAfter === potBefore - 1 && !(await base()).on, `A: ${potBefore} → ${potAfter}`);

  // 9. 左右互換（搖桿到右、按鈕到左）
  const swapB = await rect('.tc-swap');
  await T('touchStart', [{ x: swapB.x, y: swapB.y, id: 9 }]); await wait(80); await T('touchEnd', []);
  await wait(400);
  const atk2 = await rect('.tc-attack');
  const zoneBox = await page.evaluate(() => { const r = document.querySelector('.tc-joy-zone').getBoundingClientRect(); return { l: r.left, w: r.width }; });
  check('左右互換 → 搖桿感應區在右半邊、攻擊鈕在左半邊', zoneBox.l >= 844 / 2 - 1 && atk2.x < 844 / 2, `zone.l=${Math.round(zoneBox.l)} atk.x=${Math.round(atk2.x)}`);
  await page.screenshot({ path: SP + '/j-9-swapped.png' });
  const x0 = (await state()).x;
  await T('touchStart', [{ x: 650, y: 280, id: 1 }]);
  await T('touchMove', [{ x: 650 + R * 0.8, y: 280, id: 1 }]);
  await wait(700);
  check('互換後右側搖桿可正常移動', (await state()).x > x0 + 25);
  await T('touchEnd', []);
  await T('touchStart', [{ x: swapB.x, y: swapB.y, id: 9 }]); await wait(80); await T('touchEnd', []);
  await wait(300);

  // 10. 設定切換：舊式按鈕 ↔ 虛擬搖桿
  await page.evaluate(() => window.__settings.set({ touchControls: 'buttons' }));
  await wait(400);
  const stickBtn = await rect('.tc-stick');
  const downBtn = await rect('.tc-down');
  const zone = await rect('.tc-joy-zone');
  check('切到「舊式按鈕」→ 搖桿條與 ↓ 鈕出現、浮動感應區關閉', stickBtn.vis && downBtn.vis && !zone.vis);
  await page.screenshot({ path: SP + '/j-10-buttons-mode.png' });
  const q0 = (await state()).x;
  await T('touchStart', [{ x: stickBtn.x + stickBtn.w * 0.4, y: stickBtn.y, id: 1 }]);
  await wait(700);
  check('舊式搖桿條仍可移動', (await state()).x !== q0 && (await state()).right);
  await T('touchEnd', []);
  await wait(250);
  check('舊式放開後不卡鍵', !(await state()).right);
  await page.evaluate(() => window.__settings.set({ touchControls: 'joystick' }));
  await wait(400);
  check('切回「虛擬搖桿」→ 浮動感應區回來、搖桿條隱藏', (await rect('.tc-joy-zone')).vis && !(await rect('.tc-stick')).vis);

  // 11. 視窗開啟（modal）時感應區讓開
  await page.evaluate(() => window.__game.registry.set('uiModal', true));
  await wait(250);
  check('uiModal（視窗 / 對話 / 暫停）→ 感應區關閉', !(await rect('.tc-joy-zone')).vis && !(await rect('.tc-tap-zone')).vis);
  await page.evaluate(() => window.__game.registry.set('uiModal', false));
  await wait(250);
  check('關閉視窗 → 感應區恢復', (await rect('.tc-joy-zone')).vis);

  // 12. 縮放視窗：相對座標仍正確
  await page.setViewportSize({ width: 740, height: 360 });
  await wait(900);
  await T('touchStart', [{ x: 100, y: 220, id: 1 }]);
  await wait(150);
  b = await base();
  check('視窗縮小後搖桿仍出現在手指處', b.on && Math.abs(b.cx - 100) < 2 && Math.abs(b.cy - 220) < 2, JSON.stringify(b));
  await T('touchEnd', []);
  await page.setViewportSize({ width: 844, height: 390 });
  await wait(700);

  // 13. 設定視窗的「觸控操作」切換鈕：點「舊式按鈕」→ 設定改變並存檔；再點「虛擬搖桿」回來
  await page.evaluate(() => window.__game.scene.getScene('UIScene')._openSettingsWindow());
  await wait(700);
  await page.screenshot({ path: SP + '/j-13-settings.png' });
  const toPx = async (gx, gy) => { const c = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }); return { x: c.l + gx * c.w / 1280, y: c.t + gy * c.h / 720 }; };
  // 視窗 x0 = (1280-760)/2 = 260；欄位 colX = x0+36，trackW = 300，列 y = y0(14) + 264 + 4*44 + 4 + 50 = 508（+19 為列中心）
  const segBtns = async (id) => toPx(260 + 36 + 300 - 2 * 102 + (id === 'joystick' ? 0 : 102) + 49, 14 + 264 + 176 + 4 + 50 + 19);
  const pb = await segBtns('buttons');
  await page.touchscreen.tap(pb.x, pb.y);
  await wait(400);
  check('設定視窗點「舊式按鈕」→ 設定 touchControls=buttons 並存入 localStorage', await page.evaluate(() => window.__settings.get().touchControls === 'buttons'
    && JSON.parse(localStorage.getItem('thief-legend-settings')).touchControls === 'buttons'));
  const pj = await segBtns('joystick');
  await page.touchscreen.tap(pj.x, pj.y);
  await wait(400);
  check('設定視窗點「虛擬搖桿」→ 設定回到 joystick', await page.evaluate(() => window.__settings.get().touchControls === 'joystick'));
  await page.keyboard.press('Escape');
  await wait(500);
  check('全程沒有 JS 錯誤', errors.length === 0, errors.join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

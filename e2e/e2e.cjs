const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PORT = process.env.PORT || 8123;
const fs = require('fs');
const SP = process.argv[2];
const URL = `http://127.0.0.1:${PORT}/index.html`;
const KEY = 'thief-legend-save-v1';
const log = (...a) => console.log(...a);
let fails = 0;
const check = (name, cond, extra='') => { log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' :: ' + extra : '')); if (!cond) fails++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('__t')) { localStorage.setItem('thief-legend-tutorial-seen', '1'); } } catch (_) {} });
  const errors = []; const errors404 = [];
  page.on('response', (r) => { if (r.status() >= 400) errors404.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const seed = async (value) => {
    await page.goto(`http://127.0.0.1:${PORT}/__blank__`);   // 同源 404 頁；離開遊戲頁時 pagehide 會先存檔
    await page.evaluate(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, value]);
    await page.goto(URL);
    await page.waitForTimeout(3500);
  };
  const readSave = () => page.evaluate((k) => localStorage.getItem(k), KEY);

  // 1. 全新瀏覽器：無存檔 → 開始遊戲 → 抵達 sky 後自動存檔
  await page.goto(URL);
  await page.waitForTimeout(3500);
  check('全新狀態沒有存檔', (await readSave()) === null);
  await page.screenshot({ path: SP + '/menu-fresh.png' });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  let raw = await readSave();
  check('進入第一張地圖後自動存檔', !!raw);
  let data = raw && JSON.parse(raw);
  check('存檔格式正確', data && data.format === 'thief-legend-save' && data.version === 1 && data.state.currentMap === 'sky' && data.state.level === 1);
  await page.screenshot({ path: SP + '/game-sky.png' });

  // 2. 以手工存檔重新載入 → 選單顯示繼續 → 繼續後落在存檔地圖
  const seeded = { format: 'thief-legend-save', version: 1, savedAt: Date.now(), state: {
    level: 12, exp: 50, maxHp: 700, maxMp: 400, atk: 130, meso: 1234, killCount: 80, playTime: 900,
    skillPoints: 7, unlockedSkills: ['Z','X','C'], skillLevels: { Z: 3, X: 2, C: 1, V: 0, B: 0 },
    currentMap: 'ruins', potions: { A: 9, S: 1, D: 2, R: 3, G: 4 },
    quests: { active: [{ id: 'slime_hunt', progress: 3 }], completed: [] },
  }};
  await seed(JSON.stringify(seeded));
  await page.screenshot({ path: SP + '/menu-continue.png' });
  await page.mouse.click(640, 520);   // 繼續遊戲
  await page.waitForTimeout(3000);
  raw = await readSave(); data = JSON.parse(raw);
  check('繼續遊戲後仍是存檔的進度 (Lv12/ruins/meso1234/kills80)',
    data.state.level === 12 && data.state.currentMap === 'ruins' && data.state.meso === 1234 && data.state.killCount === 80,
    JSON.stringify({ l: data.state.level, m: data.state.currentMap, meso: data.state.meso }));
  check('藥水與任務進度保留', data.state.potions.A === 9 && data.state.quests.active[0].progress === 3);
  await page.screenshot({ path: SP + '/game-ruins.png' });

  // 3. 匯出：改成存檔代碼視窗（可複製的文字）；本機下載是次要按鈕
  await seed(JSON.stringify(seeded));
  await page.mouse.click(550, 676);   // 匯出存檔
  await page.waitForSelector('.sd-text', { timeout: 5000 });
  const code = await page.inputValue('.sd-text');
  const decodeCode = (c) => { const parts = c.split(':'); return JSON.parse(Buffer.from(parts[2], 'base64url').toString('utf8')); };
  const exported = decodeCode(code);
  check('匯出的存檔代碼可解碼、內容與存檔一致', code.startsWith('TL1:') && exported.format === 'thief-legend-save' && exported.state.level === 12 && exported.state.currentMap === 'ruins', code.slice(0, 24));
  await page.screenshot({ path: SP + '/menu-export-code.png' });
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.click('text=下載檔案'),
  ]);
  const dlPath = SP + '/exported.json';
  await dl.saveAs(dlPath);
  const exportedFile = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
  check('可以下載的環境：下載檔案仍是合法存檔', exportedFile.format === 'thief-legend-save' && exportedFile.state.level === 12, dl.suggestedFilename());
  await page.click('text=關閉');
  check('關閉後視窗消失', (await page.$('.sd-backdrop')) === null);

  // 4. 匯入惡意 / 壞檔 → 拒絕且不覆蓋原存檔；匯入好檔 → 確認覆蓋後覆蓋
  const before = await readSave();
  const importFile = async (file) => {
    await page.mouse.click(730, 676);   // 匯入存檔
    await page.waitForSelector('.sd-text', { timeout: 5000 });
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), page.click('text=選擇檔案')]);
    await fc.setFiles(file);
    await page.waitForTimeout(700);
  };
  fs.writeFileSync(SP + '/bad.json', '{"hello":"world"}');
  await importFile(SP + '/bad.json');
  await page.screenshot({ path: SP + '/menu-import-bad.png' });
  check('壞檔匯入被拒絕並顯示原因', /匯入失敗/.test(await page.textContent('.sd-status')));
  check('壞檔匯入後原存檔不變', (await readSave()) === before);
  await page.click('text=取消');

  const evil = { format: 'thief-legend-save', version: 1, state: { level: 9999, meso: -5, currentMap: 'boss', maxHp: 'x',
    equipment: { weapon: { slot: 'boots', rarity: 'godlike', atk: 1e12 } }, __proto__: { polluted: 1 } } };
  fs.writeFileSync(SP + '/evil.json', JSON.stringify(evil));
  await importFile(SP + '/evil.json');
  check('已有存檔時匯入會先要求覆蓋確認（顯示新舊摘要）', /覆蓋/.test(await page.textContent('.sd-title')) && /Lv\.12/.test(await page.inputValue('.sd-text')));
  check('確認前存檔還沒被動到', (await readSave()) === before);
  await page.screenshot({ path: SP + '/menu-import-confirm.png' });
  await page.click('text=確定覆蓋');
  await page.waitForTimeout(1500);
  data = JSON.parse(await readSave());
  check('惡意數值匯入後被修正', data.state.level === 50 && data.state.meso === 0 && data.state.currentMap === 'castle'
    && data.state.maxHp === 400 && data.state.equipment.weapon.slot === 'weapon' && data.state.equipment.weapon.atk === 99999,
    JSON.stringify({ l: data.state.level, m: data.state.currentMap, w: data.state.equipment.weapon && data.state.equipment.weapon.atk }));
  await page.screenshot({ path: SP + '/menu-after-import.png' });

  // 5. 新遊戲需二次確認
  await seed(JSON.stringify(seeded));
  const kept = await readSave();
  await page.mouse.click(640, 618);
  await page.waitForTimeout(500);
  check('第一次按新遊戲不會開始/不改存檔', (await readSave()) === kept);
  await page.screenshot({ path: SP + '/menu-confirm.png' });
  await page.mouse.click(640, 618);
  await page.waitForTimeout(2500);
  data = JSON.parse(await readSave());
  check('第二次確認後以新遊戲覆蓋存檔 (Lv1/sky)', data.state.level === 1 && data.state.currentMap === 'sky');

  // 6. localStorage 內容損毀 → 選單不崩潰，視為無存檔
  await seed('garbage');
  await page.screenshot({ path: SP + '/menu-corrupt.png' });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  data = JSON.parse(await readSave());
  check('損毀存檔 → 開新遊戲並重新寫入有效存檔', data.format === 'thief-legend-save' && data.state.level === 1);

  const real = errors.filter((e) => !e.includes('Failed to load resource')); check('全程沒有 JS 錯誤', real.length === 0, real.join(' | ')); const bad404 = errors404.filter((u) => !u.includes('__blank__') && !u.includes('favicon')); check('除刻意造訪的頁面外沒有 404', bad404.length === 0, bad404.join(' | '));
  log(fails === 0 ? 'ALL PASS' : `FAILED: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

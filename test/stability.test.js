// 穩定性與安裝：錯誤過濾與限流、版本字串、更新紀錄、Service Worker 註冊條件、建置版本資訊（可重現）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isOwnError, describeErrorEvent, createReportGate, errorMessageFor, installErrorGuard,
} from '../src/engine/errorGuard.js';
import {
  APP_VERSION, shortHash, formatVersion, parseBuildInfo, loadBuildInfo, resetBuildInfoCache,
} from '../src/engine/version.js';
import { CHANGELOG, recentChangelog } from '../src/config/changelog.js';
import { shouldRegisterSW, isLocalHost } from '../src/engine/serviceWorker.js';
import { hashBuffer, hashFiles, injectSwVersions, versionJson } from '../scripts/buildVersion.js';

const ORIGIN = 'https://ali-bobo.github.io';

test('isOwnError：本站腳本的錯誤要提示', () => {
  assert.equal(isOwnError({ filename: `${ORIGIN}/thief-legend/dist/bundle.js`, message: 'TypeError: x is undefined' }, ORIGIN), true);
  assert.equal(isOwnError({ filename: ORIGIN, message: 'boom' }, ORIGIN), true);
  // 沒有檔名（Promise rejection）但不是跨來源遮罩：算本站
  assert.equal(isOwnError({ filename: '', message: 'load failed', stack: `Error\n at ${ORIGIN}/dist/bundle.js:1:2` }, ORIGIN), true);
});

test('isOwnError：擴充功能、其他網域、跨來源 Script error 不提示', () => {
  assert.equal(isOwnError({ filename: 'chrome-extension://abcdef/content.js', message: 'x' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: 'moz-extension://1234/inject.js', message: 'x' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: '', message: 'x', stack: 'at safari-web-extension://abc/x.js:1:1' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: 'https://evil.example.com/ads.js', message: 'x' }, ORIGIN), false);
  // 前綴相同但其實是別的網域
  assert.equal(isOwnError({ filename: `${ORIGIN}.evil.com/x.js`, message: 'x' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: '', message: 'Script error.' }, ORIGIN), false);
  assert.equal(isOwnError(null, ORIGIN), false);
});

test('isOwnError：已知無害雜訊略過；file:// 只認本機檔案', () => {
  assert.equal(isOwnError({ filename: `${ORIGIN}/x.js`, message: 'ResizeObserver loop completed with undelivered notifications.' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: '', message: 'play() was interrupted', name: 'AbortError' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: '', message: 'not allowed', name: 'NotAllowedError' }, ORIGIN), false);
  assert.equal(isOwnError({ filename: 'file:///home/me/game/dist/bundle.js', message: 'x' }, 'null'), true);
  assert.equal(isOwnError({ filename: 'https://cdn.example.com/x.js', message: 'x' }, 'null'), false);
});

test('describeErrorEvent：error 事件與 rejection 都取得欄位', () => {
  const err = new TypeError('bad');
  const a = describeErrorEvent({ filename: 'f.js', message: 'Uncaught TypeError: bad', error: err });
  assert.equal(a.filename, 'f.js');
  assert.equal(a.name, 'TypeError');
  assert.ok(a.stack.includes('bad'));
  const b = describeErrorEvent({ reason: err });
  assert.equal(b.filename, '');
  assert.equal(b.message, 'bad');
  assert.deepEqual(describeErrorEvent({ reason: 'oops' }), { filename: '', message: 'oops', stack: '', name: '' });
  assert.equal(describeErrorEvent({ reason: undefined }).message, '');
  assert.equal(describeErrorEvent(null), null);
});

test('createReportGate：預設只放行一次，可指定次數', () => {
  const g = createReportGate();
  assert.equal(g.tryOpen(), true);
  assert.equal(g.tryOpen(), false);
  assert.equal(g.tryOpen(), false);
  assert.equal(g.count, 1);
  const g3 = createReportGate(3);
  assert.deepEqual([g3.tryOpen(), g3.tryOpen(), g3.tryOpen(), g3.tryOpen()], [true, true, true, false]);
});

test('errorMessageFor：依存檔結果說明進度狀態', () => {
  assert.ok(errorMessageFor('saved').includes('已自動儲存'));
  assert.ok(errorMessageFor('failed').includes('未能儲存'));
  assert.ok(!errorMessageFor('skipped').includes('儲存'));
  assert.ok(errorMessageFor(undefined).includes('遊戲發生錯誤'));
});

test('installErrorGuard：沒有瀏覽器環境時不做事也不丟例外', () => {
  assert.equal(installErrorGuard({ saveNow: () => 'saved' }), null);
});

test('版本字串：短雜湊 7 碼、格式錯誤忽略', () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+/);
  assert.equal(shortHash('797CEBAB461D'), '797ceba');
  assert.equal(shortHash('xyz'), '');
  assert.equal(shortHash(null), '');
  assert.equal(formatVersion('3.0.0', '797cebab461d'), '3.0.0-797ceba');
  assert.equal(formatVersion('3.0.0', ''), '3.0.0');
  assert.equal(formatVersion('', 'abcd1234'), '0.0.0-abcd123');
});

test('parseBuildInfo：驗證 dist/version.json 內容', () => {
  assert.deepEqual(parseBuildInfo({ version: '3.1.0', hash: 'abcdef123456' }), { version: '3.1.0', hash: 'abcdef1' });
  assert.equal(parseBuildInfo({ version: '3.1.0' }), null);
  assert.equal(parseBuildInfo('nope'), null);
  assert.equal(parseBuildInfo({ version: '<script>', hash: 'abcdef1' }).version, APP_VERSION);
});

test('loadBuildInfo：成功讀取、失敗回 null、只讀一次', async () => {
  resetBuildInfoCache();
  let calls = 0;
  const ok = async () => { calls += 1; return { ok: true, json: async () => ({ version: '3.0.0', hash: '0123456789ab' }) }; };
  assert.deepEqual(await loadBuildInfo(ok), { version: '3.0.0', hash: '0123456' });
  await loadBuildInfo(ok);
  assert.equal(calls, 1);
  resetBuildInfoCache();
  assert.equal(await loadBuildInfo(async () => { throw new Error('offline'); }), null);
  resetBuildInfoCache();
  assert.equal(await loadBuildInfo(async () => ({ ok: false })), null);
  resetBuildInfoCache();
});

test('更新紀錄：有內容、標題不重複、長度放得進面板、含近期項目', () => {
  assert.ok(CHANGELOG.length >= 5);
  const titles = CHANGELOG.map((e) => e.title);
  assert.equal(new Set(titles).size, titles.length);
  for (const t of titles) {
    assert.equal(typeof t, 'string');
    assert.ok(t.length > 0 && t.length <= 40, t);
  }
  for (const k of ['Boss 狂暴第三階段', '迷煙彈', '斷命印記', '技能說明面板']) {
    assert.ok(titles.some((t) => t.includes(k)), k);
  }
  assert.equal(recentChangelog(2).length, 2);
  assert.equal(recentChangelog(-1).length, 0);
});

test('shouldRegisterSW：只在正式網址的 http(s) 註冊', () => {
  const loc = (href) => { const u = new URL(href); return { protocol: u.protocol, hostname: u.hostname, search: u.search }; };
  assert.equal(shouldRegisterSW(loc('https://ali-bobo.github.io/thief-legend/')), true);
  assert.equal(shouldRegisterSW(loc('http://192.168.1.20:3000/')), true);
  assert.equal(shouldRegisterSW(loc('https://ali-bobo.github.io/?debug=1')), false);
  assert.equal(shouldRegisterSW(loc('http://localhost:3000/')), false);
  assert.equal(shouldRegisterSW(loc('http://127.0.0.1:8123/index.html')), false);
  assert.equal(shouldRegisterSW(loc('http://[::1]:8123/')), false);
  assert.equal(shouldRegisterSW(loc('file:///home/me/game/index.html')), false);
  assert.equal(shouldRegisterSW(loc('https://ali-bobo.github.io/'), true), false);   // iframe
  assert.equal(shouldRegisterSW(null), false);
  assert.equal(isLocalHost('game.localhost'), true);
  assert.equal(isLocalHost('example.com'), false);
});

test('建置版本：雜湊可重現、檔案順序不影響、內容改變雜湊就變', () => {
  assert.equal(hashBuffer(Buffer.from('abc')), hashBuffer(Buffer.from('abc')));
  assert.notEqual(hashBuffer(Buffer.from('abc')), hashBuffer(Buffer.from('abd')));
  assert.equal(hashBuffer(Buffer.from('abc')).length, 12);
  const a = { name: 'dist/assets/a.png', data: Buffer.from('1') };
  const b = { name: 'dist/assets/b.png', data: Buffer.from('2') };
  const h1 = hashFiles([a, b]);
  const h2 = hashFiles([b, a]);
  assert.equal(h1.hash, h2.hash);
  assert.deepEqual(h1.files, ['dist/assets/a.png', 'dist/assets/b.png']);
  assert.notEqual(hashFiles([a, { ...b, data: Buffer.from('3') }]).hash, h1.hash);
  // 檔名與內容的邊界不會混淆
  assert.notEqual(hashFiles([{ name: 'ab', data: Buffer.from('c') }]).hash, hashFiles([{ name: 'a', data: Buffer.from('bc') }]).hash);
});

test('injectSwVersions：改寫兩行版本常數、重複執行結果相同、缺常數時丟例外', () => {
  const src = "// x\nconst SHELL_VERSION = 'old';\nconst ASSETS_VERSION = 'old2';\nconst y = 1;\n";
  const out = injectSwVersions(src, { shell: 'aaa111', assets: 'bbb222' });
  assert.ok(out.includes("const SHELL_VERSION = 'aaa111';"));
  assert.ok(out.includes("const ASSETS_VERSION = 'bbb222';"));
  assert.ok(out.endsWith('const y = 1;\n'));
  assert.equal(injectSwVersions(out, { shell: 'aaa111', assets: 'bbb222' }), out);
  assert.throws(() => injectSwVersions('const x = 1;', { shell: 'a', assets: 'b' }));
  const j = versionJson({ version: '3.0.0', hash: 'h', assetsHash: 'a', assets: ['x'] });
  assert.equal(j, versionJson({ version: '3.0.0', hash: 'h', assetsHash: 'a', assets: ['x'] }));
  assert.deepEqual(JSON.parse(j), { version: '3.0.0', hash: 'h', assetsHash: 'a', assets: ['x'] });
});

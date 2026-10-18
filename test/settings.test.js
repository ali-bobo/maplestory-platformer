// 設定：預設值、夾範圍、儲存 / 讀回、不可用的儲存體、效果開關與包裝、操作說明表
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSettings, sanitizeSettings, parseSettings, DEFAULT_SETTINGS, SETTINGS_KEY, UI_SCALES,
} from '../src/engine/settings.js';
import { installSettingsHooks } from '../src/engine/settingsHooks.js';
import { KEY_CHART } from '../src/ui/keyChart.js';

function memStorage(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    raw: m,
  };
}

test('預設值：音樂 70、音效 100、效果全開、減少動態關、介面標準', () => {
  const s = createSettings(memStorage());
  assert.deepEqual(s.get(), DEFAULT_SETTINGS);
  assert.equal(s.get().musicVolume, 70);
  assert.equal(s.get().sfxVolume, 100);
  assert.equal(s.shakeAllowed(), true);
  assert.equal(s.flashAllowed(), true);
  assert.equal(s.motionAllowed(), true);
});

test('sanitizeSettings：夾範圍、型別錯誤用預設、未知欄位與原型污染丟棄', () => {
  const s = sanitizeSettings({ musicVolume: 250, sfxVolume: -5, shake: 'no', flash: false, uiScale: 'huge', evil: 1, damageNumbers: false });
  assert.equal(s.musicVolume, 100);
  assert.equal(s.sfxVolume, 0);
  assert.equal(s.shake, true);          // 不是布林：用預設
  assert.equal(s.flash, false);
  assert.equal(s.uiScale, 'normal');    // 不在清單：用預設
  assert.equal(s.damageNumbers, false);
  assert.equal('evil' in s, false);
  assert.equal(sanitizeSettings({ musicVolume: '42.6' }).musicVolume, 43);   // 數字字串也接受並取整
  assert.equal(sanitizeSettings({ musicVolume: NaN }).musicVolume, 70);
  for (const bad of [null, undefined, 5, 'x', [], true]) assert.deepEqual(sanitizeSettings(bad), DEFAULT_SETTINGS);
  const polluted = parseSettings('{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}},"musicVolume":10}');
  assert.equal(polluted.musicVolume, 10);
  assert.equal({}.polluted, undefined);
  assert.equal(polluted.polluted, undefined);
});

test('parseSettings：壞 JSON、空字串、超長字串都回預設值', () => {
  assert.deepEqual(parseSettings('not json'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings(''), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings(`{"musicVolume":5,"pad":"${'x'.repeat(5000)}"}`), DEFAULT_SETTINGS);
});

test('set：合併、存進獨立 key、重新建立後讀回；只有變動才通知', () => {
  const st = memStorage();
  const s = createSettings(st);
  let calls = 0;
  const unsub = s.subscribe(() => { calls++; });
  s.set({ musicVolume: 30, shake: false });
  assert.equal(s.get().musicVolume, 30);
  assert.equal(s.get().shake, false);
  assert.equal(calls, 1);
  s.set({ musicVolume: 30 });            // 沒變
  assert.equal(calls, 1);
  assert.ok(st.raw.has(SETTINGS_KEY));
  assert.notEqual(SETTINGS_KEY, 'thief-legend-save-v1');   // 與存檔分開
  const again = createSettings(st);
  assert.equal(again.get().musicVolume, 30);
  assert.equal(again.get().shake, false);
  assert.equal(again.get().sfxVolume, 100);
  unsub();
  s.set({ sfxVolume: 10 });
  assert.equal(calls, 1);                // 取消訂閱後不再通知
});

test('reset：回到預設並存檔、通知訂閱者', () => {
  const st = memStorage();
  const s = createSettings(st);
  s.set({ musicVolume: 0, uiScale: 'large', reducedMotion: true });
  let notified = 0;
  s.subscribe(() => { notified++; });
  s.reset();
  assert.deepEqual(s.get(), DEFAULT_SETTINGS);
  assert.equal(notified, 1);
  assert.deepEqual(parseSettings(st.raw.get(SETTINGS_KEY)), DEFAULT_SETTINGS);
});

test('儲存體不可用或拋例外：用預設值、記憶體內仍可修改，不丟例外', () => {
  const none = createSettings(null);
  assert.equal(none.persistent, false);
  none.set({ sfxVolume: 20 });
  assert.equal(none.get().sfxVolume, 20);
  const throwingRead = createSettings({ getItem() { throw new Error('denied'); }, setItem() {}, removeItem() {} });
  assert.deepEqual(throwingRead.get(), DEFAULT_SETTINGS);
  const throwingWrite = createSettings({ getItem: () => null, setItem() { throw new Error('quota'); }, removeItem() {} });
  throwingWrite.set({ musicVolume: 5 });
  assert.equal(throwingWrite.get().musicVolume, 5);
  assert.equal(throwingWrite.persistent, false);
  const garbage = createSettings(memStorage({ [SETTINGS_KEY]: '{{{' }));
  assert.deepEqual(garbage.get(), DEFAULT_SETTINGS);
});

test('效果開關：震動 / 閃光各自可關，減少動態一開全部關', () => {
  const s = createSettings(memStorage());
  s.set({ shake: false });
  assert.equal(s.shakeAllowed(), false);
  assert.equal(s.flashAllowed(), true);
  s.set({ shake: true, flash: false });
  assert.equal(s.shakeAllowed(), true);
  assert.equal(s.flashAllowed(), false);
  s.set({ flash: true, reducedMotion: true });
  assert.equal(s.shakeAllowed(), false);
  assert.equal(s.flashAllowed(), false);
  assert.equal(s.motionAllowed(), false);
});

test('settings.shake / flash：允許時轉呼叫相機，關閉時不呼叫並回傳相機', () => {
  const calls = [];
  const cam = { shake: (...a) => { calls.push(['shake', ...a]); return 'S'; }, flash: (...a) => { calls.push(['flash', ...a]); return 'F'; } };
  const s = createSettings(memStorage());
  assert.equal(s.shake(cam, 100, 0.01), 'S');
  assert.equal(s.flash(cam, 100, 255, 0, 0), 'F');
  assert.deepEqual(calls, [['shake', 100, 0.01], ['flash', 100, 255, 0, 0]]);
  s.set({ shake: false, flash: false });
  assert.equal(s.shake(cam, 1), cam);
  assert.equal(s.flash(cam, 1), cam);
  assert.equal(calls.length, 2);
  assert.equal(s.shake(null, 1), null);   // 沒有相機不丟例外
});

test('installSettingsHooks：包住相機與怪物飄字，只包一次，開關即時生效', () => {
  const log = [];
  class FakeCamera { shake() { log.push('shake'); return this; } flash() { log.push('flash'); return this; } }
  class FakeMonster { _showDamageNumber(n) { log.push(`dmg${n}`); } }
  const s = createSettings(memStorage());
  const first = installSettingsHooks({ CameraClass: FakeCamera, MonsterClass: FakeMonster, settings: s });
  assert.deepEqual(first, ['camera.shake', 'camera.flash', 'monster.damageNumber']);
  assert.deepEqual(installSettingsHooks({ CameraClass: FakeCamera, MonsterClass: FakeMonster, settings: s }), []);   // 不重複包
  const cam = new FakeCamera();
  const mon = new FakeMonster();
  cam.shake(); cam.flash(); mon._showDamageNumber(5);
  assert.deepEqual(log.splice(0), ['shake', 'flash', 'dmg5']);
  s.set({ shake: false, flash: false, damageNumbers: false });
  assert.equal(cam.shake(), cam);
  cam.flash(); mon._showDamageNumber(6);
  assert.deepEqual(log, []);
  s.set({ damageNumbers: true, reducedMotion: true });
  mon._showDamageNumber(7);
  assert.deepEqual(log.splice(0), ['dmg7']);   // 減少動態不關傷害數字
  cam.shake();
  assert.deepEqual(log, []);                     // 但震動關了
});

test('操作說明表：技能是 Z X C V 四格（沒有 B）、普攻空白鍵、互動 F、地圖 M、暫停 ESC、跳躍 Q / ↑', () => {
  const byLabel = Object.fromEntries(KEY_CHART.map((r) => [r.label, r.key]));
  assert.equal(byLabel['技能 1–4 欄'], 'Z X C V');
  assert.equal(byLabel['普通攻擊'], '空白鍵');
  assert.equal(byLabel['互動 / 對話'], 'F');
  assert.equal(byLabel['世界地圖'], 'M');
  assert.equal(byLabel['暫停 / 關閉視窗'], 'ESC');
  assert.equal(byLabel['跳躍（可二段跳）'], 'Q / ↑');
  assert.equal(byLabel['移動'], '← →');
  assert.ok(!KEY_CHART.some((r) => /\bB\b/.test(r.key)), '不應再列出 B 鍵');
  assert.deepEqual(UI_SCALES, ['small', 'normal', 'large']);
});

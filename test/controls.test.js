// 操作：按鍵設定（預設、互換 / 拒絕、讀回清理、設定持久化）、觸控鈕跟著鍵位、手把對應與橋接
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS, ACTION_IDS, DEFAULT_BINDINGS, KEY_TABLE, RESERVED_KEYS, defaultBindings, sanitizeBindings, rebind,
  keyLabel, hudKeyLabel, keyCodeOf, eventDef, keyNameFromEvent, eventMatches, slotKeyLabel, potionKeyLabel,
  isBindableKey, isDefaultBindings, SLOT_ACTIONS,
} from '../src/engine/keyBindings.js';
import { createSettings, sanitizeSettings, parseSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../src/engine/settings.js';
import { createKeyState, KEYS, TOUCH_ACTIONS } from '../src/engine/touchControls.js';
import { padActions, menuActions, createGamepadBridge, PAD } from '../src/engine/gamepad.js';
import { KEY_CHART, keyChartFor } from '../src/ui/keyChart.js';
import { SKILL_SLOT_KEYS } from '../src/config/constants.js';

function memStorage(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    raw: m,
  };
}

// ── 鍵位表 ────────────────────────────────────────────────────────────────────

test('預設鍵位（跳躍改成 Q，其餘和原本相同）', () => {
  assert.deepEqual(DEFAULT_BINDINGS, {
    left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', jump: 'Q', interact: 'F', attack: 'SPACE',
    skill1: 'Z', skill2: 'X', skill3: 'C', skill4: 'V', potA: 'A', potS: 'S', potD: 'D', potR: 'R', potG: 'G',
  });
  assert.deepEqual(defaultBindings(), { ...DEFAULT_BINDINGS });
  assert.equal(new Set(Object.values(DEFAULT_BINDINGS)).size, ACTIONS.length, '預設沒有重複');
  for (const a of ACTIONS) assert.ok(isBindableKey(a.def), `${a.id} 的預設鍵可指定`);
  assert.deepEqual(Object.keys(SLOT_ACTIONS), SKILL_SLOT_KEYS);
});

test('keyCode 與 Phaser KeyCodes 一致', () => {
  const expected = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ALT: 18, ENTER: 13, ESC: 27, Z: 90, A: 65, F: 70, 0: 48, 9: 57, COMMA: 188 };
  for (const [name, code] of Object.entries(expected)) assert.equal(keyCodeOf(name), code, name);
  assert.equal(keyCodeOf('NOPE'), 0);
  assert.deepEqual(eventDef('Z'), { key: 'z', code: 'KeyZ', keyCode: 90 });
  assert.equal(eventDef('NOPE'), null);
});

test('顯示文字', () => {
  assert.equal(keyLabel('SPACE'), '空白鍵');
  assert.equal(hudKeyLabel('SPACE'), 'SPACE');
  assert.equal(keyLabel('LEFT'), '←');
  assert.equal(keyLabel('ALT'), 'Alt');
  assert.equal(keyLabel('Q'), 'Q');
  assert.equal(slotKeyLabel(DEFAULT_BINDINGS, 'X'), 'X');
  assert.equal(slotKeyLabel({ ...DEFAULT_BINDINGS, skill2: 'Q' }, 'X'), 'Q');
  assert.equal(potionKeyLabel({ ...DEFAULT_BINDINGS, potS: 'W' }, 'S'), 'W');
});

test('從鍵盤事件找按鍵名稱：code 優先，退回 keyCode；左右 Alt / Shift 視為同一鍵', () => {
  assert.equal(keyNameFromEvent({ code: 'KeyQ', keyCode: 81 }), 'Q');
  assert.equal(keyNameFromEvent({ code: 'AltRight' }), 'ALT');
  assert.equal(keyNameFromEvent({ code: 'ShiftLeft' }), 'SHIFT');
  assert.equal(keyNameFromEvent({ code: 'NumpadEnter' }), 'ENTER');
  assert.equal(keyNameFromEvent({ code: '', keyCode: 32 }), 'SPACE');
  assert.equal(keyNameFromEvent({ code: '', keyCode: 59 }), 'SEMICOLON');   // Firefox 的分號
  assert.equal(keyNameFromEvent({ code: 'F5', keyCode: 116 }), null);
  assert.equal(keyNameFromEvent(null), null);
});

test('eventMatches：依目前鍵位判斷（互動鍵改成 E 後 F 不再算）', () => {
  assert.equal(eventMatches({ keyCode: 70 }, DEFAULT_BINDINGS, 'interact'), true);
  const kb = { ...DEFAULT_BINDINGS, interact: 'E' };
  assert.equal(eventMatches({ keyCode: 70 }, kb, 'interact'), false);
  assert.equal(eventMatches({ keyCode: 69 }, kb, 'interact'), true);
  assert.equal(eventMatches({ code: 'KeyE' }, kb, 'interact'), true);
  assert.equal(eventMatches(null, kb, 'interact'), false);
});

// ── 重新指定與衝突 ────────────────────────────────────────────────────────────

test('rebind：指定沒人用的鍵', () => {
  const r = rebind(DEFAULT_BINDINGS, 'skill1', 'P');
  assert.equal(r.ok, true);
  assert.equal(r.bindings.skill1, 'P');
  assert.equal(r.swappedWith, undefined);
  assert.equal(DEFAULT_BINDINGS.skill1, 'Z', '不改到傳入的物件');
});

test('rebind：新鍵已被使用 → 兩個動作互換，不會重複', () => {
  const r = rebind(DEFAULT_BINDINGS, 'skill1', 'X');
  assert.equal(r.ok, true);
  assert.equal(r.swappedWith, 'skill2');
  assert.equal(r.bindings.skill1, 'X');
  assert.equal(r.bindings.skill2, 'Z');
  assert.match(r.message, /互換/);
  assert.equal(new Set(Object.values(r.bindings)).size, ACTION_IDS.length);
});

test('rebind：保留鍵、不支援的鍵、未知動作 → 拒絕並附訊息，鍵位不變', () => {
  for (const k of Object.keys(RESERVED_KEYS)) {
    const r = rebind(DEFAULT_BINDINGS, 'jump', k);
    assert.equal(r.ok, false, k);
    assert.match(r.message, /保留/);
    assert.deepEqual(r.bindings, { ...DEFAULT_BINDINGS });
  }
  assert.equal(rebind(DEFAULT_BINDINGS, 'jump', 'F13').ok, false);
  assert.equal(rebind(DEFAULT_BINDINGS, 'jump', null).ok, false);
  assert.equal(rebind(DEFAULT_BINDINGS, 'fly', 'Q').ok, false);
});

test('rebind：指定成目前的鍵 = 沒變', () => {
  const r = rebind(DEFAULT_BINDINGS, 'attack', 'SPACE');
  assert.equal(r.ok, true);
  assert.equal(isDefaultBindings(r.bindings), true);
});

// ── 讀回清理 ──────────────────────────────────────────────────────────────────

test('sanitizeBindings：垃圾輸入回預設、未知動作丟棄、壞值與保留鍵回預設', () => {
  for (const bad of [null, undefined, 42, 'x', [], [1, 2]]) assert.deepEqual(sanitizeBindings(bad), { ...DEFAULT_BINDINGS });
  const s = sanitizeBindings({ skill1: 'P', jump: 'M', attack: 123, evil: 'K', __proto__: { left: 'O' } });
  assert.equal(s.skill1, 'P');
  assert.equal(s.jump, 'Q', '保留鍵不收');
  assert.equal(s.attack, 'SPACE', '型別錯誤回預設');
  assert.equal('evil' in s, false);
  assert.equal(s.left, 'LEFT', '原型上的欄位不收');
});

test('sanitizeBindings：衝突時把不是預設的那個退回預設；仍衝突就整份回預設', () => {
  // skill1 改成 X（和 skill2 預設撞）→ skill1 退回 Z
  const a = sanitizeBindings({ skill1: 'X' });
  assert.equal(a.skill1, 'Z');
  assert.equal(a.skill2, 'X');
  // 兩個自訂互撞 → 兩個都回預設
  const b = sanitizeBindings({ skill1: 'Q', skill2: 'Q' });
  assert.equal(b.skill1, 'Z');
  assert.equal(b.skill2, 'X');
  // 合法的互換留著
  const c = sanitizeBindings({ skill1: 'X', skill2: 'Z' });
  assert.equal(c.skill1, 'X');
  assert.equal(c.skill2, 'Z');
  // 退回預設後仍撞（skill1=X 退回 Z，但 potA 已改成 Z 而且 skill2 改成 Z…）→ 整份預設
  const d = sanitizeBindings({ skill1: 'X', skill2: 'X', potA: 'Z' });
  assert.equal(new Set(Object.values(d)).size, ACTION_IDS.length);
});

// ── 設定持久化 ────────────────────────────────────────────────────────────────

test('設定：keys 欄位預設、存進設定 key、重新讀回、壞值清理、reset 回預設', () => {
  assert.deepEqual(DEFAULT_SETTINGS.keys, DEFAULT_BINDINGS);
  const storage = memStorage();
  const s = createSettings(storage);
  assert.deepEqual(s.get().keys, DEFAULT_BINDINGS);
  let calls = 0;
  s.subscribe(() => { calls++; });
  const r = rebind(s.get().keys, 'skill1', 'Q');
  s.set({ keys: r.bindings });
  assert.equal(calls, 1);
  assert.equal(JSON.parse(storage.raw.get(SETTINGS_KEY)).keys.skill1, 'Q');
  const ref = s.get().keys;
  s.set({ keys: { ...r.bindings } });            // 內容相同
  assert.equal(calls, 1, '內容相同不通知');
  assert.equal(s.get().keys, ref, '內容相同沿用參照');
  s.set({ musicVolume: 10 });
  assert.equal(s.get().keys, ref, '改別的設定不換鍵位參照');
  const s2 = createSettings(storage);
  assert.equal(s2.get().keys.skill1, 'Q');
  s2.reset();
  assert.deepEqual(s2.get().keys, DEFAULT_BINDINGS);
  assert.deepEqual(sanitizeSettings({ keys: 'junk' }).keys, DEFAULT_BINDINGS);
  assert.equal(parseSettings(JSON.stringify({ keys: { attack: 'ESC' } })).keys.attack, 'SPACE');
  assert.equal(parseSettings('{"musicVolume":5}').keys, DEFAULT_BINDINGS, '沒有 keys 欄位的舊設定用預設');
});

// ── 顯示：說明表 / 教學頁 ─────────────────────────────────────────────────────

test('操作說明表跟著鍵位', () => {
  assert.deepEqual(keyChartFor(DEFAULT_BINDINGS), KEY_CHART);
  const kb = { ...DEFAULT_BINDINGS, skill1: 'Q', interact: 'E' };
  const chart = Object.fromEntries(keyChartFor(kb).map((r) => [r.label, r.key]));
  assert.equal(chart['技能 1–4 欄'], 'Q X C V');
  assert.equal(chart['互動 / 對話'], 'E');
});

// ── 觸控鈕 ────────────────────────────────────────────────────────────────────

test('觸控鈕送目前綁定的鍵；放開送按下當時的鍵', () => {
  let kb = { ...DEFAULT_BINDINGS, skill1: 'Q' };
  const log = [];
  const ks = createKeyState((type, def) => log.push(`${type}:${def.key}`), (name) => (TOUCH_ACTIONS[name] ? eventDef(kb[TOUCH_ACTIONS[name]]) : null));
  ks.press('Z');
  kb = { ...kb, skill1: 'W' };   // 按住期間改了設定
  ks.release('Z');
  ks.press('ESC'); ks.release('ESC');   // 不在表內：用 KEYS 的預設
  assert.deepEqual(log, ['keydown:q', 'keyup:q', 'keydown:Escape', 'keyup:Escape']);
  assert.equal(KEYS.ESC.keyCode, 27);
});

// ── 手把 ──────────────────────────────────────────────────────────────────────

function fakePad(pressedIdx = [], axes = [0, 0], index = 0) {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressedIdx.includes(i), value: pressedIdx.includes(i) ? 1 : 0 }));
  return { index, connected: true, mapping: 'standard', buttons, axes };
}

test('padActions：標準配置', () => {
  const all = (idx) => [...padActions(fakePad([idx]))];
  assert.deepEqual(all(PAD.A), ['jump']);
  assert.deepEqual(all(PAD.X), ['attack']);
  assert.deepEqual(all(PAD.Y), ['skill1']);
  assert.deepEqual(all(PAD.B), ['skill2']);
  assert.deepEqual(all(PAD.LB), ['skill3']);
  assert.deepEqual(all(PAD.RB), ['skill4']);
  assert.deepEqual(all(PAD.START), ['pause']);
  assert.deepEqual(all(PAD.UP), ['interact']);
  assert.deepEqual(all(PAD.DOWN), ['down']);
  assert.deepEqual(all(PAD.LEFT), ['left']);
  assert.deepEqual(all(PAD.RIGHT), ['right']);
  assert.deepEqual([...padActions(fakePad([], [-0.9, 0]))], ['left']);
  assert.deepEqual([...padActions(fakePad([], [0.3, 0.2]))], [], '死區內不動');
  assert.deepEqual([...padActions(fakePad([], [0, -0.9]))], ['interact']);
  assert.deepEqual([...padActions(fakePad([], [0.7, 0.55]))], ['right'], '斜推以水平為主');
  assert.deepEqual([...padActions(fakePad([PAD.LEFT], [0.9, 0]))], [], '左右同時 = 不動');
  assert.equal(padActions(null).size, 0);
  assert.equal(padActions({ connected: false, buttons: [{ pressed: true }] }).size, 0);
  assert.deepEqual([...menuActions(new Set(['jump', 'left', 'pause']))], ['confirm', 'left', 'pause']);
});

test('手把橋接：按下 / 放開各送一次、依鍵位、選單 A = Enter、接上 / 拔掉通知', () => {
  let pads = [];
  let menu = false;
  let kb = { ...DEFAULT_BINDINGS };
  const log = [];
  const events = [];
  const resolveKey = (a) => (a === 'pause' ? eventDef('ESC') : a === 'confirm' ? eventDef('ENTER') : eventDef(kb[a]));
  const br = createGamepadBridge({
    getPads: () => pads, emit: (t, d) => log.push(`${t}:${d.code}`), resolveKey, isMenu: () => menu,
    onConnect: () => events.push('connect'), onDisconnect: () => events.push('disconnect'),
  });
  br.poll();
  assert.deepEqual(log, []);
  pads = [fakePad([])];
  br.poll();
  pads = [fakePad([PAD.A])];
  br.poll(); br.poll();
  assert.deepEqual(events, ['connect']);
  assert.deepEqual(log, ['keydown:KeyQ']);
  pads = [fakePad([PAD.X], [1, 0])];
  br.poll();
  assert.deepEqual(log.slice(1), ['keyup:KeyQ', 'keydown:Space', 'keydown:ArrowRight']);
  log.length = 0;
  // 改了鍵位：之後按下的用新鍵，按住中的照舊放開
  kb = { ...kb, skill1: 'P' };
  pads = [fakePad([PAD.Y])];
  br.poll();
  assert.deepEqual(log, ['keyup:Space', 'keyup:ArrowRight', 'keydown:KeyP']);
  log.length = 0;
  menu = true;
  pads = [fakePad([PAD.A])];
  br.poll();
  assert.deepEqual(log, ['keyup:KeyP', 'keydown:Enter']);
  log.length = 0;
  pads = [null];
  br.poll();
  assert.deepEqual(log, ['keyup:Enter']);
  assert.deepEqual(events, ['connect', 'disconnect']);
  // getPads 丟例外也不會壞
  const br2 = createGamepadBridge({ getPads: () => { throw new Error('x'); }, emit: () => {}, resolveKey });
  br2.poll();
  assert.equal(br2.connectedCount(), 0);
});

test('releaseAll：全部放開', () => {
  const log = [];
  let pads = [fakePad([])];
  const br = createGamepadBridge({ getPads: () => pads, emit: (t, d) => log.push(`${t}:${d.code}`), resolveKey: (a) => eventDef(DEFAULT_BINDINGS[a]) });
  br.poll();
  pads = [fakePad([PAD.A, PAD.X])];
  br.poll();
  br.releaseAll();
  assert.deepEqual(log, ['keydown:KeyQ', 'keydown:Space', 'keyup:KeyQ', 'keyup:Space']);
  assert.ok(KEY_TABLE.ALT);
});

test('手把：接上時就按著的輸入（靜止停在 -1 的軸）放開過一次才算數', () => {
  const log = [];
  let pads = [fakePad([PAD.START], [0, -1])];
  const br = createGamepadBridge({ getPads: () => pads, emit: (t, d) => log.push(`${t}:${d.code}`),
    resolveKey: (a) => (a === 'pause' ? eventDef('ESC') : eventDef(DEFAULT_BINDINGS[a])) });
  br.poll(); br.poll();
  assert.deepEqual(log, [], '接上時卡住的暫停 / 互動不送出');
  pads = [fakePad([PAD.START], [0, 0])];
  br.poll();
  assert.deepEqual(log, [], '軸回正，暫停鍵仍按著');
  pads = [fakePad([], [0, -1])];
  br.poll();
  assert.deepEqual(log, ['keydown:KeyF'], '軸放開過之後再推上 → 互動');
});

test('舊版預設鍵位（跳躍 Alt、其餘沒改）→ 換成新預設；自己改過的保留 Alt', () => {
  assert.deepEqual(sanitizeBindings({ ...DEFAULT_BINDINGS, jump: 'ALT' }), { ...DEFAULT_BINDINGS });
  assert.equal(sanitizeBindings({ jump: 'ALT' }).jump, 'Q');
  const custom = sanitizeBindings({ ...DEFAULT_BINDINGS, jump: 'ALT', skill1: 'P' });
  assert.equal(custom.jump, 'ALT');
  assert.equal(custom.skill1, 'P');
});

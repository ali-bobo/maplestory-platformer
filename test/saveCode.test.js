// 存檔代碼：編碼 / 解碼往返、壞代碼、超大代碼、原型污染、記憶體後備
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeSaveCode, decodeSaveCode, codeChecksum, bytesToBase64Url, base64UrlToBytes, describeSave,
  sanitizeState, parseSave, createSaveStore, serializeSave, SAVE_KEY, MAX_SAVE_BYTES, MAX_CODE_CHARS, CODE_PREFIX,
} from '../src/engine/saveManager.js';
import { createInitialGameState, expNeeded } from '../src/config/constants.js';
import { generateEquipment } from '../src/config/equipment.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

function playedState() {
  const gs = createInitialGameState();
  gs.level = 22;
  gs.expNeeded = expNeeded(22);
  gs.exp = 70;
  gs.maxHp = 900; gs.maxMp = 500; gs.atk = 200;
  gs.meso = 45678; gs.killCount = 321; gs.playTime = 5400; gs.skillPoints = 4;
  gs.unlockedSkills = ['Z', 'X', 'C', 'V'];
  gs.skillLevels = { Z: 5, X: 3, C: 2, V: 1, B: 0 };
  gs.equipment.weapon = generateEquipment('weapon', 20);
  gs.equipment.armor = generateEquipment('armor', 20);
  gs.currentMap = 'ruins';
  gs.quests = { active: [{ id: 'skeleton_purge', progress: 4 }], completed: ['reach_town', 'slime_hunt'] };
  gs.deathWarned = true;
  return gs;
}

test('base64url：往返任意位元組（含 1、2、3 的餘數長度）', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 6, 7, 100, 257]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 37 + 11) & 255);
    const b64 = bytesToBase64Url(bytes);
    assert.match(b64, /^[A-Za-z0-9_-]*$/);
    if (len === 0) continue;
    assert.deepEqual(Array.from(base64UrlToBytes(b64)), Array.from(bytes), `len ${len}`);
  }
  assert.equal(base64UrlToBytes('a'), null);          // 長度 4n+1 不合法
  assert.equal(base64UrlToBytes('ab+d'), null);       // + 不是 base64url
  assert.equal(base64UrlToBytes('abc='), null);       // 不接受填充
  assert.equal(base64UrlToBytes('abéd'), null);  // 非 ASCII
});

test('存檔代碼：編碼後再解碼，進度與 sanitizeState 的結果相同', () => {
  const gs = playedState();
  const code = encodeSaveCode(gs, 1234567);
  assert.ok(code.startsWith(`${CODE_PREFIX}:`));
  assert.equal(code.split(':').length, 3);
  assert.match(code, /^TL1:[0-9a-f]{8}:[A-Za-z0-9_-]+$/);
  const res = decodeSaveCode(code);
  assert.ok(res.ok, res.error);
  assert.equal(res.savedAt, 1234567);
  assert.deepEqual(res.state, sanitizeState(gs));
  assert.equal(res.state.level, 22);
  assert.equal(res.state.equipment.weapon.slot, 'weapon');
  assert.equal(res.state.equipment.weapon.atk, gs.equipment.weapon.atk);
  assert.equal(res.state.deathWarned, true);
  assert.deepEqual(res.state.quests, gs.quests);
});

test('存檔代碼：長度合理（含兩件裝備的中期存檔小於 2.5 KB）', () => {
  const code = encodeSaveCode(playedState());
  assert.ok(code.length < 2500, `code length ${code.length}`);
  assert.ok(code.length < MAX_CODE_CHARS);
});

test('存檔代碼：貼上時夾帶換行、空白、引號、全形空白仍可解', () => {
  const code = encodeSaveCode(playedState());
  const wrapped = `  "${code.slice(0, 40)}\n${code.slice(40, 90)}\r\n 　${code.slice(90)}"  `;
  const res = decodeSaveCode(wrapped);
  assert.ok(res.ok, res.error);
  assert.equal(res.state.level, 22);
  assert.doesNotThrow(() => decodeSaveCode(code.toUpperCase()));   // 大小寫被改動：回報錯誤，不丟例外
});

test('存檔代碼：也接受直接貼上存檔檔案的 JSON 內容', () => {
  const res = decodeSaveCode(serializeSave(playedState(), 99));
  assert.ok(res.ok, res.error);
  assert.equal(res.state.level, 22);
  assert.equal(res.savedAt, 99);
});

test('存檔代碼：空、非字串、格式不對、版本不符、檢查碼不符都回報錯誤而不丟例外', () => {
  for (const bad of [undefined, null, 5, {}, [], '', '   ', 'hello', 'TL1', 'TL1:abc', 'TL1:00000000:', 'XX1:00000000:abcd', 'a:b:c:d']) {
    const r = decodeSaveCode(bad);
    assert.equal(r.ok, false, `input ${JSON.stringify(bad)}`);
    assert.equal(typeof r.error, 'string');
  }
  const code = encodeSaveCode(playedState());
  assert.match(decodeSaveCode(code.replace('TL1', 'TL2')).error, /版本/);
  const [p, sum, payload] = code.split(':');
  // 少複製一段 / 改一個字：檢查碼不符
  assert.match(decodeSaveCode(`${p}:${sum}:${payload.slice(0, -5)}`).error, /檢查碼/);
  const flipped = payload.slice(0, 20) + (payload[20] === 'A' ? 'B' : 'A') + payload.slice(21);
  assert.match(decodeSaveCode(`${p}:${sum}:${flipped}`).error, /檢查碼/);
});

test('存檔代碼：檢查碼正確但內容不是存檔（損毀 / 非 UTF-8 / 非 JSON / 別的格式）', () => {
  const wrap = (bytes) => {
    const payload = bytesToBase64Url(bytes);
    return `TL1:${codeChecksum(payload)}:${payload}`;
  };
  const enc = (s) => new TextEncoder().encode(s);
  assert.match(decodeSaveCode(wrap(new Uint8Array([0xff, 0xfe, 0xfd, 0xc3, 0x28]))).error, /損毀/);   // 不合法的 UTF-8
  assert.match(decodeSaveCode(wrap(enc('not json at all'))).error, /JSON|格式/);
  assert.match(decodeSaveCode(wrap(enc('{"hello":"world"}'))).error, /不是本遊戲/);
  assert.match(decodeSaveCode(wrap(enc('{"format":"thief-legend-save","version":99,"state":{}}'))).error, /版本/);
  assert.match(decodeSaveCode(wrap(enc('{"format":"thief-legend-save","version":1}'))).error, /缺失/);
});

test('存檔代碼：過長的輸入在解碼前就被拒絕（不吃記憶體 / 時間）', () => {
  const huge = `TL1:00000000:${'A'.repeat(MAX_CODE_CHARS + 10)}`;
  const t0 = Date.now();
  const r = decodeSaveCode(huge);
  assert.equal(r.ok, false);
  assert.match(r.error, /過長/);
  assert.ok(Date.now() - t0 < 200);
  assert.equal(decodeSaveCode('x'.repeat(5 * 1024 * 1024)).ok, false);
  // 解碼後超過 MAX_SAVE_BYTES 的代碼（檢查碼正確）也要拒絕
  const big = new Uint8Array(MAX_SAVE_BYTES + 3).fill(65);
  const payload = bytesToBase64Url(big);
  if (payload.length <= MAX_CODE_CHARS) {
    const r2 = decodeSaveCode(`TL1:${codeChecksum(payload)}:${payload}`);
    assert.equal(r2.ok, false);
    assert.match(r2.error, /過大/);
  }
  // 直接貼超大 JSON 也一樣被 parseSave 擋
  assert.equal(decodeSaveCode(`{"format":"thief-legend-save","version":1,"state":{},"pad":"${'x'.repeat(MAX_SAVE_BYTES)}"}`).ok, false);
});

test('存檔代碼：原型污染嘗試（__proto__ / constructor / prototype）不會污染 Object.prototype，也不進狀態', () => {
  const json = '{"format":"thief-legend-save","version":1,"savedAt":1,"state":{"level":5,'
    + '"__proto__":{"polluted":"yes","isAdmin":true},'
    + '"constructor":{"prototype":{"polluted2":"yes"}},'
    + '"potions":{"__proto__":{"polluted3":1},"A":3},'
    + '"skillLevels":{"__proto__":{"Z":10},"constructor":9},'
    + '"equipment":{"__proto__":{"atk":999},"weapon":{"rarity":"__proto__","atk":5,"__proto__":{"polluted4":1}}},'
    + '"quests":{"completed":["__proto__","constructor","toString","reach_town"],'
    + '"active":[{"id":"__proto__","progress":3},{"id":"hasOwnProperty","progress":1},{"id":"slime_hunt","progress":2}]},'
    + '"visitedMaps":["__proto__","constructor","sky"],"currentMap":"__proto__","job":"__proto__"}}';
  const bytes = new TextEncoder().encode(json);
  const payload = bytesToBase64Url(bytes);
  const res = decodeSaveCode(`TL1:${codeChecksum(payload)}:${payload}`);
  assert.ok(res.ok, res.error);
  for (const key of ['polluted', 'isAdmin', 'polluted2', 'polluted3', 'polluted4']) {
    assert.equal({}[key], undefined, `Object.prototype.${key}`);
    assert.equal(res.state[key], undefined);
  }
  assert.equal(Object.getPrototypeOf(res.state), Object.prototype);
  assert.equal(res.state.level, 5);
  assert.equal(res.state.potions.A, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(res.state.potions, 'polluted3'), false);
  assert.deepEqual(res.state.quests.completed, ['reach_town']);
  assert.deepEqual(res.state.quests.active, [{ id: 'slime_hunt', progress: 2 }]);
  assert.equal(res.state.currentMap, 'sky');
  assert.equal(res.state.job, 'thief');
  assert.equal(res.state.equipment.weapon.rarity, 'common');
  assert.ok(res.state.visitedMaps.every((k) => k === 'sky'));
  // 直接走 parseSave 同樣安全
  assert.equal(({}).polluted, undefined);
  assert.ok(parseSave(json).ok);
});

test('存檔代碼：惡意數值解碼後被夾回合法範圍', () => {
  const json = JSON.stringify({ format: 'thief-legend-save', version: 1, state: {
    level: 9999, meso: -5, maxHp: 'x', currentMap: 'boss', equipment: { weapon: { slot: 'boots', rarity: 'godlike', atk: 1e12 } },
  } });
  const payload = bytesToBase64Url(new TextEncoder().encode(json));
  const res = decodeSaveCode(`TL1:${codeChecksum(payload)}:${payload}`);
  assert.ok(res.ok);
  assert.equal(res.state.level, 50);
  assert.equal(res.state.meso, 0);
  assert.equal(res.state.currentMap, 'castle');
  assert.equal(res.state.equipment.weapon.slot, 'weapon');
  assert.equal(res.state.equipment.weapon.atk, 99999);
});

test('describeSave：一行摘要含等級與地圖名', () => {
  const s = sanitizeState(playedState());
  assert.match(describeSave(s), /Lv\.22/);
  assert.match(describeSave(s), /古代廢墟/);
  assert.equal(describeSave(null), '');
});

test('deathWarned：只有 true 會被保留，其他值丟棄', () => {
  assert.equal(sanitizeState({ deathWarned: true }).deathWarned, true);
  for (const v of [false, 1, 'true', null, {}]) assert.equal(sanitizeState({ deathWarned: v }).deathWarned, undefined);
});

test('SaveStore 記憶體後備：storage 不可用時存讀仍可用於本次分頁，但狀態誠實回報未存檔', () => {
  const st = createSaveStore(null, { memory: true });
  assert.deepEqual(st.status(), { persistent: false, ok: false, unsaved: true });
  assert.equal(st.has(), false);
  assert.equal(st.save(playedState(), 5), false);   // 沒寫進持久儲存
  assert.equal(st.has(), true);                      // 但同一分頁內讀得到
  const r = st.load();
  assert.ok(r.ok);
  assert.equal(r.state.level, 22);
  assert.equal(r.savedAt, 5);
  st.clear();
  assert.equal(st.has(), false);
  assert.equal(st.load().ok, false);
});

test('SaveStore 記憶體後備：寫入拋例外（容量滿）時用記憶體的最新存檔，恢復後回到儲存', () => {
  const mem = memStorage();
  let failing = false;
  const flaky = {
    getItem: (k) => mem.getItem(k),
    setItem: (k, v) => { if (failing) throw new Error('quota'); mem.setItem(k, v); },
    removeItem: (k) => mem.removeItem(k),
  };
  const st = createSaveStore(flaky, { memory: true });
  const a = createInitialGameState(); a.level = 3;
  assert.equal(st.save(a, 1), true);
  assert.equal(st.status().unsaved, false);
  const b = createInitialGameState(); b.level = 9;
  failing = true;
  assert.equal(st.save(b, 2), false);
  assert.equal(st.status().unsaved, true);
  assert.equal(st.load().state.level, 9);            // 記憶體裡的新進度，不是儲存裡的舊進度
  failing = false;
  assert.equal(st.save(b, 3), true);
  assert.equal(st.status().unsaved, false);
  assert.equal(JSON.parse(mem.getItem(SAVE_KEY)).state.level, 9);
});

test('SaveStore 預設（沒開 memory）行為不變：storage 為 null 時不保存任何東西', () => {
  const st = createSaveStore(null);
  assert.equal(st.save(playedState()), false);
  assert.equal(st.has(), false);
  assert.equal(st.load().ok, false);
});

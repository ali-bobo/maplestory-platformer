import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeState, serializeSave, parseSave, createSaveStore,
  SAVE_KEY, SAVE_VERSION, MAX_SAVE_BYTES,
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
  gs.level = 12;
  gs.expNeeded = expNeeded(12);
  gs.exp = 50;
  gs.maxHp = 700; gs.maxMp = 400; gs.atk = 130; gs.hp = 10; gs.mp = 5;
  gs.meso = 1234; gs.killCount = 80; gs.playTime = 900; gs.skillPoints = 7;
  gs.unlockedSkills = ['Z', 'X', 'C'];
  gs.skillLevels = { Z: 3, X: 2, C: 1, V: 0, B: 0 };
  gs.equipment.weapon = generateEquipment('weapon', 12);
  gs.currentMap = 'ruins';
  gs.quests = { active: [{ id: 'slime_hunt', progress: 3 }], completed: ['reach_town'] };
  gs.skillCooldowns = { Z: 1, X: 2, C: 3, V: 4, B: 5 };
  return gs;
}

test('往返：存檔後讀回，主要進度不變、hp/mp 回滿、冷卻歸零', () => {
  const gs = playedState();
  const res = parseSave(serializeSave(gs));
  assert.ok(res.ok);
  const s = res.state;
  assert.equal(s.level, 12);
  assert.equal(s.exp, 50);
  assert.equal(s.expNeeded, expNeeded(12));
  assert.equal(s.meso, 1234);
  assert.equal(s.killCount, 80);
  assert.equal(s.bossUnlocked, true);
  assert.equal(s.skillPoints, 7);
  assert.deepEqual(s.unlockedSkills, ['Z', 'X', 'C']);
  assert.deepEqual(s.skillLevels, { Z: 3, X: 2, C: 1, V: 0, B: 0 });
  assert.equal(s.currentMap, 'ruins');
  assert.equal(s.hp, 700);
  assert.equal(s.mp, 400);
  assert.deepEqual(s.skillCooldowns, { Z: 0, X: 0, C: 0, V: 0, B: 0 });
  assert.deepEqual(s.quests, gs.quests);
  assert.equal(s.equipment.weapon.slot, 'weapon');
  assert.equal(s.equipment.weapon.atk, gs.equipment.weapon.atk);
  assert.equal(s.equipment.weapon.rarity, gs.equipment.weapon.rarity);
});

test('讀回的狀態與初始狀態結構相同（鍵集合一致），不共用參照', () => {
  const s = sanitizeState(playedState());
  const fresh = createInitialGameState();
  assert.deepEqual(Object.keys(s).sort(), Object.keys(fresh).sort());
  const a = sanitizeState({});
  const b = sanitizeState({});
  assert.notEqual(a.potions, b.potions);
  assert.notEqual(a.equipment, b.equipment);
});

test('非物件 / 空物件 → 預設初始狀態', () => {
  for (const bad of [null, undefined, 5, 'x', [], true]) {
    assert.deepEqual(sanitizeState(bad), createInitialGameState());
  }
  assert.deepEqual(sanitizeState({}), createInitialGameState());
});

test('數值被夾在合法範圍，NaN / 字串 / 無限大不會進入狀態', () => {
  const s = sanitizeState({
    level: 999, exp: -5, maxHp: Infinity, atk: 'abc', meso: -1,
    killCount: NaN, skillPoints: 1e12, speed: 99999, critRate: 5,
    potions: { A: -3, S: 1e9, D: 'x' },
  });
  assert.equal(s.level, 30);
  assert.ok(s.exp >= 0 && s.exp < s.expNeeded);
  assert.equal(s.maxHp, 400);       // Infinity → 預設
  assert.equal(s.atk, 70);          // 非數字 → 預設
  assert.equal(s.meso, 0);
  assert.equal(s.killCount, 0);
  assert.equal(s.skillPoints, 999);
  assert.equal(s.speed, 320);
  assert.equal(s.critRate, 1);
  assert.equal(s.potions.A, 0);
  assert.equal(s.potions.S, 999);
  assert.equal(s.potions.D, 2 + 3); // 預設 D=5
  for (const v of Object.values(s)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v));
  }
});

test('地圖：未知 → sky；副本 → town；Boss → kerning；合法地圖保留', () => {
  assert.equal(sanitizeState({ currentMap: 'nope' }).currentMap, 'sky');
  assert.equal(sanitizeState({ currentMap: '__proto__' }).currentMap, 'sky');
  assert.equal(sanitizeState({ currentMap: 'constructor' }).currentMap, 'sky');
  assert.equal(sanitizeState({ currentMap: 'dungeon' }).currentMap, 'town');
  assert.equal(sanitizeState({ currentMap: 'boss' }).currentMap, 'kerning');
  assert.equal(sanitizeState({ currentMap: 'ellinia' }).currentMap, 'ellinia');
  assert.equal(sanitizeState({ currentMap: 42 }).currentMap, 'sky');
});

test('技能：等級不足的技能不能靠存檔解鎖；Z 永遠解鎖', () => {
  const s = sanitizeState({
    level: 3, unlockedSkills: ['X', 'C', 'V', 'B'],
    skillLevels: { Z: 0, X: 10, C: 10, V: 10, B: 10 },
  });
  assert.deepEqual(s.unlockedSkills, ['Z']);
  assert.equal(s.skillLevels.Z, 1);
  assert.equal(s.skillLevels.X, 0);
  const s2 = sanitizeState({ level: 20, unlockedSkills: ['Z', 'X'], skillLevels: { Z: 1, X: 99 } });
  assert.equal(s2.skillLevels.X, 10);
  assert.ok(s2.unlockedSkills.includes('X'));
});

test('裝備：只保留合法欄位，攻擊者無法夾帶額外屬性或錯誤部位', () => {
  const s = sanitizeState({
    equipment: {
      weapon: { slot: 'armor', rarity: 'godlike', atk: 5, evil: 'x', hp: -50, displayName: '<b>x</b>' },
      armor: 'string',
      gloves: null,
      hacker: { atk: 1 },
    },
  });
  assert.equal(s.equipment.weapon.slot, 'weapon');       // 以所在欄位為準
  assert.equal(s.equipment.weapon.rarity, 'common');      // 非法稀有度 → common
  assert.equal(s.equipment.weapon.hp, 0);
  assert.equal(s.equipment.weapon.evil, undefined);
  assert.equal(s.equipment.weapon.displayName, '普通短劍'); // 不信任存檔內的顯示名稱
  assert.equal(s.equipment.armor, null);
  assert.equal(s.equipment.hacker, undefined);
});

test('任務：未知 id、重複、超範圍進度被過濾', () => {
  const s = sanitizeState({
    quests: {
      active: [
        { id: 'slime_hunt', progress: 99999 },
        { id: 'slime_hunt', progress: 1 },
        { id: 'ghost_quest', progress: 1 },
        { id: 5, progress: 1 },
        null,
      ],
      completed: ['reach_town', 'reach_town', 'ghost_quest', 7],
    },
  });
  assert.deepEqual(s.quests.completed, ['reach_town']);
  assert.equal(s.quests.active.length, 1);
  assert.equal(s.quests.active[0].progress, 5);   // slime_hunt count=5
  // 已完成的任務不得同時是進行中
  const s2 = sanitizeState({ quests: { active: [{ id: 'reach_town', progress: 0 }], completed: ['reach_town'] } });
  assert.equal(s2.quests.active.length, 0);
});

test('原型污染 payload 不會污染 Object.prototype', () => {
  const evil = '{"format":"thief-legend-save","version":1,"state":{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},"level":5}}';
  const res = parseSave(evil);
  assert.ok(res.ok);
  assert.equal(res.state.level, 5);
  assert.equal({}.polluted, undefined);
  assert.equal(res.state.polluted, undefined);
});

test('parseSave：拒絕空字串、壞 JSON、錯誤格式、過新版本、過大檔案', () => {
  assert.equal(parseSave('').ok, false);
  assert.equal(parseSave(null).ok, false);
  assert.equal(parseSave('{not json').ok, false);
  assert.equal(parseSave('[]').ok, false);
  assert.equal(parseSave('{"format":"other","version":1,"state":{}}').ok, false);
  assert.equal(parseSave(`{"format":"thief-legend-save","version":${SAVE_VERSION + 1},"state":{}}`).ok, false);
  assert.equal(parseSave('{"format":"thief-legend-save","version":1}').ok, false);
  assert.equal(parseSave('{"format":"thief-legend-save","version":1,"state":{}}' + ' '.repeat(MAX_SAVE_BYTES)).ok, false);
  const ok = parseSave('{"format":"thief-legend-save","version":1,"state":{}}');
  assert.ok(ok.ok);
  assert.equal(ok.savedAt, 0);
});

test('SaveStore：存 / 讀 / has / clear', () => {
  const st = createSaveStore(memStorage());
  assert.equal(st.has(), false);
  assert.equal(st.load().empty, true);
  assert.equal(st.save(playedState(), 1000), true);
  assert.equal(st.has(), true);
  const r = st.load();
  assert.ok(r.ok);
  assert.equal(r.savedAt, 1000);
  assert.equal(r.state.level, 12);
  st.clear();
  assert.equal(st.has(), false);
});

test('SaveStore：storage 不可用或拋例外時不崩潰', () => {
  const none = createSaveStore(null);
  assert.equal(none.save(createInitialGameState()), false);
  assert.equal(none.load().ok, false);
  assert.equal(none.has(), false);
  none.clear();
  const throwing = createSaveStore({
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('denied'); },
  });
  assert.equal(throwing.save(createInitialGameState()), false);
  assert.equal(throwing.load().ok, false);
  assert.equal(throwing.has(), false);
  throwing.clear();
});

test('SaveStore：儲存內容被竄改成垃圾時 load 回報失敗而非丟例外', () => {
  const mem = memStorage();
  mem.setItem(SAVE_KEY, 'garbage');
  assert.equal(createSaveStore(mem).load().ok, false);
});

test('重複存讀具冪等性：sanitize(sanitize(x)) 與 sanitize(x) 相同', () => {
  const once = sanitizeState(playedState());
  const twice = sanitizeState(once);
  assert.deepEqual(twice, once);
});

test('相容舊版存檔格式：{ version, savedAt, gameState }（無 format 欄位）', () => {
  const legacy = JSON.stringify({
    version: 1, savedAt: 1234,
    gameState: { level: 8, exp: 5, maxHp: 540, meso: 321, currentMap: 'henesys', hp: 3 },
  });
  const res = parseSave(legacy);
  assert.ok(res.ok);
  assert.equal(res.savedAt, 1234);
  assert.equal(res.state.level, 8);
  assert.equal(res.state.meso, 321);
  assert.equal(res.state.currentMap, 'henesys');
  assert.equal(res.state.hp, res.state.maxHp);
  // 沒有 format 也沒有 gameState 的東西仍然拒絕
  assert.equal(parseSave('{"version":1,"state":{}}').ok, false);
  assert.equal(parseSave('{"version":1}').ok, false);
});

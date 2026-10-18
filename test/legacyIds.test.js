// 舊存檔識別字遷移：改名前的地圖 key / 徽章 id 讀檔後要換成新名，不能被當成未知值丟掉
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_MAP_KEYS, LEGACY_BADGE_IDS, migrateLegacyIds, migrateMapKey, migrateBadgeId,
} from '../src/engine/legacyIds.js';
import {
  sanitizeState, parseSave, createSaveStore, encodeSaveCode, decodeSaveCode, bytesToBase64Url, codeChecksum,
  SAVE_KEY, describeSave,
} from '../src/engine/saveManager.js';
import { MAPS } from '../src/config/maps.js';
import { BADGE_IDS, BADGES } from '../src/config/badges.js';
import { MAP_SCENE_KEYS } from '../src/config/constants.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

// 改名前的存檔（state 欄位用的是舊名）
const OLD_STATE = {
  level: 22, exp: 10, meso: 4321, killCount: 300,
  currentMap: 'kerning',
  visitedMaps: ['sky', 'henesys', 'ellinia', 'ruins', 'town', 'kerning'],
  badges: ['sky_1', 'henesys_1', 'henesys_3', 'ellinia_2', 'kerning_1', 'kerning_2', 'town_1', 'ruins_1', 'harbor_1', 'shrine_1'],
  badgeRewards: [10],
  quests: { active: [], completed: [] },
};

test('對照表：新名都存在、舊名都已不存在（地圖、場景、徽章）', () => {
  for (const [oldKey, newKey] of Object.entries(LEGACY_MAP_KEYS)) {
    assert.ok(MAPS[newKey], `新地圖 ${newKey} 不存在`);
    assert.ok(MAP_SCENE_KEYS[newKey], `新地圖 ${newKey} 沒有場景`);
    assert.equal(MAPS[oldKey], undefined, `舊地圖 key ${oldKey} 不應再使用`);
  }
  for (const [oldId, newId] of Object.entries(LEGACY_BADGE_IDS)) {
    assert.ok(BADGE_IDS.includes(newId), `新徽章 ${newId} 不存在`);
    assert.ok(!BADGE_IDS.includes(oldId), `舊徽章 id ${oldId} 不應再使用`);
    // 徽章改名要跟著所在地圖的改名
    const oldMap = oldId.replace(/_\d+$/, '');
    assert.equal(BADGES.find((b) => b.id === newId).map, LEGACY_MAP_KEYS[oldMap]);
  }
});

test('migrateMapKey / migrateBadgeId：只換表上的舊名，其他原樣（含原型鏈上的名字）', () => {
  assert.equal(migrateMapKey('henesys'), 'forest');
  assert.equal(migrateMapKey('ellinia'), 'mystic');
  assert.equal(migrateMapKey('kerning'), 'alley');
  assert.equal(migrateMapKey('ruins'), 'ruins');
  assert.equal(migrateMapKey('constructor'), 'constructor');
  assert.equal(migrateMapKey(42), 42);
  assert.equal(migrateBadgeId('henesys_2'), 'forest_2');
  assert.equal(migrateBadgeId('kerning_2'), 'alley_2');
  assert.equal(migrateBadgeId('sky_1'), 'sky_1');
  assert.equal(migrateBadgeId('__proto__'), '__proto__');
});

test('migrateLegacyIds：不改動輸入物件，非物件原樣回傳', () => {
  const input = JSON.parse(JSON.stringify(OLD_STATE));
  const out = migrateLegacyIds(input);
  assert.deepEqual(input, OLD_STATE);
  assert.equal(out.currentMap, 'alley');
  assert.deepEqual(out.visitedMaps, ['sky', 'forest', 'mystic', 'ruins', 'town', 'alley']);
  assert.equal(migrateLegacyIds(null), null);
  assert.equal(migrateLegacyIds('x'), 'x');
  const arr = [];
  assert.equal(migrateLegacyIds(arr), arr);
});

test('sanitizeState：舊存檔 → 同一張地圖、同樣的去過地圖、徽章一枚不少、獎勵門檻保留', () => {
  const s = sanitizeState(OLD_STATE);
  assert.equal(s.currentMap, 'alley');
  assert.equal(s.spawnX, MAPS.alley.spawnX ?? s.spawnX);
  assert.deepEqual([...s.visitedMaps].sort(), ['alley', 'forest', 'mystic', 'ruins', 'sky', 'town']);
  assert.equal(s.badges.length, OLD_STATE.badges.length);
  for (const id of ['forest_1', 'forest_3', 'mystic_2', 'alley_1', 'alley_2']) assert.ok(s.badges.includes(id), id);
  assert.deepEqual(s.badgeRewards, [10]);
  assert.equal(s.level, 22);
  assert.equal(s.meso, 4321);
  assert.equal(describeSave(s).includes(MAPS.alley.name), true);
});

test('sanitizeState：每張改名地圖都能從舊 key 讀回', () => {
  for (const [oldKey, newKey] of Object.entries(LEGACY_MAP_KEYS)) {
    assert.equal(sanitizeState({ currentMap: oldKey }).currentMap, newKey);
  }
});

test('舊存檔沒有 visitedMaps：從舊的 currentMap 推算的路徑也是新名', () => {
  const s = sanitizeState({ level: 20, currentMap: 'ellinia' });
  assert.equal(s.currentMap, 'mystic');
  assert.ok(s.visitedMaps.includes('forest') && s.visitedMaps.includes('mystic'), s.visitedMaps.join(','));
});

test('新舊混雜（同一枚徽章新舊 id 都有）：去重，不重複計數', () => {
  const s = sanitizeState({ badges: ['henesys_1', 'forest_1'], visitedMaps: ['henesys', 'forest'], currentMap: 'forest' });
  assert.deepEqual(s.badges, ['forest_1']);
  assert.equal(s.visitedMaps.filter((k) => k === 'forest').length, 1);
});

test('localStorage 裡的舊存檔（舊版 gameState 格式與新版 state 格式）都能讀回', () => {
  const legacyText = JSON.stringify({ version: 1, savedAt: 5, gameState: OLD_STATE });
  const currentText = JSON.stringify({ format: 'thief-legend-save', version: 1, savedAt: 6, state: OLD_STATE });
  for (const text of [legacyText, currentText]) {
    const storage = memStorage();
    storage.setItem(SAVE_KEY, text);
    const res = createSaveStore(storage).load();
    assert.equal(res.ok, true);
    assert.equal(res.state.currentMap, 'alley');
    assert.ok(res.state.badges.includes('forest_1'));
  }
  assert.equal(parseSave(legacyText).state.currentMap, 'alley');
});

test('舊版產生的存檔代碼（內容是舊名）匯入後換成新名；重新匯出只剩新名', () => {
  const json = JSON.stringify({ format: 'thief-legend-save', version: 1, savedAt: 7, state: OLD_STATE });
  const payload = bytesToBase64Url(new TextEncoder().encode(json));
  const code = `TL1:${codeChecksum(payload)}:${payload}`;
  const res = decodeSaveCode(code);
  assert.equal(res.ok, true);
  assert.equal(res.state.currentMap, 'alley');
  assert.ok(res.state.badges.includes('mystic_2'));
  const again = decodeSaveCode(encodeSaveCode(res.state));
  const text = JSON.stringify(again.state);
  assert.ok(!/henesys|ellinia|kerning/.test(text), text);
  assert.equal(again.state.badges.length, OLD_STATE.badges.length);
});

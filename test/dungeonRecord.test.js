// 副本每日次數：換 localStorage key 時要把舊 key 的紀錄搬過去一次
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, LEGACY_STORAGE_KEY, getRemainingEntries, recordDungeonEntry,
} from '../src/engine/dungeonRecord.js';

function memStorage() {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(() => { globalThis.localStorage = memStorage(); });

test('新 key 與舊 key 不同', () => {
  assert.notEqual(STORAGE_KEY, LEGACY_STORAGE_KEY);
});

test('只有舊 key：讀到舊紀錄，並搬到新 key、移除舊 key', () => {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ date: today(), counts: { slime_cave: 2 } }));
  assert.equal(getRemainingEntries('slime_cave', 3), 1);
  assert.equal(localStorage.getItem(LEGACY_STORAGE_KEY), null);
  assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)).counts, { slime_cave: 2 });
  recordDungeonEntry('slime_cave');
  assert.equal(getRemainingEntries('slime_cave', 3), 0);
});

test('新 key 已有資料：不看舊 key', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today(), counts: { slime_cave: 1 } }));
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ date: today(), counts: { slime_cave: 3 } }));
  assert.equal(getRemainingEntries('slime_cave', 3), 2);
});

test('都沒有：全新紀錄，寫入新 key', () => {
  assert.equal(getRemainingEntries('slime_cave', 3), 3);
  recordDungeonEntry('slime_cave');
  assert.ok(localStorage.getItem(STORAGE_KEY));
  assert.equal(localStorage.getItem(LEGACY_STORAGE_KEY), null);
});

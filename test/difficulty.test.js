// 難度倍率：普通不改數值、簡單 / 困難的 HP 與傷害倍率、未知值當普通、設定白名單
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTIES, DIFFICULTY_IDS, DEFAULT_DIFFICULTY, difficultyOf, isDifficultyId,
  scaleMonsterHp, scaleMonsterAtk, scaleMonsterStats,
} from '../src/engine/difficulty.js';
import { createSettings, sanitizeSettings, DEFAULT_SETTINGS } from '../src/engine/settings.js';
import { MONSTERS } from '../src/config/monsters.js';

test('三種難度、預設普通，倍率為 簡單 0.8/0.7、普通 1/1、困難 1.4/1.3', () => {
  assert.deepEqual(DIFFICULTY_IDS, ['easy', 'normal', 'hard']);
  assert.equal(DEFAULT_DIFFICULTY, 'normal');
  assert.equal(DEFAULT_SETTINGS.difficulty, 'normal');
  assert.deepEqual([DIFFICULTIES.easy.hp, DIFFICULTIES.easy.dmg], [0.8, 0.7]);
  assert.deepEqual([DIFFICULTIES.normal.hp, DIFFICULTIES.normal.dmg], [1, 1]);
  assert.deepEqual([DIFFICULTIES.hard.hp, DIFFICULTIES.hard.dmg], [1.4, 1.3]);
  assert.deepEqual(DIFFICULTY_IDS.map((id) => DIFFICULTIES[id].label), ['簡單', '普通', '困難']);
});

test('普通難度：每隻怪物的 HP / 攻擊力原樣不變（既有平衡與 e2e 數字不受影響）', () => {
  const list = Object.values(MONSTERS);
  assert.ok(list.length > 10);
  for (const m of list) {
    assert.equal(scaleMonsterHp(m.hp, 'normal'), m.hp, m.id);
    assert.equal(scaleMonsterAtk(m.atk, 'normal'), m.atk, m.id);
  }
  assert.deepEqual(scaleMonsterStats({ hp: 28000, atk: 160 }, 'normal'), { hp: 28000, atk: 160 });
});

test('簡單 / 困難：HP 四捨五入取整、攻擊力不取整；順序 簡單 < 普通 < 困難', () => {
  assert.deepEqual(scaleMonsterStats({ hp: 28000, atk: 160 }, 'hard'), { hp: 39200, atk: 208 });
  assert.deepEqual(scaleMonsterStats({ hp: 28000, atk: 160 }, 'easy'), { hp: 22400, atk: 112 });
  assert.equal(scaleMonsterHp(15, 'easy'), 12);
  assert.ok(Math.abs(scaleMonsterAtk(5, 'easy') - 3.5) < 1e-9);
  for (const m of Object.values(MONSTERS)) {
    const e = scaleMonsterStats(m, 'easy'), n = scaleMonsterStats(m, 'normal'), h = scaleMonsterStats(m, 'hard');
    assert.ok(e.hp <= n.hp && n.hp < h.hp && e.hp >= 1, m.id);
    assert.ok(e.atk < n.atk && n.atk < h.atk, m.id);
    assert.ok(Number.isInteger(h.hp) && Number.isInteger(e.hp), m.id);
  }
});

test('未知 / 壞值一律當普通', () => {
  for (const bad of [undefined, null, '', 'nightmare', 'HARD', 3, {}, '__proto__']) {
    assert.equal(isDifficultyId(bad), false);
    assert.equal(difficultyOf(bad).id, 'normal');
    assert.equal(scaleMonsterHp(100, bad), 100);
    assert.equal(scaleMonsterAtk(10, bad), 10);
  }
  assert.ok(Number.isNaN(scaleMonsterHp(NaN, 'hard')));   // 非數字不亂算，原樣傳回
});

test('設定：difficulty 只認白名單、會存檔、重設回普通', () => {
  assert.equal(sanitizeSettings({ difficulty: 'hard' }).difficulty, 'hard');
  assert.equal(sanitizeSettings({ difficulty: 'insane' }).difficulty, 'normal');
  assert.equal(sanitizeSettings({ difficulty: 2 }).difficulty, 'normal');
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const s = createSettings(storage);
  s.set({ difficulty: 'easy' });
  assert.equal(createSettings(storage).get().difficulty, 'easy');
  s.reset();
  assert.equal(s.get().difficulty, 'normal');
});

// 載入提示：內容涵蓋玩法與世界觀、挑選器不連續重複、標籤篩選
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, tipsWithTag, pickTipIndex, pickTip, createTipRotator } from '../src/config/tips.js';
import { MAPS } from '../src/config/maps.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('提示約 20 則以上、不重複、長度適中，玩法 / 世界觀都有', () => {
  assert.ok(TIPS.length >= 20, `${TIPS.length}`);
  assert.equal(new Set(TIPS.map((t) => t.text)).size, TIPS.length);
  for (const t of TIPS) {
    assert.ok(['play', 'world'].includes(t.tag), t.text);
    assert.ok(t.text.length >= 8 && t.text.length <= 44, `長度 ${t.text.length}：${t.text}`);
  }
  assert.ok(tipsWithTag('play').length >= 8);
  assert.ok(tipsWithTag('world').length >= 6);
  assert.ok(tipsWithTag('death').length >= 2);
  assert.equal(tipsWithTag(null).length, TIPS.length);
});

test('提示涵蓋操作、技能、存檔、死亡懲罰、Lv10 轉職，並提到台北都會', () => {
  const all = TIPS.map((t) => t.text).join('\n');
  for (const word of ['跳', '技能', '存檔', '裝備', 'Lv10', '台北都會']) assert.ok(all.includes(word), word);
});

test('世界觀提示提到的地圖名稱都是本作真的地圖', () => {
  const names = Object.values(MAPS).map((m) => m.name);
  for (const t of tipsWithTag('world')) assert.ok(names.some((n) => t.text.includes(n)), t.text);
});

test('pickTipIndex：範圍正確、avoid 時不會挑到同一則、空 / 單一清單', () => {
  const list = TIPS;
  assert.equal(pickTipIndex(list, () => 0), 0);
  assert.equal(pickTipIndex(list, () => 0.9999999), list.length - 1);
  assert.equal(pickTipIndex(list, () => 1.5), list.length - 1);   // 壞亂數夾範圍
  assert.equal(pickTipIndex(list, () => NaN), 0);
  for (let avoid = 0; avoid < list.length; avoid++) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const i = pickTipIndex(list, () => r, avoid);
      assert.ok(i >= 0 && i < list.length && i !== avoid, `avoid ${avoid} r ${r} → ${i}`);
    }
  }
  assert.equal(pickTipIndex([], Math.random), -1);
  assert.equal(pickTipIndex([{ text: 'x' }], Math.random, 0), 0);
});

test('pickTip：依標籤挑、沒有符合的標籤從全部挑', () => {
  const deaths = tipsWithTag('death').map((t) => t.text);
  for (const r of [0, 0.3, 0.6, 0.99]) assert.ok(deaths.includes(pickTip(() => r, 'death')));
  assert.ok(TIPS.some((t) => t.text === pickTip(() => 0.5, 'no-such-tag')));
});

test('輪播器：連續兩次不會一樣，長時間會輪到多則', () => {
  const rot = createTipRotator(seq([0, 0, 0.5, 0.5, 0.9, 0.1, 0.33, 0.77]));
  let prev = rot.next();
  const seen = new Set([prev]);
  for (let i = 0; i < 40; i++) {
    const cur = rot.next();
    assert.notEqual(cur, prev);
    seen.add(cur);
    prev = cur;
  }
  assert.ok(seen.size >= 5);
});

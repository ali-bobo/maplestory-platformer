// 地圖節點名稱排版
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels } from '../src/ui/labelLayout.js';

const rectOf = (c, it) => ({ l: c.x - it.w / 2, r: c.x + it.w / 2, t: c.y - it.h / 2, b: c.y + it.h / 2 });
const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

test('空間夠時用偏好的一側（上 / 下）', () => {
  const items = [{ x: 100, y: 100, w: 80, h: 24, pref: 1 }, { x: 400, y: 100, w: 80, h: 24, pref: -1 }];
  const out = placeLabels(items);
  assert.ok(out[0].y > 100 && out[1].y < 100);
  assert.equal(out[0].x, 100);
});

test('相鄰節點的標籤互不重疊，也不蓋住其他節點圖示', () => {
  // 節點間距比標籤寬度還小（世界地圖手機字級的情況）
  const items = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 100 + i * 50, y: 200 + (i % 2) * 20, w: 88, h: 26, pref: i % 2 === 0 ? 1 : -1 }));
  const out = placeLabels(items, { iconR: 20 });
  const rects = out.map((c, i) => rectOf(c, items[i]));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) assert.ok(!hit(rects[i], rects[j]), `標籤 ${i} 與 ${j} 重疊`);
    items.forEach((it, j) => {
      if (j === i) return;
      assert.ok(!hit(rects[i], { l: it.x - 20, r: it.x + 20, t: it.y - 20, b: it.y + 20 }), `標籤 ${i} 蓋住節點 ${j}`);
    });
  }
});

test('超出邊界的位置會被跳過；全部放不下就退回偏好位置', () => {
  const items = [{ x: 50, y: 20, w: 60, h: 20, pref: -1 }];   // 偏好「上」但上面超出邊界
  const out = placeLabels(items, { iconR: 10, bounds: { l: 0, t: 0, r: 200, b: 200 } });
  assert.ok(out[0].y > 20);
  const stuck = placeLabels([{ x: 5, y: 5, w: 300, h: 300, pref: 1 }], { bounds: { l: 0, t: 0, r: 10, b: 10 } });
  assert.equal(stuck.length, 1);
});

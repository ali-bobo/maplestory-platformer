// 介面縮放與中文換行
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scaledFontPx, popupScale, uiScaleFactor, needsAutoBoost, UI_SCALE_FACTORS, MIN_CSS_PX, MAX_MUL,
} from '../src/ui/uiScale.js';
import { wrapWithMeasure } from '../src/ui/textWrap.js';
import { readableFontPx, touchTargetPx, dialogScale, pickNearest, MIN_READ_CSS, MIN_TOUCH_CSS } from '../src/ui/uiScale.js';

const desktop = { factor: 1, canvasScale: 1, touch: false };
const phone = { factor: 1, canvasScale: 693 / 1280, touch: true };   // 844x390 橫放

test('桌機標準大小：字級不變；介面大小小 / 大依係數縮放', () => {
  assert.equal(scaledFontPx(12, desktop), 12);
  assert.equal(scaledFontPx(12, { ...desktop, factor: UI_SCALE_FACTORS.small }), 11);
  assert.equal(scaledFontPx(12, { ...desktop, factor: UI_SCALE_FACTORS.large }), 15);
  assert.equal(uiScaleFactor('large'), 1.25);
  assert.equal(uiScaleFactor('nonsense'), 1);
  assert.equal(uiScaleFactor('__proto__'), 1);
});

test('桌機視窗縮得很小也不自動放大（只有觸控裝置才自動放大）', () => {
  assert.equal(needsAutoBoost({ factor: 1, canvasScale: 0.4, touch: false }), false);
  assert.equal(scaledFontPx(12, { factor: 1, canvasScale: 0.4, touch: false }), 12);
});

test('手機橫放（縮放約 0.54）：小字被放大到螢幕上至少 9 CSS px，但不超過 1.6 倍', () => {
  assert.equal(needsAutoBoost(phone), true);
  const scale = phone.canvasScale;
  for (const base of [9, 10, 11, 12, 13, 14]) {
    const px = scaledFontPx(base, phone);
    assert.ok(px * scale >= MIN_CSS_PX - 0.6 || px >= Math.round(base * MAX_MUL), `base ${base} → ${px}px (${(px * scale).toFixed(1)} css)`);
    assert.ok(px <= Math.round(base * MAX_MUL), `base ${base} 不超過 ${MAX_MUL} 倍`);
    assert.ok(px >= base, `base ${base} 不縮小`);
  }
  assert.ok(scaledFontPx(12, phone) * scale >= 9);
  assert.equal(scaledFontPx(40, phone), 40);                    // 本來就夠大的字不動
  assert.ok(scaledFontPx(10, phone, 1.2) <= 12);                // 版面擠的文字可壓低上限
});

test('畫布縮放比 0.8 以上的觸控裝置（平板）不自動放大', () => {
  assert.equal(needsAutoBoost({ factor: 1, canvasScale: 0.85, touch: true }), false);
  assert.equal(scaledFontPx(12, { factor: 1, canvasScale: 0.85, touch: true }), 12);
  assert.equal(needsAutoBoost({ factor: 1, canvasScale: 0, touch: true }), false);   // 還沒量到尺寸
  assert.equal(needsAutoBoost(null), false);
});

test('popupScale：桌機標準不放大；手機放大但不超出可用空間；至少 1', () => {
  assert.equal(popupScale(desktop), 1);
  assert.equal(popupScale({ ...desktop, factor: 0.9 }), 1);          // 介面大小「小」不把彈窗縮到 1 以下
  assert.ok(popupScale({ ...desktop, factor: 1.25 }) > 1.2);
  const k = popupScale(phone);
  assert.ok(k > 1.3 && k <= MAX_MUL, `k=${k}`);
  const fitted = popupScale(phone, { w: 340, h: 400, availW: 1260, availH: 586 });
  assert.ok(fitted * 400 <= 586 + 1e-6);
  assert.equal(popupScale(phone, { w: 340, h: 900, availH: 586 }), 1);   // 放不下就維持原樣
});

test('wrapWithMeasure：整段中文沒有空白也能依寬度逐字換行', () => {
  const measure = (u) => u.length * 10;   // 每個單位 10px × 字數
  const out = wrapWithMeasure('一二三四五六七八九十', 50, measure);
  assert.equal(out, '一二三四五\n六七八九十');
  assert.equal(wrapWithMeasure('短', 50, measure), '短');
  assert.equal(wrapWithMeasure('', 50, measure), '');
  assert.equal(wrapWithMeasure('一二\n三四五六七八', 40, measure), '一二\n三四五六\n七八');   // 保留原有換行
});

test('wrapWithMeasure：連續英數字不被拆開、行首不留空白', () => {
  const measure = (u) => u.length * 10;
  const out = wrapWithMeasure('按 ESC 關閉視窗後再繼續', 60, measure);
  assert.ok(!out.split('\n').some((l) => /^\s/.test(l)));
  assert.ok(out.split('\n').some((l) => l.includes('ESC')));          // ESC 三個字母在同一行
  assert.ok(out.split('\n').every((l) => measure(l) <= 60 + 1));
  assert.doesNotThrow(() => wrapWithMeasure('abc', 0, measure));      // 寬度 0 不當機
});

// ── 對話框 / 世界地圖的手機可讀與觸控區 ──────────────────────────────────────────────
test('readableFontPx：手機文字螢幕大小 >= 12 CSS px；桌機 / 平板不變', () => {
  for (const base of [12, 13, 14, 15, 17]) {
    assert.ok(readableFontPx(base, phone) * phone.canvasScale >= MIN_READ_CSS - 0.01, `base ${base}`);
  }
  assert.equal(readableFontPx(12, desktop), 12);
  assert.equal(readableFontPx(14, { factor: 1, canvasScale: 0.85, touch: true }), 14);
  assert.equal(readableFontPx(30, phone), 30);   // 本來就夠大
  assert.ok(readableFontPx(12, phone, 1.2) <= 14);   // 可壓低放大上限
});

test('touchTargetPx：觸控裝置按鈕 >= 44 CSS px；桌機維持設計值；有上限', () => {
  assert.equal(touchTargetPx(34, desktop), 34);
  assert.ok(touchTargetPx(34, phone) * phone.canvasScale >= MIN_TOUCH_CSS - 0.01);
  assert.equal(touchTargetPx(120, phone), 120);   // 已經夠大不縮小
  assert.ok(touchTargetPx(10, { factor: 1, canvasScale: 0.2, touch: true }) <= 120);
  assert.equal(touchTargetPx(34, null), 34);
});

test('dialogScale：桌機 = 1；手機放大到 14px 字 >= 12 CSS px，受可用空間限制，至少 1', () => {
  assert.equal(dialogScale(desktop, { w: 480, h: 200 }), 1);
  const k = dialogScale(phone, { w: 480, h: 200, availW: 1256, availH: 584 });
  assert.ok(k * 14 * phone.canvasScale >= MIN_READ_CSS - 0.5, `k=${k}`);
  assert.ok(k <= 1.8);
  assert.ok(dialogScale(phone, { w: 480, h: 500, availH: 584 }) * 500 <= 584 + 1e-6);
  assert.equal(dialogScale(phone, { w: 480, h: 900, availH: 584 }), 1);   // 放不下就維持原樣
});

test('pickNearest：選最近的點；超出半徑回 -1', () => {
  const pts = [{ x: 0, y: 0 }, { x: 56, y: 0 }, { x: 200, y: 0 }];
  assert.equal(pickNearest(pts, 30, 0, 41), 1);
  assert.equal(pickNearest(pts, 20, 5, 41), 0);
  assert.equal(pickNearest(pts, 120, 0, 41), -1);
  assert.equal(pickNearest([], 0, 0, 41), -1);
});

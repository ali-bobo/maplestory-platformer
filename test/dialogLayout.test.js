// NPC 對話框 / 商店面板版面：各種手機橫放可見視窗下，面板必須放進 HUD 上下之間、按鈕觸控區夠大
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dialogFrame, layoutNpcDialog, layoutShop, dialogPanelTop, DIALOG_TOP, DIALOG_BOTTOM_GAP,
} from '../src/ui/dialogLayout.js';
import { MIN_TOUCH_CSS } from '../src/ui/uiScale.js';
import { toGameRect, touchReservedRects } from '../src/ui/touchReserve.js';
import { viewportSize, sizeChanged } from '../src/engine/viewportFit.js';

const HUD_TOP = 600;
// 可見視窗 → 畫布縮放（Scale.FIT：寬高各自的比例取小）
const scaleOf = (vw, vh) => Math.min(vw / 1280, vh / 720);
const ctxOf = (vw, vh, touch = true) => ({ factor: 1, canvasScale: scaleOf(vw, vh), touch });
const PHONES = [[844, 340], [740, 320], [667, 300], [915, 412], [844, 390], [667, 375], [932, 430], [568, 320]];

test('dialogFrame：預設框避開上方 HUD、下方狀態列與右上小地圖，且左右對稱', () => {
  const f = dialogFrame({ width: 1280, hudTop: HUD_TOP });
  assert.equal(f.top, DIALOG_TOP);
  assert.equal(f.bottom, HUD_TOP - DIALOG_BOTTOM_GAP);
  assert.equal(f.cx, 640);
  assert.ok(f.cx + f.halfW <= 1100, '右緣不超過小地圖');
  assert.equal(f.w, f.halfW * 2);
  assert.equal(f.h, f.bottom - f.top);
});

test('dialogFrame：貼在左 / 右邊緣的觸控保留矩形會讓框變窄；上下方的與遠處的不影響', () => {
  const base = dialogFrame({ width: 1280, hudTop: HUD_TOP });
  const near = dialogFrame({ reserved: [{ l: 200, t: 200, r: 400, b: 400 }] });   // 左側按鈕群：內緣離中心 240
  assert.ok(near.halfW < base.halfW && near.halfW <= 240);
  const right = dialogFrame({ reserved: [{ l: 900, t: 100, r: 1100, b: 300 }] });
  assert.ok(right.halfW <= 260);
  const farAway = dialogFrame({ reserved: [{ l: 10, t: 10, r: 100, b: 60 }] });   // 左上暫停鈕
  assert.equal(farAway.halfW, base.halfW);
  const below = dialogFrame({ reserved: [{ l: 400, t: 610, r: 500, b: 700 }] });  // 在 HUD 列裡
  assert.equal(below.halfW, base.halfW);
  assert.equal(dialogFrame({ reserved: [null, { l: 5, t: 5, r: 5, b: 5 }] }).halfW, base.halfW);
});

test('layoutNpcDialog：各種手機視窗下，面板放得進框、按鈕 >= 44 CSS px（或已被框限制到最大）', () => {
  for (const [vw, vh] of PHONES) {
    const ctx = ctxOf(vw, vh);
    const frame = dialogFrame({ width: 1280, hudTop: HUD_TOP });
    for (const hasChoices of [false, true]) {
      for (const msgH1 of [60, 80, 130]) {   // 3 ~ 6 行
        const L = layoutNpcDialog({ ctx, frame, msgH1, hasChoices });
        const tag = `${vw}x${vh} choices=${hasChoices} msg=${msgH1}`;
        assert.ok(L.fits, `${tag}：放得進框（面板 ${L.panelW}x${L.panelH}，框 ${frame.w}x${frame.h}，k=${L.k}）`);
        assert.ok(L.k >= 0.7);
        const top = dialogPanelTop(frame, L.panelH);
        assert.ok(top >= frame.top && top + L.panelH <= frame.bottom + 0.001, `${tag}：面板在框內 ${top}~${top + L.panelH}`);
        // 按鈕螢幕高度（容許 1 px 四捨五入）
        assert.ok(L.closeH * ctx.canvasScale >= MIN_TOUCH_CSS - 1, `${tag}：關閉鈕螢幕高 ${(L.closeH * ctx.canvasScale).toFixed(1)}`);
        if (hasChoices) assert.ok(L.bh * ctx.canvasScale >= MIN_TOUCH_CSS - 1, `${tag}：選項鈕螢幕高`);
        // 版面由上而下不重疊
        assert.ok(L.msgTop < L.choiceTop && L.choiceTop <= L.closeTop && L.closeTop + L.closeH <= L.panelH);
      }
    }
  }
});

test('layoutNpcDialog：桌機維持原樣（k = 1、關閉鈕設計高度）', () => {
  const frame = dialogFrame({ width: 1280, hudTop: HUD_TOP });
  const L = layoutNpcDialog({ ctx: ctxOf(1280, 720, false), frame, msgH1: 80, hasChoices: true });
  assert.equal(L.k, 1);
  assert.equal(L.panelW, 480);
  assert.equal(L.bh, 34);
  assert.equal(L.closeH, 24);
});

test('layoutNpcDialog：放不進框時倍率會往下降，但不低於 0.7', () => {
  const L = layoutNpcDialog({ ctx: ctxOf(520, 200), frame: dialogFrame({ width: 1280, hudTop: HUD_TOP }), msgH1: 400, hasChoices: true });
  assert.ok(L.k >= 0.7 && L.k <= 1.8);
});

test('layoutShop：5 列商店在各種手機視窗放得進 HUD 之間，關閉 / 購買鈕夠大，雙欄時商品不重疊', () => {
  for (const [vw, vh] of PHONES) {
    const ctx = ctxOf(vw, vh);
    const frame = dialogFrame({ width: 1280, hudTop: HUD_TOP });
    for (const hasHint of [true, false]) {
      const L = layoutShop({ ctx, frame, nItems: 5, hasHint });
      const tag = `${vw}x${vh} hint=${hasHint}`;
      assert.ok(L.fits, `${tag}：放得進框（panelH ${L.panelH} / ${frame.h}，cols ${L.cols}）`);
      assert.ok(L.panelW <= frame.w + 1, `${tag}：寬度在框內`);
      assert.ok(L.closeH * ctx.canvasScale >= MIN_TOUCH_CSS - 1, `${tag}：關閉鈕高`);
      assert.ok(L.btnH * ctx.canvasScale >= 35, `${tag}：購買鈕螢幕高 ${(L.btnH * ctx.canvasScale).toFixed(1)}`);
      assert.ok(L.rowsTop >= 14 + L.closeH + 6, `${tag}：商品列在右上角關閉鈕之下`);
      assert.ok(L.titleRight <= L.panelW - 14 - L.closeW, `${tag}：標題讓開關閉鈕`);
      const rowsBottom = L.rowsTop + L.rows * (L.btnH + L.gap) - L.gap;
      assert.ok(rowsBottom <= L.panelH, `${tag}：商品列在面板內`);
      if (L.cols === 2) assert.ok(20 + 2 * L.colW + L.colGap <= L.panelW, `${tag}：雙欄寬度`);
    }
  }
});

test('layoutShop：桌機維持單欄、關閉字在底部', () => {
  const frame = dialogFrame({ width: 1280, hudTop: HUD_TOP });
  const L = layoutShop({ ctx: ctxOf(1280, 720, false), frame, nItems: 5, hasHint: true });
  assert.equal(L.cols, 1);
  assert.equal(L.btnH, 38);
  assert.equal(L.showHint, true);
  assert.ok(L.fits);
});

test('layoutShop：商品少（2 項）時一律單欄', () => {
  const L = layoutShop({ ctx: ctxOf(667, 300), frame: dialogFrame({ width: 1280, hudTop: HUD_TOP }), nItems: 2, hasHint: true });
  assert.equal(L.cols, 1);
  assert.ok(L.fits);
});

// ── 觸控區域保留矩形 ─────────────────────────────────────────────────────────
test('toGameRect：頁面座標換成遊戲座標（扣畫布偏移、乘 1280 / 畫布寬）', () => {
  const g = toGameRect({ left: 150, top: 10, right: 250, bottom: 60 }, { left: 100, top: 0, width: 640, height: 360 });
  assert.deepEqual(g, { l: 100, t: 20, r: 300, b: 120 });
  assert.equal(toGameRect(null, { left: 0, top: 0, width: 1 }), null);
  assert.equal(toGameRect({ left: 0, top: 0, right: 1, bottom: 1 }, { left: 0, top: 0, width: 0 }), null);
});

test('touchReservedRects：沒有觸控層 / 觸控層隱藏時回空；只收看得到的按鈕', () => {
  assert.deepEqual(touchReservedRects(null), []);
  const mkEl = (rect, { hidden = false, inMoves = false } = {}) => ({
    getBoundingClientRect: () => rect, offsetParent: hidden ? null : {}, hiddenDisplay: hidden, closest: () => (inMoves ? {} : null),
  });
  const els = [
    mkEl({ left: 110, top: 100, right: 210, bottom: 200 }),
    mkEl({ left: 300, top: 100, right: 400, bottom: 200 }, { hidden: true }),   // 例如被 .tc-modal 收起的群組
    mkEl({ left: 500, top: 100, right: 600, bottom: 200 }, { inMoves: true }),  // 移動區 / 動作區的按鈕
  ];
  const mkDoc = (hiddenRoot) => ({
    defaultView: { getComputedStyle: (el) => ({ display: el.hiddenDisplay ? 'none' : 'block' }) },
    getElementById: () => ({ classList: { contains: (c) => hiddenRoot && c === 'tc-hidden' }, querySelectorAll: () => els }),
    querySelector: () => ({ getBoundingClientRect: () => ({ left: 10, top: 0, width: 1280, height: 720 }) }),
  });
  const rects = touchReservedRects(mkDoc(false));
  assert.equal(rects.length, 2);
  assert.deepEqual(rects[0], { l: 100, t: 100, r: 200, b: 200 });
  // modal = true：視窗 / 對話開著時移動區與動作區會收起，不算進保留區
  const modalRects = touchReservedRects(mkDoc(false), null, 1280, { modal: true });
  assert.equal(modalRects.length, 1);
  assert.deepEqual(touchReservedRects(mkDoc(true)), []);
});

// ── 可見視窗 ───────────────────────────────────────────────────────────────
test('viewportSize：visualViewport 優先，沒有就用 innerWidth / innerHeight', () => {
  assert.deepEqual(viewportSize({ innerWidth: 844, innerHeight: 390 }), { w: 844, h: 390 });
  assert.deepEqual(viewportSize({ innerWidth: 844, innerHeight: 390, visualViewport: { width: 843.6, height: 340.2 } }), { w: 844, h: 340 });
  assert.deepEqual(viewportSize({ innerWidth: 844, innerHeight: 390, visualViewport: { width: 0, height: 0 } }), { w: 844, h: 390 });
  assert.deepEqual(viewportSize(null), { w: 0, h: 0 });
});

test('sizeChanged：寬或高不同才算變動', () => {
  assert.equal(sizeChanged({ w: 1, h: 2 }, { w: 1, h: 2 }), false);
  assert.equal(sizeChanged({ w: 1, h: 2 }, { w: 1, h: 3 }), true);
  assert.equal(sizeChanged(null, { w: 1, h: 2 }), true);
});

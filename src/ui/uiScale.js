// 介面縮放（純函式，可單元測試）
//
// 畫布固定 1280x720，再依視窗等比縮小。手機橫放（844x390）時縮放約 0.54，HUD 的 12px 字實際只有約 6.5 CSS px。
// 這裡算出「該把字放大多少」：
//   factor     玩家在設定視窗選的介面大小（小 / 標準 / 大）
//   canvasScale 畫布目前的顯示比例（顯示寬 / 1280）
//   touch      是不是觸控裝置（桌機視窗縮小時不自動放大，避免小視窗反而被字擠滿）
// 觸控 + 畫布縮得小時，保證字的螢幕大小不低於 MIN_CSS_PX，但最多放大 MAX_MUL 倍（版面是固定座標，放太大會擠在一起）。

import { UI_SCALES, settings } from '../engine/settings.js';
import { isTouchDevice } from '../engine/device.js';

export const UI_SCALE_FACTORS = { small: 0.9, normal: 1, large: 1.25 };
export const MIN_CSS_PX = 9;        // 觸控裝置上，字的螢幕大小下限（CSS px）
export const MAX_MUL = 1.6;         // 自動放大的倍數上限（再大版面會擠壞）
export const AUTO_SCALE_BELOW = 0.8; // 畫布縮放比低於這個值才自動放大

export function uiScaleFactor(uiScale) {
  return Object.prototype.hasOwnProperty.call(UI_SCALE_FACTORS, uiScale) && UI_SCALES.includes(uiScale)
    ? UI_SCALE_FACTORS[uiScale] : 1;
}

/** 這個裝置 / 縮放比是否需要自動放大文字 */
export function needsAutoBoost(ctx) {
  return !!(ctx && ctx.touch && ctx.canvasScale > 0 && ctx.canvasScale < AUTO_SCALE_BELOW);
}

/**
 * 一段文字該用幾 px：base 是設計時的字級（以 1280x720 畫布為準）。
 * ctx = { factor, canvasScale, touch }；maxMul 可針對版面很擠的文字壓低上限。
 */
export function scaledFontPx(base, ctx, maxMul = MAX_MUL) {
  const want = base * (ctx && ctx.factor > 0 ? ctx.factor : 1);
  if (!needsAutoBoost(ctx)) return Math.round(want);
  const floor = MIN_CSS_PX / ctx.canvasScale;           // 要讓螢幕上至少 MIN_CSS_PX
  return Math.round(Math.min(Math.max(want, floor), want * maxMul));
}

/**
 * 彈窗（道具 / 裝備 / 技能 / 地圖）整體放大的倍數：以 12px 字為基準套 scaledFontPx。
 * size = { w, h, availW, availH }：窗格原尺寸與可用空間，限制放大後不超出。
 */
export function popupScale(ctx, size = {}) {
  let k = scaledFontPx(12, ctx) / 12;
  if (size.h && size.availH) k = Math.min(k, size.availH / size.h);
  if (size.w && size.availW) k = Math.min(k, size.availW / size.w);
  return Math.max(1, Math.round(k * 100) / 100);
}

// ── 對話框 / 世界地圖浮層（手機可讀、可點）─────────────────────────────────────────
export const MIN_READ_CSS = 12;     // 觸控裝置上，對話與地圖文字的螢幕大小下限（CSS px）
export const MIN_TOUCH_CSS = 44;    // 觸控裝置上，按鈕觸控區的螢幕大小下限（CSS px）
export const MAX_TOUCH_GAME = 96;   // 觸控區放大的上限（遊戲座標），避免按鈕大過面板

/** 從場景取目前的縮放資訊（沿用設定的介面大小、畫布顯示比例與觸控偵測） */
export function sceneUiCtx(scene) {
  const gw = scene.scale.width || 1280;
  const dw = scene.scale.displaySize.width || gw;
  return { factor: uiScaleFactor(settings.get().uiScale), canvasScale: dw / gw, touch: isTouchDevice() };
}

/** 對話 / 地圖文字：觸控且畫布縮小時，螢幕上至少 MIN_READ_CSS；其餘情況與 scaledFontPx 相同 */
export function readableFontPx(base, ctx, maxMul = 2) {
  const want = base * (ctx && ctx.factor > 0 ? ctx.factor : 1);
  if (!needsAutoBoost(ctx)) return Math.round(want);
  return Math.round(Math.min(Math.max(want, Math.ceil(MIN_READ_CSS / ctx.canvasScale)), want * maxMul));
}

/** 按鈕 / 點擊區的邊長（遊戲座標）：觸控裝置至少 MIN_TOUCH_CSS 螢幕像素；桌機維持設計值 */
export function touchTargetPx(designPx, ctx) {
  if (!ctx || !ctx.touch || !(ctx.canvasScale > 0)) return designPx;
  return Math.max(designPx, Math.min(MAX_TOUCH_GAME, Math.ceil(MIN_TOUCH_CSS / ctx.canvasScale)));
}

/**
 * NPC 對話框 / 商店面板的整體倍率（>= 1）：讓 baseFont 在手機上達到 MIN_READ_CSS，
 * 再受 maxK 與可用空間（availW / availH 相對於面板設計尺寸 w / h）限制。
 */
export function dialogScale(ctx, { baseFont = 14, w, h, availW, availH, maxK = 1.8 } = {}) {
  let k = readableFontPx(baseFont, ctx, maxK) / baseFont;
  k = Math.min(k, maxK);
  if (h && availH) k = Math.min(k, availH / h);
  if (w && availW) k = Math.min(k, availW / w);
  return Math.max(1, Math.floor(k * 100) / 100);
}

/** 在 points（{x,y}）中找離 (x,y) 最近、且距離不超過 maxDist 的索引；沒有則 -1（地圖節點很密，用最近點取代各自的小命中區） */
export function pickNearest(points, x, y, maxDist) {
  let best = -1, bestD = maxDist * maxDist;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - x, dy = points[i].y - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) { bestD = d; best = i; }
  }
  return best;
}

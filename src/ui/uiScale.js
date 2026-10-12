// 介面縮放（純函式，可單元測試）
//
// 畫布固定 1280x720，再依視窗等比縮小。手機橫放（844x390）時縮放約 0.54，HUD 的 12px 字實際只有約 6.5 CSS px。
// 這裡算出「該把字放大多少」：
//   factor     玩家在設定視窗選的介面大小（小 / 標準 / 大）
//   canvasScale 畫布目前的顯示比例（顯示寬 / 1280）
//   touch      是不是觸控裝置（桌機視窗縮小時不自動放大，避免小視窗反而被字擠滿）
// 觸控 + 畫布縮得小時，保證字的螢幕大小不低於 MIN_CSS_PX，但最多放大 MAX_MUL 倍（版面是固定座標，放太大會擠在一起）。

import { UI_SCALES } from '../engine/settings.js';

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

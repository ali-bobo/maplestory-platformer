// NPC 對話框 / 商店面板的版面計算（純函式，可單元測試，不依賴 Phaser）。
//
// 為什麼要有這個檔案：畫布固定 1280x720 再等比縮小，手機橫放時（844x340、667x300…）縮放只有 0.4~0.55。
// 「螢幕上 12 px 的字、44 px 的按鈕」換成遊戲座標會變成 2 倍以上，面板很容易長到畫面外，
// 或被 HUD（下方 120 高的狀態列、右上角的地圖 / 音效鈕與小地圖、上方的目標列）蓋住。
// 所以版面不能再用固定 1280x720 假設，而是：先算出「對話框能用的框」（dialogFrame），
// 再由大到小找出放得進這個框的倍率（layoutNpcDialog / layoutShop）。
//
// 座標都是遊戲座標（畫布 1280x720；地圖場景的 HUD 狀態列從 y = hudTop = 600 開始）。
import { dialogScale, readableFontPx, touchTargetPx } from './uiScale.js';

/** 上方 HUD（目標列 y6~34、地圖 / 音效鈕 y7~49）佔掉的高度，對話框要在它下面 */
export const DIALOG_TOP = 54;
/** 與下方 HUD 狀態列之間的空隙 */
export const DIALOG_BOTTOM_GAP = 6;
/** 右上角小地圖從 x = 1112 開始；對話框是置中的，所以「半寬」不能超過 1100 - 中心 */
export const DIALOG_RIGHT_LIMIT = 1100;
export const DIALOG_SIDE_MARGIN = 12;

/**
 * 對話框 / 商店可用的框（遊戲座標）。
 * reserved：觸控區域保留矩形（遊戲座標 {l,t,r,b}，見 touchReserve.js）；與框重疊的、貼在左右邊緣的矩形會讓框變窄（左右對稱）。
 * 回傳 { cx, halfW, top, bottom, w, h }：w = 2 * halfW 是面板最大寬，h 是最大高。
 */
export function dialogFrame({ width = 1280, hudTop = 600, reserved = [] } = {}) {
  const cx = width / 2;
  const top = DIALOG_TOP;
  const bottom = hudTop - DIALOG_BOTTOM_GAP;
  let halfW = Math.min(cx - DIALOG_SIDE_MARGIN, DIALOG_RIGHT_LIMIT - cx);
  for (const r of reserved) {
    if (!r || !(r.r > r.l) || !(r.b > r.t)) continue;
    if (r.b <= top || r.t >= bottom) continue;          // 不在對話框的高度帶內
    const mid = (r.l + r.r) / 2;
    const edge = mid < cx ? cx - r.r : r.l - cx;        // 保留矩形內緣離中心的距離
    if (edge > 0 && edge < halfW) halfW = Math.max(160, edge - 6);
  }
  return { cx, halfW, top, bottom, w: halfW * 2, h: bottom - top };
}

const clampK = (k) => Math.max(0.7, k);

/**
 * NPC 對話框版面。
 *  ctx：{ factor, canvasScale, touch }（uiScale.sceneUiCtx）
 *  frame：dialogFrame() 的結果
 *  msgH1：訊息文字在倍率 1（14px、折行寬 400）時的高度
 *  hasChoices：是否有選項按鈕列
 * 回傳 { k, panelW, panelH, msgTop, choiceTop, closeTop, bh, closeH, sw10, fits }。
 * 倍率 k 取「手機文字可讀」的倍率，放不進框就以 0.02 為單位往下降，直到面板放得下（最低 0.7）。
 */
export function layoutNpcDialog({ ctx, frame, msgH1, hasChoices, maxK = 2.1 }) {
  const kStart = dialogScale(ctx, { w: 480, availW: frame.w, maxK });
  const build = (k) => {
    const sw = (n) => Math.max(1, Math.round(n * k));
    const bh = touchTargetPx(Math.round(34 * k), ctx);
    const closeH = touchTargetPx(Math.round(24 * k), ctx);
    const msgTop = Math.round(60 * k);
    const choiceTop = msgTop + Math.max(Math.round(msgH1 * k), Math.round(84 * k)) + sw(10);
    const closeTop = hasChoices ? choiceTop + bh + sw(10) : choiceTop;
    const panelH = closeTop + closeH + sw(14);
    return { k, panelW: Math.round(480 * k), panelH, msgTop, choiceTop, closeTop, bh, closeH, sw10: sw(10) };
  };
  let k = Math.max(1, kStart);
  let L = build(k);
  while (L.panelH > frame.h && k > 0.7 + 1e-9) {
    k = clampK(Math.round((k - 0.02) * 100) / 100);
    L = build(k);
  }
  L.fits = L.panelH <= frame.h && L.panelW <= frame.w;
  return L;
}

/** 面板的 y（遊戲座標，相對於畫面上緣）：優先靠近原本的位置（底邊約在畫面 65% 高 + 86），再夾進框內 */
export function dialogPanelTop(frame, panelH, preferredBottom = 554) {
  const bottom = Math.min(frame.bottom, Math.max(preferredBottom, frame.top + panelH));
  return Math.max(frame.top, bottom - panelH);
}

/**
 * 商店面板版面：先試單欄（每列一項）、再試雙欄（兩項並排），放不進框就把按鈕壓矮（最低 36 CSS px 等效），
 * 觸控時關閉鈕固定在面板右上角，標題只用關閉鈕左邊的空間。
 *  回傳 { cols, rows, kw, panelW, panelH, btnH, gap, fonts:{fT,fH,fM,fB}, titleCy, hintCy, mesoCy, rowsTop, closeTop,
 *         colW, colGap, showHint, closeW, closeH, titleLeft, titleRight, fits }
 */
export function layoutShop({ ctx, frame, nItems, hasHint }) {
  const touch = !!(ctx && ctx.touch);
  const kw = dialogScale(ctx, { baseFont: 15, w: 480, availW: frame.w });
  const fonts = { fT: readableFontPx(19, ctx), fH: readableFontPx(12, ctx), fM: readableFontPx(14, ctx), fB: readableFontPx(15, ctx) };
  const gap = touch ? 6 : 12;
  const closeW = touchTargetPx(50, ctx), closeH = touchTargetPx(44, ctx);
  const titleCy = Math.round(14 + fonts.fT * 1.05);
  const build = (cols, showHint, btnH) => {
    const hintCy = showHint ? Math.round(titleCy + fonts.fT * 0.55 + fonts.fH * 0.9) : titleCy;
    const mesoCy = Math.round(hintCy + (showHint ? fonts.fH * 0.5 : fonts.fT * 0.55) + fonts.fM * (showHint ? 1 : 0.9));
    let rowsTop = Math.round(mesoCy + fonts.fM * 0.5 + 4);
    if (touch) rowsTop = Math.max(rowsTop, 14 + closeH + 6);   // 右上角的關閉鈕底下才放商品列
    const rows = Math.ceil(nItems / cols);
    const rowH = btnH + gap;
    const closeTop = rowsTop + rows * rowH - gap + (touch ? 0 : 20);
    const panelH = touch ? closeTop + 24 : closeTop + 24 /* 桌機關閉字高 */ + 30;
    const panelW = Math.round(480 * kw);
    return { cols, rows, kw, panelW, panelH, btnH, gap, fonts, titleCy, hintCy, mesoCy, rowsTop, closeTop, showHint, closeW, closeH };
  };
  const btn0 = touchTargetPx(38, ctx);
  const tries = [[1, hasHint], [1, false], [2, hasHint], [2, false]].filter(([c]) => touch || c === 1);
  let L = null;
  for (const [cols, showHint] of tries) {
    if (!showHint && hasHint && !touch) continue;       // 桌機不省招呼語
    // 雙欄需要更寬的面板（兩顆各 >= 15 個字寬的按鈕）
    const cand = build(cols, showHint && hasHint, btn0);
    if (cols === 2) cand.panelW = Math.min(frame.w, Math.max(cand.panelW, Math.round(frame.w)));
    if (cand.panelH <= frame.h) { L = cand; break; }
  }
  let fits = !!L;
  if (!L) {
    // 還是放不下：最後一招 = 雙欄、不顯示招呼語，把按鈕壓矮到剛好放進框內（最低 36 CSS px 等效）
    const cols = touch ? 2 : 1;
    const minBtn = Math.ceil(36 / Math.max(0.2, (ctx && ctx.canvasScale) || 1));
    L = build(cols, false, btn0);
    const fixed = L.panelH - L.rows * (L.btnH + L.gap);
    const btnH = Math.floor((frame.h - fixed) / L.rows) - L.gap;
    L = build(cols, false, Math.max(btnH, Math.min(btn0, minBtn)));
    if (cols === 2) L.panelW = Math.min(frame.w, Math.round(frame.w));
    fits = L.panelH <= frame.h;
  }
  L.colGap = 12;
  const inner = L.panelW - 2 * 20;
  L.colW = L.cols === 2 ? Math.floor((inner - L.colGap) / 2) : Math.round(300 * kw);
  // 標題 / 招呼語可用的水平範圍（相對面板左緣）：觸控時避開右上角的關閉鈕
  L.titleLeft = 14;
  L.titleRight = touch ? L.panelW - 14 - closeW - 8 : L.panelW - 14;
  L.fits = fits;
  return L;
}

// 「觸控區域保留矩形」：虛擬搖桿 / 跳躍 / 技能鈕 / 暫停等 DOM 觸控按鈕佔掉的畫面範圍（換算成遊戲座標）。
// 對話框、商店等需要避讓時呼叫 touchReservedRects()，把結果交給 dialogLayout.dialogFrame({ reserved })。
// 本檔只「讀」觸控層的邊界，不碰它的邏輯與排版（觸控層在 src/engine/touchControls.js，由別的工作負責）。

/** 頁面座標矩形 {left,top,right,bottom} → 遊戲座標 {l,t,r,b}。canvasRect 是畫布的 getBoundingClientRect() */
export function toGameRect(pageRect, canvasRect, gameW = 1280) {
  if (!pageRect || !canvasRect || !(canvasRect.width > 0)) return null;
  const k = gameW / canvasRect.width;
  return {
    l: (pageRect.left - canvasRect.left) * k,
    t: (pageRect.top - canvasRect.top) * k,
    r: (pageRect.right - canvasRect.left) * k,
    b: (pageRect.bottom - canvasRect.top) * k,
  };
}

/**
 * 目前「看得到的」觸控按鈕（搖桿、各鈕）的遊戲座標矩形。沒有觸控層、觸控層隱藏、或按鈕被隱藏（例如開著視窗時
 * 移動區 / 動作區會被收起）時回傳空陣列。
 * modal = true：只收「視窗開著時仍留在畫面上」的按鈕。視窗 / 對話開著時觸控層會收起移動區、動作區、全螢幕與左右互換
 * （.tc-modal），只剩暫停鈕；但對話框開啟的當下收起動作還沒發生，所以對話框版面要傳 modal = true，
 * 否則整片搖桿與技能鈕都被算進去，面板會被擠得又窄又小。
 */
export function touchReservedRects(doc = typeof document !== 'undefined' ? document : null, canvas = null, gameW = 1280, { modal = false } = {}) {
  if (!doc) return [];
  const root = doc.getElementById('touch-controls');
  const cv = canvas || doc.querySelector('canvas');
  if (!root || !cv || root.classList.contains('tc-hidden')) return [];
  const view = doc.defaultView;
  const canvasRect = cv.getBoundingClientRect();
  const out = [];
  for (const el of root.querySelectorAll('.tc-btn, .tc-stick')) {
    if (view && view.getComputedStyle(el).display === 'none') continue;
    if (el.offsetParent === null) continue;               // 祖先被 display:none（例如 .tc-modal 收起的群組）
    if (modal && el.closest && el.closest('.tc-group-moves, .tc-group-actions, .tc-fullscreen, .tc-swap')) continue;
    const g = toGameRect(el.getBoundingClientRect(), canvasRect, gameW);
    if (g) out.push(g);
  }
  return out;
}

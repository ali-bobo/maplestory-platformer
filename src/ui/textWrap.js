// 中文換行：Phaser 內建的 wordWrap 只在空白處斷行，整段沒有空白的中文會溢出視窗。
// wrapWithMeasure 依「實際量到的寬度」逐字換行（英文單字不拆開），measure 由呼叫端注入，方便單元測試。

export function wrapWithMeasure(text, maxWidth, measure) {
  if (!text || !(maxWidth > 0)) return text || '';
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    let lineW = 0;
    // 把「連續半形字元（英數、標點）」當一個單位，其餘每字一個單位
    const units = para.match(/[A-Za-z0-9_.,;:!?%+\-/'"()[\]]+|\s+|[^\s]/gu) || [];
    for (const u of units) {
      const w = measure(u);
      if (line && lineW + w > maxWidth && !/^\s+$/.test(u)) {
        out.push(line.replace(/\s+$/, ''));
        line = '';
        lineW = 0;
      }
      if (!line && /^\s+$/.test(u)) continue;   // 行首不留空白
      line += u;
      lineW += w;
    }
    out.push(line);
  }
  return out.join('\n');
}

let measureCtx = null;
const widthCache = new Map();

function canvasMeasure(font) {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d');
  }
  measureCtx.font = font;
  return (u) => {
    const key = `${font}|${u}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w = measureCtx.measureText(u).width;
      if (widthCache.size > 4000) widthCache.clear();
      widthCache.set(key, w);
    }
    return w;
  };
}

/**
 * 給 Phaser 文字用：wordWrap: { callback: cjkWrap(width), callbackScope: null }
 * 字型取自文字物件目前的樣式（字級改變後再次換行會自動用新字級）。
 */
export function cjkWrap(maxWidth) {
  return (text, textObject) => {
    const st = textObject && textObject.style;
    const font = st ? `${st.fontStyle || ''} ${st.fontSize || '14px'} ${st.fontFamily || 'Arial'}`.trim() : '14px Arial';
    return wrapWithMeasure(text, maxWidth, canvasMeasure(font));
  };
}

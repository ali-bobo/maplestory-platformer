// 地圖節點名稱的排版（純函式，可單元測試）
//
// 世界地圖的節點很密，手機上名稱放大到 12 CSS px 後會互相壓到、或蓋住別的節點圖示。
// placeLabels 依序為每個標籤挑一個位置：由近到遠的上 / 下（每層再試左右各偏一點）→ 右 → 左，
// 取第一個「不壓到已放好的標籤、不壓到任何節點圖示、在邊界內」的位置；都不行就用偏好的一側。

function overlap(a, b) {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

/**
 * items: [{ x, y, w, h, pref }]  節點中心、標籤尺寸、偏好方向（+1 下 / -1 上）
 * opts:  { iconR = 22, bounds = { l, t, r, b }, pad = 2 }
 * 回傳：每個標籤的中心 [{ x, y }]（與 items 同序）
 */
export function placeLabels(items, opts = {}) {
  const { iconR = 22, bounds = null, pad = 2 } = opts;
  const icons = items.map((it) => ({ l: it.x - iconR, r: it.x + iconR, t: it.y - iconR, b: it.y + iconR }));
  const placed = [];
  const out = [];
  items.forEach((it, i) => {
    const p = it.pref >= 0 ? 1 : -1;
    const levels = [iconR + it.h / 2 + pad, iconR + it.h * 1.5 + pad * 2, iconR + it.h * 2.5 + pad * 3];
    const side = iconR + it.w / 2 + pad;
    const cands = [];
    for (const dy of levels) {
      for (const dir of [p, -p]) {
        for (const dx of [0, -0.4 * it.w, 0.4 * it.w]) cands.push({ x: it.x + dx, y: it.y + dir * dy });
      }
    }
    cands.push({ x: it.x + side, y: it.y }, { x: it.x - side, y: it.y });
    const first = cands[0];
    let pick = first;
    for (const c of cands) {
      const r = { l: c.x - it.w / 2, r: c.x + it.w / 2, t: c.y - it.h / 2, b: c.y + it.h / 2 };
      if (bounds && (r.l < bounds.l || r.r > bounds.r || r.t < bounds.t || r.b > bounds.b)) continue;
      if (placed.some((q) => overlap(r, q))) continue;
      if (icons.some((q, j) => j !== i && overlap(r, q))) continue;
      pick = c;
      break;
    }
    placed.push({ l: pick.x - it.w / 2, r: pick.x + it.w / 2, t: pick.y - it.h / 2, b: pick.y + it.h / 2 });
    out.push({ x: pick.x, y: pick.y });
  });
  return out;
}

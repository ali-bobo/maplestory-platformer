// 虛擬搖桿的純邏輯（不依賴 DOM / Phaser，可單元測試）
//
// 輸入：手指相對搖桿底盤中心的位移 (dx, dy)（螢幕座標，y 向下）、搖桿最大半徑 radius、時間 now（毫秒）。
// 輸出：左 / 右 / 下 是否「按住」，以及這一次取樣是否觸發「跳」（單次事件，不是按住）。
//
// 手勢設計（閾值全部在 JOY，可調）：
//  - 左右：水平分量超過死區（DEADZONE）才移動，離開用較小的值（遲滯），避免在邊界抖動。
//    往上推得很用力時（垂直分量大）要求更大的水平分量才算移動（UP_TILT），直上直下不會因輕微歪斜而漂移。
//  - 跳：搖桿頭越過 UP_ENTER（預設 60% 半徑）的瞬間觸發一次；之後要回到 UP_REARM（35%）以內（回中立）才會重新武裝，
//    再次上推 = 空中二段跳。持續按住不會連跳。
//  - 快速上滑（flick）：FLICK_MS 內往上移動超過 FLICK_DIST 半徑、且已越過 FLICK_ENTER（40%）也算一次跳，
//    不必推到頂，也不必先完整回中立（只需已武裝）。
//  - 下：往下推超過 DOWN_ENTER 且垂直為主（|ny| >= |nx|）才算；離開用 DOWN_EXIT。沿用「↓」下穿薄平台。

export const JOY = Object.freeze({
  DEADZONE: 0.28,       // 水平死區（占半徑比例）進入門檻
  DEADZONE_EXIT: 0.2,   // 水平死區離開門檻（遲滯）
  UP_TILT: 0.5,         // 垂直分量 |ny| 乘上這個值，水平分量至少要這麼大才算移動
  UP_ENTER: 0.6,        // 上推越過 → 跳
  UP_REARM: 0.35,       // 回到這個值以內 → 重新武裝（下一次上推可再跳）
  DOWN_ENTER: 0.6,
  DOWN_EXIT: 0.42,
  FLICK_MS: 220,        // 快速上滑的時間窗
  FLICK_DIST: 0.45,     // 時間窗內需往上移動的距離（占半徑）
  FLICK_ENTER: 0.4,     // 快速上滑結束時至少要在這個高度以上
  MAX_RADIUS_UNITS: 1.3, // 最大半徑 = 1.3 個 --tc-unit（主要供 DOM 層用）
});

export function createJoystickState() {
  return { dir: 0, down: false, upHeld: false, hist: [] };
}

export function resetJoystick(st) {
  st.dir = 0; st.down = false; st.upHeld = false; st.hist.length = 0;
  return st;
}

// 位移夾到最大半徑內，回傳正規化向量與夾制後的位移（供畫搖桿頭）
export function stickVector(dx, dy, radius) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !(radius > 0)) return { nx: 0, ny: 0, kx: 0, ky: 0, mag: 0 };
  const len = Math.hypot(dx, dy);
  const k = len > radius ? radius / len : 1;
  const kx = dx * k;
  const ky = dy * k;
  return { nx: kx / radius, ny: ky / radius, kx, ky, mag: Math.min(1, len / radius) };
}

// 每次指標移動 / 按下時呼叫。回傳 { left, right, down, jump, nx, ny, kx, ky }
export function updateJoystick(st, dx, dy, radius, now, cfg = JOY) {
  const v = stickVector(dx, dy, radius);
  const { nx, ny } = v;

  // 水平（遲滯 + 往上推時加大死區）
  const need = Math.max(st.dir !== 0 ? cfg.DEADZONE_EXIT : cfg.DEADZONE, Math.abs(ny) > cfg.UP_ENTER ? Math.abs(ny) * cfg.UP_TILT : 0);
  if (Math.abs(nx) >= need && Math.abs(nx) >= cfg.DEADZONE_EXIT) st.dir = nx < 0 ? -1 : 1;
  else st.dir = 0;

  // 下
  if (st.down) st.down = ny >= cfg.DOWN_EXIT && ny >= Math.abs(nx) * 0.8;
  else st.down = ny >= cfg.DOWN_ENTER && ny >= Math.abs(nx);

  // 取樣歷史（保留時間窗內的）
  st.hist.push({ t: now, ny });
  while (st.hist.length > 1 && now - st.hist[0].t > cfg.FLICK_MS) st.hist.shift();

  // 跳：越過門檻的瞬間，或快速上滑
  let jump = false;
  const up = -ny;                       // 往上為正
  if (st.upHeld) {
    if (up < cfg.UP_REARM) st.upHeld = false;   // 回中立，重新武裝
  } else if (!st.down) {
    if (up >= cfg.UP_ENTER) {
      jump = true;
    } else if (up >= cfg.FLICK_ENTER) {
      let lowest = ny;                  // 時間窗內最低（最靠下）的位置
      for (const h of st.hist) if (h.ny > lowest) lowest = h.ny;
      if (lowest - ny >= cfg.FLICK_DIST) jump = true;
    }
    if (jump) st.upHeld = true;
  }

  return { left: st.dir < 0, right: st.dir > 0, down: st.down, jump, nx, ny, kx: v.kx, ky: v.ky };
}

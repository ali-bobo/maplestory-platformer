// 戰鬥手感：輸入緩衝與土狼時間（純函式，不依賴 Phaser；時間一律由呼叫端傳入，單位毫秒）。
export const INPUT_BUFFER_MS = 120;   // 動作尚不可行時按下的鍵，這段時間內仍會被記住
export const COYOTE_MS = 100;         // 走離平台邊緣後，這段時間內仍可當作站在地上起跳

export function createInputBuffer() {
  return { presses: {} };
}

// 記錄一次按下（同一動作只留最新一次）
export function bufferPress(buf, action, now) {
  buf.presses[action] = now;
}

// 緩衝中是否有尚未過期的按下（不消耗）
export function hasBuffered(buf, action, now, windowMs = INPUT_BUFFER_MS) {
  const t = buf.presses[action];
  return t !== undefined && now - t >= 0 && now - t <= windowMs;
}

// 取出並清除緩衝；過期的一律丟棄。回傳是否有有效的按下
export function consumeBuffered(buf, action, now, windowMs = INPUT_BUFFER_MS) {
  const ok = hasBuffered(buf, action, now, windowMs);
  delete buf.presses[action];
  return ok;
}

export function clearBuffer(buf, action) {
  if (action === undefined) buf.presses = {};
  else delete buf.presses[action];
}

export function createCoyote() {
  return { lastGroundAt: -Infinity, jumped: false };
}

// 每幀呼叫。onGround：腳踩地面；jumped：本幀剛起跳（起跳後土狼時間作廢）
export function updateCoyote(c, onGround, now, jumped = false) {
  if (onGround) {
    c.lastGroundAt = now;
    c.jumped = false;
  }
  if (jumped) c.jumped = true;
}

// 現在是否仍可當作地面起跳（在地面，或剛走離邊緣且尚未起跳）
export function canCoyoteJump(c, onGround, now, windowMs = COYOTE_MS) {
  if (onGround) return true;
  return !c.jumped && now - c.lastGroundAt <= windowMs;
}

// 動作是否已可執行（冷卻歸零）；冷卻剩餘值缺省視為 0
export function isActionReady(cooldownLeft) {
  return !(cooldownLeft > 0);
}

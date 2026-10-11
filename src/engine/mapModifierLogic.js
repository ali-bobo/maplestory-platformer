// 地圖機制的純邏輯（不依賴 Phaser，可單元測試）。每張地圖最多一個 modifier（見 maps.js）：
//   ice       冰面：在地面上加速 / 煞車有慣性（滑行）
//   quicksand 流沙：zones 內站在地面上移速 ×speedMult（預設 0.6 = 慢 40%）
//   lava      岩漿地板：zones 依週期「待機 → 預警 → 噴發」，噴發時站在該區地面會受小量傷害
//   dark      暗黑視野：除了玩家身邊 radius 內與燭台附近，畫面被暗角遮住

export const MODIFIER_TYPES = ['ice', 'quicksand', 'lava', 'dark'];

// 冰面：目標速度為 0（放開方向鍵）時以 DECEL 煞車，其餘以 ACCEL 加速 / 反向（px/s²）
export const ICE_ACCEL = 700;
export const ICE_DECEL = 230;
export function iceVelocity(vx, targetVx, dt, accel = ICE_ACCEL, decel = ICE_DECEL) {
  const rate = (targetVx === 0 ? decel : accel) * dt;
  const diff = targetVx - vx;
  return Math.abs(diff) <= rate ? targetVx : vx + Math.sign(diff) * rate;
}

export const QUICKSAND_SPEED_MULT = 0.6;

// x 落在哪個區域（沒有回傳 null）；zones 是 { x, width } 陣列
export function zoneAt(zones, x) {
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (x >= z.x && x <= z.x + z.width) return z;
  }
  return null;
}

// 岩漿週期：一個週期 period ms，最後 erupt ms 噴發、噴發前 warn ms 預警，其餘待機。offset 讓各區錯開
export const LAVA_IDLE = 'idle';
export const LAVA_WARN = 'warn';
export const LAVA_ERUPT = 'erupt';
export function lavaPhase(timeMs, cfg, offset = 0) {
  const t = (timeMs + offset) % cfg.period;
  if (t >= cfg.period - cfg.erupt) return LAVA_ERUPT;
  if (t >= cfg.period - cfg.erupt - cfg.warn) return LAVA_WARN;
  return LAVA_IDLE;
}

// 噴發傷害：最大 HP 的 damagePct（至少 20）
export function lavaDamage(maxHp, damagePct) {
  return Math.max(20, Math.round(maxHp * damagePct));
}

// 玩家受擊反應（純函式，不依賴 Phaser；Player.takeDamage 使用，單元測試鎖定方向與力道）
//
// 參考一般橫向動作 RPG 的受擊手感：
//  - 被擊退：遠離攻擊來源的水平速度 + 小幅向上彈起（不會比跳躍高）
//  - 短暫硬直（輸入鎖定 150~250 ms）：不能立刻取消，但遠短於無敵時間，不會被連續硬直鎖死
//  - 無敵時間 800 ms（閃爍可見）
//  - 重擊（Boss / 精英，或一下扣很多血）：額外的畫面震動與紅色暈影脈衝（依設定開關）

export const HURT_IFRAME_MS = 800;
export const HURT_HITSTOP_MS = 50;

export const KNOCKBACK = {
  speed: 340,        // force 1 時的水平初速（px/s）；硬直期間衰減後約退 40 px，force 2 約 100 px
  pop: 170,          // force 1 時的向上初速（px/s）
  maxPop: 360,       // 向上初速上限（跳躍是 520，被打飛不會比跳躍高）
  minForce: 0,
  maxForce: 2.5,
  lockBaseMs: 170,   // force 1 時的硬直
  lockPerForceMs: 50,
  lockMinMs: 150,
  lockMaxMs: 250,
  decayPerSec: 4,    // 硬直期間水平速度的衰減（指數），落地不會一路滑出去
};

/** 重擊門檻：force ≥ 1.5，或一下扣掉最大 HP 的 15% 以上 */
export const HEAVY_FORCE = 1.5;
export const HEAVY_HP_FRACTION = 0.15;

export function clampForce(force) {
  const f = Number.isFinite(force) ? force : 1;
  return Math.min(KNOCKBACK.maxForce, Math.max(KNOCKBACK.minForce, f));
}

/**
 * 擊退方向：+1 往右、−1 往左。
 * 有攻擊來源 sourceX：遠離來源（來源正好在同一點時退向背後）；沒有來源：往面向的反方向退。
 */
export function knockbackDir(playerX, sourceX, facingRight) {
  const back = facingRight ? -1 : 1;
  if (!Number.isFinite(sourceX) || !Number.isFinite(playerX)) return back;
  if (sourceX === playerX) return back;
  return playerX > sourceX ? 1 : -1;
}

/** 擊退速度與硬直時間：{ vx, vy, lockMs, dir, force } */
export function knockbackVelocity(playerX, sourceX, facingRight, force = 1) {
  const f = clampForce(force);
  const dir = knockbackDir(playerX, sourceX, facingRight);
  const vx = dir * KNOCKBACK.speed * f;
  const vy = f > 0 ? -Math.min(KNOCKBACK.maxPop, KNOCKBACK.pop * f) : 0;
  const lockMs = f > 0
    ? Math.round(Math.min(KNOCKBACK.lockMaxMs, Math.max(KNOCKBACK.lockMinMs, KNOCKBACK.lockBaseMs + (f - 1) * KNOCKBACK.lockPerForceMs)))
    : 0;
  return { vx, vy, lockMs, dir, force: f };
}

/**
 * 硬直的「遊戲時間」上限：硬直以物理時間倒數（命中停頓時跟著變慢），但戰鬥中命中停頓一直觸發時
 * 物理可能長時間被放慢；用這個上限保證硬直一定比無敵時間短，不會被連續受擊鎖死。
 */
export function lockHardCapMs(lockMs) {
  return Math.min(HURT_IFRAME_MS - 200, lockMs + 250);
}

/** 整段硬直的擊退距離（px，連續近似；測試與調整數值用） */
export function knockbackDistance(force = 1) {
  const { vx, lockMs } = knockbackVelocity(0, -1, true, force);
  const k = KNOCKBACK.decayPerSec;
  return Math.abs(vx) * (1 - Math.exp(-k * lockMs / 1000)) / k;
}

/** 硬直期間水平速度衰減一幀 */
export function decayKnockbackVx(vx, deltaMs) {
  return vx * Math.exp(-KNOCKBACK.decayPerSec * Math.max(0, deltaMs) / 1000);
}

export function isHeavyHit(actual, maxHp, force = 1) {
  if (clampForce(force) >= HEAVY_FORCE) return true;
  return maxHp > 0 && actual >= maxHp * HEAVY_HP_FRACTION;
}

/**
 * 這一下能不能擊退：死亡、衝刺 / 瞬移中、傳送中、對話 / 選單開著時都不擊退（只扣血 + 閃爍）。
 * state：{ dead, dashing, transitioning, dialogOpen, modal }
 */
export function canKnockback(state = {}) {
  return !(state.dead || state.dashing || state.transitioning || state.dialogOpen || state.modal);
}

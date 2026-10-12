// 危險狀態判斷（純邏輯）：低血量暈影與「倒下會失去裝備」的一次性提醒。
// 不改死亡懲罰本身（見 death.js），只負責在事前告知玩家。

export const LOW_HP_RATIO = 0.25;    // 低於這個比例：紅色邊緣暈影
export const WARN_HP_RATIO = 0.30;   // 首次低於這個比例：提醒一次死亡會失去裝備

/** HP 是否低到要顯示暈影（死亡時 hp = 0 不算，交給結算畫面） */
export function isLowHp(hp, maxHp) {
  return Number.isFinite(hp) && Number.isFinite(maxHp) && hp > 0 && maxHp > 0 && hp / maxHp < LOW_HP_RATIO;
}

/**
 * 要不要現在顯示「倒下會失去身上所有裝備」：
 * 這個存檔還沒提醒過、身上真的有裝備（沒有裝備時死亡什麼都不會失去，不需要嚇人）、HP 第一次低於 30%。
 * 回傳 true 時呼叫端要把 gs.deathWarned 設為 true 並存檔。
 */
export function shouldWarnDeath(gs, hp, equipmentCount) {
  if (!gs || gs.deathWarned === true) return false;
  if (!(equipmentCount > 0)) return false;
  const max = gs.maxHp;
  return Number.isFinite(hp) && Number.isFinite(max) && hp > 0 && max > 0 && hp / max < WARN_HP_RATIO;
}

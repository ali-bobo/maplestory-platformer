// 角色動作圖鍵：盜賊沿用舊鍵 player_<pose>，轉職後用 player_<job>_<pose>。
// 缺圖時退回盜賊的同名動作；盜賊沒有的動作（backstab、spin_1 …）再缺就回傳 null，由呼叫端略過。

export function poseKey(job, pose, exists) {
  const base = `player_${pose}`;
  if (!job || job === 'thief') return !exists || exists(base) ? base : null;
  const own = `player_${job}_${pose}`;
  if (!exists || exists(own)) return own;
  return exists(base) ? base : null;
}

// 待機呼吸：站著不動時每 IDLE_PERIOD_MS 在 idle / idle_2 之間切換；缺第二格就固定第一格
export const IDLE_PERIOD_MS = 600;
export function idleFrameKey(now, idleKey, idle2Key, period = IDLE_PERIOD_MS) {
  if (!idle2Key || idle2Key === idleKey) return idleKey;
  return Math.floor(now / period) % 2 === 1 ? idle2Key : idleKey;
}

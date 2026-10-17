// 盜賊徽章的資料處理（純邏輯、不依賴 Phaser，方便單元測試）。
// gameState.badges：已收集的徽章 id 陣列（不重複、只含 BADGE_IDS）；
// gameState.badgeRewards：已領取的獎勵門檻（例如 [10, 20]），每個門檻只發一次。

import {
  BADGES, BADGE_COUNT, BADGE_IDS, BADGE_REWARDS, BADGE_REWARD_THRESHOLDS, badgesOnMap,
} from '../config/badges.js';
import { MAPS } from '../config/maps.js';

const MAX_MESO = 99999999;   // 與 saveManager 的金幣上限一致

export function badgeCount(gs) {
  return gs && Array.isArray(gs.badges) ? gs.badges.length : 0;
}

export function hasBadge(gs, badgeId) {
  return !!gs && Array.isArray(gs.badges) && gs.badges.includes(badgeId);
}

// 某張地圖的收集進度：{ got, total }；沒有徽章的地圖 total = 0
export function mapBadgeProgress(gs, mapKey) {
  const list = badgesOnMap(mapKey);
  return { got: list.filter((b) => hasBadge(gs, b.id)).length, total: list.length };
}

// 這張地圖還沒撿的徽章（場景建立時只放這些）
export function remainingBadgesOnMap(gs, mapKey) {
  return badgesOnMap(mapKey).filter((b) => !hasBadge(gs, b.id));
}

// 發放所有「已達門檻但還沒領」的獎勵，回傳這次發的獎勵定義陣列（沒有則空陣列）。
// 重複呼叫不會重複發放。
export function claimBadgeRewards(gs) {
  if (!gs) return [];
  if (!Array.isArray(gs.badgeRewards)) gs.badgeRewards = [];
  const n = badgeCount(gs);
  const out = [];
  for (const r of BADGE_REWARDS) {
    if (n < r.at || gs.badgeRewards.includes(r.at)) continue;
    gs.badgeRewards.push(r.at);
    if (r.meso) gs.meso = Math.min(MAX_MESO, (gs.meso || 0) + r.meso);
    if (r.critRate) gs.critRate = Math.min(1, (gs.critRate || 0) + r.critRate);
    if (r.critMulti) gs.critMulti = (gs.critMulti || 1) + r.critMulti;
    out.push(r);
  }
  gs.badgeRewards.sort((a, b) => a - b);
  return out;
}

// 撿起徽章。重複取得、未知 id 都回傳 null 且不改動；
// 成功回傳 { badge, count, rewards }（rewards = 這次達到門檻而發放的獎勵）。
export function grantBadge(gs, badgeId) {
  const badge = BADGES.find((b) => b.id === badgeId);
  if (!gs || !badge) return null;
  if (!Array.isArray(gs.badges)) gs.badges = [];
  if (gs.badges.includes(badgeId)) return null;
  gs.badges.push(badgeId);
  return { badge, count: gs.badges.length, rewards: claimBadgeRewards(gs) };
}

// 任務日誌用的摘要：總數、每張地圖（依 maps.js 順序；visited = 去過才顯示名稱）、各獎勵是否已領
export function badgeLog(gs) {
  const visited = gs && Array.isArray(gs.visitedMaps) ? gs.visitedMaps : [];
  const claimed = gs && Array.isArray(gs.badgeRewards) ? gs.badgeRewards : [];
  const maps = Object.keys(MAPS).filter((k) => badgesOnMap(k).length > 0).map((k) => ({
    key: k, name: MAPS[k].name, visited: visited.includes(k), ...mapBadgeProgress(gs, k),
  }));
  return {
    count: badgeCount(gs), total: BADGE_COUNT, maps,
    rewards: BADGE_REWARDS.map((r) => ({ at: r.at, text: r.text, claimed: claimed.includes(r.at) })),
  };
}

// ── 存檔驗證（saveManager.sanitizeState 呼叫）────────────────────────────────
// 只認 BADGE_IDS、去重，順序依 BADGE_IDS（和收集順序無關）；舊存檔沒有這個欄位 → []
export function sanitizeBadges(raw) {
  if (!Array.isArray(raw)) return [];
  return BADGE_IDS.filter((id) => raw.includes(id));
}

// 已領門檻：只認 BADGE_REWARD_THRESHOLDS、去重，且不得超過目前收集數（改檔塞門檻沒有意義，但避免狀態矛盾）
export function sanitizeBadgeRewards(raw, count) {
  if (!Array.isArray(raw)) return [];
  return BADGE_REWARD_THRESHOLDS.filter((t) => t <= count && raw.includes(t));
}

export { BADGE_COUNT };

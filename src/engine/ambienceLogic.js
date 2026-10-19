// 地圖氛圍的純邏輯（不碰 Phaser，單元測試用）：選設定、算粒子預算、生成範圍。

import { AMBIENCE, AMBIENCE_BUDGET } from '../config/ambience.js';

/** 依地圖 key（找不到再用 bgType）取得氛圍設定；沒有就回 null */
export function ambienceFor(mapKey, bgType) {
  return AMBIENCE[mapKey] || (bgType && AMBIENCE[bgType]) || null;
}

/** 一張地圖在高品質下的環境粒子總數 */
export function totalParticles(preset) {
  if (!preset || !Array.isArray(preset.layers)) return 0;
  return preset.layers.reduce((n, l) => n + (l.count || 0), 0);
}

/**
 * 環境粒子的品質倍率：比戰鬥特效縮得溫和（低品質仍留四成），
 * 因為每張圖最多 60 顆、不會尖峰，砍太多畫面就空了。高 1 / 中 0.6 / 低 0.4
 */
export function ambienceScale(particleScale = 1) {
  const s = Math.min(1, Math.max(0, particleScale));
  return 0.2 + s * 0.8;
}

/**
 * 這一層實際要用的粒子上限：
 *  - 減少動態：0（整層關閉）
 *  - 否則依品質倍率縮減（ambienceScale），至少 1 顆；總數夾在 AMBIENCE_BUDGET 內
 */
export function layerCount(base, { particleScale = 1, reducedMotion = false } = {}) {
  if (reducedMotion || !(base > 0)) return 0;
  return Math.max(1, Math.min(AMBIENCE_BUDGET, Math.round(base * ambienceScale(particleScale))));
}

/**
 * 視差層要撒粒子的寬度：sf = 0 黏在畫面上只需一個畫面寬；sf = 1 跟世界捲動要整張地圖寬。
 * extra：往左飄的粒子（風）要在右側多撒一段，免得畫面右緣空掉。
 */
export function spawnWidth(viewW, mapW, sf, extra = 0) {
  const k = Math.min(1, Math.max(0, sf || 0));
  return Math.round(viewW + Math.max(0, (mapW || viewW) - viewW) * k + Math.max(0, extra));
}

/** 穩定狀態下要維持 count 顆：每 lifespan / count 毫秒發一顆 */
export function emitFrequency(lifespanMs, count) {
  if (!(count > 0)) return -1;   // Phaser：-1 = 不自動發射
  return Math.max(16, Math.round(lifespanMs / count));
}

/** 標題卡：換了地圖才顯示；死亡重生、同一張圖重新開始都不顯示 */
export function shouldShowTitle({ preset, mapKey, lastMapKey, respawn }) {
  if (!preset || !preset.subtitle) return false;
  if (respawn) return false;
  return mapKey !== lastMapKey;
}

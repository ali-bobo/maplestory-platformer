// 自適應品質系統 helper（Phase 6）
//
// 品質等級存在 registry 的 'qualityLevel' key（不進存檔，因為是裝置相關設定）。
// 所有「可降級的視覺開銷」（粒子、PostFX、特效）都應查詢 getQuality(scene)，
// 讓 FPS 監測器能統一調控（規則 E）。

import { QUALITY_PRESETS, QUALITY_ORDER } from '../config/constants.js';

const DEFAULT_LEVEL = 'high';

// 取得當前品質的旋鈕設定物件（particleScale / postFX / lightRays / energyTrail）
export function getQuality(scene) {
  const level = scene?.registry?.get('qualityLevel') || DEFAULT_LEVEL;
  return QUALITY_PRESETS[level] || QUALITY_PRESETS[DEFAULT_LEVEL];
}

// 取得當前品質等級字串（'high' / 'medium' / 'low'）
export function getQualityLevel(scene) {
  return scene?.registry?.get('qualityLevel') || DEFAULT_LEVEL;
}

// 設定品質等級（會驗證合法性）
export function setQualityLevel(scene, level) {
  if (QUALITY_PRESETS[level] && scene?.registry) {
    scene.registry.set('qualityLevel', level);
  }
}

// 降一級（high→medium→low），已是最低則回傳原值
export function downgradeQuality(level) {
  const idx = QUALITY_ORDER.indexOf(level);
  return idx > 0 ? QUALITY_ORDER[idx - 1] : level;
}

// 升一級（low→medium→high），已是最高則回傳原值
export function upgradeQuality(level) {
  const idx = QUALITY_ORDER.indexOf(level);
  return idx >= 0 && idx < QUALITY_ORDER.length - 1 ? QUALITY_ORDER[idx + 1] : level;
}

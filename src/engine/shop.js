// 商店購買（純邏輯、不依賴 Phaser，可單元測試）
import { POTIONS } from '../config/constants.js';

export function shopItemLabel(item) {
  return `${POTIONS[item.key].name} ×${item.qty}`;
}

// 購買一包：金幣夠就扣款並把藥水加進庫存（上限 999），回傳 'ok' | 'poor'（金幣不足）
export function buyShopItem(gs, item) {
  if (!gs || !POTIONS[item.key] || gs.meso < item.cost) return 'poor';
  gs.meso -= item.cost;
  gs.potions[item.key] = Math.min(999, (gs.potions[item.key] || 0) + item.qty);
  return 'ok';
}

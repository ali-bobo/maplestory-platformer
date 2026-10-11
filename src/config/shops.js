// NPC 商店的商品表（購買邏輯在 engine/shop.js，畫面在 BaseMapScene._openShop）。
// 地圖資料裡 NPC 的 shop 欄位：true = 晨曦鎮的預設雜貨店；物件 { title, items: [{ key, qty, cost }] } = 區域商人。
// key 是藥水快捷鍵（constants.js 的 POTIONS）；cost 是整包 qty 個的價錢。
// 區域商人隨等級帶換成較強的藥水、較大的包裝（高等級區不賣小瓶藥水），單價比晨曦鎮略高。

export const DEFAULT_SHOP = {
  title: '雜貨店',
  items: [
    { key: 'A', qty: 3, cost: 90 },
    { key: 'D', qty: 3, cost: 90 },
    { key: 'S', qty: 2, cost: 150 },
    { key: 'R', qty: 2, cost: 150 },
    { key: 'G', qty: 1, cost: 130 },
  ],
};

// NPC 的商店定義（沒有商店回傳 null）
export function shopOf(npcDef) {
  if (!npcDef || !npcDef.shop) return null;
  return npcDef.shop === true ? DEFAULT_SHOP : npcDef.shop;
}

// 盜賊徽章：藏在各地圖角落的隱藏收集品（重玩 / 探索用，與主線無關）
//
// 共 30 枚，分布在 13 張可探索地圖（Boss 房與副本沒有），每張 2～3 枚。
// 位置都選在「會獎勵探索」的地方：高層平台的盡頭、地圖兩端、浮在高台上方要跳一下才碰得到；
// 但一定能用一般移動（跑、跳、二段跳）拿到。座標是徽章中心的世界座標：
//   lift 約 36 → 站在平台上就碰得到；lift 約 100 → 要在那個平台上起跳。
// test/badges.test.js 會用 maps.js 的平台資料檢查每一枚都在平台 / 地面上方、在地圖範圍內、
// 從地面走得到，而且不會離傳送門太近（碰徽章不會誤觸換圖）。
//
// id 是存進 gameState.badges 的穩定識別字：已發布後不要改名或重複使用。

export const BADGES = [
  // ── 浮空島嶼 ──
  { id: 'sky_1',     map: 'sky',     x: 400,  y: 140 },   // 左上草地平台的上方
  { id: 'sky_2',     map: 'sky',     x: 1510, y: 130 },   // 中央高台的上方
  { id: 'sky_3',     map: 'sky',     x: 2525, y: 204 },   // 右上木台的最右端
  // ── 森林獵場 ──
  { id: 'henesys_1', map: 'henesys', x: 395,  y: 140 },   // 左上平台的左端上方
  { id: 'henesys_2', map: 'henesys', x: 1790, y: 204 },   // 中央高台的右端
  { id: 'henesys_3', map: 'henesys', x: 2525, y: 204 },   // 金色傳送門後方的平台盡頭
  // ── 古代廢墟 ──
  { id: 'ruins_1',   map: 'ruins',   x: 960,  y: 140 },   // 左上石台的右端上方
  { id: 'ruins_2',   map: 'ruins',   x: 2525, y: 204 },   // 右上石台的最右端
  // ── 碧濤港 ──
  { id: 'harbor_1',  map: 'harbor',  x: 800,  y: 110 },   // 最高棧橋左端的上方
  { id: 'harbor_2',  map: 'harbor',  x: 1970, y: 174 },   // 右側最高棧橋的盡頭
  { id: 'harbor_3',  map: 'harbor',  x: 1300, y: 230 },   // 中層右棧橋左端的上方
  // ── 黃沙遺跡 ──
  { id: 'desert_1',  map: 'desert',  x: 410,  y: 150 },   // 左上石台的左端上方
  { id: 'desert_2',  map: 'desert',  x: 2450, y: 214 },   // 右上石台的最右端
  // ── 霜牙峰 ──
  { id: 'snow_1',    map: 'snow',    x: 450,  y: 204 },   // 左上冰台的左端
  { id: 'snow_2',    map: 'snow',    x: 1290, y: 130 },   // 中央冰台的上方
  // ── 熔岩巢穴 ──
  { id: 'lava_1',    map: 'lava',    x: 430,  y: 150 },   // 左上岩台的左端上方
  { id: 'lava_2',    map: 'lava',    x: 1230, y: 214 },   // 中央岩台
  { id: 'lava_3',    map: 'lava',    x: 2490, y: 214 },   // 右上岩台的最右端
  // ── 魔君王城（暗角視野，要走近才看得到）──
  { id: 'castle_1',  map: 'castle',  x: 470,  y: 140 },   // 左上城牆的左端上方
  { id: 'castle_2',  map: 'castle',  x: 2490, y: 204 },   // 右上城牆的最右端
  // ── 神秘之境 ──
  { id: 'ellinia_1', map: 'ellinia', x: 1230, y: 140 },   // 中央高台的左端上方
  { id: 'ellinia_2', map: 'ellinia', x: 2525, y: 204 },   // 右上平台的最右端
  // ── 暗巷城 ──
  { id: 'kerning_1', map: 'kerning', x: 950,  y: 204 },   // 左上屋頂的右端
  { id: 'kerning_2', map: 'kerning', x: 2100, y: 140 },   // 右上屋頂的上方
  // ── 台北都會 ──
  { id: 'taipei_1',  map: 'taipei',  x: 350,  y: 140 },   // 左上高架的左端上方
  { id: 'taipei_2',  map: 'taipei',  x: 2450, y: 204 },   // 右上高架的最右端
  // ── 晨曦鎮 ──
  { id: 'town_1',    map: 'town',    x: 630,  y: 186 },   // 中央石台的左端上方
  { id: 'town_2',    map: 'town',    x: 28,   y: 564 },   // 星光之塔後面的地圖盡頭
  // ── 影之殿堂 ──
  { id: 'shrine_1',  map: 'shrine',  x: 130,  y: 350 },   // 左側露台的左端上方
  { id: 'shrine_2',  map: 'shrine',  x: 1150, y: 350 },   // 右側露台的右端上方
];

export const BADGE_COUNT = BADGES.length;
export const BADGE_IDS = BADGES.map((b) => b.id);
export const BADGE_NAME = '盜賊徽章';
export const BADGE_TEXTURE = 'item-thief-badge';   // 程式繪製（engine/badgeField.js），不需要圖檔
// 碰到徽章的判定半徑（徽章中心到玩家身體方框的距離）
export const BADGE_TOUCH_RADIUS = 18;

// 收集獎勵：收集數達到門檻時發放一次（gameState.badgeRewards 記錄已領的門檻）。
// 數值參考 docs/design/progression-economy.md：全程金幣收入約 13 萬、任務一次 300～1,500，
// 所以金幣給得小方；永久加成只給暴擊（死亡重算屬性時不會被洗掉，見 engine/death.js）。
export const BADGE_REWARDS = [
  { at: 10, meso: 2000, text: '2,000 楓幣' },
  { at: 20, meso: 4000, critRate: 0.02, text: '4,000 楓幣、永久暴擊率 +2%' },
  { at: 30, meso: 8000, critMulti: 0.1, text: '8,000 楓幣、永久暴擊傷害 +10%' },
];
export const BADGE_REWARD_THRESHOLDS = BADGE_REWARDS.map((r) => r.at);

export function badgesOnMap(mapKey) {
  return BADGES.filter((b) => b.map === mapKey);
}

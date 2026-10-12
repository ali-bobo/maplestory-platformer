import { WORLD_HEIGHT } from './constants.js';

// 地圖定義 v6.7 — 森林 / 玩具城 / 台北統一採用圖片跳台模型，並重排首章怪物輪廓

const PH = 24;          // 平台高度
const GROUND_Y = WORLD_HEIGHT;   // 地板頂部固定貼齊 HUD 上緣，移除角色下方黑帶

const MAP_WIDTH = 2560;
const TOWN_WIDTH = 1600;
const TAIPEI_LOWER_Y = 400;
const TAIPEI_UPPER_Y = 240;
function plat(x, y, width, type = 'stone', thin = true) {
  return { x, y, width, type, thin };
}
function ground(x, y, width, type = 'stone') {
  // isGround: true → BaseMapScene 會讓它透明，只保留碰撞面
  return { x, y, width, type, thin: false, isGround: true };
}
// ─────────── 浮空島嶼 ───────────
// 2 層浮空平台（sky blue 系，草地＋石頭）
const SKY_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'stone'),

  // 第一層（y=400）：3 個寬平台，石頭材質
  plat(100,  400, 600, 'stone'),
  plat(980,  400, 600, 'stone'),
  plat(1860, 400, 600, 'stone'),

  // 第二層（y=240）：3 個寬平台，草地材質（與第一層交錯）
  plat(380,  240, 580, 'grass'),
  plat(1220, 240, 580, 'grass'),
  plat(2060, 240, 580, 'wood'),
];

// ─────────── 森林獵場 (Henesys) ───────────
// 2 層（草地系，棕綠色調）
const HENESYS_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'grass'),

  // 第一層（y=400）：全部改用森林圖片跳台，沿用 Toytown 腳底接觸線
  plat(100,  400, 600, 'grass'),
  plat(980,  400, 600, 'wood'),
  plat(1860, 400, 600, 'grass'),

  // 第二層（y=240）：全部採同一套森林圖片跳台規格
  plat(380,  240, 580, 'wood'),
  plat(1220, 240, 580, 'grass'),
  plat(2060, 240, 580, 'wood'),

  // 支線岔路：右上角的金色傳送門（神秘之境）站在這塊小跳台上，要從 y=400、240 的平台一路跳上來，
  // 走地面永遠碰不到（入口 portal.interact：站上去還要按互動鍵）
  plat(2170, 180, 240, 'wood'),
];

// ─────────── 碧濤港（Lv12-18，海港 / 海盜）───────────
// 3 層木棧橋：低層 y=450、中層 y=330、高層 y=210（層間落差 120～150px，一跳就上得去）
const HARBOR_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'wood'),

  plat(60,   450, 380, 'wood'),
  plat(1000, 450, 460, 'wood'),
  plat(2060, 450, 440, 'wood'),

  plat(480,  330, 400, 'wood'),
  plat(1280, 330, 420, 'wood'),

  plat(780,  210, 380, 'wood'),
  plat(1560, 210, 420, 'wood'),
];

// ─────────── 黃沙遺跡 / 霜牙峰 / 熔岩巢穴 / 魔君王城（階段 2 的四張新圖）───────────
// 各 2 層：低層 y≈410、高層 y≈240（落差 170 內，一跳就上得去；和既有地圖相同）。寬度與位置每張圖不同，輪廓不重複。
const DESERT_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),
  plat(80,   420, 520, 'brick'),
  plat(900,  420, 560, 'brick'),
  plat(1760, 420, 560, 'brick'),
  plat(400,  250, 480, 'stone'),
  plat(1260, 250, 520, 'stone'),
  plat(2000, 250, 460, 'stone'),
];
const SNOW_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'stone'),
  plat(120,  410, 460, 'stone'),
  plat(760,  410, 460, 'stone'),
  plat(1400, 410, 460, 'stone'),
  plat(2040, 410, 420, 'stone'),
  plat(440,  240, 420, 'stone'),
  plat(1080, 240, 420, 'stone'),
  plat(1740, 240, 460, 'stone'),
];
const LAVA_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'stone'),
  plat(100,  420, 400, 'stone'),
  plat(700,  420, 380, 'stone'),
  plat(1300, 420, 380, 'stone'),
  plat(1900, 420, 460, 'stone'),
  plat(420,  250, 380, 'stone'),
  plat(1040, 250, 380, 'stone'),
  plat(1650, 250, 380, 'stone'),
  plat(2200, 250, 300, 'stone'),
];
const CASTLE_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),
  plat(140,  410, 500, 'brick'),
  plat(900,  410, 560, 'brick'),
  plat(1700, 410, 600, 'brick'),
  plat(460,  240, 520, 'brick'),
  plat(1300, 240, 560, 'brick'),
  plat(2060, 240, 440, 'brick'),
];

// ─────────── 古代廢墟 ───────────
// 2 層（磚石系，棕橘色調）
const RUINS_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 第一層（y=400）：3 個，磚石材質
  plat(100,  400, 600, 'brick'),
  plat(980,  400, 600, 'stone'),
  plat(1860, 400, 600, 'brick'),

  // 第二層（y=240）：3 個，石頭材質（交錯分布）
  plat(380,  240, 590, 'stone'),
  plat(1220, 240, 590, 'brick'),
  plat(2060, 240, 590, 'stone'),
];

// ─────────── 神秘之境 (Ellinia / Toytown) ───────────
// 2 層（木頭＋磚石，彩色城市風）
const ELLINIA_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 第一層（y=400）：全部採用已驗證的 Toytown 圖片跳台模式
  plat(100,  400, 600, 'wood'),
  plat(980,  400, 600, 'brick'),
  plat(1860, 400, 600, 'wood'),

  // 第二層（y=240）：移除舊有自訂跳台，統一改為圖片跳台
  plat(380,  240, 580, 'brick'),
  plat(1220, 240, 580, 'wood'),
  plat(2060, 240, 580, 'brick'),
];

// ─────────── 暗巷城 ───────────
// 2 層（木頭＋磚石，暗夜都市風）
const KERNING_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 第一層（y=400）：3 個，木頭材質
  plat(100,  400, 600, 'wood'),
  plat(980,  400, 600, 'brick'),
  plat(1860, 400, 600, 'wood'),

  // 第二層（y=240）：3 個，磚石材質
  plat(380,  240, 580, 'brick'),
  plat(1220, 240, 580, 'wood'),
  plat(2060, 240, 580, 'brick'),
];

// ─────────── Taipei City ───────────
// 2 層（城市高架跳台，間距更乾淨，讓機械系與小王更突出）
const TAIPEI_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  plat(140,  TAIPEI_LOWER_Y, 560, 'brick'),
  plat(930,  TAIPEI_LOWER_Y, 700, 'wood'),
  plat(1900, TAIPEI_LOWER_Y, 520, 'brick'),

  plat(340,  TAIPEI_UPPER_Y, 560, 'wood'),
  plat(1180, TAIPEI_UPPER_Y, 620, 'brick'),
  plat(2020, TAIPEI_UPPER_Y, 440, 'wood'),
];

// ─────────── Boss 房間 ───────────
const BOSS_PLATFORMS = [
  ground(0, GROUND_Y, 1280, 'brick'),

  plat(80,   444, 280, 'brick'),
  plat(920,  444, 280, 'brick'),

  plat(280,  304, 360, 'stone'),
  plat(640,  304, 360, 'stone'),

  plat(440,  164, 400, 'brick'),
];

// ─────────── 晨曦鎮（城鎮樞紐） ───────────
const TOWN_PLATFORMS = [
  ground(0, GROUND_Y, TOWN_WIDTH, 'wood'),

  plat(300,  430, 320, 'wood'),
  plat(980,  430, 320, 'wood'),
  plat(620,  286, 360, 'stone'),

  // 右上角的支線岔路：階梯（y=430 → 320 → 200）通到高台，影之殿堂與城市特區的入口都在高台上，
  // 走地面不會誤入；高台入口要站上去再按互動鍵
  plat(1260, 320, 170, 'wood'),
  plat(1090, 200, 400, 'stone'),
];

// ─────────── 影之殿堂（安全地圖，轉職樞紐；一個畫面寬，不捲動）───────────
const SHRINE_WIDTH = 1280;
const SHRINE_PLATFORMS = [
  ground(0, GROUND_Y, SHRINE_WIDTH, 'stone'),

  // 兩個低矮的白石露台，只做裝飾與站位（跳台圖用 platform_shrine）
  plat(120,  450, 300, 'stone'),
  plat(860,  450, 300, 'stone'),
];

// 世界結構（docs/WORLD_DESIGN.md）：
//   浮空島嶼 ⇄ 晨曦鎮（樞紐，★星光之塔）⇄ 影之殿堂
//   主線：浮空島嶼 → 森林獵場 → 古代廢墟 → 碧濤港 → …（階段 2 的四張新圖）→ 暗影領域（5/5 碎片後開啟）
//   支線：森林獵場 → 神秘之境；晨曦鎮 → 暗巷城 ⇄ 台北都會（城市特區，Lv18 開放）
// levelBand：建議等級帶 [最低, 最高]（世界地圖顯示用，content.test.js 檢查怪物等級落在帶內）
// hub：安全樞紐（世界地圖傳送免費）；portal.minLevel：等級不足時傳送門擋下並提示

export const MAPS = {
  // ── 地圖 1：浮空島嶼（Lv1-8）淡藍天空，輕柔可愛怪物 ──────────────────────
  sky: {
    key: 'sky', name: '浮空島嶼', sceneKey: 'MapleIslandScene',
    width: MAP_WIDTH, bgColor: 0x5588ff,
    platforms: SKY_PLATFORMS,
    bgType: 'sky', bgImage: 'bg_sky',
    levelBand: [1, 8],
    monsters: [
      // 天空 / 奇幻起手區：避免相似輪廓怪在開局同圖重複出現
      { id: 'slime',    count: 2 },
      { id: 'mushroom', count: 3 },
      { id: 'snail',    count: 3 },
      { id: 'sky_imp',  count: 2 },
      { id: 'sky_bird', count: 2 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'town',    label: '←晨曦鎮',   spawnX: 240 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '→森林獵場', spawnX: 200 },
    ],
    npcs: [
      { x: 250, y: GROUND_Y - 60, id: 'npc_new_2', name: '島嶼義工',
        questIds: ['slime_hunt', 'snail_collect'],
        dialog: ['歡迎來到浮空島嶼！', '這裡是新手練功的好地方。', '往左可回晨曦鎮補給，往右是森林獵場。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 2：森林獵場（Lv5-12）綠色森林，自然動物系怪物 ────────────────────
  henesys: {
    key: 'henesys', name: '森林獵場', sceneKey: 'HenesysScene',
    width: MAP_WIDTH, bgColor: 0x336622,
    platforms: HENESYS_PLATFORMS,
    bgType: 'henesys', bgImage: 'bg_forest',
    levelBand: [5, 12],
    monsters: [
      // 森林主題：集中林地與野獸，避免再和天空地圖共用整批怪
      { id: 'snail',    count: 4 },
      { id: 'stump',    count: 5 },
      { id: 'boar',     count: 3 },
      { id: 'snake',    count: 2 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins',   label: '→古代廢墟', spawnX: 200 },
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'sky',     label: '←浮空島嶼', spawnX: MAP_WIDTH - 200 },
      // 支線岔路：神秘之境（Lv14-20），在右上角跳台上（見 HENESYS_PLATFORMS），按互動鍵進入
      { x: 2290, y: 180 - 48, width: 40, height: 72, target: 'ellinia', label: '→ 神秘之境 Lv.14', spawnX: 200, interact: true },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_0', name: '獵人協會員',
        questIds: ['mushroom_hunt', 'stump_clear'],
        dialog: ['歡迎來到森林獵場！', '這裡是中級練功地點。', '小心那些野豬，衝刺速度非常快！', '右上角的跳台上有金色傳送門通往神秘之境（按 F 進入），地面往右是古代廢墟。'] },
      // 補給斷層：晨曦鎮之後到 Lv20 沒有商店，三張中段地圖各補一位商人（沿用區域商人格式，單價 30~32 起、隨等級加大包裝）
      { x: 720, y: GROUND_Y - 60, id: 'npc_merchant', npcId: 'forest_peddler', name: '行商阿福', tint: 0xc8ffc0,
        shop: { title: '林間小攤', items: [
          { key: 'A', qty: 5, cost: 150 }, { key: 'A', qty: 10, cost: 290 } ] },
        dialog: ['打獵打到一半沒藥水？來我這裡補貨。', '小瓶藥水便宜賣，買多還有優惠！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 2.5：碧濤港（Lv12-18）黃昏海港，海盜與海洋生物 ─────────────────────
  harbor: {
    key: 'harbor', name: '碧濤港', sceneKey: 'HarborScene',
    width: MAP_WIDTH, bgColor: 0xc4502c,
    platforms: HARBOR_PLATFORMS,
    bgType: 'harbor', bgImage: 'bg_harbor',
    levelBand: [14, 20],
    monsters: [
      // 小王放第一個：怪物依平台輪流分配，第一個一定落在地板上（重生才會隨機平台）
      { id: 'pirate_captain', count: 1 },
      { id: 'crab',           count: 4 },
      { id: 'jellyfish',      count: 3 },
      { id: 'pirate_ghost',   count: 3 },
      { id: 'octopus',        count: 3 },
      { id: 'seagull',        count: 3 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins',   label: '←古代廢墟', spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'desert',  label: '→黃沙遺跡', spawnX: 200 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_dockworker', npcId: 'dockworker', name: '碼頭工人',
        questIds: ['harbor_crabs', 'harbor_sailor'],
        dialog: ['歡迎來到碧濤港！', '最近螃蟹爬上碼頭，貨物都被夾壞了。', '海鷗會俯衝，章魚會噴墨，水母別硬碰。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_sailor', npcId: 'old_sailor', name: '老水手',
        questIds: ['harbor_captain'],
        dialog: ['我在這片海上跑了四十年。', '那艘幽靈船的船長，把整座碼頭都嚇壞了。', '想挑戰他就先備好藥水，他的鐵鉤可不輕。'] },
      { x: 1100, y: GROUND_Y - 60, id: 'npc_merchant', npcId: 'harbor_chandler', name: '船具商阿海', tint: 0xa8d4ff,
        shop: { title: '碼頭雜貨', items: [
          { key: 'A', qty: 5, cost: 160 }, { key: 'D', qty: 5, cost: 160 },
          { key: 'S', qty: 3, cost: 240 }, { key: 'R', qty: 3, cost: 240 }, { key: 'G', qty: 1, cost: 140 } ] },
        dialog: ['船長那一鉤不是鬧著玩的，大瓶藥水我這裡有。', '出海前先把藥水備齊，這是老規矩。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 3：古代廢墟（Lv9-18）棕橘岩石，機械骷髏系怪物 ───────────────────
  ruins: {
    key: 'ruins', name: '古代廢墟', sceneKey: 'PerionScene',
    width: MAP_WIDTH, bgColor: 0xc8a060,
    platforms: RUINS_PLATFORMS,
    bgType: 'ruins', bgImage: 'bg_ruins',
    levelBand: [9, 17],
    monsters: [
      // 勇士峽谷 / 廢墟主題：集中戰士、惡靈與大型石怪，不再混入其他區域怪
      { id: 'skeleton',    count: 5 },
      { id: 'ruin_knight', count: 4 },
      { id: 'ruin_golem',  count: 3 },
      { id: 'ruin_wraith', count: 2 },
      { id: 'ruin_beast',  count: 2 },
      { id: 'ruin_giant',  count: 1 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'harbor',  label: '→碧濤港', spawnX: 200 },
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '←森林獵場', spawnX: MAP_WIDTH - 200 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_3', name: '廢墟探險家',
        questIds: ['reach_ruins', 'skeleton_purge'],
        dialog: ['古代廢墟充滿了危險。', '需要補給品嗎？', '小心那些骷髏戰士，他們很狡猾！'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_townsfolk', npcId: 'ruins_trader', name: '遺跡商販老莫', tint: 0xffd9a0,
        shop: { title: '遺跡補給站', items: [
          { key: 'A', qty: 5, cost: 155 }, { key: 'D', qty: 5, cost: 155 } ] },
        dialog: ['這裡離鎮上太遠，我乾脆把攤子搬進廢墟。', '血藥魔藥都有，別硬撐到見底才來。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4：神秘之境（Lv13-22）彩色城鎮，奇幻多彩怪物 ───────────────────
  ellinia: {
    key: 'ellinia', name: '神秘之境', sceneKey: 'ElliniaScene',
    width: MAP_WIDTH, bgColor: 0x4422aa,
    platforms: ELLINIA_PLATFORMS,
    bgType: 'ellinia', bgImage: 'bg_mystic',
    levelBand: [14, 20],
    monsters: [
      // 神秘之境：改成純奇幻高空區，避免與天空 / 廢墟地圖再次重複
      { id: 'dragon',   count: 3 },
      { id: 'cyclops',  count: 3 },
      { id: 'mimic',    count: 3 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '←森林獵場', spawnX: 2000 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_1', name: '神秘嚮導',
        questIds: ['dragon_slayer', 'mimic_buster'],
        dialog: ['歡迎來到神秘之境！', '這是森林獵場旁的祕境，適合 Lv14-20 的冒險者。', '獨眼怪的眼光攻擊會讓你減速！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 5：暗巷城（Lv19-29）暗黑都市，強力城市系怪物 ─────────────
  kerning: {
    key: 'kerning', name: '暗巷城', sceneKey: 'KerningScene',
    width: MAP_WIDTH, bgColor: 0x111133,
    platforms: KERNING_PLATFORMS,
    bgType: 'kerning', bgImage: 'bg_city',
    levelBand: [20, 29],
    monsters: [
      // 都市夜區：保留黑幫 / 夜獸 / 小王，不再與 Taipei 共用機械線
      { id: 'city_thug',  count: 4 },
      { id: 'city_beast', count: 3 },
      { id: 'city_boss2', count: 1 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'town',    label: '←晨曦鎮',     spawnX: 1270 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'taipei',  label: '→台北都會',   spawnX: 200 },
    ],
    npcs: [
      { x: 350, y: GROUND_Y - 60, id: 'npc_new_4', name: '地下城嚮導',
        questIds: ['thug_cleanup', 'beast_hunt'],
        dialog: ['歡迎來到 暗巷城！', '這裡是城市特區，怪物比外面強得多，要小心。', '往右走是台北都會，往左回晨曦鎮。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 5.5：台北都會（城市支線地圖）─────────────────────────────────
  taipei: {
    key: 'taipei', name: '台北都會', sceneKey: 'TaipeiScene',
    width: MAP_WIDTH, bgColor: 0x2a3558,
    platforms: TAIPEI_PLATFORMS,
    bgType: 'taipei', bgImage: 'bg_taipei',
    levelBand: [22, 29],
    monsters: [
      // 台北都會：夜市街頭混混、扒手與巡邏空拍機，與暗巷城夜區分工
      { id: 'robot',       count: 2 },
      { id: 'street_punk', count: 2 },
      { id: 'city_mech',   count: 3 },
      { id: 'city_elite',  count: 3 },
      { id: 'city_boss1', count: 1 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '←暗巷城', spawnX: MAP_WIDTH - 200 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_new_5', name: '台北導遊',
        questIds: ['mech_purge', 'elite_takedown'],
        dialog: ['歡迎來到台北都會，夜市人多，小心錢包。', '最近龐克飆仔和扒手在街頭鬧事。', '扒手頭目就躲在巷子深處，要去的話小心點。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4.5：黃沙遺跡（Lv20-26）金色沙漠，蠍、木乃伊與沙蟲；流沙減速 ───────────────
  desert: {
    key: 'desert', name: '黃沙遺跡', sceneKey: 'DesertScene',
    width: MAP_WIDTH, bgColor: 0xd8a85a,
    platforms: DESERT_PLATFORMS,
    bgType: 'desert', bgImage: 'bg_desert',
    levelBand: [20, 26],
    // 流沙：站在區域內的地面上移速 -40%（地面上畫有流動的沙坑）
    modifier: { type: 'quicksand', speedMult: 0.6, zones: [{ x: 900, width: 340 }, { x: 1700, width: 380 }] },
    monsters: [
      { id: 'sandworm_boss', count: 1 },   // 小王放第一個：第一隻一定落在地板上
      { id: 'scorpion', count: 3 },
      { id: 'cactus',   count: 3 },
      { id: 'mummy',    count: 3 },
      { id: 'bandit',   count: 3 },
      { id: 'sandworm', count: 2 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'harbor', label: '←碧濤港',   spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'snow',   label: '→霜牙峰',   spawnX: 200 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_archaeologist', npcId: 'archaeologist', name: '考古學家',
        questIds: ['desert_scorpions', 'desert_caravan', 'desert_sandworm'],
        dialog: ['歡迎來到黃沙遺跡！', '地圖上金色的流沙坑會讓你的腳步變慢，記得繞開。', '沙塵巨蟲守著第二塊星光碎片，牠就在遺跡深處。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_caravan', npcId: 'caravan_master', name: '商隊領隊',
        shop: { title: '商隊補給', items: [
          { key: 'A', qty: 5, cost: 160 }, { key: 'D', qty: 5, cost: 160 },
          { key: 'S', qty: 3, cost: 270 }, { key: 'R', qty: 3, cost: 270 }, { key: 'G', qty: 2, cost: 300 } ] },
        dialog: ['沙漠裡最貴的是水，其次是藥水。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4.6：霜牙峰（Lv25-31）雪山，冰面滑行 ───────────────────────────────────
  snow: {
    key: 'snow', name: '霜牙峰', sceneKey: 'SnowScene',
    width: MAP_WIDTH, bgColor: 0xa9c8e8,
    platforms: SNOW_PLATFORMS,
    bgType: 'snow', bgImage: 'bg_snow',
    levelBand: [25, 31],
    // 冰面：整張圖地面結冰，加速與煞車都有慣性
    modifier: { type: 'ice' },
    monsters: [
      { id: 'frost_giant', count: 1 },
      { id: 'snowman', count: 3 },
      { id: 'penguin', count: 3 },
      { id: 'icewolf', count: 3 },
      { id: 'crystal', count: 3 },
      { id: 'yeti',    count: 2 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'desert', label: '←黃沙遺跡', spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'lava',   label: '→熔岩巢穴', spawnX: 200 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_ranger', npcId: 'snow_ranger', name: '雪原巡守員',
        questIds: ['snow_wolves', 'snow_monk', 'snow_giant'],
        dialog: ['霜牙峰的地面全結了冰，煞車要提早。', '冰原狼成群出沒，別在冰上被包圍。', '冰霜巨人守著第三塊星光碎片。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_monk', npcId: 'mountain_monk', name: '山寺僧侶',
        shop: { title: '山寺供奉', items: [
          { key: 'S', qty: 4, cost: 360 }, { key: 'R', qty: 4, cost: 360 }, { key: 'G', qty: 3, cost: 450 } ] },
        dialog: ['雪山路遠，先備好藥水再上路。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4.7：熔岩巢穴（Lv30-36）火山，岩漿地板定時噴發 ──────────────────────────
  lava: {
    key: 'lava', name: '熔岩巢穴', sceneKey: 'LavaScene',
    width: MAP_WIDTH, bgColor: 0x3a1208,
    platforms: LAVA_PLATFORMS,
    bgType: 'lava', bgImage: 'bg_lava',
    levelBand: [30, 36],
    // 岩漿地板：地面上的四塊區域每 5.2 秒噴發一次（噴發前 1.4 秒地面發紅預警），噴發時站在該區地面受傷；站到平台上就安全
    modifier: {
      type: 'lava', period: 5200, warn: 1400, erupt: 1000, damagePct: 0.05,
      zones: [{ x: 880, width: 260, offset: 0 }, { x: 1300, width: 240, offset: 1700 }, { x: 1720, width: 260, offset: 3400 }, { x: 2100, width: 240, offset: 900 }],
    },
    monsters: [
      { id: 'lava_dragon', count: 1 },
      { id: 'fireimp',   count: 3 },
      { id: 'lavaslime', count: 3 },
      { id: 'firehound', count: 3 },
      { id: 'ember',     count: 3 },
      { id: 'lavagolem', count: 2 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'snow',   label: '←霜牙峰',   spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'castle', label: '→魔君王城', spawnX: 200 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_blacksmith', npcId: 'blacksmith', name: '熔爐鐵匠',
        questIds: ['lava_hounds', 'lava_miner', 'lava_dragon_hunt'],
        dialog: ['地面發紅就快跳上平台，噴發很燙！', '火焰獵犬跑得快，別在地上跟牠們賽跑。', '熔岩龍守著第四塊星光碎片。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_miner', npcId: 'miner', name: '礦工',
        shop: { title: '礦坑雜貨', items: [
          { key: 'S', qty: 5, cost: 450 }, { key: 'R', qty: 5, cost: 450 }, { key: 'G', qty: 4, cost: 600 } ] },
        dialog: ['我在這座火山挖了二十年，從沒見過這麼大的龍。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4.8：魔君王城（Lv35-42）暗黑城堡，暗角視野 ──────────────────────────────
  castle: {
    key: 'castle', name: '魔君王城', sceneKey: 'CastleScene',
    width: MAP_WIDTH, bgColor: 0x1a0f2a,
    platforms: CASTLE_PLATFORMS,
    bgType: 'castle', bgImage: 'bg_castle',
    levelBand: [35, 42],
    // 暗黑視野：整張圖罩一層暗角，只有玩家身邊 radius 內與燭台附近是亮的
    modifier: { type: 'dark', radius: 230, soft: 120, alpha: 0.88, torches: [120, 560, 1000, 1500, 1980, 2440] },
    monsters: [
      { id: 'fallen_commander', count: 1 },
      { id: 'imp',        count: 3 },
      { id: 'bat',        count: 3 },
      { id: 'darkknight', count: 3 },
      { id: 'vampire',    count: 3 },
      { id: 'gargoyle',   count: 2 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'lava', label: '←熔岩巢穴', spawnX: MAP_WIDTH - 200 },
      // 主線終點：星光之塔點亮（5/5 碎片）後才出現
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss', label: '⚠ Boss 決戰', spawnX: 200, requireBoss: true },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_prisoner', npcId: 'prisoner', name: '被囚的騎士',
        questIds: ['castle_knights', 'castle_maid', 'castle_commander'],
        dialog: ['城裡很暗，只有燭台附近看得清楚。', '我的同伴都被墮落騎士團長變成了暗黑騎士……', '五塊碎片集齊，回晨曦鎮點亮星光之塔，這裡右端的門才會開。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_ghostmaid', npcId: 'ghost_maid', name: '幽靈女僕',
        shop: { title: '女僕的茶點', items: [
          { key: 'S', qty: 6, cost: 540 }, { key: 'R', qty: 6, cost: 540 }, { key: 'G', qty: 5, cost: 750 } ] },
        dialog: ['歡迎光臨……我已經好久沒有客人了。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 6：暗影領域（Boss 房） ──────────────────────────────────────────
  boss: {
    key: 'boss', name: '暗影領域', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x0D0018,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss', bgImage: 'bg_boss_room',
    levelBand: [45, 50],
    monsters: [], portals: [], npcs: [],
    spawnX: 200,
  },

  // ── 晨曦鎮（城鎮樞紐，無戰鬥，提供補給商店）──────────────────────────────
  town: {
    key: 'town', name: '晨曦鎮', sceneKey: 'TownScene',
    width: TOWN_WIDTH, bgColor: 0x46306a,
    platforms: TOWN_PLATFORMS,
    bgType: 'town', bgImage: 'bg_town', hub: true,
    monsters: [],
    portals: [
      { x: TOWN_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'sky', label: '→浮空島嶼', spawnX: 200 },
      // Phase 14：副本入口（target='dungeon' 觸發 DungeonScene，dungeonId 指定哪個副本）
      { x: 800, y: GROUND_Y - 48, width: 40, height: 72, target: 'dungeon', dungeonId: 'slime_cave', label: '⚔ 史萊姆洞窟', interact: true },
      // 影之殿堂：轉職長老、技能導師與「影之試煉」入口都在那裡
      { x: 1170, y: 200 - 48, width: 40, height: 72, target: 'shrine', label: '→ 影之殿堂', spawnX: 120, interact: true },
      // 城市特區（暗巷城 ⇄ 台北都會）：Lv18 開放
      { x: 1360, y: 200 - 48, width: 40, height: 72, target: 'kerning', label: '→ 城市特區 Lv.18', spawnX: 200, minLevel: 18, interact: true },
    ],
    npcs: [
      // 星光之塔（role: 'starTower'）：互動顯示碎片進度，集滿 5 塊時點亮並解鎖最終 Boss。
      // 圖用 prop_star_tower.png（185×420，底部貼地）
      { x: 100,  y: GROUND_Y - 60, id: 'prop_star_tower', npcId: 'star_tower', role: 'starTower', name: '星光之塔', height: 420 },
      { x: 520,  y: GROUND_Y - 60, id: 'npc_merchant', name: '商人老陳', shop: true,
        dialog: ['歡迎光臨雜貨店！'] },
      { x: 1000, y: GROUND_Y - 60, id: 'npc_townsfolk', name: '城鎮居民',
        questIds: ['reach_town', 'job_call'], jobLetter: true,
        dialog: ['晨曦鎮是安全的休息站，這裡不會有怪物。', '需要補給就找商人老陳。', '右邊盡頭的傳送門是回浮空島嶼的路。', '右上角的高台（沿階梯跳上去）有兩道金色傳送門：', '左邊通往影之殿堂，右邊是城市特區（Lv18 以後才開放），按 F 進入。'] },
    ],
    spawnX: 200,
  },

  // ── 影之殿堂（安全地圖：無怪物，轉職長老 / 技能導師 / 影之試煉入口）──────────────
  shrine: {
    key: 'shrine', name: '影之殿堂', sceneKey: 'ShrineScene',
    width: SHRINE_WIDTH, bgColor: 0x1a1d4a,
    platforms: SHRINE_PLATFORMS,
    bgType: 'shrine', bgImage: 'bg_shrine', hub: true,
    monsters: [],
    portals: [
      { x: 30, y: GROUND_Y - 48, width: 40, height: 72, target: 'town', label: '←晨曦鎮', spawnX: 1300 },
      // 一轉任務「影之試煉」：requiresQuest 沒接任務時進不去
      { x: SHRINE_WIDTH - 130, y: GROUND_Y - 48, width: 40, height: 72, target: 'dungeon', dungeonId: 'shadow_trial', label: '⚔ 影之試煉', requiresQuest: 'job_trial' },
    ],
    npcs: [
      { x: 520, y: GROUND_Y - 60, id: 'npc_skill_mentor', npcId: 'skill_mentor', role: 'skillMentor', name: '技能導師',
        dialog: ['技能不是學得多，而是練得精。', '點畫面下方的「技能」鈕，把 SP 投在最順手的技能上。'] },
      { x: 780, y: GROUND_Y - 60, id: 'npc_shadow_elder', npcId: 'shadow_elder', role: 'jobAdvisor', name: '影之長老',
        questIds: ['job_choose', 'job_proof', 'job_trial', 'job_awaken'],
        dialog: ['影子裡藏著力量，也藏著試煉。', '等你準備好了，再來找我。'] },
    ],
    spawnX: 120,
  },
};

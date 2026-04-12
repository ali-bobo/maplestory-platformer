import { WORLD_HEIGHT } from './constants.js';

// 地圖定義 v6.6 — 森林跳台沿用 Toytown 站位模型但回收寬度，並重排首章怪物輪廓

const PH = 24;          // 平台高度
const GROUND_Y = WORLD_HEIGHT;   // 地板頂部固定貼齊 HUD 上緣，移除角色下方黑帶

const MAP_WIDTH = 2560;
const TAIPEI_LOWER_Y = 400;
const TAIPEI_UPPER_Y = 240;

function plat(x, y, width, type = 'stone', thin = true) {
  return { x, y, width, type, thin };
}
function ground(x, y, width, type = 'stone') {
  // isGround: true → BaseMapScene 會讓它透明，只保留碰撞面
  return { x, y, width, type, thin: false, isGround: true };
}
function imageSolidPlatform(platform, options = {}) {
  const imagePlatform = {
    ...platform,
    thin: options.thin ?? platform.thin ?? true,
    decorationKey: options.decorationKey || 'platform_long',
    renderMode: 'image-native',
    walkableHeight: options.walkableHeight ?? 18,
  };

  if (options.imageRowIndex !== undefined) imagePlatform.imageRowIndex = options.imageRowIndex;
  if (options.imageCropTopRatio !== undefined) imagePlatform.imageCropTopRatio = options.imageCropTopRatio;
  if (options.imageCropHeightRatio !== undefined) imagePlatform.imageCropHeightRatio = options.imageCropHeightRatio;
  if (options.sourceWindowWidthRatio !== undefined) imagePlatform.sourceWindowWidthRatio = options.sourceWindowWidthRatio;
  if (options.renderHeight !== undefined) imagePlatform.renderHeight = options.renderHeight;
  if (options.walkableTopRatio !== undefined) imagePlatform.walkableTopRatio = options.walkableTopRatio;
  if (options.walkableWidth !== undefined) imagePlatform.walkableWidth = options.walkableWidth;

  return imagePlatform;
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

  // 第一層（y=400）：3 個，草地材質
  plat(100,  400, 600, 'grass'),
  imageSolidPlatform(plat(980,  400, 600, 'wood'), { walkableHeight: 20 }),
  plat(1860, 400, 600, 'grass'),

  // 第二層（y=240）：3 個，木頭材質
  plat(380,  240, 580, 'wood'),
  imageSolidPlatform(plat(1220, 240, 580, 'grass'), { walkableHeight: 20 }),
  plat(2060, 240, 580, 'wood'),
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

  // 第一層（y=400）：3 個，木頭材質
  plat(100,  400, 600, 'wood'),
  imageSolidPlatform(plat(980,  400, 600, 'brick'), { walkableHeight: 20 }),
  plat(1860, 400, 600, 'wood'),

  // 第二層（y=240）：3 個，磚石材質
  plat(380,  240, 580, 'brick'),
  imageSolidPlatform(plat(1220, 240, 580, 'wood'), { walkableHeight: 20 }),
  plat(2060, 240, 580, 'brick'),
];

// ─────────── Kerning City ───────────
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
  imageSolidPlatform(plat(930,  TAIPEI_LOWER_Y, 700, 'wood'), { walkableTopRatio: 0.39, walkableHeight: 20 }),
  plat(1900, TAIPEI_LOWER_Y, 520, 'brick'),

  imageSolidPlatform(plat(340,  TAIPEI_UPPER_Y, 560, 'wood'), { walkableTopRatio: 0.4, walkableHeight: 20 }),
  plat(1180, TAIPEI_UPPER_Y, 620, 'brick'),
  imageSolidPlatform(plat(2020, TAIPEI_UPPER_Y, 440, 'wood'), { walkableTopRatio: 0.4, walkableHeight: 18 }),
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

export const MAPS = {
  // ── 地圖 1：浮空島嶼（Lv1-8）淡藍天空，輕柔可愛怪物 ──────────────────────
  sky: {
    key: 'sky', name: '浮空島嶼', sceneKey: 'MapleIslandScene',
    width: MAP_WIDTH, bgColor: 0x5588ff,
    platforms: SKY_PLATFORMS,
    bgType: 'sky', bgImage: 'bg_sky',
    monsters: [
      // 天空 / 奇幻起手區：避免相似輪廓怪在開局同圖重複出現
      { id: 'slime',    count: 2 },
      { id: 'mushroom', count: 3 },
      { id: 'snail',    count: 3 },
      { id: 'sky_bird', count: 2 },
      { id: 'sky_puff', count: 2 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '→森林獵場', spawnX: 200 },
    ],
    npcs: [
      { x: 250, y: GROUND_Y - 60, id: 'npc_new_2', name: '楓葉義工', dialog: ['歡迎來到浮空島嶼！', '這裡是新手練功的好地方。', '向右走可以到森林獵場。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 2：森林獵場（Lv5-12）綠色森林，自然動物系怪物 ────────────────────
  henesys: {
    key: 'henesys', name: '森林獵場', sceneKey: 'HenesysScene',
    width: MAP_WIDTH, bgColor: 0x336622,
    platforms: HENESYS_PLATFORMS,
    bgType: 'henesys', bgImage: 'bg_forest',
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
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_0', name: '獵人協會員', dialog: ['歡迎來到森林獵場！', '這裡是中級練功地點。', '小心那些野豬，衝刺速度非常快！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 3：古代廢墟（Lv9-18）棕橘岩石，機械骷髏系怪物 ───────────────────
  ruins: {
    key: 'ruins', name: '古代廢墟', sceneKey: 'PerionScene',
    width: MAP_WIDTH, bgColor: 0xc8a060,
    platforms: RUINS_PLATFORMS,
    bgType: 'ruins', bgImage: 'bg_ruins',
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
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '→神秘之境', spawnX: 200 },
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '←森林獵場', spawnX: MAP_WIDTH - 200 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_3', name: '廢墟探險家', dialog: ['古代廢墟充滿了危險。', '需要補給品嗎？', '小心那些骷髏戰士，他們很狡猾！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 4：神秘之境（Lv13-22）彩色城鎮，奇幻多彩怪物 ───────────────────
  ellinia: {
    key: 'ellinia', name: '神秘之境', sceneKey: 'ElliniaScene',
    width: MAP_WIDTH, bgColor: 0x4422aa,
    platforms: ELLINIA_PLATFORMS,
    bgType: 'ellinia', bgImage: 'bg_toytown_refresh',
    monsters: [
      // 神秘之境：改成純奇幻高空區，避免與天空 / 廢墟地圖再次重複
      { id: 'dragon',   count: 3 },
      { id: 'cyclops',  count: 3 },
      { id: 'mimic',    count: 3 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→Kerning City', spawnX: 200 },
      { x: MAP_WIDTH / 2, y: GROUND_Y - 48, width: 40, height: 72, target: 'taipei', label: '↑台北都會', spawnX: 160 },
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins',   label: '←古代廢墟',    spawnX: MAP_WIDTH - 200 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_1', name: '神秘嚮導', dialog: ['歡迎來到神秘之境！', '這裡的怪物色彩鮮豔但非常危險。', '獨眼怪的眼光攻擊會讓你減速！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 5：Kerning City（Lv19-29）暗黑都市，強力城市系怪物 ─────────────
  kerning: {
    key: 'kerning', name: 'Kerning City', sceneKey: 'KerningScene',
    width: MAP_WIDTH, bgColor: 0x111133,
    platforms: KERNING_PLATFORMS,
    bgType: 'kerning', bgImage: 'bg_city',
    monsters: [
      // 都市夜區：保留黑幫 / 夜獸 / 小王，不再與 Taipei 共用機械線
      { id: 'city_thug',  count: 4 },
      { id: 'city_beast', count: 3 },
      { id: 'city_boss2', count: 1 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '←神秘之境',   spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss',   label: '⚠ Boss 決戰', spawnX: 200, requireBoss: true },
    ],
    npcs: [
      { x: 350, y: GROUND_Y - 60, id: 'npc_new_4', name: '地下城嚮導', dialog: ['歡迎來到 Kerning City！', '這裡的怪物非常強大，要小心。', '擊敗 60 隻怪物解鎖 Boss！'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 5.5：台北都會（城市支線地圖）─────────────────────────────────
  taipei: {
    key: 'taipei', name: '台北都會', sceneKey: 'TaipeiScene',
    width: MAP_WIDTH, bgColor: 0x2a3558,
    platforms: TAIPEI_PLATFORMS,
    bgType: 'taipei', bgImage: 'bg_taipei',
    monsters: [
      // 台北都會：集中機械 / 菁英 / 都會督軍，與 Kerning 夜區明確分工
      { id: 'robot',      count: 3 },
      { id: 'city_mech',  count: 3 },
      { id: 'city_elite', count: 2 },
      { id: 'city_boss1', count: 1 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '←神秘之境', spawnX: MAP_WIDTH / 2 + 120 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→Kerning City', spawnX: 260 },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_new_5', name: '台北導遊', dialog: ['這裡是台北都會試作地圖。', 'monster3 裁出的機械與菁英怪現在已經接進來了。', '再往右走前，先小心那隻都會督軍。'] },
    ],
    spawnX: 150,
  },

  // ── 地圖 6：暗影領域（Boss 房） ──────────────────────────────────────────
  boss: {
    key: 'boss', name: '暗影領域', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x0D0018,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss', bgImage: 'bg_boss_room',
    monsters: [], portals: [], npcs: [],
    spawnX: 200,
  },
};

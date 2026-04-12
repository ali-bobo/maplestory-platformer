// 地圖定義 v6.0 — 精簡至 2 層平台 + 地板，加寬平台（改善懸空視覺），地板透明（用背景自然地板）

const GROUND_Y = 576;   // 地板頂部 y 座標（與背景圖自然地板對齊）
const PH = 24;          // 平台高度

const MAP_WIDTH = 2560;

function plat(x, y, width, type = 'stone', thin = true) {
  return { x, y, width, type, thin };
}
function ground(x, y, width, type = 'stone') {
  // isGround: true → BaseMapScene 會讓它透明，靠背景圖的地板視覺
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

  // 第一層（y=400）：3 個，草地材質
  plat(100,  400, 600, 'grass'),
  plat(980,  400, 600, 'wood'),
  plat(1860, 400, 600, 'grass'),

  // 第二層（y=240）：3 個，木頭材質
  plat(380,  240, 580, 'wood'),
  plat(1220, 240, 580, 'grass'),
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
  plat(980,  400, 600, 'brick'),
  plat(1860, 400, 600, 'wood'),

  // 第二層（y=240）：3 個，磚石材質
  plat(380,  240, 580, 'brick'),
  plat(1220, 240, 580, 'wood'),
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
    bgOffsetY: -47,  // 視覺地面在圖片 77% 處（screen y≈554），向下偏移至 y=576
    monsters: [
      // 顏色/外型：鮮豔可愛，符合晴天浮空島嶼風格
      { id: 'slime',    count: 5 },  // 綠色圓滾滾
      { id: 'mushroom', count: 4 },  // 紅色蘑菇
      { id: 'snail',    count: 4 },  // 翅膀蝸牛（天空感）
      { id: 'sky_imp',  count: 3 },  // 雲端精靈（淡色）
      { id: 'sky_bird', count: 3 },  // 浮雲鳥（飛行系）
      { id: 'sky_puff', count: 3 },  // 棉花怪（白色蓬鬆）
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
    bgOffsetY: 0,  // 森林背景地面在圖片約 80% 處（row≈614/768），自然對齊 y=576
    monsters: [
      // 顏色/外型：棕綠色系，樹木、動物，符合森林自然風格
      { id: 'mushroom', count: 4 },  // 蘑菇（森林常見）
      { id: 'stump',    count: 4 },  // 惡樹樁（森林樹木）
      { id: 'snail',    count: 3 },  // 蝸牛（林間生物）
      { id: 'boar',     count: 4 },  // 野豬（棕色，森林動物）
      { id: 'snake',    count: 3 },  // 毒蛇（綠色，森林爬蟲）
      { id: 'sky_puff', count: 3 },  // 棉花怪（林間雲霧）
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
    bgOffsetY: -30,  // 視覺地面在圖片 78% 處（screen y≈562），向下偏移至 y=576
    monsters: [
      // 顏色/外型：灰棕色系，機械、骷髏、石頭，符合古代廢墟風格
      { id: 'robot',       count: 4 },  // 機械直升機（鐵灰色）
      { id: 'skeleton',    count: 4 },  // 骷髏戰士（米白色骨骼）
      { id: 'ruin_knight', count: 3 },  // 廢墟騎士（暗色盔甲）
      { id: 'ruin_golem',  count: 3 },  // 石柱魔像（岩石色）
      { id: 'ruin_wraith', count: 3 },  // 古代惡靈（灰黑幽靈）
      { id: 'ruin_beast',  count: 3 },  // 廢墟猛獸（深棕色）
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
    bgType: 'ellinia', bgImage: 'bg_toytown',
    bgOffsetY: 178,  // 玩具城背景地面在原圖約 80% 處（row≈716/896），調整至 y=576
    monsters: [
      // 顏色/外型：鮮豔彩色，獨眼、寶箱、精靈，符合奇幻彩色城鎮風格
      { id: 'sky_imp',     count: 4 },  // 雲端精靈（彩色小精靈）
      { id: 'ruin_golem',  count: 4 },  // 石柱魔像（方塊彩色）
      { id: 'cyclops',     count: 3 },  // 獨眼怪（大眼紫色）
      { id: 'mimic',       count: 3 },  // 飛魚寶箱（金橘寶箱）
      { id: 'ruin_giant',  count: 3 },  // 廢墟巨人（大型彩色）
      { id: 'city_thug',   count: 3 },  // 城市流氓（街頭彩色）
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→Kerning City', spawnX: 200 },
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
    bgOffsetY: 0,  // 城市背景地面對齊已接近 y=576
    monsters: [
      // 顏色/外型：深色霓虹，龍、石頭精、機械衛士，符合暗色都市地下城風格
      { id: 'dragon',     count: 4 },  // 小藍龍（藍色，暗夜感）
      { id: 'golem',      count: 3 },  // 石頭精（深灰岩石）
      { id: 'city_mech',  count: 3 },  // 機械衛士（鐵灰機械）
      { id: 'city_beast', count: 3 },  // 暗夜猛獸（深色毛皮）
      { id: 'city_elite', count: 3 },  // 精英衛兵（暗色盔甲）
      { id: 'city_boss1', count: 1 },  // 小王：暗影使者（特大）
      { id: 'city_boss2', count: 1 },  // 小王：機械領袖（特大）
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

  // ── 地圖 6：暗影領域（Boss 房） ──────────────────────────────────────────
  boss: {
    key: 'boss', name: '暗影領域', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x0D0018,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss', bgImage: 'bg_boss',
    monsters: [], portals: [], npcs: [],
    spawnX: 200,
  },
};

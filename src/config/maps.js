// 地圖定義 v5.0 — 縮短地圖寬度修正背景重複、新增怪物、新增 NPC

const GROUND_Y = 672;   // 地板頂部 y 座標
const PH = 24;          // 平台高度

// 地圖寬度縮短至 2560（修正視差背景重複問題）
const MAP_WIDTH = 2560;

function plat(x, y, width, type = 'stone', thin = true) {
  return { x, y, width, type, thin };
}
function ground(x, y, width, type = 'stone') {
  return { x, y, width, type, thin: false };
}

// ─────────── 浮空島嶼 (Sky Island) ───────────
// 配合 bg_sky_new.png：藍天浮雲，石質浮島風格（寬度縮短至 2560）
const SKY_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'stone'),

  // 第一層（低）
  plat(80,   560, 220, 'stone'),
  plat(360,  540, 180, 'stone'),
  plat(620,  560, 200, 'stone'),
  plat(880,  540, 180, 'stone'),
  plat(1140, 560, 220, 'stone'),
  plat(1400, 540, 180, 'stone'),
  plat(1660, 560, 200, 'stone'),
  plat(1920, 540, 180, 'stone'),
  plat(2200, 560, 220, 'stone'),

  // 第二層（中）
  plat(140,  440, 200, 'stone'),
  plat(440,  420, 180, 'grass'),
  plat(720,  440, 200, 'stone'),
  plat(1000, 420, 180, 'grass'),
  plat(1280, 440, 200, 'stone'),
  plat(1560, 420, 180, 'grass'),
  plat(1840, 440, 200, 'stone'),
  plat(2120, 420, 180, 'grass'),

  // 第三層（高）
  plat(200,  310, 180, 'grass'),
  plat(540,  290, 160, 'stone'),
  plat(880,  310, 180, 'grass'),
  plat(1220, 290, 160, 'stone'),
  plat(1560, 310, 180, 'grass'),
  plat(1900, 290, 160, 'stone'),
  plat(2240, 310, 180, 'grass'),

  // 最高層（薄木橋）
  plat(320,  180, 140, 'wood'),
  plat(720,  160, 140, 'wood'),
  plat(1120, 180, 140, 'wood'),
  plat(1520, 160, 140, 'wood'),
  plat(1920, 180, 140, 'wood'),
  plat(2320, 160, 140, 'wood'),
];

// ─────────── 古代廢墟 (Ancient Ruins) ───────────
// 配合 bg_ruins_new.png：沙色石拱廢墟（寬度縮短至 2560）
const RUINS_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 廢墟立柱平台
  plat(60,   544, 240, 'brick'),
  plat(360,  500, 200, 'stone'),
  plat(640,  544, 200, 'brick'),
  plat(920,  500, 200, 'stone'),
  plat(1200, 544, 240, 'brick'),
  plat(1500, 500, 200, 'stone'),
  plat(1780, 544, 200, 'brick'),
  plat(2060, 500, 200, 'stone'),
  plat(2340, 544, 200, 'brick'),

  // 拱頂平台
  plat(120,  390, 200, 'stone'),
  plat(420,  360, 180, 'brick'),
  plat(720,  390, 200, 'stone'),
  plat(1020, 360, 180, 'brick'),
  plat(1300, 390, 200, 'stone'),
  plat(1600, 360, 180, 'brick'),
  plat(1880, 390, 200, 'stone'),
  plat(2180, 360, 180, 'brick'),

  // 高塔平台
  plat(200,  268, 180, 'brick'),
  plat(560,  244, 160, 'stone'),
  plat(940,  268, 180, 'brick'),
  plat(1300, 244, 160, 'stone'),
  plat(1660, 268, 180, 'brick'),
  plat(2020, 244, 160, 'stone'),
  plat(2360, 268, 180, 'brick'),

  // 最頂（木板橋）
  plat(360,  150, 160, 'wood'),
  plat(800,  130, 160, 'wood'),
  plat(1200, 150, 160, 'wood'),
  plat(1640, 130, 160, 'wood'),
  plat(2080, 150, 160, 'wood'),
];

// ─────────── Kerning City ───────────
// 配合 bg_city_new.png：磚牆夜城，木造鷹架風格（寬度縮短至 2560）
const KERNING_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 近地面鷹架
  plat(80,   572, 220, 'wood'),
  plat(360,  556, 200, 'wood'),
  plat(620,  572, 200, 'wood'),
  plat(880,  556, 200, 'wood'),
  plat(1140, 572, 220, 'wood'),
  plat(1400, 556, 200, 'wood'),
  plat(1660, 572, 200, 'wood'),
  plat(1920, 556, 200, 'wood'),
  plat(2200, 572, 200, 'wood'),

  // 中層鷹架
  plat(140,  450, 200, 'brick'),
  plat(440,  430, 180, 'wood'),
  plat(720,  450, 200, 'brick'),
  plat(1000, 430, 180, 'wood'),
  plat(1280, 450, 200, 'brick'),
  plat(1560, 430, 180, 'wood'),
  plat(1840, 450, 200, 'brick'),
  plat(2120, 430, 180, 'wood'),

  // 高層鷹架
  plat(220,  320, 180, 'wood'),
  plat(560,  300, 160, 'brick'),
  plat(900,  320, 180, 'wood'),
  plat(1240, 300, 160, 'brick'),
  plat(1580, 320, 180, 'wood'),
  plat(1920, 300, 160, 'brick'),
  plat(2260, 320, 180, 'wood'),

  // 屋頂鷹架（最高）
  plat(400,  190, 160, 'wood'),
  plat(820,  170, 160, 'wood'),
  plat(1240, 190, 160, 'wood'),
  plat(1660, 170, 160, 'wood'),
  plat(2080, 190, 160, 'wood'),
];

// ─────────── Boss 房間 (Shadow Lord Arena) ───────────
// 1280px 寬封閉戰場，程式生成暗影領域背景
const BOSS_PLATFORMS = [
  ground(0, GROUND_Y, 1280, 'brick'),

  // 低層側台（供走位/跳躍）
  plat(80,   540, 200, 'brick'),
  plat(1000, 540, 200, 'brick'),

  // 中層台
  plat(280,  400, 220, 'stone'),
  plat(780,  400, 220, 'stone'),

  // 高層中央台
  plat(480,  260, 320, 'brick'),
];

export const MAPS = {
  // ── 浮空島嶼（初始地圖，Lv1）──
  sky: {
    key: 'sky', name: '浮空島嶼', sceneKey: 'MapleIslandScene',
    width: MAP_WIDTH, bgColor: 0x5588ff,
    platforms: SKY_PLATFORMS,
    bgType: 'sky',
    bgImage: 'bg_sky',
    monsters: [
      { id: 'slime',    count: 5, spreadX: 2200, offsetX: 200 },
      { id: 'mushroom', count: 4, spreadX: 2000, offsetX: 300 },
      { id: 'snail',    count: 4, spreadX: 1800, offsetX: 400 },
      { id: 'stump',    count: 3, spreadX: 1600, offsetX: 500 },
      { id: 'sky_imp',  count: 4, spreadX: 1400, offsetX: 300 },
      { id: 'sky_bird', count: 3, spreadX: 1200, offsetX: 400 },
      { id: 'sky_puff', count: 3, spreadX: 1000, offsetX: 500 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins', label: '→古代廢墟', spawnX: 200 },
    ],
    npcs: [
      { x: 250, y: GROUND_Y - 60, id: 'npc_new_2', name: '楓葉義工', dialog: ['歡迎來到浮空島嶼！', '這裡是新手練功的好地方。', '島上的怪物比較弱，好好鍛練吧！'] },
    ],
    spawnX: 150,
  },

  // ── 古代廢墟（中期地圖，Lv9）──
  ruins: {
    key: 'ruins', name: '古代廢墟', sceneKey: 'PerionScene',
    width: MAP_WIDTH, bgColor: 0xc8a060,
    platforms: RUINS_PLATFORMS,
    bgType: 'ruins',
    bgImage: 'bg_ruins',
    monsters: [
      { id: 'boar',        count: 4, spreadX: 2000, offsetX: 300 },
      { id: 'robot',       count: 4, spreadX: 1800, offsetX: 400 },
      { id: 'skeleton',    count: 4, spreadX: 1600, offsetX: 500 },
      { id: 'snake',       count: 3, spreadX: 1400, offsetX: 600 },
      { id: 'ruin_knight', count: 4, spreadX: 1200, offsetX: 300 },
      { id: 'ruin_golem',  count: 3, spreadX: 1000, offsetX: 400 },
      { id: 'ruin_wraith', count: 3, spreadX: 1800, offsetX: 500 },
      { id: 'ruin_beast',  count: 2, spreadX: 1600, offsetX: 600 },
      { id: 'ruin_giant',  count: 2, spreadX: 1400, offsetX: 700 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→Kerning City', spawnX: 200 },
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'sky',     label: '←浮空島嶼',   spawnX: MAP_WIDTH - 200 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_3', name: '廢墟探險家', dialog: ['古代廢墟充滿了危險。', '需要補給品嗎？', '小心那些骷髏戰士，他們很狡猾！'] },
    ],
    spawnX: 150,
  },

  // ── Kerning City（後期地圖，Lv19）──
  kerning: {
    key: 'kerning', name: 'Kerning City', sceneKey: 'KerningScene',
    width: MAP_WIDTH, bgColor: 0x111133,
    platforms: KERNING_PLATFORMS,
    bgType: 'kerning',
    bgImage: 'bg_city',
    monsters: [
      { id: 'dragon',     count: 4, spreadX: 2000, offsetX: 300 },
      { id: 'cyclops',    count: 3, spreadX: 1800, offsetX: 400 },
      { id: 'golem',      count: 3, spreadX: 1600, offsetX: 500 },
      { id: 'mimic',      count: 3, spreadX: 1400, offsetX: 600 },
      { id: 'city_thug',  count: 4, spreadX: 1200, offsetX: 300 },
      { id: 'city_mech',  count: 3, spreadX: 2200, offsetX: 400 },
      { id: 'city_beast', count: 2, spreadX: 2000, offsetX: 500 },
      { id: 'city_elite', count: 3, spreadX: 1800, offsetX: 600 },
      { id: 'city_boss1', count: 1, spreadX: 2000, offsetX: 1200 },
      { id: 'city_boss2', count: 1, spreadX: 2200, offsetX: 1400 },
    ],
    portals: [
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins', label: '←古代廢墟',   spawnX: MAP_WIDTH - 200 },
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss',  label: '⚠ Boss 決戰', spawnX: 200, requireBoss: true },
    ],
    npcs: [
      { x: 350, y: GROUND_Y - 60, id: 'npc_new_4', name: '地下城嚮導', dialog: ['歡迎來到 Kerning City！', '這裡的怪物非常強大，要小心。', '擊敗 60 隻怪物解鎖 Boss！'] },
    ],
    spawnX: 150,
  },

  // ── Boss 房（暗影領域，Lv30）──
  boss: {
    key: 'boss', name: '暗影領域', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x0D0018,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss',
    bgImage: 'bg_boss',
    monsters: [],
    portals: [],
    npcs: [],
    spawnX: 200,
  },
};

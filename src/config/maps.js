// 地圖定義 v4.0 — 3 個使用真實背景圖的新地圖

const GROUND_Y = 672;   // 地板頂部 y 座標
const PH = 24;          // 平台高度

function plat(x, y, width, type = 'stone', thin = true) {
  return { x, y, width, type, thin };
}
function ground(x, y, width, type = 'stone') {
  return { x, y, width, type, thin: false };
}

// ─────────── 浮空島嶼 (Sky Island) ───────────
// 配合 game_background.png：藍天浮雲，石質浮島風格
const SKY_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'stone'),

  // 第一層（低）
  plat(80,   560, 220, 'stone'),
  plat(380,  540, 180, 'stone'),
  plat(680,  560, 200, 'stone'),
  plat(960,  540, 180, 'stone'),
  plat(1240, 560, 220, 'stone'),
  plat(1540, 540, 180, 'stone'),
  plat(1820, 560, 200, 'stone'),
  plat(2100, 540, 180, 'stone'),
  plat(2380, 560, 220, 'stone'),
  plat(2680, 540, 180, 'stone'),
  plat(2960, 560, 200, 'stone'),
  plat(3240, 540, 180, 'stone'),
  plat(3520, 560, 200, 'stone'),

  // 第二層（中）
  plat(140,  440, 200, 'stone'),
  plat(480,  420, 180, 'grass'),
  plat(780,  440, 200, 'stone'),
  plat(1080, 420, 180, 'grass'),
  plat(1360, 440, 200, 'stone'),
  plat(1660, 420, 180, 'grass'),
  plat(1960, 440, 200, 'stone'),
  plat(2260, 420, 180, 'grass'),
  plat(2560, 440, 200, 'stone'),
  plat(2860, 420, 180, 'grass'),
  plat(3160, 440, 200, 'stone'),
  plat(3460, 420, 180, 'grass'),

  // 第三層（高）
  plat(200,  310, 180, 'grass'),
  plat(560,  290, 160, 'stone'),
  plat(900,  310, 180, 'grass'),
  plat(1240, 290, 160, 'stone'),
  plat(1580, 310, 180, 'grass'),
  plat(1920, 290, 160, 'stone'),
  plat(2260, 310, 180, 'grass'),
  plat(2600, 290, 160, 'stone'),
  plat(2940, 310, 180, 'grass'),
  plat(3280, 290, 160, 'stone'),

  // 最高層（薄木橋）
  plat(320,  180, 140, 'wood'),
  plat(720,  160, 140, 'wood'),
  plat(1120, 180, 140, 'wood'),
  plat(1520, 160, 140, 'wood'),
  plat(1920, 180, 140, 'wood'),
  plat(2320, 160, 140, 'wood'),
  plat(2720, 180, 140, 'wood'),
  plat(3200, 160, 140, 'wood'),
];

// ─────────── 古代廢墟 (Ancient Ruins) ───────────
// 配合 ruins_background.png：沙色石拱廢墟，石磚平台
const RUINS_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'brick'),

  // 廢墟立柱平台
  plat(60,   544, 240, 'brick'),
  plat(380,  500, 200, 'stone'),
  plat(660,  544, 200, 'brick'),
  plat(940,  500, 200, 'stone'),
  plat(1220, 544, 240, 'brick'),
  plat(1540, 500, 200, 'stone'),
  plat(1820, 544, 200, 'brick'),
  plat(2100, 500, 200, 'stone'),
  plat(2380, 544, 240, 'brick'),
  plat(2700, 500, 200, 'stone'),
  plat(2980, 544, 200, 'brick'),
  plat(3260, 500, 200, 'stone'),
  plat(3540, 544, 200, 'brick'),

  // 拱頂平台
  plat(120,  390, 200, 'stone'),
  plat(440,  360, 180, 'brick'),
  plat(740,  390, 200, 'stone'),
  plat(1040, 360, 180, 'brick'),
  plat(1320, 390, 200, 'stone'),
  plat(1620, 360, 180, 'brick'),
  plat(1900, 390, 200, 'stone'),
  plat(2200, 360, 180, 'brick'),
  plat(2500, 390, 200, 'stone'),
  plat(2800, 360, 180, 'brick'),
  plat(3100, 390, 200, 'stone'),
  plat(3400, 360, 180, 'brick'),

  // 高塔平台
  plat(200,  268, 180, 'brick'),
  plat(580,  244, 160, 'stone'),
  plat(960,  268, 180, 'brick'),
  plat(1340, 244, 160, 'stone'),
  plat(1720, 268, 180, 'brick'),
  plat(2100, 244, 160, 'stone'),
  plat(2480, 268, 180, 'brick'),
  plat(2860, 244, 160, 'stone'),
  plat(3240, 268, 180, 'brick'),

  // 最頂（木板橋）
  plat(360,  150, 160, 'wood'),
  plat(800,  130, 160, 'wood'),
  plat(1200, 150, 160, 'wood'),
  plat(1640, 130, 160, 'wood'),
  plat(2080, 150, 160, 'wood'),
  plat(2520, 130, 160, 'wood'),
  plat(2960, 150, 160, 'wood'),
  plat(3360, 130, 160, 'wood'),
];

// ─────────── Kerning City ───────────
// 配合 city__background.png：磚牆夜城，木造鷹架風格
const KERNING_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'brick'),

  // 近地面鷹架
  plat(80,   572, 220, 'wood'),
  plat(380,  556, 200, 'wood'),
  plat(660,  572, 200, 'wood'),
  plat(940,  556, 200, 'wood'),
  plat(1220, 572, 220, 'wood'),
  plat(1520, 556, 200, 'wood'),
  plat(1800, 572, 200, 'wood'),
  plat(2080, 556, 200, 'wood'),
  plat(2360, 572, 220, 'wood'),
  plat(2660, 556, 200, 'wood'),
  plat(2940, 572, 200, 'wood'),
  plat(3220, 556, 200, 'wood'),
  plat(3500, 572, 200, 'wood'),

  // 中層鷹架
  plat(140,  450, 200, 'brick'),
  plat(460,  430, 180, 'wood'),
  plat(760,  450, 200, 'brick'),
  plat(1060, 430, 180, 'wood'),
  plat(1340, 450, 200, 'brick'),
  plat(1640, 430, 180, 'wood'),
  plat(1920, 450, 200, 'brick'),
  plat(2220, 430, 180, 'wood'),
  plat(2500, 450, 200, 'brick'),
  plat(2800, 430, 180, 'wood'),
  plat(3080, 450, 200, 'brick'),
  plat(3380, 430, 180, 'wood'),

  // 高層鷹架
  plat(220,  320, 180, 'wood'),
  plat(580,  300, 160, 'brick'),
  plat(940,  320, 180, 'wood'),
  plat(1300, 300, 160, 'brick'),
  plat(1660, 320, 180, 'wood'),
  plat(2020, 300, 160, 'brick'),
  plat(2380, 320, 180, 'wood'),
  plat(2740, 300, 160, 'brick'),
  plat(3100, 320, 180, 'wood'),
  plat(3460, 300, 160, 'brick'),

  // 屋頂鷹架（最高）
  plat(400,  190, 160, 'wood'),
  plat(820,  170, 160, 'wood'),
  plat(1240, 190, 160, 'wood'),
  plat(1660, 170, 160, 'wood'),
  plat(2080, 190, 160, 'wood'),
  plat(2500, 170, 160, 'wood'),
  plat(2920, 190, 160, 'wood'),
  plat(3340, 170, 160, 'wood'),
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
    width: 3840, bgColor: 0x5588ff,
    platforms: SKY_PLATFORMS,
    bgType: 'sky',
    bgImage: 'bg_sky',
    monsters: [
      { id: 'slime',    count: 8, spreadX: 3400, offsetX: 200 },
      { id: 'mushroom', count: 7, spreadX: 3200, offsetX: 300 },
      { id: 'snail',    count: 6, spreadX: 3000, offsetX: 400 },
      { id: 'stump',    count: 5, spreadX: 2800, offsetX: 600 },
    ],
    portals: [
      { x: 3790, y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins',   label: '→古代廢墟', spawnX: 200 },
    ],
    npcs: [],
    spawnX: 150,
  },

  // ── 古代廢墟（中期地圖，Lv9）──
  ruins: {
    key: 'ruins', name: '古代廢墟', sceneKey: 'PerionScene',
    width: 3840, bgColor: 0xc8a060,
    platforms: RUINS_PLATFORMS,
    bgType: 'ruins',
    bgImage: 'bg_ruins',
    monsters: [
      { id: 'boar',     count: 8, spreadX: 3200, offsetX: 300 },
      { id: 'robot',    count: 7, spreadX: 3000, offsetX: 400 },
      { id: 'skeleton', count: 7, spreadX: 2800, offsetX: 500 },
      { id: 'snake',    count: 6, spreadX: 2600, offsetX: 600 },
    ],
    portals: [
      { x: 3790, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→Kerning City', spawnX: 200 },
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'sky',     label: '←浮空島嶼',   spawnX: 3600 },
    ],
    npcs: [],
    spawnX: 150,
  },

  // ── Kerning City（後期地圖，Lv19）──
  kerning: {
    key: 'kerning', name: 'Kerning City', sceneKey: 'KerningScene',
    width: 3840, bgColor: 0x111133,
    platforms: KERNING_PLATFORMS,
    bgType: 'kerning',
    bgImage: 'bg_city',
    monsters: [
      { id: 'dragon',  count: 8, spreadX: 3200, offsetX: 300 },
      { id: 'cyclops', count: 7, spreadX: 3000, offsetX: 400 },
      { id: 'golem',   count: 6, spreadX: 2800, offsetX: 500 },
      { id: 'mimic',   count: 6, spreadX: 2600, offsetX: 600 },
    ],
    portals: [
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins', label: '←古代廢墟',   spawnX: 3600 },
      { x: 3790, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss',  label: '⚠ Boss 決戰', spawnX: 200, requireBoss: true },
    ],
    npcs: [],
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

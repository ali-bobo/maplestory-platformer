// 地圖定義

const GROUND_Y = 672;   // 地板頂部 y 座標
const PH = 24;          // 平台高度

// 輔助：建立平台物件
function plat(x, y, width, type = 'grass', thin = true) {
  return { x, y, width, type, thin };
}
// 地板（不可穿越）
function ground(x, y, width, type = 'grass') {
  return { x, y, width, type, thin: false };
}

// ─────────── 楓之島 ───────────
const MAPLE_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'grass'),
  plat(80,   544, 224, 'grass'),
  plat(380,  480, 192, 'grass'),
  plat(640,  416, 208, 'stone'),
  plat(900,  352, 192, 'stone'),
  plat(1100, 544, 256, 'grass'),
  plat(1380, 480, 192, 'grass'),
  plat(1600, 416, 224, 'stone'),
  plat(1850, 352, 192, 'stone'),
  plat(2080, 480, 256, 'grass'),
  plat(2340, 544, 192, 'grass'),
  plat(2580, 416, 224, 'stone'),
  plat(2820, 480, 192, 'grass'),
  plat(3040, 416, 224, 'stone'),
  plat(3280, 352, 192, 'stone'),
  plat(3520, 480, 192, 'grass'),
  plat(160,  320, 160, 'wood'),
  plat(700,  256, 160, 'wood'),
  plat(1450, 288, 160, 'wood'),
  plat(2200, 256, 160, 'wood'),
];

// ─────────── 弓箭手獵場 ───────────
const HENESYS_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'grass'),
  plat(100,  544, 256, 'grass'),
  plat(420,  480, 224, 'grass'),
  plat(700,  416, 208, 'stone'),
  plat(960,  352, 192, 'stone'),
  plat(1180, 480, 256, 'grass'),
  plat(1460, 416, 224, 'grass'),
  plat(1720, 352, 208, 'stone'),
  plat(1980, 288, 192, 'stone'),
  plat(2220, 416, 256, 'grass'),
  plat(2500, 480, 224, 'brick'),
  plat(2760, 416, 208, 'brick'),
  plat(3000, 352, 192, 'stone'),
  plat(3220, 416, 256, 'grass'),
  plat(3500, 480, 192, 'grass'),
  plat(200,  288, 160, 'wood'),
  plat(840,  224, 160, 'wood'),
  plat(1560, 256, 160, 'wood'),
  plat(2300, 224, 160, 'wood'),
  plat(3100, 256, 160, 'wood'),
];

// ─────────── 法師森林 ───────────
const ELLINIA_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'grass'),
  plat(80,   528, 224, 'grass'),
  plat(360,  464, 192, 'wood'),
  plat(600,  400, 208, 'wood'),
  plat(860,  336, 192, 'stone'),
  plat(1080, 464, 256, 'wood'),
  plat(1360, 400, 224, 'wood'),
  plat(1620, 336, 208, 'stone'),
  plat(1880, 272, 192, 'stone'),
  plat(2120, 400, 256, 'wood'),
  plat(2400, 464, 224, 'grass'),
  plat(2660, 400, 208, 'wood'),
  plat(2900, 336, 192, 'stone'),
  plat(3120, 400, 256, 'wood'),
  plat(3400, 464, 192, 'grass'),
  plat(180,  272, 160, 'wood'),
  plat(740,  208, 160, 'wood'),
  plat(1440, 240, 160, 'wood'),
  plat(2200, 208, 160, 'wood'),
  plat(3200, 240, 160, 'wood'),
];

// ─────────── 劍士荒原 ───────────
const PERION_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'stone'),
  plat(80,   544, 256, 'stone'),
  plat(400,  480, 224, 'stone'),
  plat(680,  416, 208, 'brick'),
  plat(940,  352, 192, 'brick'),
  plat(1160, 480, 256, 'stone'),
  plat(1440, 416, 224, 'stone'),
  plat(1700, 352, 208, 'brick'),
  plat(1960, 288, 192, 'brick'),
  plat(2200, 416, 256, 'stone'),
  plat(2480, 480, 224, 'stone'),
  plat(2740, 416, 208, 'brick'),
  plat(2980, 352, 192, 'stone'),
  plat(3200, 416, 256, 'stone'),
  plat(3480, 480, 192, 'stone'),
  plat(200,  272, 160, 'brick'),
  plat(800,  208, 160, 'brick'),
  plat(1500, 240, 160, 'brick'),
  plat(2280, 208, 160, 'brick'),
  plat(3000, 240, 160, 'brick'),
];

// ─────────── 盜賊地下城 ───────────
const KERNING_PLATFORMS = [
  ground(0, GROUND_Y, 3840, 'brick'),
  plat(80,   528, 224, 'brick'),
  plat(360,  464, 192, 'brick'),
  plat(620,  400, 208, 'stone'),
  plat(880,  336, 192, 'stone'),
  plat(1100, 464, 256, 'brick'),
  plat(1380, 400, 224, 'brick'),
  plat(1640, 336, 208, 'stone'),
  plat(1900, 272, 192, 'stone'),
  plat(2140, 400, 256, 'brick'),
  plat(2420, 464, 224, 'brick'),
  plat(2680, 400, 208, 'stone'),
  plat(2920, 336, 192, 'brick'),
  plat(3140, 400, 256, 'brick'),
  plat(3420, 464, 192, 'brick'),
  plat(160,  256, 160, 'brick'),
  plat(760,  192, 160, 'stone'),
  plat(1460, 224, 160, 'brick'),
  plat(2240, 192, 160, 'stone'),
  plat(3220, 224, 160, 'brick'),
];

// ─────────── 城鎮 ───────────
const TOWN_PLATFORMS = [
  ground(0, GROUND_Y, 1280, 'grass'),
  plat(200, 544, 192, 'wood'),
  plat(500, 480, 224, 'grass'),
  plat(800, 544, 192, 'wood'),
];

// ─────────── Boss戰 ───────────
const BOSS_PLATFORMS = [
  ground(0, GROUND_Y, 1280, 'stone'),
  plat(160, 512, 192, 'stone'),
  plat(480, 448, 256, 'stone'),
  plat(864, 512, 192, 'stone'),
  plat(320, 352, 192, 'brick'),
  plat(640, 288, 256, 'brick'),
];

export const MAPS = {
  maple: {
    key: 'maple', name: '楓之島', sceneKey: 'MapleIslandScene',
    width: 3840, bgColor: 0x87ceeb,
    platforms: MAPLE_PLATFORMS,
    bgType: 'forest',
    monsters: [
      { id: 'snail',    count: 8, spreadX: 3400, offsetX: 200 },
      { id: 'mushroom', count: 6, spreadX: 3200, offsetX: 300 },
      { id: 'slime',    count: 5, spreadX: 3000, offsetX: 500 },
    ],
    portals: [
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '→弓箭手獵場' },
    ],
    npcs: [],
    spawnX: 150,
  },

  henesys: {
    key: 'henesys', name: '弓箭手獵場', sceneKey: 'HenesysScene',
    width: 3840, bgColor: 0x98fb98,
    platforms: HENESYS_PLATFORMS,
    bgType: 'forest',
    monsters: [
      { id: 'pig',      count: 7, spreadX: 3200, offsetX: 300 },
      { id: 'stump',    count: 6, spreadX: 3000, offsetX: 400 },
      { id: 'mushr-war',count: 5, spreadX: 2800, offsetX: 600 },
    ],
    portals: [
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '→法師森林' },
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'maple',   label: '←楓之島' },
    ],
    npcs: [],
    spawnX: 150,
  },

  ellinia: {
    key: 'ellinia', name: '法師森林', sceneKey: 'ElliniaScene',
    width: 3840, bgColor: 0x228b22,
    platforms: ELLINIA_PLATFORMS,
    bgType: 'dark_forest',
    monsters: [
      { id: 'green-spirit', count: 7, spreadX: 3200, offsetX: 300 },
      { id: 'spiral-mush',  count: 6, spreadX: 3000, offsetX: 400 },
      { id: 'fairy',        count: 5, spreadX: 2800, offsetX: 600 },
    ],
    portals: [
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'perion',  label: '→劍士荒原' },
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '←弓箭手獵場' },
    ],
    npcs: [],
    spawnX: 150,
  },

  perion: {
    key: 'perion', name: '劍士荒原', sceneKey: 'PerionScene',
    width: 3840, bgColor: 0xd2691e,
    platforms: PERION_PLATFORMS,
    bgType: 'desert',
    monsters: [
      { id: 'boar',        count: 7, spreadX: 3200, offsetX: 300 },
      { id: 'stone-golem', count: 5, spreadX: 3000, offsetX: 400 },
      { id: 'armored-egg', count: 6, spreadX: 2800, offsetX: 500 },
    ],
    portals: [
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→盜賊地下城' },
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '←法師森林' },
    ],
    npcs: [],
    spawnX: 150,
  },

  kerning: {
    key: 'kerning', name: '盜賊地下城', sceneKey: 'KerningScene',
    width: 3840, bgColor: 0x222244,
    platforms: KERNING_PLATFORMS,
    bgType: 'dungeon',
    monsters: [
      { id: 'zombie-mush', count: 7, spreadX: 3200, offsetX: 300 },
      { id: 'croc',        count: 6, spreadX: 3000, offsetX: 400 },
      { id: 'goblin',      count: 5, spreadX: 2800, offsetX: 600 },
    ],
    portals: [
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss',   label: '→暗影魔君', requireBoss: true },
      { x: 3750, y: GROUND_Y - 48, width: 40, height: 72, target: 'town',   label: '→城鎮',     requireBoss: false },
      { x: 30,   y: GROUND_Y - 48, width: 40, height: 72, target: 'perion', label: '←劍士荒原' },
    ],
    npcs: [],
    spawnX: 150,
  },

  town: {
    key: 'town', name: '楓葉城', sceneKey: 'TownScene',
    width: 1280, bgColor: 0x87ceeb,
    platforms: TOWN_PLATFORMS,
    bgType: 'town',
    monsters: [],
    portals: [
      { x: 1200, y: GROUND_Y - 48, width: 40, height: 72, target: 'maple', label: '→楓之島' },
    ],
    npcs: [
      { x: 400, y: GROUND_Y - 48, type: 'shop', name: '商人老陳', id: 'npc-shop' },
    ],
    spawnX: 200,
  },

  boss: {
    key: 'boss', name: '暗影魔君巢穴', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x110011,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss',
    monsters: [],
    portals: [
      { x: 30, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '←撤退' },
    ],
    npcs: [],
    spawnX: 150,
  },
};

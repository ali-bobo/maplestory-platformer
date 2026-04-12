// 地圖定義 v5.2 — 平台減少（4-5個/層，寬度加大），地板透明（用背景自然地板）

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
const SKY_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'stone'),

  // 第一層（y=464）：5 個，每個 340px
  plat(80,   464, 340, 'stone'),
  plat(564,  464, 340, 'stone'),
  plat(1048, 464, 340, 'stone'),
  plat(1532, 464, 340, 'stone'),
  plat(2016, 464, 340, 'stone'),

  // 第二層（y=344）：4 個，每個 380px
  plat(280,  344, 380, 'grass'),
  plat(840,  344, 380, 'stone'),
  plat(1400, 344, 380, 'grass'),
  plat(1960, 344, 380, 'stone'),

  // 第三層（y=224）：3 個，每個 440px
  plat(440,  224, 440, 'grass'),
  plat(1120, 224, 440, 'stone'),
  plat(1800, 224, 440, 'grass'),

  // 最高層（y=104）：2 個，每個 480px
  plat(700,  104, 480, 'wood'),
  plat(1480, 104, 480, 'wood'),
];

// ─────────── 古代廢墟 ───────────
const RUINS_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 第一層（y=448）：5 個，每個 340px
  plat(80,   448, 340, 'brick'),
  plat(564,  448, 340, 'stone'),
  plat(1048, 448, 340, 'brick'),
  plat(1532, 448, 340, 'stone'),
  plat(2016, 448, 340, 'brick'),

  // 第二層（y=294）：4 個，每個 380px
  plat(280,  294, 380, 'stone'),
  plat(840,  294, 380, 'brick'),
  plat(1400, 294, 380, 'stone'),
  plat(1960, 294, 380, 'brick'),

  // 第三層（y=172）：3 個，每個 440px
  plat(440,  172, 440, 'brick'),
  plat(1120, 172, 440, 'stone'),
  plat(1800, 172, 440, 'brick'),

  // 最頂（y=54）：2 個，每個 480px
  plat(700,  54,  480, 'wood'),
  plat(1480, 54,  480, 'wood'),
];

// ─────────── Kerning City ───────────
const KERNING_PLATFORMS = [
  ground(0, GROUND_Y, MAP_WIDTH, 'brick'),

  // 第一層（y=460）：5 個，每個 340px
  plat(80,   460, 340, 'wood'),
  plat(564,  460, 340, 'brick'),
  plat(1048, 460, 340, 'wood'),
  plat(1532, 460, 340, 'brick'),
  plat(2016, 460, 340, 'wood'),

  // 第二層（y=334）：4 個，每個 380px
  plat(280,  334, 380, 'brick'),
  plat(840,  334, 380, 'wood'),
  plat(1400, 334, 380, 'brick'),
  plat(1960, 334, 380, 'wood'),

  // 第三層（y=204）：3 個，每個 440px
  plat(440,  204, 440, 'wood'),
  plat(1120, 204, 440, 'brick'),
  plat(1800, 204, 440, 'wood'),

  // 屋頂（y=74）：2 個，每個 480px
  plat(700,  74,  480, 'wood'),
  plat(1480, 74,  480, 'wood'),
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
  sky: {
    key: 'sky', name: '浮空島嶼', sceneKey: 'MapleIslandScene',
    width: MAP_WIDTH, bgColor: 0x5588ff,
    platforms: SKY_PLATFORMS,
    bgType: 'sky', bgImage: 'bg_sky',
    monsters: [
      { id: 'slime',    count: 5 },
      { id: 'mushroom', count: 4 },
      { id: 'snail',    count: 4 },
      { id: 'stump',    count: 3 },
      { id: 'sky_imp',  count: 3 },
      { id: 'sky_bird', count: 3 },
    ],
    portals: [
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'ruins', label: '→古代廢墟', spawnX: 200 },
    ],
    npcs: [
      { x: 250, y: GROUND_Y - 60, id: 'npc_new_2', name: '楓葉義工', dialog: ['歡迎來到浮空島嶼！', '這裡是新手練功的好地方。', '島上的怪物比較弱，好好鍛練吧！'] },
    ],
    spawnX: 150,
  },

  ruins: {
    key: 'ruins', name: '古代廢墟', sceneKey: 'PerionScene',
    width: MAP_WIDTH, bgColor: 0xc8a060,
    platforms: RUINS_PLATFORMS,
    bgType: 'ruins', bgImage: 'bg_ruins',
    monsters: [
      { id: 'boar',        count: 4 },
      { id: 'robot',       count: 4 },
      { id: 'skeleton',    count: 4 },
      { id: 'snake',       count: 3 },
      { id: 'ruin_knight', count: 3 },
      { id: 'ruin_golem',  count: 3 },
      { id: 'ruin_wraith', count: 3 },
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

  kerning: {
    key: 'kerning', name: 'Kerning City', sceneKey: 'KerningScene',
    width: MAP_WIDTH, bgColor: 0x111133,
    platforms: KERNING_PLATFORMS,
    bgType: 'kerning', bgImage: 'bg_city',
    monsters: [
      { id: 'dragon',     count: 4 },
      { id: 'cyclops',    count: 3 },
      { id: 'golem',      count: 3 },
      { id: 'mimic',      count: 3 },
      { id: 'city_thug',  count: 3 },
      { id: 'city_mech',  count: 3 },
      { id: 'city_elite', count: 2 },
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

  boss: {
    key: 'boss', name: '暗影領域', sceneKey: 'BossScene',
    width: 1280, bgColor: 0x0D0018,
    platforms: BOSS_PLATFORMS,
    bgType: 'boss', bgImage: 'bg_boss',
    monsters: [], portals: [], npcs: [],
    spawnX: 200,
  },
};

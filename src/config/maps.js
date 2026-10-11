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
];

// ─────────── 影之殿堂（安全地圖，轉職樞紐；一個畫面寬，不捲動）───────────
const SHRINE_WIDTH = 1280;
const SHRINE_PLATFORMS = [
  ground(0, GROUND_Y, SHRINE_WIDTH, 'stone'),

  // 兩個低矮的白石露台，只做裝飾與站位（TODO(art)：換 platform_shrine 專屬跳台）
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
      // 支線：神秘之境（Lv14-20）
      { x: MAP_WIDTH / 2,  y: GROUND_Y - 48, width: 40, height: 72, target: 'ellinia', label: '↑神秘之境（Lv14-20）', spawnX: 200 },
    ],
    npcs: [
      { x: 300, y: GROUND_Y - 60, id: 'npc_new_0', name: '獵人協會員',
        questIds: ['mushroom_hunt', 'stump_clear'],
        dialog: ['歡迎來到森林獵場！', '這裡是中級練功地點。', '小心那些野豬，衝刺速度非常快！', '地圖中央的傳送門通往神秘之境，往右是古代廢墟。'] },
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
      // 階段 1 暫時把最終 Boss 入口放在這裡；階段 2 接上黃沙遺跡後移到魔君王城
      { x: MAP_WIDTH - 50, y: GROUND_Y - 48, width: 40, height: 72, target: 'boss',    label: '⚠ Boss 決戰', spawnX: 200, requireBoss: true },
    ],
    npcs: [
      { x: 330, y: GROUND_Y - 60, id: 'npc_dockworker', npcId: 'dockworker', name: '碼頭工人',
        questIds: ['harbor_crabs', 'harbor_sailor'],
        dialog: ['歡迎來到碧濤港！', '最近螃蟹爬上碼頭，貨物都被夾壞了。', '海鷗會俯衝，章魚會噴墨，水母別硬碰。'] },
      { x: 720, y: GROUND_Y - 60, id: 'npc_sailor', npcId: 'old_sailor', name: '老水手',
        questIds: ['harbor_captain'],
        dialog: ['我在這片海上跑了四十年。', '那艘幽靈船的船長，把整座碼頭都嚇壞了。', '想挑戰他就先備好藥水，他的鐵鉤可不輕。'] },
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
      { x: 30,             y: GROUND_Y - 48, width: 40, height: 72, target: 'henesys', label: '←森林獵場', spawnX: MAP_WIDTH / 2 + 130 },
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
      { x: 800, y: GROUND_Y - 48, width: 40, height: 72, target: 'dungeon', dungeonId: 'slime_cave', label: '⚔ 史萊姆洞窟' },
      // 影之殿堂：轉職長老、技能導師與「影之試煉」入口都在那裡
      { x: 1400, y: GROUND_Y - 48, width: 40, height: 72, target: 'shrine', label: '→影之殿堂', spawnX: 120 },
      // 城市特區（暗巷城 ⇄ 台北都會）：Lv18 開放
      { x: 1200, y: GROUND_Y - 48, width: 40, height: 72, target: 'kerning', label: '→城市特區', spawnX: 200, minLevel: 18 },
    ],
    npcs: [
      // 星光之塔（role: 'starTower'）：互動顯示碎片進度，集滿 5 塊時點亮並解鎖最終 Boss。
      // 圖用 prop_star_tower（dist/assets 有檔才載入，否則程式畫的占位塔，見 ProceduralAssets.js）
      { x: 100,  y: GROUND_Y - 60, id: 'prop_star_tower', npcId: 'star_tower', role: 'starTower', name: '星光之塔', height: 400 },
      { x: 520,  y: GROUND_Y - 60, id: 'npc_merchant', name: '商人老陳', shop: true,
        dialog: ['歡迎光臨雜貨店！'] },
      { x: 1000, y: GROUND_Y - 60, id: 'npc_townsfolk', name: '城鎮居民',
        questIds: ['reach_town', 'job_call'], jobLetter: true,
        dialog: ['晨曦鎮是安全的休息站，這裡不會有怪物。', '需要補給就找商人老陳。', '右邊盡頭有兩道傳送門：靠左的通往影之殿堂，', '最右邊的是回浮空島嶼的路。', '中間偏右的是城市特區入口，Lv18 以後才開放。'] },
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

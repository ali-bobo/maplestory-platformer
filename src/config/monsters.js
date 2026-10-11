// 怪物定義 v5.3 — 補齊後段大怪正常體型，並為部分怪加入低頻跳躍壓迫感

export const MONSTER_FAMILIES = {
  SPIRIT: '精靈類',
  WOODLAND: '林地獸類',
  PLANT: '植物 / 菇類',
  WARRIOR: '戰士類',
  HEAVY: '重裝類',
  ROCK: '岩石類',
  FANTASY: '奇幻類',
  FLYING: '飛行類',
  MACHINE: '機械類',
  CITY: '城市類',
  SEA: '海港類',
  ELITE: '菁英 / 小王',
  BOSS_SUPPORT: 'Boss 援軍',
};

const MONSTER_CLASSIFICATION = {
  slime: { family: MONSTER_FAMILIES.FANTASY, habitats: ['sky', 'boss'] },
  mushroom: { family: MONSTER_FAMILIES.PLANT, habitats: ['sky', 'henesys'] },
  snail: { family: MONSTER_FAMILIES.WOODLAND, habitats: ['sky', 'henesys'] },
  stump: { family: MONSTER_FAMILIES.PLANT, habitats: ['henesys'] },
  sky_imp: { family: MONSTER_FAMILIES.SPIRIT, habitats: ['sky', 'ellinia'] },
  sky_bird: { family: MONSTER_FAMILIES.FLYING, habitats: ['sky', 'ellinia'] },
  sky_puff: { family: MONSTER_FAMILIES.SPIRIT, habitats: ['sky', 'ellinia'] },
  boar: { family: MONSTER_FAMILIES.WOODLAND, habitats: ['henesys'] },
  robot: { family: MONSTER_FAMILIES.MACHINE, habitats: ['taipei'] },
  skeleton: { family: MONSTER_FAMILIES.WARRIOR, habitats: ['ruins'] },
  snake: { family: MONSTER_FAMILIES.WOODLAND, habitats: ['henesys'] },
  ruin_knight: { family: MONSTER_FAMILIES.WARRIOR, habitats: ['ruins'] },
  ruin_golem: { family: MONSTER_FAMILIES.ROCK, habitats: ['ruins'] },
  ruin_wraith: { family: MONSTER_FAMILIES.SPIRIT, habitats: ['ruins', 'ellinia'] },
  ruin_beast: { family: MONSTER_FAMILIES.WOODLAND, habitats: ['ruins'] },
  ruin_giant: { family: MONSTER_FAMILIES.HEAVY, habitats: ['ruins'] },
  dragon: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia', 'kerning'] },
  cyclops: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia'] },
  golem: { family: MONSTER_FAMILIES.ROCK, habitats: ['ruins'] },
  mimic: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia', 'kerning'] },
  city_thug: { family: MONSTER_FAMILIES.CITY, habitats: ['kerning'] },
  city_mech: { family: MONSTER_FAMILIES.CITY, habitats: ['taipei'] },
  street_punk: { family: MONSTER_FAMILIES.CITY, habitats: ['taipei'] },
  city_beast: { family: MONSTER_FAMILIES.CITY, habitats: ['kerning'] },
  city_boss1: { family: MONSTER_FAMILIES.ELITE, habitats: ['taipei'] },
  city_boss2: { family: MONSTER_FAMILIES.ELITE, habitats: ['kerning'] },
  city_elite: { family: MONSTER_FAMILIES.ELITE, habitats: ['taipei'] },
  'shadow-slime': { family: MONSTER_FAMILIES.BOSS_SUPPORT, habitats: ['boss'] },
  shadow_guardian: { family: MONSTER_FAMILIES.ELITE, habitats: ['dungeon'] },
  crab: { family: MONSTER_FAMILIES.SEA, habitats: ['harbor'] },
  jellyfish: { family: MONSTER_FAMILIES.SEA, habitats: ['harbor'] },
  pirate_ghost: { family: MONSTER_FAMILIES.SPIRIT, habitats: ['harbor'] },
  octopus: { family: MONSTER_FAMILIES.SEA, habitats: ['harbor'] },
  seagull: { family: MONSTER_FAMILIES.FLYING, habitats: ['harbor'] },
  pirate_captain: { family: MONSTER_FAMILIES.ELITE, habitats: ['harbor'] },
};

export const MONSTERS = [
  // ── 浮空島嶼 (sky) Lv1-8 ─────────────────────────────────────────────────
  { id: 'slime',    name: '果凍精',   level: 1,  hp: 50,   atk: 10,  exp: 8,   speed: 45,  meso: 5,  dropRate: 0.05, behavior: 'patrol',  spriteKey: 'monster_slime',    area: 'sky'     },
  { id: 'mushroom', name: '帽帽菇',     level: 2,  hp: 80,   atk: 15,  exp: 15,  speed: 55,  meso: 8,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster_mushroom', area: 'sky'     },
  { id: 'snail',    name: '雲朵蝸',   level: 4,  hp: 120,  atk: 20,  exp: 25,  speed: 50,  meso: 10, dropRate: 0.10, behavior: 'patrol',  spriteKey: 'monster_snail',    area: 'sky'     },
  { id: 'stump',    name: '怒木精',     level: 6,  hp: 200,  atk: 28,  exp: 40,  speed: 45,  meso: 14, dropRate: 0.12, behavior: 'chase',   spriteKey: 'monster_stump',    area: 'sky'     },
  // 新增天空系怪物
  { id: 'sky_imp',  name: '雲端精靈',   level: 2,  hp: 70,   atk: 12,  exp: 12,  speed: 60,  meso: 6,  dropRate: 0.06, behavior: 'patrol',  spriteKey: 'monster_new_0',    area: 'sky'     },
  { id: 'sky_bird', name: '浮雲鳥',     level: 3,  hp: 90,   atk: 18,  exp: 20,  speed: 70,  meso: 9,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster_new_1',    area: 'sky'     },
  { id: 'sky_puff', name: '棉花怪',     level: 5,  hp: 150,  atk: 22,  exp: 30,  speed: 40,  meso: 12, dropRate: 0.10, behavior: 'chase',   spriteKey: 'monster_new_2',    area: 'sky'     },

  // ── 古代廢墟 (ruins) Lv9-18 ──────────────────────────────────────────────
  { id: 'boar',     name: '岩牙野豬',   level: 9,  hp: 380,  atk: 48,  exp: 90,  speed: 90,  meso: 22, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster_boar',     area: 'ruins', jumpProfile: { minInterval: 3400, maxInterval: 5200, velocity: 320, chance: 0.38 } },
  { id: 'robot',    name: '巡邏空拍機', level: 11, hp: 450,  atk: 58,  exp: 115, speed: 75,  meso: 28, dropRate: 0.16, behavior: 'ranged',  spriteKey: 'monster_robot',    area: 'ruins'   },
  { id: 'skeleton', name: '骷髏戰士',   level: 14, hp: 560,  atk: 70,  exp: 150, speed: 70,  meso: 34, dropRate: 0.18, behavior: 'chase',   spriteKey: 'monster_skeleton', area: 'ruins'   },
  { id: 'snake',    name: '毒眼鏡蛇',   level: 17, hp: 680,  atk: 86,  exp: 195, speed: 100, meso: 40, dropRate: 0.20, behavior: 'chase',   spriteKey: 'monster_snake',    area: 'ruins'   },
  // 新增廢墟系怪物
  { id: 'ruin_knight', name: '廢墟騎士', level: 10, hp: 420, atk: 52,  exp: 100, speed: 65,  meso: 24, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster_new_3',    area: 'ruins'   },
  { id: 'ruin_golem',  name: '石柱魔像', level: 13, hp: 520, atk: 65,  exp: 135, speed: 50,  meso: 32, dropRate: 0.17, behavior: 'patrol',  spriteKey: 'monster_new_4',    area: 'ruins' },
  { id: 'ruin_wraith', name: '古代惡靈', level: 16, hp: 620, atk: 80,  exp: 175, speed: 85,  meso: 38, dropRate: 0.19, behavior: 'chase',   spriteKey: 'monster_new_5',    area: 'ruins'   },
  { id: 'ruin_beast',  name: '廢墟猛獸', level: 12, hp: 480, atk: 60,  exp: 120, speed: 95,  meso: 30, dropRate: 0.16, behavior: 'chase',   spriteKey: 'monster_big_0',    area: 'ruins', jumpProfile: { minInterval: 2600, maxInterval: 4200, velocity: 360, chance: 0.42 } },
  { id: 'ruin_giant',  name: '廢墟巨人', level: 15, hp: 700, atk: 78,  exp: 160, speed: 55,  meso: 36, dropRate: 0.18, behavior: 'patrol',  spriteKey: 'monster_big_1',    area: 'ruins' },

  // ── 暗巷城 (kerning) Lv19-28 ────────────────────────────────────────
  { id: 'dragon',   name: '小藍龍',     level: 19, hp: 900,  atk: 105, exp: 260, speed: 85,  meso: 52, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster_dragon',   area: 'kerning' },
  { id: 'cyclops',  name: '獨眼怪',     level: 22, hp: 1100, atk: 125, exp: 330, speed: 70,  meso: 60, dropRate: 0.24, behavior: 'patrol',  spriteKey: 'monster_cyclops',  area: 'kerning' },
  { id: 'golem',    name: '石頭精',     level: 25, hp: 1400, atk: 145, exp: 420, speed: 45,  meso: 70, dropRate: 0.26, behavior: 'patrol',  spriteKey: 'monster_golem',    area: 'kerning' },
  { id: 'mimic',    name: '飛魚寶箱',   level: 28, hp: 1200, atk: 160, exp: 510, speed: 95,  meso: 82, dropRate: 0.28, behavior: 'ranged',  spriteKey: 'monster_mimic',    area: 'kerning' },
  // 新增 Kerning 系怪物
  { id: 'city_thug',   name: '城市流氓', level: 20, hp: 950, atk: 110, exp: 275, speed: 90,  meso: 54, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster_new_6',    area: 'kerning' },
  { id: 'city_mech',   name: '龐克飆仔', level: 23, hp: 1200,atk: 130, exp: 350, speed: 95,  meso: 62, dropRate: 0.24, behavior: 'chase',   spriteKey: 'monster_punk',    area: 'taipei' },
  { id: 'street_punk', name: '夜市混混', level: 22, hp: 1100,atk: 125, exp: 320, speed: 90,  meso: 58, dropRate: 0.23, behavior: 'chase',   spriteKey: 'monster_punk_red', area: 'taipei' },
  { id: 'city_beast',  name: '暗夜猛獸', level: 26, hp: 1500,atk: 150, exp: 440, speed: 80,  meso: 72, dropRate: 0.26, behavior: 'chase',   spriteKey: 'monster_big_3',    area: 'kerning', jumpProfile: { minInterval: 2400, maxInterval: 3800, velocity: 390, chance: 0.44 } },
  { id: 'city_boss1',  name: '小王：扒手頭目', level: 27, hp: 3000, atk: 170, exp: 600, speed: 105, meso: 150, dropRate: 0.50, behavior: 'chase', spriteKey: 'miniboss_street',  area: 'taipei',  spawnRole: 'miniboss' },
  { id: 'city_boss2',  name: '小王：機械領袖', level: 29, hp: 4000, atk: 185, exp: 800, speed: 85,  meso: 200, dropRate: 0.50, behavior: 'chase', spriteKey: 'miniboss_1',  area: 'kerning', spawnRole: 'miniboss' },
  { id: 'city_elite',  name: '夜市扒手', level: 24, hp: 1300,atk: 140, exp: 380, speed: 85,  meso: 66, dropRate: 0.25, behavior: 'patrol',  spriteKey: 'monster_pickpocket',    area: 'taipei', jumpProfile: { minInterval: 3600, maxInterval: 5400, velocity: 310, chance: 0.3 } },

  // ── 碧濤港 (harbor) Lv12-18 ──────────────────────────────────────────────
  // 數值接在古代廢墟（同 Lv 的 ruin_beast / skeleton / snake）後面：Lv12 約 hp 480-500 / atk 60，Lv17 約 hp 680 / atk 86。
  // 引擎沒有飛行 / 漂浮行為：水母用 patrol + 頻繁小跳（像浮沉），海鷗用 chase + 高跳（像俯衝拍翅）。
  { id: 'crab',         name: '螃蟹',     level: 12, hp: 500, atk: 62,  exp: 125, speed: 60,  meso: 30, dropRate: 0.16, behavior: 'patrol', spriteKey: 'monster_crab',         area: 'harbor' },
  { id: 'jellyfish',    name: '水母',     level: 13, hp: 470, atk: 66,  exp: 135, speed: 45,  meso: 32, dropRate: 0.16, behavior: 'patrol', spriteKey: 'monster_jellyfish',    area: 'harbor', jumpProfile: { minInterval: 700, maxInterval: 1300, velocity: 230, chance: 0.9 } },
  { id: 'seagull',      name: '海鷗',     level: 14, hp: 540, atk: 72,  exp: 150, speed: 95,  meso: 34, dropRate: 0.17, behavior: 'chase',  spriteKey: 'monster_seagull',      area: 'harbor', jumpProfile: { minInterval: 1500, maxInterval: 2600, velocity: 390, chance: 0.6 } },
  { id: 'pirate_ghost', name: '海盜幽靈', level: 16, hp: 640, atk: 80,  exp: 175, speed: 80,  meso: 38, dropRate: 0.18, behavior: 'chase',  spriteKey: 'monster_pirate_ghost', area: 'harbor' },
  { id: 'octopus',      name: '章魚',     level: 17, hp: 700, atk: 86,  exp: 195, speed: 55,  meso: 40, dropRate: 0.19, behavior: 'ranged', spriteKey: 'monster_octopus',      area: 'harbor' },
  { id: 'pirate_captain', name: '小王：海盜船長', level: 18, hp: 3200, atk: 105, exp: 700, speed: 80, meso: 160, dropRate: 0.50, behavior: 'chase', spriteKey: 'miniboss_captain', area: 'harbor', spawnRole: 'miniboss' },

  // ── Boss 援軍 (boss) ─────────────────────────────────────────────────────
  // 一轉「影之試煉」守衛（小王；圖暫用街頭小王染紫，專屬美術待補）
  { id: 'shadow_guardian', name: '試煉守衛', level: 12, hp: 1400, atk: 60, exp: 0, speed: 85, meso: 0, dropRate: 0.0, behavior: 'chase', spriteKey: 'miniboss_trialguard', area: 'dungeon', spawnRole: 'miniboss' },
  { id: 'shadow-slime', name: '影子史萊姆', level: 28, hp: 400,  atk: 80,  exp: 0,   speed: 80,  meso: 0,  dropRate: 0.0,  behavior: 'chase',   spriteKey: 'monster_slime',    area: 'boss', tint: 0x9B30FF },
];

for (const monster of MONSTERS) {
  Object.assign(monster, MONSTER_CLASSIFICATION[monster.id] || {});
}

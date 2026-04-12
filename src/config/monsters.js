// 怪物定義 v5.1 — 補上主題分類與多地圖棲地資訊

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
  dragon: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia'] },
  cyclops: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia'] },
  golem: { family: MONSTER_FAMILIES.ROCK, habitats: ['ruins'] },
  mimic: { family: MONSTER_FAMILIES.FANTASY, habitats: ['ellinia'] },
  city_thug: { family: MONSTER_FAMILIES.CITY, habitats: ['kerning', 'taipei'] },
  city_mech: { family: MONSTER_FAMILIES.MACHINE, habitats: ['kerning', 'taipei'] },
  city_beast: { family: MONSTER_FAMILIES.CITY, habitats: ['kerning', 'taipei'] },
  city_boss1: { family: MONSTER_FAMILIES.ELITE, habitats: ['kerning'] },
  city_boss2: { family: MONSTER_FAMILIES.ELITE, habitats: ['kerning'] },
  city_elite: { family: MONSTER_FAMILIES.ELITE, habitats: ['kerning', 'taipei'] },
  'shadow-slime': { family: MONSTER_FAMILIES.BOSS_SUPPORT, habitats: ['boss'] },
};

export const MONSTERS = [
  // ── 浮空島嶼 (sky) Lv1-8 ─────────────────────────────────────────────────
  { id: 'slime',    name: '綠史萊姆',   level: 1,  hp: 50,   atk: 10,  exp: 8,   speed: 45,  meso: 5,  dropRate: 0.05, behavior: 'patrol',  spriteKey: 'monster_slime',    area: 'sky'     },
  { id: 'mushroom', name: '紅蘑菇',     level: 2,  hp: 80,   atk: 15,  exp: 15,  speed: 55,  meso: 8,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster_mushroom', area: 'sky'     },
  { id: 'snail',    name: '翅膀蝸牛',   level: 4,  hp: 120,  atk: 20,  exp: 25,  speed: 50,  meso: 10, dropRate: 0.10, behavior: 'patrol',  spriteKey: 'monster_snail',    area: 'sky'     },
  { id: 'stump',    name: '惡樹樁',     level: 6,  hp: 200,  atk: 28,  exp: 40,  speed: 45,  meso: 14, dropRate: 0.12, behavior: 'chase',   spriteKey: 'monster_stump',    area: 'sky'     },
  // 新增天空系怪物
  { id: 'sky_imp',  name: '雲端精靈',   level: 2,  hp: 70,   atk: 12,  exp: 12,  speed: 60,  meso: 6,  dropRate: 0.06, behavior: 'patrol',  spriteKey: 'monster_new_0',    area: 'sky'     },
  { id: 'sky_bird', name: '浮雲鳥',     level: 3,  hp: 90,   atk: 18,  exp: 20,  speed: 70,  meso: 9,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster_new_1',    area: 'sky'     },
  { id: 'sky_puff', name: '棉花怪',     level: 5,  hp: 150,  atk: 22,  exp: 30,  speed: 40,  meso: 12, dropRate: 0.10, behavior: 'chase',   spriteKey: 'monster_new_2',    area: 'sky'     },

  // ── 古代廢墟 (ruins) Lv9-18 ──────────────────────────────────────────────
  { id: 'boar',     name: '飛天惡豬',   level: 9,  hp: 380,  atk: 48,  exp: 90,  speed: 90,  meso: 22, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster_boar',     area: 'ruins'   },
  { id: 'robot',    name: '機械直升機', level: 11, hp: 450,  atk: 58,  exp: 115, speed: 75,  meso: 28, dropRate: 0.16, behavior: 'ranged',  spriteKey: 'monster_robot',    area: 'ruins'   },
  { id: 'skeleton', name: '骷髏戰士',   level: 14, hp: 560,  atk: 70,  exp: 150, speed: 70,  meso: 34, dropRate: 0.18, behavior: 'chase',   spriteKey: 'monster_skeleton', area: 'ruins'   },
  { id: 'snake',    name: '毒眼鏡蛇',   level: 17, hp: 680,  atk: 86,  exp: 195, speed: 100, meso: 40, dropRate: 0.20, behavior: 'chase',   spriteKey: 'monster_snake',    area: 'ruins'   },
  // 新增廢墟系怪物
  { id: 'ruin_knight', name: '廢墟騎士', level: 10, hp: 420, atk: 52,  exp: 100, speed: 65,  meso: 24, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster_new_3',    area: 'ruins'   },
  { id: 'ruin_golem',  name: '石柱魔像', level: 13, hp: 520, atk: 65,  exp: 135, speed: 50,  meso: 32, dropRate: 0.17, behavior: 'patrol',  spriteKey: 'monster_new_4',    area: 'ruins'   },
  { id: 'ruin_wraith', name: '古代惡靈', level: 16, hp: 620, atk: 80,  exp: 175, speed: 85,  meso: 38, dropRate: 0.19, behavior: 'chase',   spriteKey: 'monster_new_5',    area: 'ruins'   },
  { id: 'ruin_beast',  name: '廢墟猛獸', level: 12, hp: 480, atk: 60,  exp: 120, speed: 95,  meso: 30, dropRate: 0.16, behavior: 'chase',   spriteKey: 'monster_big_0',    area: 'ruins'   },
  { id: 'ruin_giant',  name: '廢墟巨人', level: 15, hp: 700, atk: 78,  exp: 160, speed: 55,  meso: 36, dropRate: 0.18, behavior: 'patrol',  spriteKey: 'monster_big_1',    area: 'ruins'   },

  // ── Kerning City (kerning) Lv19-28 ────────────────────────────────────────
  { id: 'dragon',   name: '小藍龍',     level: 19, hp: 900,  atk: 105, exp: 260, speed: 85,  meso: 52, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster_dragon',   area: 'kerning' },
  { id: 'cyclops',  name: '獨眼怪',     level: 22, hp: 1100, atk: 125, exp: 330, speed: 70,  meso: 60, dropRate: 0.24, behavior: 'patrol',  spriteKey: 'monster_cyclops',  area: 'kerning' },
  { id: 'golem',    name: '石頭精',     level: 25, hp: 1400, atk: 145, exp: 420, speed: 45,  meso: 70, dropRate: 0.26, behavior: 'patrol',  spriteKey: 'monster_golem',    area: 'kerning' },
  { id: 'mimic',    name: '飛魚寶箱',   level: 28, hp: 1200, atk: 160, exp: 510, speed: 95,  meso: 82, dropRate: 0.28, behavior: 'ranged',  spriteKey: 'monster_mimic',    area: 'kerning' },
  // 新增 Kerning 系怪物
  { id: 'city_thug',   name: '城市流氓', level: 20, hp: 950, atk: 110, exp: 275, speed: 90,  meso: 54, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster_new_6',    area: 'kerning' },
  { id: 'city_mech',   name: '機械衛士', level: 23, hp: 1200,atk: 130, exp: 350, speed: 75,  meso: 62, dropRate: 0.24, behavior: 'ranged',  spriteKey: 'monster_big_2',    area: 'kerning' },
  { id: 'city_beast',  name: '暗夜猛獸', level: 26, hp: 1500,atk: 150, exp: 440, speed: 80,  meso: 72, dropRate: 0.26, behavior: 'chase',   spriteKey: 'monster_big_3',    area: 'kerning' },
  { id: 'city_boss1',  name: '小王：暗影使者', level: 27, hp: 3000, atk: 170, exp: 600, speed: 100, meso: 150, dropRate: 0.50, behavior: 'chase', spriteKey: 'miniboss_0',  area: 'kerning' },
  { id: 'city_boss2',  name: '小王：機械領袖', level: 29, hp: 4000, atk: 185, exp: 800, speed: 85,  meso: 200, dropRate: 0.50, behavior: 'chase', spriteKey: 'miniboss_1',  area: 'kerning' },
  { id: 'city_elite',  name: '精英衛兵', level: 24, hp: 1300,atk: 140, exp: 380, speed: 70,  meso: 66, dropRate: 0.25, behavior: 'patrol',  spriteKey: 'monster_big_4',    area: 'kerning' },

  // ── Boss 援軍 (boss) ─────────────────────────────────────────────────────
  { id: 'shadow-slime', name: '影子史萊姆', level: 28, hp: 400,  atk: 80,  exp: 0,   speed: 80,  meso: 0,  dropRate: 0.0,  behavior: 'chase',   spriteKey: 'monster_slime',    area: 'boss', tint: 0x9B30FF },
];

for (const monster of MONSTERS) {
  Object.assign(monster, MONSTER_CLASSIFICATION[monster.id] || {});
}

export function getMonstersForArea(area) {
  return MONSTERS.filter((monster) => {
    if (Array.isArray(monster.habitats) && monster.habitats.length > 0) {
      return monster.habitats.includes(area);
    }
    return monster.area === area;
  });
}

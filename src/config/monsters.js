// 怪物定義

export const MONSTERS = [
  // 楓之島 (Lv1-3)
  { id: 'snail',       name: '蝸牛',       level: 1,  hp: 50,   atk: 10,  exp: 8,   speed: 45,  meso: 5,  dropRate: 0.05, behavior: 'patrol',  spriteKey: 'monster-snail',    area: 'maple'   },
  { id: 'mushroom',    name: '蘑菇',       level: 2,  hp: 80,   atk: 15,  exp: 15,  speed: 60,  meso: 8,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster-mushroom', area: 'maple'   },
  { id: 'slime',       name: '史萊姆',     level: 3,  hp: 100,  atk: 18,  exp: 20,  speed: 70,  meso: 10, dropRate: 0.10, behavior: 'chase',   spriteKey: 'monster-slime',    area: 'maple'   },
  // 弓箭手獵場 (Lv5-10)
  { id: 'pig',         name: '野豬',       level: 5,  hp: 180,  atk: 28,  exp: 40,  speed: 80,  meso: 15, dropRate: 0.12, behavior: 'patrol',  spriteKey: 'monster-pig',      area: 'henesys' },
  { id: 'stump',       name: '樹樁怪',     level: 7,  hp: 250,  atk: 35,  exp: 60,  speed: 55,  meso: 20, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster-stump',    area: 'henesys' },
  { id: 'mushr-war',   name: '蘑菇戰士',   level: 9,  hp: 320,  atk: 42,  exp: 80,  speed: 70,  meso: 25, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster-mushroom', area: 'henesys' },
  // 法師森林 (Lv10-16)
  { id: 'green-spirit',name: '綠精靈',     level: 11, hp: 380,  atk: 50,  exp: 100, speed: 90,  meso: 28, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster-slime',    area: 'ellinia' },
  { id: 'spiral-mush', name: '螺旋蘑菇',   level: 13, hp: 450,  atk: 60,  exp: 130, speed: 65,  meso: 32, dropRate: 0.18, behavior: 'patrol',  spriteKey: 'monster-mushroom', area: 'ellinia' },
  { id: 'fairy',       name: '仙子',       level: 15, hp: 520,  atk: 70,  exp: 160, speed: 100, meso: 38, dropRate: 0.18, behavior: 'ranged',  spriteKey: 'monster-slime',    area: 'ellinia' },
  // 劍士荒原 (Lv16-22)
  { id: 'boar',        name: '野豬獸',     level: 17, hp: 650,  atk: 80,  exp: 200, speed: 100, meso: 42, dropRate: 0.20, behavior: 'chase',   spriteKey: 'monster-boar',     area: 'perion'  },
  { id: 'stone-golem', name: '石頭精',     level: 19, hp: 900,  atk: 95,  exp: 250, speed: 45,  meso: 50, dropRate: 0.22, behavior: 'patrol',  spriteKey: 'monster-golem',    area: 'perion'  },
  { id: 'armored-egg', name: '裝甲蛋',     level: 21, hp: 750,  atk: 88,  exp: 230, speed: 75,  meso: 46, dropRate: 0.20, behavior: 'chase',   spriteKey: 'monster-slime',    area: 'perion'  },
  // 盜賊地下城 (Lv22-28)
  { id: 'zombie-mush', name: '殭屍蘑菇',   level: 23, hp: 900,  atk: 110, exp: 300, speed: 70,  meso: 55, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster-zombie',   area: 'kerning' },
  { id: 'croc',        name: '鱷魚',       level: 25, hp: 1100, atk: 125, exp: 360, speed: 85,  meso: 62, dropRate: 0.24, behavior: 'chase',   spriteKey: 'monster-boar',     area: 'kerning' },
  { id: 'goblin',      name: '哥布林弓手', level: 27, hp: 1000, atk: 130, exp: 400, speed: 90,  meso: 68, dropRate: 0.25, behavior: 'ranged',  spriteKey: 'monster-goblin',   area: 'kerning' },
  // Boss區域 (援軍)
  { id: 'shadow-slime',name: '暗影史萊姆', level: 28, hp: 1500, atk: 140, exp: 200, speed: 95,  meso: 80, dropRate: 0.30, behavior: 'chase',   spriteKey: 'monster-slime',    area: 'boss'    },
];

export function getMonstersForArea(area) {
  return MONSTERS.filter(m => m.area === area);
}

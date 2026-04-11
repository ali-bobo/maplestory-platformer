// 怪物定義 v4.0 — 配合 3 個新地圖 + 真實圖片 spriteKey

export const MONSTERS = [
  // ── 浮空島嶼 (sky) Lv1-8 ─────────────────────────────────────────────────
  { id: 'slime',    name: '綠史萊姆',   level: 1,  hp: 50,   atk: 10,  exp: 8,   speed: 45,  meso: 5,  dropRate: 0.05, behavior: 'patrol',  spriteKey: 'monster_slime',    area: 'sky'     },
  { id: 'mushroom', name: '紅蘑菇',     level: 2,  hp: 80,   atk: 15,  exp: 15,  speed: 55,  meso: 8,  dropRate: 0.08, behavior: 'patrol',  spriteKey: 'monster_mushroom', area: 'sky'     },
  { id: 'snail',    name: '翅膀蝸牛',   level: 4,  hp: 120,  atk: 20,  exp: 25,  speed: 50,  meso: 10, dropRate: 0.10, behavior: 'patrol',  spriteKey: 'monster_snail',    area: 'sky'     },
  { id: 'stump',    name: '惡樹樁',     level: 6,  hp: 200,  atk: 28,  exp: 40,  speed: 45,  meso: 14, dropRate: 0.12, behavior: 'chase',   spriteKey: 'monster_stump',    area: 'sky'     },

  // ── 古代廢墟 (ruins) Lv9-18 ──────────────────────────────────────────────
  { id: 'boar',     name: '飛天惡豬',   level: 9,  hp: 380,  atk: 48,  exp: 90,  speed: 90,  meso: 22, dropRate: 0.15, behavior: 'chase',   spriteKey: 'monster_boar',     area: 'ruins'   },
  { id: 'robot',    name: '機械直升機', level: 11, hp: 450,  atk: 58,  exp: 115, speed: 75,  meso: 28, dropRate: 0.16, behavior: 'ranged',  spriteKey: 'monster_robot',    area: 'ruins'   },
  { id: 'skeleton', name: '骷髏戰士',   level: 14, hp: 560,  atk: 70,  exp: 150, speed: 70,  meso: 34, dropRate: 0.18, behavior: 'chase',   spriteKey: 'monster_skeleton', area: 'ruins'   },
  { id: 'snake',    name: '毒眼鏡蛇',   level: 17, hp: 680,  atk: 86,  exp: 195, speed: 100, meso: 40, dropRate: 0.20, behavior: 'chase',   spriteKey: 'monster_snake',    area: 'ruins'   },

  // ── Kerning City (kerning) Lv19-28 ────────────────────────────────────────
  { id: 'dragon',   name: '小藍龍',     level: 19, hp: 900,  atk: 105, exp: 260, speed: 85,  meso: 52, dropRate: 0.22, behavior: 'chase',   spriteKey: 'monster_dragon',   area: 'kerning' },
  { id: 'cyclops',  name: '獨眼怪',     level: 22, hp: 1100, atk: 125, exp: 330, speed: 70,  meso: 60, dropRate: 0.24, behavior: 'patrol',  spriteKey: 'monster_cyclops',  area: 'kerning' },
  { id: 'golem',    name: '石頭精',     level: 25, hp: 1400, atk: 145, exp: 420, speed: 45,  meso: 70, dropRate: 0.26, behavior: 'patrol',  spriteKey: 'monster_golem',    area: 'kerning' },
  { id: 'mimic',    name: '飛魚寶箱',   level: 28, hp: 1200, atk: 160, exp: 510, speed: 95,  meso: 82, dropRate: 0.28, behavior: 'ranged',  spriteKey: 'monster_mimic',    area: 'kerning' },
];

export function getMonstersForArea(area) {
  return MONSTERS.filter(m => m.area === area);
}

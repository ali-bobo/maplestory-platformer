// 怪物特殊攻擊分配表（數值屬性仍在 monsters.js；這裡只決定「會什麼招」）。
//
// 解析順序：MONSTER_ATTACKS[id] → FAMILY_ATTACKS[family] → 依 behavior 的預設。
// 每隻怪永遠還有「貼身普攻」（melee），不用寫進清單。清單元素可以是字串（用預設參數）
// 或 { type, ...覆寫 }。守衛（小王）可帶 phases：血量比例降到 at 以下進入下一階段。
//
// 攻擊類型（引擎見 entities/monsterAI.js）：
//   charge 衝撞 / slam 跳躍震地（產生地面衝擊波）/ pound 原地範圍重擊 / shoot 遠程彈幕
//   kite 後跳再射 / burrow 潛地突襲 / dive 俯衝 / summon 召喚小怪 / leap 撲擊（追不到時用）
//   rain 天降落彈 / burst 環狀彈幕

import { MONSTER_FAMILIES as F } from './monsters.js';

// 預設參數（時間 ms、距離 px、dmg 為 atk 的倍率）
export const ATTACK_TYPES = {
  charge: { windup: 520, exec: 650, recover: 700, cd: 5200, min: 50, max: 380, dmg: 1.1, speedMult: 3.2, grounded: true, maxDy: 60 },
  slam:   { windup: 650, recover: 550, cd: 6500, min: 0, max: 320, dmg: 1.2, waveDmg: 0.7, radius: 80, waveLen: 280, waveSpeed: 330, grounded: true, maxDy: 80, heavy: true },
  pound:  { windup: 760, recover: 500, cd: 6200, min: 0, max: 190, dmg: 1.3, radius: 120, hMax: 55, grounded: true, maxDy: 70, heavy: true },
  shoot:  { windup: 380, recover: 300, cd: 2800, min: 90, max: 560, dmg: 0.8, count: 1, spread: 0, speed: 300, grav: 0, life: 2400, kind: 'orb', vert: true },
  kite:   { windup: 240, recover: 300, cd: 7500, min: 0, max: 170, dmg: 0.8, count: 2, spread: 10, speed: 320, hopVx: 300, hopVy: 320, grav: 0, life: 2200, kind: 'orb', grounded: true, maxDy: 120 },
  burrow: { windup: 450, exec: 900, pop: 650, recover: 600, cd: 8500, min: 0, max: 440, dmg: 1.3, radius: 62, chain: 0, grounded: true, maxDy: 70, heavy: true },
  dive:   { windup: 500, exec: 700, recover: 650, cd: 5200, min: 60, max: 480, dmg: 1.1, speed: 430, vert: true },
  summon: { windup: 800, recover: 500, cd: 16000, min: 0, max: 620, count: 2, minion: 'shadow-slime', cap: 3, grounded: true, vert: true },
  leap:   { windup: 450, recover: 550, cd: 4500, min: 40, max: 450, dmg: 1.0, radius: 70, grounded: true, vert: true },
  rain:   { windup: 850, recover: 500, cd: 9000, min: 0, max: 700, dmg: 0.9, count: 5, spread: 460, speed: 560, kind: 'fire', vert: true, heavy: true },
  burst:  { windup: 800, recover: 600, cd: 8000, min: 0, max: 700, dmg: 0.5, count: 10, speed: 260, life: 2600, kind: 'orb', vert: true },
};

const FIRE = 0xff7a2a, ICE = 0xaee8ff, POISON = 0x77dd55, SHADOW = 0xb04aff, SAND = 0xe0c070, BLOOD = 0xcc2244;

// ── 家族預設 ────────────────────────────────────────────────────────────────
export const FAMILY_ATTACKS = {
  [F.SPIRIT]: [{ type: 'shoot', kind: 'orb', tint: 0xbfe8ff, dmg: 0.6, cd: 3600 }],
  [F.WOODLAND]: ['charge'],
  [F.PLANT]: [],
  [F.WARRIOR]: ['charge'],
  [F.HEAVY]: ['slam'],
  [F.ROCK]: ['slam'],
  [F.FANTASY]: ['charge'],
  [F.FLYING]: ['dive'],
  [F.MACHINE]: [{ type: 'shoot', kind: 'bolt', tint: 0x66ccff }],
  [F.CITY]: ['charge'],
  [F.SEA]: [{ type: 'shoot', kind: 'spit', tint: 0x66aaff, grav: 380 }],
  [F.DESERT]: ['burrow'],
  [F.ICE]: [{ type: 'shoot', kind: 'ice', tint: ICE }],
  [F.FIRE]: [{ type: 'shoot', kind: 'fire', tint: FIRE }],
  [F.DARK]: [{ type: 'shoot', kind: 'orb', tint: SHADOW }],
  [F.ELITE]: ['charge', 'pound'],
  [F.BOSS_SUPPORT]: [],
};

// ── 個別怪物 ────────────────────────────────────────────────────────────────
export const MONSTER_ATTACKS = {
  // 浮空島嶼：入門區，只給最單純的招式
  slime: [], mushroom: [], snail: [],
  stump: [{ type: 'pound', radius: 90, dmg: 1.1, cd: 7000 }],
  sky_imp: [{ type: 'shoot', kind: 'orb', tint: 0xbfe8ff, dmg: 0.6, cd: 4200 }],
  sky_bird: ['dive'],
  sky_puff: [],

  // 古代廢墟
  boar: ['charge'],
  robot: [{ type: 'shoot', kind: 'bolt', tint: 0x66ccff, count: 2, spread: 8 }, 'kite'],
  skeleton: [{ type: 'shoot', kind: 'bone', tint: 0xe8e0c8, grav: 520, speed: 360, dmg: 0.8, cd: 3600, max: 460 }],
  snake: [{ type: 'charge', speedMult: 2.6, max: 260, cd: 4200 }, { type: 'shoot', kind: 'spit', tint: POISON, grav: 380, cd: 4200 }],
  ruin_knight: ['charge'],
  ruin_golem: ['slam'],
  ruin_wraith: ['dive', { type: 'shoot', kind: 'orb', tint: 0x9fd8ff, dmg: 0.6, cd: 4200 }],
  ruin_beast: ['charge'],
  ruin_giant: ['slam', 'pound'],

  // 暗巷城 / 台北
  dragon: [{ type: 'shoot', kind: 'fire', tint: FIRE, grav: 120, cd: 3400 }],
  cyclops: ['pound'],
  golem: ['slam', 'pound'],
  mimic: [{ type: 'shoot', kind: 'bone', tint: 0xffd88a, grav: 420, speed: 340 }, 'kite'],
  city_thug: ['charge'],
  city_mech: [{ type: 'shoot', kind: 'bolt', tint: 0x66ccff, cd: 3600 }, 'charge'],
  street_punk: ['charge'],
  city_beast: ['charge'],
  city_elite: ['charge', 'kite'],
  city_boss1: {
    attacks: [{ type: 'charge', speedMult: 3.6, dmg: 1.2 }, { type: 'shoot', kind: 'arrow', tint: 0xd8c080, count: 3, spread: 12, cd: 4200 }],
    phases: [{ at: 0.5, label: '怒火', speedMult: 1.2, cdMult: 0.75, dmgMult: 1.15, tint: 0xff9966 }],
  },
  city_boss2: {
    attacks: ['slam', { type: 'shoot', kind: 'bolt', tint: 0x66ccff, count: 5, spread: 40, cd: 4800 }],
    phases: [{ at: 0.5, label: '過載', open: 'summon', speedMult: 1.2, cdMult: 0.75, dmgMult: 1.15, tint: 0xff9966,
      add: [{ type: 'summon', minion: 'city_mech', count: 2, cap: 2, cd: 15000 }] }],
  },

  // 影之試煉守衛（一轉試煉）
  shadow_guardian: {
    attacks: [
      { type: 'charge', windup: 560, dmg: 1.0, cd: 5000 },
      { type: 'shoot', kind: 'orb', tint: 0x9b30ff, count: 3, spread: 14, speed: 280, dmg: 0.7, windup: 500, cd: 5200 },
      { type: 'pound', radius: 110, dmg: 1.1, windup: 700, cd: 6500 },
    ],
    phases: [{ at: 0.5, label: '暗影暴走', open: 'summon', speedMult: 1.25, cdMult: 0.75, dmgMult: 1.15, tint: 0xc070ff,
      add: [{ type: 'summon', minion: 'shadow-slime', count: 2, cap: 2, cd: 14000 }] }],
  },

  // 碧濤港
  crab: [{ type: 'burrow', radius: 55, cd: 9500, dmg: 1.2 }],
  jellyfish: [{ type: 'shoot', kind: 'orb', tint: 0xff88dd, dmg: 0.6, speed: 220, cd: 4200 }],
  pirate_ghost: ['dive'],
  octopus: [{ type: 'shoot', kind: 'spit', tint: 0x334466, grav: 300, speed: 280, scale: 1.4, cd: 3200 }, 'kite'],
  seagull: ['dive'],
  pirate_captain: {
    attacks: [
      { type: 'charge', windup: 560, dmg: 1.2, speedMult: 3.4 },
      { type: 'slam', dmg: 1.2, waveDmg: 0.75 },
      { type: 'shoot', kind: 'cannon', tint: 0x2a2f45, count: 3, spread: 12, grav: 420, speed: 440, dmg: 0.8, windup: 520, cd: 5800, min: 160 },
    ],
    phases: [{ at: 0.5, label: '船長狂怒', open: 'summon', speedMult: 1.25, cdMult: 0.72, dmgMult: 1.15, tint: 0xff9966,
      add: [
        { type: 'summon', minion: 'pirate_ghost', count: 2, cap: 3, cd: 15000 },
        { type: 'rain', kind: 'cannon', tint: 0x2a2f45, count: 4, spread: 380, cd: 11000 },
      ] }],
  },

  // 黃沙遺跡
  scorpion: [{ type: 'burrow', radius: 55, cd: 9000 }],
  cactus: [{ type: 'shoot', kind: 'arrow', tint: POISON, count: 3, spread: 22, speed: 330, cd: 3400, min: 60 }],
  mummy: ['pound'],
  bandit: ['charge', { type: 'shoot', kind: 'arrow', tint: 0xcfcfcf, speed: 380, cd: 3800 }],
  sandworm: ['burrow', { type: 'shoot', kind: 'spit', tint: SAND, grav: 380, cd: 4200 }],
  sandworm_boss: {
    attacks: [
      { type: 'burrow', radius: 72, dmg: 1.3, cd: 8000 },
      { type: 'shoot', kind: 'spit', tint: SAND, count: 3, spread: 16, grav: 380, speed: 360, dmg: 0.8, windup: 500, cd: 5200, min: 140 },
      { type: 'pound', radius: 145, dmg: 1.3, windup: 780 },
    ],
    phases: [{ at: 0.5, label: '沙暴', open: 'summon', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xffc080,
      mod: { burrow: { chain: 1, cd: 7000 } },
      add: [{ type: 'summon', minion: 'sandworm', count: 2, cap: 2, cd: 16000 }] }],
  },

  // 霜牙峰
  snowman: [{ type: 'shoot', kind: 'spit', tint: 0xeaf6ff, grav: 420, speed: 340, cd: 3400 }],
  penguin: [{ type: 'charge', speedMult: 3.0, max: 320, dmg: 1.0 }],
  icewolf: ['charge'],
  crystal: [{ type: 'shoot', kind: 'ice', tint: ICE, count: 3, spread: 24, cd: 4600, min: 60 }],
  yeti: ['slam', { type: 'shoot', kind: 'spit', tint: 0xeaf6ff, grav: 420, speed: 340, cd: 4200 }],
  frost_giant: {
    attacks: [
      { type: 'slam', dmg: 1.2, waveDmg: 0.8 },
      { type: 'shoot', kind: 'ice', tint: ICE, count: 5, spread: 40, speed: 330, dmg: 0.7, windup: 560, cd: 5200, min: 120 },
      { type: 'pound', radius: 165, dmg: 1.3, windup: 800 },
    ],
    phases: [{ at: 0.5, label: '暴風雪', open: 'summon', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xbfe0ff,
      add: [
        { type: 'rain', kind: 'ice', tint: ICE, count: 6, spread: 520, cd: 10000 },
        { type: 'summon', minion: 'snowman', count: 2, cap: 2, cd: 16000 },
      ] }],
  },

  // 熔岩巢穴
  fireimp: [{ type: 'shoot', kind: 'fire', tint: FIRE, cd: 3000 }, 'kite'],
  lavaslime: [{ type: 'pound', radius: 100, dmg: 1.2, cd: 7000 }],
  firehound: ['charge'],
  ember: [{ type: 'shoot', kind: 'fire', tint: 0xffcc66, dmg: 0.6, speed: 240, cd: 3600 }],
  lavagolem: ['slam', 'pound'],
  lava_dragon: {
    attacks: [
      { type: 'shoot', kind: 'fire', tint: FIRE, count: 5, spread: 40, speed: 380, dmg: 0.75, windup: 600, cd: 5000, min: 130 },
      { type: 'dive', dmg: 1.2, speed: 460, windup: 560 },
      { type: 'slam', dmg: 1.2, waveDmg: 0.8 },
    ],
    phases: [{ at: 0.5, label: '龍炎狂暴', speedMult: 1.25, cdMult: 0.7, dmgMult: 1.15, tint: 0xff8866,
      add: [
        { type: 'rain', kind: 'fire', tint: FIRE, count: 6, spread: 540, cd: 10000 },
        { type: 'burst', kind: 'fire', tint: FIRE, count: 10, cd: 9000 },
      ] }],
  },

  // 魔君王城
  imp: [{ type: 'shoot', kind: 'orb', tint: SHADOW, cd: 3000 }, 'kite'],
  bat: ['dive'],
  darkknight: ['charge', 'pound'],
  vampire: ['dive', { type: 'shoot', kind: 'orb', tint: BLOOD, dmg: 0.7, cd: 3800 }],
  gargoyle: ['slam', 'dive'],
  fallen_commander: {
    attacks: [
      { type: 'charge', dmg: 1.2, speedMult: 3.4 },
      { type: 'shoot', kind: 'bolt', tint: 0xb04aff, count: 3, spread: 9, speed: 430, dmg: 0.75, windup: 480, cd: 4800, min: 140 },
      { type: 'summon', minion: 'darkknight', count: 2, cap: 2, cd: 17000 },
      { type: 'pound', radius: 150, dmg: 1.3 },
    ],
    phases: [{ at: 0.5, label: '騎士團覺醒', speedMult: 1.25, cdMult: 0.7, dmgMult: 1.15, tint: 0xff8888,
      add: [
        { type: 'rain', kind: 'bolt', tint: SHADOW, count: 6, spread: 540, cd: 10000 },
        { type: 'burst', kind: 'bolt', tint: SHADOW, count: 12, cd: 9000 },
      ] }],
  },

  // 援軍史萊姆：只有普攻（數量多，保持便宜）
  'shadow-slime': [],

  // 最終 Boss（Boss.js 使用 id 'boss'）：階段 1 / 2 / 3 對應血量 100 / 60 / 30 %
  boss: {
    attacks: [
      { type: 'pound', radius: 150, dmg: 1.2, windup: 700, cd: 4200 },
      { type: 'shoot', kind: 'orb', tint: SHADOW, count: 3, spread: 14, speed: 340, dmg: 0.55, windup: 520, cd: 5200, min: 160, max: 720 },
      { type: 'charge', windup: 620, dmg: 1.0, speedMult: 3.0, cd: 7000, min: 200, max: 640 },
    ],
    phases: [
      { at: 0.6, label: '第二階段', speedMult: 1.1, cdMult: 0.85, dmgMult: 1.0, open: 'summon', roar: 1300,
        add: [
          { type: 'summon', minion: 'shadow-slime', count: 2, cap: 4, cd: 12000, windup: 900 },
          { type: 'rain', kind: 'orb', tint: SHADOW, count: 5, spread: 480, cd: 10000, dmg: 0.8 },
          { type: 'slam', dmg: 1.2, waveDmg: 0.7, cd: 8000 },
        ] },
      { at: 0.3, label: '狂暴', speedMult: 1.4, cdMult: 0.65, dmgMult: 1.25, tint: 0xff0000, open: 'burst', roar: 1400,
        add: [
          { type: 'burst', kind: 'orb', tint: 0xff3366, count: 12, speed: 250, cd: 8000, windup: 900 },
        ] },
    ],
  },
};

// ── 解析 ────────────────────────────────────────────────────────────────────
const DEFAULT_BY_BEHAVIOR = { ranged: ['shoot'], patrol: [], chase: [] };
const cache = new Map();

function normalize(entry) {
  const o = typeof entry === 'string' ? { type: entry } : entry;
  const base = ATTACK_TYPES[o.type];
  if (!base) throw new Error(`未知攻擊類型: ${o.type}`);
  const a = Object.assign({}, base, o);
  a.weight = a.weight ?? 1;
  a.exec = a.exec ?? 0;
  a.windup = Math.max(a.windup, (a.heavy || (a.dmg ?? 0) >= 1.2) ? 400 : 150);   // 重擊前搖至少 400ms
  a.vert = !!a.vert;
  a.grounded = !!a.grounded;
  return a;
}

function normalizeList(list) {
  const out = [];
  for (const e of list) out.push(normalize(e));
  return out;
}

/**
 * 回傳 { attacks, phases, guardian }。phases[i].attacks 是進入該階段後的完整招式清單。
 * 結果依怪物 id 快取，同一種怪只解析一次。
 */
export function getAttackProfile(def) {
  const key = def?.attackId || def?.id || '?';
  let prof = cache.get(key);
  if (prof) return prof;
  let src = MONSTER_ATTACKS[key];
  if (src === undefined) src = FAMILY_ATTACKS[def?.family];
  if (src === undefined) src = DEFAULT_BY_BEHAVIOR[def?.behavior] || [];
  const list = Array.isArray(src) ? src : src.attacks;
  const phasesSrc = Array.isArray(src) ? [] : (src.phases || []);
  const attacks = normalizeList(list);
  const phases = [];
  let current = attacks;
  for (const ph of phasesSrc) {
    let next = current;
    if (ph.mod) {
      next = current.map((a) => (ph.mod[a.type] ? normalize(Object.assign({}, a, ph.mod[a.type])) : a));
    }
    if (ph.add) next = next.concat(normalizeList(ph.add));
    phases.push({
      at: ph.at, label: ph.label || '', speedMult: ph.speedMult ?? 1, cdMult: ph.cdMult ?? 1,
      dmgMult: ph.dmgMult ?? 1, tint: ph.tint ?? null, attacks: next, open: ph.open || null, roar: ph.roar ?? null,
    });
    current = next;
  }
  prof = { attacks, phases, guardian: phases.length > 0 };
  cache.set(key, prof);
  return prof;
}

/** 所有已設定過的怪物 id（測試用） */
export function listConfiguredIds() { return Object.keys(MONSTER_ATTACKS); }

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

import { MONSTER_FAMILIES as F, FINAL_BOSS } from './monsters.js';

// 預設參數（時間 ms、距離 px、dmg 為 atk 的倍率）
// v2 強化：範圍招（slam / pound / burrow / leap）半徑放大約 35%，前搖期間地面會出現與實際判定同大小的預警區
// （entities/monsterAI.js 的 zone）；新增 nova「地面爆發」——在玩家腳下預警、延遲後爆開，逼玩家移動。
// combo = 同一招連續再出 N 次（comboWindup 為後續的前搖、comboGap 為兩段之間的間隔），用在守衛 / Boss 的連段。
export const ATTACK_TYPES = {
  charge: { windup: 520, exec: 650, recover: 700, cd: 5000, min: 50, max: 380, dmg: 1.1, speedMult: 3.2, grounded: true, maxDy: 60 },
  slam:   { windup: 650, recover: 550, cd: 6000, min: 0, max: 320, dmg: 1.2, waveDmg: 0.7, radius: 110, waveLen: 340, waveSpeed: 360, grounded: true, maxDy: 80, heavy: true },
  pound:  { windup: 760, recover: 500, cd: 5800, min: 0, max: 210, dmg: 1.3, radius: 160, hMax: 60, grounded: true, maxDy: 70, heavy: true },
  shoot:  { windup: 380, recover: 300, cd: 2600, min: 90, max: 580, dmg: 0.8, count: 1, spread: 0, speed: 320, grav: 0, life: 2400, kind: 'orb', vert: true },
  kite:   { windup: 240, recover: 300, cd: 7000, min: 0, max: 170, dmg: 0.8, count: 2, spread: 10, speed: 340, hopVx: 300, hopVy: 320, grav: 0, life: 2200, kind: 'orb', grounded: true, maxDy: 120 },
  burrow: { windup: 450, exec: 900, pop: 650, recover: 600, cd: 8000, min: 0, max: 440, dmg: 1.3, radius: 80, chain: 0, grounded: true, maxDy: 70, heavy: true },
  dive:   { windup: 500, exec: 700, recover: 650, cd: 5000, min: 60, max: 480, dmg: 1.1, speed: 450, vert: true },
  summon: { windup: 800, recover: 500, cd: 16000, min: 0, max: 620, count: 2, minion: 'shadow-slime', cap: 3, grounded: true, vert: true },
  leap:   { windup: 450, recover: 550, cd: 4500, min: 40, max: 450, dmg: 1.0, radius: 80, grounded: true, vert: true },
  rain:   { windup: 850, recover: 500, cd: 9000, min: 0, max: 700, dmg: 0.9, count: 5, spread: 460, speed: 580, kind: 'fire', vert: true, heavy: true },
  burst:  { windup: 800, recover: 600, cd: 8000, min: 0, max: 700, dmg: 0.5, count: 10, speed: 270, life: 2600, kind: 'orb', vert: true },
  // 地面爆發：開始前搖時鎖定玩家腳下（count > 1 時以 spacing 向兩側排開），預警區填滿後爆開；跳高超過 hMax 也能躲
  nova:   { windup: 900, recover: 550, cd: 9000, min: 0, max: 720, dmg: 1.1, radius: 70, hMax: 80, count: 1, spacing: 170, kind: 'orb', vert: true, heavy: true },
};

// 一般怪的出招節奏：等級越高冷卻越短（Lv1–10 維持原樣，入門區不加壓）
export const REGULAR_CD_BANDS = [
  { maxLevel: 10, cdMult: 1 },
  { maxLevel: 24, cdMult: 0.92 },
  { maxLevel: Infinity, cdMult: 0.85 },
];
export function regularCdMult(level) {
  for (const b of REGULAR_CD_BANDS) if ((level ?? 1) <= b.maxLevel) return b.cdMult;
  return 1;
}

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
// 守衛（小王）頂層可帶 cdMult / gcdMult（整場的出招頻率），phases[].aura 為狂暴光環顏色。
// 守衛的第二階段（血量 <= 50%）＝狂暴：更快、更痛、光環，並解鎖招牌技（連段 / 地面爆發 / 彈幕）。
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
  // 廢墟巨人：踏地後地面裂出兩道石柱（主題招：古代石柱）
  ruin_giant: ['slam', 'pound', { type: 'nova', kind: 'bone', tint: 0xd8c8a0, count: 2, spacing: 150, radius: 60, dmg: 1.0, cd: 11000 }],

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
    cdMult: 0.85,
    attacks: [
      { type: 'charge', speedMult: 3.6, dmg: 1.2, combo: 1 },
      { type: 'shoot', kind: 'arrow', tint: 0xd8c080, count: 3, spread: 12, cd: 4000, combo: 1, comboGap: 260 },
    ],
    phases: [{ at: 0.5, label: '怒火', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xff9966, aura: 0xff7744,
      add: [{ type: 'shoot', kind: 'arrow', tint: 0xffd060, count: 5, spread: 14, cd: 5200, windup: 520 }] }],
  },
  city_boss2: {
    cdMult: 0.85,
    attacks: ['slam', { type: 'shoot', kind: 'bolt', tint: 0x66ccff, count: 5, spread: 40, cd: 4600 }],
    phases: [{ at: 0.5, label: '過載', open: 'summon', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xff9966, aura: 0x66ccff,
      add: [
        { type: 'summon', minion: 'city_mech', count: 2, cap: 2, cd: 15000 },
        { type: 'nova', kind: 'bolt', tint: 0x66ccff, count: 3, spacing: 160, radius: 60, dmg: 1.0, cd: 9500 },
      ] }],
  },

  // 影之試煉守衛（一轉試煉；Lv10 玩家打，招牌技只加一個單點的暗影爆發）
  shadow_guardian: {
    attacks: [
      { type: 'charge', windup: 560, dmg: 1.0, cd: 5000 },
      { type: 'shoot', kind: 'orb', tint: 0x9b30ff, count: 3, spread: 14, speed: 280, dmg: 0.7, windup: 500, cd: 5200 },
      { type: 'pound', radius: 130, dmg: 1.1, windup: 700, cd: 6500 },
    ],
    phases: [{ at: 0.5, label: '暗影暴走', open: 'summon', speedMult: 1.25, cdMult: 0.75, dmgMult: 1.15, tint: 0xc070ff, aura: 0xb04aff,
      add: [
        { type: 'summon', minion: 'shadow-slime', count: 2, cap: 2, cd: 14000 },
        { type: 'nova', kind: 'orb', tint: SHADOW, radius: 65, dmg: 0.9, windup: 950, cd: 10000 },
      ] }],
  },

  // 碧濤港
  crab: [{ type: 'burrow', radius: 70, cd: 9500, dmg: 1.2 }],
  jellyfish: [{ type: 'shoot', kind: 'orb', tint: 0xff88dd, dmg: 0.6, speed: 220, cd: 4200 }],
  pirate_ghost: ['dive'],
  octopus: [{ type: 'shoot', kind: 'spit', tint: 0x334466, grav: 300, speed: 280, scale: 1.4, cd: 3200 }, 'kite'],
  seagull: ['dive'],
  // 海盜船長：連環衝鋒、三發砲擊；狂暴後火藥桶（地面爆發 ×3）+ 砲火覆蓋
  pirate_captain: {
    cdMult: 0.85, gcdMult: 0.8,
    attacks: [
      { type: 'charge', windup: 560, dmg: 1.2, speedMult: 3.4, combo: 1 },
      { type: 'slam', dmg: 1.2, waveDmg: 0.75 },
      { type: 'shoot', kind: 'cannon', tint: 0x2a2f45, count: 3, spread: 12, grav: 420, speed: 440, dmg: 0.8, windup: 520, cd: 5400, min: 160 },
    ],
    phases: [{ at: 0.5, label: '船長狂怒', open: 'nova', speedMult: 1.25, cdMult: 0.72, dmgMult: 1.15, tint: 0xff9966, aura: 0xff8844,
      add: [
        { type: 'nova', kind: 'cannon', tint: FIRE, count: 3, spacing: 170, radius: 70, dmg: 1.1, cd: 9000 },
        { type: 'summon', minion: 'pirate_ghost', count: 2, cap: 3, cd: 15000 },
        { type: 'rain', kind: 'cannon', tint: 0x2a2f45, count: 5, spread: 420, cd: 10000 },
      ] }],
  },

  // 黃沙遺跡
  scorpion: [{ type: 'burrow', radius: 70, cd: 9000 }],
  cactus: [{ type: 'shoot', kind: 'arrow', tint: POISON, count: 3, spread: 22, speed: 330, cd: 3400, min: 60 }],
  // 木乃伊：詛咒沙柱（主題招）
  mummy: ['pound', { type: 'nova', kind: 'spit', tint: SAND, radius: 60, dmg: 1.0, cd: 10000 }],
  bandit: ['charge', { type: 'shoot', kind: 'arrow', tint: 0xcfcfcf, speed: 380, cd: 3800 }],
  sandworm: ['burrow', { type: 'shoot', kind: 'spit', tint: SAND, grav: 380, cd: 4200 }],
  // 沙塵巨蟲：潛地突襲、扇形沙彈；狂暴後連續三次潛地 + 流沙漩渦（地面爆發 ×3）
  sandworm_boss: {
    cdMult: 0.85, gcdMult: 0.8,
    attacks: [
      { type: 'burrow', radius: 90, dmg: 1.3, cd: 7500 },
      { type: 'shoot', kind: 'spit', tint: SAND, count: 5, spread: 14, grav: 380, speed: 360, dmg: 0.8, windup: 500, cd: 5000, min: 140 },
      { type: 'pound', radius: 190, dmg: 1.3, windup: 780 },
    ],
    phases: [{ at: 0.5, label: '沙暴', open: 'nova', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xffc080, aura: 0xffb050,
      mod: { burrow: { chain: 2, cd: 7000 } },
      add: [
        { type: 'nova', kind: 'spit', tint: SAND, count: 3, spacing: 180, radius: 75, dmg: 1.1, cd: 9000 },
        { type: 'summon', minion: 'sandworm', count: 2, cap: 2, cd: 16000 },
      ] }],
  },

  // 霜牙峰
  snowman: [{ type: 'shoot', kind: 'spit', tint: 0xeaf6ff, grav: 420, speed: 340, cd: 3400 }],
  penguin: [{ type: 'charge', speedMult: 3.0, max: 320, dmg: 1.0 }],
  icewolf: ['charge'],
  // 冰晶怪：冰錐從腳下刺出（主題招）
  crystal: [{ type: 'shoot', kind: 'ice', tint: ICE, count: 3, spread: 24, cd: 4600, min: 60 }, { type: 'nova', kind: 'ice', tint: ICE, radius: 55, dmg: 1.0, cd: 9500 }],
  yeti: ['slam', { type: 'shoot', kind: 'spit', tint: 0xeaf6ff, grav: 420, speed: 340, cd: 4200 }],
  // 冰霜巨人：雙重踏地、冰錐扇射；狂暴後冰柱陣（地面爆發 ×4）+ 暴風雪
  frost_giant: {
    cdMult: 0.85, gcdMult: 0.8,
    attacks: [
      { type: 'slam', dmg: 1.2, waveDmg: 0.8 },
      { type: 'shoot', kind: 'ice', tint: ICE, count: 5, spread: 40, speed: 330, dmg: 0.7, windup: 560, cd: 5000, min: 120 },
      { type: 'pound', radius: 210, dmg: 1.3, windup: 800, combo: 1, comboWindup: 480 },
    ],
    phases: [{ at: 0.5, label: '暴風雪', open: 'nova', speedMult: 1.2, cdMult: 0.72, dmgMult: 1.15, tint: 0xbfe0ff, aura: 0x9fdcff,
      add: [
        { type: 'nova', kind: 'ice', tint: ICE, count: 4, spacing: 150, radius: 65, dmg: 1.1, cd: 9500 },
        { type: 'rain', kind: 'ice', tint: ICE, count: 7, spread: 560, cd: 10000 },
        { type: 'summon', minion: 'snowman', count: 2, cap: 2, cd: 16000 },
      ] }],
  },

  // 熔岩巢穴
  fireimp: [{ type: 'shoot', kind: 'fire', tint: FIRE, cd: 3000 }, 'kite'],
  lavaslime: [{ type: 'pound', radius: 130, dmg: 1.2, cd: 7000 }],
  firehound: ['charge'],
  ember: [{ type: 'shoot', kind: 'fire', tint: 0xffcc66, dmg: 0.6, speed: 240, cd: 3600 }],
  // 熔岩魔像：地面噴出兩道熔岩柱（主題招）
  lavagolem: ['slam', 'pound', { type: 'nova', kind: 'fire', tint: FIRE, count: 2, spacing: 160, radius: 65, dmg: 1.1, cd: 10000 }],
  // 熔岩龍：火焰扇射、連續俯衝；狂暴後熔岩噴發（地面爆發 ×5）+ 火雨 + 環狀火球
  lava_dragon: {
    cdMult: 0.85, gcdMult: 0.8,
    attacks: [
      { type: 'shoot', kind: 'fire', tint: FIRE, count: 5, spread: 36, speed: 380, dmg: 0.75, windup: 600, cd: 4800, min: 130 },
      { type: 'dive', dmg: 1.2, speed: 470, windup: 560, combo: 1, comboWindup: 420 },
      { type: 'slam', dmg: 1.2, waveDmg: 0.8 },
    ],
    phases: [{ at: 0.5, label: '龍炎狂暴', open: 'nova', speedMult: 1.25, cdMult: 0.7, dmgMult: 1.15, tint: 0xff8866, aura: 0xff5522,
      add: [
        { type: 'nova', kind: 'fire', tint: FIRE, count: 5, spacing: 140, radius: 62, dmg: 1.1, cd: 9500 },
        { type: 'rain', kind: 'fire', tint: FIRE, count: 7, spread: 560, cd: 10000 },
        { type: 'burst', kind: 'fire', tint: FIRE, count: 12, cd: 9000 },
      ] }],
  },

  // 魔君王城
  imp: [{ type: 'shoot', kind: 'orb', tint: SHADOW, cd: 3000 }, 'kite'],
  bat: ['dive'],
  darkknight: ['charge', 'pound'],
  vampire: ['dive', { type: 'shoot', kind: 'orb', tint: BLOOD, dmg: 0.7, count: 3, spread: 12, cd: 4000 }],
  gargoyle: ['slam', 'dive'],
  // 墮落騎士團長：三段騎士突擊、兩輪暗影箭；狂暴後暗影審判（地面爆發 ×3 連發兩輪）+ 箭雨 + 環狀彈幕
  fallen_commander: {
    cdMult: 0.85, gcdMult: 0.8,
    attacks: [
      { type: 'charge', dmg: 1.05, speedMult: 3.4, combo: 2, comboWindup: 340 },
      { type: 'shoot', kind: 'bolt', tint: 0xb04aff, count: 3, spread: 9, speed: 430, dmg: 0.75, windup: 480, cd: 4600, min: 140, combo: 1, comboGap: 280 },
      { type: 'summon', minion: 'darkknight', count: 2, cap: 2, cd: 17000 },
      { type: 'pound', radius: 200, dmg: 1.3 },
    ],
    phases: [{ at: 0.5, label: '騎士團覺醒', open: 'nova', speedMult: 1.25, cdMult: 0.7, dmgMult: 1.15, tint: 0xff8888, aura: 0xcc44ff,
      add: [
        { type: 'nova', kind: 'bolt', tint: SHADOW, count: 3, spacing: 170, radius: 70, dmg: 1.1, cd: 9500, combo: 1, comboWindup: 650 },
        { type: 'rain', kind: 'bolt', tint: SHADOW, count: 7, spread: 560, cd: 10000 },
        { type: 'burst', kind: 'bolt', tint: SHADOW, count: 14, cd: 9000 },
      ] }],
  },

  // 援軍史萊姆：只有普攻（數量多，保持便宜）
  'shadow-slime': [],

  // 最終 Boss（Boss.js 使用 id 'boss'）：三階段 100–70 / 70–35 / 35–0 %
  //  第 1 階段：重擊 / 扇射 / 衝撞，重擊後有明顯的收招破綻（recover 長）
  //  第 2 階段：召喚、暗影落雨、震地、暗影審判（地面爆發 ×3）；扇射變成兩輪連發
  //  第 3 階段（狂暴）：開場先放大範圍審判陣（×5），之後環狀彈幕、雙段衝撞；環狀彈幕後有 1.3 秒的力竭破綻
  boss: {
    cdMult: 0.9, gcdMult: 0.85,
    attacks: [
      { type: 'pound', radius: 200, dmg: 0.9, windup: 720, recover: 1000, cd: 4200, heavy: true },
      { type: 'shoot', kind: 'orb', tint: SHADOW, count: 5, spread: 12, speed: 360, dmg: 0.55, windup: 520, cd: 4800, min: 160, max: 720 },
      { type: 'charge', windup: 620, dmg: 1.0, speedMult: 3.0, cd: 6500, min: 200, max: 640 },
    ],
    phases: [
      { at: FINAL_BOSS.phaseAt[0], label: '第二階段', speedMult: 1.1, cdMult: 0.85, dmgMult: 1.0, open: 'summon', roar: 1300, aura: 0xb04aff,
        mod: { shoot: { combo: 1, comboGap: 320 } },
        add: [
          { type: 'summon', minion: 'shadow-slime', count: 2, cap: 4, cd: 12000, windup: 900 },
          { type: 'rain', kind: 'orb', tint: SHADOW, count: 6, spread: 520, cd: 9500, dmg: 0.8 },
          { type: 'slam', dmg: 1.2, waveDmg: 0.7, radius: 130, recover: 900, cd: 7500 },
          { type: 'nova', kind: 'orb', tint: SHADOW, count: 3, spacing: 180, radius: 75, dmg: 1.0, cd: 9000 },
        ] },
      { at: FINAL_BOSS.phaseAt[1], label: '狂暴', speedMult: 1.4, cdMult: 0.65, dmgMult: 1.05, gcdMult: 0.8, tint: 0xff0000, open: 'nova', roar: 1500, aura: 0xff2244,
        mod: { charge: { combo: 1, comboWindup: 420 }, nova: { count: 5, spacing: 160, tint: 0xff3366 } },
        add: [
          { type: 'burst', kind: 'orb', tint: 0xff3366, count: 14, speed: 260, cd: 8000, windup: 900, recover: 1300 },
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
  // 連段：後續段的前搖較短，但重擊仍保留至少 400ms 的反應時間
  a.combo = a.combo ?? 0;
  const heavy = a.heavy || (a.dmg ?? 0) >= 1.2;
  a.comboWindup = Math.max(heavy ? 400 : 220, a.comboWindup ?? Math.round(a.windup * 0.55));
  a.comboGap = a.comboGap ?? 180;
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
      gcdMult: ph.gcdMult ?? 1, aura: ph.aura ?? null,
    });
    current = next;
  }
  const top = Array.isArray(src) ? null : src;
  prof = {
    attacks, phases, guardian: phases.length > 0,
    cdMult: top?.cdMult ?? null,      // null = 依等級帶（regularCdMult）
    gcdMult: top?.gcdMult ?? 1,
  };
  cache.set(key, prof);
  return prof;
}

/** 所有已設定過的怪物 id（測試用） */
export function listConfiguredIds() { return Object.keys(MONSTER_ATTACKS); }

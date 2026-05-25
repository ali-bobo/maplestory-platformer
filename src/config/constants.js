// 遊戲常數定義

export const CANVAS = { width: 1280, height: 720 };
export const WORLD_HEIGHT = 600;

// Phase 6：自適應品質等級。每檔定義 GPU 開銷旋鈕，由 FPS 監測器動態切換。
// particleScale：粒子 quantity 乘數；postFX：發光/震波；lightRays：放射光線；
// energyTrail：持續性能量拖尾。
export const QUALITY_PRESETS = {
  high:   { particleScale: 1.0,  postFX: true,  lightRays: true,  energyTrail: true,  afterimage: true  },
  medium: { particleScale: 0.5,  postFX: true,  lightRays: true,  energyTrail: false, afterimage: true  },
  low:    { particleScale: 0.25, postFX: false, lightRays: false, energyTrail: false, afterimage: false },
};
// 由低到高排序，供升/降級索引位移
export const QUALITY_ORDER = ['low', 'medium', 'high'];

// 藥水定義（ASD-R-G 快捷鍵；F 鍵保留給 NPC 對話 / 任務接收）
export const POTIONS = {
  A: { name: 'HP藥水',    color: 0xff4444, hpRestore: 100, mpRestore: 0   },
  S: { name: '強效HP藥水', color: 0xff8800, hpRestore: 250, mpRestore: 0   },
  D: { name: 'MP藥水',    color: 0x4466ff, hpRestore: 0,   mpRestore: 150 },
  R: { name: '強效MP藥水', color: 0x8844ff, hpRestore: 0,   mpRestore: 300 },
  G: { name: '萬靈藥',    color: 0x44cc44, hpRestore: 200, mpRestore: 200 },
};

export const PHYSICS_GRAVITY = 1000;

export const PLAYER_DEFAULTS = {
  maxHp: 400,
  maxMp: 250,
  atk: 70,
  speed: 220,
  jumpVelocity: -520,
  critRate: 0.2,
  critMulti: 1.8,
};

export const SKILLS = {
  Z: { name: '三連飛鏢', unlockLevel: 1,  cooldown: 0.5,  mpCost: 10,  maxLevel: 10 },
  X: { name: '暗影步伐', unlockLevel: 5,  cooldown: 3.0,  mpCost: 30,  maxLevel: 10 },
  C: { name: '暗殺',     unlockLevel: 10, cooldown: 5.0,  mpCost: 50,  maxLevel: 10 },
  V: { name: '暗影漩渦', unlockLevel: 15, cooldown: 8.0,  mpCost: 70,  maxLevel: 10 },
  B: { name: '影分身',   unlockLevel: 20, cooldown: 15.0, mpCost: 100, maxLevel: 10 },
};

// 技能等級對傷害的加成：每級 +12%（Lv.1 = 1.0x，可調）
export function skillDamageScale(level) {
  return 1 + Math.max(0, (level || 0) - 1) * 0.12;
}

export function expNeeded(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export const MAP_SCENE_KEYS = {
  sky:     'MapleIslandScene',
  henesys: 'HenesysScene',
  ruins:   'PerionScene',
  ellinia: 'ElliniaScene',
  taipei:  'TaipeiScene',
  kerning: 'KerningScene',
  boss:    'BossScene',
  town:    'TownScene',
};

export const MAP_ORDER = ['sky', 'henesys', 'ruins', 'ellinia', 'taipei', 'kerning'];

// 建立一份全新的初始遊戲狀態。
// 重要：巢狀物件（equipment / potions / skillCooldowns / skillLevels）與陣列
// （unlockedSkills）每次都重新建構，彼此零參照共享，避免跨局狀態互相污染。
export function createInitialGameState() {
  return {
    level: 1,
    exp: 0,
    expNeeded: 100,
    hp: 400,
    maxHp: 400,
    mp: 250,
    maxMp: 250,
    atk: 70,
    critRate: 0.2,
    critMulti: 1.8,
    speed: 220,
    meso: 0,
    killCount: 0,
    playTime: 0,
    equipment: { weapon: null, armor: null, gloves: null, helmet: null, boots: null },
    potions: { A: 5, S: 3, D: 5, R: 3, G: 2 },
    skillCooldowns: { Z: 0, X: 0, C: 0, V: 0, B: 0 },
    unlockedSkills: ['Z'],
    skillLevels: { Z: 1, X: 0, C: 0, V: 0, B: 0 },
    skillPoints: 0,
    currentMap: 'sky',
    bossUnlocked: false,
    spawnX: 150,
    // Phase 13：任務系統。active 元素：{ id, progress }；completed：已完成 id 陣列
    quests: { active: [], completed: [] },
  };
}

// 唯讀的預設值參考。⚠ 請勿直接 spread（`{ ...DEFAULT_GAME_STATE }`）使用，
// 巢狀物件會共用參照、造成跨局污染。要取得可寫入的遊戲狀態請用 createInitialGameState()。
export const DEFAULT_GAME_STATE = createInitialGameState();

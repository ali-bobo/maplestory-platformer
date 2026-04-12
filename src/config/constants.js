// 遊戲常數定義

export const CANVAS = { width: 1280, height: 720 };
export const WORLD_HEIGHT = 600;

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
  Z: { name: '三連飛鏢', unlockLevel: 1,  cooldown: 0.5,  mpCost: 10 },
  X: { name: '暗影步伐', unlockLevel: 5,  cooldown: 3.0,  mpCost: 30 },
  C: { name: '暗殺',     unlockLevel: 10, cooldown: 5.0,  mpCost: 50 },
  V: { name: '暗影漩渦', unlockLevel: 15, cooldown: 8.0,  mpCost: 70 },
  B: { name: '影分身',   unlockLevel: 20, cooldown: 15.0, mpCost: 100 },
};

export function expNeeded(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export const MAP_SCENE_KEYS = {
  sky:     'MapleIslandScene',
  ruins:   'PerionScene',
  kerning: 'KerningScene',
  boss:    'BossScene',
};

export const MAP_ORDER = ['sky', 'ruins', 'kerning'];

export const DEFAULT_GAME_STATE = {
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
  skillCooldowns: { Z: 0, X: 0, C: 0, V: 0, B: 0 },
  unlockedSkills: ['Z'],
  skillLevels: { Z: 1, X: 0, C: 0, V: 0, B: 0 },
  skillPoints: 0,
  currentMap: 'sky',
  bossUnlocked: false,
  spawnX: 150,
};

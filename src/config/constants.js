// 遊戲常數定義

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

export const SKILLS = {
  Z: { name: '三連飛鏢', unlockLevel: 1,  cooldown: 0.5,  mpCost: 10,  maxLevel: 10 },
  X: { name: '暗影步伐', unlockLevel: 5,  cooldown: 3.0,  mpCost: 30,  maxLevel: 10 },
  C: { name: '暗殺',     unlockLevel: 10, cooldown: 5.0,  mpCost: 50,  maxLevel: 10 },
  V: { name: '暗影漩渦', unlockLevel: 15, cooldown: 8.0,  mpCost: 70,  maxLevel: 10 },
  B: { name: '影分身',   unlockLevel: 20, cooldown: 15.0, mpCost: 100, maxLevel: 10 },
};

// 普通攻擊（電腦版空白鍵 / 手機最大的攻擊鈕）：近戰揮刀，不耗 MP、冷卻短，不屬於技能池、不能升級也不佔技能欄位。
export const BASIC_ATTACK = 'ATK';
export const BASIC_ATTACK_DEF = { name: '普通攻擊', cooldown: 0.4, damageMult: 0.9, range: 90 };

// 技能池有 5 個技能，但技能欄只有 4 格（電腦版快捷鍵 Z X C V；手機同位置的 4 顆按鈕）。
// 欄位裡放哪個技能存在 gameState.skillSlots；5 個技能全部解鎖（Lv.20）後，可在 HUD 拖曳交換，
// 也可在技能視窗把沒裝備的技能換進指定欄位。
export const SKILL_POOL = ['Z', 'X', 'C', 'V', 'B'];
export const SKILL_SLOT_KEYS = ['Z', 'X', 'C', 'V'];
export const DEFAULT_SKILL_SLOTS = ['Z', 'X', 'C', 'V'];

// 欄位快捷鍵 → 目前放在該欄位的技能 id（普通攻擊欄固定是 ATK）
export function skillForSlot(gs, slotKey) {
  if (slotKey === BASIC_ATTACK) return BASIC_ATTACK;
  const idx = SKILL_SLOT_KEYS.indexOf(slotKey);
  if (idx < 0) return undefined;
  const slots = gs && Array.isArray(gs.skillSlots) ? gs.skillSlots : DEFAULT_SKILL_SLOTS;
  return slots[idx] || DEFAULT_SKILL_SLOTS[idx];
}

// 是否已可調整欄位：5 個技能全部解鎖（Lv.20）
export function canReorderSkills(gs) {
  return SKILL_POOL.every((id) => gs && Array.isArray(gs.unlockedSkills) && gs.unlockedSkills.includes(id));
}

// 把技能 skillId 放進欄位 slotKey：若它已在別的欄位則兩格互換，否則直接取代該欄。回傳新的 slots（不修改輸入）。
export function equipSkill(slots, slotKey, skillId) {
  const out = [...slots];
  const to = SKILL_SLOT_KEYS.indexOf(slotKey);
  if (to < 0 || !SKILL_POOL.includes(skillId)) return out;
  const from = out.indexOf(skillId);
  if (from === to) return out;
  if (from >= 0) out[from] = out[to];
  out[to] = skillId;
  return out;
}

// 技能等級對傷害的加成：每級 +12%（Lv.1 = 1.0x，可調）
export function skillDamageScale(level) {
  return 1 + Math.max(0, (level || 0) - 1) * 0.12;
}

// 升級所需經驗：100 × Lv^1.45。以同級怪計算，每級約 12～28 隻
//（舊版 1.3^Lv 在 20 級後每級要 60～130 隻，練功太久）
export function expNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.45));
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
    skillCooldowns: { ATK: 0, Z: 0, X: 0, C: 0, V: 0, B: 0 },
    unlockedSkills: ['Z'],
    skillLevels: { Z: 1, X: 0, C: 0, V: 0, B: 0 },
    skillSlots: [...DEFAULT_SKILL_SLOTS],
    skillPoints: 0,
    currentMap: 'sky',
    bossUnlocked: false,
    spawnX: 150,
    // Phase 13：任務系統。active 元素：{ id, progress }；completed：已完成 id 陣列
    quests: { active: [], completed: [] },
  };
}


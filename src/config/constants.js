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

// ── 職業（一轉）────────────────────────────────────────────────────────────
// 技能 id：盜賊沿用 Z X C V B；刺客 / 俠盜繼承其中 3 個（同 id、同效果），再各加 3 個專屬技能。
// 職業專屬技能的數值見 docs/SKILLS_DESIGN.md。
export const JOB_SKILLS = {
  backstab: { name: '瞬影連刺', cooldown: 6.0,  mpCost: 40, maxLevel: 10 },
  poison:   { name: '蝕心毒鏢', cooldown: 4.0,  mpCost: 35, maxLevel: 10 },
  mark:     { name: '斷命印記', cooldown: 12.0, mpCost: 60, maxLevel: 10 },
  whirl:    { name: '赤月迴旋', cooldown: 6.0,  mpCost: 45, maxLevel: 10 },
  steal:    { name: '妙手空空', cooldown: 5.0,  mpCost: 30, maxLevel: 10 },
  smoke:    { name: '迷煙彈',   cooldown: 14.0, mpCost: 55, maxLevel: 10 },
};
// 全部技能定義（盜賊技能 + 職業專屬）；各職業的解鎖等級以 JOBS[job].skills 為準
export const ALL_SKILLS = { ...SKILLS, ...JOB_SKILLS };

// 等級上限（世界重整後由 30 提高到 50；經驗曲線 expNeeded 不變，見 docs/WORLD_DESIGN.md）
export const MAX_LEVEL = 50;

export const JOB_IDS = ['thief', 'assassin', 'bandit'];
export const DEFAULT_JOB = 'thief';
export const JOB_CHANGE_LEVEL = 10;
export const JOB_CHANGE_SKILL_POINTS = 5;   // 轉職獎勵：技能書 = 技能點

const SKILL_SLOTS = 4;

function buildJob(def) {
  // skills：此職業技能池內每個技能的完整定義（含此職業的解鎖等級），啟動時建好，執行期不再配置新物件
  const skills = {};
  for (const id of def.pool) skills[id] = { ...ALL_SKILLS[id], unlockLevel: def.unlocks[id] };
  return { ...def, skills };
}

export const JOBS = {
  thief: buildJob({
    id: 'thief', name: '盜賊', title: '星光學徒',
    pool: ['Z', 'X', 'C', 'V', 'B'],
    unlocks: { Z: 1, X: 5, C: 10, V: 15, B: 20 },
    defaultSlots: ['Z', 'X', 'C', 'V'],
    basic: { ...BASIC_ATTACK_DEF, hits: 1, critBonus: 0 },
    passives: null,
    portrait: 'player_portrait',
  }),
  assassin: buildJob({
    id: 'assassin', name: '刺客', title: '暗夜之刃',
    pool: ['Z', 'X', 'C', 'backstab', 'poison', 'mark'],
    unlocks: { Z: 10, X: 10, C: 10, backstab: 12, poison: 18, mark: 24 },
    defaultSlots: ['Z', 'X', 'C', 'backstab'],
    // 雙刃連斬：兩下、每下 0.55 倍、暴擊率 +10%
    basic: { name: '雙刃連斬', cooldown: 0.4, damageMult: 0.55, range: 90, hits: 2, critBonus: 0.1 },
    passive: { name: '殺手本能', desc: '暴擊傷害 +30%' },
    passives: { critDamage: 0.3 },
    portrait: 'portrait_assassin',
  }),
  bandit: buildJob({
    id: 'bandit', name: '俠盜', title: '赤焰劫客',
    pool: ['X', 'V', 'B', 'whirl', 'steal', 'smoke'],
    unlocks: { X: 10, V: 10, B: 10, whirl: 12, steal: 18, smoke: 24 },
    defaultSlots: ['X', 'V', 'B', 'whirl'],
    // 彎刀橫斬：範圍 110、1.1 倍；每連打 3 下第 3 下擊飛
    basic: { name: '彎刀橫斬', cooldown: 0.5, damageMult: 1.1, range: 110, hits: 1, critBonus: 0, knockupEvery: 3 },
    passive: { name: '悍匪體魄', desc: '最大 HP +20%、金幣掉落 +15%' },
    passives: { maxHpMult: 1.2, mesoMult: 1.15 },
    portrait: 'portrait_bandit',
  }),
};

export function isJobId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(JOBS, id);
}

// 取玩家目前職業 id；缺欄位或未知值一律當盜賊
export function jobIdOf(gs) {
  return gs && isJobId(gs.job) ? gs.job : DEFAULT_JOB;
}

export function jobOf(gs) {
  return JOBS[jobIdOf(gs)];
}

// 技能 id 在某職業下的定義（含該職業的解鎖等級）；不在該職業技能池回傳 undefined
export function skillDefOf(job, skillId) {
  const j = JOBS[isJobId(job) ? job : DEFAULT_JOB];
  return Object.prototype.hasOwnProperty.call(j.skills, skillId) ? j.skills[skillId] : undefined;
}

// 被動加成數值（沒有時回傳 fallback）
export function jobPassive(gs, name, fallback = 0) {
  const p = jobOf(gs).passives;
  return p && typeof p[name] === 'number' ? p[name] : fallback;
}

// 實際暴擊傷害倍率 / 暴擊率（含職業被動與普通攻擊加成）
export function effectiveCritMulti(gs) {
  return gs.critMulti + jobPassive(gs, 'critDamage', 0);
}
export function effectiveCritRate(gs, bonus = 0) {
  return Math.min(1, gs.critRate + bonus);
}

// 技能池有 5～6 個技能，但技能欄只有 4 格（電腦版快捷鍵 Z X C V；手機同位置的 4 顆按鈕）。
// 欄位裡放哪個技能存在 gameState.skillSlots；解鎖的技能多過欄位數之後，可在 HUD 拖曳交換，
// 也可在技能視窗把沒裝備的技能換進指定欄位。
// 以下三個常數是盜賊的技能池 / 預設欄位（舊程式與測試沿用）；其他職業見 JOBS。
export const SKILL_POOL = JOBS.thief.pool;
export const SKILL_SLOT_KEYS = ['Z', 'X', 'C', 'V'];
export const DEFAULT_SKILL_SLOTS = JOBS.thief.defaultSlots;

// 欄位快捷鍵 → 目前放在該欄位的技能 id（普通攻擊欄固定是 ATK）
export function skillForSlot(gs, slotKey) {
  if (slotKey === BASIC_ATTACK) return BASIC_ATTACK;
  const idx = SKILL_SLOT_KEYS.indexOf(slotKey);
  if (idx < 0) return undefined;
  const defaults = jobOf(gs).defaultSlots;
  const slots = gs && Array.isArray(gs.skillSlots) ? gs.skillSlots : defaults;
  return slots[idx] || defaults[idx];
}

// 是否已可調整欄位：解鎖的技能比欄位數多（盜賊：5 個全解鎖 = Lv.20）
export function canReorderSkills(gs) {
  if (!gs || !Array.isArray(gs.unlockedSkills)) return false;
  const pool = jobOf(gs).pool;
  return pool.filter((id) => gs.unlockedSkills.includes(id)).length > SKILL_SLOTS;
}

// 把技能 skillId 放進欄位 slotKey：若它已在別的欄位則兩格互換，否則直接取代該欄。回傳新的 slots（不修改輸入）。
export function equipSkill(slots, slotKey, skillId, pool = SKILL_POOL) {
  const out = [...slots];
  const to = SKILL_SLOT_KEYS.indexOf(slotKey);
  if (to < 0 || !pool.includes(skillId)) return out;
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

// 星光碎片集滿（5/5）後的稱號前綴，加在職業稱號前面
export const STAR_TITLE = '星光守護者';

// 玩家稱號 = 職業稱號；集滿星光碎片後前面加「星光守護者・」
export function titleFor(jobId, shardCount) {
  const base = JOBS[isJobId(jobId) ? jobId : DEFAULT_JOB].title;
  return shardCount >= 5 ? `${STAR_TITLE}・${base}` : base;
}

// 最終 Boss 房死亡 / 讀檔時回到的地圖（主線最後一張一般地圖）
export const BOSS_FALLBACK_MAP = 'castle';

export const MAP_SCENE_KEYS = {
  sky:     'MapleIslandScene',
  henesys: 'HenesysScene',
  ruins:   'PerionScene',
  ellinia: 'ElliniaScene',
  taipei:  'TaipeiScene',
  kerning: 'KerningScene',
  boss:    'BossScene',
  town:    'TownScene',
  shrine:  'ShrineScene',
  harbor:  'HarborScene',
  desert:  'DesertScene',
  snow:    'SnowScene',
  lava:    'LavaScene',
  castle:  'CastleScene',
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
    job: DEFAULT_JOB,
    title: JOBS.thief.title,
    jobChoice: null,   // 轉職任務中選定的職業（覺醒前暫存）；null = 尚未選擇
    skillCooldowns: { ATK: 0, Z: 0, X: 0, C: 0, V: 0, B: 0 },
    unlockedSkills: ['Z'],
    skillLevels: { Z: 1, X: 0, C: 0, V: 0, B: 0 },
    skillSlots: [...JOBS.thief.defaultSlots],
    skillPoints: 0,
    currentMap: 'sky',
    bossUnlocked: false,
    // 星光碎片主線：已取得的碎片 id（見 config/shards.js）、星光之塔是否已點亮（點亮才解鎖最終 Boss）
    shards: [],
    towerLit: false,
    // 去過的地圖（世界地圖傳送只能去這些）；進入地圖時由 BaseMapScene 加入
    visitedMaps: ['sky'],
    spawnX: 150,
    // Phase 13：任務系統。active 元素：{ id, progress }；completed：已完成 id 陣列
    quests: { active: [], completed: [] },
  };
}


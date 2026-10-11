// 技能傷害數字的單一來源：執行期（Skill.js / JobSkills.js）和平衡模型（engine/damageModel.js、單元測試、
// docs/SKILLS_DESIGN.md 的平衡表）都讀這裡，改數字不會讓三邊脫節。
// parts：每一段傷害 { mult 倍攻擊力, hits 次數 }；或持續型 { mult, every 秒 }（搭配 duration × uptime）。
//   crit:true = 必暴擊；dot:true = 持續傷害（不會暴擊）。targets：評估用的參考命中隻數。
//   role：filler 補招 / mobility 位移 / burst 爆發 / utility 輔助（平衡測試用來分組比較）。
import {
  POISON_TICKS, POISON_TICK_MULT, POISON_MAX_STACKS, SMOKE_DURATION_MS, SMOKE_TICK_MULT,
  MARK_DURATION_MS, MARK_DAMAGE_BONUS, STEAL_MP_REFUND,
} from '../engine/statusEffects.js';

export const SKILL_MODEL = {
  Z: { role: 'filler', targets: 1, parts: [{ mult: 1.2, hits: 3 }] },
  X: { role: 'mobility', targets: 2, parts: [{ mult: 0.6, hits: 1 }, { mult: 1.2, hits: 1 }] },
  C: { role: 'burst', targets: 1, parts: [{ mult: 0.8, hits: 2, crit: true }, { mult: 1.9, hits: 1, crit: true }] },
  V: { role: 'burst', targets: 3, parts: [{ mult: 0.35, hits: 6 }, { mult: 0.9, hits: 1 }] },
  // 影分身：12 秒內自己斬 / 丟鏢，實測約 7 成時間有目標（uptime）
  B: { role: 'burst', targets: 1, duration: 12, uptime: 0.7, parts: [{ mult: 0.9, every: 0.42 }, { mult: 0.7, every: 0.9 }] },
  backstab: { role: 'burst', targets: 1, parts: [{ mult: 1.45, hits: 3, crit: true }] },
  poison: {
    role: 'burst', targets: 1, stacks: POISON_MAX_STACKS,
    parts: [{ mult: 1.2, hits: 1 }, { mult: POISON_TICK_MULT, hits: POISON_TICKS, dot: true }],
  },
  // 斷命印記本身不造成傷害：效果 = 印記期間之後的每一擊必暴擊並 ×bonus
  mark: { role: 'burst', targets: 1, parts: [], amplify: { duration: MARK_DURATION_MS / 1000, bonus: MARK_DAMAGE_BONUS } },
  whirl: { role: 'burst', targets: 3, parts: [{ mult: 1.2, hits: 3 }] },
  steal: { role: 'burst', targets: 1, mpRefund: STEAL_MP_REFUND, parts: [{ mult: 1.8, hits: 2 }] },
  smoke: { role: 'utility', targets: 3, parts: [{ mult: SMOKE_TICK_MULT, hits: SMOKE_DURATION_MS / 1000, dot: true }] },
};

// 每個技能的單段倍率（執行期用）
export const M = {
  Z: SKILL_MODEL.Z.parts[0].mult,
  X_PASS: SKILL_MODEL.X.parts[0].mult, X_BLAST: SKILL_MODEL.X.parts[1].mult,
  C_SLASH: SKILL_MODEL.C.parts[0].mult, C_FINISH: SKILL_MODEL.C.parts[1].mult,
  V_TICK: SKILL_MODEL.V.parts[0].mult, V_BLAST: SKILL_MODEL.V.parts[1].mult,
  B_SLASH: SKILL_MODEL.B.parts[0].mult, B_THROW: SKILL_MODEL.B.parts[1].mult,
  BACKSTAB: SKILL_MODEL.backstab.parts[0].mult,
  POISON_DART: SKILL_MODEL.poison.parts[0].mult,
  WHIRL: SKILL_MODEL.whirl.parts[0].mult, WHIRL_HITS: SKILL_MODEL.whirl.parts[0].hits,
  STEAL: SKILL_MODEL.steal.parts[0].mult, STEAL_HITS: SKILL_MODEL.steal.parts[0].hits,
};

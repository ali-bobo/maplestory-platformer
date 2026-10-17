// 技能傷害數字的單一來源：執行期（Skill.js / JobSkills.js）和平衡模型（engine/damageModel.js、單元測試、
// docs/SKILLS_DESIGN.md 的平衡表）都讀這裡，改數字不會讓三邊脫節。
// parts：每一段傷害 { mult 倍攻擊力, hits 次數 }；或持續型 { mult, every 秒 }（搭配 duration × uptime）。
//   crit:true = 必暴擊；dot:true = 持續傷害（不會暴擊）。targets：評估用的參考命中隻數。
//   role：filler 補招 / mobility 位移 / burst 爆發 / utility 輔助（平衡測試用來分組比較）。
import {
  POISON_TICKS, POISON_TICK_MULT, POISON_MAX_STACKS, SMOKE_DURATION_MS, SMOKE_TICK_MULT, SMOKE_BLAST_MULT, SMOKE_FINALE_MULT,
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
  // 迷煙彈：落地爆炸 → 煙霧內每秒灼燒 → 結束時收縮引爆
  smoke: {
    role: 'utility', targets: 3,
    parts: [{ mult: SMOKE_BLAST_MULT, hits: 1 }, { mult: SMOKE_TICK_MULT, hits: SMOKE_DURATION_MS / 1000, dot: true }, { mult: SMOKE_FINALE_MULT, hits: 1 }],
  },
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

// 技能視窗的說明文字（效果）；傷害數字由 skillDamageText 依 SKILL_MODEL 與技能等級算出，不寫死在這裡
export const SKILL_DESC = {
  Z: '向前方扇形射出三枚飛鏢，第三枚會穿透敵人。',
  X: '向前衝刺穿過敵人，衝刺結束時在被穿過的敵人身上引爆十字斬。',
  C: '瞬移到最近的敵人背後，兩下快斬再接一記重擊，全部必定暴擊。',
  V: '在前方開出漩渦，把周圍敵人吸到中心持續絞殺，最後引爆把敵人擊飛。',
  B: '召喚會自己行動的影分身 12 秒，追著最近的敵人近戰或丟飛鏢。',
  backstab: '瞬移到最近的敵人背後連刺 3 下，背後攻擊必定暴擊。',
  poison: '丟出毒鏢，命中後中毒 6 秒、每秒受到傷害；重複命中可疊到 3 層。',
  mark: '標記最近的敵人 7 秒，期間對它的每一擊都必定暴擊並額外 +20% 傷害。',
  whirl: '原地旋轉斬三圈，打到身邊所有敵人；每命中一隻回復少量 HP，最後一圈擊退。',
  steal: '金光突進，穿過前方最多 3 隻敵人並各砍兩記 X 字斬。命中回 10 MP，60% 機率多掉金幣、12% 偷到藥水。',
  smoke: '丟出煙霧彈：落地爆炸，留下 7 秒毒煙（範圍內敵人攻擊 -60%、不會追你、每秒灼燒），結束時收縮再爆炸一次。',
};

const pct = (m) => `${Math.round(m * 100)}%`;

// 依技能等級列出每段傷害（倍攻擊力），例：「180% × 2 段」「每秒 80%（7 秒）」
export function skillDamageText(id, scale = 1) {
  const model = SKILL_MODEL[id];
  if (!model) return '';
  if (model.amplify) return `本身無傷害；印記期間每擊必暴擊 +${pct(model.amplify.bonus)}`;
  const parts = model.parts.map((p) => {
    const m = pct(p.mult * scale);
    if (p.every) return `每 ${p.every} 秒 ${m}`;
    if (p.dot) return `每秒 ${m}（${p.hits} 秒）`;
    return `${m}${p.hits > 1 ? ` × ${p.hits} 段` : ''}${p.crit ? '（必暴擊）' : ''}`;
  });
  return `傷害：${parts.join(' + ')}`;
}

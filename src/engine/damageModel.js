// 技能平衡模型（純函式，不依賴 Phaser）：由 JOBS / JOB_SKILLS / SKILLS 與 SKILL_MODEL 算出每個技能的
// 名義倍率、命中次數、期望傷害、每 MP 傷害與每秒冷卻傷害。單元測試用它鎖定設計意圖，
// docs/SKILLS_DESIGN.md 的平衡表也是這個函式的輸出。
import { JOBS, isJobId, DEFAULT_JOB, skillDamageScale } from '../config/constants.js';
import { SKILL_MODEL } from '../config/skillModel.js';

export const BASE_CRIT = { critRate: 0.2, critMulti: 1.8 };   // createInitialGameState 的預設
export const MP_REGEN_PER_SEC = 10;                            // Player.recoverMp：每毫秒 0.01

const jobOf = (id) => JOBS[isJobId(id) ? id : DEFAULT_JOB];

// 含職業被動的暴擊率 / 暴擊倍率
export function critStats(jobId, bonusRate = 0, base = BASE_CRIT) {
  const p = jobOf(jobId).passives || {};
  return {
    rate: Math.min(1, base.critRate + (p.critRate || 0) + bonusRate),
    multi: base.critMulti + (p.critDamage || 0),
  };
}

// 每一擊的期望倍率（非暴擊 1，暴擊 multi）
export const critFactor = (rate, multi) => 1 + Math.min(1, rate) * (multi - 1);

function partHits(part, model) {
  if (part.hits != null) return part.hits;
  return (model.duration * (model.uptime ?? 1)) / part.every;
}

// 普通攻擊：每次出手的名義倍率、命中數、期望傷害與 DPS（冷卻決定出手頻率）
export function basicProfile(jobId) {
  const b = jobOf(jobId).basic;
  const { rate, multi } = critStats(jobId, b.critBonus || 0);
  // 俠盜每 knockupEvery 下有一下是 finisherMult 倍
  const fin = b.knockupEvery ? (b.knockupEvery - 1 + (b.finisherMult || 1)) / b.knockupEvery : 1;
  const hits = b.hits || 1;
  const nominal = b.damageMult * hits * fin;
  const expected = nominal * critFactor(rate, multi);
  return { id: 'ATK', name: b.name, cd: b.cooldown, hits, nominal, expected, dps: expected / b.cooldown, range: b.range };
}

// 技能（職業 jobId 的技能池內）的平衡數字，skillLevel 預設 1（解鎖當下）。
// expected：單一目標的期望總傷害（倍攻擊力，含暴擊與技能等級）；area = expected × 參考命中隻數。
export function skillProfile(jobId, skillId, skillLevel = 1) {
  const job = jobOf(jobId);
  const def = job.skills[skillId];
  const model = SKILL_MODEL[skillId];
  if (!def || !model) return null;
  const scale = skillDamageScale(skillLevel);
  const { rate, multi } = critStats(jobId);
  const normal = critFactor(rate, multi);
  let hits = 0, nominal = 0, expected = 0;
  for (const part of model.parts) {
    const n = partHits(part, model);
    const base = part.mult * n * scale;
    hits += n; nominal += base;
    expected += base * (part.crit ? multi : part.dot ? 1 : normal);
  }
  if (model.amplify) {
    // 斷命印記：印記期間，後續普通攻擊每一擊改為「必暴擊 × bonus」；價值 = 增加的那部分
    const b = basicProfile(jobId);
    const f = critFactor(critStats(jobId, job.basic.critBonus || 0).rate, multi);
    expected = model.amplify.duration * b.dps * ((multi * model.amplify.bonus) / f - 1);
  }
  const cd = def.cooldown;
  const netMp = Math.max(1, def.mpCost - (model.mpRefund || 0));
  // 持續施放時的單次價值：毒會一路疊到 stacks 層，每個冷卻週期的毒傷 = 週期秒數 × 層數 × 每跳傷害
  let sustained = expected;
  if (model.stacks) {
    const dart = model.parts.filter((p) => !p.dot).reduce((a, p) => a + p.mult * partHits(p, model) * scale * normal, 0);
    const tick = model.parts.find((p) => p.dot);
    sustained = dart + Math.min(cd, tick.hits) * model.stacks * tick.mult * scale;
  }
  const targets = model.targets || 1;
  return {
    id: skillId, name: def.name, role: model.role, mp: def.mpCost, netMp, cd, hits, nominal, expected, targets,
    area: expected * targets,
    perMp: (expected * targets) / netMp,          // 以參考命中隻數計
    perMpSingle: expected / netMp,                // 單體
    perCd: (expected * targets) / cd,
    perCdSustained: (sustained * targets) / cd,
    mpPerSec: def.mpCost / cd,                    // 技能一冷卻就放時每秒耗 MP
  };
}

// 整個技能池（依職業）的平衡表
export function balanceTable(jobId) {
  return jobOf(jobId).pool.map((id) => skillProfile(jobId, id)).filter(Boolean);
}

// 一直輪流施放 ids 內的技能（冷卻一好就放）時，從滿 MP 撐幾秒
export function secondsUntilDry(jobId, ids, maxMp) {
  const drain = ids.reduce((a, id) => a + skillProfile(jobId, id).mpPerSec, 0) - MP_REGEN_PER_SEC;
  return drain <= 0 ? Infinity : maxMp / drain;
}

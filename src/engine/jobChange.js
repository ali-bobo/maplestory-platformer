// 轉職的資料處理（純邏輯、不依賴 Phaser，方便單元測試）。
// 任務流程在 questManager、演出在 BaseMapScene；這裡只負責把 gameState 改成新職業。

import {
  JOBS, isJobId, DEFAULT_JOB, JOB_CHANGE_LEVEL, JOB_CHANGE_SKILL_POINTS, expNeeded,
} from '../config/constants.js';

export function canChangeJob(gs, jobId) {
  return !!gs && gs.job === DEFAULT_JOB && jobId !== DEFAULT_JOB && isJobId(jobId) && gs.level >= JOB_CHANGE_LEVEL;
}

// 把 gs 轉成 jobId。不合法（已轉職 / 等級不足 / 未知職業）回傳 false 且不改動。
// 繼承技能保留等級；新職業池外的技能把已花的 SP 退還；專屬技能依等級解鎖；
// 技能欄改成該職業預設；悍匪體魄的最大 HP +20% 在此一次加進 maxHp（之後升級仍是固定加成）。
export function applyJobChange(gs, jobId, opts = {}) {
  if (!opts.force && !canChangeJob(gs, jobId)) return false;
  if (!isJobId(jobId)) return false;
  const job = JOBS[jobId];
  const old = gs.skillLevels || {};

  let refund = 0;
  for (const [id, lv] of Object.entries(old)) {
    if (!job.pool.includes(id)) refund += Math.max(0, (lv || 0) - 1);
  }

  const skillLevels = {};
  const unlocked = [];
  for (const id of job.pool) {
    const ok = gs.level >= job.skills[id].unlockLevel;
    skillLevels[id] = ok ? Math.max(1, old[id] || 0) : 0;
    if (ok) unlocked.push(id);
  }

  gs.job = jobId;
  gs.title = job.title;
  gs.jobChoice = null;
  gs.skillLevels = skillLevels;
  gs.unlockedSkills = unlocked;
  gs.skillSlots = [...job.defaultSlots];
  gs.skillCooldowns = { ATK: 0 };
  gs.skillPoints = (gs.skillPoints || 0) + refund + (jobId === DEFAULT_JOB ? 0 : JOB_CHANGE_SKILL_POINTS);
  if (job.passives && job.passives.maxHpMult) {
    gs.maxHp = Math.floor(gs.maxHp * job.passives.maxHpMult);
  }
  gs.hp = gs.maxHp;
  gs.mp = gs.maxMp;
  return true;
}

// 除錯用：直接把角色設成指定職業與等級（?debug=1 時的 window.__setJob）。
// 先把等級拉到目標、重算經驗，再套用轉職；盜賊則是重設回盜賊的初始技能狀態。
export function debugSetJob(gs, jobId, level) {
  if (!isJobId(jobId)) return false;
  let lv = Number.isFinite(level) ? Math.floor(level) : gs.level;
  if (jobId !== DEFAULT_JOB) lv = Math.max(JOB_CHANGE_LEVEL, lv);
  lv = Math.max(1, Math.min(30, lv));
  const gain = lv - gs.level;
  if (gain !== 0) {
    gs.maxHp += 20 * gain; gs.maxMp += 12 * gain; gs.atk += 5 * gain;
  }
  gs.level = lv;
  gs.exp = 0;
  gs.expNeeded = expNeeded(lv);
  return applyJobChange(gs, jobId, { force: true });
}

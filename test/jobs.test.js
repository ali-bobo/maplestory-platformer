// 職業資料模型：JOBS 表、技能池、轉職套用、存檔驗證
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOBS, JOB_IDS, ALL_SKILLS, createInitialGameState, skillDefOf, skillForSlot, canReorderSkills, equipSkill,
  jobOf, jobIdOf, jobPassive, effectiveCritMulti, effectiveCritRate, SKILL_SLOT_KEYS, JOB_CHANGE_SKILL_POINTS,
} from '../src/config/constants.js';
import { applyJobChange, canChangeJob, debugSetJob } from '../src/engine/jobChange.js';
import { sanitizeState, parseSave, serializeSave } from '../src/engine/saveManager.js';

function thiefAt(level) {
  const gs = createInitialGameState();
  gs.level = level;
  return gs;
}

test('JOBS：三個職業，技能池 id 都有定義，預設欄位是池內且不重複的 4 個', () => {
  assert.deepEqual(JOB_IDS, ['thief', 'assassin', 'bandit']);
  for (const id of JOB_IDS) {
    const j = JOBS[id];
    assert.equal(j.id, id);
    assert.equal(j.defaultSlots.length, SKILL_SLOT_KEYS.length);
    assert.equal(new Set(j.defaultSlots).size, j.defaultSlots.length);
    for (const s of j.defaultSlots) assert.ok(j.pool.includes(s), `${id} 預設欄位 ${s}`);
    for (const s of j.pool) {
      assert.ok(ALL_SKILLS[s], `${id} 技能 ${s} 有定義`);
      assert.ok(j.skills[s].unlockLevel >= 1, `${id}.${s} 解鎖等級`);
      assert.ok(j.skills[s].mpCost > 0 && j.skills[s].cooldown > 0);
    }
    assert.ok(j.basic.cooldown > 0 && j.basic.damageMult > 0 && j.basic.range > 0);
  }
  assert.equal(JOBS.thief.pool.length, 5);
  assert.equal(JOBS.assassin.pool.length, 6);
  assert.equal(JOBS.bandit.pool.length, 6);
});

test('JOBS：數值與 SKILLS_DESIGN.md 一致（解鎖等級 / MP / 冷卻 / 普攻 / 被動）', () => {
  const a = JOBS.assassin.skills;
  assert.deepEqual([a.backstab.unlockLevel, a.backstab.mpCost, a.backstab.cooldown], [12, 40, 6]);
  assert.deepEqual([a.poison.unlockLevel, a.poison.mpCost, a.poison.cooldown], [18, 35, 4]);
  assert.deepEqual([a.mark.unlockLevel, a.mark.mpCost, a.mark.cooldown], [24, 60, 12]);
  assert.deepEqual([a.Z.unlockLevel, a.Z.mpCost], [10, 10]);
  assert.deepEqual([a.X.mpCost, a.C.mpCost], [30, 50]);
  const b = JOBS.bandit.skills;
  assert.deepEqual([b.whirl.unlockLevel, b.whirl.mpCost, b.whirl.cooldown], [12, 45, 6]);
  assert.deepEqual([b.steal.unlockLevel, b.steal.mpCost, b.steal.cooldown], [18, 30, 5]);
  assert.deepEqual([b.smoke.unlockLevel, b.smoke.mpCost, b.smoke.cooldown], [24, 55, 14]);
  assert.deepEqual([b.V.mpCost, b.B.mpCost, b.B.cooldown], [70, 100, 15]);
  assert.equal(JOBS.assassin.basic.name, '雙刃連斬');
  assert.equal(JOBS.assassin.basic.hits, 2);
  assert.equal(JOBS.assassin.basic.damageMult, 0.55);
  assert.equal(JOBS.assassin.basic.critBonus, 0.1);
  assert.equal(JOBS.bandit.basic.range, 110);
  assert.equal(JOBS.bandit.basic.damageMult, 1.1);
  assert.equal(JOBS.bandit.basic.cooldown, 0.5);
  assert.equal(JOBS.bandit.basic.knockupEvery, 3);
  assert.equal(JOBS.assassin.passives.critDamage, 0.3);
  assert.equal(JOBS.bandit.passives.maxHpMult, 1.2);
  assert.equal(JOBS.bandit.passives.mesoMult, 1.15);
  assert.equal(JOBS.assassin.title, '暗夜之刃');
  assert.equal(JOBS.bandit.title, '赤焰劫客');
});

test('skillDefOf：技能必須在該職業池內；未知職業當盜賊', () => {
  assert.equal(skillDefOf('thief', 'Z').unlockLevel, 1);
  assert.equal(skillDefOf('assassin', 'Z').unlockLevel, 10);   // 繼承技能的解鎖等級以職業為準
  assert.equal(skillDefOf('assassin', 'V'), undefined);
  assert.equal(skillDefOf('bandit', 'Z'), undefined);
  assert.equal(skillDefOf('bandit', 'smoke').name, '迷煙彈');
  assert.equal(skillDefOf('nope', 'Z').name, '三連飛鏢');
  assert.equal(skillDefOf('thief', '__proto__'), undefined);
  assert.equal(skillDefOf('thief', 'constructor'), undefined);
});

test('jobIdOf / jobOf / jobPassive / 暴擊：缺欄位當盜賊；被動只加在對應職業', () => {
  assert.equal(jobIdOf({}), 'thief');
  assert.equal(jobIdOf(null), 'thief');
  assert.equal(jobIdOf({ job: 'wizard' }), 'thief');
  assert.equal(jobOf({ job: 'bandit' }).name, '俠盜');
  const gs = createInitialGameState();
  assert.equal(effectiveCritMulti(gs), gs.critMulti);
  gs.job = 'assassin';
  assert.ok(Math.abs(effectiveCritMulti(gs) - (gs.critMulti + 0.3)) < 1e-9);
  assert.equal(jobPassive(gs, 'mesoMult', 1), 1);
  gs.job = 'bandit';
  assert.equal(jobPassive(gs, 'mesoMult', 1), 1.15);
  assert.equal(effectiveCritRate({ critRate: 0.95 }, 0.1), 1);
});

test('skillForSlot / canReorderSkills / equipSkill 依職業池運作', () => {
  const gs = createInitialGameState();
  gs.job = 'assassin';
  gs.skillSlots = null;
  assert.equal(skillForSlot(gs, 'V'), 'backstab');       // 沒有 skillSlots → 該職業預設
  gs.unlockedSkills = ['Z', 'X', 'C', 'backstab'];
  assert.equal(canReorderSkills(gs), false);
  gs.unlockedSkills = ['Z', 'X', 'C', 'backstab', 'poison'];
  assert.equal(canReorderSkills(gs), true);
  const pool = JOBS.assassin.pool;
  assert.deepEqual(equipSkill(['Z', 'X', 'C', 'backstab'], 'X', 'mark', pool), ['Z', 'mark', 'C', 'backstab']);
  assert.deepEqual(equipSkill(['Z', 'X', 'C', 'backstab'], 'X', 'V', pool), ['Z', 'X', 'C', 'backstab']);   // 池外的忽略
});

test('applyJobChange：刺客——繼承技能保留等級、專屬技能依等級解鎖、欄位預設、SP 獎勵', () => {
  const gs = thiefAt(10);
  gs.unlockedSkills = ['Z', 'X', 'C'];
  gs.skillLevels = { Z: 4, X: 3, C: 2, V: 0, B: 0 };
  gs.skillPoints = 2;
  assert.equal(canChangeJob(gs, 'assassin'), true);
  assert.equal(applyJobChange(gs, 'assassin'), true);
  assert.equal(gs.job, 'assassin');
  assert.equal(gs.title, '暗夜之刃');
  assert.deepEqual(gs.unlockedSkills, ['Z', 'X', 'C']);
  assert.deepEqual(gs.skillLevels, { Z: 4, X: 3, C: 2, backstab: 0, poison: 0, mark: 0 });
  assert.deepEqual(gs.skillSlots, ['Z', 'X', 'C', 'backstab']);
  assert.equal(gs.skillPoints, 2 + JOB_CHANGE_SKILL_POINTS);   // 沒有技能被丟棄 → 無退款
  assert.equal(gs.jobChoice, null);
});

test('applyJobChange：俠盜——丟棄 Z/C 退還 SP；V/B 於 Lv.10 就解鎖；悍匪體魄 HP +20%', () => {
  const gs = thiefAt(10);
  gs.unlockedSkills = ['Z', 'X', 'C'];
  gs.skillLevels = { Z: 4, X: 3, C: 2, V: 0, B: 0 };
  gs.skillPoints = 0;
  gs.maxHp = 500;
  gs.jobChoice = 'bandit';
  assert.equal(applyJobChange(gs, 'bandit'), true);
  assert.deepEqual(gs.unlockedSkills, ['X', 'V', 'B']);
  assert.deepEqual(gs.skillLevels, { X: 3, V: 1, B: 1, whirl: 0, steal: 0, smoke: 0 });
  assert.equal(gs.skillPoints, (4 - 1) + (2 - 1) + JOB_CHANGE_SKILL_POINTS);
  assert.equal(gs.maxHp, 600);
  assert.equal(gs.hp, 600);
  assert.deepEqual(gs.skillSlots, ['X', 'V', 'B', 'whirl']);
  assert.equal(gs.jobChoice, null);
});

test('applyJobChange：等級足夠時專屬技能一併解鎖；等級不足 / 已轉職 / 未知職業被拒絕', () => {
  const hi = thiefAt(24);
  assert.equal(applyJobChange(hi, 'assassin'), true);
  assert.deepEqual(hi.unlockedSkills, JOBS.assassin.pool);
  const low = thiefAt(9);
  assert.equal(applyJobChange(low, 'assassin'), false);
  assert.equal(low.job, 'thief');
  const done = thiefAt(10);
  applyJobChange(done, 'bandit');
  assert.equal(applyJobChange(done, 'assassin'), false);
  assert.equal(done.job, 'bandit');
  assert.equal(applyJobChange(thiefAt(10), 'wizard'), false);
  assert.equal(applyJobChange(thiefAt(10), 'thief'), false);
});

test('debugSetJob：可直接設職業與等級，也可切回盜賊', () => {
  const gs = createInitialGameState();
  assert.equal(debugSetJob(gs, 'bandit', 30), true);
  assert.equal(gs.level, 30);
  assert.equal(gs.job, 'bandit');
  assert.equal(gs.unlockedSkills.length, 6);
  assert.equal(debugSetJob(gs, 'assassin', 12), true);
  assert.equal(gs.job, 'assassin');
  assert.deepEqual(gs.unlockedSkills, ['Z', 'X', 'C', 'backstab']);
  assert.equal(debugSetJob(gs, 'thief', 12), true);
  assert.equal(gs.job, 'thief');
  assert.deepEqual(Object.keys(gs.skillLevels), ['Z', 'X', 'C', 'V', 'B']);
  assert.equal(debugSetJob(gs, 'nope', 5), false);
  // 沒給等級 → 維持原等級；職業至少 Lv.10
  const g2 = createInitialGameState();
  debugSetJob(g2, 'assassin');
  assert.equal(g2.level, 10);
});

test('存檔：職業往返不變；轉職後的 gameState 經 sanitize 完全相同（冪等）', () => {
  for (const job of ['assassin', 'bandit']) {
    const gs = createInitialGameState();
    debugSetJob(gs, job, 24);
    gs.skillLevels[JOBS[job].pool[3]] = 4;
    const res = parseSave(serializeSave(gs));
    assert.ok(res.ok);
    assert.equal(res.state.job, job);
    assert.equal(res.state.title, JOBS[job].title);
    assert.deepEqual(res.state.unlockedSkills, JOBS[job].pool);
    assert.equal(res.state.skillLevels[JOBS[job].pool[3]], 4);
    assert.deepEqual(sanitizeState(res.state), res.state);
  }
});

test('sanitize：未知職業 → 盜賊；未達 Lv.10 不承認轉職；title 由職業決定', () => {
  assert.equal(sanitizeState({ job: 'wizard', level: 20 }).job, 'thief');
  assert.equal(sanitizeState({ job: ['assassin'], level: 20 }).job, 'thief');
  assert.equal(sanitizeState({ job: '__proto__', level: 20 }).job, 'thief');
  assert.equal(sanitizeState({ job: 'assassin', level: 9 }).job, 'thief');
  assert.equal(sanitizeState({ job: 'assassin', level: 10 }).job, 'assassin');
  assert.equal(sanitizeState({ job: 'bandit', level: 10, title: '亂寫' }).title, '赤焰劫客');
  assert.equal(sanitizeState({ level: 10 }).job, 'thief');   // 舊存檔沒有 job
});

test('sanitize：技能 id 只認該職業池；池外的 id 被丟棄', () => {
  const s = sanitizeState({
    job: 'assassin', level: 30,
    unlockedSkills: ['Z', 'X', 'C', 'V', 'B', 'whirl', 'backstab'],
    skillLevels: { Z: 2, V: 9, B: 9, whirl: 9, backstab: 3, hack: 5 },
  });
  assert.deepEqual(Object.keys(s.skillLevels), JOBS.assassin.pool);
  assert.equal(s.skillLevels.V, undefined);
  assert.equal(s.skillLevels.whirl, undefined);
  assert.equal(s.skillLevels.backstab, 3);
  assert.ok(!s.unlockedSkills.includes('V'));
  assert.ok(!s.unlockedSkills.includes('whirl'));
  assert.ok(s.unlockedSkills.includes('backstab'));
  assert.ok(!s.unlockedSkills.includes('poison'));   // 沒有存檔紀錄也沒等級 → 不解鎖
});

test('sanitize：專屬技能受等級門檻限制', () => {
  const s = sanitizeState({
    job: 'bandit', level: 14,
    unlockedSkills: ['X', 'V', 'B', 'whirl', 'steal', 'smoke'],
    skillLevels: { X: 1, V: 1, B: 1, whirl: 1, steal: 10, smoke: 10 },
  });
  assert.deepEqual(s.unlockedSkills, ['X', 'V', 'B', 'whirl']);
  assert.equal(s.skillLevels.steal, 0);
  assert.equal(s.skillLevels.smoke, 0);
});

test('sanitize：技能欄位必須來自該職業池、已解鎖、不重複；可自訂的條件是解鎖數 > 4', () => {
  const base = { job: 'bandit', level: 24, unlockedSkills: JOBS.bandit.pool, skillLevels: { X: 1, V: 1, B: 1, whirl: 1, steal: 1, smoke: 1 } };
  const DEF = ['X', 'V', 'B', 'whirl'];
  assert.deepEqual(sanitizeState({ ...base, skillSlots: ['smoke', 'steal', 'whirl', 'X'] }).skillSlots, ['smoke', 'steal', 'whirl', 'X']);
  assert.deepEqual(sanitizeState({ ...base, skillSlots: ['Z', 'X', 'V', 'B'] }).skillSlots, DEF);   // Z 不在俠盜池
  assert.deepEqual(sanitizeState({ ...base, skillSlots: ['X', 'X', 'V', 'B'] }).skillSlots, DEF);
  assert.deepEqual(sanitizeState({ ...base, skillSlots: ['ATK', 'X', 'V', 'B'] }).skillSlots, DEF);
  // Lv.12：只解鎖 4 個 → 不能自訂
  const early = sanitizeState({ ...base, level: 12, skillSlots: ['whirl', 'X', 'V', 'B'] });
  assert.deepEqual(early.skillSlots, DEF);
  // 未解鎖的技能不能放進欄位（Lv.20：smoke 未解鎖）
  const mid = sanitizeState({ ...base, level: 20, skillSlots: ['smoke', 'X', 'V', 'B'] });
  assert.deepEqual(mid.skillSlots, DEF);
  const mid2 = sanitizeState({ ...base, level: 20, skillSlots: ['steal', 'X', 'V', 'B'] });
  assert.deepEqual(mid2.skillSlots, ['steal', 'X', 'V', 'B']);
});

test('sanitize：jobChoice 只在盜賊時保留，且只能是 assassin / bandit', () => {
  assert.equal(sanitizeState({ jobChoice: 'assassin', level: 10 }).jobChoice, 'assassin');
  assert.equal(sanitizeState({ jobChoice: 'bandit' }).jobChoice, 'bandit');
  assert.equal(sanitizeState({ jobChoice: 'thief' }).jobChoice, null);
  assert.equal(sanitizeState({ jobChoice: 'x' }).jobChoice, null);
  assert.equal(sanitizeState({ job: 'assassin', level: 12, jobChoice: 'bandit' }).jobChoice, null);
});

test('poseKey：盜賊用舊鍵；轉職用職業前綴；缺圖退回盜賊；都沒有 → null', async () => {
  const { poseKey } = await import('../src/config/poses.js');
  assert.equal(poseKey('thief', 'idle'), 'player_idle');
  assert.equal(poseKey('assassin', 'idle'), 'player_assassin_idle');
  assert.equal(poseKey('bandit', 'spin_1'), 'player_bandit_spin_1');
  const have = new Set(['player_idle', 'player_slash_1', 'player_bandit_idle']);
  const exists = (k) => have.has(k);
  assert.equal(poseKey('bandit', 'idle', exists), 'player_bandit_idle');
  assert.equal(poseKey('bandit', 'slash_1', exists), 'player_slash_1');       // 缺圖 → 盜賊
  assert.equal(poseKey('assassin', 'backstab', exists), null);                // 盜賊也沒有
  assert.equal(poseKey('thief', 'nope', exists), null);
  assert.equal(poseKey(undefined, 'idle', exists), 'player_idle');
});

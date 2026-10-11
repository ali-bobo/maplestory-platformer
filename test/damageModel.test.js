// 技能平衡模型：把「職業專屬技能值得裝、普攻要比盜賊強」這些設計意圖寫成斷言。
import test from 'node:test';
import assert from 'node:assert/strict';
import { JOBS } from '../src/config/constants.js';
import {
  skillProfile, basicProfile, balanceTable, secondsUntilDry, critStats, critFactor,
} from '../src/engine/damageModel.js';

const INHERITED = { assassin: ['Z', 'X', 'C'], bandit: ['X', 'V', 'B'] };
const EXCLUSIVE = { assassin: ['backstab', 'poison', 'mark'], bandit: ['whirl', 'steal', 'smoke'] };
const maxMpAt = (lv) => 250 + 12 * (lv - 1);

test('名義倍率與命中數：由 SKILL_MODEL 算出，和設計文件一致', () => {
  const z = skillProfile('thief', 'Z');
  assert.equal(z.hits, 3);
  assert.ok(Math.abs(z.nominal - 3.6) < 1e-9);
  const c = skillProfile('thief', 'C');
  assert.ok(Math.abs(c.nominal - (0.8 * 2 + 1.9)) < 1e-9);
  const back = skillProfile('assassin', 'backstab');
  assert.equal(back.hits, 3);
  assert.ok(Math.abs(back.nominal - 4.35) < 1e-9);
  // 毒鏢 = 1 發飛鏢 + 6 跳毒（毒不暴擊）
  const p = skillProfile('assassin', 'poison');
  assert.equal(p.hits, 7);
  assert.ok(Math.abs(p.nominal - (1.2 + 6 * 0.65)) < 1e-9);
  // 技能等級：每級 +12%
  assert.ok(Math.abs(skillProfile('assassin', 'backstab', 6).nominal / back.nominal - 1.6) < 1e-9);
  // 不在該職業池內 → null
  assert.equal(skillProfile('assassin', 'whirl'), null);
});

test('暴擊模型：刺客被動讓期望倍率明顯高於盜賊', () => {
  const t = critStats('thief');
  const a = critStats('assassin');
  assert.ok(a.rate > t.rate && a.multi > t.multi);
  assert.ok(critFactor(a.rate, a.multi) >= critFactor(t.rate, t.multi) * 1.15);
});

test('普通攻擊：轉職後的普攻 DPS 至少比盜賊普攻高 30%', () => {
  const thief = basicProfile('thief');
  for (const job of ['assassin', 'bandit']) {
    const b = basicProfile(job);
    assert.ok(b.dps >= thief.dps * 1.3, `${job} ${b.dps.toFixed(2)} vs thief ${thief.dps.toFixed(2)}`);
  }
  // 俠盜範圍比盜賊寬；刺客單體 DPS 略高於俠盜（俠盜靠範圍與擊飛）
  assert.ok(basicProfile('bandit').range > thief.range);
  assert.ok(basicProfile('assassin').dps >= basicProfile('bandit').dps);
});

test('專屬技能每 MP 傷害 ≥ 同職業繼承技能（補招 Z 除外）', () => {
  for (const job of ['assassin', 'bandit']) {
    const inherited = INHERITED[job].filter((id) => id !== 'Z').map((id) => skillProfile(job, id));
    const bestInherited = Math.max(...inherited.map((p) => p.perMp));
    for (const id of EXCLUSIVE[job]) {
      const p = skillProfile(job, id);
      assert.ok(p.perMp >= bestInherited, `${job}.${id} perMp ${p.perMp.toFixed(3)} < ${bestInherited.toFixed(3)}`);
    }
  }
});

test('傷害型專屬技能每冷卻秒傷害 ≥ 同職業繼承的爆發技能', () => {
  const damaging = { assassin: ['backstab', 'poison', 'mark'], bandit: ['whirl'] };
  for (const job of ['assassin', 'bandit']) {
    const bursts = INHERITED[job].map((id) => skillProfile(job, id)).filter((p) => p.role === 'burst');
    const best = Math.max(...bursts.map((p) => p.perCdSustained));
    for (const id of damaging[job]) {
      const p = skillProfile(job, id);
      assert.ok(p.perCdSustained >= best, `${job}.${id} ${p.perCdSustained.toFixed(2)} < ${best.toFixed(2)}`);
    }
  }
});

test('職業定位：刺客單體爆發 / 持續傷害；俠盜範圍與經濟', () => {
  // 刺客：瞬影連刺單體傷害高於暗殺；毒鏢持續施放的每秒傷害最高的單體 DoT
  assert.ok(skillProfile('assassin', 'backstab').expected > skillProfile('assassin', 'C').expected);
  assert.ok(skillProfile('assassin', 'poison').perCdSustained > skillProfile('assassin', 'C').perCd);
  // 斷命印記的增傷價值 ≥ 一次瞬影連刺的 2 倍（它是打 Boss 的放大器）
  assert.ok(skillProfile('assassin', 'mark').expected >= skillProfile('assassin', 'backstab').expected * 2);
  // 俠盜：赤月迴旋打 3 隻的總傷害遠高於單體技；妙手空空 MP 淨成本比標示低
  const whirl = skillProfile('bandit', 'whirl');
  assert.ok(whirl.area >= whirl.expected * 3 - 1e-9);
  const steal = skillProfile('bandit', 'steal');
  assert.ok(steal.netMp < steal.mp);
  // 迷煙彈除了防禦還有可觀的持續傷害（打 3 隻 ≥ 一次三連飛鏢）
  assert.ok(skillProfile('bandit', 'smoke').area >= skillProfile('thief', 'Z').expected);
});

test('MP 經濟：技能輪流施放撐得過 10 秒，但不能無限放；補招 Z 連放會見底', () => {
  // 刺客 Lv.12（第一個專屬技能）：Z X C backstab 全都冷卻一好就放
  const slots = JOBS.assassin.defaultSlots;
  const rotation = slots.filter((id) => id !== 'Z');
  const t1 = secondsUntilDry('assassin', rotation, maxMpAt(12));
  assert.ok(t1 > 10 && t1 < 60, `assassin rotation ${t1}`);
  assert.ok(secondsUntilDry('assassin', slots, maxMpAt(12)) < 15);   // 連 Z 一起連放：很快見底
  // 俠盜 Lv.12：X V B whirl
  const t2 = secondsUntilDry('bandit', JOBS.bandit.defaultSlots, maxMpAt(12));
  assert.ok(t2 > 10 && t2 < 60, `bandit rotation ${t2}`);
  // Lv.24 的刺客配 C backstab poison mark
  const t3 = secondsUntilDry('assassin', ['C', 'backstab', 'poison', 'mark'], maxMpAt(24));
  assert.ok(t3 > 10 && t3 < 60, `assassin lv24 ${t3}`);
});

test('balanceTable：技能池內每個技能都有數字，且 MP、冷卻皆為正', () => {
  for (const job of ['thief', 'assassin', 'bandit']) {
    const rows = balanceTable(job);
    assert.equal(rows.length, JOBS[job].pool.length);
    for (const r of rows) assert.ok(r.mp > 0 && r.cd > 0 && r.expected > 0, `${job}.${r.id}`);
  }
});

test('試煉守衛血量：Lv10 盜賊用「普攻 + 三連飛鏢」的理論擊殺時間在 30～90 秒（實測 e2e/trial.cjs 約 37～55 秒）', async () => {
  const { MONSTERS } = await import('../src/config/monsters.js');
  const { DUNGEONS } = await import('../src/config/dungeons.js');
  const g = MONSTERS.find((m) => m.id === 'shadow_guardian');
  const atk = 70 + 5 * 9;                       // Lv10 盜賊
  const maxMp = 250 + 12 * 9;
  const z = skillProfile('thief', 'Z');
  const basicDps = basicProfile('thief').dps * atk;
  const zPerMp = (z.expected / z.mp) * atk;     // 每 MP 的傷害
  // 時間 T 內的總傷害 = 普攻 + 三連飛鏢（MP 池 + 每秒回 10）
  const dmg = (t) => basicDps * t + zPerMp * (maxMp + 10 * t);
  let t = 0; while (dmg(t) < g.hp && t < 600) t += 0.5;
  assert.ok(t >= 30 && t <= 90, `理論擊殺時間 ${t}s（hp ${g.hp}）`);
  assert.ok(DUNGEONS.shadow_trial.timeLimit >= t * 1.5, '限時至少留 1.5 倍的餘裕');
});

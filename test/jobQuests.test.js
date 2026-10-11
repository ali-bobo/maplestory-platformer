// 轉職任務鏈的純邏輯：任務可接條件、任務物品掉落、NPC 對話內容、存檔驗證
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../src/config/constants.js';
import { questAvailable, questItemDrop } from '../src/engine/questManager.js';
import { buildNpcDialog, JOB_CHOICES } from '../src/engine/npcDialog.js';
import { sanitizeState } from '../src/engine/saveManager.js';
import { MAPS } from '../src/config/maps.js';
import { QUESTS } from '../src/config/quests.js';

function gsWith(level, active = [], completed = []) {
  const gs = createInitialGameState();
  gs.level = level;
  gs.quests = { active: active.map((id) => ({ id, progress: 0 })), completed: [...completed] };
  return gs;
}

test('questAvailable：等級、前置任務、已接 / 已完成', () => {
  assert.equal(questAvailable(gsWith(9), 'job_call'), false);          // Lv.9 不能接
  assert.equal(questAvailable(gsWith(10), 'job_call'), true);
  assert.equal(questAvailable(gsWith(10, ['job_call']), 'job_call'), false);      // 已接
  assert.equal(questAvailable(gsWith(10, [], ['job_call']), 'job_call'), false);  // 已完成
  assert.equal(questAvailable(gsWith(10), 'job_choose'), false);       // 前置沒完成
  assert.equal(questAvailable(gsWith(10, [], ['job_call']), 'job_choose'), true);
  assert.equal(questAvailable(gsWith(10, [], ['job_call', 'job_choose']), 'job_proof'), true);
  assert.equal(questAvailable(gsWith(10, [], ['job_call', 'job_choose', 'job_proof']), 'job_trial'), true);
  assert.equal(questAvailable(gsWith(10, [], ['job_call', 'job_choose', 'job_proof']), 'job_awaken'), false);
  assert.equal(questAvailable(gsWith(1), 'slime_hunt'), true);         // 舊任務不受影響
  assert.equal(questAvailable(gsWith(1), 'nope'), false);
  assert.equal(questAvailable(null, 'slime_hunt'), false);
});

test('questItemDrop：只在收集任務進行中、指定地圖、沒收滿、骰過掉落率時掉', () => {
  const rate = QUESTS.job_proof.collect.dropRate;
  const gs = gsWith(10, ['job_proof']);
  assert.equal(questItemDrop(gs, 'henesys', rate - 0.001), 'trial_token');
  assert.equal(questItemDrop(gs, 'henesys', rate), null);               // 沒骰過
  assert.equal(questItemDrop(gs, 'kerning', 0), null);                  // 不在指定地圖
  assert.equal(questItemDrop(gsWith(10), 'henesys', 0), null);          // 沒接任務
  gs.quests.active[0].progress = 5;
  assert.equal(questItemDrop(gs, 'henesys', 0), null);                  // 已收滿
  assert.equal(questItemDrop(gsWith(10, ['slime_hunt']), 'sky', 0), null);   // 擊殺任務不掉物品
  assert.equal(questItemDrop(null, 'sky', 0), null);
});

test('buildNpcDialog：一般 NPC 用地圖資料的對話；沒有 dialog 用預設', () => {
  const merchant = MAPS.town.npcs.find((n) => n.shop);
  const d = buildNpcDialog(gsWith(1), merchant);
  assert.deepEqual(d.lines, merchant.dialog);
  assert.equal(d.choices, null);
  assert.ok(buildNpcDialog(gsWith(1), {}).lines.length > 0);
});

test('buildNpcDialog：城鎮居民在影之召喚進行時轉交神祕信', () => {
  const townsfolk = MAPS.town.npcs.find((n) => n.jobLetter);
  assert.ok(buildNpcDialog(gsWith(10, ['job_call']), townsfolk).lines.join('').includes('影之長老'));
  assert.deepEqual(buildNpcDialog(gsWith(10), townsfolk).lines, townsfolk.dialog);
});

test('buildNpcDialog：影之長老依任務進度換內容，只有「選擇你的道路」有選項', () => {
  const elder = MAPS.shrine.npcs.find((n) => n.role === 'jobAdvisor');
  const lowLv = buildNpcDialog(gsWith(5), elder);
  assert.ok(lowLv.lines.join('').includes('Lv.10') && lowLv.choices === null);
  const choose = buildNpcDialog(gsWith(10, ['job_choose'], ['job_call']), elder);
  assert.deepEqual(choose.choices, JOB_CHOICES);
  assert.deepEqual(choose.choices.map((c) => c.id), ['assassin', 'bandit']);
  assert.ok(choose.choices.every((c) => c.label.length > 0));
  const g1 = gsWith(10, ['job_proof'], ['job_call', 'job_choose']); g1.jobChoice = 'bandit';
  g1.quests.active[0].progress = 3;
  const proof = buildNpcDialog(g1, elder);
  assert.equal(proof.choices, null);
  assert.ok(proof.lines.join('').includes('3/5') && proof.lines.join('').includes('赤焰劫客'));
  assert.ok(buildNpcDialog(gsWith(10, ['job_trial'], ['job_call', 'job_choose', 'job_proof']), elder).lines.join('').includes('影之試煉'));
  const done = gsWith(12, [], ['job_call', 'job_choose', 'job_proof', 'job_trial', 'job_awaken']);
  done.job = 'assassin';
  assert.ok(buildNpcDialog(done, elder).lines.join('').includes('暗夜之刃'));
});

test('sanitize：新任務類型的進度夾在 count 內；未知任務被丟棄', () => {
  const s = sanitizeState({
    level: 10,
    quests: {
      active: [{ id: 'job_proof', progress: 99 }, { id: 'job_trial', progress: 5 }, { id: 'job_nope', progress: 1 }],
      completed: ['job_call', 'job_choose'],
    },
  });
  assert.deepEqual(s.quests.active, [{ id: 'job_proof', progress: 5 }, { id: 'job_trial', progress: 1 }]);
  assert.deepEqual(s.quests.completed, ['job_call', 'job_choose']);
});

test('任務鏈完整走一遍（假場景）：對話 → 選職業 → 收集 → 副本 → 覺醒 → 轉職', async () => {
  const qm = await import('../src/engine/questManager.js');
  const gs = createInitialGameState();
  gs.level = 10;
  const emitted = [];
  const scene = {
    mapKey: 'town',
    registry: { get: () => gs, set() {}, events: { emit() {} } },
    events: { emit: (name, ...a) => emitted.push([name, ...a]) },
  };
  // 還不能接：前置沒完成
  assert.equal(qm.acceptQuest(scene, 'job_choose'), false);
  assert.equal(qm.acceptQuest(scene, 'job_call'), true);
  qm.onNpcTalked(scene, 'someone_else');
  assert.equal(qm.isQuestActive(scene, 'job_call'), true);     // 對錯人不算
  qm.onNpcTalked(scene, 'shadow_elder');
  assert.equal(qm.isQuestCompleted(scene, 'job_call'), true);
  // 選擇：沒接任務前選不了；非法職業被拒
  assert.equal(qm.chooseJobPath(scene, 'bandit'), false);
  assert.equal(qm.acceptQuest(scene, 'job_choose'), true);
  assert.equal(qm.chooseJobPath(scene, 'thief'), false);
  assert.equal(qm.chooseJobPath(scene, 'wizard'), false);
  assert.equal(qm.chooseJobPath(scene, 'assassin'), true);
  assert.equal(gs.jobChoice, 'assassin');
  assert.equal(qm.isQuestCompleted(scene, 'job_choose'), true);
  // 收集：5 個才完成，多的不會超過
  assert.equal(qm.acceptQuest(scene, 'job_proof'), true);
  for (let i = 0; i < 4; i++) qm.onItemCollected(scene, 'trial_token');
  assert.equal(qm.isQuestCompleted(scene, 'job_proof'), false);
  qm.onItemCollected(scene, 'trial_token');
  qm.onItemCollected(scene, 'trial_token');
  assert.equal(qm.isQuestCompleted(scene, 'job_proof'), true);
  assert.equal(gs.quests.completed.filter((id) => id === 'job_proof').length, 1);
  // 副本：通關別的副本不算
  assert.equal(qm.acceptQuest(scene, 'job_trial'), true);
  qm.onDungeonCleared(scene, 'slime_cave');
  assert.equal(qm.isQuestCompleted(scene, 'job_trial'), false);
  qm.onDungeonCleared(scene, 'shadow_trial');
  assert.equal(qm.isQuestCompleted(scene, 'job_trial'), true);
  // 覺醒：轉職、清掉 jobChoice、發出 job-changed
  assert.equal(gs.job, 'thief');
  assert.equal(qm.acceptQuest(scene, 'job_awaken'), true);
  qm.onNpcTalked(scene, 'shadow_elder');
  assert.equal(gs.job, 'assassin');
  assert.equal(gs.title, '暗夜之刃');
  assert.equal(gs.jobChoice, null);
  assert.ok(gs.skillPoints >= 5);
  assert.deepEqual(emitted.filter(([n]) => n === 'job-changed'), [['job-changed', 'assassin', {}]]);
  assert.equal(gs.quests.active.length, 0);
});

test('覺醒沒有選過職業（jobChoice 為空）時不會轉職', async () => {
  const qm = await import('../src/engine/questManager.js');
  const gs = createInitialGameState();
  gs.level = 10;
  gs.quests = { active: [], completed: ['job_call', 'job_choose', 'job_proof', 'job_trial'] };
  const scene = { mapKey: 'town', registry: { get: () => gs, set() {}, events: { emit() {} } }, events: { emit() {} } };
  assert.equal(qm.acceptQuest(scene, 'job_awaken'), true);
  qm.onNpcTalked(scene, 'shadow_elder');
  assert.equal(gs.job, 'thief');
});

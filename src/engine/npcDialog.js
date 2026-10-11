// NPC 對話內容（純邏輯、不依賴 Phaser）。
// 一般 NPC 直接用地圖資料裡的 dialog；影之長老（role: 'jobAdvisor'）依轉職任務進度換內容，
// 「選擇你的道路」那一步附兩個選項（choices），由 BaseMapScene 畫成按鈕。
//
// 回傳 { lines: string[], choices: [{ id, label }] | null }

import { JOBS } from '../config/constants.js';
import { TRIAL_ITEM_NAME } from '../config/quests.js';

const DEFAULT_LINES = [
  '歡迎光臨！勇士請多保重。',
  '這裡的怪物最近鬧得很兇...',
  '你可以在這裡購買補給品。',
];

export const JOB_CHOICES = [
  { id: 'assassin', label: `${JOBS.assassin.title}（${JOBS.assassin.name}）` },
  { id: 'bandit',   label: `${JOBS.bandit.title}（${JOBS.bandit.name}）` },
];

export function buildNpcDialog(gs, npcDef) {
  const lines = npcDef.dialog || DEFAULT_LINES;
  const qs = (gs && gs.quests) || { active: [], completed: [] };
  const activeEntry = (id) => qs.active.find((q) => q.id === id);
  const done = (id) => qs.completed.includes(id);

  // 城鎮居民：Lv.10 後轉交神祕信（影之召喚進行中時多一段話）
  if (npcDef.jobLetter && activeEntry('job_call')) {
    return {
      lines: ['有你的信！「影之長老在影之殿堂等你」，', '從鎮上最右邊的傳送門進去，快去找她吧。', ...lines],
      choices: null,
    };
  }

  // 技能導師：依目前職業 / SP 補一行提醒（沒有重置功能，只提示怎麼加點）
  if (npcDef.role === 'skillMentor') {
    const sp = (gs && gs.skillPoints) || 0;
    const extra = gs && gs.job === 'thief' && gs.level < 10
      ? '到 Lv.10 可以找影之長老轉職，會多出新的專屬技能。'
      : sp > 0 ? `你還有 ${sp} 點 SP 沒有用，快去升級技能吧。` : '你的 SP 都花完了，繼續升級會再拿到新的點數。';
    return { lines: [...lines, extra], choices: null };
  }

  if (npcDef.role !== 'jobAdvisor') return { lines, choices: null };

  // ── 影之長老 ────────────────────────────────────────────────────────────
  const job = JOBS[gs && JOBS[gs.job] ? gs.job : 'thief'];
  if (job.id !== 'thief') {
    return { lines: [`${job.title}……你已走上「${job.name}」的道路。`, '星光會指引你，去吧。'], choices: null };
  }
  if (activeEntry('job_choose')) {
    return {
      lines: [
        '你終於來了，孩子。影子裡藏著兩條路：',
        `「${JOBS.assassin.title}」隱身暗處、一擊必殺；`,
        `「${JOBS.bandit.title}」揮舞彎刀、衝進敵群。請選一條。`,
      ],
      choices: JOB_CHOICES,
    };
  }
  const proof = activeEntry('job_proof');
  if (proof) {
    return { lines: [`你選了「${JOBS[gs.jobChoice]?.title || '…'}」之路。`, `去打倒怪物，帶回 5 個${TRIAL_ITEM_NAME}（${proof.progress}/5）。`], choices: null };
  }
  if (activeEntry('job_trial')) {
    return { lines: ['證物齊了。接下來是最後的考驗，', '從殿堂右端的傳送門進入「影之試煉」，', '在限時內擊敗試煉守衛。'], choices: null };
  }
  if (activeEntry('job_awaken')) {
    return { lines: ['你通過了試煉，覺醒的時刻到了。'], choices: null };
  }
  if (!done('job_call') && !activeEntry('job_call')) {
    return {
      lines: gs && gs.level >= 10
        ? ['你身上有星光的氣息……', '去找鎮上的居民，他有東西要交給你。']
        : ['影子會在你足夠強大時找上你。', '到 Lv.10 再來吧。'],
      choices: null,
    };
  }
  return { lines, choices: null };
}

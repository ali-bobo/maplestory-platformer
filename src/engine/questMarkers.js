// NPC 頭上的任務標記狀態（純邏輯、不依賴 Phaser）。
// 回傳要顯示的貼圖 key，或 null（這個 NPC 目前沒有任務可言）。
//   ui_quest_done  金色 ?：有進行中的任務等著對這個 NPC 說話 / 選擇（交付、覺醒）
//   ui_quest_mark  !：這個 NPC 有可以接的新任務
//   ui_quest_ing   灰色 ?：這個 NPC 發的任務正在進行
// 優先序 done > mark > ing。任務在進度滿時自動完成，沒有獨立的交件步驟，所以 done 只出現在 talk / choice 型。

import { getQuestDef } from '../config/quests.js';
import { questAvailable } from './questManager.js';

export const QUEST_MARK_KEYS = { available: 'ui_quest_mark', inProgress: 'ui_quest_ing', ready: 'ui_quest_done' };

export function npcQuestMarker(gs, npcDef) {
  if (!gs || !gs.quests || !npcDef) return null;
  const ids = Array.isArray(npcDef.questIds) ? npcDef.questIds : [];
  let inProgress = false;

  for (const entry of gs.quests.active) {
    const def = getQuestDef(entry.id);
    if (!def) continue;
    if ((def.type === 'talk' || def.type === 'choice') && npcDef.npcId && def.target === npcDef.npcId) {
      return QUEST_MARK_KEYS.ready;
    }
    if (ids.includes(entry.id)) inProgress = true;
  }
  if (ids.some((id) => questAvailable(gs, id))) return QUEST_MARK_KEYS.available;
  return inProgress ? QUEST_MARK_KEYS.inProgress : null;
}

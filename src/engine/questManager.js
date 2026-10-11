// 任務追蹤管理（Phase 13 MVP）
//
// 提供：
//  - acceptQuest(scene, questId)：把任務加入 gameState.quests.active
//  - onMonsterKilled(scene, monsterId)：推進 'kill' 型任務進度
//  - onMapEntered(scene, mapKey)：推進 'reach' 型任務進度
//  - onNpcTalked / onItemCollected / onDungeonCleared：推進 'talk' / 'collect' / 'dungeon' 型任務
//  - chooseJobPath(scene, jobId)：轉職選擇（完成 'choice' 型任務）
//  - completeQuest(scene, questId)：發獎勵 + 移到 completed；轉職任務完成時套用新職業
//
// 完成時透過 scene.events.emit('quest-progress' / 'quest-completed' / 'job-changed') 通知 UI / 場景

import { getQuestDef, QUESTS } from '../config/quests.js';
import { applyJobChange } from './jobChange.js';

// 取得 gameState.quests（容錯：若舊存檔沒這欄就初始化）
function getQuestState(scene) {
  const gs = scene.registry.get('gameState');
  if (!gs) return null;
  if (!gs.quests) gs.quests = { active: [], completed: [] };
  return gs.quests;
}

// 任務是否已接受（active）
export function isQuestActive(scene, questId) {
  const qs = getQuestState(scene);
  return !!qs && qs.active.some((q) => q.id === questId);
}

// 任務是否已完成
export function isQuestCompleted(scene, questId) {
  const qs = getQuestState(scene);
  return !!qs && qs.completed.includes(questId);
}

// 純資料版：這個任務現在能不能接（沒接過、沒完成、等級夠、前置任務都完成了）
export function questAvailable(gs, questId) {
  const def = getQuestDef(questId);
  if (!def || !gs || !gs.quests) return false;
  const qs = gs.quests;
  if (qs.completed.includes(questId) || qs.active.some((q) => q.id === questId)) return false;
  if (def.minLevel && gs.level < def.minLevel) return false;
  return (def.requires || []).every((id) => qs.completed.includes(id));
}

// 接受任務（重複接會被忽略；等級不足或前置任務沒完成也不能接）
export function acceptQuest(scene, questId) {
  const def = getQuestDef(questId);
  if (!def) return false;
  const qs = getQuestState(scene);
  if (!qs) return false;
  if (isQuestActive(scene, questId) || isQuestCompleted(scene, questId)) return false;
  if (!questAvailable(scene.registry.get('gameState'), questId)) return false;
  qs.active.push({ id: questId, progress: 0 });
  scene.events.emit('quest-accepted', def);
  // 抵達型任務一加入就檢查目前地圖（玩家可能已在目標地圖）
  if (def.type === 'reach' && def.target === scene.mapKey) {
    onMapEntered(scene, scene.mapKey);
  }
  return true;
}

// 推進任務進度的通用函式
function advance(scene, questId, delta = 1) {
  const qs = getQuestState(scene);
  if (!qs) return;
  const entry = qs.active.find((q) => q.id === questId);
  const def = getQuestDef(questId);
  if (!entry || !def) return;
  entry.progress = Math.min(def.count, entry.progress + delta);
  scene.events.emit('quest-progress', { def, progress: entry.progress });
  if (entry.progress >= def.count) {
    completeQuest(scene, questId);
  }
}

// 怪物擊殺事件：推進所有匹配 monsterId 的 'kill' 任務
export function onMonsterKilled(scene, monsterId) {
  const qs = getQuestState(scene);
  if (!qs) return;
  for (const entry of qs.active) {
    const def = getQuestDef(entry.id);
    if (def && def.type === 'kill' && def.target === monsterId) {
      advance(scene, entry.id, 1);
    }
  }
}

// 地圖進入事件：推進所有匹配 mapKey 的 'reach' 任務
export function onMapEntered(scene, mapKey) {
  const qs = getQuestState(scene);
  if (!qs) return;
  for (const entry of qs.active) {
    const def = getQuestDef(entry.id);
    if (def && def.type === 'reach' && def.target === mapKey) {
      advance(scene, entry.id, 1);
    }
  }
}

// 推進指定類型 + 目標的任務（talk / collect / dungeon 共用）
function advanceByTarget(scene, type, target, delta = 1) {
  const qs = getQuestState(scene);
  if (!qs) return;
  for (const entry of qs.active.slice()) {   // advance 可能在迴圈中完成任務並改動 active，所以走複本
    const def = getQuestDef(entry.id);
    if (def && def.type === type && def.target === target) advance(scene, entry.id, delta);
  }
}

// 和 NPC 說話（target = NPC 的 npcId）
export function onNpcTalked(scene, npcId) {
  if (npcId) advanceByTarget(scene, 'talk', npcId);
}

// 拿到任務物品（試煉之證等）
export function onItemCollected(scene, itemId, n = 1) {
  advanceByTarget(scene, 'collect', itemId, n);
}

// 通關副本
export function onDungeonCleared(scene, dungeonId) {
  advanceByTarget(scene, 'dungeon', dungeonId);
}

// 純資料版：怪物死亡時是否掉任務物品。回傳 itemId 或 null（rand 為 [0,1) 隨機數）
// 條件：有進行中的 collect 任務、目前地圖在任務指定的地圖內、還沒收滿、骰過掉落率
export function questItemDrop(gs, mapKey, rand) {
  if (!gs || !gs.quests) return null;
  for (const entry of gs.quests.active) {
    const def = getQuestDef(entry.id);
    if (!def || def.type !== 'collect' || !def.collect) continue;
    if (!def.collect.maps.includes(mapKey) || entry.progress >= def.count) continue;
    if (rand < def.collect.dropRate) return def.target;
  }
  return null;
}

// 轉職選擇：記下選定的職業並完成「選擇你的道路」。回傳是否成功
export function chooseJobPath(scene, jobId) {
  const gs = scene.registry.get('gameState');
  if (!gs || (jobId !== 'assassin' && jobId !== 'bandit')) return false;
  const qs = getQuestState(scene);
  if (!qs || !qs.active.some((q) => q.id === 'job_choose')) return false;
  gs.jobChoice = jobId;
  scene.registry.set('gameState', gs);
  advanceByTarget(scene, 'choice', QUESTS.job_choose.target);
  return true;
}

// 完成任務：發獎勵 + 從 active 移除、加到 completed
export function completeQuest(scene, questId) {
  const def = getQuestDef(questId);
  const qs = getQuestState(scene);
  if (!def || !qs) return;
  const idx = qs.active.findIndex((q) => q.id === questId);
  if (idx < 0) return;
  qs.active.splice(idx, 1);
  qs.completed.push(questId);

  // 發獎勵（透過 registry events 讓 HUD 更新）
  const gs = scene.registry.get('gameState');
  if (gs) {
    if (def.rewards?.exp) {
      gs.exp += def.rewards.exp;
      scene.registry.events.emit('changedata-exp', null, gs.exp);
    }
    if (def.rewards?.meso) {
      gs.meso += def.rewards.meso;
      scene.registry.events.emit('changedata-meso', null, gs.meso);
    }
    // 覺醒：依先前選的職業轉職（技能 / 稱號 / SP 在 applyJobChange，演出與存檔由場景處理 job-changed）
    if (def.rewards?.advanceJob && gs.jobChoice && applyJobChange(gs, gs.jobChoice)) {
      scene.registry.set('gameState', gs);
      scene.events.emit('job-changed', gs.job, {});
    }
    scene.registry.set('gameState', gs);
  }
  scene.events.emit('quest-completed', def);
}

// 取得所有 active 任務（含 def + progress），供 UI 顯示
export function getActiveQuests(scene) {
  const qs = getQuestState(scene);
  if (!qs) return [];
  return qs.active.map((entry) => {
    const def = getQuestDef(entry.id);
    return def ? { def, progress: entry.progress } : null;
  }).filter(Boolean);
}

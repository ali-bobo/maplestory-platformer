// 任務追蹤管理（Phase 13 MVP）
//
// 提供：
//  - acceptQuest(scene, questId)：把任務加入 gameState.quests.active
//  - onMonsterKilled(scene, monsterId)：推進 'kill' 型任務進度
//  - onMapEntered(scene, mapKey)：推進 'reach' 型任務進度
//  - completeQuest(scene, questId)：發獎勵 + 移到 completed
//
// 完成時透過 scene.events.emit('quest-progress' / 'quest-completed') 通知 UI

import { getQuestDef } from '../config/quests.js';

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

// 接受任務（重複接會被忽略）
export function acceptQuest(scene, questId) {
  const def = getQuestDef(questId);
  if (!def) return false;
  const qs = getQuestState(scene);
  if (!qs) return false;
  if (isQuestActive(scene, questId) || isQuestCompleted(scene, questId)) return false;
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

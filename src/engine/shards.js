// 星光碎片的資料處理（純邏輯、不依賴 Phaser，方便單元測試）。
// gameState.shards：已取得的碎片 id 陣列（不重複、只含 SHARD_IDS）；
// gameState.towerLit：星光之塔是否已點亮（集滿 5 塊後在塔前互動才會點亮，並解鎖最終 Boss）。

import { SHARDS, SHARD_COUNT, SHARD_IDS, shardForMonster } from '../config/shards.js';
import { titleFor } from '../config/constants.js';

export function shardCount(gs) {
  return gs && Array.isArray(gs.shards) ? gs.shards.length : 0;
}

export function hasShard(gs, shardId) {
  return !!gs && Array.isArray(gs.shards) && gs.shards.includes(shardId);
}

// 這隻怪死亡時該不該掉碎片：是守護者，而且這個存檔還沒拿過
export function shardToDrop(gs, monsterId) {
  const shard = shardForMonster(monsterId);
  return shard && !hasShard(gs, shard.id) ? shard : null;
}

// 取得碎片（撿起時呼叫）。重複取得、未知 id 都回傳 null 且不改動；成功回傳碎片定義。
// 集滿 5 塊時順便換上「星光守護者」稱號。
export function grantShard(gs, shardId) {
  const shard = SHARDS.find((s) => s.id === shardId);
  if (!gs || !shard) return null;
  if (!Array.isArray(gs.shards)) gs.shards = [];
  if (gs.shards.includes(shardId)) return null;
  gs.shards.push(shardId);
  gs.title = titleFor(gs.job, gs.shards.length);
  return shard;
}

export function allShardsCollected(gs) {
  return shardCount(gs) >= SHARD_COUNT;
}

// 點亮星光之塔：集滿 5 塊且尚未點亮才成立。回傳 true = 這次剛點亮（要播演出）
export function lightTower(gs) {
  if (!gs || gs.towerLit || !allShardsCollected(gs)) return false;
  gs.towerLit = true;
  gs.bossUnlocked = true;
  return true;
}

// 星光之塔的對話內容（純文字）：進度、每塊碎片的取得狀態、下一步提示
export function towerLines(gs) {
  const n = shardCount(gs);
  const list = SHARDS.map((s) => `${hasShard(gs, s.id) ? '★' : '☆'} ${s.name}`);
  if (gs && gs.towerLit) {
    return ['星光之塔重新亮了起來。', `星光碎片 ${n}/${SHARD_COUNT}`, '最終決戰的傳送門已在魔君王城開啟，去吧！'];
  }
  if (n >= SHARD_COUNT) {
    return [`星光碎片 ${n}/${SHARD_COUNT}`, '五塊碎片在你手中共鳴……', '把它們放回塔頂吧！'];
  }
  return [`星光碎片 ${n}/${SHARD_COUNT}`, ...list, '擊敗各地區的守護者，取回全部碎片。'];
}

export { SHARD_IDS };

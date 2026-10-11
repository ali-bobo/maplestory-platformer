// 星光碎片主線（docs/WORLD_DESIGN.md 第一節）
//
// 五個區域守護者（小王）各掉落 1 塊星光碎片（100% 掉落、每個存檔只能拿一次）；
// 碎片放回晨曦鎮的星光之塔，集滿 5 塊並點亮塔之後才會開啟通往最終 Boss 的傳送門。
// monsterId 對應 monsters.js 的小王；id 是存進 gameState.shards 的穩定識別字。

export const SHARDS = [
  { id: 'harbor', monsterId: 'pirate_captain',   name: '海盜船長的碎片',   map: 'harbor' },
  { id: 'desert', monsterId: 'sandworm_boss',    name: '沙塵巨蟲的碎片',   map: 'desert' },
  { id: 'snow',   monsterId: 'frost_giant',      name: '冰霜巨人的碎片',   map: 'snow' },
  { id: 'lava',   monsterId: 'lava_dragon',      name: '熔岩龍的碎片',     map: 'lava' },
  { id: 'castle', monsterId: 'fallen_commander', name: '墮落騎士團長的碎片', map: 'castle' },
];

export const SHARD_COUNT = SHARDS.length;
export const SHARD_IDS = SHARDS.map((s) => s.id);
export const SHARD_TEXTURE = 'item-star-shard';

// 這隻怪是不是碎片守護者？是的話回傳碎片定義
export function shardForMonster(monsterId) {
  return SHARDS.find((s) => s.monsterId === monsterId) || null;
}

// 副本定義表（Phase 14 MVP）
//
// 結構：
//  - id, name, desc, minLevel
//  - timeLimit：限時秒數
//  - waves：陣列，每個元素是一波怪物 { monsters: [{id, count}] }
//  - rewards.exp / meso：通關基礎獎勵
//  - timeBonus：剩餘秒數 × 此係數 = 額外 exp
//  - failRewards：失敗時的安慰獎勵
//  - dailyLimit：每日進入次數上限
//  - mapWidth / background：副本場景的視覺設定

export const DUNGEONS = {
  slime_cave: {
    id: 'slime_cave',
    name: '史萊姆洞窟',
    desc: '初心者試煉場。清光三波史萊姆即可通關。',
    minLevel: 1,
    timeLimit: 180, // 3 分鐘
    waves: [
      { monsters: [{ id: 'slime', count: 5 }] },
      { monsters: [{ id: 'slime', count: 6 }, { id: 'shadow-slime', count: 2 }] },
      { monsters: [{ id: 'shadow-slime', count: 4 }, { id: 'mushroom', count: 3 }] },
    ],
    rewards: { exp: 800, meso: 1500 },
    failRewards: { exp: 50, meso: 100 }, // 安慰獎，避免完全白費時間
    timeBonus: 5, // 剩餘秒數 × 5 = 額外 exp
    dailyLimit: 3,
    mapWidth: 1600,
    bgColor: 0x2a1a3a, // 紫暗色洞窟感
    bgImage: 'bg_ruins', // 復用既有背景
  },
};

export function getDungeonDef(id) {
  return DUNGEONS[id] || null;
}

export function listDungeonIds() {
  return Object.keys(DUNGEONS);
}

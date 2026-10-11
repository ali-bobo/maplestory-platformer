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
//  - returnMap（選用）：結算後回到的地圖 key，預設晨曦鎮
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
    bgImage: 'bg_dungeon',
  },
  // 一轉任務「影之試煉」：單波，擊敗試煉守衛（小王）。失敗可重試（次數上限放寬）
  shadow_trial: {
    id: 'shadow_trial',
    name: '影之試煉',
    desc: '轉職試煉。在限時內擊敗試煉守衛。',
    minLevel: 10,
    timeLimit: 150,   // 穩健打法約 45～60 秒；150 秒留給閃躲、補藥與走位的人
    waves: [
      { monsters: [{ id: 'shadow_guardian', count: 1 }, { id: 'shadow-slime', count: 2 }] },
    ],
    rewards: { exp: 700, meso: 1000 },
    failRewards: { exp: 30, meso: 60 },
    timeBonus: 2,
    dailyLimit: 10,
    returnMap: 'shrine',   // 結算後回到影之殿堂（長老在那裡）；沒設就回晨曦鎮
    mapWidth: 1600,
    bgColor: 0x1a1030,
    bgImage: 'bg_dungeon',
  },
};

export function getDungeonDef(id) {
  return DUNGEONS[id] || null;
}

// 任務定義表（Phase 13 / Phase 15 擴充）
//
// 任務類型：
//  - 'kill' 討伐：擊殺 N 隻指定 monsterId（target = monsterId）
//  - 'reach' 抵達：到達指定地圖（target = mapKey）
//
// 進度結構（存於 gameState.quests.active）：
//  { id, progress }  // progress 為當前計數（kill 為已殺數、reach 為 0/1）
//
// 完成時自動發獎勵：exp + meso
//
// 任務「歸屬地圖」：透過 maps.js 中 NPC 的 questIds 欄位指派，玩家對話該 NPC
// 才能接該地圖的任務（避免單一 NPC 接完全部任務）

export const QUESTS = {
  // ── 浮空島嶼（sky）── 由「楓葉義工」發佈 ──────────────────────────────────
  slime_hunt: {
    id: 'slime_hunt',
    name: '史萊姆獵手',
    desc: '清理浮空島嶼的史萊姆。',
    type: 'kill',
    target: 'slime',
    count: 5,
    rewards: { exp: 200, meso: 500 },
  },
  snail_collect: {
    id: 'snail_collect',
    name: '蝸牛採集',
    desc: '幫忙抓 3 隻蝸牛，村民正等著用蝸牛殼。',
    type: 'kill',
    target: 'snail',
    count: 3,
    rewards: { exp: 200, meso: 400 },
  },

  // ── 森林獵場（henesys）── 由「獵人協會員」發佈 ────────────────────────────
  mushroom_hunt: {
    id: 'mushroom_hunt',
    name: '蘑菇危機',
    desc: '森林深處的蘑菇怪變多了，幫忙清理。',
    type: 'kill',
    target: 'mushroom',
    count: 3,
    rewards: { exp: 350, meso: 800 },
  },
  stump_clear: {
    id: 'stump_clear',
    name: '樹樁清除',
    desc: '砍倒擾亂林地的樹樁怪。',
    type: 'kill',
    target: 'stump',
    count: 5,
    rewards: { exp: 300, meso: 600 },
  },

  // ── 古代廢墟（ruins）── 由「廢墟探險家」發佈 ──────────────────────────────
  reach_ruins: {
    id: 'reach_ruins',
    name: '探索古代廢墟',
    desc: '前往北方廢墟一探究竟。',
    type: 'reach',
    target: 'ruins',
    count: 1,
    rewards: { exp: 150, meso: 300 },
  },
  skeleton_purge: {
    id: 'skeleton_purge',
    name: '骷髏淨化',
    desc: '廢墟中的骷髏戰士成群結隊，清除 8 隻。',
    type: 'kill',
    target: 'skeleton',
    count: 8,
    rewards: { exp: 500, meso: 1000 },
  },

  // ── 神秘之境（ellinia）── 由「神秘嚮導」發佈 ──────────────────────────────
  dragon_slayer: {
    id: 'dragon_slayer',
    name: '屠龍勇士',
    desc: '討伐 3 條盤旋於神秘之境的飛龍。',
    type: 'kill',
    target: 'dragon',
    count: 3,
    rewards: { exp: 600, meso: 1200 },
  },
  mimic_buster: {
    id: 'mimic_buster',
    name: '擬態箱獵手',
    desc: '識破並擊破偽裝寶箱的擬態怪。',
    type: 'kill',
    target: 'mimic',
    count: 3,
    rewards: { exp: 500, meso: 1000 },
  },

  // ── 台北都會（taipei）── 由「台北導遊」發佈 ──────────────────────────────
  mech_purge: {
    id: 'mech_purge',
    name: '機械淨化',
    desc: '都會中的失控機械需要被解除。',
    type: 'kill',
    target: 'city_mech',
    count: 4,
    rewards: { exp: 700, meso: 1300 },
  },
  elite_takedown: {
    id: 'elite_takedown',
    name: '精英斬首',
    desc: '台北都會的精英衛兵是更高難度的挑戰。',
    type: 'kill',
    target: 'city_elite',
    count: 2,
    rewards: { exp: 600, meso: 1100 },
  },

  // ── Kerning City（kerning）── 由「地下城嚮導」發佈 ────────────────────────
  thug_cleanup: {
    id: 'thug_cleanup',
    name: '街頭整治',
    desc: '清掃 Kerning City 的城市流氓。',
    type: 'kill',
    target: 'city_thug',
    count: 8,
    rewards: { exp: 800, meso: 1500 },
  },
  beast_hunt: {
    id: 'beast_hunt',
    name: '暗夜獵殺',
    desc: '夜間出沒的暗夜猛獸已威脅居民，討伐 4 隻。',
    type: 'kill',
    target: 'city_beast',
    count: 4,
    rewards: { exp: 700, meso: 1300 },
  },

  // ── 楓葉城（town）── 由「城鎮居民」發佈 ──────────────────────────────────
  reach_town: {
    id: 'reach_town',
    name: '初訪楓葉城',
    desc: '到楓葉城認識城鎮樞紐與商店。',
    type: 'reach',
    target: 'town',
    count: 1,
    rewards: { exp: 100, meso: 200 },
  },
};

// 取得任務定義
export function getQuestDef(id) {
  return QUESTS[id] || null;
}

// 列出所有可接的任務 id（保留給有需要全域查詢的場景；NPC 接任務改走自己的 questIds）
export function listAvailableQuestIds() {
  return Object.keys(QUESTS);
}

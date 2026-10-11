// 任務定義表（Phase 13 / Phase 15 擴充）
//
// 任務類型：
//  - 'kill' 討伐：擊殺 N 隻指定 monsterId（target = monsterId）
//  - 'reach' 抵達：到達指定地圖（target = mapKey）
//  - 'talk' 對話：和指定 NPC 說話（target = NPC 的 npcId）
//  - 'choice' 抉擇：在 NPC 對話選項中做選擇（轉職選職業；完成由 chooseJobPath 觸發）
//  - 'collect' 收集：怪物在指定地圖掉落任務物品（target = itemId，collect.maps / dropRate）
//  - 'dungeon' 副本：通關指定副本（target = dungeonId）
//
// 選用欄位：minLevel（接任務的最低等級）、requires（需先完成的任務 id 陣列，用來串任務鏈）、
// rewards.advanceJob（完成時依 gameState.jobChoice 轉職）
//
// 進度結構（存於 gameState.quests.active）：
//  { id, progress }  // progress 為當前計數（kill 為已殺數、reach 為 0/1）
//
// 完成時自動發獎勵：exp + meso
//
// 任務「歸屬地圖」：透過 maps.js 中 NPC 的 questIds 欄位指派，玩家對話該 NPC
// 才能接該地圖的任務（避免單一 NPC 接完全部任務）

export const QUESTS = {
  // ── 浮空島嶼（sky）── 由「島嶼義工」發佈 ──────────────────────────────────
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
    name: '街頭掃蕩',
    desc: '把在街頭鬧事的龐克飆仔趕出台北都會。',
    type: 'kill',
    target: 'city_mech',
    count: 4,
    rewards: { exp: 700, meso: 1300 },
  },
  elite_takedown: {
    id: 'elite_takedown',
    name: '抓扒手',
    desc: '夜市扒手偷走了攤商的錢，把他們抓起來。',
    type: 'kill',
    target: 'city_elite',
    count: 2,
    rewards: { exp: 600, meso: 1100 },
  },

  // ── 暗巷城（kerning）── 由「地下城嚮導」發佈 ────────────────────────
  thug_cleanup: {
    id: 'thug_cleanup',
    name: '街頭整治',
    desc: '清掃 暗巷城 的城市流氓。',
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

  // ── 碧濤港（harbor）── 由「碼頭工人」「老水手」發佈 ───────────────────────────
  harbor_crabs: {
    id: 'harbor_crabs',
    name: '碼頭清蟹',
    desc: '爬上碼頭的螃蟹把貨物夾壞了，打倒 6 隻螃蟹。',
    type: 'kill',
    target: 'crab',
    count: 6,
    rewards: { exp: 450, meso: 900 },
  },
  harbor_sailor: {
    id: 'harbor_sailor',
    name: '拜訪老水手',
    desc: '碼頭工人說老水手知道幽靈船的事，去和他聊聊。',
    type: 'talk',
    target: 'old_sailor',
    count: 1,
    rewards: { exp: 250, meso: 500 },
  },
  harbor_captain: {
    id: 'harbor_captain',
    name: '擊退海盜船長',
    desc: '老水手拜託你擊敗在碼頭作亂的小王「海盜船長」。',
    type: 'kill',
    target: 'pirate_captain',
    count: 1,
    requires: ['harbor_sailor'],
    rewards: { exp: 1000, meso: 2000 },
  },

  // ── 黃沙遺跡（desert）── 由「考古學家」發佈（商隊領隊是對話對象）──────────────────
  desert_scorpions: {
    id: 'desert_scorpions',
    name: '清掃沙漠蠍',
    desc: '考古隊的營地被沙漠蠍佔了，打倒 8 隻。',
    type: 'kill', target: 'scorpion', count: 8,
    rewards: { exp: 700, meso: 1400 },
  },
  desert_caravan: {
    id: 'desert_caravan',
    name: '拜訪商隊領隊',
    desc: '考古學家說商隊領隊看過沙塵巨蟲的巢穴，去和他聊聊。',
    type: 'talk', target: 'caravan_master', count: 1,
    rewards: { exp: 300, meso: 600 },
  },
  desert_sandworm: {
    id: 'desert_sandworm',
    name: '擊敗沙塵巨蟲',
    desc: '深入遺跡，擊敗守著星光碎片的小王「沙塵巨蟲」。',
    type: 'kill', target: 'sandworm_boss', count: 1,
    requires: ['desert_caravan'],
    rewards: { exp: 2200, meso: 3600 },
  },

  // ── 霜牙峰（snow）── 由「雪原巡守員」發佈（山寺僧侶是對話對象）────────────────────
  snow_wolves: {
    id: 'snow_wolves',
    name: '驅趕冰原狼',
    desc: '成群的冰原狼威脅著山路，打倒 8 隻。小心別在冰上滑進狼群裡。',
    type: 'kill', target: 'icewolf', count: 8,
    rewards: { exp: 1000, meso: 1800 },
  },
  snow_monk: {
    id: 'snow_monk',
    name: '拜訪山寺僧侶',
    desc: '巡守員說山寺僧侶知道冰霜巨人的弱點，去和他聊聊。',
    type: 'talk', target: 'mountain_monk', count: 1,
    rewards: { exp: 350, meso: 700 },
  },
  snow_giant: {
    id: 'snow_giant',
    name: '擊敗冰霜巨人',
    desc: '擊敗守著星光碎片的小王「冰霜巨人」。',
    type: 'kill', target: 'frost_giant', count: 1,
    requires: ['snow_monk'],
    rewards: { exp: 3000, meso: 5000 },
  },

  // ── 熔岩巢穴（lava）── 由「熔爐鐵匠」發佈（礦工是對話對象）──────────────────────
  lava_hounds: {
    id: 'lava_hounds',
    name: '獵殺火焰獵犬',
    desc: '火焰獵犬燒毀了礦坑的木架，打倒 8 隻。',
    type: 'kill', target: 'firehound', count: 8,
    rewards: { exp: 1300, meso: 2200 },
  },
  lava_miner: {
    id: 'lava_miner',
    name: '拜訪礦工',
    desc: '鐵匠說礦工看過熔岩龍醒來的地方，去和他聊聊。',
    type: 'talk', target: 'miner', count: 1,
    rewards: { exp: 400, meso: 800 },
  },
  lava_dragon_hunt: {
    id: 'lava_dragon_hunt',
    name: '討伐熔岩龍',
    desc: '擊敗守著星光碎片的小王「熔岩龍」。',
    type: 'kill', target: 'lava_dragon', count: 1,
    requires: ['lava_miner'],
    rewards: { exp: 4000, meso: 6500 },
  },

  // ── 魔君王城（castle）── 由「被囚的騎士」發佈（幽靈女僕是對話對象）─────────────────
  castle_knights: {
    id: 'castle_knights',
    name: '解放暗黑騎士',
    desc: '被暗影附身的騎士在城裡遊蕩，打倒 8 隻讓他們安息。',
    type: 'kill', target: 'darkknight', count: 8,
    rewards: { exp: 1700, meso: 2800 },
  },
  castle_maid: {
    id: 'castle_maid',
    name: '拜訪幽靈女僕',
    desc: '被囚的騎士說幽靈女僕在城裡待了一輩子，去問問團長的事。',
    type: 'talk', target: 'ghost_maid', count: 1,
    rewards: { exp: 500, meso: 1000 },
  },
  castle_commander: {
    id: 'castle_commander',
    name: '擊敗墮落騎士團長',
    desc: '擊敗守著最後一塊星光碎片的小王「墮落騎士團長」。',
    type: 'kill', target: 'fallen_commander', count: 1,
    requires: ['castle_maid'],
    rewards: { exp: 5500, meso: 9000 },
  },

  // ── 晨曦鎮（town）── 由「城鎮居民」發佈 ──────────────────────────────────
  reach_town: {
    id: 'reach_town',
    name: '初訪晨曦鎮',
    desc: '到晨曦鎮認識城鎮樞紐與商店。',
    type: 'reach',
    target: 'town',
    count: 1,
    rewards: { exp: 100, meso: 200 },
  },
};

// ── 一轉任務鏈（Lv.10）：影之召喚 → 選擇你的道路 → 試煉之證 → 影之試煉 → 覺醒 ────
// 影之長老與影之試煉入口都在「影之殿堂」（晨曦鎮右上角高台的左邊那道金色傳送門，沿階梯跳上去、按 F 進入）。
export const JOB_QUEST_CHAIN = ['job_call', 'job_choose', 'job_proof', 'job_trial', 'job_awaken'];
export const JOB_NPC_ID = 'shadow_elder';
export const TRIAL_ITEM = 'trial_token';
export const TRIAL_ITEM_NAME = '試煉之證';

Object.assign(QUESTS, {
  job_call: {
    id: 'job_call',
    name: '影之召喚',
    desc: '一封神祕的信要你去影之殿堂（晨曦鎮右上角高台的左邊那道金色傳送門，沿階梯跳上去、按 F 進入）找影之長老。',
    type: 'talk', target: JOB_NPC_ID, count: 1,
    minLevel: 10,
    rewards: { exp: 100, meso: 300 },
  },
  job_choose: {
    id: 'job_choose',
    name: '選擇你的道路',
    desc: '影之長老要你選擇：成為「暗夜之刃」刺客，或「赤焰劫客」俠盜。',
    type: 'choice', target: JOB_NPC_ID, count: 1,
    requires: ['job_call'],
    rewards: { exp: 100, meso: 300 },
  },
  job_proof: {
    id: 'job_proof',
    name: '試煉之證',
    desc: '在浮空島嶼、森林獵場或古代廢墟打倒怪物，收集 5 個「試煉之證」。',
    type: 'collect', target: TRIAL_ITEM, count: 5,
    collect: { maps: ['sky', 'henesys', 'ruins'], dropRate: 0.4 },
    requires: ['job_choose'],
    rewards: { exp: 300, meso: 800 },
  },
  job_trial: {
    id: 'job_trial',
    name: '影之試煉',
    desc: '進入影之殿堂右端的影之試煉傳送門，限時擊敗試煉守衛。',
    type: 'dungeon', target: 'shadow_trial', count: 1,
    requires: ['job_proof'],
    rewards: { exp: 500, meso: 1500 },
  },
  job_awaken: {
    id: 'job_awaken',
    name: '覺醒',
    desc: '回到影之長老身邊，領受新的力量。',
    type: 'talk', target: JOB_NPC_ID, count: 1,
    requires: ['job_trial'],
    rewards: { exp: 800, meso: 2000, advanceJob: true },
  },
});

// 取得任務定義
export function getQuestDef(id) {
  return QUESTS[id] || null;
}

// 列出所有可接的任務 id（保留給有需要全域查詢的場景；NPC 接任務改走自己的 questIds）
export function listAvailableQuestIds() {
  return Object.keys(QUESTS);
}

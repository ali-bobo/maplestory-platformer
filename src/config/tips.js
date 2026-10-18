// 載入提示與小知識：載入條下方輪播、死亡結算畫面隨機顯示一則。
// 純資料 + 純函式（亂數由呼叫端注入，方便單元測試）。
// tag：'play' 玩法提示（操作、技能、存檔、死亡、轉職）；'world' 世界觀小知識（對應本作的地圖）。
// 'death' 標記的提示和死亡 / 復活有關，死亡結算畫面優先挑這些。

export const TIPS = Object.freeze([
  // ── 玩法 ──────────────────────────────────────────────────────────────
  { tag: 'play', text: '按 Q 或 ↑ 跳躍，空中再按一次可以二段跳。' },
  { tag: 'play', text: '站在平台上按 ↓ 可以往下穿過薄平台。' },
  { tag: 'play', text: '技能放在 Z X C V 四格，打開技能視窗可以換掉欄位裡的技能。' },
  { tag: 'play', text: '升級獲得的 SP 記得投進最順手的技能，等級越高傷害越痛。' },
  { tag: 'play', text: 'A S D R G 是五種藥水的快捷鍵，血量見紅前就先喝。' },
  { tag: 'play', text: '按 M 打開世界地圖，去過的地圖可以直接傳送；回晨曦鎮、影之殿堂不收金幣。' },
  { tag: 'play', text: '抵達新地圖、升級時會自動存檔，換裝置可以用「存檔代碼」帶走進度。' },
  { tag: 'play', tags: ['death'], text: '倒下後會在同一張地圖重新開始，但身上的裝備會全部遺失。' },
  { tag: 'play', tags: ['death'], text: '打不贏就先回晨曦鎮補給：設定裡也可以把難度調成「簡單」。' },
  { tag: 'play', tags: ['death'], text: '怪物出招前會有預備動作，看到就先跳開或拉開距離。' },
  { tag: 'play', text: '到了 Lv10，去影之殿堂找影之長老，可以轉職成刺客或俠盜。' },
  { tag: 'play', text: '集滿五塊星光碎片，回晨曦鎮點亮星光之塔，通往暗影領域的門才會打開。' },
  // ── 世界觀 ────────────────────────────────────────────────────────────
  { tag: 'world', text: '晨曦鎮是安全的樞紐，怪物從來不敢靠近星光之塔。' },
  { tag: 'world', text: '台北都會的夜市人潮洶湧，小心扒手盯上你的錢包。' },
  { tag: 'world', text: '台北都會的龐克飆仔最愛在街頭鬧事，扒手頭目則躲在巷子深處。' },
  { tag: 'world', text: '暗巷城是通往台北都會的入口，城市特區要 Lv18 才放行。' },
  { tag: 'world', text: '碧濤港的老水手說，海霧濃的晚上別獨自走上高層棧橋。' },
  { tag: 'world', text: '黃沙遺跡的流沙會拖慢腳步，盡量在平台上移動。' },
  { tag: 'world', text: '霜牙峰的冰面很滑，停下來之前要先放開方向鍵。' },
  { tag: 'world', text: '熔岩巢穴的地面發紅就是噴發前兆，趕快跳上平台。' },
  { tag: 'world', text: '魔君王城一片漆黑，只有燭台附近看得清楚。' },
  { tag: 'world', text: '神秘之境藏在森林獵場右上角的高台上，要跳上去按 F 才進得去。' },
]);

function tagsOf(tip) {
  return [tip.tag, ...(tip.tags || [])];
}

/** 依標籤篩選提示；不給標籤回傳全部 */
export function tipsWithTag(tag, list = TIPS) {
  return tag ? list.filter((t) => tagsOf(t).includes(tag)) : list.slice();
}

/**
 * 隨機挑一則提示的索引（在 list 內）。
 *  rng：回傳 [0, 1) 的亂數函式（預設 Math.random）
 *  avoid：上一次的索引，有兩則以上時不會連續挑到同一則
 */
export function pickTipIndex(list = TIPS, rng = Math.random, avoid = -1) {
  const n = list.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  const r = Math.min(0.999999, Math.max(0, Number(rng()) || 0));
  if (avoid >= 0 && avoid < n) {
    const i = Math.floor(r * (n - 1));
    return i >= avoid ? i + 1 : i;
  }
  return Math.floor(r * n);
}

/** 隨機挑一則提示的文字；tag 可限定類別，沒有符合的就從全部挑 */
export function pickTip(rng = Math.random, tag = null) {
  const pool = tipsWithTag(tag);
  const list = pool.length ? pool : TIPS;
  const i = pickTipIndex(list, rng);
  return i < 0 ? '' : list[i].text;
}

/** 輪播器：next() 每次回傳下一則（隨機、不連續重複） */
export function createTipRotator(rng = Math.random, list = TIPS) {
  let last = -1;
  return {
    next() {
      last = pickTipIndex(list, rng, last);
      return last < 0 ? '' : list[last].text;
    },
  };
}

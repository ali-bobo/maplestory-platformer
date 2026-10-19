// 地圖氛圍設定（純資料）：每張地圖的環境粒子、色調、暗角、光束與小彩蛋。
// 實作見 engine/ambience.js；粒子預算與開關的數學在 engine/ambienceLogic.js（有單元測試）。
//
// 欄位：
//  subtitle  進圖標題卡的副標（沒有就不顯示標題卡）
//  wash      背景圖上 / 下緣的色調（乘法染色，只染背景）{ top: [色, 強度], bottom: [色, 強度], pulse: 下緣是否緩慢呼吸 }
//  vignette  暗角強度 0–1（0 / 省略 = 不加；王城已有黑暗視野，不再疊）；暗角與光束只在高品質畫
//  rays      背景光束 { count, tint, alpha }
//  layers    環境粒子層：kind 決定運動方式，count 為同時存在的上限（高品質；中 / 低品質依倍率縮減）
//            front: true 畫在角色前面（量少、淡），否則在背景與跳台之間
//            sf 為視差係數（0 = 黏在畫面上，1 = 跟世界一起捲動）
//  extras    小彩蛋：clouds 雲朵、gulls 海鷗、shootingStar 流星、neon 霓虹光暈、ripples 雨滴漣漪
//
// 每張地圖的 layers count 加總必須 ≤ AMBIENCE_BUDGET（test/ambience.test.js 會檢查）。

export const AMBIENCE_BUDGET = 60;

export const AMBIENCE = {
  sky: {
    subtitle: '雲海之上，花瓣隨風',
    wash: { top: [0xfff1c4, 0.16] },
    vignette: 0.12,
    layers: [
      { kind: 'petal', count: 14, sf: 0.5, tint: [0xffc8de, 0xffffff, 0xffa8c8] },
      { kind: 'petal', count: 5, sf: 1, front: true, tint: [0xffd6e6, 0xffffff], scale: 1.3, alpha: 0.75 },
    ],
    extras: { clouds: 4 },
  },
  forest: {
    subtitle: '林間螢火，獵人的低語',
    wash: { top: [0xffe9a0, 0.10], bottom: [0x0b2a0c, 0.30] },
    vignette: 0.28,
    rays: { count: 3, tint: 0xfff0b0, alpha: 0.16 },
    layers: [
      { kind: 'firefly', count: 16, sf: 0.4, tint: [0xd8ff7a, 0xfff38a] },
      { kind: 'leaf', count: 9, sf: 0.4, tint: [0x7fbf3f, 0xa8c94a, 0xd9a441] },
    ],
  },
  harbor: {
    subtitle: '浪花拍岸，海風帶著鹽味',
    wash: { top: [0xffb070, 0.14], bottom: [0x123a5a, 0.18] },
    vignette: 0.15,
    layers: [
      { kind: 'spray', count: 16, sf: 0.4, tint: [0xffffff, 0xd8f2ff] },
      { kind: 'dust', count: 6, sf: 0.4, tint: [0xfff4e0], alpha: 0.35 },
    ],
    extras: { clouds: 2, gulls: 3 },
  },
  ruins: {
    subtitle: '塵埃裡沉睡的古老文明',
    wash: { top: [0xffe0a0, 0.12], bottom: [0x3a2410, 0.22] },
    vignette: 0.26,
    rays: { count: 2, tint: 0xffe2a8, alpha: 0.14 },
    layers: [
      { kind: 'dust', count: 20, sf: 0.5, tint: [0xffe6b8, 0xfff6dc] },
    ],
  },
  mystic: {
    subtitle: '魔力在空氣中閃爍',
    wash: { top: [0x2a0a5a, 0.22], bottom: [0x7a3cff, 0.14] },
    vignette: 0.26,
    layers: [
      { kind: 'mote', count: 22, sf: 0.4, tint: [0xc58cff, 0x7fe8ff, 0xff9ce8] },
      { kind: 'twinkle', count: 10, sf: 0.2, tint: [0xffffff, 0xd9c2ff] },
    ],
    extras: { shootingStar: true },
  },
  alley: {
    subtitle: '霓虹下的雨夜，小心腳步',
    wash: { top: [0x05051a, 0.28], bottom: [0xff3caa, 0.10] },
    vignette: 0.32,
    layers: [
      { kind: 'rain', count: 40, sf: 0.4, tint: [0xaecbff, 0xd8c8ff] },
    ],
    extras: { ripples: 8, neon: [0xff3caa, 0x3cf0ff] },
  },
  taipei: {
    subtitle: '城市燈火，細雨綿綿',
    wash: { top: [0x0a1030, 0.20], bottom: [0xff5cc8, 0.10] },
    vignette: 0.24,
    layers: [
      { kind: 'rain', count: 28, sf: 0.4, tint: [0xbad6ff], alpha: 0.4 },
      { kind: 'bokeh', count: 10, sf: 0.25, tint: [0xff7ad0, 0x6fe0ff, 0xffd36f] },
    ],
    extras: { ripples: 6, neon: [0x6fe0ff, 0xff7ad0] },
  },
  desert: {
    subtitle: '烈日黃沙，熱浪蒸騰',
    wash: { top: [0xfff0c0, 0.16], bottom: [0xff9a3c, 0.16], pulse: true },
    vignette: 0.18,
    layers: [
      { kind: 'sand', count: 22, sf: 0.4, tint: [0xfff6dc, 0xffffff, 0xf2d9a0] },
      { kind: 'dust', count: 6, sf: 0.4, tint: [0xffe2a8], alpha: 0.4 },
    ],
  },
  snow: {
    // 飄雪本體在冰面機制（mapModifiers.js）裡，這裡只補前景大雪片與冰晶閃光
    subtitle: '寒風刺骨，冰面濕滑',
    wash: { top: [0xe8f4ff, 0.18], bottom: [0x9cc8ff, 0.12] },
    vignette: 0.18,
    layers: [
      { kind: 'flake', count: 6, sf: 1, front: true, tint: [0xffffff], scale: 1.6, alpha: 0.55 },
      { kind: 'twinkle', count: 8, sf: 0.5, tint: [0xe0f6ff, 0xffffff], band: [400, 590] },
    ],
  },
  lava: {
    // 噴發時的火星在岩漿機制裡，這裡是常駐的上升火星與灰燼
    subtitle: '熔岩翻湧，步步驚心',
    wash: { top: [0x1a0402, 0.26], bottom: [0xff4a10, 0.24], pulse: true },
    vignette: 0.30,
    layers: [
      { kind: 'ember', count: 20, sf: 0.4, tint: [0xff9a3c, 0xffd060, 0xff5a1e] },
      { kind: 'ash', count: 10, sf: 0.5, tint: [0x5a4a46, 0x3a2e2c] },
    ],
  },
  castle: {
    // 黑暗視野已經壓暗畫面：只加淡淡的紫色色調與飄塵，不加暗角
    subtitle: '魔君的王座，就在前方',
    wash: { top: [0x3a0a5a, 0.16] },
    layers: [
      { kind: 'dust', count: 12, sf: 0.4, tint: [0xd8b8ff], alpha: 0.5 },
    ],
  },
  boss: {
    wash: { bottom: [0x5a0a6a, 0.18], pulse: true },
    vignette: 0.30,
    layers: [
      { kind: 'mote', count: 14, sf: 0.5, tint: [0xb04cff, 0xff3c8a] },
    ],
  },
  town: {
    subtitle: '晨光初露的安全港灣',
    wash: { top: [0xffb48a, 0.14], bottom: [0x2a1a4a, 0.14] },
    vignette: 0.14,
    layers: [
      { kind: 'firefly', count: 12, sf: 0.4, tint: [0xffd890, 0xffeec0] },
    ],
    extras: { shootingStar: true },
  },
  shrine: {
    subtitle: '燭影搖曳，影子在低語',
    wash: { top: [0x0a0a2a, 0.20], bottom: [0x6a5aff, 0.12] },
    vignette: 0.28,
    rays: { count: 2, tint: 0xb8c8ff, alpha: 0.12 },
    layers: [
      { kind: 'candle', count: 12, sf: 0.4, tint: [0xffc870, 0xffe0a0] },
      { kind: 'twinkle', count: 8, sf: 0.3, tint: [0xc8d0ff] },
    ],
  },
  dungeon: {
    wash: { bottom: [0x10202a, 0.20] },
    vignette: 0.30,
    layers: [
      { kind: 'dust', count: 12, sf: 0.4, tint: [0xd0e8ff], alpha: 0.45 },
    ],
  },
};

// 裝備掉落光暈的顏色依稀有度（與 equipment.js 的 RARITIES 一致）；level 越高光越亮、越大
export const RARITY_GLOW = {
  common:    { tint: 0xaaaaaa, alpha: 0.35, scale: 0.9, beam: false },
  rare:      { tint: 0x4488ff, alpha: 0.55, scale: 1.1, beam: false },
  epic:      { tint: 0xaa44ff, alpha: 0.7,  scale: 1.3, beam: true },
  legendary: { tint: 0xffaa00, alpha: 0.85, scale: 1.5, beam: true },
};

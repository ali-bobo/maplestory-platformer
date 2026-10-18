// 操作說明表（設定視窗右側）。純資料，與 PLAYER_GUIDE 的按鍵表、Player / UIScene 的實際綁定保持一致。
// test/ux.test.js 會檢查：技能是 Z X C V 四格（沒有 B）、普通攻擊是空白鍵、互動 F、世界地圖 M、暫停 ESC。

export const KEY_CHART = [
  { label: '移動', key: '← →' },
  { label: '跳躍（可二段跳）', key: 'Alt / ↑' },
  { label: '下穿平台', key: '↓' },
  { label: '普通攻擊', key: '空白鍵' },
  { label: '技能 1–4 欄', key: 'Z X C V' },
  { label: '藥水', key: 'A S D R G' },
  { label: '互動 / 對話', key: 'F' },
  { label: '世界地圖', key: 'M' },
  { label: '任務日誌', key: 'J' },
  { label: '暫停 / 關閉視窗', key: 'ESC' },
];

export const KEY_CHART_NOTES = [
  '手機：搖桿上推跳、回中再推二段跳，另一側點一下也能跳；藥水點下方藥水格。',
  '按 ESC 一次只關最上層的視窗，再按一次才會暫停。',
];

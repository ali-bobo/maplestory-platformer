// 更新紀錄（設定視窗的「更新紀錄」面板）。純資料，新的放最前面；每條一行、玩家看得懂的說法。
// test/stability.test.js 會檢查：至少一條、每條有標題、沒有重複、長度放得進面板。

export const CHANGELOG = [
  { title: '通關後回程傳送門、難度選項、載入小提示' },
  { title: '支援手把、可自訂按鍵' },
  { title: '30 枚隱藏盜賊徽章與收集獎勵' },
  { title: '穩定性：出錯時自動存檔並提示、可安裝到主畫面離線遊玩' },
  { title: '技能說明面板' },
  { title: '刺客毒鏢與斷命印記重做' },
  { title: '俠盜迷煙彈與妙手空空重做' },
  { title: 'Boss 狂暴第三階段與新美術' },
];

/** 取最新的 n 條（面板空間有限） */
export function recentChangelog(n = 5) {
  return CHANGELOG.slice(0, Math.max(0, n));
}

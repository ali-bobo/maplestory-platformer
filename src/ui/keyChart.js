// 操作說明表（設定視窗右側）。純資料，與 PLAYER_GUIDE 的按鍵表、Player / UIScene 的實際綁定保持一致。
// test/settings.test.js 會檢查：技能是 Z X C V 四格（沒有 B）、普通攻擊是空白鍵、互動 F、世界地圖 M、暫停 ESC。
// keyChartFor(bindings) 依目前的按鍵設定產生（設定視窗用）；KEY_CHART 是預設鍵位的版本。

import { DEFAULT_BINDINGS, keyLabel } from '../engine/keyBindings.js';

export function keyChartFor(bindings = DEFAULT_BINDINGS) {
  const k = (action) => keyLabel(bindings[action]);
  return [
    { label: '移動', key: `${k('left')} ${k('right')}` },
    { label: '跳躍（可二段跳）', key: `${k('jump')} / ${k('up')}` },
    { label: '下穿平台', key: k('down') },
    { label: '普通攻擊', key: k('attack') },
    { label: '技能 1–4 欄', key: `${k('skill1')} ${k('skill2')} ${k('skill3')} ${k('skill4')}` },
    { label: '藥水', key: `${k('potA')} ${k('potS')} ${k('potD')} ${k('potR')} ${k('potG')}` },
    { label: '互動 / 對話', key: k('interact') },
    { label: '世界地圖', key: 'M' },
    { label: '任務日誌', key: 'J' },
    { label: '暫停 / 關閉視窗', key: 'ESC' },
  ];
}

export const KEY_CHART = keyChartFor(DEFAULT_BINDINGS);

export const KEY_CHART_NOTES = [
  '手機：用畫面上的按鈕操作，藥水直接點下方藥水格。',
  '按 ESC 一次只關最上層的視窗，再按一次才會暫停。',
];

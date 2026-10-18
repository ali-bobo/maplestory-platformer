// 設定視窗標題列右側的「版本 x.y.z · 更新紀錄」連結，點了開出更新紀錄面板（蓋在設定視窗內容上）。
// 獨立成一個檔案，設定視窗只需呼叫一次 addVersionInfo（其他功能分支也在改 settingsWindow.js，盡量少動它）。

import { APP_VERSION, formatVersion, loadBuildInfo } from '../engine/version.js';
import { recentChangelog } from '../config/changelog.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { cjkWrap } from './textWrap.js';

/**
 * rightX / y：連結文字的右上角；panel：{ x, y, w, h } 面板要蓋住的區域；depth：設定視窗底層深度。
 * 回傳 { objects, destroy }。
 */
export function addVersionInfo(scene, { rightX, y, panel, depth = 150 }) {
  const objs = [];
  let panelObjs = [];
  let alive = true;
  let versionStr = APP_VERSION;
  const style = (size, color, extra = {}) => ({
    fontSize: `${size}px`, color, fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 2, ...extra,
  });

  const link = scene.add.text(rightX, y, '', style(14, '#e8d3a8'))
    .setOrigin(1, 0).setDepth(depth + 3).setScrollFactor(0).setInteractive({ useHandCursor: true });
  objs.push(link);
  const refreshLink = () => { if (alive && link.active) link.setText(`版本 ${versionStr} · 更新紀錄`); };
  refreshLink();
  link.on('pointerover', () => link.setColor('#ffe27a'));
  link.on('pointerout', () => link.setColor('#e8d3a8'));

  const closePanel = () => {
    for (const o of panelObjs) { if (o && o.destroy) o.destroy(); }
    panelObjs = [];
  };
  const openPanel = () => {
    if (panelObjs.length) return;
    const d = depth + 10;
    const { x, y: py, w, h } = panel;
    const add = (o) => { panelObjs.push(o); return o; };
    // 擋住底下設定視窗的點擊（Phaser 只把點擊交給最上層的互動物件）
    add(scene.add.zone(x, py, w, h).setOrigin(0, 0).setDepth(d).setScrollFactor(0).setInteractive());
    add(addParchmentPanel(scene, x, py, w, h, { depth: d + 1 }));
    add(scene.add.text(x + 30, py + 24, '更新紀錄', style(22, '#ffe9b0', { strokeThickness: 3 })).setDepth(d + 2).setScrollFactor(0));
    add(scene.add.text(x + w - 30, py + 30, `版本 ${versionStr}`, style(15, '#ffe27a')).setOrigin(1, 0).setDepth(d + 2).setScrollFactor(0));
    let ty = py + 76;
    for (const entry of recentChangelog(6)) {
      const t = add(scene.add.text(x + 34, ty, `• ${entry.title}`, style(17, '#fff3dc', {
        wordWrap: { callback: cjkWrap(w - 80), callbackScope: null },
      })).setDepth(d + 2).setScrollFactor(0));
      ty += t.height + 12;
    }
    addWoodButton(scene, x + w / 2, py + h - 40, 170, 42, '返回設定', closePanel, { depth: d + 2, fontSize: 17 })
      .objects.forEach(add);
  };
  link.on('pointerdown', openPanel);

  loadBuildInfo().then((info) => {
    if (!info) return;
    versionStr = formatVersion(info.version, info.hash);
    refreshLink();
  }).catch(() => {});

  return {
    objects: objs,
    destroy() {
      alive = false;
      closePanel();
      for (const o of objs) { if (o && o.destroy) o.destroy(); }
      objs.length = 0;
    },
  };
}

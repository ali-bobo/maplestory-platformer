// 設定視窗（Phaser 物件，UIScene 的「設定」鈕開啟）
//
// 內容：音樂 / 音效音量滑桿、畫面震動 / 閃光 / 傷害數字 / 減少動態開關、介面大小三段、操作說明表、
// 存檔代碼與「重設設定」。所有值走 src/engine/settings.js（獨立 localStorage key，不進存檔）。
// 觸控友善：滑桿命中區 44px 高、開關整列可點、按鈕 40px 以上。

import { settings, UI_SCALES, UI_SCALE_LABELS, TOUCH_MODES, TOUCH_MODE_LABELS } from '../engine/settings.js';
import { isTouchDevice } from '../engine/device.js';
import { audio } from '../engine/audio.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { KEY_CHART, KEY_CHART_NOTES } from './keyChart.js';
import { cjkWrap } from './textWrap.js';
import { sceneUiCtx, touchTargetPx } from './uiScale.js';

export const SETTINGS_WINDOW = { w: 760, h: 620, y: 14 };

const TOGGLES = [
  { key: 'shake', label: '畫面震動' },
  { key: 'flash', label: '畫面閃光' },
  { key: 'damageNumbers', label: '傷害數字' },
  { key: 'reducedMotion', label: '減少動態', hint: '關閉震動、閃光與脈動效果' },
];

/**
 * 建立設定視窗。回傳 { objects, destroy }。
 *  options.depth          視窗底層深度（預設 150）
 *  options.onClose        按 × / 關閉鈕時呼叫
 *  options.onOpenSaveCode 按「存檔代碼」時呼叫
 */
export function buildSettingsWindow(scene, options = {}) {
  const d = options.depth ?? 150;
  const { width } = scene.cameras.main;
  const W = SETTINGS_WINDOW.w;
  const H = SETTINGS_WINDOW.h;
  const x0 = Math.round((width - W) / 2);
  const y0 = SETTINGS_WINDOW.y;
  const objs = [];
  const timers = [];
  const refreshers = [];
  const cleanups = [];
  const push = (o) => { objs.push(o); return o; };

  const text = (x, y, str, size, color, extra = {}) => push(scene.add.text(x, y, str, {
    fontSize: `${size}px`, color, fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3, ...extra,
  }).setDepth(d + 2).setScrollFactor(0));
  const rect = (x, y, w, h, color, alpha = 1, depth = d + 1) => push(scene.add.rectangle(x, y, w, h, color, alpha)
    .setOrigin(0, 0).setDepth(depth).setScrollFactor(0));

  push(addParchmentPanel(scene, x0, y0, W, H, { depth: d }));
  text(x0 + 34, y0 + 20, '設定', 26, '#ffe9b0');

  // 關閉 ×：桌機維持原樣（40px 方塊 + 48px 命中區）；手機畫布縮小時命中區放大到 >= 44 CSS px（右上角貼齊視窗），
  // 外觀方塊只略放大，命中區往視窗內側延伸（右上角下方沒有其他可點物件）。
  const ui = sceneUiCtx(scene);
  const hit = Math.min(touchTargetPx(48, ui), 112);
  const box = hit > 48 ? Math.min(56, Math.max(40, Math.round(hit * 0.5))) : 40;
  const boxX = hit > 48 ? x0 + W - 8 - box : x0 + W - 66, boxY = hit > 48 ? y0 + 8 : y0 + 14;
  const closeBg = rect(boxX, boxY, box, box, 0x553333, 0.95, d + 1);
  closeBg.setStrokeStyle(2, 0xff8888, 0.7);
  text(boxX + box / 2, boxY + box / 2, '×', Math.round(26 * box / 40), '#ff9a9a').setOrigin(0.5, 0.5);
  const hitX = hit > 48 ? x0 + W - 4 - hit : x0 + W - 70, hitY = hit > 48 ? y0 + 4 : y0 + 10;
  push(scene.add.zone(hitX, hitY, hit, hit).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    .setDepth(d + 4).setScrollFactor(0)).on('pointerdown', () => options.onClose && options.onClose());

  rect(x0 + 30, y0 + 62, W - 60, 2, 0xc99a4a, 0.7);
  rect(x0 + 408, y0 + 78, 2, 430, 0xc99a4a, 0.4);

  // ── 左欄：聲音 ──────────────────────────────────────────────────────────
  const colX = x0 + 36;
  const trackW = 300;
  text(colX, y0 + 76, '聲音', 17, '#ffd27a');

  let dragging = null;   // { key, trackX }
  const sliders = [];
  const makeSlider = (key, label, y) => {
    text(colX, y, label, 17, '#fff3dc');
    const valueText = text(colX + trackW, y, '', 17, '#ffe27a').setOrigin(1, 0);
    const trackY = y + 38;
    rect(colX, trackY - 6, trackW, 12, 0x24160a, 1);
    const fill = rect(colX, trackY - 6, trackW, 12, 0xf2c14e, 1, d + 2);
    const knob = push(scene.add.circle(colX, trackY, 15, 0xfff0c8).setStrokeStyle(3, 0x8a5a20)
      .setDepth(d + 3).setScrollFactor(0));
    const zone = push(scene.add.rectangle(colX - 16, trackY - 24, trackW + 32, 48, 0xffffff, 0)
      .setOrigin(0, 0).setDepth(d + 4).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    const setFromPointer = (p) => {
      const v = Math.round(Math.min(1, Math.max(0, (p.x - colX) / trackW)) * 100);
      settings.set({ [key]: v });
    };
    zone.on('pointerdown', (p) => { dragging = { key, setFromPointer }; setFromPointer(p); });
    const refresh = () => {
      const v = settings.get()[key];
      valueText.setText(`${v}%`);
      fill.width = Math.max(1, (trackW * v) / 100);
      knob.x = colX + (trackW * v) / 100;
    };
    refreshers.push(refresh);
    sliders.push({ key, refresh });
  };
  makeSlider('musicVolume', '音樂音量', y0 + 100);
  makeSlider('sfxVolume', '音效音量', y0 + 166);

  const onMove = (p) => { if (dragging) dragging.setFromPointer(p); };
  const onUp = () => {
    if (dragging && dragging.key === 'sfxVolume') audio.playPickup();   // 放開時播一聲，聽得出大小
    dragging = null;
  };
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);
  cleanups.push(() => {
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('pointerupoutside', onUp);
  });

  // ── 左欄：畫面 ──────────────────────────────────────────────────────────
  text(colX, y0 + 238, '畫面', 17, '#ffd27a');
  TOGGLES.forEach((t, i) => {
    const y = y0 + 264 + i * 44;
    const row = push(scene.add.rectangle(colX - 8, y - 4, trackW + 16, 42, 0xffffff, 0)
      .setOrigin(0, 0).setDepth(d + 1).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    text(colX, y + 2, t.label, 17, '#fff3dc');
    const pill = rect(colX + trackW - 84, y - 1, 84, 34, 0x2f7a46, 1, d + 2);
    pill.setStrokeStyle(2, 0xffffff, 0.35);
    const pillText = text(colX + trackW - 42, y + 16, '', 16, '#ffffff').setOrigin(0.5, 0.5);
    row.on('pointerover', () => row.setFillStyle(0xffffff, 0.08));
    row.on('pointerout', () => row.setFillStyle(0xffffff, 0));
    row.on('pointerdown', () => settings.set({ [t.key]: !settings.get()[t.key] }));
    refreshers.push(() => {
      const on = !!settings.get()[t.key];
      pill.setFillStyle(on ? 0x2f7a46 : 0x5a4a3a, 1);
      pillText.setText(on ? '開' : '關');
    });
  });

  // 介面大小（小 / 標準 / 大）
  const scaleY = y0 + 264 + TOGGLES.length * 44 + 4;
  text(colX, scaleY + 6, '介面大小', 17, '#fff3dc');
  const segs = UI_SCALES.map((id, i) => {
    const bx = colX + trackW - 3 * 68 - 4 + i * 68;
    const bg = rect(bx, scaleY, 64, 38, 0x5a4a3a, 1, d + 2);
    bg.setStrokeStyle(2, 0xffffff, 0.35);
    text(bx + 32, scaleY + 19, UI_SCALE_LABELS[id], 16, '#ffffff').setOrigin(0.5, 0.5);
    push(scene.add.zone(bx - 2, scaleY - 4, 68, 46).setOrigin(0, 0).setInteractive({ useHandCursor: true })
      .setDepth(d + 4).setScrollFactor(0)).on('pointerdown', () => settings.set({ uiScale: id }));
    return { id, bg };
  });
  refreshers.push(() => {
    const cur = settings.get().uiScale;
    for (const s of segs) s.bg.setFillStyle(s.id === cur ? 0xc8861e : 0x5a4a3a, 1);
  });

  // 觸控操作方式（只有觸控裝置顯示）：虛擬搖桿 / 舊式按鈕
  if (isTouchDevice()) {
    const modeY = scaleY + 50;
    text(colX, modeY + 6, '觸控操作', 17, '#fff3dc');
    const mw = 98;
    const modeSegs = TOUCH_MODES.map((id, i) => {
      const bx = colX + trackW - 2 * (mw + 4) + i * (mw + 4);
      const bg = rect(bx, modeY, mw, 38, 0x5a4a3a, 1, d + 2);
      bg.setStrokeStyle(2, 0xffffff, 0.35);
      text(bx + mw / 2, modeY + 19, TOUCH_MODE_LABELS[id], 15, '#ffffff').setOrigin(0.5, 0.5);
      push(scene.add.zone(bx - 2, modeY - 4, mw + 4, 46).setOrigin(0, 0).setInteractive({ useHandCursor: true })
        .setDepth(d + 4).setScrollFactor(0)).on('pointerdown', () => settings.set({ touchControls: id }));
      return { id, bg };
    });
    refreshers.push(() => {
      const cur = settings.get().touchControls;
      for (const s of modeSegs) s.bg.setFillStyle(s.id === cur ? 0xc8861e : 0x5a4a3a, 1);
    });
  }

  // ── 右欄：操作說明 ──────────────────────────────────────────────────────
  const keyX = x0 + 436;
  const keyR = x0 + W - 34;
  text(keyX, y0 + 76, '操作說明', 17, '#ffd27a');
  KEY_CHART.forEach((line, i) => {
    const y = y0 + 108 + i * 31;
    text(keyX, y, line.label, 15, '#e8d3a8', { strokeThickness: 2 });
    text(keyR, y, line.key, 15, '#ffee44', { strokeThickness: 2 }).setOrigin(1, 0);
  });
  KEY_CHART_NOTES.forEach((note, i) => {
    text(keyX, y0 + 108 + KEY_CHART.length * 31 + 8 + i * 40, note, 13, '#b9a98a',
      { strokeThickness: 2, fontStyle: 'normal', wordWrap: { callback: cjkWrap(keyR - keyX), callbackScope: null } });
  });

  // ── 底部按鈕 ────────────────────────────────────────────────────────────
  const by = y0 + H - 44;
  addWoodButton(scene, x0 + 150, by, 190, 42, '存檔代碼', () => options.onOpenSaveCode && options.onOpenSaveCode(),
    { depth: d + 2, fontSize: 17 }).objects.forEach(push);
  let confirmReset = false;
  const resetBtn = addWoodButton(scene, x0 + W / 2 + 10, by, 190, 42, '重設設定', () => {
    if (!confirmReset) {
      confirmReset = true;
      resetBtn.label.setText('再按一次確認');
      timers.push(scene.time.delayedCall(2500, () => {
        confirmReset = false;
        if (resetBtn.label.active) resetBtn.label.setText('重設設定');
      }));
      return;
    }
    confirmReset = false;
    resetBtn.label.setText('重設設定');
    settings.reset();
  }, { depth: d + 2, fontSize: 17 });
  resetBtn.objects.forEach(push);
  addWoodButton(scene, x0 + W - 150, by, 190, 42, '關閉', () => options.onClose && options.onClose(),
    { depth: d + 2, fontSize: 17 }).objects.forEach(push);

  const refreshAll = () => { for (const fn of refreshers) fn(); };
  refreshAll();
  const unsubscribe = settings.subscribe(refreshAll);

  return {
    objects: objs,
    destroy() {
      unsubscribe();
      for (const fn of cleanups) fn();
      for (const t of timers) t.remove(false);
      for (const o of objs) { if (o && o.destroy) o.destroy(); }
      objs.length = 0;
    },
  };
}

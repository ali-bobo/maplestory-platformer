// 任務日誌視窗（Phaser 物件；按 J 或 HUD「任務」鈕開啟）
//
// 內容來自 engine/objective.js 的 questLog(gs)：進行中（進度、描述、去哪裡、獎勵）、
// 可接取（誰發、在哪張地圖）、已完成。內容多時分頁（上一頁 / 下一頁、滑鼠滾輪）。

import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { questLog, getObjective } from '../engine/objective.js';
import { cjkWrap } from './textWrap.js';
import { sceneUiCtx, touchTargetPx } from './uiScale.js';

export const QUEST_LOG_WINDOW = { w: 760, h: 572, y: 14 };
const PAGE_TOP = 78;       // 內容區起點（相對視窗上緣）
const PAGE_HEIGHT = 420;   // 內容區高度

/**
 * 建立任務日誌。回傳 { objects, destroy, pageCount }。
 *  options.depth    視窗底層深度（預設 150）
 *  options.onClose  按 × / 關閉鈕時呼叫
 */
export function buildQuestLogWindow(scene, gs, options = {}) {
  const d = options.depth ?? 150;
  const { width } = scene.cameras.main;
  const W = QUEST_LOG_WINDOW.w;
  const H = QUEST_LOG_WINDOW.h;
  const x0 = Math.round((width - W) / 2);
  const y0 = QUEST_LOG_WINDOW.y;
  const objs = [];
  const cleanups = [];
  const push = (o) => { objs.push(o); return o; };
  const innerW = W - 70;

  const text = (x, y, str, size, color, extra = {}) => push(scene.add.text(x, y, str, {
    fontSize: `${size}px`, color, fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3, ...extra,
  }).setDepth(d + 2).setScrollFactor(0));

  push(addParchmentPanel(scene, x0, y0, W, H, { depth: d }));
  text(x0 + 34, y0 + 20, '任務日誌', 26, '#ffe9b0');
  const log = questLog(gs);
  text(x0 + 190, y0 + 30, `進行中 ${log.active.length}　可接取 ${log.available.filter((q) => !q.far).length}　已完成 ${log.completed.length}`, 15, '#e8d3a8',
    { strokeThickness: 2 });

  // 關閉 ×：桌機維持原樣（40px 方塊 + 48px 命中區）；手機畫布縮小時命中區放大到 >= 44 CSS px（右上角貼齊視窗），
  // 外觀方塊只略放大，命中區往視窗內側延伸（下方右側沒有其他可點物件）。
  const ui = sceneUiCtx(scene);
  const hit = Math.min(touchTargetPx(48, ui), 112);
  const box = hit > 48 ? Math.min(56, Math.max(40, Math.round(hit * 0.5))) : 40;
  const boxX = hit > 48 ? x0 + W - 8 - box : x0 + W - 66, boxY = hit > 48 ? y0 + 8 : y0 + 14;
  const closeBg = push(scene.add.rectangle(boxX, boxY, box, box, 0x553333, 0.95)
    .setOrigin(0, 0).setDepth(d + 1).setScrollFactor(0));
  closeBg.setStrokeStyle(2, 0xff8888, 0.7);
  text(boxX + box / 2, boxY + box / 2, '×', Math.round(26 * box / 40), '#ff9a9a').setOrigin(0.5, 0.5);
  const hitX = hit > 48 ? x0 + W - 4 - hit : x0 + W - 70, hitY = hit > 48 ? y0 + 4 : y0 + 10;
  push(scene.add.zone(hitX, hitY, hit, hit).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    .setDepth(d + 4).setScrollFactor(0)).on('pointerdown', () => options.onClose && options.onClose());
  push(scene.add.rectangle(x0 + 30, y0 + 62, W - 60, 2, 0xc99a4a, 0.7).setOrigin(0, 0).setDepth(d + 1).setScrollFactor(0));

  // ── 內容：先全部建好、量高度，再分頁 ─────────────────────────────────────
  const blocks = [];   // { items: [Text...], h }
  const addBlock = (build) => {
    const items = [];
    let y = 0;
    const line = (str, size, color, extra = {}) => {
      const t = text(x0 + 36, 0, str, size, color, { wordWrap: { callback: cjkWrap(innerW), callbackScope: null }, ...extra });
      items.push({ t, dy: y });
      y += t.height + (extra.gap ?? 4);
      return t;
    };
    build(line);
    blocks.push({ items, h: y + 10 });
  };
  const header = (label, color) => addBlock((line) => line(label, 18, color, { strokeThickness: 3, gap: 2 }));

  header('進行中', '#ffd27a');
  if (log.active.length === 0) {
    const obj = getObjective(gs);
    addBlock((line) => {
      line('目前沒有進行中的任務。', 15, '#cfc2a4', { strokeThickness: 2 });
      if (obj && obj.text) line(`建議：${obj.text}`, 15, '#9ff0c8', { strokeThickness: 2 });
    });
  }
  for (const q of log.active) {
    addBlock((line) => {
      line(`◆ ${q.name}　${q.progressText}`, 17, '#fff3dc');
      line(q.desc, 14, '#e8d3a8', { strokeThickness: 2 });
      line(`${q.where ? `地點：${q.where}　` : ''}獎勵：${q.reward}`, 14, '#9fd8ff', { strokeThickness: 2 });
    });
  }
  // 可接取：只列等級合適的；高等級地區的任務收成一行摘要，免得清單長到翻好幾頁
  const nearby = log.available.filter((q) => !q.far);
  const farCount = log.available.length - nearby.length;
  header('可接取', '#ffd27a');
  if (nearby.length === 0) addBlock((line) => line('目前沒有可接的任務。', 15, '#cfc2a4', { strokeThickness: 2 }));
  for (const q of nearby) {
    addBlock((line) => {
      line(`◇ ${q.name}`, 16, '#fff3dc');
      line(`找：${q.where}`, 14, '#9fd8ff', { strokeThickness: 2 });
      line(q.desc, 13, '#e8d3a8', { strokeThickness: 2 });
    });
  }
  if (farCount > 0) addBlock((line) => line(`另有 ${farCount} 個任務在更高等級的地區，等你變強再去接。`, 14, '#9a8f78', { strokeThickness: 2 }));
  header(`已完成（${log.completed.length}）`, '#ffd27a');
  addBlock((line) => line(log.completed.length ? log.completed.map((q) => q.name).join('、') : '還沒有完成的任務。', 14, '#b9a98a',
    { strokeThickness: 2 }));

  // 分頁：依累計高度切，單一區塊比一頁還高就獨佔一頁
  const pages = [[]];
  let used = 0;
  for (const b of blocks) {
    if (used > 0 && used + b.h > PAGE_HEIGHT) { pages.push([]); used = 0; }
    pages[pages.length - 1].push({ b, y: used });
    used += b.h;
  }
  const show = (n) => {
    pages.forEach((pg, i) => {
      for (const { b, y } of pg) {
        for (const it of b.items) it.t.setPosition(x0 + 36, y0 + PAGE_TOP + y + it.dy).setVisible(i === n);
      }
    });
  };

  let page = 0;
  const pageLabel = text(x0 + W / 2, y0 + H - 44, '', 15, '#e8d3a8', { strokeThickness: 2 }).setOrigin(0.5, 0.5);
  const go = (delta) => {
    const next = Math.min(pages.length - 1, Math.max(0, page + delta));
    if (next === page) return;
    page = next;
    refresh();
  };
  const prev = addWoodButton(scene, x0 + 130, y0 + H - 44, 150, 42, '上一頁', () => go(-1), { depth: d + 2, fontSize: 16 });
  const next = addWoodButton(scene, x0 + W - 130, y0 + H - 44, 150, 42, '下一頁', () => go(1), { depth: d + 2, fontSize: 16 });
  prev.objects.forEach(push);
  next.objects.forEach(push);
  const refresh = () => {
    show(page);
    pageLabel.setText(pages.length > 1 ? `第 ${page + 1} / ${pages.length} 頁（可用滑鼠滾輪翻頁）` : '按 J 或 ESC 關閉');
    const multi = pages.length > 1;
    for (const b of [prev, next]) b.objects.forEach((o) => o.setVisible(multi));
    prev.plate.setAlpha(page > 0 ? 1 : 0.4);
    next.plate.setAlpha(page < pages.length - 1 ? 1 : 0.4);
  };
  refresh();

  const onWheel = (pointer, over, dx, dy) => { if (dy > 0) go(1); else if (dy < 0) go(-1); };
  scene.input.on('wheel', onWheel);
  cleanups.push(() => scene.input.off('wheel', onWheel));

  return {
    objects: objs,
    pageCount: pages.length,
    destroy() {
      for (const fn of cleanups) fn();
      for (const o of objs) { if (o && o.destroy) o.destroy(); }
      objs.length = 0;
    },
  };
}

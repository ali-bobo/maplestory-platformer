// 世界地圖浮層（UIScene 開啟）：羊皮紙底圖上畫 10 個主線節點，側欄列出 4 張支線地圖。
// 節點三種狀態：目前所在 / 已解鎖 / 鎖定。點一下選取（顯示名稱、等級帶、傳送費），
// 再點同一張或按「傳送」才會傳送，避免觸控誤點。規則在 engine/worldTravel.js。
// 浮層關閉時所有物件與 tween 一併銷毀，平常不佔任何每幀成本。

import { MAPS } from '../config/maps.js';
import { MAP_SCENE_KEYS } from '../config/constants.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { keyHint } from '../engine/device.js';
import { placeLabels } from './labelLayout.js';
import { sceneUiCtx, readableFontPx, touchTargetPx, pickNearest } from './uiScale.js';
import { badgeCount, mapBadgeProgress, BADGE_COUNT } from '../engine/badges.js';
import {
  WORLD_ROUTE, SIDE_MAPS, WORLD_MAP_SIZE, nodeScreenPos, mapState, travelCheck, travelFee,
} from '../engine/worldTravel.js';

const DEPTH = 300;
const MAP_SCALE = 0.85;
const MAP_X = 36, MAP_Y = 58;
const NODE_PICK_DIST = 26;         // 桌機點地圖時，離節點多近算點到（觸控改用更大的半徑）
const NEAR_MONSTER_DIST = 300;   // 附近有活著的怪就算戰鬥中，不能傳送
const STATE_TEXT = { current: '目前所在', unlocked: '已解鎖', locked: '未解鎖' };
const textStyle = (size, color, extra = {}) => ({
  fontSize: `${size}px`, color, fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3, ...extra,
});

export class WorldMapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.objs = [];
    this.nodes = [];          // { key, x, y, icon, label }
    this.selected = null;
    this.open = false;
    this._notice = null;
  }

  get isOpen() { return this.open; }

  toggle() { if (this.open) this.close(); else this.show(); }

  show() {
    if (this.open) return;
    const s = this.scene;
    this.open = true;
    const { width, height } = s.cameras.main;
    const gs = s.registry.get('gameState');
    const add = (o) => { this.objs.push(o); return o; };
    // 手機：文字螢幕大小 >= 12 CSS px、按鈕觸控區 >= 44 CSS px（桌機維持原樣）
    const ui = sceneUiCtx(s);
    this._ui = ui;
    this._fs = (n) => readableFontPx(n, ui);
    const fs = this._fs;
    const closeW = touchTargetPx(44, ui), closeH = touchTargetPx(40, ui);
    const closeCy = Math.max(34, 14 + closeH / 2);
    const mapY = Math.max(MAP_Y, closeCy + closeH / 2 - 16);   // 關閉鈕變大時，地圖與側欄跟著往下讓位
    this._mapY = mapY;
    const goW = touchTargetPx(104, ui) > 104 ? 150 : 104, goH = touchTargetPx(40, ui);
    const infoH = Math.max(52, goH + 14);
    const infoY = mapY + WORLD_MAP_SIZE.h * MAP_SCALE + 8;
    const panelH = Math.max(584, infoY + infoH + 14 - 8);

    // 擋住底下的點擊
    add(s.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0)
      .setDepth(DEPTH).setScrollFactor(0).setInteractive());
    add(addParchmentPanel(s, 14, 8, width - 28, panelH, { depth: DEPTH + 1 }));
    // 手機：左上角有 DOM 的「暫停」鈕，標題往右讓開
    const titleX = ui.touch && ui.canvasScale < 0.8 ? 120 : 40;
    add(s.add.text(titleX, 22, '世界地圖', textStyle(fs(22), '#ffe9b0', { fontStyle: 'bold', strokeThickness: 4 }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    add(s.add.text(titleX + 130, 30, keyHint('M / Esc 關閉　點節點選取，再點一次或按「傳送」出發', '點節點選取，再點一次或按「傳送」出發'), textStyle(fs(12), '#d9c7a0'))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    add(s.add.text(width - 22 - closeW - 14, 24, `盜賊徽章 ${badgeCount(gs)}/${BADGE_COUNT}`, textStyle(fs(15), '#ffe27a', { fontStyle: 'bold' }))
      .setOrigin(1, 0).setDepth(DEPTH + 3).setScrollFactor(0));
    const close = addWoodButton(s, width - 22 - closeW / 2, closeCy, closeW, closeH, '×', () => this.close(),
      { depth: DEPTH + 4, fontSize: Math.round(22 * closeH / 40) });
    close.objects.forEach(add);
    this._closeBtn = close;

    // 底圖
    if (s.textures.exists('ui_world_map')) {
      add(s.add.image(MAP_X, mapY, 'ui_world_map').setOrigin(0, 0).setScale(MAP_SCALE)
        .setDepth(DEPTH + 2).setScrollFactor(0));
    } else {
      add(s.add.rectangle(MAP_X, mapY, WORLD_MAP_SIZE.w * MAP_SCALE, WORLD_MAP_SIZE.h * MAP_SCALE, 0x8a6a3a, 0.6)
        .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0));
    }

    // 主線節點
    this.nodes = [];
    WORLD_ROUTE.forEach((key, i) => {
      const p = nodeScreenPos(i, MAP_X, mapY, MAP_SCALE);
      this._addNode(key, p.x, p.y, i % 2 === 0 ? 1 : -1, gs, add);
    });
    if (ui.touch && fs(12) > 12) this._placeNodeLabels(mapY);   // 手機字大：標籤互相避讓
    // 整張地圖共用一塊點擊區：點到「最近的節點」（節點之間只隔約 56 遊戲像素，各自的小命中區在手機上點不準）
    const mapW = WORLD_MAP_SIZE.w * MAP_SCALE, mapH = WORLD_MAP_SIZE.h * MAP_SCALE;
    const pickR = ui.touch ? Math.max(NODE_PICK_DIST, touchTargetPx(0, ui) / 2) : NODE_PICK_DIST;
    const mainNodes = () => this.nodes.filter((n) => !n.side);
    const pick = (ptr) => {
      const list = mainNodes();
      const i = pickNearest(list, ptr.x, ptr.y, pickR);
      return i < 0 ? null : list[i].key;
    };
    const zone = s.add.zone(MAP_X, mapY, mapW, mapH).setOrigin(0, 0).setDepth(DEPTH + 6)
      .setScrollFactor(0).setInteractive({ useHandCursor: true });
    add(zone);
    zone.on('pointermove', (ptr) => { const k = pick(ptr); this._hover = k; this._refreshInfo(k || this.selected); });
    zone.on('pointerout', () => { this._hover = null; this._refreshInfo(this.selected); });
    zone.on('pointerdown', (ptr) => {
      const k = pick(ptr);
      if (!k) return;
      if (this.selected === k) this._go(); else this._select(k);
    });

    // 側欄：支線地圖
    const sx = MAP_X + WORLD_MAP_SIZE.w * MAP_SCALE + 24;
    const sw = width - 28 - sx + 14 - 14;
    add(s.add.text(sx + 8, mapY - 8, '支線地圖', textStyle(fs(16), '#ffe27a', { fontStyle: 'bold' }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    SIDE_MAPS.forEach((key, i) => {
      const ry = mapY + 20 + i * 112;
      add(s.add.nineslice(sx, ry, 'hud_panel_sm', undefined, sw, 100, 9, 9, 9, 9)
        .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0).setTint(0xcdb48a));
      this._addNode(key, sx + 34, ry + 50, 0, gs, add, { side: true, rowX: sx, rowY: ry, rowW: sw });
    });

    // 資訊列
    add(s.add.nineslice(MAP_X, infoY, 'hud_panel_sm', undefined, WORLD_MAP_SIZE.w * MAP_SCALE, infoH, 9, 9, 9, 9)
      .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0).setTint(0xcdb48a));
    const mainPx = fs(15);
    this._infoMain = add(s.add.text(MAP_X + 14, infoY + 8, '', textStyle(mainPx, '#fff2cc', { fontStyle: 'bold' }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    this._infoSub = add(s.add.text(MAP_X + 14, infoY + 8 + (ui.touch ? Math.round(mainPx * 1.3) : 22), '', textStyle(fs(12), '#e8d6ae'))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    this._goBtn = addWoodButton(s, MAP_X + WORLD_MAP_SIZE.w * MAP_SCALE - goW / 2 - 10, infoY + infoH / 2, goW, goH, '傳送',
      () => this._go(), { depth: DEPTH + 4, fontSize: Math.round(16 * goH / 40) });
    this._goBtn.objects.forEach(add);

    // 選取框
    this._ring = add(s.add.circle(0, 0, 26).setStrokeStyle(3, 0xffe27a).setDepth(DEPTH + 5)
      .setScrollFactor(0).setVisible(false));

    const here = this.nodes.find((n) => n.key === gs.currentMap);
    this._select(here ? here.key : WORLD_ROUTE[0]);
  }

  _addNode(key, x, y, labelDy, gs, add, opts = {}) {
    const s = this.scene;
    const map = MAPS[key];
    const state = mapState(gs, key);
    const tex = state === 'current' ? 'ui_map_node_current' : state === 'unlocked' ? 'ui_map_node_unlocked' : 'ui_map_node_locked';
    const icon = s.textures.exists(tex)
      ? s.add.image(x, y, tex).setScale(opts.side ? 1 : 1)
      : s.add.circle(x, y, 14, state === 'locked' ? 0x666666 : 0xffcc44);
    icon.setDepth(DEPTH + 4).setScrollFactor(0);   // 點擊由地圖共用點擊區 / 側欄整列處理
    add(icon);
    if (state === 'current') {
      s.tweens.add({ targets: icon, scale: 1.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const dim = state === 'locked';
    const fs = this._fs;
    // 側欄三行字（手機放大後行距加大；桌機維持原位）
    const rowY = fs(13) > 13 ? [y - 42, y - 14, y + 14] : [y - 30, y - 6, y + 14];
    let label;
    if (opts.side) {
      label = s.add.text(x + 34, rowY[0], map.name, textStyle(fs(17), dim ? '#a89878' : '#fff2cc', { fontStyle: 'bold' }))
        .setDepth(DEPTH + 4).setScrollFactor(0);
      add(label);
      const band = map.levelBand ? `Lv.${map.levelBand[0]}-${map.levelBand[1]}` : '安全地圖';
      add(s.add.text(x + 34, rowY[1], band, textStyle(fs(13), dim ? '#8f8068' : '#e8d6ae')).setDepth(DEPTH + 4).setScrollFactor(0));
      add(s.add.text(x + 34, rowY[2], STATE_TEXT[state], textStyle(fs(12), state === 'current' ? '#9ff0c8' : dim ? '#b08a6a' : '#ffe27a'))
        .setDepth(DEPTH + 4).setScrollFactor(0));
      // 整列都可以點（觸控好按）
      const hit = s.add.zone(opts.rowX, opts.rowY, opts.rowW, 100).setOrigin(0, 0).setDepth(DEPTH + 6)
        .setScrollFactor(0).setInteractive({ useHandCursor: true });
      add(hit);
      this._wire(hit, key);
    } else {
      const lpx = fs(12);
      const off = this._ui.touch && lpx > 12 ? 22 + lpx * 0.6 : null;   // 手機字大，標籤離圖示遠一點
      const dy = off ? labelDy * off : (labelDy > 0 ? 28 : -34);
      label = s.add.text(x, y + dy, map.name, textStyle(lpx, dim ? '#d8d0c0' : '#ffffff', { fontStyle: 'bold' }))
        .setOrigin(0.5, 0.5).setDepth(DEPTH + 4).setScrollFactor(0);
      add(label);
    }
    this._wire(icon, key);
    this.nodes.push({ key, x, y, icon, label, side: !!opts.side });
  }

  // 手機：名稱放大後依實際尺寸重新擺位，不互相壓、不蓋住別的節點圖示（見 labelLayout.js）
  _placeNodeLabels(mapY) {
    const main = this.nodes.filter((n) => !n.side);
    const items = main.map((n, i) => ({ x: n.x, y: n.y, w: n.label.width, h: n.label.height, pref: i % 2 === 0 ? 1 : -1 }));
    const bounds = { l: MAP_X, t: mapY, r: MAP_X + WORLD_MAP_SIZE.w * MAP_SCALE, b: mapY + WORLD_MAP_SIZE.h * MAP_SCALE };
    const pos = placeLabels(items, { iconR: 22, bounds });
    main.forEach((n, i) => n.label.setPosition(pos[i].x, pos[i].y));
  }

  _wire(obj, key) {
    obj.on('pointerover', () => { this._hover = key; this._refreshInfo(key); });
    obj.on('pointerout', () => { this._hover = null; this._refreshInfo(this.selected); });
    obj.on('pointerdown', () => {
      if (this.selected === key) this._go(); else this._select(key);
    });
  }

  _select(key) {
    this.selected = key;
    const n = this.nodes.find((o) => o.key === key);
    if (n) this._ring.setPosition(n.x, n.y).setVisible(true);
    this._refreshInfo(key);
  }

  _refreshInfo(key) {
    if (!this.open || !key) return;
    const gs = this.scene.registry.get('gameState');
    const map = MAPS[key];
    const state = mapState(gs, key);
    const band = map.levelBand ? `Lv.${map.levelBand[0]}-${map.levelBand[1]}` : '安全地圖';
    const fee = travelFee(gs.level, key);
    const feeText = key === 'boss' ? '請走王城傳送門' : fee === 0 ? '傳送費 免費' : `傳送費 ${fee} 金幣`;
    const badges = mapBadgeProgress(gs, key);
    this._infoMain.setText(`${map.name}　${band}　${feeText}${badges.total ? `　徽章 ${badges.got}/${badges.total}` : ''}`);
    const chk = travelCheck(gs, key, this._ctx());
    this._infoSub.setText(this._notice || (chk.ok ? `${STATE_TEXT[state]}・按「傳送」前往` : `${STATE_TEXT[state]}・${chk.reason}`));
    const canGo = this.selected === key ? chk.ok : travelCheck(gs, this.selected, this._ctx()).ok;
    this._goBtn.plate.setAlpha(canGo ? 1 : 0.5);
    this._goBtn.label.setAlpha(canGo ? 1 : 0.5);
  }

  // 目前所在的是副本 / Boss 房，或附近有活著的怪
  _ctx() {
    const s = this.scene;
    const mapKey = s._getCurrentMapSceneKey();
    const inInstance = !mapKey || mapKey === 'DungeonScene' || mapKey === 'BossScene';
    let inCombat = false;
    const ms = !inInstance ? s.scene.get(mapKey) : null;
    if (ms && ms.player && ms.monsters) {
      const px = ms.player.x, py = ms.player.y;
      const list = ms.monsters.getChildren();
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m.active || m.isDead) continue;
        const dx = m.x - px, dy = m.y - py;
        if (dx * dx + dy * dy < NEAR_MONSTER_DIST * NEAR_MONSTER_DIST) { inCombat = true; break; }
      }
    }
    return { inInstance, inCombat, mapKey };
  }

  _go() {
    const key = this.selected;
    if (!key) return;
    const s = this.scene;
    const gs = s.registry.get('gameState');
    const ctx = this._ctx();
    const chk = travelCheck(gs, key, ctx);
    if (!chk.ok) {
      this._notice = chk.reason;
      this._refreshInfo(key);
      if (this._noticeTimer) this._noticeTimer.remove(false);
      this._noticeTimer = s.time.delayedCall(2200, () => { this._notice = null; this._refreshInfo(this.selected); });
      return;
    }
    const mapScene = s.scene.get(ctx.mapKey);
    const sceneKey = MAP_SCENE_KEYS[key];
    if (!mapScene || !sceneKey || mapScene._transitioning) return;
    mapScene._transitioning = true;   // 傳送期間不再觸發傳送門
    gs.meso = Math.max(0, (gs.meso || 0) - chk.fee);
    gs.currentMap = key;
    s.registry.set('gameState', gs);
    s.registry.events.emit('changedata-meso', null, gs.meso);
    this.close();
    mapScene.cameras.main.fadeOut(350);
    mapScene.time.delayedCall(350, () => {
      mapScene.scene.stop('UIScene');
      mapScene.scene.start(sceneKey, { gameState: gs, spawnX: MAPS[key].spawnX });
    });
  }

  close() {
    if (!this.open) return;
    this.open = false;
    const s = this.scene;
    for (const n of this.nodes) s.tweens.killTweensOf(n.icon);
    if (this._noticeTimer) { this._noticeTimer.remove(false); this._noticeTimer = null; }
    for (const o of this.objs) if (o && o.active) o.destroy();
    this.objs = [];
    this.nodes = [];
    this.selected = null;
    this._notice = null;
    this._goBtn = null;
    this._closeBtn = null;
  }

  destroy() { this.close(); }
}

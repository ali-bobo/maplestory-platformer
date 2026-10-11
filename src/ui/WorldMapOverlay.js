// 世界地圖浮層（UIScene 開啟）：羊皮紙底圖上畫 10 個主線節點，側欄列出 4 張支線地圖。
// 節點三種狀態：目前所在 / 已解鎖 / 鎖定。點一下選取（顯示名稱、等級帶、傳送費），
// 再點同一張或按「傳送」才會傳送，避免觸控誤點。規則在 engine/worldTravel.js。
// 浮層關閉時所有物件與 tween 一併銷毀，平常不佔任何每幀成本。

import { MAPS } from '../config/maps.js';
import { MAP_SCENE_KEYS } from '../config/constants.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import {
  WORLD_ROUTE, SIDE_MAPS, WORLD_MAP_SIZE, nodeScreenPos, mapState, travelCheck, travelFee,
} from '../engine/worldTravel.js';

const DEPTH = 300;
const MAP_SCALE = 0.85;
const MAP_X = 36, MAP_Y = 58;
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

    // 擋住底下的點擊
    add(s.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0)
      .setDepth(DEPTH).setScrollFactor(0).setInteractive());
    add(addParchmentPanel(s, 14, 8, width - 28, 584, { depth: DEPTH + 1 }));
    add(s.add.text(40, 22, '世界地圖', textStyle(22, '#ffe9b0', { fontStyle: 'bold', strokeThickness: 4 }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    add(s.add.text(170, 30, 'M / Esc 關閉　點節點選取，再點一次或按「傳送」出發', textStyle(12, '#d9c7a0'))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    const close = addWoodButton(s, width - 44, 34, 44, 40, '×', () => this.close(), { depth: DEPTH + 4, fontSize: 22 });
    close.objects.forEach(add);

    // 底圖
    if (s.textures.exists('ui_world_map')) {
      add(s.add.image(MAP_X, MAP_Y, 'ui_world_map').setOrigin(0, 0).setScale(MAP_SCALE)
        .setDepth(DEPTH + 2).setScrollFactor(0));
    } else {
      add(s.add.rectangle(MAP_X, MAP_Y, WORLD_MAP_SIZE.w * MAP_SCALE, WORLD_MAP_SIZE.h * MAP_SCALE, 0x8a6a3a, 0.6)
        .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0));
    }

    // 主線節點
    this.nodes = [];
    WORLD_ROUTE.forEach((key, i) => {
      const p = nodeScreenPos(i, MAP_X, MAP_Y, MAP_SCALE);
      this._addNode(key, p.x, p.y, i % 2 === 0 ? 28 : -34, gs, add);
    });

    // 側欄：支線地圖
    const sx = MAP_X + WORLD_MAP_SIZE.w * MAP_SCALE + 24;
    const sw = width - 28 - sx + 14 - 14;
    add(s.add.text(sx + 8, MAP_Y - 8, '支線地圖', textStyle(16, '#ffe27a', { fontStyle: 'bold' }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    SIDE_MAPS.forEach((key, i) => {
      const ry = MAP_Y + 20 + i * 112;
      add(s.add.nineslice(sx, ry, 'hud_panel_sm', undefined, sw, 100, 9, 9, 9, 9)
        .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0).setTint(0xcdb48a));
      this._addNode(key, sx + 34, ry + 50, 0, gs, add, { side: true, rowX: sx, rowY: ry, rowW: sw });
    });

    // 資訊列
    const infoY = MAP_Y + WORLD_MAP_SIZE.h * MAP_SCALE + 8;
    add(s.add.nineslice(MAP_X, infoY, 'hud_panel_sm', undefined, WORLD_MAP_SIZE.w * MAP_SCALE, 52, 9, 9, 9, 9)
      .setOrigin(0, 0).setDepth(DEPTH + 2).setScrollFactor(0).setTint(0xcdb48a));
    this._infoMain = add(s.add.text(MAP_X + 14, infoY + 8, '', textStyle(15, '#fff2cc', { fontStyle: 'bold' }))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    this._infoSub = add(s.add.text(MAP_X + 14, infoY + 30, '', textStyle(12, '#e8d6ae'))
      .setDepth(DEPTH + 3).setScrollFactor(0));
    this._goBtn = addWoodButton(s, MAP_X + WORLD_MAP_SIZE.w * MAP_SCALE - 62, infoY + 26, 104, 40, '傳送',
      () => this._go(), { depth: DEPTH + 4, fontSize: 16 });
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
    icon.setDepth(DEPTH + 4).setScrollFactor(0).setInteractive({ useHandCursor: true });
    add(icon);
    if (state === 'current') {
      s.tweens.add({ targets: icon, scale: 1.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const dim = state === 'locked';
    let label;
    if (opts.side) {
      label = s.add.text(x + 34, y - 30, map.name, textStyle(17, dim ? '#a89878' : '#fff2cc', { fontStyle: 'bold' }))
        .setDepth(DEPTH + 4).setScrollFactor(0);
      add(label);
      const band = map.levelBand ? `Lv.${map.levelBand[0]}-${map.levelBand[1]}` : '安全地圖';
      add(s.add.text(x + 34, y - 6, band, textStyle(13, dim ? '#8f8068' : '#e8d6ae')).setDepth(DEPTH + 4).setScrollFactor(0));
      add(s.add.text(x + 34, y + 14, STATE_TEXT[state], textStyle(12, state === 'current' ? '#9ff0c8' : dim ? '#b08a6a' : '#ffe27a'))
        .setDepth(DEPTH + 4).setScrollFactor(0));
      // 整列都可以點（觸控好按）
      const hit = s.add.zone(opts.rowX, opts.rowY, opts.rowW, 100).setOrigin(0, 0).setDepth(DEPTH + 6)
        .setScrollFactor(0).setInteractive({ useHandCursor: true });
      add(hit);
      this._wire(hit, key);
    } else {
      label = s.add.text(x, y + labelDy, map.name, textStyle(12, dim ? '#d8d0c0' : '#ffffff', { fontStyle: 'bold' }))
        .setOrigin(0.5, 0.5).setDepth(DEPTH + 4).setScrollFactor(0);
      add(label);
    }
    this._wire(icon, key);
    this.nodes.push({ key, x, y, icon, label });
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
    const feeText = key === 'boss' ? '請走王城傳送門' : fee === 0 ? '傳送費 免費' : `傳送費 ${fee} 楓幣`;
    this._infoMain.setText(`${map.name}　${band}　${feeText}`);
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
  }

  destroy() { this.close(); }
}

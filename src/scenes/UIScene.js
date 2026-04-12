import Phaser from 'phaser';
import { SKILLS, expNeeded } from '../config/constants.js';

// HUD 場景（平行運行）— 楓之谷風格底部狀態列
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this._gs = null;
    const { width, height } = this.cameras.main;

    // ── 底部狀態列面板 ─────────────────────────────────────────────────────
    const barPanelH = 60;
    const barPanelY = height - barPanelH;

    // 底部面板背景（仿楓之谷深色漸層面板）
    const panelBg = this.add.graphics().setDepth(50).setScrollFactor(0);
    panelBg.fillStyle(0x0a0a1a, 0.92);
    panelBg.fillRect(0, barPanelY, width, barPanelH);
    panelBg.lineStyle(1, 0x334466, 0.8);
    panelBg.strokeRect(0, barPanelY, width, barPanelH);

    // 角色頭像框（底部左側）
    const portX = 12, portY = barPanelY + 4, portW = 52, portH = 52;
    const portBg = this.add.graphics().setDepth(51).setScrollFactor(0);
    portBg.fillStyle(0x112244, 0.95);
    portBg.fillRect(portX, portY, portW, portH);
    portBg.lineStyle(2, 0x4488cc, 0.9);
    portBg.strokeRect(portX, portY, portW, portH);

    // 角色圖示（用 final_char 圖縮小顯示）
    if (this.textures.exists('final_char')) {
      this.add.image(portX + portW / 2, portY + portH / 2, 'final_char')
        .setDisplaySize(portW - 4, portH - 4)
        .setDepth(52).setScrollFactor(0);
    }

    // ── HP/MP 條（底部，角色名旁邊）─────────────────────────────────────────
    const barStartX = portX + portW + 8;
    const barW = 180, barH = 13, barGap = 16;
    const hpY = barPanelY + 8;
    const mpY = hpY + barH + barGap;

    // HP 背景＆前景
    this._hpBg  = this._makeBar(barStartX, hpY, barW, barH, 0x4d0000);
    this._hpBar = this._makeBar(barStartX, hpY, barW, barH, 0xff3333);
    this._hpLabel = this.add.text(barStartX + 3, hpY + 1, 'HP', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);
    this._hpNum = this.add.text(barStartX + barW + 4, hpY + 1, '', {
      fontSize: '10px', color: '#ffaaaa', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);

    // MP 背景＆前景
    this._mpBg  = this._makeBar(barStartX, mpY, barW, barH, 0x000044);
    this._mpBar = this._makeBar(barStartX, mpY, barW, barH, 0x3355ff);
    this._mpLabel = this.add.text(barStartX + 3, mpY + 1, 'MP', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);
    this._mpNum = this.add.text(barStartX + barW + 4, mpY + 1, '', {
      fontSize: '10px', color: '#aaaaff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);

    // EXP 條（底部最下方一條細條，全寬）
    const expBarH = 8;
    this._expBg  = this._makeBar(0, height - expBarH, width, expBarH, 0x221100);
    this._expBar = this._makeBar(0, height - expBarH, width, expBarH, 0xddaa00);

    // ── 角色名稱 / 等級（頭像下方）─────────────────────────────────────────
    this._levelText = this.add.text(portX, barPanelY - 22, 'Lv.1', {
      fontSize: '14px', color: '#ffee44', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(51).setScrollFactor(0);

    this._classText = this.add.text(portX, barPanelY - 6, 'Soul Bender', {
      fontSize: '10px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(51).setScrollFactor(0);

    // ── 中段資訊（SP/Meso/Kill）────────────────────────────────────────────
    const midX = barStartX + barW + 80;
    this._spText   = this.add.text(midX, barPanelY + 6,  'SP: 0',  { fontSize: '12px', color: '#88ffcc', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._mesoText = this.add.text(midX, barPanelY + 22, '💰 0',   { fontSize: '12px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._killText = this.add.text(midX, barPanelY + 38, '💀 0/60',{ fontSize: '12px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);

    // ── 地圖名稱（中央上方）────────────────────────────────────────────────
    this._mapText = this.add.text(width / 2, barPanelY - 8, '', {
      fontSize: '12px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(51).setScrollFactor(0);

    // ── 右側選單按鈕（仿楓之谷） ─────────────────────────────────────────
    this._setupMenuButtons(width, barPanelY, barPanelH);

    // ── 技能快捷列（底部中央，技能列在底部面板上方） ──────────────────────
    this._skillSlots = {};
    this._cdOverlays = {};
    this._setupSkillBar(width, height, barPanelY);

    // ── 裝備欄（技能欄左側）─────────────────────────────────────────────
    this._setupEquipmentBar(width, height, barPanelY);

    // ── 初始化 ────────────────────────────────────────────────────────────
    this._refreshAll();

    // ── 監聽 Registry 事件 ────────────────────────────────────────────────
    this.registry.events.on('changedata-hp',        this._onHpChange,        this);
    this.registry.events.on('changedata-mp',        this._onMpChange,        this);
    this.registry.events.on('changedata-exp',       this._onExpChange,       this);
    this.registry.events.on('changedata-level',     this._onLevelChange,     this);
    this.registry.events.on('changedata-levelup',   this._onLevelUp,         this);
    this.registry.events.on('changedata-meso',      this._onMesoChange,      this);
    this.registry.events.on('changedata-killcount', this._onKillChange,      this);
    this.registry.events.on('changedata-sp',        this._onSpChange,        this);

    this.time.addEvent({ delay: 100, loop: true, callback: this._refreshCooldowns, callbackScope: this });
    this.time.addEvent({ delay: 500, loop: true, callback: this._refreshEquipment, callbackScope: this });
  }

  _makeBar(x, y, w, h, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.9);
    g.fillRect(x, y, w, h);
    g.setDepth(50).setScrollFactor(0);
    g.setData('x', x).setData('y', y).setData('w', w).setData('h', h).setData('color', color);
    return g;
  }

  _setupMenuButtons(width, barPanelY, barPanelH) {
    const btnData = [
      { label: '道具', color: 0x225522 },
      { label: '裝備', color: 0x332211 },
      { label: '技能', color: 0x112233 },
      { label: '地圖', color: 0x221133 },
      { label: '設定', color: 0x333333 },
    ];
    const btnW = 42, btnH = 22, gap = 3;
    const totalW = btnData.length * (btnW + gap) - gap;
    let bx = width - totalW - 8;
    const by = barPanelY + (barPanelH - btnH) / 2;

    for (const btn of btnData) {
      const bg = this.add.graphics().setDepth(51).setScrollFactor(0);
      bg.fillStyle(btn.color, 0.9);
      bg.fillRoundedRect(bx, by, btnW, btnH, 3);
      bg.lineStyle(1, 0x667788, 0.8);
      bg.strokeRoundedRect(bx, by, btnW, btnH, 3);
      this.add.text(bx + btnW / 2, by + btnH / 2, btn.label, {
        fontSize: '10px', color: '#dddddd', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);
      bx += btnW + gap;
    }
  }

  _setupSkillBar(width, height, barPanelY) {
    const keys = ['Z', 'X', 'C', 'V', 'B'];
    const labels = { Z: '三連鏢', X: '影步伐', C: '暗殺', V: '漩渦', B: '影分身' };
    const slotW = 52, slotH = 52, gap = 5;
    const totalW = keys.length * (slotW + gap) - gap;
    const startX = (width - totalW) / 2;
    const startY = barPanelY - slotH - 6;

    keys.forEach((key, i) => {
      const sx = startX + i * (slotW + gap);
      const sy = startY;

      const slotBg = this.add.graphics().setDepth(50).setScrollFactor(0);
      slotBg.fillStyle(0x0d0d22, 0.9);
      slotBg.fillRoundedRect(sx, sy, slotW, slotH, 6);
      slotBg.lineStyle(2, 0x3344aa, 0.8);
      slotBg.strokeRoundedRect(sx, sy, slotW, slotH, 6);

      const skillLabel = this.add.text(sx + slotW / 2, sy + slotH / 2 - 8, key, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      this.add.text(sx + slotW / 2, sy + slotH - 12, labels[key] || key, {
        fontSize: '8px', color: '#8899cc', fontFamily: 'Arial',
      }).setOrigin(0.5, 1).setDepth(52).setScrollFactor(0);

      const cdOverlay = this.add.graphics().setDepth(53).setScrollFactor(0);
      this._cdOverlays[key] = { overlay: cdOverlay, x: sx, y: sy, w: slotW, h: slotH };
      this._skillSlots[key] = skillLabel;
    });
  }

  _refreshCooldowns() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const mapNames = { sky: '浮空島嶼', ruins: '古代廢墟', kerning: 'Kerning City', boss: '暗影領域', town: '楓葉城' };
    this._mapText.setText(mapNames[gs.currentMap] || '');

    for (const [key, data] of Object.entries(this._cdOverlays)) {
      const { overlay, x, y, w, h } = data;
      overlay.clear();
      const cd = gs.skillCooldowns[key] || 0;
      const maxCd = SKILLS[key] ? SKILLS[key].cooldown : 1;
      const ratio = cd / maxCd;
      if (ratio > 0) {
        overlay.fillStyle(0x000000, 0.65);
        overlay.fillRect(x, y + h * (1 - ratio), w, h * ratio);
      }
      const unlocked = gs.unlockedSkills && gs.unlockedSkills.includes(key);
      if (this._skillSlots[key]) {
        this._skillSlots[key].setAlpha(unlocked ? 1 : 0.3);
      }
    }
  }

  _refreshAll() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    this._gs = gs;
    this._updateBar(this._hpBar,  gs.hp,  gs.maxHp,  0xff3333);
    this._updateBar(this._mpBar,  gs.mp,  gs.maxMp,  0x3355ff);
    this._updateBar(this._expBar, gs.exp, gs.expNeeded, 0xddaa00, true);
    this._hpNum.setText(`${Math.ceil(gs.hp)}/${gs.maxHp}`);
    this._mpNum.setText(`${Math.ceil(gs.mp)}/${gs.maxMp}`);
    this._levelText.setText(`Lv.${gs.level}`);
    this._spText.setText(`SP: ${gs.skillPoints || 0}`);
    this._mesoText.setText(`💰 ${gs.meso}`);
    this._onKillChange(null, gs.killCount);
  }

  _updateBar(barObj, current, max, color, isExpBar = false) {
    const x = barObj.getData('x'), y = barObj.getData('y');
    const w = barObj.getData('w'), h = barObj.getData('h');
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    barObj.clear();
    barObj.fillStyle(color, 0.92);
    if (isExpBar) {
      barObj.fillRect(x, y, w * ratio, h);
      // EXP 發光效果
      barObj.fillStyle(0xffdd44, 0.3);
      barObj.fillRect(x, y, w * ratio, 3);
    } else {
      barObj.fillRect(x, y, w * ratio, h);
    }
  }

  _onHpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._hpBar, value, gs.maxHp, 0xff3333);
    this._hpNum.setText(`${Math.ceil(value)}/${gs.maxHp}`);
  }

  _onMpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._mpBar, value, gs.maxMp, 0x3355ff);
    this._mpNum.setText(`${Math.ceil(value)}/${gs.maxMp}`);
  }

  _onExpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._expBar, value, gs.expNeeded, 0xddaa00, true);
  }

  _onLevelChange(parent, value) {
    this._levelText.setText(`Lv.${value}`);
    const gs = this.registry.get('gameState');
    if (gs) this._spText.setText(`SP: ${gs.skillPoints || 0}`);
  }

  _onSpChange(parent, value) {
    const color = value > 0 ? '#ffff44' : '#88ffcc';
    this._spText.setText(`SP: ${value}`);
    this._spText.setStyle({ fontSize: '12px', color, fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
  }

  _onLevelUp(parent, level) {
    const { width, height } = this.cameras.main;
    const txt = this.add.text(width / 2, height / 2 - 80, `🎉 Level Up!  Lv.${level}`, {
      fontSize: '40px', color: '#ffff00', fontFamily: 'Arial',
      stroke: '#aa6600', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(200).setScrollFactor(0);

    this.tweens.add({
      targets: txt, y: txt.y - 80, alpha: 0, duration: 2000,
      onComplete: () => txt.destroy(),
    });
  }

  _onMesoChange(parent, value) {
    this._mesoText.setText(`💰 ${value}`);
  }

  // ── 裝備欄（底部左側，頭像右方技能列右側）────────────────────────────────
  _setupEquipmentBar(width, height, barPanelY) {
    const slots = ['weapon', 'armor', 'gloves', 'helmet', 'boots'];
    const texKeys = {
      weapon: 'item-weapon', armor: 'item-armor',
      gloves: 'item-gloves', helmet: 'item-helmet', boots: 'item-boots',
    };
    const slotSize = 30, gap = 3;
    // 放在技能列左側（左下角）
    const startX = 16;
    const startY = barPanelY - slotSize - 10;

    this._equipSlots = {};
    slots.forEach((slot, i) => {
      const sx = startX + i * (slotSize + gap);
      const sy = startY;

      const bg = this.add.graphics().setDepth(50).setScrollFactor(0);
      bg.fillStyle(0x0d0d22, 0.85);
      bg.fillRect(sx, sy, slotSize, slotSize);
      bg.lineStyle(1, 0x334466, 0.9);
      bg.strokeRect(sx, sy, slotSize, slotSize);

      const icon = this.add.image(sx + slotSize / 2, sy + slotSize / 2, texKeys[slot])
        .setDepth(51).setScrollFactor(0)
        .setDisplaySize(20, 20)
        .setAlpha(0.25);

      this._equipSlots[slot] = { sx, sy, bg, icon };
    });
  }

  _refreshEquipment() {
    const gs = this.registry.get('gameState');
    if (!gs || !this._equipSlots) return;
    const slotSize = 30;
    for (const [slot, data] of Object.entries(this._equipSlots)) {
      const equip = gs.equipment[slot];
      const { sx, sy, bg, icon } = data;
      bg.clear();
      bg.fillStyle(0x0d0d22, 0.85);
      bg.fillRect(sx, sy, slotSize, slotSize);
      const borderColor = equip ? 0x44ff44 : 0x334466;
      bg.lineStyle(equip ? 2 : 1, borderColor, 0.9);
      bg.strokeRect(sx, sy, slotSize, slotSize);
      icon.setAlpha(equip ? 1.0 : 0.25);
    }
  }

  _onKillChange(parent, value) {
    const gs = this.registry.get('gameState');
    if (gs && gs.bossUnlocked) {
      this._killText.setText(`💀 Boss 解鎖！`);
      this._killText.setStyle({ color: '#ff44ff', fontSize: '12px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
    } else {
      const needed = 60;
      this._killText.setText(`💀 ${value}/${needed}`);
      const pct = value / needed;
      const color = pct >= 0.8 ? '#ffaa44' : '#ffee88';
      this._killText.setStyle({ color, fontSize: '12px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
    }
  }
}

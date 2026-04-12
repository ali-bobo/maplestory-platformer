import Phaser from 'phaser';
import { SKILLS, POTIONS, expNeeded } from '../config/constants.js';

// HUD 場景（平行運行）— 楓之谷風格底部狀態列
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this._gs = null;
    this._popup = null;
    const { width, height } = this.cameras.main;

    // ── 底部狀態列面板（雙列：上方狀態 + 下方技能/藥水）──────────────────────
    const barPanelH = 110;
    const barPanelY = height - barPanelH;   // = 610

    // 底部面板背景
    const panelBg = this.add.graphics().setDepth(50).setScrollFactor(0);
    panelBg.fillStyle(0x0a0a1a, 0.93);
    panelBg.fillRect(0, barPanelY, width, barPanelH);
    panelBg.lineStyle(1, 0x334466, 0.8);
    panelBg.strokeRect(0, barPanelY, width, barPanelH);

    // 分隔線（技能列與狀態列之間）
    const divG = this.add.graphics().setDepth(50).setScrollFactor(0);
    divG.lineStyle(1, 0x223355, 0.9);
    divG.lineBetween(0, barPanelY + 50, width, barPanelY + 50);

    // ── 角色頭像框（底部左側）────────────────────────────────────────────────
    const portX = 10, portY = barPanelY + 5, portW = 40, portH = 40;
    const portBg = this.add.graphics().setDepth(51).setScrollFactor(0);
    portBg.fillStyle(0x112244, 0.95);
    portBg.fillRect(portX, portY, portW, portH);
    portBg.lineStyle(2, 0x4488cc, 0.9);
    portBg.strokeRect(portX, portY, portW, portH);

    if (this.textures.exists('final_char')) {
      this.add.image(portX + portW / 2, portY + portH / 2, 'final_char')
        .setDisplaySize(portW - 4, portH - 4)
        .setDepth(52).setScrollFactor(0);
    }

    // ── HP/MP 條 ─────────────────────────────────────────────────────────────
    const barStartX = portX + portW + 8;   // = 58
    const barW = 155, barH = 11, barGap = 12;
    const hpY = barPanelY + 8;
    const mpY = hpY + barH + barGap;       // = 631

    this._hpBg  = this._makeBar(barStartX, hpY, barW, barH, 0x4d0000);
    this._hpBar = this._makeBar(barStartX, hpY, barW, barH, 0xff3333);
    this._hpLabel = this.add.text(barStartX + 3, hpY + 1, 'HP', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);
    this._hpNum = this.add.text(barStartX + barW + 4, hpY + 1, '', {
      fontSize: '9px', color: '#ffaaaa', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);

    this._mpBg  = this._makeBar(barStartX, mpY, barW, barH, 0x000044);
    this._mpBar = this._makeBar(barStartX, mpY, barW, barH, 0x3355ff);
    this._mpLabel = this.add.text(barStartX + 3, mpY + 1, 'MP', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);
    this._mpNum = this.add.text(barStartX + barW + 4, mpY + 1, '', {
      fontSize: '9px', color: '#aaaaff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(53).setScrollFactor(0);

    // EXP 條（底部最下方一條細條，全寬）
    const expBarH = 6;
    this._expBg  = this._makeBar(0, height - expBarH, width, expBarH, 0x221100);
    this._expBar = this._makeBar(0, height - expBarH, width, expBarH, 0xddaa00);

    // ── 角色名稱 / 等級（面板上方）──────────────────────────────────────────
    this._levelText = this.add.text(portX, barPanelY - 22, 'Lv.1', {
      fontSize: '13px', color: '#ffee44', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(51).setScrollFactor(0);

    this._classText = this.add.text(portX, barPanelY - 6, 'Soul Bender', {
      fontSize: '10px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(51).setScrollFactor(0);

    // ── 中段資訊（SP/Meso/Kill）─────────────────────────────────────────────
    const midX = barStartX + barW + 48;
    this._spText   = this.add.text(midX, barPanelY + 6,  'SP: 0',  { fontSize: '11px', color: '#88ffcc', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._mesoText = this.add.text(midX, barPanelY + 20, '💰 0',   { fontSize: '11px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._killText = this.add.text(midX, barPanelY + 34, '💀 0/60',{ fontSize: '11px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);

    // ── 地圖名稱（中央上方）──────────────────────────────────────────────────
    this._mapText = this.add.text(width / 2, barPanelY - 8, '', {
      fontSize: '12px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(51).setScrollFactor(0);

    // ── 右側選單按鈕（帶點擊互動）────────────────────────────────────────────
    this._setupMenuButtons(width, barPanelY);

    // ── 技能快捷列 + 藥水欄（內嵌在底部面板下列）────────────────────────────
    this._skillSlots = {};
    this._cdOverlays = {};
    this._potionSlots = {};
    this._setupSkillAndPotionBar(width, barPanelY);

    // ── 初始化 ────────────────────────────────────────────────────────────────
    this._refreshAll();

    // ── 監聽 Registry 事件 ────────────────────────────────────────────────────
    this.registry.events.on('changedata-hp',        this._onHpChange,    this);
    this.registry.events.on('changedata-mp',        this._onMpChange,    this);
    this.registry.events.on('changedata-exp',       this._onExpChange,   this);
    this.registry.events.on('changedata-level',     this._onLevelChange, this);
    this.registry.events.on('changedata-levelup',   this._onLevelUp,     this);
    this.registry.events.on('changedata-meso',      this._onMesoChange,  this);
    this.registry.events.on('changedata-killcount', this._onKillChange,  this);
    this.registry.events.on('changedata-sp',        this._onSpChange,    this);

    this.time.addEvent({ delay: 100, loop: true, callback: this._refreshCooldowns,  callbackScope: this });
    this.time.addEvent({ delay: 200, loop: true, callback: this._refreshPotionSlots, callbackScope: this });
  }

  _makeBar(x, y, w, h, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.9);
    g.fillRect(x, y, w, h);
    g.setDepth(50).setScrollFactor(0);
    g.setData('x', x).setData('y', y).setData('w', w).setData('h', h).setData('color', color);
    return g;
  }

  // ── 右側選單按鈕（帶點擊彈出選單）────────────────────────────────────────
  _setupMenuButtons(width, barPanelY) {
    const btnData = [
      { label: '道具', color: 0x225522, hoverColor: 0x448844, type: 'items'    },
      { label: '裝備', color: 0x332211, hoverColor: 0x554433, type: 'equip'    },
      { label: '技能', color: 0x112233, hoverColor: 0x334455, type: 'skills'   },
      { label: '地圖', color: 0x221133, hoverColor: 0x443355, type: 'map'      },
      { label: '設定', color: 0x333333, hoverColor: 0x555555, type: 'settings' },
    ];
    const btnW = 42, btnH = 22, gap = 3;
    const totalW = btnData.length * (btnW + gap) - gap;
    let bx = width - totalW - 8;
    const by = barPanelY + (50 - btnH) / 2;  // vertically center in status row

    for (const btn of btnData) {
      // 背景方塊（設定 interactive 讓它可點擊）
      const zone = this.add.zone(bx, by, btnW, btnH)
        .setOrigin(0, 0).setInteractive().setDepth(55).setScrollFactor(0);

      const bg = this.add.graphics().setDepth(51).setScrollFactor(0);
      const lbl = this.add.text(bx + btnW / 2, by + btnH / 2, btn.label, {
        fontSize: '10px', color: '#dddddd', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      const drawBtn = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? btn.hoverColor : btn.color, 0.95);
        bg.fillRoundedRect(bx, by, btnW, btnH, 3);
        bg.lineStyle(1, hover ? 0xaabbdd : 0x667788, 0.9);
        bg.strokeRoundedRect(bx, by, btnW, btnH, 3);
      };
      drawBtn(false);

      zone.on('pointerover',  () => drawBtn(true));
      zone.on('pointerout',   () => drawBtn(false));
      zone.on('pointerdown',  () => {
        if (this._popup && this._popup.type === btn.type) {
          this._closePopup();
        } else {
          this._openPopup(btn.type);
        }
      });

      bx += btnW + gap;
    }
  }

  // ── 技能 + 藥水列（內嵌在底部面板）────────────────────────────────────────
  _setupSkillAndPotionBar(width, barPanelY) {
    const skillKeys   = ['Z', 'X', 'C', 'V', 'B'];
    const potionKeys  = ['A', 'S', 'D', 'F', 'G'];
    const skillLabels = { Z: '三連鏢', X: '影步伐', C: '暗殺', V: '漩渦', B: '影分身' };

    const slotW = 44, slotH = 44, gap = 4;
    const potW  = 38, potH  = 44, potGap = 4;
    const sepW  = 10;
    const totalSkillW  = skillKeys.length  * (slotW + gap) - gap;   // 236
    const totalPotionW = potionKeys.length * (potW  + potGap) - potGap; // 206
    const totalW = totalSkillW + sepW + totalPotionW;  // 452

    const rowY = barPanelY + 54;                      // top of skill/potion row (inside panel)
    const skillStartX  = Math.floor((width - totalW) / 2);
    const potionStartX = skillStartX + totalSkillW + sepW;

    // ── 技能槽 ────────────────────────────────────────────────────────────────
    skillKeys.forEach((key, i) => {
      const sx = skillStartX + i * (slotW + gap);
      const sy = rowY;

      const slotBg = this.add.graphics().setDepth(50).setScrollFactor(0);
      slotBg.fillStyle(0x0d0d22, 0.9);
      slotBg.fillRoundedRect(sx, sy, slotW, slotH, 5);
      slotBg.lineStyle(2, 0x3344aa, 0.8);
      slotBg.strokeRoundedRect(sx, sy, slotW, slotH, 5);

      const skillLabel = this.add.text(sx + slotW / 2, sy + slotH / 2 - 9, key, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      this.add.text(sx + slotW / 2, sy + slotH - 11, skillLabels[key] || key, {
        fontSize: '8px', color: '#8899cc', fontFamily: 'Arial',
      }).setOrigin(0.5, 1).setDepth(52).setScrollFactor(0);

      const cdOverlay = this.add.graphics().setDepth(53).setScrollFactor(0);
      this._cdOverlays[key] = { overlay: cdOverlay, x: sx, y: sy, w: slotW, h: slotH };
      this._skillSlots[key] = skillLabel;
    });

    // ── 分隔線 ────────────────────────────────────────────────────────────────
    const sepG = this.add.graphics().setDepth(51).setScrollFactor(0);
    sepG.lineStyle(1, 0x334466, 0.7);
    const sepX = skillStartX + totalSkillW + sepW / 2;
    sepG.lineBetween(sepX, rowY + 4, sepX, rowY + slotH - 4);

    // ── 藥水槽 ────────────────────────────────────────────────────────────────
    potionKeys.forEach((key, i) => {
      const px = potionStartX + i * (potW + potGap);
      const py = rowY;
      const potion = POTIONS[key];

      const slotBg = this.add.graphics().setDepth(50).setScrollFactor(0);
      slotBg.fillStyle(0x0d0d1a, 0.9);
      slotBg.fillRoundedRect(px, py, potW, potH, 5);
      slotBg.lineStyle(2, 0x445566, 0.7);
      slotBg.strokeRoundedRect(px, py, potW, potH, 5);

      // 藥水顏色圓點
      const dotG = this.add.graphics().setDepth(52).setScrollFactor(0);
      dotG.fillStyle(potion.color, 0.85);
      dotG.fillCircle(px + potW / 2, py + potH / 2 - 8, 8);
      dotG.lineStyle(1, 0xffffff, 0.3);
      dotG.strokeCircle(px + potW / 2, py + potH / 2 - 8, 8);

      // 快捷鍵標籤
      this.add.text(px + potW / 2, py + potH - 16, key, {
        fontSize: '9px', color: '#cccccc', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      // 數量標籤（動態更新）
      const qtyText = this.add.text(px + potW - 4, py + 4, '', {
        fontSize: '10px', color: '#ffff88', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(53).setScrollFactor(0);

      this._potionSlots[key] = { bg: slotBg, dot: dotG, qtyText };
    });
  }

  // ── 定期刷新藥水數量顯示 ──────────────────────────────────────────────────
  _refreshPotionSlots() {
    const gs = this.registry.get('gameState');
    if (!gs || !gs.potions) return;
    for (const [key, slot] of Object.entries(this._potionSlots)) {
      const qty = gs.potions[key] || 0;
      slot.qtyText.setText(qty > 0 ? `×${qty}` : '');
      slot.dot.setAlpha(qty > 0 ? 1 : 0.35);
    }
  }

  _refreshCooldowns() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const mapNames = { sky: '浮空島嶼', henesys: '森林獵場', ruins: '古代廢墟', ellinia: '神秘之境', kerning: 'Kerning City', boss: '暗影領域', town: '楓葉城' };
    this._mapText.setText(mapNames[gs.currentMap] || '');

    for (const [key, data] of Object.entries(this._cdOverlays)) {
      overlay.clear();
      const cd = gs.skillCooldowns[key] || 0;
      const maxCd = SKILLS[key] ? SKILLS[key].cooldown : 1;
      const ratio = cd / maxCd;
      if (ratio > 0) {
        overlay.fillStyle(0x000000, 0.65);
        // 當冷卻比例 = 1 (剛施放，完全灰暗) 時使用圓角；其他情況方角（從底部向上填充）
        if (ratio >= 1) {
          overlay.fillRoundedRect(x, y, w, h, 5);
        } else {
          overlay.fillRect(x, y + h * (1 - ratio), w, h * ratio);
        }
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
    this._spText.setStyle({ fontSize: '11px', color, fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
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

  _onKillChange(parent, value) {
    const gs = this.registry.get('gameState');
    if (gs && gs.bossUnlocked) {
      this._killText.setText(`💀 Boss 解鎖！`);
      this._killText.setStyle({ color: '#ff44ff', fontSize: '11px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
    } else {
      const needed = 60;
      this._killText.setText(`💀 ${value}/${needed}`);
      const pct = value / needed;
      const color = pct >= 0.8 ? '#ffaa44' : '#ffee88';
      this._killText.setStyle({ color, fontSize: '11px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 });
    }
  }

  // ── 彈出選單系統 ──────────────────────────────────────────────────────────
  _openPopup(type) {
    this._closePopup();
    const { width, height } = this.cameras.main;
    const barPanelH = 110;
    const barPanelY = height - barPanelH;  // 610

    const popW = 340, popH = 280;
    const popX = width - popW - 10;
    const popY = barPanelY - popH - 10;

    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    // 背景板
    const bg = push(this.add.graphics().setDepth(150).setScrollFactor(0));
    bg.fillStyle(0x0a0a1a, 0.97);
    bg.fillRoundedRect(popX, popY, popW, popH, 8);
    bg.lineStyle(2, 0x4488cc, 0.9);
    bg.strokeRoundedRect(popX, popY, popW, popH, 8);

    // 標題
    const titles = { items: '道具欄', equip: '裝備欄', skills: '技能欄', map: '地圖資訊', settings: '設定' };
    push(this.add.text(popX + 14, popY + 12, titles[type] || '', {
      fontSize: '15px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
    }).setDepth(151).setScrollFactor(0));

    // 關閉按鈕 ×
    const closeZone = push(this.add.zone(popX + popW - 28, popY + 6, 24, 24)
      .setOrigin(0, 0).setInteractive().setDepth(155).setScrollFactor(0));
    const closeG = push(this.add.graphics().setDepth(154).setScrollFactor(0));
    const drawClose = (hover) => {
      closeG.clear();
      closeG.fillStyle(hover ? 0xaa3333 : 0x553333, 0.9);
      closeG.fillRoundedRect(popX + popW - 28, popY + 6, 22, 22, 4);
      closeG.lineStyle(1, 0xff4444, 0.6);
      closeG.strokeRoundedRect(popX + popW - 28, popY + 6, 22, 22, 4);
    };
    drawClose(false);
    push(this.add.text(popX + popW - 17, popY + 17, '×', {
      fontSize: '14px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setDepth(155).setScrollFactor(0));
    closeZone.on('pointerover',  () => drawClose(true));
    closeZone.on('pointerout',   () => drawClose(false));
    closeZone.on('pointerdown',  () => this._closePopup());

    // 分隔線
    const divG = push(this.add.graphics().setDepth(151).setScrollFactor(0));
    divG.lineStyle(1, 0x334466, 0.8);
    divG.lineBetween(popX + 10, popY + 34, popX + popW - 10, popY + 34);

    const contentY = popY + 44;

    if (type === 'items') {
      this._buildItemsPopup(push, popX, contentY, popW);
    } else if (type === 'equip') {
      this._buildEquipPopup(push, popX, contentY, popW);
    } else if (type === 'skills') {
      this._buildSkillsPopup(push, popX, contentY, popW);
    } else if (type === 'map') {
      this._buildMapPopup(push, popX, contentY, popW);
    } else if (type === 'settings') {
      this._buildSettingsPopup(push, popX, contentY, popW);
    }

    this._popup = { type, objects: objs };
  }

  _closePopup() {
    if (!this._popup) return;
    for (const obj of this._popup.objects) {
      if (obj && obj.destroy) obj.destroy();
    }
    this._popup = null;
  }

  // ── 道具欄彈出 ──────────────────────────────────────────────────────────
  _buildItemsPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const potions = gs ? (gs.potions || {}) : {};
    const rows = [
      { key: 'A', label: 'HP藥水',    desc: 'HP +100',  color: '#ff6666' },
      { key: 'S', label: '強效HP藥水', desc: 'HP +250', color: '#ff9944' },
      { key: 'D', label: 'MP藥水',    desc: 'MP +150',  color: '#6688ff' },
      { key: 'F', label: '強效MP藥水', desc: 'MP +300', color: '#aa66ff' },
      { key: 'G', label: '萬靈藥',    desc: 'HP+200/MP+200', color: '#88ff88' },
    ];
    rows.forEach((row, i) => {
      const rowY = contentY + i * 40;
      const qty = potions[row.key] || 0;
      push(this.add.text(popX + 14, rowY + 2, `[${row.key}]`, {
        fontSize: '12px', color: '#aaccff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));
      push(this.add.text(popX + 44, rowY + 2, row.label, {
        fontSize: '12px', color: row.color, fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));
      push(this.add.text(popX + 44, rowY + 17, row.desc, {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));
      push(this.add.text(popX + popW - 14, rowY + 10, `×${qty}`, {
        fontSize: '13px', color: qty > 0 ? '#ffff88' : '#555555', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setDepth(152).setScrollFactor(0));
    });
  }

  // ── 裝備欄彈出 ──────────────────────────────────────────────────────────
  _buildEquipPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const equipment = gs ? (gs.equipment || {}) : {};
    const slots = [
      { key: 'weapon',  label: '武器' },
      { key: 'armor',   label: '鎧甲' },
      { key: 'gloves',  label: '手套' },
      { key: 'helmet',  label: '頭盔' },
      { key: 'boots',   label: '靴子' },
    ];
    slots.forEach((slot, i) => {
      const rowY = contentY + i * 44;
      const equip = equipment[slot.key];
      push(this.add.text(popX + 14, rowY, slot.label, {
        fontSize: '12px', color: '#aaddff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));

      if (equip) {
        push(this.add.text(popX + 60, rowY, equip.displayName || equip.name, {
          fontSize: '12px', color: '#ffdd88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
        }).setDepth(152).setScrollFactor(0));
        const stats = [];
        if (equip.atk)   stats.push(`ATK+${equip.atk}`);
        if (equip.hp)    stats.push(`HP+${equip.hp}`);
        if (equip.speed) stats.push(`SPD+${equip.speed}`);
        push(this.add.text(popX + 60, rowY + 16, stats.join(' '), {
          fontSize: '9px', color: '#88ff88', fontFamily: 'Arial',
        }).setDepth(152).setScrollFactor(0));
      } else {
        push(this.add.text(popX + 60, rowY + 8, '（未裝備）', {
          fontSize: '11px', color: '#555555', fontFamily: 'Arial',
        }).setDepth(152).setScrollFactor(0));
      }
    });
  }

  // ── 技能欄彈出 ──────────────────────────────────────────────────────────
  _buildSkillsPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const rows = [
      { key: 'Z', def: SKILLS.Z },
      { key: 'X', def: SKILLS.X },
      { key: 'C', def: SKILLS.C },
      { key: 'V', def: SKILLS.V },
      { key: 'B', def: SKILLS.B },
    ];
    rows.forEach((row, i) => {
      const rowY = contentY + i * 44;
      const unlocked = gs && gs.unlockedSkills && gs.unlockedSkills.includes(row.key);
      const color = unlocked ? '#88ffcc' : '#666666';
      push(this.add.text(popX + 14, rowY, `[${row.key}] ${row.def.name}`, {
        fontSize: '12px', color, fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));
      push(this.add.text(popX + 14, rowY + 16, `解鎖Lv.${row.def.unlockLevel}  CD:${row.def.cooldown}s  MP:${row.def.mpCost}`, {
        fontSize: '9px', color: '#888888', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));
      const status = unlocked ? '✓ 已習得' : `需要 Lv.${row.def.unlockLevel}`;
      push(this.add.text(popX + popW - 14, rowY + 8, status, {
        fontSize: '10px', color: unlocked ? '#44ff88' : '#ff8844', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setDepth(152).setScrollFactor(0));
    });
    // SP 顯示
    push(this.add.text(popX + 14, contentY + 5 * 44, `可用技能點 SP: ${gs ? (gs.skillPoints || 0) : 0}`, {
      fontSize: '11px', color: '#ffff44', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
  }

  // ── 地圖資訊彈出 ────────────────────────────────────────────────────────
  _buildMapPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const mapNames = { sky: '浮空島嶼', henesys: '森林獵場', ruins: '古代廢墟', ellinia: '神秘之境', kerning: 'Kerning City', boss: '暗影領域', town: '楓葉城' };
    const currentMap = gs ? gs.currentMap : '';
    push(this.add.text(popX + 14, contentY, `目前地圖：${mapNames[currentMap] || '未知'}`, {
      fontSize: '13px', color: '#aaddff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    push(this.add.text(popX + 14, contentY + 28, '傳送門：', {
      fontSize: '12px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    const portalInfo = {
      sky:     ['→ 森林獵場（地圖右端）'],
      henesys: ['← 浮空島嶼（地圖左端）', '→ 古代廢墟（地圖右端）'],
      ruins:   ['← 森林獵場（地圖左端）', '→ 神秘之境（地圖右端）'],
      ellinia: ['← 古代廢墟（地圖左端）', '→ Kerning City（地圖右端）'],
      kerning: ['← 神秘之境（地圖左端）', '⚠ Boss 決戰（地圖右端，需擊殺60怪）'],
      boss:    ['← 逃離 Boss 房間'],
    };
    const portals = portalInfo[currentMap] || ['暫無傳送門資訊'];
    portals.forEach((p, i) => {
      push(this.add.text(popX + 24, contentY + 50 + i * 22, p, {
        fontSize: '11px', color: '#88ccff', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));
    });
    push(this.add.text(popX + 14, contentY + 120, `擊殺數：${gs ? (gs.killCount || 0) : 0} / 60`, {
      fontSize: '11px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
  }

  // ── 設定彈出 ────────────────────────────────────────────────────────────
  _buildSettingsPopup(push, popX, contentY, popW) {
    const lines = [
      { label: '移動',           key: '← →' },
      { label: '跳躍（可雙跳）',  key: 'Alt / ↑' },
      { label: '落下/穿越平台',   key: '↓' },
      { label: '技能',           key: 'Z X C V B' },
      { label: '藥水',           key: 'A S D F G' },
      { label: 'NPC 對話',       key: 'F' },
      { label: '關閉選單',       key: 'ESC' },
    ];
    lines.forEach((line, i) => {
      const rowY = contentY + i * 32;
      push(this.add.text(popX + 14, rowY, line.label, {
        fontSize: '11px', color: '#aaddee', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));
      push(this.add.text(popX + popW - 14, rowY, line.key, {
        fontSize: '11px', color: '#ffee44', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(152).setScrollFactor(0));
    });
  }
}

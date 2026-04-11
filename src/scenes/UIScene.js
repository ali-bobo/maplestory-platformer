import Phaser from 'phaser';
import { SKILLS, expNeeded } from '../config/constants.js';

// HUD 場景（平行運行）
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this._gs = null;

    // ── HP/MP/EXP 條 ──────────────────────────────────────────────────────────
    const barX = 16, barY = 16;
    const barW = 200, barH = 14;

    // 背景
    this._hpBg  = this._makeBar(barX, barY,          barW, barH, 0x440000);
    this._mpBg  = this._makeBar(barX, barY + 18,     barW, barH, 0x000044);
    this._expBg = this._makeBar(barX, barY + 36,     barW, barH, 0x222200);

    // 前景
    this._hpBar  = this._makeBar(barX, barY,          barW, barH, 0xff3333);
    this._mpBar  = this._makeBar(barX, barY + 18,     barW, barH, 0x4466ff);
    this._expBar = this._makeBar(barX, barY + 36,     barW, barH, 0xddcc00);

    // 文字標籤
    this._hpText  = this.add.text(barX,     barY,      'HP',  this._labelStyle()).setDepth(51);
    this._mpText  = this.add.text(barX,     barY + 18, 'MP',  this._labelStyle()).setDepth(51);
    this._expText = this.add.text(barX,     barY + 36, 'EXP', this._labelStyle()).setDepth(51);

    this._hpNum   = this.add.text(barX + barW + 6, barY,      '', this._valueStyle()).setDepth(51);
    this._mpNum   = this.add.text(barX + barW + 6, barY + 18, '', this._valueStyle()).setDepth(51);

    // ── 右上角資訊 ─────────────────────────────────────────────────────────────
    const infoX = this.cameras.main.width - 16;
    this._levelText  = this.add.text(infoX, 16,  'Lv.1',  this._infoStyle()).setOrigin(1, 0).setDepth(51);
    this._spText     = this.add.text(infoX, 40,  'SP: 0', { fontSize:'14px', color:'#88ffcc', fontFamily:'Arial', stroke:'#000', strokeThickness:3 }).setOrigin(1,0).setDepth(51);
    this._mesoText   = this.add.text(infoX, 62,  '💰 0',  this._infoStyle()).setOrigin(1, 0).setDepth(51);
    this._killText   = this.add.text(infoX, 86,  '💀 0',  this._infoStyle()).setOrigin(1, 0).setDepth(51);
    this._mapText    = this.add.text(infoX, 110, '',      this._smallStyle()).setOrigin(1, 0).setDepth(51);

    // ── 技能快捷列 ────────────────────────────────────────────────────────────
    this._skillSlots = {};
    this._cdOverlays = {};
    this._setupSkillBar();
    this._setupEquipmentBar();

    // ── 初始化 ────────────────────────────────────────────────────────────────
    this._refreshAll();

    // ── 監聽 Registry 事件 ────────────────────────────────────────────────────
    this.registry.events.on('changedata-hp',        this._onHpChange,        this);
    this.registry.events.on('changedata-mp',        this._onMpChange,        this);
    this.registry.events.on('changedata-exp',       this._onExpChange,       this);
    this.registry.events.on('changedata-level',     this._onLevelChange,     this);
    this.registry.events.on('changedata-levelup',   this._onLevelUp,         this);
    this.registry.events.on('changedata-meso',      this._onMesoChange,      this);
    this.registry.events.on('changedata-killcount', this._onKillChange,      this);
    this.registry.events.on('changedata-sp',        this._onSpChange,        this);

    // 定期全量刷新（冷卻條等）
    this.time.addEvent({ delay: 100, loop: true, callback: this._refreshCooldowns, callbackScope: this });
    // 定期刷新裝備欄
    this.time.addEvent({ delay: 500, loop: true, callback: this._refreshEquipment, callbackScope: this });
  }

  _makeBar(x, y, w, h, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.85);
    g.fillRect(x, y, w, h);
    g.setDepth(50).setScrollFactor(0);
    g.setData('x', x).setData('y', y).setData('w', w).setData('h', h).setData('color', color);
    return g;
  }

  _labelStyle()  { return { fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 }; }
  _valueStyle()  { return { fontSize: '11px', color: '#eeeeee', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }; }
  _infoStyle()   { return { fontSize: '16px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 }; }
  _smallStyle()  { return { fontSize: '13px', color: '#aaddff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }; }

  _setupSkillBar() {
    const keys = ['Z', 'X', 'C', 'V', 'B'];
    const labels = { Z: '三連飛鏢', X: '暗影步伐', C: '暗殺', V: '暗影漩渦', B: '影分身' };
    const { width, height } = this.cameras.main;
    const slotW = 56, slotH = 56, gap = 6;
    const totalW = keys.length * (slotW + gap) - gap;
    const startX = (width - totalW) / 2;
    const startY = height - slotH - 12;

    keys.forEach((key, i) => {
      const sx = startX + i * (slotW + gap);
      const sy = startY;

      // 背景槽
      const slotBg = this.add.graphics().setDepth(50).setScrollFactor(0);
      slotBg.fillStyle(0x111122, 0.85);
      slotBg.fillRoundedRect(sx, sy, slotW, slotH, 6);
      slotBg.lineStyle(2, 0x4455aa);
      slotBg.strokeRoundedRect(sx, sy, slotW, slotH, 6);

      // 技能圖示（用文字代替）
      const skillLabel = this.add.text(sx + slotW / 2, sy + slotH / 2 - 8, key, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      const nameLabel = this.add.text(sx + slotW / 2, sy + slotH - 14, labels[key] ? labels[key].slice(0, 4) : key, {
        fontSize: '9px', color: '#aaaaff', fontFamily: 'Arial',
      }).setOrigin(0.5, 1).setDepth(52).setScrollFactor(0);

      // 冷卻遮罩
      const cdOverlay = this.add.graphics().setDepth(53).setScrollFactor(0);
      this._cdOverlays[key] = { overlay: cdOverlay, x: sx, y: sy, w: slotW, h: slotH };
      this._skillSlots[key] = skillLabel;
    });
  }

  _refreshCooldowns() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const mapNames = { sky: '浮空島嶼', ruins: '古代廢墟', kerning: '盜賊地下城', boss: '暗影領域', town: '楓葉城' };
    this._mapText.setText(mapNames[gs.currentMap] || '');

    for (const [key, data] of Object.entries(this._cdOverlays)) {
      const { overlay, x, y, w, h } = data;
      overlay.clear();
      const cd = gs.skillCooldowns[key] || 0;
      const maxCd = SKILLS[key] ? SKILLS[key].cooldown : 1;
      const ratio = cd / maxCd;
      if (ratio > 0) {
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(x, y + h * (1 - ratio), w, h * ratio);
        // CD 數字
        overlay.fillStyle(0x000000, 0);
      }
      // 未解鎖則暗顯
      const unlocked = gs.unlockedSkills && gs.unlockedSkills.includes(key);
      if (this._skillSlots[key]) {
        this._skillSlots[key].setAlpha(unlocked ? 1 : 0.35);
      }
    }
  }

  _refreshAll() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    this._gs = gs;
    this._updateBar(this._hpBar,  'hp',  gs.hp,  gs.maxHp,  0xff3333);
    this._updateBar(this._mpBar,  'mp',  gs.mp,  gs.maxMp,  0x4466ff);
    this._updateBar(this._expBar, 'exp', gs.exp, gs.expNeeded, 0xddcc00);
    this._hpNum.setText(`${Math.ceil(gs.hp)}/${gs.maxHp}`);
    this._mpNum.setText(`${Math.ceil(gs.mp)}/${gs.maxMp}`);
    this._levelText.setText(`Lv.${gs.level}`);
    this._spText.setText(`SP: ${gs.skillPoints || 0}`);
    this._mesoText.setText(`💰 ${gs.meso}`);
    this._onKillChange(null, gs.killCount);
  }

  _updateBar(barObj, field, current, max, color) {
    const x = barObj.getData('x'), y = barObj.getData('y');
    const w = barObj.getData('w'), h = barObj.getData('h');
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    barObj.clear();
    barObj.fillStyle(color, 0.9);
    barObj.fillRect(x, y, w * ratio, h);
  }

  _onHpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._hpBar, 'hp', value, gs.maxHp, 0xff3333);
    this._hpNum.setText(`${Math.ceil(value)}/${gs.maxHp}`);
  }

  _onMpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._mpBar, 'mp', value, gs.maxMp, 0x4466ff);
    this._mpNum.setText(`${Math.ceil(value)}/${gs.maxMp}`);
  }

  _onExpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._expBar, 'exp', value, gs.expNeeded, 0xddcc00);
  }

  _onLevelChange(parent, value) {
    this._levelText.setText(`Lv.${value}`);
    const gs = this.registry.get('gameState');
    if (gs) this._spText.setText(`SP: ${gs.skillPoints || 0}`);
  }

  _onSpChange(parent, value) {
    this._spText.setText(`SP: ${value}`);
    if (value > 0) this._spText.setStyle({ fontSize:'14px', color:'#ffff44', fontFamily:'Arial', stroke:'#000', strokeThickness:3 });
    else this._spText.setStyle({ fontSize:'14px', color:'#88ffcc', fontFamily:'Arial', stroke:'#000', strokeThickness:3 });
  }

  _onLevelUp(parent, level) {
    // 升級動畫文字
    const { width, height } = this.cameras.main;
    const txt = this.add.text(width / 2, height / 2 - 40, `🎉 Level Up!  Lv.${level}`, {
      fontSize: '36px', color: '#ffff00', fontFamily: 'Arial',
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

  // ── 裝備欄（左下角，技能欄上方）─────────────────────────────────────────
  _setupEquipmentBar() {
    const slots = ['weapon', 'armor', 'gloves', 'helmet', 'boots'];
    const texKeys = {
      weapon: 'item-weapon', armor: 'item-armor',
      gloves: 'item-gloves', helmet: 'item-helmet', boots: 'item-boots',
    };
    const { height } = this.cameras.main;
    const slotSize = 36, gap = 4;
    const startX = 16;
    const startY = height - 56 - 12 - slotSize - 8;  // 技能欄上方

    this._equipSlots = {};
    slots.forEach((slot, i) => {
      const sx = startX + i * (slotSize + gap);
      const sy = startY;

      const bg = this.add.graphics().setDepth(50).setScrollFactor(0);
      bg.fillStyle(0x111122, 0.85);
      bg.fillRect(sx, sy, slotSize, slotSize);
      bg.lineStyle(1, 0x334466, 0.9);
      bg.strokeRect(sx, sy, slotSize, slotSize);

      const icon = this.add.image(sx + slotSize / 2, sy + slotSize / 2, texKeys[slot])
        .setDepth(51).setScrollFactor(0)
        .setDisplaySize(24, 24)
        .setAlpha(0.25);

      this._equipSlots[slot] = { sx, sy, bg, icon };
    });
  }

  _refreshEquipment() {
    const gs = this.registry.get('gameState');
    if (!gs || !this._equipSlots) return;
    const slotSize = 36;
    for (const [slot, data] of Object.entries(this._equipSlots)) {
      const equip = gs.equipment[slot];
      const { sx, sy, bg, icon } = data;
      bg.clear();
      bg.fillStyle(0x111122, 0.85);
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
      this._killText.setStyle({ color: '#ff44ff', fontSize: '15px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 });
    } else {
      const needed = 60;
      this._killText.setText(`💀 ${value}/${needed}`);
      const pct = value / needed;
      const color = pct >= 0.8 ? '#ffaa44' : '#ffee88';
      this._killText.setStyle({ color, fontSize: '15px', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 });
    }
  }
}

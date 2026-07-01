import Phaser from 'phaser';
import { SKILLS, POTIONS, expNeeded, MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { getQualityLevel, setQualityLevel, downgradeQuality, upgradeQuality } from '../engine/quality.js';
import { getActiveQuests } from '../engine/questManager.js';
import { getQuestDef } from '../config/quests.js';
import { screenFlash } from '../engine/vfx.js';

// HUD 場景（平行運行）— 楓之谷風格底部狀態列
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this._gs = null;
    this._popup = null;
    this._timers = [];
    const { width, height } = this.cameras.main;

    // ── 底部狀態列面板（單列：角色資訊 + 技能/藥水 + 功能按鈕）───────────────
    const barPanelH = height - WORLD_HEIGHT;
    const barPanelY = WORLD_HEIGHT;

    // Phase 12：底部面板背景——凍結為 image（消除每幀 batchLine）
    this._freezeStaticGraphics('hud_panel_bg', width, barPanelH, 0, barPanelY, 50, (g) => {
      g.fillStyle(0x0a0a1a, 0.93);
      g.fillRect(0, 0, width, barPanelH);
      g.lineStyle(1, 0x334466, 0.8);
      g.strokeRect(0, 0, width, barPanelH);
    });

    // ── 角色頭像框（底部左側）────────────────────────────────────────────────
    const portX = 10, portY = barPanelY + 10, portW = 40, portH = 40;
    // Phase 12：頭像框凍結為 image
    this._freezeStaticGraphics('hud_port_bg', portW, portH, portX, portY, 51, (g) => {
      g.fillStyle(0x112244, 0.95);
      g.fillRect(0, 0, portW, portH);
      g.lineStyle(2, 0x4488cc, 0.9);
      g.strokeRect(0, 0, portW, portH);
    });

    if (this.textures.exists('final_char')) {
      this.add.image(portX + portW / 2, portY + portH / 2, 'final_char')
        .setDisplaySize(portW - 4, portH - 4)
        .setDepth(52).setScrollFactor(0);
    }

    // ── HP/MP 條 ─────────────────────────────────────────────────────────────
    const barStartX = portX + portW + 8;
    const barW = 145, barH = 10, barGap = 7;
    const hpY = barPanelY + 10;
    const mpY = hpY + barH + barGap;

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
    const expBarH = 5;
    this._expBg  = this._makeBar(0, height - expBarH, width, expBarH, 0x221100);
    this._expBar = this._makeBar(0, height - expBarH, width, expBarH, 0xddaa00);

    // ── 角色名稱 / 等級（收進單列面板）──────────────────────────────────────
    this._levelText = this.add.text(portX + 2, barPanelY + 43, 'Lv.1', {
      fontSize: '13px', color: '#ffee44', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(51).setScrollFactor(0);

    this._classText = this.add.text(barStartX + 2, barPanelY + 42, 'Soul Bender', {
      fontSize: '9px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(51).setScrollFactor(0);

    // ── 中段資訊（SP/Meso/Kill）─────────────────────────────────────────────
    const midX = barStartX + barW + 34;
    this._spText   = this.add.text(midX, barPanelY + 10, 'SP: 0',  { fontSize: '10px', color: '#88ffcc', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._mesoText = this.add.text(midX, barPanelY + 24, '💰 0',   { fontSize: '10px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);
    this._killText = this.add.text(midX, barPanelY + 38, '💀 0/60',{ fontSize: '10px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }).setDepth(51).setScrollFactor(0);

    // ── 小地圖區域 + 地圖名稱（右上角）─────────────────────────────────────
    this._setupMinimap(width);

    // ── 右側選單按鈕（帶點擊互動）────────────────────────────────────────────
    this._setupMenuButtons(width, barPanelY);

    // ── 技能快捷列 + 藥水欄（內嵌在底部面板下列）────────────────────────────
    this._skillSlots = {};
    this._skillLevelTexts = {};
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

    // Phase 13：任務追蹤面板（右上小地圖下方）
    this._setupQuestPanel(width);

    // Phase 6.3：自適應品質 FPS 監測
    // warm-up 計數讓開場前幾秒不判斷（場景載入 FPS 不穩會誤判）
    this._fpsWarmup = 0;
    this._lowFpsCount = 0;
    this._highFpsCount = 0;

    // 統一定時器（Phase 15）：1 個 100ms loop 取代 5 個分散 addEvent
    // minimap 的 200ms timer 已移出 _setupMinimap，統一在此管理
    let _uiTick = 0;
    this._timers.push(this.time.addEvent({
      delay: 100, loop: true, callbackScope: this,
      callback: () => {
        _uiTick++;
        this._refreshCooldowns();                            // 100ms：冷卻遮罩 + 地圖名稱
        if (_uiTick % 2  === 0) this._refreshPotionSlots(); // 200ms：藥水數量
        if (_uiTick % 2  === 0) this._updateMinimap();      // 200ms：小地圖動態點
        if (_uiTick % 5  === 0) this._refreshQuestPanel();  // 500ms：任務面板
        if (_uiTick % 10 === 0) this._monitorFps();         // 1000ms：FPS 品質監測
      },
    }));

    // Phase 14：副本 HUD（預設隱藏，dungeon-start 事件觸發顯示）
    this._setupDungeonHUD(width);
    this.registry.events.on('dungeon-start', this._onDungeonStart, this);
    this.registry.events.on('dungeon-wave',  this._onDungeonWave,  this);
    this.registry.events.on('dungeon-tick',  this._onDungeonTick,  this);
    this.registry.events.on('dungeon-end',   this._onDungeonEnd,   this);

    // 只註冊 shutdown（理由同 BaseMapScene）：避免 relaunch 時 destroy 監聽累積
    this.events.once('shutdown', this._onShutdown, this);

    // Phase 15：ESC 暫停選單
    this._isPaused = false;
    this._pauseOverlayObjs = [];
    this._onUiEscKey = () => this._onEscKeyDown();
    this.input.keyboard.on('keydown-ESC', this._onUiEscKey);
  }

  // 每秒讀一次 actualFps，連續低/高於門檻才調整品質（避免抖動跳檔）
  _monitorFps() {
    // 開場 warm-up 3 秒不判斷（場景載入、紋理上傳會讓 FPS 短暫不穩）
    if (this._fpsWarmup < 3) { this._fpsWarmup++; return; }

    const fps = this.sys.game.loop.actualFps;
    const level = getQualityLevel(this);

    if (fps < 45) { this._lowFpsCount++; this._highFpsCount = 0; }
    else if (fps > 55) { this._highFpsCount++; this._lowFpsCount = 0; }
    else { this._lowFpsCount = 0; this._highFpsCount = 0; }

    // 降級：連續 3 秒 < 45 FPS（積極，卡了就降）
    if (this._lowFpsCount >= 3 && level !== 'low') {
      setQualityLevel(this, downgradeQuality(level));
      this._lowFpsCount = 0;
    }
    // 升級：連續 8 秒 > 55 FPS（保守，避免在臨界點反覆跳檔）
    else if (this._highFpsCount >= 8 && level !== 'high') {
      setQualityLevel(this, upgradeQuality(level));
      this._highFpsCount = 0;
    }
  }

  _makeBar(x, y, w, h, color) {
    // Phase 15 效能：Rectangle 走 batchSprite，消除 Graphics 每幀 batchFillPath。
    // scaleX 控制血量長度：GPU pure-transform，無 path/earcut 重繪。
    const bar = this.add.rectangle(x, y, w, h, color, 0.9)
      .setOrigin(0, 0)
      .setDepth(50)
      .setScrollFactor(0);
    bar.setData('w', w);
    return bar;
  }

  // Phase 12：把「畫完不變」的 Graphics 凍結為 image（規則 A）
  // 臨時 graphics 用相對 (0,0) 繪製 → generateTexture → destroy → 用 image 顯示。
  // image 走 batchSprite，徹底消除每幀 batchLine/batchFillPath。
  // 同 key 的紋理只建立一次，可被多個 image 共享（如 5 個技能格用同一張）。
  _freezeStaticGraphics(key, w, h, x, y, depth, drawFn) {
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
    }
    return this.add.image(x, y, key).setOrigin(0, 0).setDepth(depth).setScrollFactor(0);
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
    const by = barPanelY + 8;

    for (const btn of btnData) {
      // 背景方塊（設定 interactive 讓它可點擊）
      const zone = this.add.zone(bx, by, btnW, btnH)
        .setOrigin(0, 0).setInteractive().setDepth(55).setScrollFactor(0);

      // Rectangle 走 batchSprite；setFillStyle 改色無 earcut，消除每次 hover 的 rounded rect 重繪
      const bgRect = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH, btn.color, 0.95)
        .setDepth(51).setScrollFactor(0);
      const lbl = this.add.text(bx + btnW / 2, by + btnH / 2, btn.label, {
        fontSize: '10px', color: '#dddddd', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      zone.on('pointerover',  () => bgRect.setFillStyle(btn.hoverColor, 0.95));
      zone.on('pointerout',   () => bgRect.setFillStyle(btn.color, 0.95));
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

  // ── 小地圖 + 地圖名稱（右上角，楓之谷風格）──────────────────────────────
  _setupMinimap(width) {
    const mmW = 160, mmH = 100;
    const mmX = width - mmW - 8, mmY = 8;

    // 半透明小地圖背景框
    // Phase 12：小地圖框凍結為 image（消除 strokeRoundedRect 的 batchLine）
    const mmBg = this._freezeStaticGraphics('hud_mm_bg', mmW, mmH, mmX, mmY, 50, (g) => {
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(0, 0, mmW, mmH, 4);
      g.lineStyle(1, 0x4488aa, 0.6);
      g.strokeRoundedRect(0, 0, mmW, mmH, 4);
    });

    // 地圖名稱（小地圖上方，不額外佔黑色區塊）
    this._mapText = this.add.text(mmX + mmW / 2, mmY - 2, '', {
      fontSize: '11px', color: '#aaddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(51).setScrollFactor(0);

    // Phase 3.3：小地圖重構
    // 平台層用 RenderTexture 預繪一次（隨地圖切換重建），永不重繪
    // 玩家點、怪物點改用 Rectangle + Object Pool，每 200ms 只 setPosition
    this._minimapBg = mmBg;
    this._minimapRect = { x: mmX, y: mmY, w: mmW, h: mmH };
    this._minimapPlatformLayer = null;   // 預繪平台 image，地圖切換時重建
    this._currentMinimapMap = null;      // 當前已預繪的地圖 key
    // 玩家點（黃色 rectangle，初始隱藏，待 update 時定位）
    this._minimapPlayerDot = this.add.rectangle(mmX, mmY, 5, 5, 0xffff00)
      .setDepth(53).setScrollFactor(0).setVisible(false);
    // 怪物點 Pool（動態擴充）
    this._minimapMonsterDots = [];

    // 定期更新小地圖：已整合至 create() 統一定時器（每 200ms），此處不再另建 addEvent
  }

  // 將 mapData.platforms 預繪到 RenderTexture 並產生 texture，地圖切換時呼叫
  _rebuildMinimapPlatformLayer(mapData, mapKey) {
    if (this._minimapPlatformLayer) {
      this._minimapPlatformLayer.destroy();
      this._minimapPlatformLayer = null;
    }
    const { x: mmX, y: mmY, w: mmW, h: mmH } = this._minimapRect;
    const mapW = mapData.width || 2560;
    const mapH = 600;
    const scaleX = (mmW - 8) / mapW;
    const scaleY = (mmH - 20) / mapH;

    // 用臨時 graphics 一次性繪製全部平台，generateTexture 後立即 destroy
    const tempG = this.add.graphics();
    for (const p of mapData.platforms) {
      const px = 4 + p.x * scaleX;
      const py = 14 + p.y * scaleY;
      const pw = Math.max(2, p.width * scaleX);
      tempG.fillStyle(p.isGround ? 0x88aa66 : 0x6688aa, 0.8);
      tempG.fillRect(px, py, pw, 2);
    }
    const texKey = `minimap_platforms_${mapKey}`;
    // 若已存在則先移除舊紋理，確保地圖內容變更時能更新
    if (this.textures.exists(texKey)) this.textures.remove(texKey);
    tempG.generateTexture(texKey, mmW, mmH);
    tempG.destroy();

    this._minimapPlatformLayer = this.add.image(mmX, mmY, texKey)
      .setOrigin(0, 0).setDepth(51).setScrollFactor(0);
  }

  _updateMinimap() {
    if (!this._minimapRect) return;
    const gs = this.registry.get('gameState');
    if (!gs) return;

    const mapData = MAPS[gs.currentMap];
    if (!mapData) return;

    // 地圖切換 → 重建靜態平台層（一次性）
    if (this._currentMinimapMap !== gs.currentMap) {
      this._currentMinimapMap = gs.currentMap;
      this._rebuildMinimapPlatformLayer(mapData, gs.currentMap);
    }

    const { x: mmX, y: mmY, w: mmW, h: mmH } = this._minimapRect;
    const mapW = mapData.width || 2560;
    const scaleX = (mmW - 8) / mapW;
    const scaleY = (mmH - 20) / 600;

    if (!mapData.sceneKey) {
      this._minimapPlayerDot.setVisible(false);
      return;
    }
    const gameScene = this.scene.manager.getScene(mapData.sceneKey);
    if (!gameScene || !gameScene.player || !gameScene.player.active) {
      this._minimapPlayerDot.setVisible(false);
      // 隱藏所有怪物點
      for (const dot of this._minimapMonsterDots) dot.setVisible(false);
      return;
    }

    // 玩家點：rectangle 直接 setPosition（不重繪、不 path、不 earcut）
    const playerMmX = mmX + 4 + gameScene.player.x * scaleX;
    const playerMmY = mmY + 14 + gameScene.player.y * scaleY;
    this._minimapPlayerDot.setPosition(playerMmX, playerMmY).setVisible(true);

    // 怪物點 Pool：active 怪物循序對應到 pool 中的 rectangle，多餘的隱藏
    if (gameScene.monsters) {
      const children = gameScene.monsters.getChildren();
      let i = 0;
      for (const m of children) {
        if (!m.active || m.isDead) continue;
        const mx = mmX + 4 + m.x * scaleX;
        const my = mmY + 14 + m.y * scaleY;
        let dot = this._minimapMonsterDots[i];
        if (!dot) {
          dot = this.add.rectangle(mx, my, 3, 3, 0xff4444, 0.7)
            .setDepth(52).setScrollFactor(0);
          this._minimapMonsterDots[i] = dot;
        } else {
          dot.setPosition(mx, my).setVisible(true);
        }
        i++;
      }
      // 隱藏多餘的 pool 元素（怪物變少時）
      for (; i < this._minimapMonsterDots.length; i++) {
        this._minimapMonsterDots[i].setVisible(false);
      }
    }
  }

  // ── 技能 + 藥水列（內嵌在底部面板）────────────────────────────────────────
  _setupSkillAndPotionBar(width, barPanelY) {
    const skillKeys   = ['Z', 'X', 'C', 'V', 'B'];
    const potionKeys  = ['A', 'S', 'D', 'R', 'G'];
    const skillLabels = { Z: '三連鏢', X: '影步伐', C: '暗殺', V: '漩渦', B: '影分身' };

    const slotW = 34, slotH = 44, gap = 3;
    const potW  = 30, potH  = 44, potGap = 3;
    const sepW  = 10;
    const totalSkillW  = skillKeys.length  * (slotW + gap) - gap;
    const totalPotionW = potionKeys.length * (potW  + potGap) - potGap;
    const totalW = totalSkillW + sepW + totalPotionW;

    const rowY = barPanelY + 8;
    const skillStartX  = Math.floor(width / 2 - totalW / 2 + 18);
    const potionStartX = skillStartX + totalSkillW + sepW;

    // ── 技能槽 ────────────────────────────────────────────────────────────────
    // Phase 12：5 個技能格邊框/底色相同，預渲染「1 張共用紋理」+ 5 個 image
    skillKeys.forEach((key, i) => {
      const sx = skillStartX + i * (slotW + gap);
      const sy = rowY;

      this._freezeStaticGraphics('hud_skill_slot', slotW, slotH, sx, sy, 50, (g) => {
        g.fillStyle(0x0d0d22, 0.9);
        g.fillRoundedRect(0, 0, slotW, slotH, 5);
        g.lineStyle(2, 0x3344aa, 0.8);
        g.strokeRoundedRect(0, 0, slotW, slotH, 5);
      });

      const skillLabel = this.add.text(sx + slotW / 2, sy + slotH / 2 - 9, key, {
        fontSize: '14px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(52).setScrollFactor(0);

      this.add.text(sx + slotW / 2, sy + slotH - 11, skillLabels[key] || key, {
        fontSize: '7px', color: '#8899cc', fontFamily: 'Arial',
      }).setOrigin(0.5, 1).setDepth(52).setScrollFactor(0);

      // 技能等級小數字（右上角）
      const lvText = this.add.text(sx + slotW - 3, sy + 2, '', {
        fontSize: '8px', color: '#ffdd66', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(54).setScrollFactor(0);

      const cdOverlay = this.add.graphics().setDepth(53).setScrollFactor(0);
      this._cdOverlays[key] = { overlay: cdOverlay, x: sx, y: sy, w: slotW, h: slotH };
      this._skillSlots[key] = skillLabel;
      this._skillLevelTexts[key] = lvText;
    });

    // ── 分隔線 ────────────────────────────────────────────────────────────────
    // Phase 12：分隔線改用 rectangle（無 stroke）取代 graphics lineBetween
    const sepX = skillStartX + totalSkillW + sepW / 2;
    this.add.rectangle(sepX, rowY + 4, 1, slotH - 8, 0x334466, 0.7)
      .setOrigin(0.5, 0).setDepth(51).setScrollFactor(0);

    // ── 藥水槽 ────────────────────────────────────────────────────────────────
    // Phase 12：5 個藥水格邊框共用紋理；藥水圓改 image + setTint(potion.color)
    potionKeys.forEach((key, i) => {
      const px = potionStartX + i * (potW + potGap);
      const py = rowY;
      const potion = POTIONS[key];

      // 藥水格底（共用 hud_potion_slot 紋理）
      const slotBg = this._freezeStaticGraphics('hud_potion_slot', potW, potH, px, py, 50, (g) => {
        g.fillStyle(0x0d0d1a, 0.9);
        g.fillRoundedRect(0, 0, potW, potH, 5);
        g.lineStyle(2, 0x445566, 0.7);
        g.strokeRoundedRect(0, 0, potW, potH, 5);
      });

      // 藥水顏色圓點：共用「白色 fillCircle + 白色 strokeCircle」紋理 + setTint 染色
      // 紋理 20×20，圓心 (10, 10)，半徑 8
      if (!this.textures.exists('hud_potion_dot')) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(10, 10, 8);
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeCircle(10, 10, 8);
        g.generateTexture('hud_potion_dot', 20, 20);
        g.destroy();
      }
      const dotG = this.add.image(px + potW / 2, py + potH / 2 - 8, 'hud_potion_dot')
        .setDepth(52).setScrollFactor(0).setTint(potion.color);

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
    // 地圖名稱也加 dirty flag：值沒變就跳過 setText
    const mapNames = { sky: '浮空島嶼', henesys: '森林獵場', ruins: '古代廢墟', ellinia: '神秘之境', taipei: '台北都會', kerning: 'Kerning City', boss: '暗影領域', town: '楓葉城' };
    const mapName = mapNames[gs.currentMap] || '';
    if (mapName !== this._lastMapName) {
      this._lastMapName = mapName;
      this._mapText.setText(mapName);
    }

    for (const [key, data] of Object.entries(this._cdOverlays)) {
      const { overlay, x, y, w, h } = data;
      const cd = gs.skillCooldowns[key] || 0;
      const maxCd = SKILLS[key] ? SKILLS[key].cooldown : 1;
      const ratio = cd / maxCd;
      // dirty flag：ratio 量化到 50 step（0.02 精度），避免每 100ms 重繪
      const quantized = Math.round(ratio * 50);
      if (quantized !== data._lastRatioQ) {
        data._lastRatioQ = quantized;
        overlay.clear();
        if (ratio > 0) {
          overlay.fillStyle(0x000000, 0.65);
          // 統一使用 fillRect（從底部向上填充），避免 fillRoundedRect 的 earcut 路徑
          overlay.fillRect(x, y + h * (1 - ratio), w, h * ratio);
        }
      }
      // 解鎖狀態加 dirty flag
      const unlocked = !!(gs.unlockedSkills && gs.unlockedSkills.includes(key));
      if (this._skillSlots[key] && unlocked !== data._lastUnlocked) {
        data._lastUnlocked = unlocked;
        this._skillSlots[key].setAlpha(unlocked ? 1 : 0.3);
      }
      // 技能等級加 dirty flag
      if (this._skillLevelTexts[key]) {
        const lv = gs.skillLevels ? (gs.skillLevels[key] || 0) : 0;
        const lvText = unlocked && lv > 0 ? `${lv}` : '';
        if (lvText !== data._lastLvText) {
          data._lastLvText = lvText;
          this._skillLevelTexts[key].setText(lvText);
        }
      }
    }
  }

  // Phase 13：任務追蹤面板（右上小地圖下方）
  _setupQuestPanel(width) {
    const qX = width - 168;     // 與小地圖右對齊
    const qY = 113;              // 小地圖下方（mmY 8 + mmH 100 + 5 間距）
    // 半透明背景（rectangle，無 stroke）
    this._questPanelBg = this.add.rectangle(qX, qY, 160, 60, 0x000000, 0.5)
      .setOrigin(0, 0).setDepth(50).setScrollFactor(0).setVisible(false);
    // 標題
    this._questPanelTitle = this.add.text(qX + 6, qY + 4, '◆ 任務', {
      fontSize: '11px', color: '#ffdd66', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(51).setScrollFactor(0).setVisible(false);
    // 最多顯示 3 行任務
    this._questTexts = [];
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(qX + 6, qY + 20 + i * 14, '', {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(51).setScrollFactor(0).setVisible(false);
      this._questTexts.push(t);
    }
    // 完成 toast（短暫顯示完成的任務名）
    this._questToast = this.add.text(width / 2, 120, '', {
      fontSize: '18px', color: '#ffdd66', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(200).setScrollFactor(0).setVisible(false);
    this._lastCompletedCount = -1; // 初次 refresh 會同步，不誤判已完成的任務為「新完成」
  }

  _refreshQuestPanel() {
    const gs = this.registry.get('gameState');
    const qs = gs?.quests;
    if (!qs) return;

    // 偵測新完成的任務（與上次比較 completed 陣列長度）
    if (this._lastCompletedCount < 0) {
      this._lastCompletedCount = qs.completed.length; // 初始同步，避免誤判
    } else if (qs.completed.length > this._lastCompletedCount) {
      const newIds = qs.completed.slice(this._lastCompletedCount);
      this._lastCompletedCount = qs.completed.length;
      // 顯示第一個新完成的任務 toast（多個則只顯示最新的）
      const newestId = newIds[newIds.length - 1];
      const def = getQuestDef(newestId);
      if (def) this._showQuestCompleteToast(def);
    }

    // 顯示 active 任務
    const active = getActiveQuests(this);
    if (active.length === 0) {
      this._questPanelBg.setVisible(false);
      this._questPanelTitle.setVisible(false);
      for (const t of this._questTexts) t.setVisible(false);
      return;
    }
    this._questPanelBg.setVisible(true).height = 22 + Math.min(3, active.length) * 14;
    this._questPanelTitle.setVisible(true);
    for (let i = 0; i < this._questTexts.length; i++) {
      const t = this._questTexts[i];
      if (i < active.length) {
        const q = active[i];
        t.setText(`${q.def.name}  ${q.progress}/${q.def.count}`).setVisible(true);
      } else {
        t.setVisible(false);
      }
    }
  }

  _showQuestCompleteToast(def) {
    if (!this._questToast) return;
    this._questToast.setText(`◆ 任務完成：${def.name}\n+${def.rewards?.exp || 0} EXP  +${def.rewards?.meso || 0} 楓幣`)
      .setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: this._questToast,
      alpha: 0,
      y: 100,
      duration: 2500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (this._questToast?.active) {
          this._questToast.setVisible(false).setY(120);
        }
      },
    });
  }

  // ── Phase 14：副本 HUD ─────────────────────────────────────────────────────
  // 預設隱藏；只在副本內顯示「波次 N/M  ⏱ MM:SS」於畫面上方中央
  _setupDungeonHUD(width) {
    // 上方中央：副本名稱 + 波次 + 倒數
    this._dungeonInfoText = this.add.text(width / 2, 16, '', {
      fontSize: '16px', color: '#ffee99', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5, 0).setDepth(60).setScrollFactor(0).setVisible(false);

    // 結算 popup（容器：背景 + 標題 + 內文 + 確認按鈕）— 預設隱藏
    this._dungeonResultObjs = []; // 用於統一 setVisible
  }

  _onDungeonStart(payload) {
    const def = payload?.def;
    if (!def) return;
    this._dungeonName = def.name;
    this._dungeonInfoText.setText(`【${def.name}】`).setVisible(true);
  }

  _onDungeonWave(payload) {
    if (!this._dungeonInfoText?.visible) return;
    this._dungeonWaveStr = `波次 ${payload.current}/${payload.total}`;
    this._refreshDungeonInfoText();
  }

  _onDungeonTick(payload) {
    if (!this._dungeonInfoText?.visible) return;
    const remaining = Math.max(0, payload.remaining || 0);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    // 倒數 < 30s 變紅色
    const color = remaining <= 30 ? '#ff6666' : '#ffee99';
    this._dungeonTimeStr = `⏱ ${mm}:${ss}`;
    this._dungeonInfoText.setColor(color);
    this._refreshDungeonInfoText();
  }

  _refreshDungeonInfoText() {
    if (!this._dungeonInfoText) return;
    const parts = [`【${this._dungeonName || ''}】`];
    if (this._dungeonWaveStr) parts.push(this._dungeonWaveStr);
    if (this._dungeonTimeStr) parts.push(this._dungeonTimeStr);
    this._dungeonInfoText.setText(parts.join('  '));
  }

  _onDungeonEnd(payload) {
    // 隱藏副本 HUD
    if (this._dungeonInfoText) this._dungeonInfoText.setVisible(false);
    // 顯示結算 popup
    this._showDungeonResult(payload);
  }

  _showDungeonResult(payload) {
    const { width, height } = this.cameras.main;
    const pw = 420, ph = 280;
    const px = width / 2 - pw / 2;
    const py = height / 2 - ph / 2;
    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    // 半透明遮罩（rectangle，無 stroke）
    push(this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0).setDepth(199).setScrollFactor(0));
    // popup 邊框（白色稍大）
    push(this.add.rectangle(px - 3, py - 3, pw + 6, ph + 6,
      payload.victory ? 0xffdd44 : 0xff4444, 0.9)
      .setOrigin(0, 0).setDepth(200).setScrollFactor(0));
    // popup 底色
    push(this.add.rectangle(px, py, pw, ph, 0x14182a, 0.96)
      .setOrigin(0, 0).setDepth(201).setScrollFactor(0));
    // 標題
    push(this.add.text(width / 2, py + 24,
      payload.victory ? '◆ 副本通關 ◆' : '☠ 挑戰失敗 ☠',
      { fontSize: '28px', color: payload.victory ? '#ffee99' : '#ff8888',
        fontFamily: 'Arial', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    // 副本名
    push(this.add.text(width / 2, py + 64, payload.def?.name || '',
      { fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    // 獎勵內文
    const lines = [];
    if (payload.victory) {
      lines.push(`基礎獎勵：+${payload.baseExp} EXP   +${payload.meso} 楓幣`);
      if (payload.bonusExp > 0) {
        lines.push(`時間加成：剩餘 ${payload.timeRemaining}s × ${payload.def?.timeBonus || 5} = +${payload.bonusExp} EXP`);
      }
    } else {
      lines.push(`原因：${payload.reason === 'timeout' ? '時間到' : '角色陣亡'}`);
      if (payload.baseExp > 0 || payload.meso > 0) {
        lines.push(`安慰獎勵：+${payload.baseExp} EXP   +${payload.meso} 楓幣`);
      }
    }
    lines.forEach((line, i) => {
      push(this.add.text(width / 2, py + 110 + i * 28, line,
        { fontSize: '14px', color: '#ddddee', fontFamily: 'Arial',
          stroke: '#000', strokeThickness: 2 })
        .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    });
    // 確認按鈕（rectangle + text 可點擊）
    const btnW = 160, btnH = 38;
    const btnX = width / 2 - btnW / 2;
    const btnY = py + ph - 60;
    const btnBg = push(this.add.rectangle(btnX, btnY, btnW, btnH, 0x3366aa, 0.92)
      .setOrigin(0, 0).setDepth(203).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    push(this.add.text(width / 2, btnY + btnH / 2, '回到楓葉城',
      { fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0.5).setDepth(204).setScrollFactor(0));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x4488dd, 0.95));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x3366aa, 0.92));
    btnBg.on('pointerdown', () => {
      // 清除 popup + 通知 DungeonScene 退出
      objs.forEach((o) => o.destroy());
      const dungeonScene = this.scene.get('DungeonScene');
      if (dungeonScene && typeof dungeonScene.exitDungeon === 'function') {
        dungeonScene.exitDungeon();
      }
    });

    this._dungeonResultObjs = objs;
  }

  _onShutdown() {
    this._closePopup();
    this.registry.events.off('changedata-hp',        this._onHpChange,    this);
    this.registry.events.off('changedata-mp',        this._onMpChange,    this);
    this.registry.events.off('changedata-exp',       this._onExpChange,   this);
    this.registry.events.off('changedata-level',     this._onLevelChange, this);
    this.registry.events.off('changedata-levelup',   this._onLevelUp,     this);
    this.registry.events.off('changedata-meso',      this._onMesoChange,  this);
    this.registry.events.off('changedata-killcount', this._onKillChange,  this);
    this.registry.events.off('changedata-sp',        this._onSpChange,    this);
    // Phase 14：副本事件解除
    this.registry.events.off('dungeon-start', this._onDungeonStart, this);
    this.registry.events.off('dungeon-wave',  this._onDungeonWave,  this);
    this.registry.events.off('dungeon-tick',  this._onDungeonTick,  this);
    this.registry.events.off('dungeon-end',   this._onDungeonEnd,   this);

    for (const timer of this._timers || []) {
      timer.remove(false);
    }
    this._timers = [];

    // Phase 15：清除 ESC 暫停選單
    if (this._onUiEscKey) {
      this.input.keyboard.off('keydown-ESC', this._onUiEscKey);
      this._onUiEscKey = null;
    }
    if (this._isPaused) {
      const mapSceneKey = this._getCurrentMapSceneKey();
      if (mapSceneKey) this.scene.resume(mapSceneKey);
      this._isPaused = false;
    }
    for (const obj of this._pauseOverlayObjs || []) { if (obj?.active) obj.destroy(); }
    this._pauseOverlayObjs = [];
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
    // Phase 15 效能：Rectangle.scaleX 是純 GPU transform，無 path 重繪。
    // color / isExpBar 參數保留以維持呼叫端相容性，不再使用。
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    barObj.scaleX = ratio;
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
    // 全屏白閃
    screenFlash(this, 400, 0.55);
    // 升級文字：從 scale 0 彈出，再上飄淡出
    const txt = this.add.text(width / 2, height / 2 - 80, `🎉 Level Up!  Lv.${level}`, {
      fontSize: '40px', color: '#ffff00', fontFamily: 'Arial',
      stroke: '#aa6600', strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(200).setScrollFactor(0).setScale(0);

    this.tweens.add({
      targets: txt,
      scaleX: 1, scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt, y: txt.y - 80, alpha: 0, duration: 2000,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // ── Phase 15：ESC 暫停選單 ─────────────────────────────────────────────────

  _getCurrentMapSceneKey() {
    const gs = this.registry.get('gameState');
    const key = MAP_SCENE_KEYS[gs?.currentMap];
    if (key && this.scene.isActive(key)) return key;
    if (this.scene.isActive('DungeonScene')) return 'DungeonScene';
    if (this.scene.isActive('BossScene')) return 'BossScene';
    return null;
  }

  _onEscKeyDown() {
    const mapSceneKey = this._getCurrentMapSceneKey();
    if (!mapSceneKey) return;

    // 若 NPC 對話開啟中，讓 BaseMapScene 的 ESC 處理器優先
    const mapScene = this.scene.manager.getScene(mapSceneKey);
    if (mapScene?._npcDialog) return;

    if (this._isPaused) {
      this._closePauseMenu();
    } else {
      this._openPauseMenu();
    }
  }

  _openPauseMenu() {
    if (this._isPaused) return;
    this._isPaused = true;

    const mapSceneKey = this._getCurrentMapSceneKey();
    if (mapSceneKey) this.scene.pause(mapSceneKey);

    const { width, height } = this.cameras.main;
    const objs = this._pauseOverlayObjs;
    const push = (obj) => { objs.push(obj); return obj; };

    // 半透明黑底
    push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(190).setScrollFactor(0));

    // 標題
    push(this.add.text(width / 2, height / 2 - 70, '⏸ 遊戲暫停', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(195).setScrollFactor(0));

    const btnW = 200, btnH = 46;

    // 繼續遊戲
    const resumeBtn = push(this.add.rectangle(width / 2, height / 2 + 10, btnW, btnH, 0x226622, 0.95)
      .setStrokeStyle(2, 0x44cc44).setDepth(195).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    push(this.add.text(width / 2, height / 2 + 10, '繼續遊戲', {
      fontSize: '20px', color: '#aaffaa', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(196).setScrollFactor(0));
    resumeBtn.on('pointerover', () => resumeBtn.setFillStyle(0x338833, 0.95));
    resumeBtn.on('pointerout',  () => resumeBtn.setFillStyle(0x226622, 0.95));
    resumeBtn.on('pointerdown', () => this._closePauseMenu());

    // 返回主選單
    const menuBtn = push(this.add.rectangle(width / 2, height / 2 + 68, btnW, btnH, 0x442222, 0.95)
      .setStrokeStyle(2, 0xcc4444).setDepth(195).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    push(this.add.text(width / 2, height / 2 + 68, '返回主選單', {
      fontSize: '20px', color: '#ffaaaa', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(196).setScrollFactor(0));
    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x663333, 0.95));
    menuBtn.on('pointerout',  () => menuBtn.setFillStyle(0x442222, 0.95));
    menuBtn.on('pointerdown', () => {
      this._isPaused = false;
      for (const obj of this._pauseOverlayObjs) { if (obj?.active) obj.destroy(); }
      this._pauseOverlayObjs = [];
      const key = this._getCurrentMapSceneKey();
      if (key) this.scene.stop(key);
      this.scene.start('MenuScene');
    });
  }

  _closePauseMenu() {
    if (!this._isPaused) return;
    this._isPaused = false;
    for (const obj of this._pauseOverlayObjs) { if (obj?.active) obj.destroy(); }
    this._pauseOverlayObjs = [];
    const mapSceneKey = this._getCurrentMapSceneKey();
    if (mapSceneKey) this.scene.resume(mapSceneKey);
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
    const barPanelH = height - WORLD_HEIGHT;
    const barPanelY = WORLD_HEIGHT;

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

  // ── 技能欄彈出（含 SP 升級）──────────────────────────────────────────────
  _buildSkillsPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const keys = ['Z', 'X', 'C', 'V', 'B'];
    keys.forEach((key, i) => {
      const def = SKILLS[key];
      const rowY = contentY + i * 44;
      const unlocked = gs && gs.unlockedSkills && gs.unlockedSkills.includes(key);
      const lv = (gs && gs.skillLevels && gs.skillLevels[key]) || 0;
      const maxLv = def.maxLevel || 10;

      push(this.add.text(popX + 14, rowY, `[${key}] ${def.name}`, {
        fontSize: '12px', color: unlocked ? '#88ffcc' : '#666666', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));
      if (unlocked) {
        push(this.add.text(popX + 152, rowY, `Lv.${lv}/${maxLv}`, {
          fontSize: '11px', color: '#ffdd66', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
        }).setDepth(152).setScrollFactor(0));
      }
      push(this.add.text(popX + 14, rowY + 16, `解鎖Lv.${def.unlockLevel}  CD:${def.cooldown}s  MP:${def.mpCost}`, {
        fontSize: '9px', color: '#888888', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));

      // 右側：升級按鈕 / 狀態
      if (!unlocked) {
        push(this.add.text(popX + popW - 14, rowY + 8, `需要 Lv.${def.unlockLevel}`, {
          fontSize: '10px', color: '#ff8844', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(152).setScrollFactor(0));
      } else if (lv >= maxLv) {
        push(this.add.text(popX + popW - 14, rowY + 8, '已滿級', {
          fontSize: '10px', color: '#44ff88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(152).setScrollFactor(0));
      } else {
        const canUp = (gs ? (gs.skillPoints || 0) : 0) > 0;
        const btnW = 26, btnH = 22;
        const btnX = popX + popW - 14 - btnW;
        const btnY = rowY - 2;
        const btnBg = push(this.add.graphics().setDepth(152).setScrollFactor(0));
        const drawBtn = (hover) => {
          btnBg.clear();
          btnBg.fillStyle(canUp ? (hover ? 0x33aa55 : 0x227744) : 0x2a2a33, 0.95);
          btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
          btnBg.lineStyle(1, canUp ? 0x66ffaa : 0x555566, 0.9);
          btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 4);
        };
        drawBtn(false);
        push(this.add.text(btnX + btnW / 2, btnY + btnH / 2, '+', {
          fontSize: '16px', color: canUp ? '#ffffff' : '#666666', fontFamily: 'Arial',
        }).setOrigin(0.5, 0.5).setDepth(153).setScrollFactor(0));
        if (canUp) {
          const zone = push(this.add.zone(btnX, btnY, btnW, btnH)
            .setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(154).setScrollFactor(0));
          zone.on('pointerover', () => drawBtn(true));
          zone.on('pointerout',  () => drawBtn(false));
          zone.on('pointerdown', () => this._upgradeSkill(key));
        }
      }
    });

    const sp = gs ? (gs.skillPoints || 0) : 0;
    push(this.add.text(popX + 14, contentY + 5 * 44, `可用 SP：${sp}　點 [+] 花 1 點提升技能傷害`, {
      fontSize: '10px', color: sp > 0 ? '#ffff44' : '#888855', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
  }

  // 花 1 SP 升級技能，重建彈窗以反映新等級
  _upgradeSkill(key) {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const def = SKILLS[key];
    const maxLv = (def && def.maxLevel) || 10;
    const lv = (gs.skillLevels && gs.skillLevels[key]) || 0;
    if (!gs.unlockedSkills || !gs.unlockedSkills.includes(key)) return;
    if ((gs.skillPoints || 0) <= 0 || lv >= maxLv) return;
    gs.skillPoints -= 1;
    gs.skillLevels[key] = lv + 1;
    this.registry.set('gameState', gs);
    this.registry.events.emit('changedata-sp', null, gs.skillPoints);
    this._openPopup('skills');
  }

  // ── 地圖資訊彈出 ────────────────────────────────────────────────────────
  _buildMapPopup(push, popX, contentY, popW) {
    const gs = this.registry.get('gameState');
    const mapNames = { sky: '浮空島嶼', henesys: '森林獵場', ruins: '古代廢墟', ellinia: '神秘之境', taipei: '台北都會', kerning: 'Kerning City', boss: '暗影領域', town: '楓葉城' };
    const currentMap = gs ? gs.currentMap : '';
    push(this.add.text(popX + 14, contentY, `目前地圖：${mapNames[currentMap] || '未知'}`, {
      fontSize: '13px', color: '#aaddff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    push(this.add.text(popX + 14, contentY + 28, '傳送門：', {
      fontSize: '12px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    const portalInfo = {
      town:    ['→ 浮空島嶼（地圖右端）'],
      sky:     ['← 楓葉城（地圖左端）', '→ 森林獵場（地圖右端）'],
      henesys: ['← 浮空島嶼（地圖左端）', '→ 古代廢墟（地圖右端）'],
      ruins:   ['← 森林獵場（地圖左端）', '→ 神秘之境（地圖右端）'],
      ellinia: ['← 古代廢墟（地圖左端）', '↑ 台北都會（地圖中央）', '→ Kerning City（地圖右端）'],
      taipei:  ['← 神秘之境（地圖左端）', '→ Kerning City（地圖右端）'],
      kerning: ['← 神秘之境（地圖左端）', '⚠ Boss 決戰（地圖右端，需擊殺60怪）'],
      boss:    ['擊敗暗影魔君即可獲勝'],
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

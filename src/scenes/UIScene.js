import Phaser from 'phaser';
import { POTIONS, expNeeded, MAP_SCENE_KEYS, WORLD_HEIGHT, SKILL_SLOT_KEYS, BASIC_ATTACK, skillForSlot, canReorderSkills, equipSkill, jobOf, jobIdOf, skillDefOf } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { getQualityLevel, setQualityLevel, downgradeQuality, upgradeQuality } from '../engine/quality.js';
import { getActiveQuests } from '../engine/questManager.js';
import { getQuestDef } from '../config/quests.js';
import { screenFlash } from '../engine/vfx.js';
import { POTION_ICON_KEYS } from '../config/assetCatalog.js';
import { ensureSkillIcons, skillIconKey } from '../assets/skillIcons.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { saveGame } from '../engine/saveGame.js';
import { SHARD_COUNT, SHARD_IDS, SHARD_TEXTURE } from '../config/shards.js';
import { hasShard, shardCount } from '../engine/shards.js';
import { audio } from '../engine/audio.js';
import { addSoundButton } from '../engine/soundButton.js';
import { WorldMapOverlay } from '../ui/WorldMapOverlay.js';

// HUD 場景（平行運行）— 橫向捲軸風格底部狀態列
// 盜賊技能在技能欄的簡稱（格子寬度有限）；其他技能直接用全名
const SHORT_LABELS = { Z: '三連飛鏢', X: '影步伐', C: '暗殺', V: '漩渦', B: '影分身' };

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this._gs = null;
    this._popup = null;
    this._timers = [];
    const { width, height } = this.cameras.main;

    // ── 底部狀態列面板（木質底板：角色資訊 + 技能/藥水 + 功能按鈕）──────────
    const barPanelH = height - WORLD_HEIGHT;
    const barPanelY = WORLD_HEIGHT;
    this._createWoodPanelTexture(width, barPanelH);
    this.add.image(0, barPanelY, 'hud_wood_bg').setOrigin(0, 0).setDepth(50).setScrollFactor(0);

    const textStyle = (size, color, extra = {}) => ({
      fontSize: `${size}px`, color, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#1a0e06', strokeThickness: 3, ...extra,
    });

    // ── 角色頭像（木框格）＋ 等級徽章 ─────────────────────────────────────────
    const portSize = 80;
    const portX = 14, portY = barPanelY + 12;
    this.add.image(portX, portY, 'hud_slot_80').setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    // 頭像 / 職業名會跟著 gs.job 換（_applyJobHud）；先放盜賊頭像
    this._portrait = null;
    if (this.textures.exists('player_portrait')) {
      this._portrait = this.add.image(portX + portSize / 2, portY + portSize / 2, 'player_portrait');
      this._portrait.setScale(Math.min(56 / this._portrait.width, 56 / this._portrait.height))
        .setDepth(52).setScrollFactor(0);
    }
    this._hudJob = null;
    this._levelText = this.add.text(portX + portSize / 2, portY + portSize + 2, 'Lv.1', textStyle(14, '#ffe27a'))
      .setOrigin(0.5, 0.5).setDepth(53).setScrollFactor(0);

    // ── HP / MP 條（木框 3-slice + 內部填色）─────────────────────────────────
    const barStartX = portX + portSize + 10;
    const barW = 300;
    const hpY = barPanelY + 20;
    const mpY = hpY + 38;
    this._classText = this.add.text(barStartX + 6, barPanelY + 4, '盜賊', textStyle(12, '#e8d3a8'))
      .setDepth(53).setScrollFactor(0);

    const hp = this._makeFramedBar(barStartX, hpY, barW, 0x5a0d10, [0xff5a4f, 0xc8202a], 'HP');
    this._hpBg = hp.bg; this._hpBar = hp.fill; this._hpLabel = hp.label; this._hpNum = hp.num;
    const mp = this._makeFramedBar(barStartX, mpY, barW, 0x0c1a4d, [0x5aa0ff, 0x2546c8], 'MP');
    this._mpBg = mp.bg; this._mpBar = mp.fill; this._mpLabel = mp.label; this._mpNum = mp.num;

    // EXP 條（面板最下方一條細條，全寬）
    const expBarH = 7;
    this._expBg  = this._makeBar(0, height - expBarH, width, expBarH, 0x24160a).setDepth(51);
    this._expBar = this._makeBar(0, height - expBarH, width, expBarH, 0xf2c14e).setDepth(52);
    this._expText = this.add.text(width / 2, height - expBarH / 2 - 1, '', textStyle(9, '#fff3c8', { strokeThickness: 2 }))
      .setOrigin(0.5, 0.5).setDepth(53).setScrollFactor(0);

    // ── 中段資訊（SP / 金幣 / 擊殺）──────────────────────────────────────────
    const midX = barStartX + barW + 14;
    this._spText   = this.add.text(midX, barPanelY + 20, 'SP: 0', textStyle(13, '#9ff0c8')).setDepth(53).setScrollFactor(0);
    this._mesoText = this.add.text(midX, barPanelY + 44, '💰 0',  textStyle(13, '#ffe27a')).setDepth(53).setScrollFactor(0);
    // 星光碎片進度（主線）：5 顆小星，取得的亮起；下一行是 n/5（集滿並點亮塔後顯示「Boss 解鎖」）
    this._shardIcons = [];
    for (let i = 0; i < SHARD_COUNT; i++) {
      const icon = this.add.image(midX + 9 + i * 18, barPanelY + 76, SHARD_TEXTURE).setDepth(53).setScrollFactor(0);
      icon.setScale(16 / Math.max(1, icon.width));
      this._shardIcons.push(icon);
    }
    this._shardText = this.add.text(midX, barPanelY + 88, '星光碎片 0/5', textStyle(12, '#ffe27a')).setDepth(53).setScrollFactor(0);

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
    this._applyJobHud(this.registry.get('gameState'));

    // ── 初始化 ────────────────────────────────────────────────────────────────
    this._refreshAll();

    // ── 監聽 Registry 事件 ────────────────────────────────────────────────────
    this.registry.events.on('changedata-hp',        this._onHpChange,    this);
    this.registry.events.on('changedata-mp',        this._onMpChange,    this);
    this.registry.events.on('changedata-exp',       this._onExpChange,   this);
    this.registry.events.on('changedata-level',     this._onLevelChange, this);
    this.registry.events.on('changedata-levelup',   this._onLevelUp,     this);
    this.registry.events.on('changedata-meso',      this._onMesoChange,  this);
    this.registry.events.on('changedata-shards',    this._onShardChange, this);
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

    // 技能欄拖曳用的全域指標事件
    this._drag = null;
    this.input.on('pointermove', this._onDragMove, this);
    this.input.on('pointerup', this._onDragEnd, this);
    this.input.on('pointerupoutside', this._onDragEnd, this);

    // 聲音開關（右上、小地圖左側）：手機與電腦都能點
    this._soundBtn = addSoundButton(this, width - 196, 28, { depth: 120, size: 40 });

    // 世界地圖：右上角「地圖」鈕（聲音鈕左邊，不蓋到小地圖與任務面板），按 M 也能開關
    this._worldMap = new WorldMapOverlay(this);
    this._worldMapBtn = addWoodButton(this, width - 262, 28, 66, 42, '地圖', () => this._worldMap.toggle(),
      { depth: 120, fontSize: 15 });
    this._onUiMapKey = () => { if (!this._isPaused && !this.registry.get('helpOpen')) this._worldMap.toggle(); };
    this.input.keyboard.on('keydown-M', this._onUiMapKey);

    // Phase 15：ESC 暫停選單
    this._isPaused = false;
    this._bornAt = this.time.now;   // 剛啟動時忽略 Esc：教學按 Esc 跳過時，同一個按鍵事件會被這個新場景再收到一次
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
      audio.setMusicQuality(getQualityLevel(this));
      this._lowFpsCount = 0;
    }
    // 升級：連續 8 秒 > 55 FPS（保守，避免在臨界點反覆跳檔）
    else if (this._highFpsCount >= 8 && level !== 'high') {
      setQualityLevel(this, upgradeQuality(level));
      audio.setMusicQuality(getQualityLevel(this));
      this._highFpsCount = 0;
    }
  }

  // 木質底板：深褐漸層 + 隨機木紋 + 上緣金色飾條（canvas 一次繪製）
  _createWoodPanelTexture(w, h) {
    if (this.textures.exists('hud_wood_bg')) return;
    const tex = this.textures.createCanvas('hud_wood_bg', w, h);
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#4a2e18');
    grad.addColorStop(0.5, '#3a2312');
    grad.addColorStop(1, '#22140a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // 木紋：細長的半透明波浪線
    const rng = new Phaser.Math.RandomDataGenerator(['hud-wood']);
    for (let i = 0; i < 26; i++) {
      const y = rng.between(8, h - 6);
      ctx.strokeStyle = `rgba(${rng.pick([20, 90])},${rng.pick([10, 55])},0,${rng.realInRange(0.12, 0.28)})`;
      ctx.lineWidth = rng.realInRange(0.8, 2);
      ctx.beginPath();
      const x0 = rng.between(-100, w * 0.6);
      const len = rng.between(200, 700);
      ctx.moveTo(x0, y);
      for (let x = x0; x < x0 + len; x += 40) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 2);
      }
      ctx.stroke();
    }
    // 上緣飾條
    ctx.fillStyle = '#140a04';
    ctx.fillRect(0, 0, w, 6);
    const trim = ctx.createLinearGradient(0, 0, 0, 4);
    trim.addColorStop(0, '#f3d27a');
    trim.addColorStop(1, '#a8742c');
    ctx.fillStyle = trim;
    ctx.fillRect(0, 1, w, 3);
    tex.refresh();
  }

  // 木框血條：底色 + 漸層填色（scaleX 控制長度）+ 3-slice 木框蓋在最上層
  _makeFramedBar(x, y, w, bgColor, [topColor, bottomColor], label) {
    const FRAME_H = 34;
    const CAP = 20;
    const inX = x + 19;
    const inY = y + 7;
    const inW = w - 38;
    const inH = 19;
    const bg = this.add.rectangle(inX, inY, inW, inH, bgColor, 1).setOrigin(0, 0).setDepth(51).setScrollFactor(0);
    const fillKey = `hud_bar_fill_${topColor.toString(16)}`;
    if (!this.textures.exists(fillKey)) {
      const t = this.textures.createCanvas(fillKey, 4, inH);
      const c = t.getContext();
      const g = c.createLinearGradient(0, 0, 0, inH);
      const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, hex(topColor));
      g.addColorStop(1, hex(bottomColor));
      c.fillStyle = g;
      c.fillRect(0, 0, 4, inH);
      t.refresh();
    }
    const fill = this.add.image(inX, inY, fillKey).setOrigin(0, 0).setDisplaySize(inW, inH)
      .setDepth(52).setScrollFactor(0);
    // _updateBar 以 scaleX 比例縮放；記住滿格時的 scaleX
    fill.setData('fullScaleX', fill.scaleX);
    this.add.nineslice(x, y, 'hud_bar_frame', undefined, w, FRAME_H, CAP, CAP)
      .setOrigin(0, 0).setDepth(53).setScrollFactor(0);
    const lbl = this.add.text(inX + 6, inY + inH / 2, label, {
      fontSize: '12px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(54).setScrollFactor(0);
    const num = this.add.text(inX + inW / 2 + 10, inY + inH / 2, '', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(54).setScrollFactor(0);
    return { bg, fill, label: lbl, num };
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
      { label: '道具', type: 'items'    },
      { label: '裝備', type: 'equip'    },
      { label: '技能', type: 'skills'   },
      { label: '地圖', type: 'map'      },
      { label: '設定', type: 'settings' },
    ];
    // 羊皮紙按鈕，兩列：3 + 2
    const btnW = 72, btnH = 30, gap = 5;
    const startX = width - (3 * btnW + 2 * gap) - 14;

    btnData.forEach((btn, i) => {
      const col = i < 3 ? i : i - 3;
      const row = i < 3 ? 0 : 1;
      const bx = startX + col * (btnW + gap) + (row === 1 ? (btnW + gap) / 2 : 0);
      const by = barPanelY + 18 + row * (btnH + 8);
      addWoodButton(this, bx + btnW / 2, by + btnH / 2, btnW, btnH, btn.label, () => {
        if (btn.type === 'map') { this._closePopup(); this._worldMap.toggle(); return; }   // 「地圖」開世界地圖浮層
        if (this._popup && this._popup.type === btn.type) {
          this._closePopup();
        } else {
          this._openPopup(btn.type);
        }
      }, { depth: 51, fontSize: 13 });
    });
  }

  // ── 小地圖 + 地圖名稱（右上角，橫向捲軸風格）──────────────────────────────
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
    ensureSkillIcons(this);
    const skillKeys   = [BASIC_ATTACK, ...SKILL_SLOT_KEYS];
    const potionKeys  = ['A', 'S', 'D', 'R', 'G'];
    const gsNow = this.registry.get('gameState');
    this._hudJob = jobIdOf(gsNow);

    const slot = 52, gap = 4;
    const pot = 42, potGap = 4;
    const sepW = 16;
    const totalSkillW = skillKeys.length * (slot + gap) - gap;
    const skillStartX = 520;
    const potionStartX = skillStartX + totalSkillW + sepW;
    const rowY = barPanelY + 16;
    const labelStyle = {
      fontSize: '10px', color: '#e8d3a8', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3,
    };

    // ── 技能槽：木框 + 程式繪製圖示 + 冷卻遮罩/秒數 + 等級 ───────────────────
    // key 是「欄位」的快捷鍵：ATK 欄固定是普通攻擊（空白鍵），Z X C V 四欄放哪個技能由 gs.skillSlots 決定
    skillKeys.forEach((key, i) => {
      const sx = skillStartX + i * (slot + gap);
      const sy = rowY;
      const skillId = skillForSlot(gsNow, key);
      this.add.image(sx, sy, 'hud_slot_52').setOrigin(0, 0).setDepth(51).setScrollFactor(0);
      const icon = this.add.image(sx + slot / 2, sy + slot / 2, skillIconKey(skillId, this._hudJob))
        .setDepth(52).setScrollFactor(0);

      // 快捷鍵（左上角）
      this.add.text(sx + 5, sy + 3, key === BASIC_ATTACK ? 'SPACE' : key, {
        fontSize: key === BASIC_ATTACK ? '9px' : '12px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setDepth(55).setScrollFactor(0);
      // 技能名稱（格子下方）
      const nameText = this.add.text(sx + slot / 2, sy + slot + 3, this._skillLabel(skillId, gsNow), labelStyle)
        .setOrigin(0.5, 0).setDepth(53).setScrollFactor(0);

      // 技能等級（右下角）
      const lvText = this.add.text(sx + slot - 5, sy + slot - 4, '', {
        fontSize: '10px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 1).setDepth(55).setScrollFactor(0);

      // 未解鎖提示
      const lockText = this.add.text(sx + slot / 2, sy + slot / 2, `Lv${skillDefOf(this._hudJob, skillId)?.unlockLevel ?? ''}`, {
        fontSize: '11px', color: '#ffb0b0', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(55).setScrollFactor(0).setVisible(false);

      const cdOverlay = this.add.graphics().setDepth(53).setScrollFactor(0);
      const cdText = this.add.text(sx + slot / 2, sy + slot / 2, '', {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5, 0.5).setDepth(56).setScrollFactor(0);
      const ix = sx + (slot - 38) / 2;
      const iy = sy + (slot - 38) / 2;
      this._cdOverlays[key] = { overlay: cdOverlay, cdText, lockText, nameText, x: ix, y: iy, w: 38, h: 38, skillId, sx, sy, slotW: slot };
      // 四個技能欄位可拖曳調整（全部解鎖後）；普通攻擊欄不能拖
      if (key !== BASIC_ATTACK) {
        this.add.rectangle(sx + slot / 2, sy + slot / 2, slot, slot, 0xffffff, 0)
          .setDepth(57).setScrollFactor(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', (pointer) => this._beginSkillDrag(key, pointer));
      }
      this._skillSlots[key] = icon;
      this._skillLevelTexts[key] = lvText;
    });

    // ── 分隔飾條 ──────────────────────────────────────────────────────────────
    const sepX = skillStartX + totalSkillW + sepW / 2;
    this.add.rectangle(sepX, rowY + 4, 2, slot - 8, 0xa8742c, 0.8)
      .setOrigin(0.5, 0).setDepth(51).setScrollFactor(0);

    // ── 藥水槽：木框 + 藥水圖示 + 數量 ───────────────────────────────────────
    potionKeys.forEach((key, i) => {
      const px = potionStartX + i * (pot + potGap);
      const py = rowY + (slot - pot) / 2;
      const slotBg = this.add.image(px, py, 'hud_slot_42').setOrigin(0, 0).setDepth(51).setScrollFactor(0);
      const iconKey = POTION_ICON_KEYS[key];
      let icon;
      if (iconKey && this.textures.exists(iconKey)) {
        icon = this.add.image(px + pot / 2, py + pot / 2, iconKey).setDepth(52).setScrollFactor(0);
        icon.setScale(30 / icon.height);
      } else {
        icon = this.add.circle(px + pot / 2, py + pot / 2, 9, POTIONS[key].color).setDepth(52).setScrollFactor(0);
      }

      this.add.text(px + 4, py + 2, key, {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setDepth(54).setScrollFactor(0);

      const qtyText = this.add.text(px + pot - 3, py + pot - 2, '', {
        fontSize: '11px', color: '#fff3a0', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 1).setDepth(54).setScrollFactor(0);

      this._potionSlots[key] = { bg: slotBg, dot: icon, qtyText };

      // 點擊藥水槽直接使用（手機沒有藥水按鍵；桌機也可用滑鼠點）。點擊範圍比圖示大一圈，方便手指
      this.add.rectangle(px + pot / 2, py + pot / 2, pot + 8, pot + 8, 0xffffff, 0)
        .setDepth(55).setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._usePotionFromHud(key));
    });
  }

  // 技能欄下方的名稱：盜賊沿用舊的簡稱，轉職技能用全名；普通攻擊欄顯示該職業普攻名
  _skillLabel(skillId, gs) {
    if (skillId === BASIC_ATTACK) return jobOf(gs).basic.name;
    return SHORT_LABELS[skillId] || skillDefOf(jobIdOf(gs), skillId)?.name || skillId;
  }

  // 依 gs.job 套用 HUD：頭像、職業名（含稱號）、普通攻擊欄圖示 / 名稱，技能欄重刷
  _applyJobHud(gs) {
    const jobId = jobIdOf(gs);
    const job = jobOf(gs);
    this._hudJob = jobId;
    if (this._portrait && this.textures.exists(job.portrait)) {
      this._portrait.setTexture(job.portrait);
      this._portrait.setScale(Math.min(56 / this._portrait.width, 56 / this._portrait.height));
    }
    const title = gs.title || job.title;
    this._classText.setText(jobId === 'thief' && title === job.title ? job.name : `${job.name} ・ ${title}`);
    for (const data of Object.values(this._cdOverlays)) data.skillId = null;   // 強制 _refreshCooldowns 重刷
  }

  _usePotionFromHud(key) {
    const mapKey = this._getCurrentMapSceneKey();   // 暫停中為 null：不能用藥
    if (!mapKey) return;
    const player = this.scene.manager.getScene(mapKey)?.player;
    if (player && !player.isDead) player.usePotion(key);
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

  // ── 技能欄拖曳：四個技能全部解鎖後，可把圖示拖到另一格交換位置 ───────────────────────
  _beginSkillDrag(slotKey, pointer) {
    const gs = this.registry.get('gameState');
    if (!gs || this._isPaused) return;
    if (!canReorderSkills(gs)) {
      this._flashHudNotice('四個技能全部解鎖（Lv.20）後，才能拖曳調整位置');
      return;
    }
    const skillId = skillForSlot(gs, slotKey);
    const ghost = this.add.image(pointer.x, pointer.y, skillIconKey(skillId, this._hudJob))
      .setDepth(200).setScrollFactor(0).setAlpha(0.85).setScale(1.15);
    this._drag = { from: slotKey, ghost };
  }

  // 把技能放進欄位（已裝備在別欄則互換）並存檔
  _equipToSlot(slotKey, skillId) {
    const gs = this.registry.get('gameState');
    if (!gs || !canReorderSkills(gs)) return;
    gs.skillSlots = equipSkill(gs.skillSlots || [], slotKey, skillId, jobOf(gs).pool);
    this.registry.set('gameState', gs);
    saveGame(gs);
    this._flashHudNotice(`${this._skillLabel(skillId, gs)} → ${slotKey} 欄`);
  }

  _onDragMove(pointer) {
    if (this._drag) this._drag.ghost.setPosition(pointer.x, pointer.y);
  }

  _onDragEnd(pointer) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    drag.ghost.destroy();
    // 放開位置落在哪一格（用格子中心距離，容許一點偏差）
    let target = null;
    let best = 40;
    for (const [slotKey, data] of Object.entries(this._cdOverlays)) {
      if (slotKey === BASIC_ATTACK) continue;
      const d = Math.hypot(pointer.x - (data.sx + data.slotW / 2), pointer.y - (data.sy + data.slotW / 2));
      if (d < best) { best = d; target = slotKey; }
    }
    if (!target || target === drag.from) return;
    const gs = this.registry.get('gameState');
    this._equipToSlot(target, skillForSlot(gs, drag.from));
  }

  _flashHudNotice(text) {
    if (this._hudNotice && this._hudNotice.active) this._hudNotice.destroy();
    const { width, height } = this.cameras.main;
    const t = this.add.text(width / 2, height - 150, text, {
      fontSize: '16px', color: '#fff4dc', fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: '#3a2410cc', padding: { x: 12, y: 6 }, stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(210).setScrollFactor(0);
    this._hudNotice = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() });
  }

  _refreshCooldowns() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    // 地圖名稱也加 dirty flag：值沒變就跳過 setText
    const mapName = MAPS[gs.currentMap]?.name || '';
    if (mapName !== this._lastMapName) {
      this._lastMapName = mapName;
      this._mapText.setText(mapName);
    }

    // 轉職了：頭像 / 職業名 / 普通攻擊欄換圖，技能欄全部重刷
    const jobId = jobIdOf(gs);
    if (jobId !== this._hudJob) this._applyJobHud(gs);
    const job = jobOf(gs);

    for (const [slotKey, data] of Object.entries(this._cdOverlays)) {
      const { overlay, cdText, lockText, x, y, w, h } = data;
      // 欄位放的技能可能被玩家拖曳換過：變了就換圖示 / 名稱 / 解鎖等級，並重置 dirty flag
      const key = skillForSlot(gs, slotKey);
      if (key !== data.skillId) {
        data.skillId = key;
        this._skillSlots[slotKey].setTexture(skillIconKey(key, jobId));
        data.nameText.setText(this._skillLabel(key, gs));
        lockText.setText(`Lv${skillDefOf(jobId, key)?.unlockLevel ?? ''}`);
        data._lastRatioQ = undefined; data._lastCdLabel = undefined; data._lastUnlocked = undefined; data._lastLvText = undefined;
      }
      const cd = gs.skillCooldowns[key] || 0;
      const maxCd = (job.skills[key] || job.basic).cooldown;
      const ratio = Math.min(1, cd / maxCd);
      // dirty flag：ratio 量化到 50 step（0.02 精度），避免每 100ms 重繪
      const quantized = Math.round(ratio * 50);
      if (quantized !== data._lastRatioQ) {
        data._lastRatioQ = quantized;
        overlay.clear();
        if (ratio > 0) {
          overlay.fillStyle(0x000000, 0.6);
          // 從上往下收：剩餘冷卻越少，遮罩越短
          overlay.fillRect(x, y + h * (1 - ratio), w, h * ratio);
        }
      }
      const cdLabel = cd >= 1 ? `${Math.ceil(cd)}` : '';
      if (cdLabel !== data._lastCdLabel) {
        data._lastCdLabel = cdLabel;
        cdText.setText(cdLabel);
      }
      // 解鎖狀態加 dirty flag
      const unlocked = key === BASIC_ATTACK || !!(gs.unlockedSkills && gs.unlockedSkills.includes(key));
      if (this._skillSlots[slotKey] && unlocked !== data._lastUnlocked) {
        data._lastUnlocked = unlocked;
        this._skillSlots[slotKey].setAlpha(unlocked ? 1 : 0.3);
        lockText.setVisible(!unlocked);
      }
      // 技能等級加 dirty flag
      if (this._skillLevelTexts[slotKey]) {
        const lv = gs.skillLevels ? (gs.skillLevels[key] || 0) : 0;
        const lvText = key !== BASIC_ATTACK && unlocked && lv > 0 ? `${lv}` : '';
        if (lvText !== data._lastLvText) {
          data._lastLvText = lvText;
          this._skillLevelTexts[slotKey].setText(lvText);
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
    this._questToast.setText(`◆ 任務完成：${def.name}\n+${def.rewards?.exp || 0} EXP  +${def.rewards?.meso || 0} 金幣`)
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
    // 羊皮紙木框
    push(addParchmentPanel(this, px, py, pw, ph, { depth: 201 }));
    // 標題
    push(this.add.text(width / 2, py + 30,
      payload.victory ? '◆ 副本通關 ◆' : '☠ 挑戰失敗 ☠',
      { fontSize: '28px', color: payload.victory ? '#ffee99' : '#ff8888',
        fontFamily: 'Arial', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    // 副本名
    push(this.add.text(width / 2, py + 70, payload.def?.name || '',
      { fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    // 獎勵內文
    const lines = [];
    if (payload.victory) {
      lines.push(`基礎獎勵：+${payload.baseExp} EXP   +${payload.meso} 金幣`);
      if (payload.bonusExp > 0) {
        lines.push(`時間加成：剩餘 ${payload.timeRemaining}s × ${payload.def?.timeBonus || 5} = +${payload.bonusExp} EXP`);
      }
    } else {
      lines.push(`原因：${payload.reason === 'timeout' ? '時間到' : '角色陣亡'}`);
      if (payload.baseExp > 0 || payload.meso > 0) {
        lines.push(`安慰獎勵：+${payload.baseExp} EXP   +${payload.meso} 金幣`);
      }
    }
    lines.forEach((line, i) => {
      push(this.add.text(width / 2, py + 110 + i * 28, line,
        { fontSize: '14px', color: '#ddddee', fontFamily: 'Arial',
          stroke: '#000', strokeThickness: 2 })
        .setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
    });
    // 確認按鈕
    const btn = addWoodButton(this, width / 2, py + ph - 52, 160, 38, '回到晨曦鎮', () => {
      // 清除 popup + 通知 DungeonScene 退出
      objs.forEach((o) => o.destroy());
      const dungeonScene = this.scene.get('DungeonScene');
      if (dungeonScene && typeof dungeonScene.exitDungeon === 'function') {
        dungeonScene.exitDungeon();
      }
    }, { depth: 203, fontSize: 15 });
    btn.objects.forEach(push);

    this._dungeonResultObjs = objs;
  }

  _onShutdown() {
    this._closePopup();
    if (this._worldMap) this._worldMap.destroy();
    if (this._onUiMapKey) { this.input.keyboard.off('keydown-M', this._onUiMapKey); this._onUiMapKey = null; }
    this.registry.events.off('changedata-hp',        this._onHpChange,    this);
    this.registry.events.off('changedata-mp',        this._onMpChange,    this);
    this.registry.events.off('changedata-exp',       this._onExpChange,   this);
    this.registry.events.off('changedata-level',     this._onLevelChange, this);
    this.registry.events.off('changedata-levelup',   this._onLevelUp,     this);
    this.registry.events.off('changedata-meso',      this._onMesoChange,  this);
    this.registry.events.off('changedata-shards',    this._onShardChange, this);
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
      this.input.off('pointermove', this._onDragMove, this);
      this.input.off('pointerup', this._onDragEnd, this);
      this.input.off('pointerupoutside', this._onDragEnd, this);
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
    this._updateBar(this._hpBar,  gs.hp,  gs.maxHp);
    this._updateBar(this._mpBar,  gs.mp,  gs.maxMp);
    this._updateBar(this._expBar, gs.exp, gs.expNeeded);
    this._hpNum.setText(`${Math.ceil(gs.hp)}/${gs.maxHp}`);
    this._mpNum.setText(`${Math.ceil(gs.mp)}/${gs.maxMp}`);
    this._levelText.setText(`Lv.${gs.level}`);
    this._spText.setText(`SP: ${gs.skillPoints || 0}`);
    this._mesoText.setText(`💰 ${gs.meso}`);
    this._onShardChange();
  }

  _updateBar(barObj, current, max) {
    // Phase 15 效能：scaleX 是純 GPU transform，無 path 重繪。
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    barObj.scaleX = ratio * (barObj.getData('fullScaleX') ?? 1);
    if (barObj === this._expBar && this._expText) {
      this._expText.setText(`EXP ${(ratio * 100).toFixed(1)}%`);
    }
  }

  _onHpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._hpBar, value, gs.maxHp);
    this._hpNum.setText(`${Math.ceil(value)}/${gs.maxHp}`);
  }

  _onMpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._mpBar, value, gs.maxMp);
    this._mpNum.setText(`${Math.ceil(value)}/${gs.maxMp}`);
  }

  _onExpChange(parent, value) {
    const gs = this.registry.get('gameState');
    this._updateBar(this._expBar, value, gs.expNeeded);
  }

  _onLevelChange(parent, value) {
    this._levelText.setText(`Lv.${value}`);
    const gs = this.registry.get('gameState');
    if (gs) this._spText.setText(`SP: ${gs.skillPoints || 0}`);
  }

  _onSpChange(parent, value) {
    this._spText.setText(`SP: ${value}`);
    this._spText.setColor(value > 0 ? '#ffff44' : '#9ff0c8');
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
    if (this.registry.get('helpOpen')) return;   // 操作說明浮層開著：Esc 只用來關閉說明
    if (this.time.now - this._bornAt < 600) return;
    if (this._worldMap && this._worldMap.isOpen) { this._worldMap.close(); return; }   // Esc 先關世界地圖
    // 暫停中：被暫停的地圖場景不再是 active，必須先處理關閉，否則 ESC 只能開不能關
    if (this._isPaused) {
      this._closePauseMenu();
      return;
    }
    const mapSceneKey = this._getCurrentMapSceneKey();
    if (!mapSceneKey) return;

    // 若 NPC 對話開啟中，讓 BaseMapScene 的 ESC 處理器優先
    const mapScene = this.scene.manager.getScene(mapSceneKey);
    if (mapScene?._npcDialog) return;

    this._openPauseMenu();
  }

  _openPauseMenu() {
    if (this._isPaused) return;
    this._isPaused = true;

    // 記住被暫停的場景：暫停後 isActive() 會回 false，關閉時不能再用 _getCurrentMapSceneKey 找
    const mapSceneKey = this._getCurrentMapSceneKey();
    this._pausedSceneKey = mapSceneKey;
    if (mapSceneKey) this.scene.pause(mapSceneKey);

    const { width, height } = this.cameras.main;
    const objs = this._pauseOverlayObjs;
    const push = (obj) => { objs.push(obj); return obj; };

    // 半透明黑底
    push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(190).setScrollFactor(0));

    push(addParchmentPanel(this, width / 2 - 150, height / 2 - 120, 300, 362, { depth: 192 }));

    // 標題
    push(this.add.text(width / 2, height / 2 - 72, '遊戲暫停', {
      fontSize: '30px', color: '#ffe9b0', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#1a0e06', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(195).setScrollFactor(0));

    addWoodButton(this, width / 2, height / 2 + 4, 190, 42, '繼續遊戲', () => this._closePauseMenu(),
      { depth: 195, fontSize: 18 }).objects.forEach(push);

    // 聲音開關（音樂 + 音效）：弱裝置覺得卡頓、或不想要聲音時可以直接關閉
    const soundLabel = () => (audio.isMuted() ? '聲音：關' : '聲音：開');
    const musicBtn = addWoodButton(this, width / 2, height / 2 + 60, 190, 42, soundLabel(), () => {
      audio.setMuted(!audio.isMuted());
      musicBtn.label.setText(soundLabel());
      this._soundBtn?.refresh();
    }, { depth: 195, fontSize: 18 });
    musicBtn.objects.forEach(push);

    // 操作說明：重看新手教學（浮層，看完回到暫停選單）
    addWoodButton(this, width / 2, height / 2 + 116, 190, 42, '操作說明', () => {
      this.scene.launch('TutorialScene', { mode: 'overlay' });
    }, { depth: 195, fontSize: 18 }).objects.forEach(push);

    addWoodButton(this, width / 2, height / 2 + 172, 190, 42, '存檔並回主選單', () => {
      saveGame(this.registry.get('gameState'));
      this._isPaused = false;
      for (const obj of this._pauseOverlayObjs) { if (obj?.active) obj.destroy(); }
      this._pauseOverlayObjs = [];
      const key = this._pausedSceneKey;
      this._pausedSceneKey = null;
      if (key) this.scene.stop(key);
      this.scene.start('MenuScene');
    }, { depth: 195, fontSize: 18 }).objects.forEach(push);
  }

  _closePauseMenu() {
    if (!this._isPaused) return;
    this._isPaused = false;
    for (const obj of this._pauseOverlayObjs) { if (obj?.active) obj.destroy(); }
    this._pauseOverlayObjs = [];
    const mapSceneKey = this._pausedSceneKey;
    this._pausedSceneKey = null;
    if (mapSceneKey) this.scene.resume(mapSceneKey);
  }

  _onMesoChange(parent, value) {
    this._mesoText.setText(`💰 ${value}`);
  }

  // 星光碎片進度 + 稱號（集滿 5 塊會換「星光守護者」稱號）；也在 Boss 解鎖後改色
  _onShardChange() {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const n = shardCount(gs);
    this._shardIcons.forEach((icon, i) => {
      const have = hasShard(gs, SHARD_IDS[i]);
      icon.setAlpha(have ? 1 : 0.28);
      if (have) icon.clearTint(); else icon.setTint(0x555566);
    });
    this._shardText.setText(gs.bossUnlocked ? '★ Boss 已解鎖' : `星光碎片 ${n}/${SHARD_COUNT}`);
    this._shardText.setColor(gs.bossUnlocked ? '#ff77ff' : n >= SHARD_COUNT ? '#ffaa44' : '#ffe27a');
    if (this._hudJob) this._applyJobHud(gs);
  }

  // ── 彈出選單系統 ──────────────────────────────────────────────────────────
  _openPopup(type) {
    this._closePopup();
    const { width, height } = this.cameras.main;
    const barPanelH = height - WORLD_HEIGHT;
    const barPanelY = WORLD_HEIGHT;

    // 技能視窗多一列「換入」選單；六技能職業每多一個技能再加一列，有被動技能再加一行說明
    const skillRows = type === 'skills' ? jobOf(this.registry.get('gameState')).pool.length : 0;
    const popW = 340;
    const popH = type === 'skills'
      ? 318 + (skillRows - 5) * 44 + (jobOf(this.registry.get('gameState')).passive ? 18 : 0)
      : 280;
    const popX = width - popW - 10;
    const popY = barPanelY - popH - 10;

    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    // 背景板：羊皮紙 9-slice 染成深褐，配合淺色文字
    push(addParchmentPanel(this, popX, popY, popW, popH, { depth: 150 }));

    // 標題
    const titles = { items: '道具欄', equip: '裝備欄', skills: '技能欄', map: '地圖資訊', settings: '設定' };
    push(this.add.text(popX + 24, popY + 14, titles[type] || '', {
      fontSize: '15px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
    }).setDepth(151).setScrollFactor(0));

    // 關閉按鈕 ×
    const closeZone = push(this.add.zone(popX + popW - 40, popY + 12, 24, 24)
      .setOrigin(0, 0).setInteractive().setDepth(155).setScrollFactor(0));
    const closeG = push(this.add.graphics().setDepth(154).setScrollFactor(0));
    const drawClose = (hover) => {
      closeG.clear();
      closeG.fillStyle(hover ? 0xaa3333 : 0x553333, 0.9);
      closeG.fillRoundedRect(popX + popW - 40, popY + 12, 22, 22, 4);
      closeG.lineStyle(1, 0xff4444, 0.6);
      closeG.strokeRoundedRect(popX + popW - 40, popY + 12, 22, 22, 4);
    };
    drawClose(false);
    push(this.add.text(popX + popW - 29, popY + 23, '×', {
      fontSize: '14px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setDepth(155).setScrollFactor(0));
    closeZone.on('pointerover',  () => drawClose(true));
    closeZone.on('pointerout',   () => drawClose(false));
    closeZone.on('pointerdown',  () => this._closePopup());

    // 分隔線
    const divG = push(this.add.graphics().setDepth(151).setScrollFactor(0));
    divG.lineStyle(1, 0xc99a4a, 0.7);
    divG.lineBetween(popX + 22, popY + 36, popX + popW - 22, popY + 36);

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
      { key: 'R', label: '強效MP藥水', desc: 'MP +300', color: '#aa66ff' },
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
    const job = jobOf(gs);
    const keys = job.pool;
    const footY = contentY + keys.length * 44;   // 技能列下方的說明區起點
    keys.forEach((key, i) => {
      const def = job.skills[key];
      const rowY = contentY + i * 44;
      const unlocked = gs && gs.unlockedSkills && gs.unlockedSkills.includes(key);
      const lv = (gs && gs.skillLevels && gs.skillLevels[key]) || 0;
      const maxLv = def.maxLevel || 10;

      const slotIdx = gs && Array.isArray(gs.skillSlots) ? gs.skillSlots.indexOf(key) : -1;
      const keyLabel = slotIdx >= 0 ? `${SKILL_SLOT_KEYS[slotIdx]} 欄` : '未裝備';
      push(this.add.text(popX + 14, rowY, `[${keyLabel}] ${def.name}`, {
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

      // 沒裝備的技能：可換入指定欄位（5 個技能全部解鎖後才開放）
      if (unlocked && slotIdx < 0 && canReorderSkills(gs)) {
        const eqW = 44, eqH = 22;
        const eqX = popX + popW - 14 - 26 - 6 - eqW;
        const eqY = rowY - 2;
        const eqG = push(this.add.graphics().setDepth(152).setScrollFactor(0));
        const drawEq = (hover) => {
          eqG.clear();
          eqG.fillStyle(this._equipPick === key ? 0xaa7722 : (hover ? 0x3366aa : 0x224477), 0.95);
          eqG.fillRoundedRect(eqX, eqY, eqW, eqH, 4);
          eqG.lineStyle(1, 0x88bbff, 0.9);
          eqG.strokeRoundedRect(eqX, eqY, eqW, eqH, 4);
        };
        drawEq(false);
        push(this.add.text(eqX + eqW / 2, eqY + eqH / 2, '換入', {
          fontSize: '11px', color: '#ffffff', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(153).setScrollFactor(0));
        const eqZone = push(this.add.zone(eqX, eqY, eqW, eqH).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(154).setScrollFactor(0));
        eqZone.on('pointerover', () => drawEq(true));
        eqZone.on('pointerout', () => drawEq(false));
        eqZone.on('pointerdown', () => { this._equipPick = this._equipPick === key ? null : key; this._openPopup('skills'); });
      }

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
    const pick = this._equipPick && job.pool.includes(this._equipPick) && canReorderSkills(gs) && !(gs.skillSlots || []).includes(this._equipPick) ? this._equipPick : null;
    this._equipPick = pick;
    if (pick) {
      // 選擇要換掉哪一欄
      push(this.add.text(popX + 14, footY + 29, `把 ${job.skills[pick].name} 換進：`, {
        fontSize: '10px', color: '#ffd27a', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(152).setScrollFactor(0));
      SKILL_SLOT_KEYS.forEach((slotKey, i) => {
        const bw = 52, bh = 20;
        const bx = popX + 110 + i * (bw + 4);
        const by = footY + 19;
        const g = push(this.add.graphics().setDepth(152).setScrollFactor(0));
        const draw = (hover) => {
          g.clear();
          g.fillStyle(hover ? 0x33aa55 : 0x227744, 0.95);
          g.fillRoundedRect(bx, by, bw, bh, 4);
        };
        draw(false);
        push(this.add.text(bx + bw / 2, by + bh / 2, `${slotKey} ${job.skills[skillForSlot(gs, slotKey)].name.slice(0, 2)}`, {
          fontSize: '10px', color: '#ffffff', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(153).setScrollFactor(0));
        const z = push(this.add.zone(bx, by, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(154).setScrollFactor(0));
        z.on('pointerover', () => draw(true));
        z.on('pointerout', () => draw(false));
        z.on('pointerdown', () => { this._equipToSlot(slotKey, pick); this._equipPick = null; this._openPopup('skills'); });
      });
    } else push(this.add.text(popX + 14, footY + 14, canReorderSkills(gs)
      ? '拖曳畫面下方的技能圖示可互換；沒裝備的技能按「換入」'
      : `技能解鎖超過 4 個後，可自由挑 4 個放進技能欄`, {
      fontSize: '9px', color: '#aaccff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    push(this.add.text(popX + 14, footY, `可用 SP：${sp}　點 [+] 花 1 點提升技能傷害`, {
      fontSize: '10px', color: sp > 0 ? '#ffff44' : '#888855', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    if (job.passive) {
      push(this.add.text(popX + 14, footY + 46, `被動：${job.passive.name}　${job.passive.desc}`, {
        fontSize: '10px', color: '#ffcf8a', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setDepth(152).setScrollFactor(0));
    }
  }

  // 花 1 SP 升級技能，重建彈窗以反映新等級
  _upgradeSkill(key) {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    const def = jobOf(gs).skills[key];
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
    const currentMap = gs ? gs.currentMap : '';
    const map = MAPS[currentMap];
    push(this.add.text(popX + 14, contentY, `目前地圖：${map ? map.name : '未知'}${map && map.levelBand ? `（Lv.${map.levelBand[0]}-${map.levelBand[1]}）` : ''}`, {
      fontSize: '13px', color: '#aaddff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    push(this.add.text(popX + 14, contentY + 28, '傳送門：', {
      fontSize: '12px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setDepth(152).setScrollFactor(0));
    // 由地圖資料產生（不另外維護一份文字，避免和實際傳送門脫節）
    const portals = map ? map.portals.map((p) => `${p.label}${p.requireBoss ? '（5/5 碎片後開啟）' : ''}`) : [];
    if (currentMap === 'boss') portals.push('擊敗暗影魔君即可獲勝');
    (portals.length ? portals : ['暫無傳送門資訊']).slice(0, 5).forEach((p, i) => {
      push(this.add.text(popX + 24, contentY + 50 + i * 22, p, {
        fontSize: '11px', color: '#88ccff', fontFamily: 'Arial',
      }).setDepth(152).setScrollFactor(0));
    });
    push(this.add.text(popX + 14, contentY + 168, `星光碎片：${gs ? shardCount(gs) : 0} / ${SHARD_COUNT}　擊殺數：${gs ? (gs.killCount || 0) : 0}`, {
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
      { label: '藥水',           key: 'A S D R G' },
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

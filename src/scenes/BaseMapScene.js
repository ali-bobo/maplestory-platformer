import Phaser from 'phaser';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { playJobChangeEffect, playFx } from '../entities/Skill.js';
import { spawnLightRays, screenFlash } from '../engine/vfx.js';
import { jobOf, jobIdOf } from '../config/constants.js';
import { residentKeys, mapAssetKeys, neighborMapKeys, jobAssets, toAssets } from '../engine/assetPlan.js';
import { preloadAssets, loadAssets, releaseExcept } from '../engine/assetLoader.js';
import { Monster, prewarmMonsterTextures } from '../entities/Monster.js';
import { audio } from '../engine/audio.js';
import { getVisualFootPadding } from '../config/alignment.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { POTION_ICON_KEYS, PLATFORM_THEMES } from '../config/assetCatalog.js';
import { shopOf } from '../config/shops.js';
import { shopItemLabel, buyShopItem } from '../engine/shop.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { saveGame, isSavableMap } from '../engine/saveGame.js';
import { onMonsterKilled, onMapEntered, acceptQuest, isQuestActive, isQuestCompleted, onNpcTalked, onItemCollected, questItemDrop, chooseJobPath } from '../engine/questManager.js';
import { buildNpcDialog } from '../engine/npcDialog.js';
import { npcQuestMarker } from '../engine/questMarkers.js';
import { getQuestDef, TRIAL_ITEM_NAME } from '../config/quests.js';
import { canEnterDungeon, getRemainingEntries } from '../engine/dungeonRecord.js';
import { getDungeonDef } from '../config/dungeons.js';
import { keyHint } from '../engine/device.js';
import { getQualityLevel } from '../engine/quality.js';
import { SHARD_COUNT, SHARD_TEXTURE } from '../config/shards.js';
import { grantShard, lightTower, shardCount } from '../engine/shards.js';
import { visitMap } from '../engine/worldGraph.js';
import { createMapModifier } from '../engine/mapModifiers.js';

const PLATFORM_HEIGHT = 24;
const GROUND_Y = WORLD_HEIGHT;
const PLATFORM_CAP_RATIO = 0.2;
const PLATFORM_TILE_RATIO = 0.3;

const MONSTER_RESPAWN_MS = 8000;
const AUTOSAVE_INTERVAL_MS = 30000;
const MINIBOSS_RESPAWN_MS = 45000;

export class BaseMapScene extends Phaser.Scene {
  constructor(key, mapKey) {
    super({ key });
    this.mapKey = mapKey;
    this.mapData = null;
    this.player = null;
    this.platforms = null;
    this.thinPlatforms = null;
    this.monsters = null;
    this.pickups = null;
    this.portals = null;
    this._branchHints = [];
    this._npcDialog = null;
    this._npcEntries = [];
    this._onEscKeyDown = null;
    this._onInteractKeyDown = null;
  }

  init(data) {
    if (data && data.gameState) {
      this.registry.set('gameState', data.gameState);
    }
    this._spawnX = (data && data.spawnX !== undefined) ? data.spawnX : null;
    this._respawnProtect = !!(data && data.respawn);   // 死亡重生：短暫無敵
  }

  // 素材依需要載入：本地圖 + 目前職業 + 共用特效；Phaser 會等 preload 載完才呼叫 create（載入超過 150 ms 才顯示載入條）
  preload() {
    const gs = this.registry.get('gameState');
    preloadAssets(this, toAssets(residentKeys(this.mapKey, jobIdOf(gs), { dungeonId: this.dungeonId })));
  }

  // 進圖後：釋放不再需要的地圖 / 舊職業素材（相鄰地圖保留），稍後在背景預先載入相鄰地圖
  _releaseAssets() {
    releaseExcept(this, residentKeys(this.mapKey, jobIdOf(this.registry.get('gameState')), { dungeonId: this.dungeonId, withNeighbors: true }));
  }

  _manageAssets() {
    this._releaseAssets();
    this.time.delayedCall(1500, () => {
      const assets = toAssets(neighborMapKeys(this.mapKey).flatMap((m) => [...mapAssetKeys(m)]));
      loadAssets(this, assets, () => prewarmMonsterTextures(this));
    });
  }

  create() {
    // Phase 14：若子場景已預先設好 mapData（例如 DungeonScene 動態構建），不覆寫
    if (!this.mapData) this.mapData = MAPS[this.mapKey];
    if (!this.mapData) { console.error(`地圖資料未找到: ${this.mapKey}`); return; }

    this._transitioning = false;  // 每次 create 重置傳送狀態

    const gs = this.registry.get('gameState');
    gs.currentMap = this.mapKey;
    visitMap(gs, this.mapKey);   // 世界地圖傳送只能去去過的地圖
    this.registry.set('gameState', gs);

    // Phase 13：推進「抵達型」任務（玩家進入此地圖就視為抵達）
    onMapEntered(this, this.mapKey);

    const CANVAS_H = this.sys.game.canvas.height;   // 720
    this.physics.world.setBounds(0, 0, this.mapData.width, CANVAS_H);
    // 使用 canvas 高度作為相機界限，避免 world 高度 < viewport 造成自動置中偏移
    this.cameras.main.setBounds(0, 0, this.mapData.width, CANVAS_H);

    this._createBackground();
    this._createPlatforms();

    const requestedSpawnX = this._spawnX !== null ? this._spawnX : (this.mapData.spawnX || 150);
    const spawnPlacement = this._resolveStandingPlacement(requestedSpawnX, GROUND_Y, 18);
    this.player = new Player(this, spawnPlacement.x, 0, gs);
    this._alignDynamicEntityToPlatformTop(this.player, spawnPlacement.topY);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    if (this._respawnProtect) this.player.grantInvincibility(3000);

    this.monsters = this.add.group();
    this.pickups  = this.physics.add.group();
    this._spawnMonsters();
    this.player.enemies = this.monsters;

    this.portals = this.physics.add.staticGroup();
    this._createPortals();
    this._createNPCs();
    this._setupColliders();
    this._modifier = createMapModifier(this, this.mapData.modifier);   // 冰面 / 流沙 / 岩漿 / 暗黑視野（沒有則 null）

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    } else {
      this.scene.wake('UIScene');
    }

    audio.setMusicQuality(getQualityLevel(this));   // 音樂跟著遊戲的自適應品質
    audio.playBgm(this.mapKey);
    this.events.on('monster-died', this._onMonsterDied, this);
    this.events.on('job-changed', this._onJobChanged, this);
    this._playTimeAccum = 0;

    // ESC 關閉 NPC 對話
    this._onEscKeyDown = () => { this._closeNpcDialog(); };
    this.input.keyboard.on('keydown-ESC', this._onEscKeyDown);
    this._onInteractKeyDown = () => {
      this._interactPressedAt = this.time.now;   // 支線傳送門（portal.interact）要按互動鍵才進入
      const npcData = this._getNearbyNpcData();
      if (!npcData) {
        if (this._npcDialog) this._closeNpcDialog();
        return;
      }
      if (this._npcDialog) {
        this._closeNpcDialog();
        return;
      }
      // Phase 15：每個 NPC 只能發放它自己的 questIds（綁定地圖任務）
      // 不再走全域 listAvailableQuestIds()——避免單一 NPC 把所有任務接完
      // 順序：先推進「對話型」任務（例如影之召喚），再接新任務（前置完成的下一步），最後再推進一次
      // （剛接的覺醒任務在同一次對話就完成）
      onNpcTalked(this, npcData.npcId);
      const npcQuestIds = Array.isArray(npcData.questIds) ? npcData.questIds : [];
      for (const questId of npcQuestIds) {
        if (!isQuestActive(this, questId) && !isQuestCompleted(this, questId)) {
          if (acceptQuest(this, questId)) break;   // 一次只接一個，玩家完成後可再對話接下一個；等級 / 前置不符的略過
        }
      }
      onNpcTalked(this, npcData.npcId);
      this._openNpcDialog(npcData);
    };
    this.input.keyboard.on('keydown-F', this._onInteractKeyDown);
    // 只註冊 shutdown：場景被 destroy 前 Phaser 必先觸發 shutdown，且本遊戲場景
    // 從不被 scene.remove()，重複註冊 destroy 監聽只會在 relaunch 時累積死監聽。
    this.events.once('shutdown', this._onSceneShutdown, this);
    this._manageAssets();

    // 自動存檔：進入一般地圖時存一次，之後每 30 秒存一次
    if (isSavableMap(this.mapKey)) {
      const gs = this.registry.get('gameState');
      if (gs) gs.currentMap = this.mapKey;
      saveGame(gs);
      this.time.addEvent({
        delay: AUTOSAVE_INTERVAL_MS,
        loop: true,
        callback: () => saveGame(this.registry.get('gameState')),
      });
    }
  }

  // ── 背景（單張 Image 以 cover 填滿，底部對齊 GROUND_Y）────────────────────
  _createBackground() {
    const { bgColor, bgImage } = this.mapData;
    const SCREEN_W = 1280, SCREEN_H = 720;
    const bgH = WORLD_HEIGHT;

    // 底色（覆蓋整個畫布，包括 HUD 下方）
    // Phase 15 效能：Rectangle 走 batchSprite，消除靜態 Graphics 每幀 batchFillPath。
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, bgColor || 0x5588ff)
      .setOrigin(0, 0).setDepth(-10).setScrollFactor(0);

    // 用單張 Image 以 cover 方式填滿遊戲區（y=0~WORLD_HEIGHT），底部對齊地面線。
    // 不使用 tileSprite：背景圖多為非 2 次方尺寸，平鋪時接縫處會出現裂痕／破圖，
    // 且每幀更新 tilePosition 也是額外負擔。改用固定單圖即可徹底消除接縫。
    if (bgImage && this.textures.exists(bgImage)) {
      this._addCoverBackground(bgImage);
    }
  }

  _addCoverBackground(key) {
    const SCREEN_W = 1280;
    const src = this.textures.get(key).getSourceImage();
    const sc = Math.max(SCREEN_W / src.width, WORLD_HEIGHT / src.height);
    return this.add.image(SCREEN_W / 2, WORLD_HEIGHT, key)
      .setOrigin(0.5, 1).setScale(sc).setScrollFactor(0).setDepth(-9);
  }

  // ── 平台建立 ───────────────────────────────────────────────────────────────
  _createPlatforms() {
    this.platforms      = this.physics.add.staticGroup();
    this.thinPlatforms  = this.physics.add.staticGroup();
    const theme = PLATFORM_THEMES[this.mapKey];
    const useTheme = theme && this.textures.exists(theme.key);
    for (const p of this.mapData.platforms) {
      const group = p.thin ? this.thinPlatforms : this.platforms;
      const sprite = group.create(p.x + p.width / 2, p.y + PLATFORM_HEIGHT / 2, `platform-${p.type || 'grass'}`);
      sprite.setDisplaySize(p.width, PLATFORM_HEIGHT);
      sprite.refreshBody();
      sprite.setDepth(5);
      // 地板用背景自然地板視覺；有主題跳台圖時碰撞體透明，改畫主題圖
      if (p.isGround || useTheme) sprite.setAlpha(0);
      if (!p.isGround && useTheme) this._drawThemedPlatform(p, theme);
    }
  }

  // 把主題圖切成左端 / 中段 / 右端三張紋理（中段左右邊緣交叉淡化，重複鋪時看不出接縫）
  // outH：縱向拉伸後的高度（細長的跳台圖用；沒給就用原圖高度）
  _ensurePlatformSlices(themeKey, outH) {
    const leftKey = `${themeKey}__L`;
    if (this.textures.exists(leftKey)) return;
    const src = this.textures.get(themeKey).getSourceImage();
    const w = src.width, srcH = src.height, h = outH || srcH;
    const capW = Math.round(w * PLATFORM_CAP_RATIO);
    const tileW = Math.round(w * PLATFORM_TILE_RATIO);
    const blendW = Math.round(tileW * 0.25);
    const tileX = Math.round((w - tileW) / 2);

    const slice = (key, sx, sw) => {
      const tex = this.textures.createCanvas(key, sw, h);
      tex.getContext().drawImage(src, sx, 0, sw, srcH, 0, 0, sw, h);
      tex.refresh();
    };
    slice(leftKey, 0, capW);
    slice(`${themeKey}__R`, w - capW, capW);

    const mid = this.textures.createCanvas(`${themeKey}__M`, tileW, h);
    const ctx = mid.getContext();
    ctx.drawImage(src, tileX, 0, tileW, srcH, 0, 0, tileW, h);
    // 左緣用 tile 右側之後的像素淡入，讓 tile 首尾相接
    for (let i = 0; i < blendW; i++) {
      ctx.globalAlpha = 1 - i / blendW;
      ctx.drawImage(src, tileX + tileW + i, 0, 1, srcH, i, 0, 1, h);
    }
    ctx.globalAlpha = 1;
    mid.refresh();
  }

  _drawThemedPlatform(p, theme) {
    this._ensurePlatformSlices(theme.key, theme.stretchH);
    const leftTex = this.textures.get(`${theme.key}__L`).getSourceImage();
    const h = leftTex.height;
    const fullCapW = leftTex.width;
    const capW = Math.min(fullCapW, Math.floor(p.width / 2));
    const top = p.y - theme.surfaceTop;

    const left = this.add.image(p.x, top, `${theme.key}__L`).setOrigin(0, 0).setDepth(5);
    if (capW < fullCapW) left.setCrop(0, 0, capW, h);
    const right = this.add.image(p.x + p.width - fullCapW, top, `${theme.key}__R`).setOrigin(0, 0).setDepth(5);
    if (capW < fullCapW) right.setCrop(fullCapW - capW, 0, capW, h);
    const midW = p.width - capW * 2;
    if (midW > 0) {
      this.add.tileSprite(p.x + capW, top, midW, h, `${theme.key}__M`).setOrigin(0, 0).setDepth(5);
    }
  }

  // ── 怪物生成（依平台隨機分佈）─────────────────────────────────────────────
  _spawnMonsters() {
    if (!this.mapData.monsters || this.mapData.monsters.length === 0) return;

    // 取得所有平台（含地板），按 x 排序
    const allPlats = [...this.mapData.platforms].sort((a, b) => a.x - b.x);
    // 排除寬度太窄的平台
    const validPlats = allPlats.filter((platform) => this._getPlatformStandingBounds(platform).width >= 80);

    this._spawnPlatforms = validPlats;

    let platIdx = 0;

    for (const spawn of this.mapData.monsters) {
      const monsterDef = MONSTERS.find(m => m.id === spawn.id);
      if (!monsterDef) { console.warn(`[Spawn] 找不到怪物定義: ${spawn.id}`); continue; }

      const count = spawn.count || 3;

      for (let i = 0; i < count; i++) {
        // 輪流使用各個平台，確保均勻分佈
        const plat = validPlats[platIdx % validPlats.length];
        platIdx++;
        this._spawnMonsterOn(monsterDef, plat);
      }
    }
  }

  _spawnMonsterOn(monsterDef, plat) {
    // 在平台寬度內隨機 x，邊緣留 20px 空間
    const bounds = this._getPlatformStandingBounds(plat);
    const margin = 20;
    const usableWidth = bounds.width - margin * 2;
    const mx = usableWidth > 10
      ? bounds.left + margin + Math.random() * usableWidth
      : bounds.centerX;
    const monster = new Monster(this, mx, 0, monsterDef);
    this._alignDynamicEntityToPlatformTop(monster, bounds.topY);
    monster.player = this.player;
    monster.patrolOriginX = mx;
    // 一般地圖的怪會重生（副本 / Boss 戰自己生怪，不帶這個標記）
    monster._respawnDef = monsterDef;
    this.monsters.add(monster);
    return monster;
  }

  // 怪物死亡 8 秒後（小王 45 秒）在隨機平台重生，優先選離玩家較遠的平台，淡入登場
  _scheduleRespawn(monsterDef) {
    const delay = monsterDef.spawnRole === 'miniboss' ? MINIBOSS_RESPAWN_MS : MONSTER_RESPAWN_MS;
    this.time.delayedCall(delay, () => {
      if (!this.sys.isActive() || !this._spawnPlatforms?.length) return;
      const px = this.player?.x ?? 0;
      const far = this._spawnPlatforms.filter((plat) => {
        const b = this._getPlatformStandingBounds(plat);
        return Math.abs(b.centerX - px) > 320;
      });
      const pool = far.length ? far : this._spawnPlatforms;
      const plat = pool[Math.floor(Math.random() * pool.length)];
      const monster = this._spawnMonsterOn(monsterDef, plat);
      monster.setAlpha(0);
      this.tweens.add({ targets: monster, alpha: 1, duration: 500 });
    });
  }

  // ── 傳送門 ─────────────────────────────────────────────────────────────────
  _createPortals() {
    const gs = this.registry.get('gameState');
    this._branchHints = [];
    for (const pd of this.mapData.portals) {
      if (pd.requireBoss && !gs.bossUnlocked) continue;

      const portal = this.portals.create(pd.x, pd.y, 'portal');
      portal.setVisible(false);  // 只當碰撞區，畫面由下方的光門特效負責
      portal.targetMap = pd.target;
      portal.spawnX   = pd.spawnX;  // 目標地圖的重生位置
      portal.dungeonId = pd.dungeonId;  // Phase 14：副本 ID（target='dungeon' 時用）
      portal.requiresQuest = pd.requiresQuest;
      portal.minLevel = pd.minLevel || 0;
      portal.interact = !!pd.interact;
      portal.refreshBody();

      // Phase 14：dungeon 類型 portal 在 label 後補「(今日剩 N 次)」，給玩家可見回饋
      let labelText = pd.label || '';
      if (pd.minLevel && gs.level < pd.minLevel) labelText = `${labelText}（Lv.${pd.minLevel} 開放）`;
      if (pd.target === 'dungeon' && pd.dungeonId) {
        const def = getDungeonDef(pd.dungeonId);
        if (def?.dailyLimit) {
          const remaining = getRemainingEntries(pd.dungeonId, def.dailyLimit);
          labelText = `${labelText}（今日剩 ${remaining} 次）`;
        }
      }
      this._createPortalVisual(pd, labelText);
    }
  }

  // 光門：橢圓光環 + 旋轉漩渦 + 地面符文 + 上升光點 + 木牌標籤
  // 顏色依目的地區分：一般地圖青藍、副本翠綠、Boss 暗紅紫
  _createPortalVisual(pd, labelText) {
    // 支線入口（interact）用金色，和主線的青藍色傳送門區分
    const color = pd.interact ? 0xffc850 : pd.target === 'dungeon' ? 0x5cf08a : pd.target === 'boss' ? 0xff4f8a : 0x6fd8ff;
    const x = pd.x;
    const cy = pd.y - 6;
    const feetY = pd.y + 39;
    const ADD = Phaser.BlendModes.ADD;
    this._portalTweens = this._portalTweens || [];
    const loop = (cfg) => this._portalTweens.push(this.tweens.add({ repeat: -1, ...cfg }));

    const rune = this.add.image(x, feetY - 3, VFX_TEX.GROUND_RUNE).setDepth(6)
      .setTint(color).setBlendMode(ADD).setScale(0.36, 0.09).setAlpha(0.8);
    const glow = this.add.image(x, cy, VFX_TEX.SOFT_GLOW).setDepth(6)
      .setTint(color).setBlendMode(ADD).setScale(2.2, 3.1).setAlpha(0.55);
    const swirl = this.add.image(x, cy, VFX_TEX.VORTEX_SPIRAL).setDepth(6)
      .setTint(color).setBlendMode(ADD).setScale(0.3, 0.46).setAlpha(0.75);
    const ring = this.add.image(x, cy, VFX_TEX.PORTAL_RING).setDepth(7)
      .setTint(color).setBlendMode(ADD).setScale(0.62, 0.62);

    loop({ targets: rune, angle: 360, duration: 6000 });
    loop({ targets: swirl, angle: -360, duration: 2600 });
    loop({ targets: glow, alpha: 0.3, duration: 900, yoyo: true, ease: 'Sine.easeInOut' });
    loop({ targets: ring, scaleX: 0.66, scaleY: 0.65, duration: 1100, yoyo: true, ease: 'Sine.easeInOut' });

    const motes = this.add.particles(x, feetY - 6, 'particle-dot', {
      x: { min: -22, max: 22 },
      speedY: { min: -70, max: -30 },
      speedX: { min: -6, max: 6 },
      lifespan: 1300,
      frequency: 110,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [color, 0xffffff],
      blendMode: 'ADD',
    });
    motes.setDepth(7);

    if (labelText) {
      const label = this.add.text(x, cy - 62, labelText, {
        fontSize: '13px', color: '#3a2410', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(9);
      this.add.nineslice(x, cy - 62, 'hud_panel_sm', undefined, Math.max(64, label.width + 24), 26, 9, 9, 9, 9)
        .setOrigin(0.5, 0.5).setDepth(8).setTint(pd.interact ? 0xffe39a : 0xe6d6bc);
    }
    if (pd.interact) {
      const hint = this.add.text(x, cy - 90, keyHint('按 F 進入', '點「互動」進入'), {
        fontSize: '12px', color: '#ffe9a0', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(9).setAlpha(0);
      this._branchHints.push({ x, hint, until: 0 });
    }
  }

  // ── NPC（含對話互動）─────────────────────────────────────────────────────
  _createNPCs() {
    if (!this.mapData.npcs || this.mapData.npcs.length === 0) return;
    this._npcEntries = [];
    for (const npcDef of this.mapData.npcs) {
      const placement = this._resolveStandingPlacement(npcDef.x, npcDef.y + 60, 18);
      const footY = placement.topY;
      // NPC 圖片以腳底貼齊平台頂，和玩家/怪物站在同一平面。
      const npc = this.physics.add.staticImage(placement.x, footY, npcDef.id || 'npc_new_2');
      npc.setOrigin(0.5, 1);
      // NPC 圖統一 80px 高（擺設如星光之塔用 npcDef.height），依原圖比例縮放避免變形
      const npcSrc = npc.texture.getSourceImage();
      const npcH = npcDef.height || 80;
      npc.setScale(npcH / Math.max(1, npcSrc.height || 80));
      npc.setDepth(8);
      if (npcDef.tint) npc.setTint(npcDef.tint);
      npc.refreshBody();
      npc._npcData = npcDef;

      // 名稱標籤
      const lbl = this.add.text(placement.x, footY - npcH - 6, npcDef.name || '', {
        fontSize: '13px', color: '#ffee88', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setDepth(9).setOrigin(0.5, 1);

      // 互動提示（靠近時才顯示）
      const hintLabel = npcDef.shop
        ? keyHint('[按 F 開啟商店]', '[點「互動」開啟商店]')
        : npcDef.role === 'starTower'
          ? keyHint('[按 F 查看星光碎片]', '[點「互動」查看星光碎片]')
          : keyHint('[按 F 對話]', '[點「互動」對話]');
      // 高大的擺設（塔）把提示放在塔腳，免得飄在畫面外
      const hint = this.add.text(placement.x, npcH > 120 ? footY - 70 : footY - 106, hintLabel, {
        fontSize: '11px', color: '#aaffaa', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(9).setOrigin(0.5, 1).setAlpha(0);

      npc._hint = hint;
      // 任務標記：貼在名稱標籤上方，輕輕上下浮動；沒有任務時隱藏
      let marker = null;
      if (npcDef.questIds || npcDef.npcId) {
        const baseY = footY - npcH - 30;
        marker = this.add.image(placement.x, baseY, 'ui_quest_mark').setOrigin(0.5, 1).setDepth(10).setVisible(false);
        marker._tween = this.tweens.add({ targets: marker, y: baseY - 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      this._npcEntries.push({ npc, hint, label: lbl, data: npcDef, marker });
      if (npcDef.role === 'starTower') this._createTowerGlow(npc, npcH);
    }
    this._refreshQuestMarkers();
    // 任務事件即時更新，另以低頻輪詢補上升級解鎖等沒有事件的變化
    this._markerEvents = ['quest-accepted', 'quest-progress', 'quest-completed', 'job-changed'];
    this._onQuestChanged = () => this._refreshQuestMarkers();
    for (const ev of this._markerEvents) this.events.on(ev, this._onQuestChanged);
    this._markerTimer = this.time.addEvent({ delay: 1000, loop: true, callback: this._onQuestChanged });
  }

  _refreshQuestMarkers() {
    const gs = this.registry.get('gameState');
    for (const entry of this._npcEntries) {
      const m = entry.marker;
      if (!m || !m.scene) continue;
      const key = npcQuestMarker(gs, entry.data);
      if (!key) { if (m.visible) m.setVisible(false); continue; }
      if (m.texture.key !== key) m.setTexture(key);
      if (!m.visible) m.setVisible(true);
    }
  }

  // ── 星光之塔 ────────────────────────────────────────────────────────────────
  // 塔頂的星光：亮度依碎片數增加，點亮後全亮並緩慢脈動（單一 Image + 一個 tween，不需每幀更新）
  _createTowerGlow(npc, towerH) {
    const gs = this.registry.get('gameState');
    const n = shardCount(gs);
    const lit = !!gs.towerLit;
    const glow = this.add.image(npc.x, npc.y - towerH + 34, VFX_TEX.SOFT_GLOW).setDepth(9)
      .setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setScale(lit ? 1.9 : 0.5 + 0.2 * n);
    glow.setAlpha(lit ? 0.9 : 0.12 + 0.12 * n);
    this._towerGlow = glow;
    this._towerBaseY = npc.y;
    this._towerH = towerH;
    this._towerTween = this.tweens.add({
      targets: glow, alpha: glow.alpha * 0.55, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this._portalTweens = this._portalTweens || [];
    this._portalTweens.push(this._towerTween);   // 場景關閉時一併停止
  }

  // 互動星光之塔：顯示進度（對話框）；5/5 且尚未點亮 → 點亮並解鎖最終 Boss
  _interactStarTower() {
    const gs = this.registry.get('gameState');
    if (!lightTower(gs)) return;
    this.registry.set('gameState', gs);
    this.registry.events.emit('changedata-shards', null, shardCount(gs));
    const x = this._towerGlow ? this._towerGlow.x : this.player.x;
    const topY = this._towerGlow ? this._towerGlow.y : this.player.y - 200;
    audio.playLevelUp();
    screenFlash(this, 200, 0.5);
    this.cameras.main.shake(500, 0.006);
    spawnLightRays(this, x, topY, { count: 24, length: 300, color: 0xfff0b0, alpha: 0.6, duration: 1400, width: 3 });
    playFx(this, 'fx_star_restore', x, topY + 110, { scale: 3.4, frameRate: 7, depth: 64 });   // 碎片歸位的金色光爆
    playFx(this, 'fx_job_change', x, topY + 20, { scale: 2.6, frameRate: 6, depth: 64 });
    this.time.delayedCall(500, () => playFx(this, 'fx_job_change', x, topY + 70, { scale: 3.2, frameRate: 6, depth: 64 }));
    if (this._towerGlow) {
      this._towerTween?.stop();
      this._towerGlow.setScale(1.9).setAlpha(0.95);
      this.tweens.add({ targets: this._towerGlow, scale: 4.2, alpha: 0.4, duration: 900, yoyo: true, ease: 'Sine.easeInOut' });
    }
    this.time.delayedCall(1100, () => this._showTransientMessage(`星光之塔重新亮起！\n暗影領域的入口在「魔君王城」開啟`, 3600));
    saveGame(gs);
  }

  _getClosestPlatformTopY(x, targetY = GROUND_Y) {
    return this._resolveStandingPlacement(x, targetY).topY;
  }

  _getPlatformStandingBounds(platform) {
    const standingBounds = platform?.standingBounds;
    if (standingBounds) {
      return standingBounds;
    }

    return {
      left: platform.x,
      right: platform.x + platform.width,
      width: platform.width,
      centerX: platform.x + platform.width / 2,
      topY: platform.y,
      bottomY: platform.y + PLATFORM_HEIGHT,
      visualLeftX: platform.x,
      visualRightX: platform.x + platform.width,
      visualWidth: platform.width,
      visualTopY: platform.y,
      visualBottomY: platform.y + PLATFORM_HEIGHT,
      edgeInsetLeft: 0,
      edgeInsetRight: 0,
    };
  }

  _resolveStandingPlacement(x, targetY = GROUND_Y, margin = 0) {
    if (!this.mapData?.platforms?.length) {
      return { x, topY: targetY, platform: null, bounds: null };
    }

    const containingPlatforms = this.mapData.platforms.filter((platform) => {
      const bounds = this._getPlatformStandingBounds(platform);
      return x >= bounds.left && x <= bounds.right;
    });

    if (containingPlatforms.length === 0) {
      return { x, topY: targetY, platform: null, bounds: null };
    }

    let closestPlatform = containingPlatforms[0];
    let closestBounds = this._getPlatformStandingBounds(closestPlatform);
    let minDistance = Math.abs(closestBounds.topY - targetY);

    for (const platform of containingPlatforms) {
      const bounds = this._getPlatformStandingBounds(platform);
      const distance = Math.abs(bounds.topY - targetY);
      if (distance < minDistance) {
        closestPlatform = platform;
        closestBounds = bounds;
        minDistance = distance;
      }
    }

    const minX = closestBounds.left + margin;
    const maxX = closestBounds.right - margin;
    const clampedX = minX <= maxX
      ? Phaser.Math.Clamp(x, minX, maxX)
      : closestBounds.centerX;

    return {
      x: clampedX,
      topY: closestBounds.topY,
      platform: closestPlatform,
      bounds: closestBounds,
    };
  }

  _alignDynamicEntityToPlatformTop(entity, platformTopY) {
    if (!entity?.body) return;
    const footPadding = getVisualFootPadding(entity);
    entity.setY(platformTopY - entity.displayHeight * (1 - entity.originY) + footPadding);
  }

  _getNearbyNpcData() {
    if (!this.player || !this._npcEntries || this._npcEntries.length === 0) return null;

    // Phase 3.5：用 distSq 平方比較取代 sqrt，避免 6 倍頻率呼叫的開銷
    let closest = null;
    const thresholdSq = 80 * 80; // 80²
    let minDistanceSq = thresholdSq;

    for (const entry of this._npcEntries) {
      const dx = entry.npc.x - this.player.x;
      const dy = entry.npc.y - this.player.y;
      const dSq = dx * dx + dy * dy;
      const visible = dSq < thresholdSq;
      entry.hint.setAlpha(visible ? 1 : 0);
      if (visible && dSq <= minDistanceSq) {
        closest = entry.data;
        minDistanceSq = dSq;
      }
    }

    return closest;
  }

  _openNpcDialog(npcDef) {
    if (this._npcDialog) return;
    if (npcDef.shop) { this._openShop(npcDef); return; }

    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height * 0.65;

    // 內容依任務進度而變（影之長老）；有 choices 時多一排選項按鈕
    const { lines: dialogLines, choices } = buildNpcDialog(this.registry.get('gameState'), npcDef);
    // 行數多（星光之塔的碎片清單）時面板加高、往上長，免得蓋到底下的 HUD
    const extra = Math.max(0, dialogLines.length - 4) * 20;
    const panelH = (choices ? 214 : 170) + extra;
    const top = cy - 84 - extra;

    const bg = addParchmentPanel(this, cx - 240, top, 480, panelH, { depth: 100, world: true });

    const title = this.add.text(cx, top + 26, npcDef.name || 'NPC', {
      fontSize: '16px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(101);

    const msgText = this.add.text(cx, top + 60, dialogLines.join('\n'), {
      fontSize: '14px', color: '#fff3dc', fontFamily: 'Arial',
      stroke: '#1a0e06', strokeThickness: 2,
      wordWrap: { width: 400 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(101);

    const close = this.add.text(cx, top + (choices ? 196 : 144) + extra, keyHint('[ 按 F 或 ESC 關閉 ]', '[ 點此關閉 ]'), {
      fontSize: '12px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeNpcDialog())
      .on('pointerover', () => close.setColor('#ffe27a'))
      .on('pointerout',  () => close.setColor('#e8d3a8'));

    const extras = [];
    const keyHandlers = [];
    if (choices) {
      const bw = 214, bh = 34, gap = 12;
      const startX = cx - (choices.length * bw + (choices.length - 1) * gap) / 2;
      choices.forEach((choice, i) => {
        const bx = startX + i * (bw + gap);
        const by = top + 144;
        const btn = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x6b3f1a, 0.95)
          .setStrokeStyle(2, 0xe0b04a, 0.9).setDepth(101).setInteractive({ useHandCursor: true });
        const label = this.add.text(bx + bw / 2, by + bh / 2, `${keyHint(`${i + 1}　`, '')}${choice.label}`, {
          fontSize: '14px', color: '#fff3dc', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(102);
        btn.on('pointerover', () => btn.setFillStyle(0x9a5a22, 0.98));
        btn.on('pointerout', () => btn.setFillStyle(0x6b3f1a, 0.95));
        btn.on('pointerdown', () => this._onDialogChoice(npcDef, choice));
        extras.push(btn, label);
        const evt = i === 0 ? 'keydown-ONE' : 'keydown-TWO';
        const handler = () => this._onDialogChoice(npcDef, choice);
        this.input.keyboard.on(evt, handler);
        keyHandlers.push([evt, handler]);
      });
    }

    this._npcDialog = { bg, title, msgText, close, extras, keyHandlers };
    if (npcDef.role === 'starTower') this._interactStarTower();   // 對話框用點亮前的內容；點亮的演出同時開始
  }

  // 對話選項被選中：目前只有轉職選職業。選完重開對話顯示新的進度
  _onDialogChoice(npcDef, choice) {
    if (!this._npcDialog) return;
    if (!chooseJobPath(this, choice.id)) return;
    this._closeNpcDialog();
    this._showTransientMessage(`你選擇了「${choice.label}」`, 2200);
    this._openNpcDialog(npcDef);
  }

  _closeNpcDialog() {
    if (!this._npcDialog) return;
    // 商店面板也存進 _npcDialog（_shop 標記），沿用 F / ESC 的開關與場景關閉清理
    if (this._npcDialog._shop) {
      for (const obj of this._npcDialog.objects) {
        if (obj && obj.destroy) obj.destroy();
      }
      this._npcDialog = null;
      return;
    }
    const { bg, title, msgText, close, extras, keyHandlers } = this._npcDialog;
    if (bg?.active) bg.destroy();
    if (title?.active) title.destroy();
    if (msgText?.active) msgText.destroy();
    if (close?.active) close.destroy();
    for (const o of extras || []) if (o?.active) o.destroy();
    for (const [evt, handler] of keyHandlers || []) this.input.keyboard.off(evt, handler);
    this._npcDialog = null;
  }

  // ── 商店（地圖資料 npc.shop；商品表見 config/shops.js）────────────────────────────
  _openShop(npcDef) {
    if (this._npcDialog) return;
    const shop = shopOf(npcDef);

    const { width } = this.cameras.main;
    const panelW = 480, panelH = 142 + shop.items.length * 50 + 20;
    const panelX = (width - panelW) / 2;
    const panelY = 70;
    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    push(addParchmentPanel(this, panelX, panelY, panelW, panelH, { depth: 150 }));

    push(this.add.text(panelX + panelW / 2, panelY + 34, `🏪 ${npcDef.name || '商人'}的${shop.title}`, {
      fontSize: '19px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    if (npcDef.dialog && npcDef.dialog[0]) {
      push(this.add.text(panelX + panelW / 2, panelY + 56, npcDef.dialog[0], {
        fontSize: '12px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));
    }
    const gs = this.registry.get('gameState');
    const mesoText = push(this.add.text(panelX + panelW / 2, panelY + 76, `持有金幣：${gs.meso}`, {
      fontSize: '14px', color: '#fff3c8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    // 商品：購買後補進藥水庫存（gs.potions），HUD 藥水欄會自動刷新
    const items = shop.items.map((it) => ({ ...it, name: shopItemLabel(it), cost: it.cost }));

    items.forEach((item, i) => {
      const rowY = panelY + 106 + i * 50;
      const iconKey = POTION_ICON_KEYS[item.key];
      if (iconKey && this.textures.exists(iconKey)) {
        const icon = push(this.add.image(panelX + 70, rowY, iconKey).setScrollFactor(0).setDepth(152));
        icon.setScale(32 / icon.height);
      }
      const label = `${item.name}  —  ${item.cost} 金幣`;
      const btn = addWoodButton(this, panelX + panelW / 2 + 20, rowY, 300, 38, label, () => {
        const state = this.registry.get('gameState');
        if (buyShopItem(state, item) === 'ok') {
          this.registry.set('gameState', state);
          this.registry.events.emit('changedata-meso', null, state.meso);
          mesoText.setText(`持有金幣：${state.meso}`);
          audio.playPickup();
          btn.label.setText(`${item.name}  — 購買成功！`);
        } else {
          btn.label.setText(`${item.name}  — 金幣不足`);
        }
        this.time.delayedCall(900, () => { if (btn.label.active) btn.label.setText(label); });
      }, { depth: 151, fontSize: 15 });
      btn.objects.forEach(push);
    });

    // 觸控裝置沒有鍵盤：關閉字樣本身可點擊
    push(this.add.text(panelX + panelW / 2, panelY + panelH - 30, keyHint('[ 按 F 或 ESC 關閉 ]', '[ 點此關閉 ]'), {
      fontSize: '12px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeNpcDialog()));

    this._npcDialog = { _shop: true, objects: objs };
  }

  // ── 碰撞設定 ───────────────────────────────────────────────────────────────
  _setupColliders() {
    this.physics.add.collider(this.player, this.platforms);

    // 薄平台（可下穿）
    this.physics.add.collider(this.player, this.thinPlatforms, null, (player, plat) => {
      if (player.dropThrough) return false;
      return player.body.velocity.y >= 0 && player.body.bottom <= plat.body.top + 12;
    }, this);

    this.physics.add.collider(this.monsters, this.platforms);
    // 怪物對薄平台也是單向（只從上方落下時才碰撞）：寬大的身體不會卡在低矮平台的側面 / 底面，
    // 也才能從下方跳上平台。用上一幀的腳底判斷，高速下落不會穿透。
    this.physics.add.collider(this.monsters, this.thinPlatforms, null, (mon, plat) => {
      const b = mon.body;
      return b.velocity.y >= 0 && b.prev.y + b.height <= plat.body.top + 4;
    }, this);

    this.physics.add.overlap(this.player, this.portals,  this._onPortalEnter, null, this);
    this.physics.add.overlap(this.player, this.pickups,  this._onPickup,      null, this);

    this.physics.add.collider(this.pickups, this.platforms);
    this.physics.add.collider(this.pickups, this.thinPlatforms);
  }

  // ── 傳送 ───────────────────────────────────────────────────────────────────
  _onPortalEnter(player, portal) {
    if (!portal.targetMap || this._transitioning) return;
    // 支線入口：站在門上並按互動鍵（F / 觸控「互動」）才進入，走過、落在門上都不會誤入
    if (portal.interact) {
      const now = this.time.now;
      const bh = this._branchHints;
      for (let i = 0; i < bh.length; i++) if (Math.abs(bh[i].x - portal.x) < 2) { bh[i].until = now + 160; bh[i].hint.setAlpha(1); }
      if (now - (this._interactPressedAt ?? -9999) > 450) return;
      this._interactPressedAt = -9999;
    }
    // 任務專屬傳送門（影之試煉）：沒接任務不能進，提示限速避免站在門上洗版
    if (portal.requiresQuest && !isQuestActive(this, portal.requiresQuest)) {
      if (this.time.now - (this._lastGateMsgAt || -9999) > 2600) {
        this._lastGateMsgAt = this.time.now;
        this._showTransientMessage(`需要先接受任務「${getQuestDef(portal.requiresQuest)?.name || ''}」`, 2200);
      }
      return;
    }
    // 等級門檻（城市特區 Lv18）：不足時擋下並提示，提示限速避免站在門上洗版
    const gsNow = this.registry.get('gameState');
    if (portal.minLevel && gsNow.level < portal.minLevel) {
      if (this.time.now - (this._lastGateMsgAt || -9999) > 2600) {
        this._lastGateMsgAt = this.time.now;
        this._showTransientMessage(`需要 Lv.${portal.minLevel} 才能進入（目前 Lv.${gsNow.level}）`, 2200);
      }
      return;
    }
    this._transitioning = true;
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(400, () => {
      const target = portal.targetMap;
      // Phase 14：副本入口（target='dungeon'）走獨立分支，啟動 DungeonScene
      if (target === 'dungeon') {
        const dungeonId = portal.dungeonId || 'slime_cave';
        const def = getDungeonDef(dungeonId);
        // 每日次數上限檢查：超過就取消 transition，顯示提示後留在 town
        if (def?.dailyLimit && !canEnterDungeon(dungeonId, def.dailyLimit)) {
          this.cameras.main.fadeIn(400);
          this._showTransientMessage('⚠ 今日已達上限，明日再來');
          // 延遲 2.5s 才解 _transitioning（比 toast 1.6s 久），給玩家走開 portal 的緩衝
          // 否則玩家原地不動會反覆觸發 fadeOut → 拒絕 → fadeIn 的閃爍
          this.time.delayedCall(2500, () => { this._transitioning = false; });
          return;
        }
        const gs = this.registry.get('gameState');
        this.scene.stop('UIScene');
        this.scene.start('DungeonScene', { dungeonId, gameState: gs });
        return;
      }
      const sceneKey = MAP_SCENE_KEYS[target];
      if (!sceneKey) return;
      const gs = this.registry.get('gameState');
      gs.currentMap = target;
      this.registry.set('gameState', gs);
      this.scene.stop('UIScene');
      this.scene.start(sceneKey, { gameState: gs, spawnX: portal.spawnX });
    });
  }

  // ── 螢幕中央 toast 提示（短暫顯示後自動 fade out）─────────────────────────
  // Phase 14：副本上限提示用；未來 transient 反饋（任務狀態、錯誤訊息）可共用
  _showTransientMessage(text, duration = 1600) {
    const { width, height } = this.cameras.main;
    // setScrollFactor(0) 後，x/y 直接用 viewport 內座標即可（不必加 scrollX/Y）
    const cx = width / 2;
    const cy = height / 2;
    const bg = this.add.rectangle(cx, cy, 360, 56, 0x14182a, 0.92)
      .setStrokeStyle(2, 0xffaa44, 0.9)
      .setDepth(220).setScrollFactor(0);
    const label = this.add.text(cx, cy, text, {
      fontSize: '18px', color: '#ffee99', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(221).setScrollFactor(0);
    this.tweens.add({
      targets: [bg, label],
      alpha: 0,
      delay: duration - 400,
      duration: 400,
      onComplete: () => { bg.destroy(); label.destroy(); },
    });
  }

  _onPickup(player, pickup) {
    if (!pickup.active) return;
    const type = pickup.pickupType, data = pickup.pickupData;
    const gs = this.registry.get('gameState');
    if (type === 'meso') {
      gs.meso += data;
      this.registry.set('gameState', gs);
      this.registry.events.emit('changedata-meso', null, gs.meso);
    } else if (type === 'equipment') {
      this.player.pickupEquipment(data);
    } else if (type === 'quest') {
      onItemCollected(this, data);
      this._showTransientMessage(`獲得 ${TRIAL_ITEM_NAME}`, 1200);
    } else if (type === 'shard') {
      this._collectShard(data);
    }
    audio.playPickup();
    pickup.destroy();
  }

  // 撿到星光碎片：記進存檔、更新 HUD、提示下一步（5/5 時引導回星光之塔）
  _collectShard(shardId) {
    const gs = this.registry.get('gameState');
    const shard = grantShard(gs, shardId);
    if (!shard) return;
    this.registry.set('gameState', gs);
    this.registry.events.emit('changedata-shards', null, shardCount(gs));
    const n = shardCount(gs);
    const c = { x: this.player.x, y: this.player.y - 40 };
    spawnLightRays(this, c.x, c.y, { count: 12, length: 120, color: 0xfff0b0, alpha: 0.6, duration: 700, width: 3 });
    playFx(this, 'fx_job_change', c.x, c.y, { scale: 1.2, frameRate: 8, depth: 64 });
    this._showTransientMessage(
      n >= SHARD_COUNT
        ? `獲得星光碎片！（${n}/${SHARD_COUNT}）\n五塊集齊了，回晨曦鎮的星光之塔吧！\n稱號：${gs.title}`
        : `獲得星光碎片：${shard.name}（${n}/${SHARD_COUNT}）`,
      n >= SHARD_COUNT ? 4200 : 2600);
    saveGame(gs);
  }

  _onMonsterDied(monster) {
    if (monster?._respawnDef) this._scheduleRespawn(monster._respawnDef);
    const gs = this.registry.get('gameState');
    gs.killCount++;
    this.player.gainExp(monster.exp || 0);
    this.registry.set('gameState', gs);
    this.registry.events.emit('changedata-killcount', null, gs.killCount);

    // Phase 13：推進「擊殺型」任務進度
    if (monster?.config?.id) {
      onMonsterKilled(this, monster.config.id);
    }
    // 任務物品掉落（試煉之證）：有進行中的收集任務、在指定地圖才會掉
    const itemId = questItemDrop(gs, this.mapKey, Math.random());
    if (itemId && typeof monster._spawnPickup === 'function') monster._spawnPickup('item-quest-token', itemId, 'quest');
  }

  update(time, delta) {
    if (!this.player || this.player.isDead) return;
    if (this._modifier) this._modifier.update(time, delta, this.player);   // 先設好 speedMult / iceFloor 再讓玩家移動
    this.player.update(delta);
    this.player.recoverMp(delta);
    this.player.recoverHp(delta);
    // Phase 3.5：NPC 距離檢測降頻（每 100 ms 一次而非每幀 60 Hz）。
    // F 鍵互動會即時呼叫一次，不影響反應速度。
    if (time - (this._lastNpcCheckAt || 0) >= 100) {
      this._lastNpcCheckAt = time;
      this._getNearbyNpcData();
    }

    const bh = this._branchHints;
    for (let i = 0; i < bh.length; i++) if (bh[i].until && time > bh[i].until) { bh[i].until = 0; bh[i].hint.setAlpha(0); }

    // Phase 8.3：畫面外怪物跳過 AI update（約 1.25 螢幕外）。
    // 跳過的只是 AI 決策；arcade physics（重力/碰撞）仍由 physics.world 獨立 step，
    // 怪物不會凍在半空。玩家靠近進入範圍後 AI 自動恢復。
    const cullSq = 1600 * 1600;
    const px = this.player.x, py = this.player.y;
    const children = this.monsters.getChildren();
    for (const monster of children) {
      if (!this.player?.active) break;  // player 若於迴圈中被銷毀，停止傳入怪物 update
      if (!monster.active || monster.isDead) continue;
      const dx = monster.x - px, dy = monster.y - py;
      if (dx * dx + dy * dy > cullSq) {   // 畫面外，跳過 AI update
        // 物理仍會讓它落地，血條要跟著走，否則血條停在出生點（甚至 (0,0)），玩家靠近時才跳過去
        monster._updateHpBar();
        continue;
      }
      monster.update(this.player, delta);
    }

    // 星光碎片會被玩家吸過來（掉在平台邊緣也不會撿不到）；只在有碎片時才遍歷
    if (this.pickups && this.pickups.getLength() > 0) {
      for (const pk of this.pickups.getChildren()) {
        if (pk.active && pk.pickupType === 'shard' && time - (pk._bornAt ?? (pk._bornAt = time)) > 1200) {
          pk.body.setAllowGravity(false);
          this.physics.moveToObject(pk, this.player, 280);
        }
      }
    }

    this._playTimeAccum = (this._playTimeAccum || 0) + delta;
    if (this._playTimeAccum > 1000) {
      const gs = this.registry.get('gameState');
      gs.playTime = (gs.playTime || 0) + 1;
      this.registry.set('gameState', gs);
      this._playTimeAccum = 0;
    }
  }

  // 轉職完成（任務覺醒或除錯指令）：換外觀、HUD 事件、演出、存檔。opts.silent = 不播演出（除錯切換用）
  _onJobChanged(jobId, opts = {}) {
    const gs = this.registry.get('gameState');
    if (!this.player?.active || !gs) return;
    this.player.refreshJobVisuals();   // 新職業的圖還沒載好時先用盜賊動作圖頂著
    loadAssets(this, jobAssets(jobIdOf(gs)), () => {
      if (!this.player?.active) return;
      this.player.refreshJobVisuals();
      // 舊職業的圖稍後釋放（殘影等短命物件可能還在用）
      this.time.delayedCall(2000, () => this.sys.isActive() && this._releaseAssets());
    });
    this.registry.set('gameState', gs);
    this.registry.events.emit('changedata-hp', null, gs.hp);
    this.registry.events.emit('changedata-mp', null, gs.mp);
    this.registry.events.emit('changedata-sp', null, gs.skillPoints);
    this.registry.events.emit('changedata-level', null, gs.level);
    if (!opts.silent) {
      playJobChangeEffect(this, this.player);
      this._showTransientMessage(`轉職成功！　${jobOf(gs).name}　稱號「${gs.title}」`, 3200);
    }
    saveGame(gs);
  }

  _onSceneShutdown() {
    if (this._modifier) { this._modifier.destroy(); this._modifier = null; }
    this.events.off('monster-died', this._onMonsterDied, this);
    this.events.off('job-changed', this._onJobChanged, this);

    // Phase 6.5：停止 portal 無限循環 tween，避免跳地圖累積殘留
    for (const tw of this._portalTweens || []) {
      if (tw) tw.stop();
    }
    this._portalTweens = [];

    if (this._onEscKeyDown) {
      this.input.keyboard.off('keydown-ESC', this._onEscKeyDown);
      this._onEscKeyDown = null;
    }

    if (this._onInteractKeyDown) {
      this.input.keyboard.off('keydown-F', this._onInteractKeyDown);
      this._onInteractKeyDown = null;
    }

    this._closeNpcDialog();
    if (this._onQuestChanged) {
      for (const ev of this._markerEvents) this.events.off(ev, this._onQuestChanged);
      this._onQuestChanged = null;
    }
    if (this._markerTimer) { this._markerTimer.remove(false); this._markerTimer = null; }
    for (const entry of this._npcEntries) {
      if (entry?.marker) { if (entry.marker._tween) entry.marker._tween.stop(); entry.marker.destroy(); }
      if (entry?.hint) entry.hint.destroy();
      if (entry?.label) entry.label.destroy();
    }
    this._npcEntries = [];
  }
}

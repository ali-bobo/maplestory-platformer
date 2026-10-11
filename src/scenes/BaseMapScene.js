import Phaser from 'phaser';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import { audio } from '../engine/audio.js';
import { getVisualFootPadding } from '../config/alignment.js';
import { addParchmentPanel } from '../engine/woodUi.js';
import { VFX_TEX } from '../engine/vfxTextures.js';
import { saveGame, isSavableMap } from '../engine/saveGame.js';
import { onMonsterKilled, onMapEntered, acceptQuest, isQuestActive, isQuestCompleted } from '../engine/questManager.js';
import { canEnterDungeon, getRemainingEntries } from '../engine/dungeonRecord.js';
import { getDungeonDef } from '../config/dungeons.js';
import { keyHint } from '../engine/device.js';

const PLATFORM_HEIGHT = 24;
const GROUND_Y = WORLD_HEIGHT;
// 每張地圖專屬的跳台圖：左端、中段（可重複鋪）、右端由同一張圖切出
// surfaceTop：圖片頂端到可站立表面的距離（px）
const PLATFORM_THEMES = {
  sky:     { key: 'platform_sky',     surfaceTop: 7 },
  henesys: { key: 'platform_forest',  surfaceTop: 12 },
  ruins:   { key: 'platform_ruins',   surfaceTop: 0 },
  ellinia: { key: 'platform_mystic',  surfaceTop: 10 },
  kerning: { key: 'platform_city',    surfaceTop: 11 },
  taipei:  { key: 'platform_city',    surfaceTop: 11 },
  town:    { key: 'platform_town',    surfaceTop: 1 },
  boss:    { key: 'platform_boss',    surfaceTop: 0 },
  dungeon: { key: 'platform_dungeon', surfaceTop: 0 },
};
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

  create() {
    // Phase 14：若子場景已預先設好 mapData（例如 DungeonScene 動態構建），不覆寫
    if (!this.mapData) this.mapData = MAPS[this.mapKey];
    if (!this.mapData) { console.error(`地圖資料未找到: ${this.mapKey}`); return; }

    this._transitioning = false;  // 每次 create 重置傳送狀態

    const gs = this.registry.get('gameState');
    gs.currentMap = this.mapKey;
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

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    } else {
      this.scene.wake('UIScene');
    }

    audio.playBgm(this.mapKey);
    this.events.on('monster-died', this._onMonsterDied, this);
    this._playTimeAccum = 0;

    // ESC 關閉 NPC 對話
    this._onEscKeyDown = () => { this._closeNpcDialog(); };
    this.input.keyboard.on('keydown-ESC', this._onEscKeyDown);
    this._onInteractKeyDown = () => {
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
      const npcQuestIds = Array.isArray(npcData.questIds) ? npcData.questIds : [];
      for (const questId of npcQuestIds) {
        if (!isQuestActive(this, questId) && !isQuestCompleted(this, questId)) {
          acceptQuest(this, questId);
          break;  // 一次只接一個，玩家完成後可再對話接下一個
        }
      }
      this._openNpcDialog(npcData);
    };
    this.input.keyboard.on('keydown-F', this._onInteractKeyDown);
    // 只註冊 shutdown：場景被 destroy 前 Phaser 必先觸發 shutdown，且本遊戲場景
    // 從不被 scene.remove()，重複註冊 destroy 監聽只會在 relaunch 時累積死監聽。
    this.events.once('shutdown', this._onSceneShutdown, this);

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
      const src = this.textures.get(bgImage).getSourceImage();
      const sc = Math.max(SCREEN_W / src.width, bgH / src.height);
      const bg = this.add.image(SCREEN_W / 2, bgH, bgImage);
      bg.setOrigin(0.5, 1);
      bg.setScale(sc);
      bg.setScrollFactor(0);
      bg.setDepth(-9);
    }
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
  _ensurePlatformSlices(themeKey) {
    const leftKey = `${themeKey}__L`;
    if (this.textures.exists(leftKey)) return;
    const src = this.textures.get(themeKey).getSourceImage();
    const w = src.width, h = src.height;
    const capW = Math.round(w * PLATFORM_CAP_RATIO);
    const tileW = Math.round(w * PLATFORM_TILE_RATIO);
    const blendW = Math.round(tileW * 0.25);
    const tileX = Math.round((w - tileW) / 2);

    const slice = (key, sx, sw) => {
      const tex = this.textures.createCanvas(key, sw, h);
      tex.getContext().drawImage(src, sx, 0, sw, h, 0, 0, sw, h);
      tex.refresh();
    };
    slice(leftKey, 0, capW);
    slice(`${themeKey}__R`, w - capW, capW);

    const mid = this.textures.createCanvas(`${themeKey}__M`, tileW, h);
    const ctx = mid.getContext();
    ctx.drawImage(src, tileX, 0, tileW, h, 0, 0, tileW, h);
    // 左緣用 tile 右側之後的像素淡入，讓 tile 首尾相接
    for (let i = 0; i < blendW; i++) {
      ctx.globalAlpha = 1 - i / blendW;
      ctx.drawImage(src, tileX + tileW + i, 0, 1, h, i, 0, 1, h);
    }
    ctx.globalAlpha = 1;
    mid.refresh();
  }

  _drawThemedPlatform(p, theme) {
    this._ensurePlatformSlices(theme.key);
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
    for (const pd of this.mapData.portals) {
      if (pd.requireBoss && !gs.bossUnlocked) continue;

      const portal = this.portals.create(pd.x, pd.y, 'portal');
      portal.setVisible(false);  // 只當碰撞區，畫面由下方的光門特效負責
      portal.targetMap = pd.target;
      portal.spawnX   = pd.spawnX;  // 目標地圖的重生位置
      portal.dungeonId = pd.dungeonId;  // Phase 14：副本 ID（target='dungeon' 時用）
      portal.refreshBody();

      // Phase 14：dungeon 類型 portal 在 label 後補「(今日剩 N 次)」，給玩家可見回饋
      let labelText = pd.label || '';
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
    const color = pd.target === 'dungeon' ? 0x5cf08a : pd.target === 'boss' ? 0xff4f8a : 0x6fd8ff;
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
        .setOrigin(0.5, 0.5).setDepth(8).setTint(0xe6d6bc);
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
      // NPC 圖統一 80px 高，依原圖比例縮放避免變形
      const npcSrc = npc.texture.getSourceImage();
      npc.setScale(80 / Math.max(1, npcSrc.height || 80));
      npc.setDepth(8);
      npc.refreshBody();
      npc._npcData = npcDef;

      // 名稱標籤
      const lbl = this.add.text(placement.x, footY - 86, npcDef.name || '', {
        fontSize: '13px', color: '#ffee88', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setDepth(9).setOrigin(0.5, 1);

      // 互動提示（靠近時才顯示）
      const hintLabel = npcDef.shop
        ? keyHint('[按 F 開啟商店]', '[點「互動」開啟商店]')
        : keyHint('[按 F 對話]', '[點「互動」對話]');
      const hint = this.add.text(placement.x, footY - 106, hintLabel, {
        fontSize: '11px', color: '#aaffaa', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(9).setOrigin(0.5, 1).setAlpha(0);

      npc._hint = hint;
      this._npcEntries.push({ npc, hint, label: lbl, data: npcDef });
    }
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

    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height * 0.65;

    const dialogLines = npcDef.dialog || [
      '歡迎光臨！勇士請多保重。',
      '這裡的怪物最近鬧得很兇...',
      '你可以在這裡購買補給品。',
    ];

    const bg = addParchmentPanel(this, cx - 240, cy - 84, 480, 170, { depth: 100, world: true });

    const title = this.add.text(cx, cy - 58, npcDef.name || 'NPC', {
      fontSize: '16px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(101);

    const msgText = this.add.text(cx, cy - 24, dialogLines.join('\n'), {
      fontSize: '14px', color: '#fff3dc', fontFamily: 'Arial',
      stroke: '#1a0e06', strokeThickness: 2,
      wordWrap: { width: 400 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(101);

    const close = this.add.text(cx, cy + 60, keyHint('[ 按 F 或 ESC 關閉 ]', '[ 點此關閉 ]'), {
      fontSize: '12px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeNpcDialog())
      .on('pointerover', () => close.setColor('#ffe27a'))
      .on('pointerout',  () => close.setColor('#e8d3a8'));

    this._npcDialog = { bg, title, msgText, close };
  }

  _closeNpcDialog() {
    if (!this._npcDialog) return;
    const { bg, title, msgText, close } = this._npcDialog;
    if (bg?.active) bg.destroy();
    if (title?.active) title.destroy();
    if (msgText?.active) msgText.destroy();
    if (close?.active) close.destroy();
    this._npcDialog = null;
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
    this.physics.add.collider(this.monsters, this.thinPlatforms);

    this.physics.add.overlap(this.player, this.portals,  this._onPortalEnter, null, this);
    this.physics.add.overlap(this.player, this.pickups,  this._onPickup,      null, this);

    this.physics.add.collider(this.pickups, this.platforms);
    this.physics.add.collider(this.pickups, this.thinPlatforms);
  }

  // ── 傳送 ───────────────────────────────────────────────────────────────────
  _onPortalEnter(player, portal) {
    if (!portal.targetMap || this._transitioning) return;
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
    }
    audio.playPickup();
    pickup.destroy();
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

    if (gs.killCount >= 60 && !gs.bossUnlocked) {
      gs.bossUnlocked = true;
      this.registry.set('gameState', gs);
    }
  }

  update(time, delta) {
    if (!this.player || this.player.isDead) return;
    this.player.update(delta);
    this.player.recoverMp(delta);
    this.player.recoverHp(delta);
    // Phase 3.5：NPC 距離檢測降頻（每 100 ms 一次而非每幀 60 Hz）。
    // F 鍵互動會即時呼叫一次，不影響反應速度。
    if (time - (this._lastNpcCheckAt || 0) >= 100) {
      this._lastNpcCheckAt = time;
      this._getNearbyNpcData();
    }

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
      if (dx * dx + dy * dy > cullSq) continue;  // 畫面外，跳過 AI update
      monster.update(this.player, delta);
    }

    this._playTimeAccum = (this._playTimeAccum || 0) + delta;
    if (this._playTimeAccum > 1000) {
      const gs = this.registry.get('gameState');
      gs.playTime = (gs.playTime || 0) + 1;
      this.registry.set('gameState', gs);
      this._playTimeAccum = 0;
    }
  }

  _onSceneShutdown() {
    this.events.off('monster-died', this._onMonsterDied, this);

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
    for (const entry of this._npcEntries) {
      if (entry?.hint) entry.hint.destroy();
      if (entry?.label) entry.label.destroy();
    }
    this._npcEntries = [];
  }
}

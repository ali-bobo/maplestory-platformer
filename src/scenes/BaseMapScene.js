import Phaser from 'phaser';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import { audio } from '../engine/audio.js';
import { getVisualFootPadding } from '../config/alignment.js';
import { onMonsterKilled, onMapEntered, acceptQuest, isQuestActive, isQuestCompleted } from '../engine/questManager.js';
import { canEnterDungeon, getRemainingEntries } from '../engine/dungeonRecord.js';
import { getDungeonDef } from '../config/dungeons.js';

const PLATFORM_HEIGHT = 24;
const GROUND_Y = WORLD_HEIGHT;
const PLATFORM_DECORATION_ROW_INDEX = {
  henesys: 0,
  ellinia: 2,
  taipei: 1,
};
const MAX_PLATFORM_WHITE_THRESHOLD = 253;
const IMAGE_PLATFORM_STYLE = {
  henesys: {
    renderHeight: 84,
    imageCropTopRatio: 0.16,
    imageCropHeightRatio: 0.58,
    sourceWindowWidthRatio: 0.72,
    renderWidthRatio: 1.12,
    walkableTopRatio: 0.30,
    standingLineRatio: 0.12,
    removeNearWhite: true,
    whiteThreshold: 242,
    edgeFadePixels: 22,
    bottomFadePixels: 16,
  },
  ellinia: {
    renderHeight: 112,
    imageCropTopRatio: 0.16,
    imageCropHeightRatio: 0.58,
    sourceWindowWidthRatio: 0.74,
    renderWidthRatio: 1.18,
    walkableTopRatio: 0.64,
    removeNearWhite: true,
    whiteThreshold: 242,
    edgeFadePixels: 22,
    bottomFadePixels: 16,
  },
  taipei: {
    renderHeight: 88,
    imageCropTopRatio: 0.18,
    imageCropHeightRatio: 0.56,
    sourceWindowWidthRatio: 0.78,
    renderWidthRatio: 1.02,
    walkableTopRatio: 0.66,
    standingLineRatio: 0.88,
    removeNearWhite: true,
    whiteThreshold: 242,
    edgeFadePixels: 20,
    bottomFadePixels: 14,
  },
};

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
  }

  // ── 背景（單張 Image 以 cover 填滿，底部對齊 GROUND_Y）────────────────────
  _createBackground() {
    const { bgColor, bgImage } = this.mapData;
    const SCREEN_W = 1280, SCREEN_H = 720;
    const bgH = WORLD_HEIGHT;

    // 底色（覆蓋整個畫布，包括 HUD 下方）
    const sky = this.add.graphics();
    sky.fillStyle(bgColor || 0x5588ff);
    sky.fillRect(0, 0, SCREEN_W, SCREEN_H);
    sky.setDepth(-10).setScrollFactor(0);

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
    for (const p of this.mapData.platforms) {
      const group = p.thin ? this.thinPlatforms : this.platforms;
      if (p.renderMode === 'image-native' && p.decorationKey && this.textures.exists(p.decorationKey)) {
        this._createImageNativePlatform(group, p);
        continue;
      }

      const textureKey = `platform-${p.type || 'grass'}`;
      const sprite = group.create(p.x + p.width / 2, p.y + PLATFORM_HEIGHT / 2, textureKey);
      sprite.setDisplaySize(p.width, PLATFORM_HEIGHT);
      sprite.refreshBody();
      sprite.setDepth(5);
      if (p.isGround) sprite.setAlpha(0);  // 地板用背景自然地板視覺，不疊加紋理
      if (p.decorationKey && this.textures.exists(p.decorationKey)) {
        this._createPlatformDecoration(p);
      }
    }
  }

  _createImageNativePlatform(group, platformData) {
    const mapStyle = IMAGE_PLATFORM_STYLE[this.mapKey] || {};
    const {
      decorationKey,
      type = 'wood',
      x,
      y,
      width,
      imageRowIndex,
      imageCropTopRatio = mapStyle.imageCropTopRatio ?? 0.28,
      imageCropHeightRatio = mapStyle.imageCropHeightRatio ?? 0.48,
      sourceWindowWidthRatio = mapStyle.sourceWindowWidthRatio ?? 1,
      renderHeight = mapStyle.renderHeight,
      renderWidthRatio = mapStyle.renderWidthRatio,
      walkableTopRatio = mapStyle.walkableTopRatio ?? 0.42,
      standingLineRatio = mapStyle.standingLineRatio ?? walkableTopRatio,
      walkableHeight = 18,
      walkableLeftInset = mapStyle.walkableLeftInset,
      walkableRightInset = mapStyle.walkableRightInset,
      walkableLeftInsetRatio = mapStyle.walkableLeftInsetRatio ?? 0,
      walkableRightInsetRatio = mapStyle.walkableRightInsetRatio ?? 0,
      walkableCenterOffset = mapStyle.walkableCenterOffset ?? 0,
      removeNearWhite = mapStyle.removeNearWhite ?? false,
      whiteThreshold = mapStyle.whiteThreshold ?? 245,
      edgeFadePixels = mapStyle.edgeFadePixels ?? 0,
      bottomFadePixels = mapStyle.bottomFadePixels ?? 0,
    } = platformData;

    const texture = this.textures.get(decorationKey);
    const source = texture?.getSourceImage?.();
    if (!source?.width || !source?.height) return null;

    const rowCount = 3;
    const rowHeight = Math.floor(source.height / rowCount);
    const rowIndex = imageRowIndex ?? PLATFORM_DECORATION_ROW_INDEX[this.mapKey] ?? 0;
    const cropTop = rowIndex * rowHeight + Math.floor(rowHeight * imageCropTopRatio);
    const cropHeight = Math.max(64, Math.floor(rowHeight * imageCropHeightRatio));
    const sourceWindowWidth = Math.min(
      source.width,
      Math.max(width, Math.round(source.width * sourceWindowWidthRatio)),
    );
    const cropLeft = Math.max(0, Math.floor((source.width - sourceWindowWidth) / 2));
    const displayHeight = renderHeight
      ?? Math.round(cropHeight * 0.5);
    const proportionalWidth = Math.max(1, Math.round((displayHeight * sourceWindowWidth) / cropHeight));
    const displayWidth = platformData.renderWidth
      ?? (renderWidthRatio
        ? Math.round(width * renderWidthRatio)
        : proportionalWidth);
    const centerX = x + width / 2;
    const visualLeftX = centerX - displayWidth / 2;
    const baseEdgeInset = Math.max(0, Math.round((displayWidth - width) / 2));
    const resolvedLeftInset = this._resolvePlatformEdgeInset({
      explicitInset: walkableLeftInset,
      insetRatio: walkableLeftInsetRatio,
      displayWidth,
      baseInset: baseEdgeInset,
    });
    const resolvedRightInset = this._resolvePlatformEdgeInset({
      explicitInset: walkableRightInset,
      insetRatio: walkableRightInsetRatio,
      displayWidth,
      baseInset: baseEdgeInset,
    });
    const walkableMinX = visualLeftX + resolvedLeftInset;
    const walkableMaxX = visualLeftX + displayWidth - resolvedRightInset;
    const computedWalkableWidth = Math.max(24, Math.round(walkableMaxX - walkableMinX));
    const walkableWidth = platformData.walkableWidth ?? computedWalkableWidth;
    const walkableCenterX = (walkableMinX + walkableMaxX) / 2 + walkableCenterOffset;
    const walkableLeftX = computedWalkableWidth > walkableWidth
      ? Phaser.Math.Clamp(walkableCenterX - walkableWidth / 2, walkableMinX, walkableMaxX - walkableWidth)
      : walkableMinX;
    const colliderCenterX = walkableLeftX + walkableWidth / 2;
    const walkableTopOffset = Math.round(displayHeight * walkableTopRatio);
    const visualTopY = y - walkableTopOffset;
    const standingTopOffset = Math.round(displayHeight * standingLineRatio);
    const walkableTopY = visualTopY + standingTopOffset;
    const textureKey = (removeNearWhite || edgeFadePixels > 0 || bottomFadePixels > 0)
      ? this._getPlatformProcessedTextureKey({
          decorationKey,
          rowIndex,
          cropLeft,
          cropTop,
          cropWidth: sourceWindowWidth,
          cropHeight,
          whiteThreshold,
          edgeFadePixels,
          bottomFadePixels,
        })
      : decorationKey;

    platformData.width = walkableWidth;
    platformData.x = walkableLeftX;
    platformData.standingBounds = {
      left: walkableLeftX,
      right: walkableLeftX + walkableWidth,
      width: walkableWidth,
      centerX: colliderCenterX,
      topY: walkableTopY,
      bottomY: walkableTopY + walkableHeight,
      visualLeftX,
      visualRightX: visualLeftX + displayWidth,
      visualWidth: displayWidth,
      visualTopY,
      visualBottomY: visualTopY + displayHeight,
      standingTopOffset,
      edgeInsetLeft: walkableLeftX - visualLeftX,
      edgeInsetRight: visualLeftX + displayWidth - (walkableLeftX + walkableWidth),
    };

    const collider = group.create(colliderCenterX, walkableTopY + walkableHeight / 2, `platform-${type}`);
    collider.setDisplaySize(walkableWidth, walkableHeight);
    collider.setAlpha(0);
    collider.refreshBody();

    const sprite = this.add.image(centerX, y - walkableTopOffset, textureKey);

    sprite.setOrigin(0.5, 0);
    if (!removeNearWhite) {
      sprite.setCrop(cropLeft, cropTop, sourceWindowWidth, cropHeight);
    }
    sprite.setDisplaySize(displayWidth, displayHeight);
    sprite.setDepth(6);

    return collider;
  }

  _resolvePlatformEdgeInset({ explicitInset, insetRatio = 0, displayWidth, baseInset = 0 }) {
    if (typeof explicitInset === 'number') {
      return Math.max(0, Math.round(explicitInset));
    }

    return Math.max(baseInset, Math.round(displayWidth * insetRatio));
  }

  _getPlatformProcessedTextureKey({
    decorationKey,
    rowIndex,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    whiteThreshold,
    edgeFadePixels,
    bottomFadePixels,
  }) {
    const processedKey = [
      decorationKey,
      'processed',
      rowIndex,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
      whiteThreshold,
      edgeFadePixels,
      bottomFadePixels,
    ].join('-');

    if (this.textures.exists(processedKey)) {
      return processedKey;
    }

    const source = this.textures.get(decorationKey)?.getSourceImage?.();
    if (!source?.width || !source?.height) {
      return decorationKey;
    }

    const canvasTexture = this.textures.createCanvas(processedKey, cropWidth, cropHeight);
    const context = canvasTexture.getContext();
    context.clearRect(0, 0, cropWidth, cropHeight);
    context.drawImage(
      source,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    const imageData = context.getImageData(0, 0, cropWidth, cropHeight);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const pixelIndex = index / 4;
      const x = pixelIndex % cropWidth;
      const y = Math.floor(pixelIndex / cropWidth);
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const baseAlpha = pixels[index + 3];
      if (baseAlpha === 0) continue;

      let alpha = baseAlpha;
      const minChannelValue = Math.min(red, green, blue);
      const safeWhiteThreshold = Math.min(whiteThreshold, MAX_PLATFORM_WHITE_THRESHOLD);
      if (minChannelValue >= safeWhiteThreshold) {
        const fadeRatio = Phaser.Math.Clamp((255 - minChannelValue) / (255 - safeWhiteThreshold), 0, 1);
        alpha = Math.round(alpha * fadeRatio);
      }

      if (edgeFadePixels > 0) {
        const sideDistance = Math.min(x, cropWidth - 1 - x);
        if (sideDistance < edgeFadePixels) {
          alpha = Math.round(alpha * Phaser.Math.Clamp(sideDistance / edgeFadePixels, 0, 1));
        }
      }

      if (bottomFadePixels > 0) {
        const bottomDistance = cropHeight - 1 - y;
        if (bottomDistance < bottomFadePixels) {
          alpha = Math.round(alpha * Phaser.Math.Clamp(bottomDistance / bottomFadePixels, 0, 1));
        }
      }

      pixels[index + 3] = alpha;
    }
    context.putImageData(imageData, 0, 0);
    canvasTexture.refresh();

    return processedKey;
  }

  _createPlatformDecoration(platformData) {
    const { decorationKey, x, y, width } = platformData;
    const decoration = this.add.image(x + width / 2, y + PLATFORM_HEIGHT / 2, decorationKey);
    const texture = this.textures.get(decorationKey);
    const source = texture?.getSourceImage?.();

    if (source?.width && source?.height) {
      const rowCount = 3;
      const rowHeight = Math.floor(source.height / rowCount);
      const rowIndex = PLATFORM_DECORATION_ROW_INDEX[this.mapKey] ?? 0;
      const cropHeight = Math.max(48, Math.floor(rowHeight * 0.36));
      const cropTop = rowIndex * rowHeight + Math.floor(rowHeight * 0.37);
      decoration.setCrop(0, cropTop, source.width, cropHeight);
    }

    decoration.setDisplaySize(width, PLATFORM_HEIGHT);
    decoration.setDepth(6);
    return decoration;
  }

  // ── 怪物生成（依平台隨機分佈）─────────────────────────────────────────────
  _spawnMonsters() {
    if (!this.mapData.monsters || this.mapData.monsters.length === 0) return;

    // 取得所有平台（含地板），按 x 排序
    const allPlats = [...this.mapData.platforms].sort((a, b) => a.x - b.x);
    // 排除寬度太窄的平台
    const validPlats = allPlats.filter((platform) => this._getPlatformStandingBounds(platform).width >= 80);

    let platIdx = 0;

    for (const spawn of this.mapData.monsters) {
      const monsterDef = MONSTERS.find(m => m.id === spawn.id);
      if (!monsterDef) { console.warn(`[Spawn] 找不到怪物定義: ${spawn.id}`); continue; }

      const count = spawn.count || 3;

      for (let i = 0; i < count; i++) {
        // 輪流使用各個平台，確保均勻分佈
        const plat = validPlats[platIdx % validPlats.length];
        platIdx++;

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
        this.monsters.add(monster);
      }
    }
  }

  // ── 傳送門 ─────────────────────────────────────────────────────────────────
  _createPortals() {
    const gs = this.registry.get('gameState');
    for (const pd of this.mapData.portals) {
      if (pd.requireBoss && !gs.bossUnlocked) continue;

      const portal = this.portals.create(pd.x, pd.y, 'portal');
      portal.setDepth(6);
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

      this.add.text(pd.x, pd.y - 10, labelText, {
        fontSize: '12px', color: '#ddaaff', fontFamily: 'Arial',
      }).setDepth(7).setOrigin(0.5, 1);

      // Phase 6.5：portal 無限循環 tween 必須在場景 shutdown 時 stop，
      // 否則跳地圖時殘留的 tween 會累積（Phaser 場景切換不自動清 tween）
      this._portalTweens = this._portalTweens || [];
      this._portalTweens.push(
        this.tweens.add({ targets: portal, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 })
      );
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
      npc.setDisplaySize(60, 80);
      npc.setDepth(8);
      npc.refreshBody();
      npc._npcData = npcDef;

      // 名稱標籤
      const lbl = this.add.text(placement.x, footY - 86, npcDef.name || '', {
        fontSize: '13px', color: '#ffee88', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setDepth(9).setOrigin(0.5, 1);

      // 互動提示（靠近時才顯示）
      const hintLabel = npcDef.shop ? '[按 F 開啟商店]' : '[按 F 對話]';
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

    const bg = this.add.graphics().setDepth(100);
    bg.fillStyle(0x001122, 0.92);
    bg.fillRoundedRect(cx - 220, cy - 70, 440, 140, 10);
    bg.lineStyle(2, 0x4488aa, 0.9);
    bg.strokeRoundedRect(cx - 220, cy - 70, 440, 140, 10);

    const title = this.add.text(cx, cy - 52, npcDef.name || 'NPC', {
      fontSize: '15px', color: '#ffee88', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(101);

    const msgText = this.add.text(cx, cy - 24, dialogLines.join('\n'), {
      fontSize: '13px', color: '#ddffee', fontFamily: 'Arial',
      wordWrap: { width: 400 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(101);

    const close = this.add.text(cx, cy + 58, '[ 按 F 或 ESC 關閉 ]', {
      fontSize: '12px', color: '#88aacc', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeNpcDialog())
      .on('pointerover', () => close.setStyle({ color: '#aaccff' }))
      .on('pointerout',  () => close.setStyle({ color: '#88aacc' }));

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

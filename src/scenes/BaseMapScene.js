import Phaser from 'phaser';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import { audio } from '../engine/audio.js';

const PLATFORM_HEIGHT = 24;
const GROUND_Y = WORLD_HEIGHT - PLATFORM_HEIGHT;

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
    this._backgroundUpdateHandler = null;
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
    this.mapData = MAPS[this.mapKey];
    if (!this.mapData) { console.error(`地圖資料未找到: ${this.mapKey}`); return; }

    this._transitioning = false;  // 每次 create 重置傳送狀態

    const gs = this.registry.get('gameState');
    gs.currentMap = this.mapKey;
    this.registry.set('gameState', gs);

    this.physics.world.setBounds(0, 0, this.mapData.width, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.mapData.width, WORLD_HEIGHT);

    this._createBackground();
    this._createPlatforms();

    const spawnX = this._spawnX !== null ? this._spawnX : (this.mapData.spawnX || 150);
    this.player = new Player(this, spawnX, 0, gs);
    this._alignDynamicEntityToPlatformTop(this.player, this._getClosestPlatformTopY(spawnX, GROUND_Y));
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
      this._openNpcDialog(npcData);
    };
    this.input.keyboard.on('keydown-F', this._onInteractKeyDown);
    this.events.once('shutdown', this._onSceneShutdown, this);
    this.events.once('destroy', this._onSceneShutdown, this);
  }

  // ── 背景（使用真實圖片 tileSprite，極低視差率避免重複銜接） ─────────────
  _createBackground() {
    const { bgColor, bgImage } = this.mapData;
    const SCREEN_W = 1280, SCREEN_H = 720;

    // 底色
    const sky = this.add.graphics();
    sky.fillStyle(bgColor || 0x5588ff);
    sky.fillRect(0, 0, SCREEN_W, SCREEN_H);
    sky.setDepth(-10).setScrollFactor(0.0);

    if (bgImage && this.textures.exists(bgImage)) {
      const tex = this.textures.get(bgImage);
      const imgW = tex.getSourceImage().width;
      const imgH = tex.getSourceImage().height;

      const bg = this.add.tileSprite(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, bgImage);
      bg.setScrollFactor(0).setDepth(-9);

      // cover 式等比縮放：取寬/高中較大比例，確保完全填滿螢幕
      const sc = Math.max(SCREEN_W / imgW, SCREEN_H / imgH);
      bg.setTileScale(sc, sc);

      // 統一讓背景底部貼齊畫面底部，避免各地圖地面視覺忽高忽低。
      const baseTileY = SCREEN_H / sc - imgH;
      bg.setTilePosition(0, baseTileY);

      // 視差：使用極低速率（1%），避免背景重複銜接痕跡
      this._backgroundUpdateHandler = () => {
        bg.tilePositionX = this.cameras.main.scrollX * 0.01;
      };
      this.events.on('update', this._backgroundUpdateHandler);
    }
  }

  // ── 平台建立 ───────────────────────────────────────────────────────────────
  _createPlatforms() {
    this.platforms      = this.physics.add.staticGroup();
    this.thinPlatforms  = this.physics.add.staticGroup();
    for (const p of this.mapData.platforms) {
      const textureKey = `platform-${p.type || 'grass'}`;
      const group = p.thin ? this.thinPlatforms : this.platforms;
      const sprite = group.create(p.x + p.width / 2, p.y + PLATFORM_HEIGHT / 2, textureKey);
      sprite.setDisplaySize(p.width, PLATFORM_HEIGHT);
      sprite.refreshBody();
      sprite.setDepth(5);
      if (p.isGround) sprite.setAlpha(0);  // 地板用背景自然地板視覺，不疊加紋理
    }
  }

  // ── 怪物生成（依平台隨機分佈）─────────────────────────────────────────────
  _spawnMonsters() {
    if (!this.mapData.monsters || this.mapData.monsters.length === 0) return;

    // 取得所有平台（含地板），按 x 排序
    const allPlats = [...this.mapData.platforms].sort((a, b) => a.x - b.x);
    // 排除寬度太窄的平台
    const validPlats = allPlats.filter(p => p.width >= 80);

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
        const margin = 20;
        const mx = plat.x + margin + Math.random() * Math.max(10, plat.width - margin * 2);
        const monster = new Monster(this, mx, 0, monsterDef);
        this._alignDynamicEntityToPlatformTop(monster, plat.y);
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
      if (!pd.requireBoss && pd.target === 'town' && gs.bossUnlocked && this.mapKey === 'kerning') continue;

      const portal = this.portals.create(pd.x, pd.y, 'portal');
      portal.setDepth(6);
      portal.targetMap = pd.target;
      portal.spawnX   = pd.spawnX;  // 目標地圖的重生位置
      portal.refreshBody();

      this.add.text(pd.x, pd.y - 10, pd.label || '', {
        fontSize: '12px', color: '#ddaaff', fontFamily: 'Arial',
      }).setDepth(7).setOrigin(0.5, 1);

      this.tweens.add({ targets: portal, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
    }
  }

  // ── NPC（含對話互動）─────────────────────────────────────────────────────
  _createNPCs() {
    if (!this.mapData.npcs || this.mapData.npcs.length === 0) return;
    this._npcEntries = [];
    for (const npcDef of this.mapData.npcs) {
      const footY = this._getClosestPlatformTopY(npcDef.x, npcDef.y + 60);
      // NPC 圖片以腳底貼齊平台頂，和玩家/怪物站在同一平面。
      const npc = this.physics.add.staticImage(npcDef.x, footY, npcDef.id || 'npc_new_2');
      npc.setOrigin(0.5, 1);
      npc.setDisplaySize(60, 80);
      npc.setDepth(8);
      npc.refreshBody();
      npc._npcData = npcDef;

      // 名稱標籤
      const lbl = this.add.text(npcDef.x, footY - 86, npcDef.name || '', {
        fontSize: '13px', color: '#ffee88', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 3,
      }).setDepth(9).setOrigin(0.5, 1);

      // 互動提示（靠近時才顯示）
      const hint = this.add.text(npcDef.x, footY - 106, '[按 F 對話]', {
        fontSize: '11px', color: '#aaffaa', fontFamily: 'Arial',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(9).setOrigin(0.5, 1).setAlpha(0);

      npc._hint = hint;
      this._npcEntries.push({ npc, hint, label: lbl, data: npcDef });
    }
  }

  _getClosestPlatformTopY(x, targetY = GROUND_Y) {
    if (!this.mapData?.platforms?.length) return targetY;

    const containingPlatforms = this.mapData.platforms.filter(
      (platform) => x >= platform.x && x <= platform.x + platform.width,
    );
    if (containingPlatforms.length === 0) return targetY;

    let closestY = containingPlatforms[0].y;
    let minDistance = Math.abs(closestY - targetY);

    for (const platform of containingPlatforms) {
      const distance = Math.abs(platform.y - targetY);
      if (distance < minDistance) {
        closestY = platform.y;
        minDistance = distance;
      }
    }

    return closestY;
  }

  _alignDynamicEntityToPlatformTop(entity, platformTopY) {
    if (!entity?.body) return;
    const footOffset = entity.displayHeight * entity.originY - entity.body.offset.y - entity.body.height;
    entity.setY(platformTopY + footOffset);
  }

  _getNearbyNpcData() {
    if (!this.player || !this._npcEntries || this._npcEntries.length === 0) return null;

    let closest = null;
    let minDistance = 80;

    for (const entry of this._npcEntries) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.npc.x, entry.npc.y);
      const visible = d < 80;
      entry.hint.setAlpha(visible ? 1 : 0);
      if (visible && d <= minDistance) {
        closest = entry.data;
        minDistance = d;
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
    bg.destroy(); title.destroy(); msgText.destroy(); close.destroy();
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
      const sceneKey = MAP_SCENE_KEYS[target];
      if (!sceneKey) return;
      const gs = this.registry.get('gameState');
      gs.currentMap = target;
      this.registry.set('gameState', gs);
      this.scene.stop('UIScene');
      this.scene.start(sceneKey, { gameState: gs, spawnX: portal.spawnX });
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
    this._getNearbyNpcData();

    const children = this.monsters.getChildren();
    for (const monster of children) {
      if (monster.active && !monster.isDead) monster.update(this.player, delta);
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

    if (this._backgroundUpdateHandler) {
      this.events.off('update', this._backgroundUpdateHandler);
      this._backgroundUpdateHandler = null;
    }

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

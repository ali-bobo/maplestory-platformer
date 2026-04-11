import Phaser from 'phaser';
import { MAPS } from '../config/maps.js';
import { MONSTERS } from '../config/monsters.js';
import { MAP_SCENE_KEYS, WORLD_HEIGHT } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import { audio } from '../engine/audio.js';

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
  }

  init(data) {
    if (data && data.gameState) {
      this.registry.set('gameState', data.gameState);
    }
    if (data && data.spawnX !== undefined) {
      this._spawnX = data.spawnX;
    } else {
      this._spawnX = null;
    }
  }

  create() {
    this.mapData = MAPS[this.mapKey];
    if (!this.mapData) {
      console.error(`地圖資料未找到: ${this.mapKey}`);
      return;
    }

    const gs = this.registry.get('gameState');
    gs.currentMap = this.mapKey;
    this.registry.set('gameState', gs);

    // 世界邊界
    this.physics.world.setBounds(0, 0, this.mapData.width, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.mapData.width, WORLD_HEIGHT);

    // 背景
    this._createBackground();

    // 平台（分薄/厚）
    this._createPlatforms();

    // 玩家
    const spawnX = this._spawnX !== null ? this._spawnX : (this.mapData.spawnX || 150);
    this.player = new Player(this, spawnX, 620, gs);

    // 相機跟隨
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // 怪物
    this.monsters = this.add.group();
    this.pickups = this.physics.add.group();
    this._spawnMonsters();

    // 傳送門
    this.portals = this.physics.add.staticGroup();
    this._createPortals();

    // NPC
    this._createNPCs();

    // 物理碰撞
    this._setupColliders();

    // UIScene（若尚未啟動則啟動）
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    } else {
      this.scene.wake('UIScene');
    }

    // 音樂
    audio.playBgm(this.mapKey);

    // 監聽怪物死亡
    this.events.on('monster-died', this._onMonsterDied, this);

    // 播放時間追蹤
    this._playTimeAccum = 0;
  }

  _createBackground() {
    const { width } = this.mapData;
    const bgColor = this.mapData.bgColor || 0x87ceeb;

    // 天空
    const sky = this.add.graphics();
    sky.fillStyle(bgColor);
    sky.fillRect(0, 0, width, WORLD_HEIGHT);
    sky.setDepth(-10);
    sky.setScrollFactor(0.0);

    const bgType = this.mapData.bgType || 'forest';

    // 遠景山脈（視差 0.1）
    if (bgType !== 'dungeon' && bgType !== 'boss') {
      for (let i = 0; i < Math.ceil(width / 300) + 2; i++) {
        const mountain = this.add.image(i * 300 + 64, 480, 'bg-mountain');
        mountain.setScrollFactor(0.1).setDepth(-9).setAlpha(0.6);
      }
    }

    // 中景樹木（視差 0.3）
    if (bgType === 'forest' || bgType === 'dark_forest') {
      const treeCount = Math.ceil(width / 120) + 2;
      for (let i = 0; i < treeCount; i++) {
        const tree = this.add.image(i * 120 + 24, WORLD_HEIGHT - 64, 'bg-tree');
        tree.setScrollFactor(0.3).setDepth(-8).setAlpha(0.7);
        if (bgType === 'dark_forest') tree.setTint(0x224422);
      }
    }

    // 雲朵（視差 0.2）
    if (bgType !== 'dungeon' && bgType !== 'boss') {
      for (let i = 0; i < Math.ceil(width / 300) + 2; i++) {
        const cloud = this.add.image(i * 300 + Math.random() * 100, 80 + Math.random() * 100, 'bg-cloud');
        cloud.setScrollFactor(0.2).setDepth(-7).setAlpha(0.8);
      }
    }

    // 地下城/Boss 氛圍
    if (bgType === 'dungeon') {
      const darkOverlay = this.add.graphics();
      darkOverlay.fillStyle(0x000000, 0.5);
      darkOverlay.fillRect(0, 0, width, WORLD_HEIGHT);
      darkOverlay.setDepth(-6).setScrollFactor(0);
    }
    if (bgType === 'boss') {
      const darkOverlay = this.add.graphics();
      darkOverlay.fillStyle(0x110011, 0.7);
      darkOverlay.fillRect(0, 0, width, WORLD_HEIGHT);
      darkOverlay.setDepth(-6).setScrollFactor(0);
    }
  }

  _createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    this.thinPlatforms = this.physics.add.staticGroup();

    const PW = 128, PH = 24;

    for (const p of this.mapData.platforms) {
      const textureKey = `platform-${p.type || 'grass'}`;
      const numTiles = Math.max(1, Math.ceil(p.width / PW));
      const actualW = p.width;

      // 用單塊縮放版取代多塊拼接
      const group = p.thin ? this.thinPlatforms : this.platforms;
      const sprite = group.create(p.x + actualW / 2, p.y + PH / 2, textureKey);
      sprite.setDisplaySize(actualW, PH);
      sprite.refreshBody();
      sprite.setDepth(5);
    }
  }

  _spawnMonsters() {
    if (!this.mapData.monsters || this.mapData.monsters.length === 0) return;

    for (const spawn of this.mapData.monsters) {
      const monsterDef = MONSTERS.find(m => m.id === spawn.id);
      if (!monsterDef) continue;

      const count = spawn.count || 3;
      const spreadX = spawn.spreadX || 2000;
      const offsetX = spawn.offsetX || 200;

      for (let i = 0; i < count; i++) {
        const mx = offsetX + (i / count) * spreadX + (Math.random() - 0.5) * 150;
        const my = WORLD_HEIGHT - 24 - 32 - 5;
        const monster = new Monster(this, mx, my, monsterDef);
        monster.player = this.player;
        this.monsters.add(monster);
      }
    }
  }

  _createPortals() {
    const gs = this.registry.get('gameState');
    for (const portalDef of this.mapData.portals) {
      // 若此傳送門需要 Boss 解鎖
      if (portalDef.requireBoss && !gs.bossUnlocked) continue;
      // Boss 已解鎖時跳過「城鎮」傳送門改顯示「Boss」
      if (!portalDef.requireBoss && portalDef.target === 'town' && gs.bossUnlocked && this.mapKey === 'kerning') continue;

      const portal = this.portals.create(portalDef.x, portalDef.y, 'portal');
      portal.setDepth(6);
      portal.targetMap = portalDef.target;
      portal.refreshBody();

      // 標籤
      this.add.text(portalDef.x, portalDef.y - 10, portalDef.label || '', {
        fontSize: '12px', color: '#ddaaff', fontFamily: 'Arial',
      }).setDepth(7).setOrigin(0.5, 1);

      // 閃爍動畫
      this.tweens.add({
        targets: portal, alpha: 0.5, duration: 800,
        yoyo: true, repeat: -1,
      });
    }
  }

  _createNPCs() {
    if (!this.mapData.npcs || this.mapData.npcs.length === 0) return;
    for (const npcDef of this.mapData.npcs) {
      const npc = this.add.image(npcDef.x, npcDef.y + 24, npcDef.id || 'npc-shop');
      npc.setDepth(8);
      // 名稱
      this.add.text(npcDef.x, npcDef.y - 14, npcDef.name || '', {
        fontSize: '13px', color: '#ffee88', fontFamily: 'Arial',
        stroke: '#000000', strokeThickness: 3,
      }).setDepth(9).setOrigin(0.5, 1);
    }
  }

  _setupColliders() {
    // 玩家 + 厚平台
    this.physics.add.collider(this.player, this.platforms);

    // 玩家 + 薄平台（可穿越）
    this.physics.add.collider(this.player, this.thinPlatforms, null, (player, plat) => {
      if (player.dropThrough) return false;
      // 只有玩家從上方落下時碰撞
      return player.body.velocity.y >= 0 && player.body.bottom <= plat.body.top + 12;
    }, this);

    // 怪物 + 厚平台
    this.physics.add.collider(this.monsters, this.platforms);
    this.physics.add.collider(this.monsters, this.thinPlatforms);

    // 玩家 + 傳送門
    this.physics.add.overlap(this.player, this.portals, this._onPortalEnter, null, this);

    // 玩家 + 拾取物
    this.physics.add.overlap(this.player, this.pickups, this._onPickup, null, this);

    // 拾取物 + 平台
    this.physics.add.collider(this.pickups, this.platforms);
    this.physics.add.collider(this.pickups, this.thinPlatforms);
  }

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
      gs.spawnX = target === this.mapKey ? 150 : 150;
      this.registry.set('gameState', gs);
      this.scene.stop('UIScene');
      this.scene.start(sceneKey, { gameState: gs });
    });
  }

  _onPickup(player, pickup) {
    if (!pickup.active) return;
    const type = pickup.pickupType;
    const data = pickup.pickupData;
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

    // Boss 解鎖
    if (gs.killCount >= 60 && !gs.bossUnlocked) {
      gs.bossUnlocked = true;
      this.registry.set('gameState', gs);
    }
  }

  update(time, delta) {
    if (!this.player || this.player.isDead) return;
    this.player.update(delta);
    this.player.recoverMp(delta);

    // 更新怪物 AI
    const children = this.monsters.getChildren();
    for (const monster of children) {
      if (monster.active && !monster.isDead) {
        monster.update(this.player, delta);
      }
    }

    // 播放時間累計
    this._playTimeAccum = (this._playTimeAccum || 0) + delta;
    if (this._playTimeAccum > 1000) {
      const gs = this.registry.get('gameState');
      gs.playTime = (gs.playTime || 0) + 1;
      this.registry.set('gameState', gs);
      this._playTimeAccum = 0;
    }
  }
}

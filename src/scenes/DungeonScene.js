// 副本場景（Phase 14 MVP）
//
// 繼承 BaseMapScene 復用平台/物理/相機/HUD，覆寫怪物生成為「波狀關」邏輯。
// 流程：進入 → 倒數開始 → 第 1 波生成 → 清光自動觸發下波 →
//      完成最後一波 = 勝利；倒數到 0 或玩家死亡 = 失敗 →
//      結算 popup（在 UIScene） → 回 town

import { BaseMapScene } from './BaseMapScene.js';
import { Monster } from '../entities/Monster.js';
import { MONSTERS } from '../config/monsters.js';
import { getDungeonDef } from '../config/dungeons.js';
import { WORLD_HEIGHT } from '../config/constants.js';
import { recordDungeonEntry } from '../engine/dungeonRecord.js';

const GROUND_Y = WORLD_HEIGHT;

export class DungeonScene extends BaseMapScene {
  constructor() {
    // BaseMapScene constructor 簽名是 (key, mapKey)——必須用位置參數，不能用 { key: ... } object
    super('DungeonScene', 'dungeon');
  }

  init(data) {
    // 必先呼叫 super.init(data) 讓 BaseMapScene.init 處理 gameState 寫 registry
    // 並把 this._spawnX 設為 null（不是 undefined），避免 BaseMapScene.create
    // line 106 的 `this._spawnX !== null` 判斷錯走分支
    super.init(data);
    this.dungeonId = data?.dungeonId || 'slime_cave';
    this._dungeonDef = getDungeonDef(this.dungeonId);
    this._currentWave = -1;       // 尚未開始
    this._dungeonResult = null;   // 'victory' / 'defeat'
    this._timeRemaining = this._dungeonDef?.timeLimit || 180;
    this._waveTransitioning = false;
  }

  create() {
    if (!this._dungeonDef) {
      console.error(`[Dungeon] 找不到副本: ${this.dungeonId}`);
      this.scene.start('TownScene');
      return;
    }

    // 動態構建 mapData（不從 maps.js 讀，因為副本是程式生成）
    this.mapData = this._buildDungeonMapData();
    // BaseMapScene 標準流程（背景/平台/玩家/相機/UIScene）
    super.create();
    // 記錄本次進入到 localStorage
    recordDungeonEntry(this.dungeonId);
    // 通知 UIScene 啟動副本 HUD
    this.registry.events.emit('dungeon-start', { def: this._dungeonDef });
    // 1 秒後啟動第一波 + 倒數
    this.time.delayedCall(1000, () => {
      if (!this.scene.isActive(this.scene.key)) return;
      this._startWave(0);
      this._startTimer();
    });
  }

  // 構建副本專用 mapData：簡單佈局（地板 + 3 浮空平台）+ 空 portals/npcs
  _buildDungeonMapData() {
    const def = this._dungeonDef;
    const w = def.mapWidth || 1600;
    return {
      key: 'dungeon',
      name: def.name,
      sceneKey: 'DungeonScene',
      width: w,
      bgColor: def.bgColor || 0x2a1a3a,
      bgImage: def.bgImage,
      bgType: 'sky',
      platforms: [
        // 地板（isGround:true 會被 BaseMapScene 設為透明、只保留碰撞）
        { x: 0, y: GROUND_Y, width: w, type: 'stone', thin: false, isGround: true },
        // 左浮空平台
        { x: 240, y: GROUND_Y - 140, width: 200, type: 'stone', thin: true },
        // 右浮空平台
        { x: w - 440, y: GROUND_Y - 140, width: 200, type: 'stone', thin: true },
        // 中間高平台
        { x: w / 2 - 100, y: GROUND_Y - 240, width: 200, type: 'stone', thin: true },
      ],
      monsters: [],      // 由 _startWave 動態生成，不走 BaseMapScene._spawnMonsters
      portals: [],       // 副本內無傳送門（出口由結算 popup 處理）
      npcs: [],          // 副本內無 NPC
      spawnX: 100,       // 玩家從左側出生
    };
  }

  // 覆寫 BaseMapScene._spawnMonsters：副本不從 mapData.monsters 讀
  _spawnMonsters() {
    // 故意留空，怪物由 _startWave 控制
  }

  // 啟動指定 wave（idx 從 0 開始）
  _startWave(idx) {
    const def = this._dungeonDef;
    if (!def?.waves || idx >= def.waves.length) {
      this._victory();
      return;
    }
    this._currentWave = idx;
    this._waveTransitioning = false;
    const wave = def.waves[idx];
    this._spawnWaveMonsters(wave);
    this.registry.events.emit('dungeon-wave', { current: idx + 1, total: def.waves.length });
  }

  // 生成這一波的怪物，分布在三個浮空平台 + 地板上
  _spawnWaveMonsters(wave) {
    const validPlats = this.mapData.platforms.filter((p) => p.width >= 80);
    let platIdx = 0;
    for (const spawn of wave.monsters || []) {
      const monsterDef = MONSTERS.find((m) => m.id === spawn.id);
      if (!monsterDef) { console.warn(`[Dungeon] 找不到怪物: ${spawn.id}`); continue; }
      for (let i = 0; i < (spawn.count || 1); i++) {
        const plat = validPlats[platIdx % validPlats.length];
        platIdx++;
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

  // 副本倒數計時器
  _startTimer() {
    this._dungeonTimer = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this._dungeonResult) return;
        this._timeRemaining--;
        this.registry.events.emit('dungeon-tick', { remaining: this._timeRemaining });
        if (this._timeRemaining <= 0) {
          this._defeat('timeout');
        }
      },
    });
  }

  // 覆寫 update：在原本 update 上加「波次結束偵測」
  update(time, delta) {
    super.update(time, delta);
    if (this._dungeonResult) return;
    // 玩家死亡 → 失敗
    if (this.player?.isDead) {
      this._defeat('death');
      return;
    }
    // 偵測本波清光
    if (this._currentWave >= 0 && !this._waveTransitioning) {
      const alive = this.monsters.getChildren().filter((m) => m.active && !m.isDead).length;
      if (alive === 0) {
        this._waveTransitioning = true;
        const nextIdx = this._currentWave + 1;
        this.time.delayedCall(1000, () => {
          if (this._dungeonResult) return;
          this._startWave(nextIdx);
        });
      }
    }
  }

  _victory() {
    if (this._dungeonResult) return;
    this._dungeonResult = 'victory';
    if (this._dungeonTimer) this._dungeonTimer.remove();
    const def = this._dungeonDef;
    const bonusExp = this._timeRemaining * (def.timeBonus || 0);
    const totalExp = (def.rewards?.exp || 0) + bonusExp;
    const totalMeso = def.rewards?.meso || 0;
    // 發獎勵
    this._grantRewards(totalExp, totalMeso);
    // 通知 UIScene 顯示結算
    this.registry.events.emit('dungeon-end', {
      victory: true, def,
      baseExp: def.rewards?.exp || 0,
      bonusExp, meso: totalMeso,
      timeRemaining: this._timeRemaining,
    });
  }

  _defeat(reason) {
    if (this._dungeonResult) return;
    this._dungeonResult = 'defeat';
    if (this._dungeonTimer) this._dungeonTimer.remove();
    const def = this._dungeonDef;
    const fail = def.failRewards || { exp: 0, meso: 0 };
    this._grantRewards(fail.exp, fail.meso);
    this.registry.events.emit('dungeon-end', {
      victory: false, def, reason,
      baseExp: fail.exp, bonusExp: 0, meso: fail.meso,
      timeRemaining: this._timeRemaining,
    });
  }

  _grantRewards(exp, meso) {
    const gs = this.registry.get('gameState');
    if (!gs) return;
    if (exp > 0) this.player?.gainExp?.(exp);
    if (meso > 0) {
      gs.meso = (gs.meso || 0) + meso;
      this.registry.set('gameState', gs);
      this.registry.events.emit('changedata-meso', null, gs.meso);
    }
  }

  // 結算後玩家按確認 → 回 town（UIScene 透過 registry 觸發）
  exitDungeon() {
    // 玩家狀態已經保存在 registry，直接切回 town
    this.scene.stop('UIScene');
    this.scene.start('TownScene', { spawnX: 200 });
  }
}

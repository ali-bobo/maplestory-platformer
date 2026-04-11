---
name: phaser-game-dev
description: |
  Use when: 需要開發、修改、除錯本 Phaser 3 楓之谷風格遊戲的任何功能。
  觸發詞：「新增技能」「修改地圖」「新增怪物」「修改 Boss」「修改 HUD」
           「新增音效」「修改裝備」「新增地圖」「修改視覺效果」「遊戲 bug」
  能力：理解遊戲架構、Phaser 3 最佳實踐、遊戲設計規格、程式碼規範。
  NOT for: 非遊戲相關的 Node.js / 後端任務。
argument-hint: "[功能描述或 bug 說明]"
---

# Phaser 3 楓之谷遊戲開發技能指南

## 專案概覽

**技術棧**：Phaser 3.88 + ES Modules + esbuild  
**遊戲類型**：楓之谷風格 2D 橫版平台遊戲  
**主角**：盜賊（Thief）—— 5 個技能（Z/X/C/V/B）  
**規格書**：`GAME_SPEC.md`（設計意圖，必須遵守）  
**禁止規則**：`ai-guardrails.md`  

---

## 架構一覽

```
src/
  main.js                — Phaser.Game 入口，Scene 清單
  config/
    constants.js         — 全域常數（尺寸、物理、技能數值）
    monsters.js          — 怪物定義（HP/ATK/EXP/速度/掉落）
    equipment.js         — 裝備定義（部位/屬性/稀有度）
    maps.js              — 地圖清單（平台座標/怪物組合/背景設定）
  assets/
    ProceduralAssets.js  — 程式生成所有材質（Canvas → Phaser texture）
  engine/
    particles.js         — ParticleManager（封裝 Phaser 粒子）
    audio.js             — AudioSynth（Web Audio API 音效）
  entities/
    Player.js            — 玩家精靈（Arcade Physics）
    Monster.js           — 怪物基礎類（AI 狀態機）
    Boss.js              — Boss（繼承 Monster，三段模式）
    Skill.js             — 技能投射物/AoE 效果
  scenes/
    BootScene.js         — 載入材質（最先執行）
    MenuScene.js         — 標題畫面
    BaseMapScene.js      — 地圖場景基礎類
    MapleIslandScene.js  — 楓之島（教學）
    HenesysScene.js      — 弓箭手獵場
    ElliniaScene.js      — 法師森林
    PerionScene.js       — 劍士荒原
    KerningScene.js      — 盜賊地下城
    TownScene.js         — 城鎮（無戰鬥）
    BossScene.js         — 暗影魔君 Boss 房
    UIScene.js           — HUD 覆蓋層（parallel scene）
    GameOverScene.js     — 死亡/勝利結算
  ui/
    hud.js               — HP/MP/EXP 條、技能欄
    menu.js              — 商店、裝備欄 UI
```

---

## Phaser 3 核心規範

### 1. 場景（Scene）規範

每個地圖繼承 `BaseMapScene`：

```javascript
import { BaseMapScene } from './BaseMapScene';

export class HenesysScene extends BaseMapScene {
  constructor() {
    super({ key: 'HenesysScene' });
    this.mapKey = 'henesys';  // 對應 MAPS config
  }
  // 覆蓋 createBackground() 和 createPlatforms() 即可
}
```

HUD 作為 **parallel scene** 運行：

```javascript
// 在 BaseMapScene 的 create() 中
this.scene.launch('UIScene', { gameScene: this });
```

### 2. Player 規範

Player 繼承 `Phaser.Physics.Arcade.Sprite`：

```javascript
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, gameState) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.gameState = gameState;  // 共用遊戲狀態（跨 scene）
    this.body.setCollideWorldBounds(true);
    this.body.setGravityY(800);
    // ...
  }
}
```

**重要**：玩家狀態（level, hp, mp, equipment 等）存於獨立的 `gameState` 物件，
切換地圖時 `gameState` 保持不變。

### 3. 材質生成規範

**所有材質**必須在 `BootScene` 的 `create()` 中用 `ProceduralAssets` 生成：

```javascript
// src/assets/ProceduralAssets.js
export function generateTextures(scene) {
  // 使用 scene.add.graphics() 繪製後 .generateTexture(key, w, h)
  const gfx = scene.add.graphics();
  
  // 草地平台
  gfx.fillStyle(0x5C8A3C);
  gfx.fillRect(0, 0, 128, 24);
  gfx.fillStyle(0x8B6914);
  gfx.fillRect(0, 5, 128, 19);
  gfx.generateTexture('platform-grass', 128, 24);
  gfx.clear();
  
  // ... 其他材質
  gfx.destroy();
}
```

**禁止**：不使用外部圖片檔案（.png/.jpg/.svg）。

### 4. 粒子效果規範

使用 Phaser 的 ParticleEmitter：

```javascript
// 怪物死亡粒子
scene.add.particles(x, y, 'particle-dot', {
  speed: { min: 100, max: 300 },
  scale: { start: 1, end: 0 },
  lifespan: 600,
  quantity: 12,
  emitting: false
}).explode(12);
```

### 5. 地圖平台規範

使用 `StaticGroup`，平台數據來自 `src/config/maps.js`：

```javascript
createPlatforms(mapConfig) {
  this.platforms = this.physics.add.staticGroup();
  mapConfig.platforms.forEach(p => {
    // p = { x, y, width, type: 'grass'|'stone'|'brick', thin: bool }
    const tile = this.platforms.create(p.x, p.y, `platform-${p.type}`);
    tile.setScale(p.width / 128, 1).refreshBody();
    if (p.thin) tile.setData('thin', true);  // 可穿透薄平台
  });
}
```

### 6. 技能系統規範

技能定義在 `src/config/constants.js`，由 `Player.castSkill(key)` 呼叫：

| 鍵 | 技能    | 解鎖 | CD（秒） | MP 消耗 |
|---|---------|-----|---------|--------|
| Z | 三連飛鏢 | Lv1 | 0.5     | 10     |
| X | 暗影步伐 | Lv5 | 3       | 30     |
| C | 暗殺    | Lv10| 5       | 50     |
| V | 暗影漩渦 | Lv15| 8       | 70     |
| B | 影分身  | Lv20| 15      | 100    |

### 7. 傷害計算規範

```javascript
// 玩家 → 怪物（Player.js 或 Skill.js 中）
function calcDamage(player, monster, skillMultiplier = 1) {
  const raw = player.atk * skillMultiplier * (0.9 + Math.random() * 0.2);
  const isCrit = Math.random() < player.critRate;
  const damage = Math.floor(raw * (isCrit ? player.critMulti : 1));
  // 等級差調整
  const lvRatio = Math.min(Math.max(player.level / monster.level, 0.3), 3.0);
  return { damage: Math.floor(damage * lvRatio), isCrit };
}
```

### 8. 地圖切換規範

```javascript
// 在 BaseMapScene 中切換地圖
changeMap(nextSceneKey) {
  // 保存玩家狀態
  this.registry.set('gameState', this.gameState);
  // 停止 UIScene 後切換
  this.scene.stop('UIScene');
  this.scene.start(nextSceneKey);
}
```

### 9. GameState（跨場景狀態）規範

遊戲狀態存於 `scene.registry`，格式如下：

```javascript
const defaultGameState = {
  // 玩家基礎
  level: 1, exp: 0, hp: 400, maxHp: 400,
  mp: 250, maxMp: 250, atk: 70,
  critRate: 0.2, critMulti: 1.8,
  meso: 0, killCount: 0, playTime: 0,
  // 裝備
  equipment: { weapon: null, armor: null, gloves: null, helmet: null, boots: null },
  // 技能冷卻（ms，0 = 可用）
  skillCooldowns: { Z: 0, X: 0, C: 0, V: 0, B: 0 },
  // 目前地圖
  currentMap: 'maple',
};
```

---

## 常見任務步驟

### 新增一個怪物

1. 在 `src/config/monsters.js` 加入定義
2. 在對應地圖的 `maps.js` 加入怪物出現區域
3. 在 `src/assets/ProceduralAssets.js` 加入材質生成
4. 在 `src/entities/Monster.js` 確認行為類型已支援

### 新增一個地圖

1. 在 `src/config/maps.js` 加入地圖定義（平台、怪物、背景）
2. 建立 `src/scenes/NewMapScene.js`，繼承 `BaseMapScene`
3. 在 `src/main.js` 的 scene 清單加入新場景
4. 在 `ProceduralAssets.js` 加入地圖專屬背景材質

### 修改技能視覺效果

1. 找到 `src/entities/Skill.js` 的對應技能方法
2. 確保使用 Phaser API（不用 raw canvas）
3. 視覺規格參考 `GAME_SPEC.md` → `[VISUAL_STYLE]` 章節

---

## 品質檢查清單

修改完成後必須確認：
- [ ] `npm run build` 無錯誤
- [ ] 無 console.error（F12 開發者工具）
- [ ] FPS ≥ 55（Phaser 的 `game.loop.actualFps`）
- [ ] 粒子上限 ≤ 250 個同時存在
- [ ] 技能冷卻正確顯示於 HUD
- [ ] 地圖切換後玩家狀態保持

---

## 禁止事項（重申）

- ❌ 不混用 raw `canvas.getContext('2d')` 和 Phaser API
- ❌ 不使用外部圖片/音效 URL（含 CDN）
- ❌ 不直接操作 DOM（除了 `#game-container`）
- ❌ 不修改 `dist/bundle.js`（由 build 腳本產生）

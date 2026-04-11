# Iteration 5 實作規格書
# 基於現況差距分析（GAME_SPEC.md vs 實際程式碼）
# 日期：2026-04-11

---

## 一、差距分析總表

### 🔴 嚴重缺陷（會造成遊戲無法正常運作）

| # | 問題位置 | 描述 | 影響 | 狀態 |
|---|---------|------|------|------|
| C1 | `Boss.js:18` | `spriteKey: 'monster-boss'` 但 `dist/assets/` 無此圖片 | Boss 渲染失敗 | ✅ ProceduralAssets.js 程序生成 |
| C2 | `BossScene.js:48` | MONSTERS 中無 `id: 'shadow-slime'` | Phase 2 召喚援軍靜默失敗 | ✅ monsters.js 新增 + Monster.js tint 支援 |
| C3 | `BossScene.js:11` | `mapKey: 'boss'` 但 `src/config/maps.js` 無 boss 地圖定義 | BossScene create() 中 MAPS['boss'] = undefined，整個 Boss 場景可能崩潰 | ✅ maps.js 新增 boss 地圖 + BOSS_PLATFORMS |
| C4 | `Monster.js:167` | 掉落物 `delayedCall(8000, ...)` —規格要求 30 秒 | 裝備掉落 8 秒即消失（使用者沒時間撿） | ✅ 改為 30000ms |
| C5 | `Player.js:278-285` | `recoverMp` 有實作但 **HP 自動回復缺失**（規格：每秒 +5 HP） | 玩家 HP 無法自動回復 | ✅ Player.recoverHp() 實作 + BaseMapScene 呼叫 |
| C6 | `constants.js:30-33` | `MAP_ORDER` 無 boss，`MAP_SCENE_KEYS` 無 boss | Boss 傳送門傳送邏輯缺 key mapping | ✅ MAP_SCENE_KEYS 加 boss: 'BossScene' |

---

### 🟡 重要功能缺失（功能已有架構但未完成）

| # | 項目 | GAME_SPEC 對應 | 目前狀態 |
|---|------|--------------|---------|
| F1 | ESC 暫停選單（裝備欄） | SELF_CHECK #22 | 無暫停選單，ESC 只關閉 NPC 對話 |
| F2 | HUD 裝備 5 格圖示 | UI 規格 左下角裝備圖示 | ✅ UIScene 左下角裝備欄 5 格已實作 |
| F3 | 目標選取框（紅色虛線） | SELF_CHECK #28 / 怪物規格 | 完全未實作 |
| F4 | Boss 解鎖門（kerning 地圖右側） | MAP_SYSTEM 地圖切換機制 | ✅ BaseMapScene._onMonsterDied() 已加 killCount 檢查，30 級後仍有效 |
| F5 | 傷害數字完整色彩 | DAMAGE_SYSTEM | ✅ 白/金/橘（大暴擊）三色分級；DoT/治療留待後期 |
| F6 | LEVEL UP 全屏演出 | Player._onLevelUp | 仍只有 UIScene 文字動畫，無粒子全屏效果 |
| F7 | 玩家角色動作姿勢 | VISUAL_STYLE 角色動作狀態 | 只有一張 thief.png，無走路/跳躍/攻擊姿勢差異 |
| F8 | Phase 3 狂暴視覺 | BOSS Phase 3 | `Boss.js` 有邏輯但無全身紫色光芒效果 |
| F9 | Boss 勝利→傳到 GameOverScene | BossScene._onBossDefeated | ✅ 已確認 Boss.die() override 正確 emit 'boss-defeated'（誤報，非 Bug） |

### 🔴 新發現 Bug（Phase 5A 之後）

| # | 問題位置 | 描述 | 影響 | 狀態 |
|---|---------|------|------|------|
| B1 | `UIScene.js:119` | mapNames 物件缺少 sky/ruins 鍵值，沿用舊地圖名 | 右上角地圖名稱顯示空白 | 🔧 修復中 |
| B2 | `BossScene.js:81-86` | `super.update()` 已迭代 monsters 群組（含 Boss），BossScene 又額外呼叫 `this._boss.update()` | Boss 冷卻 2x 加速、speed 加倍、攻擊頻率翻倍 | 🔧 修復中 |
| B3 | `BaseMapScene.js:164` | 傳送門雙向已修，但舊版 `bossUnlocked` 的 town 門邏輯殘留死碼 | 無 crash 但邏輯混亂 | ⬜ 低優先，可後期清理 |

---

### 🟢 尚未實作的加值功能（規格有列但選擇性實作）

| # | 項目 | 備註 |
|---|------|------|
| A1 | TownScene / Victoria Port 商店 | 檔案存在但未接入遊戲流程 |
| A2 | 藥水購買/掉落系統 | equipment.js 有裝備，無藥水 |
| A3 | 技能施放角色傾角動畫 | `_attackAnimTimer` 有設，但 `_updateTexture` 中未使用 |
| A4 | 怪物目標 HP 條：橘色閃爍受傷提示 | 目前只有綠→橘→紅色 ratio |
| A5 | 視差背景：天空/建築多層次 | 目前只有單張 tileSprite，無多層 |
| A6 | 技能 C 暗殺：瞬移+鳥形剪影+放射能量線 | Skill.js 現有效果較簡化 |
| A7 | 技能 V 暗影漩渦：地面魔法陣符文 | 現有效果較簡化 |
| A8 | 魔法陣通用效果（強力技能/Boss 預警） | 規格有完整描述，未實作 |
| A9 | localStorage 存檔/讀檔 | 規格有定義 key 格式，未實作 |

---

## 二、素材（圖片）缺口分析

### 🔴 必要缺失圖片

| 檔案 | 用途 | 目前狀況 |
|-----|------|---------|
| `dist/assets/monster_boss.png` | Boss `spriteKey: 'monster-boss'`（注意：程式碼用連字號，assets 用底線） | **完全缺失**，Boss 場景 spawn 會丟 Phaser 警告，顯示為白底問號 |
| `dist/assets/bg_boss.png` | Boss 房間背景（黑紫漸層）| 缺失，BossScene 用 MAPS['boss'] 但 maps.js 無 boss 地圖 |

### 🟡 可用程式替代的圖片

| 需求 | 建議方式 |
|-----|---------|
| Boss 外觀 | **ProceduralAssets.js 生成暗影人形**：黑紫身體 + 兩顆紅眼 + 披風，以 Canvas 繪製並用 `textures.addCanvas` 注入 Phaser |
| Boss 房背景 | **程式生成**：黑紫漸層 + 地面能量裂縫 + 旋轉六芒星符文，完全符合規格的「暗影領域」 |
| shadow-slime 援軍 | **現有 monster_slime 加紫色 tint**：不需新圖，程式 setTint(0x9B30FF) |
| 裝備 5 格圖示 | **已有 ProceduralAssets** 生成各部位圖示（weapon/armor/gloves/helmet/boots） |

### 🟢 如果想升級美術品質才需要的圖片

| 圖片 | 說明 |
|-----|------|
| `thief_walk.png` / `thief_jump.png` / `thief_attack.png` | 角色動作 Spritesheet（或 3 個獨立 PNG）。**目前可用 `setAngle` / `setScale` 等 Phaser tween 模擬**，不需要新圖片。 |
| `item_potion_red.png` / `item_potion_blue.png` | 藥水掉落物。**可程序生成**（圓瓶 + 顏色）。 |
| 怪物 idle 動畫（sprite sheet） | 非必要，目前單張圖 + tween 效果已夠用 |

---

## 三、實作計畫拆解（按優先順序）

---

### Phase 5A：緊急 Bug 修復（1~2小時，4個檔案以內）

**目標**：讓 Boss 場景能正常進入和遊玩

#### Task 5A-1：修復 Boss 地圖定義
- **檔案**：`src/config/maps.js`
- **內容**：新增 `boss` 地圖到 MAPS 物件
  ```js
  boss: {
    key: 'boss', name: '暗影領域', width: 1280,
    bgColor: 0x0D0018, bgImage: null,   // 程式生成背景
    platforms: [ /* 簡單 3 層平台 */ ],
    thinPlatforms: [], monsters: [], npcs: [], spawnX: 200,
    nextMap: null
  }
  ```

#### Task 5A-2：生成 Boss 程式材質
- **檔案**：`src/assets/ProceduralAssets.js`
- **內容**：新增 `generateBoss()` 方法
  - 128×128 Canvas：黑紫披風人形 + 紅眼 + 能量光環
  - 用 `scene.textures.addCanvas('monster-boss', canvas)` 注入
  - 在 BootScene `create()` 呼叫

#### Task 5A-3：修復 BossScene 事件名稱
- **檔案**：`src/entities/Boss.js`
- **問題**：`Monster.die()` 發出 `monster-died`，但 `BossScene` 監聽 `boss-defeated`
- **修法**：`Boss.die()` override，額外 `emit('boss-defeated')`

#### Task 5A-4：修復掉落物消失時間
- **檔案**：`src/entities/Monster.js:167`
- `delayedCall(8000,...)` → `delayedCall(30000,...)`

#### Task 5A-5：新增 shadow-slime 定義 + 修正 spriteKey
- **檔案**：`src/config/monsters.js`
- 新增 `{ id: 'shadow-slime', ..., spriteKey: 'monster_slime', area: 'boss' }`（用現有 slime 圖加紫色 tint）
- **檔案**：`src/scenes/BossScene.js`
- BossScene 在 minion spawn 後加 `.setTint(0x9B30FF)`

#### Task 5A-6：更新 MAP_SCENE_KEYS + MAP_ORDER
- **檔案**：`src/config/constants.js`
- `MAP_SCENE_KEYS` 加 `boss: 'BossScene'`
- `MAP_ORDER` 加 `'boss'`（實際上 boss 透過 event 觸發，不在線性順序中）

---

### Phase 5B：HP 回復 + Boss 解鎖邏輯修正（0.5~1小時）

#### Task 5B-1：HP 自動回復
- **檔案**：`src/scenes/BaseMapScene.js`（`update` 方法）
- 在 BaseMapScene.update 中呼叫 `player.recoverHp(delta)`
- **檔案**：`src/entities/Player.js`
- 新增 `recoverHp(delta)` 方法（仿照 recoverMp，每秒 +5 HP）

#### Task 5B-2：Boss 解鎖機制改到 BaseMapScene
- **問題**：Boss 解鎖目前在 `_onLevelUp` 中，但 30 級玩家不再升等 → 無法觸發
- **修法**：`BaseMapScene._onMonsterDied()` 裡補充 killCount 達 60 的 Boss 解鎖檢查
- 同時在 KerningScene（或 BaseMapScene）右端生成 Boss 傳送門

---

### Phase 5C：HUD 完整化（2~3小時）

#### Task 5C-1：ESC 暫停選單 + 裝備欄
- **檔案**：`src/scenes/UIScene.js`
- 新增 `_setupPauseMenu()` 方法
- ESC 切換半透明黑底覆蓋層 + 5 格裝備圖示 + 操作說明文字
- 已有 gameState.equipment，直接讀取各部位名稱渲染

#### Task 5C-2：HUD 左下角裝備 5 格
- **檔案**：`src/scenes/UIScene.js`
- 在左下角渲染 5 個 52×52 格子
- 有裝備時顯示對應圖示（ProceduralAssets 生成）+ 稀有度邊框色

#### Task 5C-3：傷害數字完整色彩
- **檔案**：`src/entities/Monster.js._showDamageNumber()`
- 加入參數 `type: 'normal' | 'crit' | 'boss' | 'heal' | 'dot'`
- 對應顏色：白/金/橘紅/綠/紫
- Boss 傷害在 `Boss.takeDamage()` 中傳入 `type: 'boss'`

#### Task 5C-4：目標選取框
- **檔案**：`src/scenes/BaseMapScene.js`
- 維護 `this._targetMonster`：玩家攻擊到的最後一隻怪物
- 在 update 用 Graphics 繪製紅色 `setLineDash([4,4])` 虛線框
- 每 0.4s 切換 visible

---

### Phase 5D：視覺動效提升（2~4小時，選擇性）

#### Task 5D-1：玩家角色動作感
- **方式**：不需要新圖，用 Phaser tween/transform 模擬
  - 走路：`setAngle(±5)` sin 波浮動
  - 跳躍：`setAngle(-15)`, scaleX 略拉伸
  - 攻擊後搖：`setAngle(10)` → 恢復（已有 `_attackAnimTimer`，只需用上）
- **檔案**：`src/entities/Player.js._updateTexture()`

#### Task 5D-2：LEVEL UP 大字演出
- **檔案**：`src/engine/particles.js`
- `spawnLevelUp()` 加入黃金大字「LEVEL UP！」fadeIn+scale+fadeOut
- 配合現有粒子噴射

#### Task 5D-3：技能 C 暗殺視效升級
- **檔案**：`src/entities/Skill.js`
- 按規格加入：黑鳥剪影輪廓 + 12~16 條放射能量線 + 白色 glow

#### Task 5D-4：技能 V 暗影漩渦：地面魔法陣
- **檔案**：`src/entities/Skill.js`
- 按規格加入旋轉幾何圓陣（外環 + 放射線 + 六角符文）

#### Task 5D-5：Boss Phase 3 狂暴視覺
- **檔案**：`src/entities/Boss.js`
- Phase 3 時：Boss 持續 `setTint(0xaa00ff)` + 周期脈衝 glow

---

### Phase 5E：加值功能（選擇性，預計 4~8小時）

| Task | 說明 | 檔案 |
|------|------|------|
| 5E-1 | TownScene 商店 NPC 接入遊戲流程 | main.js 流程、BaseMapScene |
| 5E-2 | 藥水掉落 + 撿取 + 使用 | Monster.js, Player.js, equipment.js |
| 5E-3 | localStorage 存檔/讀檔 | BootScene, GameOverScene, 新建 save.js |
| 5E-4 | 視差多層背景（2~3層） | BaseMapScene._createBackground() |
| 5E-5 | 怪物受傷橘色閃爍血條 | Monster._updateHpBar() |

---

## 四、圖片生產能力評估

### Claude 是否能「生成」圖片？

**直接回答：不行。** Claude 無法輸出 PNG/JPG 二進位圖檔。

但以下方式**完全可行**且品質足夠：

#### ✅ 方法1：ProceduralAssets.js Canvas 程式生成（推薦）
現有架構已支援此模式（平台、技能特效、粒子皆用 Canvas 生成並注入 Phaser 材質）。
可新增：
- `generateBoss()` — 暗影魔君（黑紫人形，128×128）
- `generateBossBackground()` — 暗影領域背景（黑紫漸層＋符文）
- `generatePotion(color)` — 紅/藍藥水圖示（32×32）
- `generateEquipmentIcon(slot, rarity)` — 裝備圖示（已有框架可擴充）

**優點**：零外部依賴、輕量、可動（旋轉符文等）
**缺點**：幾何風格，無法達到 thief.png / monster_xxx.png 的像素畫水準

#### ✅ 方法2：你提供圖片，Claude 接入
只需把 PNG 放入 `dist/assets/`，Claude 負責：
1. 在 `BootScene.preload()` 加 `this.load.image('key', 'dist/assets/xxx.png')`
2. 在對應程式碼中替換 `textureKey`

#### 🔍 你需要哪些圖片？

| 圖片 | 是否必要 | 建議 |
|-----|---------|------|
| `monster_boss.png`（Boss 外觀） | **必要** | 先用程式生成，之後換實體圖 |
| `bg_boss.png`（Boss 房背景） | 選擇性 | 完全可程式生成黑紫+符文效果 |
| 角色動作 spritesheet | 選擇性 | 程式 tween 效果已夠用 |
| 藥水圖示 | 選擇性 | 程式生成 32×32 圓瓶 |
| 怪物影子/援軍 | 不需要 | 現有 slime.png + tint 即可 |
| 技能特效（飛鏢/衝刺） | 不需要 | 已程式生成 |

**結論**：目前缺口只需要 Boss 相關材質（可程式補齊），其餘美術升級為選擇性。

---

## 五、實作優先順序建議

```
立即做（會影響遊戲完整性）：
  5A（全部）- Bug 修復，讓 Boss 場景可進入
  5B-1      - HP 自動回復
  5B-2      - Boss 解鎖機制修正

第二批（體驗完整度）：
  5C-1      - ESC 暫停 + 裝備欄
  5C-2      - HUD 裝備格
  5C-3      - 傷害數字色彩

第三批（視覺提升）：
  5D-1      - 玩家動作感
  5D-2      - LEVEL UP 演出
  5D-3/D4   - 技能視效升級

日後有空再做：
  5E（全部）
```

---

## 六、已確認正常運作的功能（不需動）

- ✅ Player 移動（左右/跳躍/二段跳/下穿）
- ✅ 技能 Z/X/C/V/B 傷害邏輯
- ✅ 怪物 AI：巡邏/追擊/遠程
- ✅ 怪物 HP 條（綠→橘→紅）+ 傷害飄字
- ✅ EXP 系統 + 升等屬性提升 + 技能解鎖
- ✅ 裝備掉落 + 自動換裝判定
- ✅ 三張背景圖（tileSprite + 視差）
- ✅ 12 種怪物圖片渲染
- ✅ BGM 系統（audio.js Web Audio API）
- ✅ 粒子系統（死亡/升級）
- ✅ 地圖切換（sky→ruins→kerning，雙向）
- ✅ UIScene HP/MP/EXP 條 + 技能快捷列 + 冷卻顯示
- ✅ GameOverScene（死亡結算）
- ✅ Boss 場景（BossScene + Boss.js 3 階段）
- ✅ 傳送門雙向通行 + spawnX 修正（不再回到地圖起點）
- ✅ HP 自動回復（每秒 +5）
- ✅ 掉落物 30 秒後消失
- ✅ Boss killCount >= 60 解鎖機制（任何等級均有效）

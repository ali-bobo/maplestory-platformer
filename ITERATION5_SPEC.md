# Iteration 5 狀態盤點與下一步
# 日期：2026-04-12

---

## 一、文件定位

- 本文件記錄 Iteration 5 的目前真實狀態、已完成項、剩餘缺口與下一步優先順序。
- 若本文件與程式碼衝突，以目前 src 內實作為準，再回補本文件。
- 本文件不再保留已失效的歷史 bug 清單，避免後續改動被過期資訊阻擋。

---

## 二、本輪已完成

### 核心穩定化
- 已修正 UIScene 技能冷卻刷新中的未定義變數問題，避免進場後快速拋出 runtime error。
- 已整理 BaseMapScene 的 NPC 互動監聽，改為單一 F 鍵處理與場景關閉時清理，避免監聽器累積。
- 已修正 TownScene 重複 addKey / checkDown 的互動方式，改用 JustDown 與既有 key instance。

### 渲染與外掛基礎層
- 主入口已固定使用 WebGL renderer。
- 已接入 phaser3-rex-plugins 的 rexUI scene plugin，供後續技能介面與效果控制使用。
- 目前後續技能特效可直接建立在 Phaser 3 內建 preFX / postFX 與 rexUI 基礎上。

### 專案清理
- .archon 已自專案移除。
- README、GAME_SPEC、Iteration 文件已同步改為現況導向，不再沿用過期差距表。

---

## 三、目前版本基線

### 已可依賴的內容
- 主線流程可從主選單進入並進行戰鬥。
- 主要地圖、Boss 進入、死亡 / 勝利結算可運作。
- 技能冷卻 HUD、裝備掉落、HP / MP 自動回復、Boss 解鎖條件已接入。
- WebGL renderer 與 rexUI 已就位，可作為下一輪技能特效與 UI 開發基礎。

### 已知仍待補強
- ESC 暫停選單與操作覆蓋層
- 目標選取框
- Level Up 全屏演出
- Boss 第三階段狂暴視覺
- 城鎮商店正式接入主流程

---

## 四、目前差距分析

### 高優先
1. ESC 暫停選單尚未實作，目前 ESC 只負責關閉 NPC 對話。
2. 目標選取框尚未實作，玩家攻擊對象缺少穩定視覺回饋。
3. Level Up 演出仍偏簡化，只有 UIScene 文字提示，缺少全屏粒子與節奏感。

### 中優先
1. Boss 第三階段缺少狂暴視覺層，強度變化不夠直觀。
2. 玩家姿態變化仍以單圖加 transform 模擬為主，尚未做到完整姿勢差異。
3. 視差背景目前是單層基礎版，仍有空間擴充為多層。

### 低優先 / 加值
1. TownScene 商店與藥水經濟系統完整化
2. localStorage 存檔 / 讀檔
3. 魔法陣通用效果與更多技能後製

---

## 五、下一步建議順序

### Phase 5 下一批建議
1. 先補 ESC 暫停選單，因為它同時影響操作說明與裝備檢視。
2. 補目標選取框與 Level Up 演出，提升戰鬥回饋。
3. 再進入 Boss 第三階段狂暴視覺與技能特效升級。

### 技術原則
- 新技能特效優先建立在 WebGL pipeline 與現有 ProceduralAssets 上。
- 介面型能力優先使用 rexUI，不再手刻重複容器與互動行為。
- 若規格與實作不同步，先允許功能落地，再於同輪更新文件。

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

# 盜賊傳說 — MapleStory 風格平台遊戲

楓之谷風格的 2D 橫向捲軸平台動作遊戲。扮演盜賊，從浮空島嶼出發，穿越古代廢墟、Kerning City，最終挑戰暗影魔君。

---

## 快速開始

> **注意**：遊戲需透過 HTTP server 開啟，不能直接雙擊 `index.html`（瀏覽器安全限制會阻擋圖片載入）。

**方法一：Node.js（推薦）**
```bash
npx serve .
```
然後在瀏覽器開啟 `http://localhost:3000`

**方法二：Python**
```bash
python -m http.server 8000
```
然後在瀏覽器開啟 `http://localhost:8000`

**方法三：VS Code Live Server**
在 `index.html` 上右鍵 → **Open with Live Server**

---

## 操作說明

| 按鍵 | 動作 |
|------|------|
| ← → | 左右移動 |
| Alt | 跳躍（可二段跳） |
| ↓ | 穿透薄平台往下 |
| Z | 技能：三連飛鏢 |
| X | 技能：暗影步伐（衝刺） |
| C | 技能：暗殺（瞬移） |
| V | 技能：暗影漩渦（AoE） |
| B | 技能：影分身 |
| F | 與 NPC 對話（靠近後） |
| ESC | 目前用於關閉 NPC 對話框 |

> 備註：ESC 暫停選單仍在待辦清單，尚未接入正式遊戲流程。

---

## 遊戲流程

```
浮空島嶼 (Lv1–10)
   ↓ 右側傳送門
古代廢墟 (Lv9–20)
   ↓ 右側傳送門
Kerning City (Lv18–30)
   ↓ 擊殺 60 隻怪物後，Boss 傳送門解鎖
暗影魔君 Boss 房
```

Boss 傳送門解鎖條件：全流程累積擊殺 60 隻怪物後，在 Kerning City 右側出現傳送門。

---

## 地圖介紹

### 浮空島嶼
- **背景**：晴天浮空島，藍天白雲
- **怪物**：史萊姆、蘑菇、蝸牛、樹樁（Lv1–8）
- **推薦等級**：Lv1–10

### 古代廢墟
- **背景**：沙漠廢墟，石拱遺跡
- **怪物**：野豬、機器人、骷髏、毒蛇（Lv9–18）
- **推薦等級**：Lv9–20

### Kerning City
- **背景**：夜間城市，磚牆霓虹
- **怪物**：龍、獨眼巨人、石像鬼、擬態箱（Lv19–28）
- **推薦等級**：Lv18–30

---

## 技能系統

| 鍵 | 技能 | 解鎖 | 冷卻 | MP | 說明 |
|---|------|------|------|-----|------|
| Z | 三連飛鏢 | Lv1 | 0.5s | 10 | 連發 3 枚銀色飛鏢 |
| X | 暗影步伐 | Lv5 | 3s | 30 | 衝刺 350px，沿途傷害，留下紫色殘影 |
| C | 暗殺 | Lv10 | 5s | 50 | 瞬移至最近敵人背後，必定暴擊 |
| V | 暗影漩渦 | Lv15 | 8s | 70 | 放出 8 顆能量球向外擴散，AoE 範圍攻擊 |
| B | 影分身 | Lv20 | 15s | 100 | 召喚戰鬥分身 5 秒，自動攻擊最近敵人 |

> 技能隨等級逐步解鎖。MP 會隨時間自動恢復。

---

## 角色成長

- **等級上限**：Lv30
- **升等加成**：HP +20、MP +12、ATK +5
- **裝備系統**：擊殺怪物有機率掉落武器、護甲、手套、頭盔、靴子
- **暴擊**：基礎暴擊率 20%，暴擊傷害 1.8 倍

---

## Boss — 暗影魔君

觸發條件：任意地圖累積擊殺 **60 隻**怪物後，kerning 地圖右側出現 Boss 傳送門。

| 階段 | HP 範圍 | 攻擊模式 |
|------|--------|---------|
| Phase 1 | 100%–60% | 地面衝擊、普通攻擊 |
| Phase 2 | 60%–30% | 新增暗影召喚（3 隻影子史萊姆） |
| Phase 3 | 30%–0% | 狂暴模式，攻擊速度 +50% |

---

## 開發資訊

### 技術棧
- **引擎**：[Phaser 3](https://phaser.io/) v3.88
- **Renderer**：固定使用 WebGL，已啟用 Phaser 3 內建 pipeline 能力
- **UI/效果延伸**：已接入 phaser3-rex-plugins（scene plugin：rexUI）
- **打包**：esbuild
- **語言**：ES Modules (JavaScript)
- **物理**：Phaser Arcade Physics

### 目前狀態
- 已完成：主線戰鬥流程、Boss 進入與結算、裝備掉落、技能冷卻 HUD、HP/MP 自動回復、WebGL/rexUI 基礎層
- 待補強：ESC 暫停選單、目標選取框、Level Up 全屏演出、Boss 第三階段視覺、城鎮商店正式接入

### 專案結構
```
src/
  scenes/     — 各地圖 Scene（BaseMapScene 繼承）
  entities/   — Player、Monster、Boss、Skill
  config/     — 常數、怪物定義、裝備定義、地圖定義
  engine/     — 粒子、音效（Web Audio API）
  assets/     — ProceduralAssets（平台/技能/UI 程式生成）
dist/
  bundle.js   — esbuild 打包輸出
  assets/     — 真實圖片素材（角色、怪物、背景）
```

### 本地開發
```bash
# 安裝依賴
npm install

# 打包
npm run build

# 啟動 server
npx serve .
```

### 如何停止本地伺服器

當你不再需要遊戲時，需要手動停止正在運行的本地伺服器：

| 啟動方式 | 停止方法 |
|---------|---------|
| `npx serve .` | 在終端機按 **Ctrl + C**（macOS 也是 **Ctrl + C**） |
| `python -m http.server 8000` | 在終端機按 **Ctrl + C** |
| VS Code Live Server | 點擊 VS Code 右下角狀態列的 **「Port: xxxx」** 按鈕，或按 **Ctrl + Shift + P** → 輸入 **「Stop Live Server」** |

> **注意**：關閉瀏覽器分頁只會關閉遊戲畫面，**不會**停止本地伺服器。伺服器仍會在背景佔用端口（port），你必須回到啟動伺服器的終端機視窗手動終止。
>
> 若忘記終止伺服器，下次啟動時可能出現 `port already in use` 錯誤。此時可以：
> - **找到並結束程序**（Linux/macOS）：`lsof -i :3000` 找到 PID，再 `kill <PID>`
> - **找到並結束程序**（Windows）：`netstat -ano | findstr :3000` 找到 PID，再 `taskkill /PID <PID> /F`

---

## 授權

本專案為個人學習專案，遊戲圖片素材版權歸原作者所有。

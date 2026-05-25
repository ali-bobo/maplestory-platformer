# 盜賊傳說 — MapleStory 風格平台遊戲

楓之谷風格的 2D 橫向捲軸平台動作遊戲，採用 Phaser 3 + esbuild 開發。扮演盜賊，從浮空島嶼出發、串接 6 張地圖、挑戰暗影魔君 Boss，並有副本系統提升重玩價值。

> **🎮 想直接玩遊戲？請看 [PLAYER_GUIDE.md](PLAYER_GUIDE.md)**（含 30 秒上手、操作說明、地圖介紹、副本系統、FAQ、Troubleshooting）
>
> 本檔給「想修改原始碼 / 了解技術細節」的開發者看。

---

## 環境需求

- Node.js **18 或以上**（`package.json` 的 `engines` 欄位已限制，安裝時會自動警告）
- 現代瀏覽器（Chrome / Edge / Firefox 最新版，需 WebGL2）

---

## 開發者快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 打包（把 src/*.js → dist/bundle.js）
npm run build

# 3. 啟動本地伺服器
npm run serve
```

開瀏覽器到 **http://localhost:3000** 即可遊玩。

**watch 模式**（邊改邊自動重 build）：
```bash
npm run dev
```

> 玩家只想啟動遊戲？直接 `npm run play` 即可（`dist/bundle.js` 已進 git，不需 install / build）。

---

## 技術棧

- **引擎**：[Phaser 3](https://phaser.io/) v3.88
- **Renderer**：固定 WebGL，啟用 Phaser 3 內建 pipeline 能力
- **UI / 效果延伸**：[phaser3-rex-plugins](https://github.com/rexrainbow/phaser3-rex-notes)（scene plugin `rexUI`，PostFX：GlowFilter、Shockwave）
- **打包**：esbuild（單一 IIFE bundle）
- **語言**：ES Modules（純 JavaScript，無 TypeScript）
- **物理**：Phaser Arcade Physics

---

## 專案結構

```
src/
  scenes/           — 各地圖 Scene（繼承 BaseMapScene）
                       BootScene / MenuScene / MapleIslandScene / HenesysScene /
                       PerionScene / ElliniaScene / KerningScene / TaipeiScene /
                       TownScene / BossScene / DungeonScene / UIScene / GameOverScene
  entities/         — Player、Monster、Boss、Skill、Clone
  config/           — 常數、怪物 / 裝備 / 地圖 / 任務 / 副本定義、asset catalog
  engine/           — 音效、粒子、VFX、品質系統、FPS 控制、任務管理、副本記錄
  assets/           — ProceduralAssets（平台 / 技能 / UI 程式生成材質）
dist/
  bundle.js         — esbuild 打包輸出（**已進 git，玩家免 build**）
  assets/           — 51 張 PNG 素材（角色 / 怪物 / 背景 / NPC / Boss）
index.html          — 主入口（含 CSP meta tag）
build.js            — esbuild 打包腳本
package.json        — npm scripts
```

---

## 已實作系統

- **主線**：6 張地圖串接 + 城鎮 + Boss 房 + 副本場景
- **戰鬥**：5 個盜賊技能（Z/X/C/V/B）+ 技能升級系統 + 影分身
- **角色**：等級 1-30、HP/MP/SP 自動回復、暴擊、裝備掉落
- **怪物**：30+ 種怪物（含 4 隻迷你 Boss + 1 隻暗影魔君主 Boss）
- **HUD**：底部單列狀態列、右上小地圖、技能 / 藥水快捷列、任務追蹤面板
- **任務系統**（Phase 13）：3 個範例任務、F 鍵自動接、HUD 即時進度
- **副本系統**（Phase 14）：史萊姆洞窟波狀關、每日 3 次上限、勝負結算 popup
- **效能**：自適應品質系統（FPS 監測自動降級）、VFX 紋理預渲染、HUD 凍結

---

## 安全性說明

| 機制 | 說明 |
|------|------|
| **CSP**（Content Security Policy）| `index.html` 使用 `meta` 標籤宣告 CSP，限制 `script-src` 為 `'self'` + inline script hash，`style-src` 同樣以 hash 限制，阻擋 XSS 注入 |
| **本機綁定** | `serve` / `play` 腳本均綁定 `127.0.0.1`，不對外開放網路連線 |
| **debug 工具** | `window.__setFps` / `window.__hpBarMode` 僅在 URL 含 `?debug=1` 時啟用，避免一般玩家誤操作 |
| **副本次數** | 每日上限存於 `localStorage`（key: `maple_dungeon_daily_record`），本機端記錄，跨日自動歸零；如需重置可在 DevTools 執行 `localStorage.removeItem('maple_dungeon_daily_record')` |
| **依賴更新** | 已設定 Dependabot 每週自動掃描 npm 依賴安全漏洞並開 PR |

---

## 授權

本專案為學習用途，遊戲圖片素材版權歸原作者所有。

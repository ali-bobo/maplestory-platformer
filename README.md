# 盜賊傳說 — 橫向捲軸平台動作遊戲

2D 橫向捲軸平台動作遊戲，採用 Phaser 3 + esbuild 開發。扮演盜賊，從浮空島嶼出發、串接 6 張地圖、挑戰暗影魔君 Boss，並有副本系統提升重玩價值。

> **🌐 線上遊玩：https://ali-bobo.github.io/nishiyigeyige/**（合併到 `main` 會由 `.github/workflows/pages.yml` 自動部署）
>
> **🎮 想直接玩遊戲？請看 [PLAYER_GUIDE.md](docs/PLAYER_GUIDE.md)**（含 30 秒上手、操作說明、地圖介紹、副本系統、FAQ、Troubleshooting）
>
> 本檔給「想修改原始碼 / 了解技術細節」的開發者看。

---

## 環境需求

- Node.js **18 或以上**（`package.json` 的 `engines` 已限制；建議使用 `.nvmrc` 指定的 20，CI 使用 22）
- 現代瀏覽器（Chrome / Edge / Firefox 最新版，需 WebGL2）

---

## 開發者快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 打包（把 src/*.js → dist/bundle.js）
npm run build

# 3. 執行測試（選用）
npm test

# 4. 啟動本地伺服器
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
                       BootScene / MenuScene / SkyIslandScene / ForestScene /
                       RuinsScene / MysticScene / AlleyScene / TaipeiScene /
                       TownScene / BossScene / DungeonScene / UIScene / GameOverScene
  entities/         — Player、Monster、Boss、Skill、Clone
  config/           — 常數、怪物 / 裝備 / 地圖 / 任務 / 副本定義、asset catalog
  engine/           — 音效、粒子、VFX、品質系統、FPS 控制、任務管理、副本記錄、存檔
  engine/music/     — BGM：音樂理論、樂曲資料、合成引擎
  assets/           — ProceduralAssets（平台 / 技能 / UI 程式生成材質）
docs/
  PLAYER_GUIDE.md   — 玩家手冊
  GAME_SPEC.md      — 設計規格書
  STATUS.md         — 目前狀態、缺口與下一步
  TODO.md           — 待你決定 / 調整的項目
dist/
  bundle.js         — esbuild 打包輸出（**已進 git，玩家免 build**）
  version.json      — 建置版本（bundle 雜湊、素材清單；build.js 產生，已進 git）
  assets/           — 50 張 PNG 素材（角色 / 怪物 / 背景 / NPC / Boss）
index.html          — 主入口（含 CSP meta tag）
style.css           — 版面樣式與手機觸控操作層樣式
manifest.webmanifest — 加入主畫面（PWA）設定；圖示在 icons/
sw.js               — Service Worker（離線遊玩；版本常數由 build.js 改寫）
build.js            — esbuild 打包腳本
package.json        — npm scripts
```

---

## 已實作系統

- **主線**：6 張地圖串接 + 城鎮 + Boss 房 + 副本場景
- **戰鬥**：普通攻擊（空白鍵，近戰揮刀）+ 5 個技能挑 4 個放進技能欄（Z/X/C/V，Lv.20 後可自選）+ 技能升級系統 + 影分身
- **新手教學**：首次進遊戲的故事 + 按鍵說明 + 技能 / 任務系統介紹（Enter 繼續、Esc 跳過；暫停選單可重看）
- **角色**：等級 1-50、HP/MP 緩慢自動回復（需靠藥水）、受擊擊退、暴擊、裝備掉落；暫停選單可「儲存並離開」
- **怪物**：30+ 種怪物（含迷你 Boss + 1 隻三階段暗影魔君主 Boss；範圍招式有地面預警區）
- **HUD**：底部單列狀態列、右上小地圖、技能 / 藥水快捷列、任務追蹤面板
- **任務系統**（Phase 13）：3 個範例任務、F 鍵自動接、HUD 即時進度
- **副本系統**（Phase 14）：史萊姆洞窟波狀關、每日 3 次上限、勝負結算 popup
- **音樂**（Phase 18）：每張地圖一首 16 小節的和弦式配樂（柔和音色、殘響、依地圖風格編曲）
- **手機支援**（Phase 17）：畫面等比縮放、觸控操作層（搖桿 + 技能 / 藥水 / 互動 / 暫停，支援多指）、直向提示、全螢幕、可加入主畫面
- **存檔與死亡**（Phase 16）：自動存檔到 localStorage、繼續遊戲、匯出 / 匯入存檔檔；死亡後顯示分數，可從死亡點重新開始（失去裝備）
- **戰鬥回饋**（Phase 15）：目標選取框、升級全屏演出、ESC 暫停選單
- **效能**：自適應品質系統（FPS 監測自動降級）、VFX 紋理預渲染、HUD 凍結

---

## 安全性說明

| 機制 | 說明 |
|------|------|
| **CSP**（Content Security Policy）| `index.html` 使用 `meta` 標籤宣告 CSP，限制 `script-src` 為 `'self'` + inline script hash，`style-src` 為 `'self'`（樣式放在外部 `style.css`，沒有 inline style），阻擋 XSS 注入 |
| **本機綁定** | `serve` / `play` 腳本均綁定 `127.0.0.1`，不對外開放網路連線 |
| **debug 工具** | `window.__setFps` / `window.__hpBarMode` 僅在 URL 含 `?debug=1` 時啟用，避免一般玩家誤操作 |
| **副本次數** | 每日上限存於 `localStorage`（key: `thief_legend_dungeon_daily_record`），本機端記錄，跨日自動歸零；如需重置可在 DevTools 執行 `localStorage.removeItem('thief_legend_dungeon_daily_record')` |
| **依賴更新** | 已設定 Dependabot 每週自動掃描 npm 依賴安全漏洞並開 PR |

---

## 文件

| 文件 | 內容 |
|------|------|
| [docs/PLAYER_GUIDE.md](docs/PLAYER_GUIDE.md) | 玩家手冊 |
| [docs/GAME_SPEC.md](docs/GAME_SPEC.md) | 設計規格書（設計意圖，數值以 `src/config` 為準） |
| [docs/STATUS.md](docs/STATUS.md) | 目前狀態、已知缺口與下一步 |
| [docs/TODO.md](docs/TODO.md) | 待決定與待實作項目 |

---

## 貢獻

PR 會由 CI 執行 `npm test`、檢查 `npm run build` 能成功，且提交的 `dist/bundle.js` 與原始碼一致。修改 `src/` 後請先執行 `npm run build` 並一併提交 bundle（以及建置一併更新的 `dist/version.json`、`sw.js`；合併分支遇到這三個檔衝突時，直接重新 build 即可）。

---

## 授權

原始碼（`src/`、`build.js` 等）以 [MIT License](LICENSE) 授權。

`dist/assets/` 內的圖片素材**不在 MIT 授權範圍內**，版權歸原作者所有，僅供學習用途；重新散布或商用前請自行確認來源與授權。

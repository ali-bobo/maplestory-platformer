# E2E 腳本（Playwright，無頭瀏覽器實際操作遊戲）

這些腳本會開真正的瀏覽器、操作遊戲並檢查結果（PASS / FAIL），用來確認整個流程能跑。它們原本放在工作階段的暫存資料夾，現在收進專案，避免容器結束後遺失。

## 怎麼跑

1. 建置並啟動靜態伺服器：
   ```bash
   npm run build
   python3 -m http.server 8123      # 另開背景程序；結束時用該程序的 PID 關掉
   ```
2. 執行腳本（第一個參數是截圖輸出資料夾，沒給就用目前資料夾）：
   ```bash
   node e2e/e2e-jobs.cjs /tmp/shots
   ```

## 環境假設（換環境要改）

- Playwright 路徑寫死為 `/opt/node-tools/node_modules/playwright`，Chromium 為 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`。
- 遊戲網址寫死為 `http://127.0.0.1:8123/index.html?debug=1`（`e2e/world/*` 用環境變數 `PORT`，預設 8231）。
- 腳本靠 `?debug=1` 暴露的 `window.__game`、`window.__setJob(job, level)`、`window.__QUESTS` 來快速設定狀態。

## 腳本清單

| 腳本 | 驗證什麼 |
|------|----------|
| `e2e.cjs` | 基本流程：開始遊戲、移動、攻擊、存檔 |
| `e2e-tutorial.cjs` | 新手教學 |
| `e2e-skills2.cjs` | 技能欄、普通攻擊 / Z 技能、冷卻與 MP、技能視窗與換入 |
| `e2e-death.cjs` | 死亡與重新開始 |
| `e2e-mobile.cjs` | 觸控按鈕、多點觸控 |
| `e2e-music.cjs` | 每張地圖的音樂 |
| `e2e-jobs.cjs` | 兩個職業的技能、姿勢、被動、存檔讀檔 |
| `e2e-quest.cjs` | 轉職任務鏈（影之長老在影之殿堂；兩職業各走一次，含二選一對話、試煉副本、覺醒） |
| `ai.cjs` | 怪物 AI：Boss 追擊不抖動、玩家在別層時怪物不呆站、每種新攻擊出手並造成效果、守衛 / Boss 階段切換、機器人玩家難度抽樣。用法 `PORT=8402 node e2e/ai.cjs <截圖目錄> [a b c d e]`（只跑指定章節；`CASES=charge,slam` 可限制 c 章的招式、`E_ONLY=boss` 只跑 e 章的 Boss 戰）；時間門檻用遊戲時間（headless 只有約 10 FPS） |
| `world/` | 世界骨架：主線傳送門、星光碎片、四張新地圖的機制（`lib.cjs` 是共用工具） |

> 這些腳本不在 `npm test` 裡（單元測試是 `npm test`，約 269 項）。要不要把它們串進 CI 之後再決定。

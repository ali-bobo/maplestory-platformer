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

- 連接埠用環境變數 `PORT`（預設 8123），多個工作同時跑時各用不同埠：`PORT=8401 node e2e/e2e-jobs.cjs`。

- Playwright 路徑寫死為 `/opt/node-tools/node_modules/playwright`，Chromium 為 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`。
- 遊戲網址用環境變數 `PORT`（多數腳本預設 8123，`e2e-quest` 與 `world/*` 預設 8231）：`PORT=8403 node e2e/e2e-jobs.cjs /tmp/shots`。機器忙（多個瀏覽器同時跑）時載入與計時會變慢，腳本已改成等到進入地圖才開始，仍可能出現偶發的計時類失敗，重跑即可。
- 腳本靠 `?debug=1` 暴露的 `window.__game`、`window.__setJob(job, level)`、`window.__QUESTS` 來快速設定狀態。

## 腳本清單

| 腳本 | 驗證什麼 |
|------|----------|
| `e2e.cjs` | 基本流程：開始遊戲、移動、攻擊、存檔 |
| `e2e-tutorial.cjs` | 新手教學 |
| `e2e-skills2.cjs` | 技能欄、普通攻擊 / Z 技能、冷卻與 MP、技能視窗與換入 |
| `e2e-death.cjs` | 死亡與重新開始 |
| `e2e-mobile.cjs` | 舊式觸控按鈕（強制 `touchControls: buttons`）、多點觸控、左右互換、暫停、直向 |
| `mobile-joystick.cjs` | 虛擬搖桿（844x390，CDP 多指）：浮動底盤、左右拖曳、上推跳、二段跳（回中立再推 / 快速上滑 / 另一側點擊 / 跳躍鈕）、按住不連跳、右手同時攻擊、touchcancel / 拖出螢幕 / 失焦不卡鍵、第二指不搶搖桿、下推、HUD 藥水槽仍可點、左右互換、設定切換、視窗縮放。注意 CDP `touchEnd` 的 touchPoints 是「要放開的那幾指」；無頭瀏覽器負載高時二段跳序列會自動重試。用法 `PORT=8517 node e2e/mobile-joystick.cjs <截圖目錄>` |
| `ux.cjs` | UX 系統：ESC 順序（含合成 ESC）、存檔代碼往返（全新設定檔匯入、壞代碼、剪貼簿被拒）、設定持久化與生效、低血量暈影與首次死亡提醒、目標列、任務日誌、localStorage 不可用、手機 844x390（技能視窗可點、觸控鈕讓開、冷卻遮罩）。用法 `PORT=8412 node e2e/ux.cjs /tmp/shots` |
| `mobile-layout.cjs` | 手機可見視窗版面：8 組視窗（844x340、740x320、667x300、915x412、844x390、667x375、390x844 直向、1280x720 桌機）。畫布 16:9 置中且至少一軸填滿、無捲動條、視窗高度變動後重新貼合、安全區域（`--safe-*` 變數）、直向「請橫放」提示、全螢幕鈕（無 API 時隱藏）；影之長老選項對話（真實點互動鈕開啟）、一般 / 長文字對話、5 列商店（真的點購買）、任務日誌 / 設定 / 技能 / 道具視窗、世界地圖：每個可點物件在可見視窗內、≥ 40 CSS px、`elementFromPoint` 不被觸控鈕蓋住、不被 HUD 蓋住（遊戲座標 y 48~600）、文字 ≥ 12 CSS px（畫布縮放 < 0.5 放寬到 10），並用 CDP 真實觸控點關閉鈕。用法 `PORT=8437 node e2e/mobile-layout.cjs /tmp/shots [視窗名…]` |
| `e2e-music.cjs` | 每張地圖的音樂 |
| `e2e-feel.cjs` | 戰鬥手感：土狼時間、落地前提前按跳、攻擊 / 技能冷卻尾端再按會銜接且不多扣 MP。用 `game.step` 虛擬時鐘逐幀推進（headless 約 7 FPS，比 120 ms 緩衝窗還慢，真實時間按鍵不可靠） |
| `e2e-jobs.cjs` | 兩個職業的技能、姿勢、被動、存檔讀檔 |
| `e2e-quest.cjs` | 轉職任務鏈（影之長老在影之殿堂；兩職業各走一次，含二選一對話、試煉副本、覺醒） |
| `soak.cjs` | 浸泡測試（效能 / 記憶體）：連續遊玩數分鐘（連打技能、受傷死亡、走遍所有地圖與 Boss / 副本、換職業、開技能視窗、音樂開著），每分鐘印出堆積 / 紋理 / 物件 / 計時器 / 音訊節點，最後斷言暖機後不成長，並演練 WebGL context 遺失。`PORT=8401 SOAK_MIN=8 node e2e/soak.cjs /tmp/shots`（`SOAK_JSON=檔案` 可存數據） |

| `ai.cjs` | 怪物 AI：Boss 追擊不抖動、玩家在別層時怪物不呆站、每種新攻擊出手並造成效果、守衛 / Boss 階段切換、機器人玩家難度抽樣。用法 `PORT=8402 node e2e/ai.cjs <截圖目錄> [a b c d e]`（只跑指定章節；`CASES=charge,slam` 可限制 c 章的招式、`E_ONLY=boss` 只跑 e 章的 Boss 戰）；時間門檻用遊戲時間（headless 只有約 10 FPS） |
| `world/` | 世界骨架：主線傳送門、星光碎片、四張新地圖的機制（`lib.cjs` 是共用工具） |
| `world/s4.cjs` | 支線岔路入口（真實按鍵跳上跳台、走地面不誤入、按 F 進入）與世界地圖浮層（節點狀態、傳送、扣費、副本中拒絕） |
| `balance.cjs` | 技能平衡實測：每個職業、每個技能對靜止靶的傷害 / MP，並斷言設計意圖（見 `docs/SKILLS_DESIGN.md` 第八節） |
| `trial.cjs` | 影之試煉守衛的戰鬥時間：Lv10 盜賊三種打法（穩健 / 只用普攻 / 莽撞）各打數次，回報擊殺時間與血量；`GHP` / `GATK` 環境變數可覆寫守衛數值來調參 |

> 這些腳本不在 `npm test` 裡（單元測試是 `npm test`，約 292 項）。要不要把它們串進 CI 之後再決定。

## 穩定性筆記（機器忙時要知道的事）

- 無頭瀏覽器只有約 8~10 FPS（機器忙時更低），Phaser 的 `JustDown` 一幀才讀一次鍵盤。固定 160 ms 的按鍵偶爾落在兩幀之間而沒被讀到。`e2e-jobs.cjs` 與 `e2e-skills2.cjs` 的按鍵改成「按住到遊戲跑過 2 幀」，並對延遲出手的招式輪詢結果。
- 讓怪物不動的方法：不要把 `m.update` 換成空函式（擊退 / 擊飛計時與煙霧偵測都在 `Monster.update` 裡）。改成 `m.speed = 0; m._detectionRangeSq = 0; m._chaseExtendedSq = 0; m._attackRangeSq = 0; m.jumpCooldown = 1e9; m._steerJumpCd = 1e9`。
- 同一隻靶跨段重用時，要把上一段加在實例上的函式樁（例如 `applyKnockback = () => {}`）刪掉，否則後一段的擊飛 / 擊退永遠不生效（`e2e-jobs.cjs` 的 `prep` 現在會 `delete`）。
- `player.isInvincible` 只是受擊後 800 ms 的無敵幀，不是無敵開關；腳本想要「不會死」要持續補血（見 `world/s3.cjs`），否則怪物 / 守護者 / 熔岩地面會把角色打死，死亡換場景後讀場景物件就會丟「Cannot read properties of undefined」。
- 連擊（彎刀橫斬）視窗是 900 ms，機器忙時兩下之間會超過；`e2e-jobs.cjs` 在第 2、3 下前把連擊時間戳更新到現在，只驗「第 3 下擊飛」，視窗本身由單元測試（`comboStep`）涵蓋。
- `e2e.cjs` 的匯出步驟收不到檔案下載時印 `SKIP`（不算失敗）；存檔代碼上線後要換成代碼的檢查。
- 新增 `world/shops.cjs`：三個補給商人可開啟、購買增加庫存。
- `ai.cjs` 全跑約 10~20 分鐘（機器忙時更久），外層 timeout 要設 1500 秒以上。
- `world/s1.cjs` 與 `world/s3.cjs` 都用「整段補血」避免角色被打死後換場景。
- `balance.cjs`（已修，原本在量測中途崩潰）要知道的事：
  - 崩潰根因：位移類技能（暗影步伐 / 瞬影連刺）會把玩家帶進傳送門，場景被換成別張地圖，舊場景 shutdown 把所有靶銷毀，之後讀 `m.body` 就丟 `'setVelocity' of undefined`。現在量測期間設 `scene._transitioning = true` 鎖住傳送門，`reset()` 也會在場景被換或靶被銷毀時直接丟出明確訊息。
  - 靶不動用欄位凍結（同上面的做法），不要換掉 `Monster.update`。
  - 出手到命中之間有遊戲時間的 `delayedCall`（命中停頓、機器忙時會拖延）；固定 `waitForTimeout` 會讓命中漏進下一下或落空（量到 0 / 雙倍）。改用「傷害靜止 450 ms」才結算。MP 成本要在同一次 `evaluate` 內讀前後值。
  - 普攻貼身（40 px）量：第一下的擊退會把靶推出刺客 90 的範圍，距離遠時第二下常落空，量不到設計的「兩下都中」。
  - 斷言包含普攻 DPS 量級（刺客≈4.0、俠盜≈3.71、盜賊≈2.61，±20%，因為暴擊隨機）。全跑約 3~5 分鐘。

# 進度日誌（給下一個接手的人或 agent）

> 規則：每次開工、每個子代理派出／完成、每次合併都更新這份。即使工作沒做完，也要寫清楚「做到哪、下一步是什麼」。
> 其他文件：`NEXT.md`（路線與待決定）、`TODO.md`（未完成總表）、`STATUS.md`（系統現況）。

## 目前基線
- main 已含 PR #24（素材接線、UX 系統、補給商店）。試玩頁面（Claude Artifact，私人）= 版本 9，對應 main `e9d70f8`。
- 開發分支 `claude/inspiring-ritchie-gczu1m` 比 main 多：魔君王城回程互動門、screenFlash 接閃光設定（`9cf8eb6`，尚未開 PR）。
- 單元測試 347 項全過。

## 進行中的子代理（各在獨立 git worktree，分支名稱完成後回報）
| 任務 | 範圍 | 狀態 | 若中斷，從哪裡續做 |
|------|------|------|--------------------|
| A. 修 `e2e/balance.cjs` | e2e/balance.cjs、README、TODO | **完成並合併**（連跑 3 次全 PASS；根因是位移技能把玩家帶進傳送門換場景，非遊戲 bug） | 先重現 'setVelocity' of undefined；多半是靶被打死／銷毀後仍重用，見 e2e/README 穩定性筆記 |
| B. 手機對話視窗與世界地圖 | uiScale、WorldMapOverlay、NPC 對話 UI、e2e/ux.cjs | **完成並合併**（354 測試過） | 剩安全區域與其餘按鈕微調（U-14）；完整 e2e/ux.cjs 需在空閒機器再跑一次（桌機 2 項計時檢查在高負載偶發失敗） |
| C. 輸入緩衝＋土狼時間 | src/engine/inputBuffer.js（新）、Player.js | **完成並合併**（364 測試、e2e-feel 全過） | 我移除了「離邊後少一跳」的削弱，維持離邊仍有兩段跳；未做 P2 按住連發、P4 可變跳高。e2e-jobs/skills2 在高負載偶發計時失敗，空閒時再整份重跑 |

| D. 素材缺口盤點＋提示詞 | docs/ASSET_GAPS.md、docs/asset-requests/（含 ref/ 參考圖複本） | **完成並合併** | 缺口表 docs/ASSET_GAPS.md（G-01~G-21）、參考圖 asset-requests/ref/（26 張）；使用者產圖放 asset-requests/incoming/ 後由 AI 去背接線 |
| E. 提示詞改寫為自足版 | docs/asset-requests/PROMPTS.md、ASSET_GAPS.md | **完成並合併** | 可複製版在 docs/asset-requests/PROMPTS.md；待使用者確認的外觀描述見該檔與日誌。使用者用免費 Gemini：無上下文、預設無參考圖。每段提示詞必須完整重述風格＋角色文字描述，參考圖僅為可選加強 |
| F. 提示詞壓縮為短版 | PROMPTS.md、ASSET_GAPS.md 第4節、asset-requests/README.md | **完成並合併**（72 段皆 ≤700 字元） | 使用者回饋：太長，免費 Gemini 不能用。規則：『貼這段』每個 ≤ 700 英文字元，仍自足 |
| G. 手機滿版與對話視窗定位 | style.css、index 容器、main.js、src/engine/viewportFit.js、src/ui/dialogLayout.js、touchReserve.js、BaseMapScene（NPC 對話 / 商店）、UIScene 彈窗標題列、questLog / settings 關閉鈕、e2e/mobile-layout.cjs | **完成，待合併**（分支 `worktree-agent-ad5bd0bbf092f1392`；376 測試過；mobile-layout 8 組視窗全過；ux / e2e / e2e-mobile 全過） | 未碰搖桿與跳躍鈕邏輯 / 排版；整合點：`touchReservedRects(doc, canvas, 1280, {modal})` 讀觸控鈕邊界。尚缺真機驗證 |
| H. 虛擬搖桿＋上推二段跳 | src/engine/joystick.js、touchControls.js、settings、settingsWindow | **完成並合併**（376 測試、mobile-joystick 53 項） | 閾值在 `JOY`；**無真機測試**，手感可能要微調；底盤不 clamp 邊緣 |

子代理規則：不提交 `dist/bundle.js`（由主線統一重建）；不 push、不開 PR；中文 commit。

## 合併流程（子代理完成後）
1. `git merge <worktree 分支>`（衝突的 docs 保留雙方；dist/bundle.js 一律 `npm run build`）。
2. `npm test` 全過 → 跑相關 e2e → commit → push 開發分支。
3. 更新本表狀態，再決定是否開 PR 併 main 與重發試玩頁面（步驟見 TODO.md）。

## 仍等使用者決定（不要自行動工）
版本方向、死亡懲罰、劇情反轉（魔君＝上一任影子夜渡）、hisoka.jpg 處理、支線地圖凍結或擴充。

## 仍需使用者產圖
Boss 狂暴姿勢與背景、劇情插畫 2 與 4、標題徽章、刺客／俠盜普攻圖示（規格見 ASSET_REQUEST.md）。

## 日誌
- 2026-10-13：PR #24 合併、試玩頁面更新至版本 9；加回程門與閃光設定；派出子代理 A/B/C。
- 2026-10-13：素材盤點完成並合併（ASSET_GAPS.md）。發現 story_1/3 在 TutorialScene 尚未接線（補完 2、4 後一起接）；ATK_assassin/bandit 圖示目前與 ATK 同檔。
- 2026-10-13：使用者回饋提示詞必須單獨完整（Gemini 無上下文／無參考圖）；派出子代理 E 改寫。之後所有新提示詞都照此規則。
- 2026-10-13：子代理 B（手機版 UI）合併；單元測試 354 項。
- 2026-10-13：子代理 E 完成，PROMPTS.md 合併（每段自足）。待使用者確認：魔君外觀色碼、G-03 魔君造型、長老與三位商人造型、影子史萊姆葉芽、Gemini 做不出的長寬比改產單格。
- 2026-10-13：子代理 C 合併（保留兩段跳不削弱）。使用者傳來狂暴 Boss 待機圖（綠底 1504x704，紅眼紅符文、灰紫膚、紫焰黑球），待存入 asset-requests/incoming/boss_rage_idle.png 後去背接線；移動／攻擊兩張仍待產。
- 2026-10-13：使用者提供調整後的狂暴待機圖（深紫膚）。已去背縮放成 docs/asset-requests/incoming/boss_rage_idle.png（460x220，角色高 199，置中貼底，與 boss_idle 同基準；原圖留存為 boss_rage_idle_src.jpg）。**尚未接線**：等移動、攻擊兩張到齊後，再一起加進 assetCatalog（scope boss）並在 BossScene 狂暴階段切換貼圖，避免只換待機造成外觀不連貫。下一步：使用者產 G-01 移動／攻擊（附這張當參考）。
- 2026-10-13：使用者回饋提示詞太長；派出子代理 F 壓縮。**之後所有新提示詞：≤ 700 字元、自足、一段可貼。**
- 2026-10-13：Boss 狂暴三姿勢（待機／移動／攻擊）已入庫並接線（assetCatalog、Boss.js `_rage`＋`_poseKey`，第 3 階段起使用；狂暴時不疊紅染色）。e2e/boss-rage.cjs 全過。G-01 完成；G-02（狂暴背景）仍缺。下次發布試玩頁面要多附 boss_rage_*.png 三個檔。
- 2026-10-13：子代理 A 合併（balance.cjs 修好並新增普攻 DPS 斷言）。A～F 全部完成。下一步：機器空閒時整份重跑 e2e（ux、jobs、skills2、quest）、重建並重發試玩頁面（多附 boss_rage_*.png），再決定是否開 PR 併 main。
- 2026-10-13：合併後整份 e2e 在空閒機器通過：e2e、tutorial、skills2、death、mobile、music、jobs、feel、ux、quest、world/s4、world/shops、boss-rage（單元測試 364）。開發分支比 main 多：回程門、閃光設定、手機版 UI、輸入緩衝、Boss 狂暴姿勢、balance 修復、提示詞文件。**尚未開 PR／併 main／重發試玩頁面**（等使用者指示；重發需附 boss_rage_*.png）。
- 2026-10-18：使用者回報手機三問題（畫面非滿版、要圓形搖桿＋上推二段跳、NPC 對話後按鈕找不到）；派出子代理 G、H（尚待合併；G 不碰搖桿，H 不碰對話／scale）。
- 2026-10-18：子代理 G（手機虛擬搖桿）完成並在分支提交：浮動圓形搖桿、上推跳、回中立再推 / 快速上滑 / 另一側點擊 = 二段跳、設定可切回舊式按鈕；單元測試 +13，`e2e/mobile-joystick.cjs` 全過，`e2e-mobile`（改測舊式按鈕）與 `ux.cjs` 迴歸通過。未合併、未重建 dist。
- 2026-10-18：子代理 G（手機滿版 + 對話視窗定位）完成。根因：(1) `#game-container` 是 flex 置中，Phaser 又開 `autoCenter: CENTER_BOTH`，兩邊各偏一半，畫布在 667x300 偏右 33 px；容器用 100vw/100vh，手機 100vh 含網址列；只靠 window resize，網址列收放不一定通知。(2) 對話 / 商店面板雖已依畫布縮放放大，但只夾「畫布高度」，沒避開 HUD：5 列商店在 667x300 下緣被下方狀態列蓋住、關閉鈕被右上角地圖鈕蓋住；按鈕上限 96 遊戲座標在 667x300（縮放 0.42）換算只有 40 CSS px；任務日誌 / 設定視窗關閉鈕只有 23 CSS px。修法與驗證見 TODO「手機版面」列與 e2e/README。限制：畫布仍固定 16:9（844x340 兩側各 ~120 px 邊，背景為漸層，觸控鈕不夠寬時疊在畫面上）。

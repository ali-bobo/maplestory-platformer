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
| A. 修 `e2e/balance.cjs` | e2e/balance.cjs、README、TODO | 進行中 | 先重現 'setVelocity' of undefined；多半是靶被打死／銷毀後仍重用，見 e2e/README 穩定性筆記 |
| B. 手機對話視窗與世界地圖 | uiScale、WorldMapOverlay、NPC 對話 UI、e2e/ux.cjs | **完成並合併**（354 測試過） | 剩安全區域與其餘按鈕微調（U-14）；完整 e2e/ux.cjs 需在空閒機器再跑一次（桌機 2 項計時檢查在高負載偶發失敗） |
| C. 輸入緩衝＋土狼時間 | src/engine/inputBuffer.js（新）、Player.js | 進行中 | 窗口：輸入緩衝約120ms、土狼約100ms；純函式＋單元測試 |

| D. 素材缺口盤點＋提示詞 | docs/ASSET_GAPS.md、docs/asset-requests/（含 ref/ 參考圖複本） | **完成並合併** | 缺口表 docs/ASSET_GAPS.md（G-01~G-21）、參考圖 asset-requests/ref/（26 張）；使用者產圖放 asset-requests/incoming/ 後由 AI 去背接線 |
| E. 提示詞改寫為自足版 | docs/asset-requests/PROMPTS.md、ASSET_GAPS.md | **完成並合併** | 可複製版在 docs/asset-requests/PROMPTS.md；待使用者確認的外觀描述見該檔與日誌。使用者用免費 Gemini：無上下文、預設無參考圖。每段提示詞必須完整重述風格＋角色文字描述，參考圖僅為可選加強 |

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

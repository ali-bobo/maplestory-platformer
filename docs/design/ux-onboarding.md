# UX / 新手引導 / 手機 / 無障礙 設計審查

審查日期：2026-10-11　範圍：UI、可讀性、新手引導、手機、無障礙、設定、玩家溝通、存檔信任。
方法：讀 PLAYER_GUIDE / STATUS 與 UIScene、MenuScene、TutorialScene、GameOverScene、touchControls、device、saveManager，再用 Playwright 實際操作（桌機 1280x720，手機 844x390 與 390x844，`?touch=1`）。
不重複他人範圍：世界地圖 overlay 與右上地圖鈕（另一組在做）、戰鬥手感、經濟、劇情。以下只提與 UX 相關處。

---

## 1. 審查畫面與主要問題

### 1.1 截圖清單（/tmp/ux-shots，不在 repo 內）

| 檔名 | 內容 |
|---|---|
| 01-menu.png、54-menu-with-save.png | 標題（新檔 / 有存檔） |
| 02-tutorial-5.png、02-tutorial-7.png（另有 1~9 頁） | 教學：按鍵頁、任務頁 |
| 03-first-sec.png、04-first-5s.png | 教學後第一秒、第五秒（沒有任何目標提示） |
| 10-npc-near.png、11-npc-dialog.png、12c-tracker.png | 接近 NPC、對話、任務追蹤 |
| 13-combat.png、40-levelup.png、41-dmgnums.png、43-lowhp.png | 戰鬥、升級、低 HP/MP |
| 14-popup-equip / map / settings.png、21-skills-lv20.png | 裝備、地圖、設定、技能（換入）視窗 |
| 15-pause.png、52-esc-after-dialog.png | 暫停選單；ESC 關對話後暫停選單被一起打開 |
| 20-hud-lv10 / 20 / 30.png | 各等級 HUD |
| 44-gameover.png | 死亡結算 |
| 50-town.png、51-npc-prop_star_tower.png、53-shop.png | 城鎮、星光之塔對話、商店 |
| 30~37-phone-l-*.png、30-phone-p-menu.png | 手機橫向（選單、教學、遊戲、對話、技能視窗）、直向提示 |

### 1.2 最嚴重的問題（附證據）

1. **「設定」鈕不是設定。** 14-popup-settings.png：點開只有一張按鍵對照表，沒有音量、沒有任何開關；右側按鍵欄被裁掉（"← →" 只剩 "←"、"Alt / ↑" 被切）；寫的「技能 Z X C V B」與實際 4 格（Z X C V）不符。暫停選單也只有「聲音：開/關」。
2. **開局沒有下一步。** 03/04 截圖：教學結束後畫面沒有任何任務、箭頭或提示；NPC 頭上只有 13px 名字，沒有「！」標記；任務追蹤面板在接任務前不存在。教學 9 頁（4 頁故事）才進遊戲，玩家第一次看到的操作提示是 11px 綠字「[按 F 對話]」。
3. **手機上 HUD 與彈窗文字實際不可讀。** 844x390 時畫布只有 693x390，縮放 0.54：HUD 12px 數字約 6.5 CSS px，技能名 10px 約 5.4px，技能視窗 9px 約 4.9px（37-phone-l-skills.png 已糊成一片）。且技能視窗被觸控層的「跳 / ↓ / 搖桿」直接蓋住，視窗上的「+」與「換入」手指點不到。
4. **彈窗對比不足。** 14-popup-equip.png：「（未裝備）」`#555555` 在深褐底上約 1.6:1，幾乎看不見；技能視窗副標 9px `#888888`。商店（53-shop.png，14~16px、羊皮紙按鈕）則清楚得多，風格與可讀性在兩套 UI 間斷裂。
5. **死亡懲罰先發生、警告在後。** 44-gameover.png：失去全部裝備在死亡當下就寫入存檔；教學只在第 9 頁帶過一句。結算標題下的「重新開始將失去身上的 N 件裝備」已是事後告知。HP 低時沒有任何警示（43-lowhp.png：只有條變短）。
6. **ESC 一鍵兩用的 bug。** 52-esc-after-dialog.png（實測 `paused: true`）：按 ESC 關 NPC 對話，同一個按鍵同時打開暫停選單。與 PLAYER_GUIDE「ESC 關對話；無對話才開暫停」相反；手機上「暫停」鈕等於 ESC，同樣中招。
7. **存檔「匯出」在內嵌環境會假成功。** `exportSaveFile()` 只要 `a.click()` 沒丟例外就回 true；在 sandbox iframe / Artifact 檢視器下載被擋時玩家看不到任何訊息，也沒有成功提示。`canSave()` 失敗只在主選單提示一次，進遊戲後完全無提示。
8. **小問題但很顯眼。** 地圖名稱在小地圖上方被裁（所有截圖右上角只剩半截字，`_mapText` y=6 且 origin 底對齊）；左緣傳送門標籤被裁；星光之塔對話最後一行與「[按 F 或 ESC 關閉]」重疊（51-npc-prop_star_tower.png）；畫布設 `image-rendering: pixelated` 且 Phaser `pixelArt: true, antialias: false`，手繪風美術在手機縮小到 0.54 時會鋸齒、閃爍。

### 1.3 現有優點（要保留）

木質 HUD 與羊皮紙面板風格統一；技能槽冷卻遮罩加秒數清楚；傷害數字分色分級；教學可跳過、可在暫停重看；觸控層可左右互換、多指、失焦放開；升級有演出；NPC 接任務有靠近提示。

---

## 2. 前 15 分鐘 walkthrough 與卡點

| 時間 | 玩家狀態 | 卡點 | 修法 |
|---|---|---|---|
| 0:00 標題 | 新玩家按開始 | 「匯入存檔」是 18px 字連結，貼在地面岩石上，對比低 | 做成木框小按鈕；有存檔時「新遊戲」已有二次確認，保留 |
| 0:10 教學 | 9 頁 | 4 頁故事在前，按鍵頁第 5 頁；內容是列表，記不住 | 故事壓成 2 頁；按鍵頁移到第 2 頁；其餘改成遊戲中情境提示（見 U-02） |
| 1:20 第一次站在島上 | 不知道去哪 | 沒目標、沒標記、NPC 在出生點右側僅 100px，但玩家可能先往右打怪 | 起始 5 秒顯示目標條「找島嶼義工說話」＋NPC 頭上「！」跳動 |
| 1:40 對話 | 按 F | 對話開啟即自動接任務，但框內是歡迎詞，沒說「已接受」 | 對話內容加「任務接受：史萊姆獵手（擊殺 5 隻史萊姆）」；任務面板新增項目時閃一下 |
| 2:30 打怪 | 追蹤面板只有「史萊姆獵手 0/5」 | 不知史萊姆長什麼樣、在哪層；島上有蝙蝠、蘑菇、鳥，易混 | 追蹤項加一行地點與目標（見 U-06）；任務怪頭上加小箭頭或高亮 |
| 5:00 升級 | Lv.5、SP 堆積 | 升級字樣有，但 SP 24 沒人教怎麼花；新技能只有玩家頭上 14px 字 | 升級時在技能鈕上加「！」徽章直到打開技能視窗 |
| 8:00 掉裝備 | 撿到不如現有的裝備 | `pickupEquipment` 比較不好就靜默丟棄，沒提示；好的會自動換，沒有比較 | 撿取提示「頭盔 ATK+4（目前 ATK+6，未換）」；之後做比較（見 U-12） |
| 10:00 想走去下一張圖 | 「右側傳送門」只在對話提過一次 | 傳送門在畫面外，沒有方向提示；小地圖沒有出口標記 | 小地圖畫出口點；任務完成 toast 加「前往：森林獵場 →」 |
| 12:00 迷路 | 不知道星光碎片、星光之塔、守護者在哪 | 塔對話列出守護者名但沒說所在地圖（只說「各地區守護者」）；HUD 只有 n/5 | 塔對話每列加地圖名與等級帶；世界地圖完成後在碎片上標記（另一組） |
| 14:00 死亡 | 失去全部裝備 | 事前無警告、HP 低無警示 | HP<25% 紅暈脈動；首次死亡前先出一次警告（見 U-07） |

---

## 3. 提案表

影響 1~5（5 最大）；工作量 S（<1 小時）、M（半天）、L（一天以上）。

| ID | 提案 | 解決的問題 | 影響 | 工作量 | 涉及檔案 | 需要美術 |
|---|---|---|---|---|---|---|
| U-01 | 修 ESC 同時關對話與開暫停：UIScene 在 `_onEscKeyDown` 用 `scene.get(map)._justClosedDialogAt` 或讓 BaseMapScene 在關對話時 `event.stopPropagation`；同時商店 / 彈窗開著時 ESC 先關彈窗 | bug：每次關對話都跳暫停 | 4 | S | UIScene.js、BaseMapScene.js | 否 |
| U-02 | 目標條（Objective strip）：畫面上方中央 14px 一行，永遠顯示下一步，如「找島嶼義工說話」「擊敗史萊姆 0/5」「前往森林獵場 →」，無任務時依進度指向主線（來源：questManager 的 active 任務 / 最近未接任務 NPC / 世界圖下一張圖） | 開局不知道做什麼、迷路 | 5 | M | UIScene.js、questManager.js、worldGraph.js | 否 |
| U-03 | NPC 頭上任務標記：可接任務「!」黃、進行中「?」灰、可交「?」金，上下浮動 4px；用 24x24 圖，頭上 16px | 玩家找不到 NPC | 4 | S | BaseMapScene.js、assetCatalog.js | 是（見下） |
| U-04 | 真正的「設定」視窗取代按鍵表：音樂 / 音效兩條滑桿（0~100，預設 70/100）、畫面震動 開/關、閃光 開/關、傷害數字 開/小/大、介面大小 標準/大/特大、省電模式（降特效 + 30fps）；按鍵表改成 「操作說明」分頁；全部存 localStorage（try/catch） | 完全沒有設定；無障礙；手機省電 | 5 | M | UIScene.js（`_buildSettingsPopup`）、audio.js、新增 settings.js、vfx.js、quality.js | 否 |
| U-05 | 手機 UI 縮放：觸控裝置且畫布縮放 < 0.8 時，UIScene 全部文字最小字級改為 `ceil(11 / scale)`（844x390 約 20px），彈窗改成「手機版」大字、列間距 52px；技能視窗在 touch 時隱藏觸控層（`setVisible(false)`），關閉時恢復 | 手機看不清、彈窗被按鈕蓋住 | 5 | M | UIScene.js、touchControls.js（hide hook）、main.js | 否 |
| U-06 | 任務追蹤面板加強：寬 160 → 200，字級 10 → 13，每項兩行「史萊姆獵手 0/5」「浮空島嶼 · 史萊姆」；完成時綠色勾、獎勵 toast 字 18px 保留；新增「J / 任務」鈕開任務日誌（進行中 / 已完成 / 未接，附地點與獎勵） | 看不懂去哪、沒有任務紀錄 | 4 | M | UIScene.js、quests.js | 否 |
| U-07 | 危險狀態回饋：HP<25% 螢幕邊緣紅暈（呼吸 1.2s）、HP 條閃爍；MP 不足時技能鈕抖動 + 「MP 不足」小字（HUD 目前沒有 MP 不足的視覺提示）；首次死亡前（HP<25% 第一次）出 3 秒提示「倒下會失去所有裝備，記得喝藥水（A / S）」 | 低血量沒警示、死亡懲罰不透明 | 4 | S | UIScene.js、Player.js | 否 |
| U-08 | 技能與裝備彈窗重排（桌機也一起）：背景面板加深，正文 13px 以上、次要文字 `#cfc2a4` 以上（對比 >= 4.5:1）；技能列顯示實際數字「傷害 160%　冷卻 3s　MP 30　Lv.2→3：+10%」（資料取自 JOBS skills）；未裝備欄位用「—」與格線 | 對比低、技能不顯示真實數字 | 4 | M | UIScene.js、constants.js | 否 |
| U-09 | 存檔指示：HUD 右上聲音鈕旁小「存檔」圖示，存成功閃 1 秒；存失敗（localStorage 不可用）持續顯示紅色「未存檔」並點開說明 | 玩家不知道有沒有存、隱私模式 / iframe 失敗無聲 | 4 | S | UIScene.js、saveGame.js | 是（小圖示，可用文字先頂） |
| U-10 | 存檔碼（取代下載）：「匯出存檔」改為視窗，內含唯讀 textarea 放 base64（約 1~2 KB，`btoa(encodeURIComponent(json))`，前綴 `TL1:` 加簡易 checksum）、「複製」鈕（`navigator.clipboard.writeText`，失敗則 textarea 全選提示 Ctrl+C）、「下載檔案」次要鈕；匯入視窗為 textarea + 「匯入」，也保留選檔。用 DOM overlay（比 Phaser 文字輸入穩，手機可貼上） | Artifact / iframe 下載被擋；現在假成功 | 5 | M | saveGame.js、saveManager.js（`parseSave` 已可吃字串，加解碼）、MenuScene.js、style.css | 否 |
| U-11 | localStorage 不可用時的記憶體後備：`createSaveStore(null)` 時改用記憶體 store，並在 HUD 顯示 U-09 紅色警示 + 每次升級 / 換地圖 toast「目前不會保存，請按匯出存檔碼」 | 無法存檔的環境整局白玩 | 4 | S | saveManager.js、saveGame.js | 否 |
| U-12 | 裝備比較：撿到同部位裝備不自動換，或自動換時 toast 顯示差異「ATK 6 → 9（+3 綠）」「HP 20 → 10（-10 紅）」；裝備視窗每行顯示三項數值與稀有度顏色；不好的裝備提示「已略過：頭盔 ATK+4」 | 靜默丟棄、沒有比較 | 3 | M | Player.js（pickupEquipment）、UIScene.js、equipment.js | 否 |
| U-13 | 觸控技能鈕冷卻環：每顆鈕加 conic 冷卻（CSS `conic-gradient` 或半透明覆蓋）與剩餘秒數；字樣由單字改為 圖示 + 單字（可用 skillIcons 同一組）；MP 不足時鈕變灰 | 手機看不到冷卻、單字難懂（鏢 步 殺 渦） | 4 | M | touchControls.js、style.css、main.js（第 170 行已每幀同步 labels） | 是（可選：技能圖示 DOM 版，已有 38x38 圖） |
| U-14 | 手機版面調整：`SIDE_NEEDED` 150 → 96，使 844x390 的左右黑邊（各 112px）可放控制；跳 / ↓ / 搖桿縮到 unit*2.4；加 `env(safe-area-inset-bottom)`；觸控鈕透明度 0.36 → 0.5 且按下才 0.7；對話框與彈窗 touch 時往上移 40px 避開技能鈕 | 控制蓋住畫面與彈窗、HUD 被擠 | 3 | M | touchControls.js、style.css | 否 |
| U-15 | 畫質渲染：touch 或 DPR>1 時 Phaser `antialias: true`、`pixelArt: false`（只影響縮放濾鏡），CSS 去掉 `image-rendering: pixelated`；先 A/B 與效能比較 | 手繪美術在縮小時鋸齒 | 3 | S | main.js、style.css | 否 |
| U-16 | 前導精簡：教學 9 頁 → 5 頁（故事 2、按鍵 1、技能 / 任務 1、存檔 / 死亡 1）；第一次到達新系統時再用情境提示（第一次升級指向技能鈕、第一次撿裝備指向裝備鈕、第一次 SP>0 技能鈕發光）；提示用 `thief-legend-hints` 記錄已看過 | 教學太長、資訊在錯的時間點 | 4 | M | TutorialScene.js、UIScene.js、新增 hints.js | 否 |
| U-17 | Buff / Debuff 圖示列：HP 條下方 16x16 小圖示，毒（綠）、印記（紅）、煙霧（灰）、無敵 3 秒（金），含剩餘秒數；怪物頭上對應小圖示（已有毒色字，但無持續狀態） | 狀態效果看不見 | 3 | M | UIScene.js、Monster.js、statusEffects.js | 是（見下） |
| U-18 | 無障礙選項：減少動態（關閉螢幕閃光、震動、飄動雲，等級提示改靜態）、色盲友善（怪物攻擊預警改為形狀 + 顏色，如熔岩預警加條紋；HP/MP 條加圖示標籤已有）、可調傷害數字大小 | 暈眩 / 光敏 / 色盲 | 3 | M | vfx.js、mapModifiers.js、Monster.js、settings.js | 否 |
| U-19 | 地圖名稱與小地圖：`_mapText` 移到小地圖內側上緣（y=14，不被裁）；小地圖加傳送門出口（黃色三角）、NPC（綠點）；寬 160 x 100 → 200 x 110（桌機） | 地圖名被裁、不知道出口 | 3 | S | UIScene.js | 否 |
| U-20 | 全螢幕 / iOS 加入主畫面：主選單（touch 時）顯示一次性提示「想要全螢幕？分享 → 加入主畫面」，iOS Safari 偵測（`navigator.standalone` 不存在且 UA 為 iPhone）；Android 全螢幕鈕在主選單也放一顆；直向提示加「仍要直向遊玩」小字（內嵌頁面常被迫直向） | 手機全螢幕 / 內嵌直向 | 3 | S | touchControls.js、MenuScene.js、style.css | 否 |
| U-21 | 觸覺與省電：`navigator.vibrate(15)` 在受傷 / 升級（Android，可在設定關）；省電模式：30fps、關閉粒子與 BGM 高音軌 | 手機回饋與電量 | 2 | S | Player.js、settings.js、quality.js | 否 |
| U-22 | 危險動作確認：暫停選單「存檔並回主選單」已有存檔無需確認，但「匯入存檔」會覆蓋、「新遊戲」已二次確認；匯入需顯示「將覆蓋：Lv.20 晨曦鎮 → Lv.3」確認框 | 匯入誤覆蓋 | 3 | S | MenuScene.js、saveGame.js | 否 |
| U-23 | 難度選項：標準 / 輕鬆（怪物傷害 x0.7）/ 練功（死亡不掉裝備）；不改數值檔，只乘一個全域係數 | 新手與休閒玩家挫折 | 3 | M | constants.js、Monster.js、death.js、settings.js | 否 |
| U-24 | 按鍵重新設定：只開放 技能 4 格、藥水、互動、跳躍；衝突時提示；存 localStorage；預設值按鈕 | 非 QWERTY / 左手玩家、輸入法吞鍵 | 2 | L | Player.js、BaseMapScene.js、UIScene.js、settings.js | 否 |
| U-25 | Boss 戰補強：Boss 血條上方顯示名稱與階段（Phase 1/3），階段轉換 1.5 秒文字 + 畫面提示；Boss 進場前確認框「HP/MP 已滿？Boss 戰中不會存檔」 | 戰前不告知、階段無提示 | 3 | M | BossScene.js、Boss.js、UIScene.js | 否 |
| U-26 | 浮動文字體系：現在有三套（Player `_showNotice` 14px、`_showTransientMessage` 18px、HUD notice 16px），合併為 `ui/toast.js`：右側中段堆疊（最多 3 條）、掉落 / 技能 / 任務各自色與圖示、字級 16px 起、可依 U-05 縮放；`_showTransientMessage` 底板固定 360 寬，長字會溢出 | 提示不一致、被玩家身體遮住 | 3 | M | BaseMapScene.js、Player.js、UIScene.js | 否 |
| U-27 | 存檔槽 3 格：選單「繼續」改成 3 個槽卡片（顯示 等級、職業、地圖、遊玩時間、存檔日期），key 為 `thief-legend-save-v1`（槽 1 沿用）與 `-s2`、`-s3` | 家人共用 / 重來一個職業會覆蓋 | 2 | L | saveGame.js、MenuScene.js | 否 |
| U-28 | 小修正集合：星光之塔對話文字重疊（面板加高 24px）；設定視窗按鍵表欄位右移避免裁切；教學頁文字統一左對齊；左緣傳送門標籤 x clamp 到 >=8；SP>0 時技能鈕發光 | 見 1.2 第 8 點 | 2 | S | BaseMapScene.js、UIScene.js、TutorialScene.js | 否 |

### 需要的美術（英文提示詞，風格：hand-painted chibi，flat #00FF00 green background for sprites）

- U-03 任務標記：`Three small hand-painted quest marker icons in one row on a flat #00FF00 green background: a golden exclamation mark in a rounded bubble (quest available), a grey question mark (quest in progress), a bright gold question mark with sparkles (ready to turn in). Hand-painted chibi game UI, soft shading, thick dark-brown outline, 64x64 each, no text.`
- U-09 存檔圖示：`A tiny hand-painted floppy-disk-like scroll icon with a small check mark, cartoon game UI, warm cream and brown palette, flat #00FF00 green background, 48x48, thick dark-brown outline.`
- U-17 狀態圖示：`Four 32x32 status icons on a flat #00FF00 green background, hand-painted chibi style, thick dark outline: green poison droplet with skull, red target mark crosshair, grey smoke cloud, golden shield sparkle. Readable at 16px.`
- U-13（可選）觸控技能鈕底圖：`Round wooden-rimmed button frame, hand-painted game UI, warm brown wood with gold trim, empty center, 128x128, flat #00FF00 green background.`

---

## 4. 優先順序

### 4.1 快速勝利（各 < 1 小時）

1. U-01 修 ESC 同時關對話與開暫停（bug，影響每位玩家與手機「暫停」鈕）。
2. U-28 小修正集合（地圖名被裁、塔對話重疊、設定表裁切、傳送門標籤）。
3. U-07 低血量紅暈 + 首次死亡警告。
4. U-19 地圖名稱下移、小地圖加出口。
5. U-15 手機關掉 pixelated / 開 antialias（先 A/B）。
6. U-11 localStorage 不可用時改記憶體後備 + HUD 紅色警示。
7. U-09 存檔指示（先用文字「存檔中 / 未存檔」）。
8. U-20 iOS 加入主畫面一次性提示、直向「仍要直向遊玩」。

### 4.2 較大的投資

- U-02 目標條 + U-03 NPC 標記 + U-06 任務日誌：把「下一步」做成系統（最大留存影響）。
- U-04 設定視窗 + U-18 無障礙 + U-23 難度：一次建立 `settings.js`，所有開關由它讀寫。
- U-10 存檔碼：解決內嵌環境匯出，順便成為跨裝置的主要流程。
- U-05 + U-13 + U-14：手機版面一組重做（字級、彈窗隱藏觸控層、冷卻環）。
- U-16 教學改情境提示。
- U-17 狀態圖示、U-12 裝備比較、U-26 提示合併。

---

## 5. 下三次工作的順序

**第 1 次（穩定與信任，約 4 小時）**：U-01、U-28、U-07、U-19、U-11、U-09，然後 U-10 存檔碼（含複製 / 貼上 / 匯入確認 U-22）。結束時：內嵌環境可備份進度，沒有假成功。

**第 2 次（設定與可讀性）**：建立 settings.js，做 U-04（音量、震動、閃光、傷害數字、介面大小）；U-08 彈窗重排與真實數字；U-05 手機字級縮放與彈窗隱藏觸控層；U-15；U-21 省電模式。

**第 3 次（引導）**：U-02 目標條、U-03 標記（先用簡單圖形頂，再補圖）、U-06 追蹤面板與任務日誌、U-16 教學精簡與情境提示；之後 U-12、U-17、U-13。

---

## 6. 不要做（Do not do）

- 不要把 Phaser 彈窗全部改成 DOM；只有存檔碼視窗（需要貼上與複製）用 DOM。
- 不要為所有按鍵做完整重綁（U-24 擺在最後）；先做左右手、輸入法提示。
- 不要加更多鎖在教學裡的頁數；新系統只在第一次遇到時提示一次。
- 不要在技能視窗放長篇說明；只放真實數字與一句話。
- 不要把存檔碼做成加密（只做 checksum 防手滑，反作弊不在本案範圍，與 STATUS 的限制一致）。
- 不要把世界地圖、碎片標記自己再做一份（等 overlay 完成後接資料）。
- 不要把設定寫進 gameState（裝置偏好應獨立存，不隨存檔匯出）。

---

## 7. 給擁有者的問題

1. 死亡失去全部裝備是核心設計嗎？若是，是否接受「輕鬆模式不掉裝備」（U-23）？若否，改為只掉背上、保留已穿戴一件的話玩家流失會少很多。
2. 遊戲會長期放在私有 Artifact 檢視器內嗎？若是，U-10 存檔碼要提升為第一優先，甚至考慮啟動時自動提示備份。
3. 手機是主要平台還是附帶？若主要，願意接受把邏輯畫布加寬（例如 1480x720）讓 HUD 與控制放在畫面外側嗎（較大的改動）。
4. 目前裝備會自動套用較強者：要保留自動，還是改成撿到時選擇？
5. 要不要「新手保護」：Lv.1~5 死亡不掉裝備、第一次對話自動指向傳送門？
6. 是否能接受引入簡單的設定檔 `settings.js`（獨立 localStorage key `thief-legend-settings`）？
7. 美術：U-03、U-17 的小圖示由 AI 生成後是否要統一風格處理（描邊顏色 #3a2410）？

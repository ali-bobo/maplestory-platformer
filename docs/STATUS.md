# 專案狀態盤點與下一步（原 ITERATION5_SPEC）
# 最後更新：Phase 24（怪物 AI：平台感知追擊 + 特殊攻擊）後

---

## 一、文件定位

- 本文件記錄 Iteration 5 的目前真實狀態、已完成項、剩餘缺口與下一步優先順序。
- 若本文件與程式碼衝突，以目前 src 內實作為準，再回補本文件。
- 本文件不再保留已失效的歷史 bug 清單，避免後續改動被過期資訊阻擋。

---

## 二、本輪已完成

### 戰鬥手感：輸入緩衝與土狼時間
- 新增 `src/engine/inputBuffer.js`（純函式，時間由呼叫端傳入）：普攻 / Z X C V 技能 / 跳躍在動作尚不可行時按下，120 ms 內會被記住並在可行動時執行；離開平台邊緣 100 ms 內仍可當作地面起跳（起跳後作廢）。
- `Player.update` 接上：冷卻已好時照舊當幀施放；冷卻中則排隊，冷卻一結束就補放，仍走 `basicAttack` / `castSkill`，所以 MP、冷卻、解鎖判定完全沿用（補放時 MP 不足會丟棄並提示，不會多扣或無視冷卻）。緩衝窗至少一幀長，低 FPS 不會比一幀還短。
- 行為變動：走離平台邊緣後仍保有兩跳（同舊手感）；落地前 120 ms 內按的跳會在著地當幀執行。
- 驗證：`npm test` 357 項（新增 10 項）；`e2e/e2e-feel.cjs`（虛擬時鐘逐幀推進，不受 headless 低 FPS 影響）；`e2e-skills2` 通過，`e2e-jobs` 在機器高負載時有與改動無關的計時類偶發失敗（改動前同樣出現）。

### 戰鬥與畫面強化（2026-10-18）
- 敵方：範圍招放大約 35% 並有地面預警區、新增地面爆發；一般怪 / 小王 / 最終 Boss（32000 HP，階段 70% / 35%）血量與出招頻率調整（`config/monsters.js`、`config/monsterAttacks.js`）。
- 玩家：受擊擊退與短硬直（`engine/knockback.js`）、自然回復減慢並加受傷 / 施法暫停（`engine/regen.js`）、暫停選單「儲存並離開」。
- 畫面：各地圖環境特效（`engine/ambience.js`，每張地圖有粒子預算上限）、地名標題、掉落物光效；全螢幕閃光與震動遵守「減少動態」。

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

### Phase 13：任務系統
- 實作 3 個範例任務（擊殺目標、收集類、探索類）。
- UIScene 右上角任務追蹤 HUD 面板，F 鍵接任務 NPC。
- questManager.js 管理進度，quests.js 定義任務資料。

### Phase 14：副本系統
- DungeonScene：史萊姆洞窟限時波狀關卡。
- dungeonRecord.js 管理每日進入次數上限（localStorage）。
- 副本勝負結算 popup，獎勵掉落。

### Phase 15：效能優化
- HP/MP/EXP 血條改用 `add.rectangle()` + `scaleX`，避免 Graphics earcut。
- 天空背景改用 `add.rectangle()`。
- 選單按鈕 5 個 `add.graphics()` 改為 `add.rectangle()`，hover 用 setFillStyle。
- UIScene 5 個分散 addEvent（100/200/500/1000ms + minimap 200ms）整合為 1 個 100ms 迴圈。
- Monster HP bar 位置快取粒度由 0.5px 放寬至 2px，降低 setPosition 頻率。

### 戰鬥回饋與暫停選單（Phase 15 後段）
- Player 追蹤最近怪物並繪製橙色目標選取框。
- 升級時全屏白閃 + 文字彈跳進場。
- UIScene 新增 ESC 暫停選單（繼續遊戲 / 返回主選單），暫停時停用當前地圖 Scene。

### 存檔系統（Phase 16）
- `src/engine/saveManager.js`：純邏輯（不依賴 Phaser / DOM）。`sanitizeState` 以初始狀態為底，只複製白名單欄位並夾範圍，未知欄位丟棄；存檔格式 `{ format, version, savedAt, state }`。
- `src/engine/legacyIds.js`：改過名的地圖 key / 徽章 id 對照表；`sanitizeState` 驗證前先換成新名，舊存檔（localStorage、匯出檔、存檔代碼）讀回同一張地圖、同樣的徽章（`test/legacyIds.test.js`）。副本每日次數也換了 localStorage key，第一次讀取時把舊 key 的紀錄搬過去（`test/dungeonRecord.test.js`）。
- `src/engine/saveGame.js`：遊戲端介面（`saveGame` / `loadGame` / `hasSave` / `getSaveSummary` / `deleteSave`），底層用 saveManager；另含檔案匯出 / 匯入。相容舊版存檔格式。
- 自動存檔點：抵達地圖（副本 / Boss 除外）、升級、暫停選單存檔並回主選單、每 30 秒、`pagehide` / `visibilitychange`。
- 主選單：繼續遊戲、新遊戲（二次確認）、匯出 / 匯入存檔。通關後可繼續冒險（存檔保留）。
- 死亡規則（`src/engine/death.js`）：結算畫面顯示分數；從死亡點（同一張地圖，副本 → 晨曦鎮、Boss → 暗巷城）重新開始，失去全部裝備，屬性由等級重算，其餘進度保留。懲罰在死亡當下寫入存檔。
- 分數 = 等級 × 100 + 擊殺數 × 10 + 金幣 ÷ 10（通關 +5000），公式集中在 `SCORE_WEIGHTS`。
- 單元測試：`npm test`（`test/saveManager.test.js`、`test/death.test.js`），CI 會執行。
- `?debug=1` 時會暴露 `window.__game`，供自動化測試取得遊戲實例。
- 限制：存檔在玩家端，範圍檢查只防壞檔，不防作弊；分數榜需另做伺服器端驗證。

### 手機支援（Phase 17）
- 縮放：Phaser `Scale.FIT` + 置中，容器 100dvh；`index.html` 補 viewport / PWA meta，樣式移到外部 `style.css`（CSP 的 `style-src` 因此收緊為 `'self'`）。
- 觸控操作層：`src/engine/touchControls.js` 以 DOM 疊在畫布上，把觸控轉成合成的 KeyboardEvent 給 window，Phaser 與既有鍵盤邏輯完全不用改。分「移動區」（搖桿、↓，預設右手）、「動作區」（跳、Z/X/C/V/B、互動 F，預設左手）、頂部列（暫停 ESC、全螢幕、左右互換）；群組以 inline-start 定位，切換 direction 即整組鏡射，偏好存 localStorage。藥水不放按鈕，改為點 HUD 藥水槽（UIScene）；pointer events + pointer capture 支援多指；失焦 / 切背景 / 指標取消一律放開所有按鍵。
- 偵測：`src/engine/device.js` 的 `isTouchDevice()`（`pointer: coarse`，`?touch=1|0` 可強制）。
- 位置：貼齊畫布；兩側黑邊夠寬時放進黑邊，否則疊在畫布內並避開底部 HUD 列。
- 直向顯示「請橫放」；音效在第一次點擊 / 觸碰時啟動；手機預設 medium 畫質。
- 加入主畫面：`manifest.webmanifest` + `icons/`（無 service worker，不提供離線）。
- NPC 提示文字在觸控裝置改為「點互動」；商店面板的關閉字樣可點擊。
- 順手修正：暫停選單開啟後 ESC 無法關閉（既有 bug）；死亡重生加 3 秒保護。
- 注意：上面描述的是「舊式按鈕」模式；預設已改為浮動虛擬搖桿，見下方「手機虛擬搖桿」。
- 測試：`test/mobile.test.js`；Chromium 手機模擬（多指、暫停、失焦、直向）端對端已驗證，**尚未在真機上測試**。

### 手機虛擬搖桿（浮動式）
- 設定 `touchControls`（`joystick` 預設 / `buttons` 舊式；`engine/settings.js`，設定視窗「觸控操作」只在觸控裝置顯示，立即生效）。
- `src/engine/joystick.js`（純函式，`test/joystick.test.js`）：手指位移 → 左 / 右 / 下（按住）與「跳」（單次事件）。閾值全在 `JOY`：水平死區 0.28（離開 0.2，遲滯）、往上用力時水平需 ≥ |ny|×0.5、上推 ≥ 0.6 半徑觸發跳、回到 ≤ 0.35 才重新武裝（二段跳）、快速上滑（220 ms 內上移 ≥ 0.45 且到 ≥ 0.4）、下推 ≥ 0.6 且垂直為主。最大半徑 = 1.3 個 `--tc-unit`（相對畫面高度）。
- `touchControls.js`：移動側半個視窗是感應區 `.tc-joy-zone`（上緣貼畫布頂、下緣讓開 HUD 列，藥水槽仍可點），按下處浮出圓盤；另一側 `.tc-tap-zone` 點一下 = 跳（`↑` 鍵脈衝，帶漣漪回饋）；搖桿的跳走 `Alt` 鍵脈衝（Player 的第二個跳鍵）以免和跳躍鈕 / 點擊互相吃掉。脈衝至少撐兩個動畫幀（Phaser `JustDown` 一幀才讀一次）。仍然送合成 KeyboardEvent，Player 的 `jumpsLeft=2` 與輸入緩衝完全沿用。
- 多點觸控：搖桿只追蹤按下它的 `pointerId`（第二指在同一側不處理）；`pointerup / pointercancel / lostpointercapture / blur / 切背景 / 視窗開啟（setModal）/ 切換模式 / 左右互換` 一律放開所有方向鍵。搖桿模式下動作區在另一側，跳躍鈕併入動作區（`.tc-joy`）；左右互換在搖桿模式存 `thief-legend-touch-joyside`。
- 驗證：`e2e/mobile-joystick.cjs`（844x390、CDP 多指，53 項）；`e2e/e2e-mobile.cjs` 改在 `buttons` 模式跑（舊式按鈕迴歸）。**尚未在真機上測試**。

### 音樂重寫（Phase 18）
- 舊版問題：每張地圖只有 2 小節旋律 + 低音兩個聲部、沒有和弦；直接用方波 / 鋸齒波（高頻泛音多）；每個 8 分音符隨機加重或減弱；旋律與低音各寫各的，Boss / 副本大量使用半音相鄰的音。
- 新架構（`src/engine/music/`）：
  - `theory.js`：音名 / 和弦解析、聲部連接（相鄰和弦移動最少）、旋律記譜（`E5.4 G5.4 r.8`）。
  - `tracks.js`：9 首、每首 16 小節（A 段 + B 段）的樂曲資料。旋律的強拍一定落在當下和弦的和弦音上，低音跟和弦根音，襯底 / 伴奏由和弦自動展開。和弦避開 `maj7`（會與根音形成半音摩擦），改用 `add9` / 屬七。
  - `synth.js`：柔和音色（限制泛音的 PeriodicWave + 低通）、平滑包絡（無爆音）、微走音分左右聲道的襯底、程式生成的殘響、低通 + 輕度壓縮；`MusicPlayer` 提前排程約 1 小節，切換地圖時舊曲淡出、新曲淡入。
- 依地圖設定編曲（每張圖用不同的音階、節奏語彙、音色與空間感，而不只是換速度）：
  | 地圖 | 調式 / 速度 | 音色與節奏 |
  |------|-------------|------------|
  | 浮空島嶼 | C 大調 · 100 | 音樂盒 + 豎琴 + 高音閃爍 + 迴音（飄浮感） |
  | 森林獵場 | G 大調 · 120 · 輕搖擺 | 民謠長笛 + 撥弦 + 手鼓 |
  | 古代廢墟（沙漠） | **A Hijaz** · 92 | 奈伊笛 + 烏德琴反覆音型 + **手鼓 Maqsum 節奏** + 空五度持續音；特徵是 ♭2→3 的增二度 |
  | 神秘之境（精靈） | D 多利安 · 88 | 人聲「啊」主奏 + 豎琴 + 合唱襯底 + 魔法閃爍 + 迴音 |
  | 台北都會 | G 大調 · 112 · 搖擺 | 合成主奏 + 電鋼琴切分 + 彈撥低音 + 流行鼓組 |
  | 暗巷城（夜色） | A 小調 · 84 · 慢搖擺 | 悶音小號 + 顫音琴 + 暗色襯底 + **爵士行走低音** |
  | 晨曦鎮 | F 大調 · 96 | 顫音琴 + 吉他撥奏 + 溫暖襯底 |
  | Boss（暗黑史詩） | E 小調（V 級和聲小調）· 150 | 銅管 + **管風琴襯底** + 低沉持續音 + 16 分音符驅動 + 戰鼓過門 |
  | 副本（陰森洞窟） | D 小調 · 116 | 悶音小號 + 暗色襯底 + 持續音 + 顫音琴空靈琶音 + **心跳低鼓** + 洞穴迴音 |
- 音高分布驗證（相對主音的音級能量）：沙漠版 ♭2 15.7%、大三度 12.5%，自然 2 與小三度 < 1.5%（Hijaz 特徵）；暗巷城 / Boss / 副本以小三度、♭6、♭7 為主；神秘之境出現自然六度（多利安特徵）。
- 效能（離線渲染 20 秒曲子的耗時，數字越小越省）：Boss 10.1 s → 2.7 s、浮空島 5.5 s → 1.5 s（舊引擎：Boss 2.75 s、浮空島 0.95 s）。原因是量測發現「每個音符各帶一個濾波器 / 平移節點」的成本比振盪器本身還高，所以改成一音符一振盪器、濾波與平移放在每種音色共用的匯流排，打擊樂用預先濾波的噪音緩衝。
- 與自適應品質連動：medium 去掉閃爍與沙鈴；low 只留旋律 / 襯底 / 低音 / 大小鼓並關閉殘響與迴音。暫停選單有「音樂：開 / 關」。`?bgm=0` 可停用 BGM 做效能 A/B 比較。
- 排程改成事件逐筆、只排未來 0.4 秒內，不再每小節開頭一次建立上百個節點（會規律掉幀）；音樂內部的例外只記錄、不會影響遊戲。
- 離線渲染量測（新舊對照，9 首平均）：5 kHz 以上刺耳能量 0.60% → 0.12%（原方波曲目 2.8% / 1.8% → 0.006% / 0.15%）、爆音指標 1.18 → 0.67、平均響度 −28 → −25 dB、無爆音；去掉打擊樂後的粗糙度與「純三和弦基準」相同，表示和聲本身一樣協調。
- 測試：`test/music.test.js`（強拍和弦音、無外音、無半音衝突、低音根音、聲部連接平順、循環銜接等 112 項）。
- SFX（打擊 / 技能 / 升級音）沒有改動。

### 新手教學 / 技能欄位 / 聲音開關（Phase 19）
- **普通攻擊與技能（Phase 20 調整後）**：空白鍵 = 近戰揮刀普通攻擊（`Skill.js` 的 `castSlash`，面前 90px 範圍內全部命中、傷害 ×0.9、不耗 MP、冷卻 0.4s、不吃技能等級，常數在 `BASIC_ATTACK_DEF`）；Z = 三連飛鏢技能（耗 MP 10、冷卻 0.5s）。電腦版 ↑ 與 Q 都能跳躍（舊版預設 Alt，因為 Alt+← 會觸發瀏覽器上一頁而改掉；仍可在按鍵設定指定 Alt）。
- **技能欄位**：盜賊技能池 5 個（Z X C V B；刺客 / 俠盜各 6 個，見下方 Phase 21），欄位 4 格（Z X C V 快捷鍵 / 手機四顆鈕），另有固定的普通攻擊欄（ATK，空白鍵）。欄位內容存在 `gameState.skillSlots`（`constants.js` 的 `SKILL_POOL` / `SKILL_SLOT_KEYS` / `skillForSlot` / `canReorderSkills` / `equipSkill`）；5 個技能全部解鎖（Lv.20）後可在 HUD 拖曳互換，或在技能視窗對沒裝備的技能按「換入」再選欄位。存檔驗證 `skillSlots` 必須是 4 個不重複、已解鎖的技能池成員，且未全部解鎖時一律回預設（`saveManager.js`）。
- **新手教學**（`TutorialScene`）：9 頁——故事 4 頁（晨曦之星被暗影魔君擊碎，你是被託付奪回星光的盜賊「影子」）、操作按鍵（電腦 / 觸控兩種版本）、技能與欄位、任務系統、畫面 / 存檔 / 死亡、出發。Enter / → 下一頁，← 上一頁，Esc 跳過全部；手機點畫面繼續、點「跳過全部」。首次新遊戲自動出現，看過 / 跳過後記在 localStorage（`thief-legend-tutorial-seen`）；暫停選單「操作說明」可用浮層重看（浮層模式 Esc 只關說明）。修正：教學按 Esc 跳過時同一個按鍵事件會被剛啟動的遊戲 UI 再收到一次而彈出暫停選單（UIScene 啟動 0.6 秒內忽略 Esc）。
- **聲音開關**（`engine/soundButton.js`）：主選單、教學、遊戲 HUD（小地圖左側）與暫停選單都有；全域靜音同時關閉音樂與音效，設定存 localStorage（`thief-legend-sound`）。
- **手機沒聲音的修正**：音訊啟動改監聽 `pointerup / touchend / click / keydown`（觸控裝置上 `pointerdown` 不算有效手勢），確認 context 真的在跑才移除監聽；切回分頁重新啟動（iOS 會打斷）；iOS 16.4+ 設 `navigator.audioSession.type = 'playback'` 避免被靜音鍵擋住。尚未在真機驗證。
- **手機版面**：跳躍與「↓」移到右手側、搖桿上方（和移動同一隻手）；左手側是普攻、四個技能鈕（字樣依技能欄位更新、鎖定的變暗）與互動；教學期間隱藏觸控層。

### 系統優化與內容規劃（Phase 20）
- **背景圖改 WebP**：9 張場景背景與標題背景由 PNG（12.7 MB）轉為 WebP（0.9 MB，q84），`dist/assets` 由約 15 MB 降到約 3 MB，行動網路首次載入明顯變快；畫面肉眼無差異。（`assetCatalog.js` 路徑已更新，原 PNG 不再放 repo，需要時可從 git 歷史取回。）
- **內容完整性測試**（`test/content.test.js`）：怪物 id 唯一、spriteKey 有素材、地圖的怪物 / 背景 / 傳送門 / NPC / 任務引用存在、所有任務都有 NPC 發放、素材目錄的檔案都真的存在。之後新增地圖 / 怪物接錯會在 `npm test` 直接報錯。
- 新文件：[`ROADMAP.md`](ROADMAP.md)（轉職系統 / 新地圖 / 特別任務設計與開發順序）、[`ASSET_REQUEST.md`](ASSET_REQUEST.md)（交給 AI / 畫師的素材需求書）。

### 轉職系統階段 A（Phase 21）
設計見 [`SKILLS_DESIGN.md`](SKILLS_DESIGN.md)、[`ROADMAP.md`](ROADMAP.md) 第二節；Lv.10 一轉成「刺客（暗夜之刃）」或「俠盜（赤焰劫客）」。

- **職業資料模型**（`config/constants.js`）：`gameState.job`（`thief` / `assassin` / `bandit`，預設盜賊）、`title`、`jobChoice`（轉職任務中選定、覺醒前暫存）。`JOBS` 表含名稱 / 稱號 / 技能池與各職業解鎖等級 / 預設欄位 / 普攻參數（`basic`）/ 被動（`passives`）/ 頭像；`skillDefOf(job, id)`、`jobOf(gs)`、`effectiveCritMulti`、`jobPassive` 等查表函式。盜賊技能 id 仍是 Z X C V B，專屬技能 id：`backstab poison mark`（刺客）、`whirl steal smoke`（俠盜）。技能欄「可調整」的條件由「5 個全解鎖」泛化為「解鎖的技能多於 4 格」（盜賊結果相同）。
- **存檔**（`saveManager.js`）：未知職業 → 盜賊；未達 Lv.10 不承認轉職職業；稱號由職業決定；技能 id / 欄位只認該職業池且需已解鎖；`jobChoice` 只在盜賊時保留。`engine/jobChange.js`：`applyJobChange`（保留繼承技能等級、池外技能退還 SP、專屬技能依等級解鎖、欄位改預設、+5 SP、悍匪體魄一次性 maxHp ×1.2）、`debugSetJob`。
- **外觀**：`config/poses.js` 的 `poseKey(job, pose)`（盜賊 `player_<pose>`，轉職 `player_<job>_<pose>`，缺圖退回盜賊）；`Player.pose(name)` 以快取查表（無每幀字串配置）；影分身跟著玩家職業換圖。HUD 頭像 / 職業名（含稱號）/ 普通攻擊欄名稱與圖示 / 技能欄 / 技能視窗（六列 + 被動說明）跟著職業；手機技能鈕字樣已補新技能。刺客 23 個、俠盜 23 個動作圖與兩張頭像已進 `assetCatalog` 並全部預載。
- **職業技能**（`entities/JobSkills.js`，狀態規則在 `engine/statusEffects.js`，皆有單元測試）：
  - 刺客：雙刃連斬（兩段 0.55×、暴擊率 +10%）、瞬影連刺（瞬移背後連刺 3 下必暴擊）、蝕心毒鏢（0.7×，中毒 5 秒、每秒 0.25×、最多 3 層，毒不會引爆印記）、斷命印記（6 秒內下一擊必暴擊 +30%，`Monster.takeDamage` 統一處理所有傷害來源）、殺手本能（暴擊傷害 +30%）。
  - 俠盜：彎刀橫斬（110px、1.1×、每連 3 下第 3 下擊飛）、赤月迴旋（半徑 120 全體 1.2× 並擊退）、妙手空空（1.0×，35% 多掉金幣、5% 偷到藥水）、迷煙彈（落點 5 秒煙霧：範圍內怪物傷害 -50%、非遠程怪不追擊）、悍匪體魄（HP +20%、金幣 +15%）。
  - 沒有目標時（瞬影連刺 / 斷命印記 / 妙手空空）退還 MP 與冷卻。9 組 `fx_*` 特效全部啟用（`FX_ASSETS` 皆 `used`）；橘 / 綠 / 灰色特效改用一般混合，亮背景才看得見（`playFx` 的 `normal` 選項）。
  - 技能圖示：新技能與刺客 / 俠盜普攻圖示是**程式繪製的暫代圖**（`assets/skillIcons.js`）；手繪 PNG（38×38，`skill_icon_<id>.png`，普攻欄 `ATK_assassin` / `ATK_bandit`）到位後把 id 加進 `assetCatalog.js` 的 `SKILL_ICON_PNG_IDS` 即會預載並取代。
- **轉職任務鏈**（`config/quests.js` 的 `JOB_QUEST_CHAIN`）：影之召喚（`talk`，城鎮居民轉交神祕信，Lv.10 才能接）→ 選擇你的道路（`choice`，影之長老對話選職業）→ 試煉之證（`collect`，在浮空島嶼 / 森林獵場 / 古代廢墟擊殺怪物 40% 掉落任務物品，收集 5 個）→ 影之試煉（`dungeon`）→ 覺醒（`talk`，`rewards.advanceJob`）。任務新增 `minLevel` / `requires`（前置）欄位；`questManager` 新增 `questAvailable`、`onNpcTalked`、`onItemCollected`、`onDungeonCleared`、`chooseJobPath`、`questItemDrop`，覺醒時呼叫 `applyJobChange` 並發出 `job-changed`，由 `BaseMapScene._onJobChanged` 換外觀、播放 `fx_job_change` 光柱演出、顯示稱號並自動存檔。
- **影之試煉的做法**：沿用既有副本機制，新增副本 `shadow_trial`（限時 150 秒（Phase 24 起）、單波：試煉守衛 `shadow_guardian`（小王）+ 2 隻影子史萊姆，通關觸發任務完成，失敗可重試）；入口是影之殿堂右端傳送門（Phase 22 前在晨曦鎮），`requiresQuest: 'job_trial'`，沒接任務進不去；副本的 `returnMap: 'shrine'`，結算後回到影之殿堂。
- **NPC 對話選項 UI**：`engine/npcDialog.js`（純邏輯）依任務進度產生對話內容與選項；`BaseMapScene._openNpcDialog` 支援選項按鈕（點擊或按 1 / 2，手機點擊）。影之長老已換成正式 NPC 圖 `npc_shadow_elder`。
- **除錯**（`?debug=1`）：`window.__setJob('assassin' | 'bandit' | 'thief', level)` 直接設職業與等級（不播演出）；`window.__QUESTS` 可調整任務參數。
- **驗證**：`npm test`（含 `jobs` / `statusEffects` / `jobQuests` 單元測試與 `content.test.js` 的任務 / NPC / 傳送門 / 素材交叉檢查）；Playwright e2e 涵蓋兩個職業各技能施放（MP / 冷卻 / 傷害 / 姿勢）、被動、存檔重讀、以及真實走完整條轉職任務鏈。

### 新地圖：影之殿堂與碧濤港（Phase 22）
- **地圖連接**：浮空島嶼 ⇄ 晨曦鎮 ⇄ **影之殿堂**（晨曦鎮最右邊的傳送門）；主線 浮空島嶼 → 森林獵場 → **碧濤港** → 古代廢墟 → 神秘之境 → 暗巷城（台北都會支線不變）。依 ROADMAP 第三節把碧濤港插在森林與廢墟之間（森林右端傳送門改指碧濤港、廢墟左端改回碧濤港）；`docs/WORLD_DESIGN.md` 的草圖把碧濤港放在廢墟之後，與 ROADMAP 不同，目前以 ROADMAP 為準。`test/content.test.js` 新增「從起始地圖沿傳送門能到每張地圖」「傳送門成對」「落點在目標地圖範圍內且每張地圖有曲目」。
- **影之殿堂**（`shrine`，`ShrineScene`）：一個畫面寬（1280）、不捲動、無怪物；背景 `bg_shrine`（單圖 cover，不平鋪）。NPC：影之長老（轉職任務鏈，從晨曦鎮搬來，任務 id / `role: 'jobAdvisor'` 對話邏輯不變）、技能導師（`npc_skill_mentor`，`role: 'skillMentor'`：固定說明 + 依職業 / 剩餘 SP 的提醒；專案目前沒有技能重置功能，所以導師只提示）。右端是「影之試煉」副本傳送門（`requiresQuest: 'job_trial'`），左端回晨曦鎮。音樂：D 大調、80 BPM、無鼓的 `shrine` 曲目。
- **碧濤港**（`harbor`，`HarborScene`，Lv12–18）：寬 2560、三層木棧橋（y=450 / 330 / 210）+ 地板；怪物 螃蟹 / 水母 / 海盜幽靈 / 章魚 / 海鷗 + 小王「海盜船長」（`pirate_captain`，Lv18、hp 3200、atk 105，約為同圖最強小怪的 4.6 倍血量）。數值接在古代廢墟同級怪之後（見 `monsters.js` 註解）。章魚用既有的 `ranged` 行為（保持距離噴射）。NPC：碼頭工人（`harbor_crabs` 擊殺螃蟹、`harbor_sailor` 對話型）、老水手（`harbor_captain` 擊殺海盜船長，需先完成 `harbor_sailor`）。音樂：D 混合利地亞（`theory.js` 新增 `mixolydian`）、126 BPM、搖擺 oom-pah 低音的水手號子 `harbor` 曲目。平台圖 `platform_harbor`（`surfaceTop: 3`）。
- **引擎限制**：沒有飛行 / 漂浮行為，怪物一律受重力。水母用 `patrol` + 頻繁小跳（像浮沉）、海鷗用 `chase` + 高跳（像拍翅俯衝）近似。「水面平台較滑」「可上下的船桅」（ROADMAP 的特色機制）沒有做。
- **素材登記**：`assetCatalog.js` 新增 `bg_shrine`（targetMaps shrine）、`bg_harbor`、`platform_harbor`、6 個怪物 / 小王圖、2 個 NPC 圖（皆 `used`）；`npc_skill_mentor` 由 `unused` 改 `used`。副本定義新增選用欄位 `returnMap`。
- **驗證**：`npm test` 183 項；Playwright：兩張新地圖載入無頁面錯誤、截圖檢視、走傳送門往返、每種港灣怪生成並擊殺、小王生成、三個港灣任務接取到完成、完整轉職任務鏈（`e2e-quest.cjs` 改為走晨曦鎮 → 影之殿堂）、`e2e-jobs` / `e2e-skills2` / `e2e-mobile` 迴歸。

### BGM 音效品質（舊版，已被 Phase 18 取代）
- audio.js masterGain 隔離：每次 playBgm 建立獨立 GainNode，消除地圖切換音頻殘留。
- stopBgm 10ms 線性漸出舊 GainNode，避免爆音。
- 加入 4 段句子動態 [1.0, 1.0, 0.68, 0.92] + 拍點強弱（downbeat ×1.35, off-beat ×0.82）。
- 鋸齒波泛音截止頻率從 freq×4 降為 freq×2.5，Q 從 0.8 降為 0.4，減少刺耳感。

---

## 三、目前版本基線

### 已可依賴的內容
- 主線流程可從主選單進入並進行戰鬥。
- 主要地圖、Boss 進入、死亡 / 勝利結算可運作。
- 技能冷卻 HUD、裝備掉落、HP / MP 自動回復、Boss 解鎖條件已接入。
- WebGL renderer 與 rexUI 已就位，可作為下一輪技能特效與 UI 開發基礎。

### 已知仍待補強
- ~~Boss 第三階段狂暴視覺~~（2026-10-17 已做：狂暴姿勢與背景）

---

## 四、目前差距分析

### 高優先
（Phase 15 已清空：ESC 暫停選單、目標選取框、Level Up 演出皆已完成）

### 中優先
1. ~~Boss 第三階段缺少狂暴視覺層~~（已做：狂暴姿勢與背景）
2. 玩家姿態變化仍以單圖加 transform 模擬為主，尚未做到完整姿勢差異。
3. 視差背景目前是單層基礎版，仍有空間擴充為多層。

### 低優先 / 加值
1. 藥水經濟平衡（商店已接入主流程，可由 sky 傳送門進入）
2. 魔法陣通用效果與更多技能後製

---

## 五、下一步建議順序

### 下一批建議
1. ~~Boss 第三階段狂暴視覺~~（已做）；技能特效升級。
2. 藥水經濟平衡。
3. 分數榜（需要後端服務與反作弊策略，見 TODO）。

### 技術原則
- 新技能特效優先建立在 WebGL pipeline 與現有 ProceduralAssets 上。
- 介面型能力優先使用 rexUI，不再手刻重複容器與互動行為。
- 若規格與實作不同步，先允許功能落地，再於同輪更新文件。

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
- ✅ 地圖切換（sky→ruins→alley，雙向）
- ✅ UIScene HP/MP/EXP 條 + 技能快捷列 + 冷卻顯示
- ✅ GameOverScene（死亡結算）
- ✅ Boss 場景（BossScene + Boss.js 3 階段）
- ✅ 傳送門雙向通行 + spawnX 修正（不再回到地圖起點）
- ✅ HP 自動回復（每秒 +5）
- ✅ 掉落物 30 秒後消失
- ✅ Boss killCount >= 60 解鎖機制（任何等級均有效）


---

## 世界重整（Phase 23，依 `docs/WORLD_DESIGN.md`）

### 階段 1：世界骨架與星光碎片主線（已完成）
- **地圖圖**：浮空島嶼 → 森林獵場 → 古代廢墟 → 碧濤港 → 黃沙遺跡 → 霜牙峰 → 熔岩巢穴 → 魔君王城 →（星光之塔點亮後）暗影領域。支線：森林獵場中央傳送門 → 神秘之境（死路）；晨曦鎮 →（Lv18，`portal.minLevel`）暗巷城 ⇄ 台北都會。傳送門連接由 `engine/worldGraph.js` 從 maps.js 推導（世界地圖用同一份）。
- **等級上限 50**（`MAX_LEVEL`）；每級 HP+20 / MP+12 / 攻擊+5 / 速度+2（上限 320），Lv50 仍在存檔夾限內。
- **星光碎片**：`config/shards.js`（5 個守護者 → 碎片 id）、`engine/shards.js`（取得 / 點亮塔 / 塔對話）。守護者 100% 掉落、每存檔一次、會被玩家吸過來；存檔欄位 `shards`、`towerLit`、`visitedMaps`（皆驗證）；`bossUnlocked` 只在 `towerLit` 或舊存檔已為 true 時成立（grandfather）。集滿 5 塊換稱號「星光守護者・職業稱號」；HUD 左下顯示 5 顆星與 n/5。
- 晨曦鎮**星光之塔**（`prop_star_tower.png`）：F 鍵看進度，5/5 播 `fx_star_restore` + 光芒並解鎖 Boss；Boss 傳送門在魔君王城右端。Boss 房死亡 / 讀檔回魔君王城（`BOSS_FALLBACK_MAP`）。
- 碧濤港數值改為 Lv14-20、小王 Lv22；森林蛇、神秘之境三種怪、暗巷城 / 台北的怪調整到所屬等級帶（content.test 檢查）。
- `portal.minLevel` 擋下時顯示「需要 Lv.N 才能進入」。

### 階段 2：四張新地圖（已完成）
黃沙遺跡 Lv20-26（流沙：地面區域移速 -40%）、霜牙峰 Lv25-31（冰面滑行）、熔岩巢穴 Lv30-36（地面四區每 5.2 秒預警 1.4 秒後噴發 1 秒，最大 HP 5% 傷害，平台上安全）、魔君王城 Lv35-42（暗角視野 + 燭台）。各 5 小怪 + 1 守護者（hp 約同級小怪 8.5-9.4 倍、Lv = 帶上限 + 2）、2 NPC（1 任務發放、1 區域商店）、3 個任務、專屬 BGM。機制在 `engine/mapModifiers.js`（純邏輯 `mapModifierLogic.js`）。商店通用化：`config/shops.js`、`engine/shop.js`，商店畫面移到 BaseMapScene。數值公式與偏離：hp≈0.8×45·Lv(1+Lv/50)、atk≈5Lv+0.04Lv²（Lv30 起 ×0.92）、meso≈2.9·Lv（設計文件的 0.6·Lv 與既有曲線不符，採既有曲線）。
- 驗證：Playwright 走完整條主線傳送門、四個守護者各掉一塊碎片、冰面滑行 / 流沙 ×0.6 / 岩漿扣血、每張新圖截圖無頁面錯誤；e2e-skills2 / mobile / jobs 通過；e2e-quest（已改成影之殿堂流程）通過。

---

## 當機排查：記憶體與效能（素材分批載入）

**量測**（無頭 Chromium + SwiftShader，`e2e/soak.cjs`，7-8 分鐘、走遍所有地圖 / Boss / 副本、換職業、死亡、連打技能、音樂開）：

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 開機（主選單）紋理數 / 解碼像素 | 335 張 / 79 MB | 105 張 / 8 MB |
| 開機 JS 堆積 | 78 MB | 22 MB |
| 進遊戲後紋理 / 像素 | 455-463 張 / 81 MB | 245-276 張 / 25-31 MB |
| 浸泡堆積（暖機後） | 85.6 → 86.5 MB（平） | 42.3 → 43.8 MB（平） |
| 開機到主選單（負載高的機器，僅供參考） | 4.6-7.4 s | 1.8-4.2 s |

**根因**：沒有找到無限成長的 JS 洩漏（堆積、監聽器、計時器、音訊節點浸泡下都持平）。真正的風險是常駐量太大：開機一次解碼 15 張背景（原圖 1376x768，之後又複製成 canvas 縮圖）、三個職業全部動作圖、所有怪物 / 特效，並且每張怪物圖還有一份去背副本；手機 / iframe 分頁因此容易被回收。另外 WebGL context 遺失時沒有任何處理（白屏）。

**修正**：素材目錄加 `scope` 標籤（boot / core / job / map / lazy），`engine/assetPlan.js` 從地圖資料推出清單，`engine/assetLoader.js` 負責載入（超過 150 ms 才顯示載入條）與釋放；`BaseMapScene.preload` 載入本地圖 + 目前職業 + 共用特效，進圖後釋放不需要的（相鄰地圖保留並背景預載），換職業時載入新職業、2 秒後釋放舊的；dark-vignette 只在魔君王城建立；`engine/contextGuard.js` 處理 context 遺失（存檔、提示、重新載入鈕）；分頁隱藏時暫停音訊；音效同時發聲上限 28。

**未處理 / 風險**：每次命中仍建立 Text 傷害數字（Monster.js 非本次範圍）；120 Hz 螢幕會以 120 FPS 繪製（Phaser 的 `fps.limit` 會在 60 Hz 螢幕誤砍半，沒有啟用）；devicePixelRatio 不影響（畫布固定 1280x720）。

### 階段 3：世界地圖與傳送（已完成，Phase 24）
- **支線岔路**：神秘之境（森林獵場）、影之殿堂與城市特區（晨曦鎮）的入口從地面中間搬到**右上角跳台**（金色傳送門 + 路牌 + 「按 F 進入」提示）；`portal.interact`：站上去還要按互動鍵（F / 觸控「互動」）才進入，走地面、跳躍落在門上都不會誤入。晨曦鎮的史萊姆洞窟也改成要按 F。主線傳送門維持在地圖兩端、走過去就進。細節與每張圖的位置見 [`WORLD_DESIGN.md`](WORLD_DESIGN.md) 第八節。
- **世界地圖浮層**（`src/ui/WorldMapOverlay.js` + 純邏輯 `engine/worldTravel.js`）：HUD 右上「地圖」鈕（聲音鈕左邊）、底部「地圖」鈕、按 M 開啟；10 個主線節點照底圖路線、4 張支線在側欄；目前所在 / 已解鎖 / 鎖定三種狀態；選取後顯示名稱、等級帶、傳送費，再點一次或按「傳送」出發。傳送費晨曦鎮與影之殿堂免費，其餘 30 + 20 × 等級；副本 / Boss 房 / 附近有怪 / 錢不夠 / 沒去過 / 等級不夠 / 目的地是暗影領域都會被拒絕。素材（`ui_world_map`、三個節點圖示）早已登錄在 `PROP_UI_ASSETS`，沒有特殊載入。
- **驗證**：`test/worldTravel.test.js`（節點對應、費用、狀態、傳送檢查、支線入口位置與可達性）；`e2e/world/s4.cjs`（用真實按鍵從地面跳上每個岔路、確認走地面不會誤入、按 F 進入、開浮層、點節點傳送、扣費、副本中拒絕）。

### 職業技能調校與試煉守衛（Phase 24）
- **技能平衡**：數字見 [`SKILLS_DESIGN.md`](SKILLS_DESIGN.md) 第八節。倍率集中在 `config/skillModel.js`，執行期（`Skill.js` / `JobSkills.js`）與平衡模型（`engine/damageModel.js`，純函式）共用；`test/damageModel.test.js` 鎖定設計意圖（專屬技能每 MP / 每冷卻秒 ≥ 繼承技能、轉職普攻 ≥ 盜賊 ×1.3、MP 撐得過 10 秒但不是無限），`e2e/balance.cjs` 在遊戲內實測。斷命印記（2026-10-17 重做）落印一斬，7 秒內每擊必暴擊並存 25%，時間到或目標死亡時從天而降斷命重斬（範圍、2.5 倍 + 存下的傷害）；毒鏢（2026-10-17 重做）一次 2 支穿透鏢、每層每跳 0.4，疊滿 3 層毒爆並擴散；迷煙彈 7 秒、半徑 150、傷害 ×0.4 並每秒受傷；赤月迴旋三圈 + 回血；妙手空空兩連擊 + 回 MP；殺手本能 +8% 暴擊率 / +40% 暴擊傷害；悍匪體魄 HP +30%（升級也成長）、減傷 10%、金幣 +25%。
- **試煉守衛**：Lv10 盜賊原本 2 秒（穩健打法）～ 9 秒（只用普攻）就能打倒 1400 血的守衛，整場副本 6～15 秒。調整為 hp 46000 / atk 40、限時 150 秒、獎勵 700 exp + 1000 金幣、每日 10 次。`e2e/trial.cjs` 實測（機器人不會閃躲，Lv10 盜賊 hp 580 / atk 115，各打法 4 場）：
  - 穩健（普攻 + 三連飛鏢 + 藥水）：守衛倒下 45～51 秒（平均 47.5），整場通關 48～55 秒，4/4 通關，過程最低血量平均 250/580；
  - 只用普攻 + 藥水：4/4 失敗（撐不過）；莽撞（不喝藥）：2/4 通關，最低血量 9～293。
  - 為什麼血量這麼大：三連飛鏢每 10 MP 約 480 傷害，Lv10 的 MP 池 358 + 每秒回 10，持續輸出從約 1000 DPS 降到約 500 DPS；原本 1400 血守衛（穩健打法 2 秒、只用普攻 9 秒就倒、整場 6～15 秒）對這套打法完全沒有挑戰。守衛的血量 / 攻擊不吃玩家等級或副本縮放（直接用 `monsters.js` 的數字）。
  - 小王血條（Monster.js）比例正確（scaleX = hp / maxHp），但寬度上限 64px、高 5px 太小，修法見 TODO。

### 階段 3：世界地圖與傳送（**未完成**，見 TODO）


---

## 怪物 AI 與攻擊招式（Phase 24）

### 修掉的兩個卡住問題
- **Boss 在低矮平台下左右抖動**：根因是怪物對「薄平台」用一般 collider（四面都擋），暗影魔君身體 180px 高、Boss 房第一層平台離地只有 156px，走到平台下方就被側面 / 底面卡住並被物理推擠，加上追擊只靠 `|dx|` 死區 + 巡邏切換，方向每幾幀翻一次。現在 `BaseMapScene._setupColliders` 讓怪物對薄平台單向碰撞（只從上方落下才擋，用上一幀腳底判斷），BossScene 不再替 Boss 另加一組 collider。
- **玩家在同 x 不同樓層時怪物呆站**：舊的 `_doChase` 在 `|dx| < 12` 時直接停下，從不處理垂直落差。現在追擊走 `engine/aiLogic.js` 的 `steer()`：依 `engine/platformGraph.js`（每張地圖建一次的平台圖 + 依起跳能力分級的下一步表）決定走去哪個邊緣 / 起跳點、要不要跳、要不要走下去；方向有 380ms 承諾 + 到位死區遲滯；卡住會先跳再繞路；到不了超過 1.2 秒就改用能打到別層的招式（遠程 / 俯衝 / 撲擊），沒招就巡邏，不會呆站。寬身體的怪（Boss）會考慮重心要完全離開平台、地圖邊界擋住的那一側改走另一側出口。

### 架構
- `config/monsterAttacks.js`：每隻怪的招式清單（id → 家族預設 → behavior 預設）；守衛帶 `phases`。不動 `monsters.js`。
- `engine/aiLogic.js`、`engine/platformGraph.js`：純函式（steering / 選招 / 冷卻 / 傷害 / 階段 / 判定幾何 / 平台圖），`test/monsterAI.test.js` 測。
- `entities/monsterAI.js`：`MonsterBrain`（每隻怪一個；前搖 → 出招 → 收招，用時間累加推進，沒有 tween / timer）+ `ProjectilePool`（每場景一個、容量 32、不用 physics collider，場景 shutdown 時銷毀）+ 一次性建立的程序紋理（`ai_*`）。
- 前搖預警：頭上驚嘆號 + 閃紅 + 地面圈 / 衝刺軌跡 / 彈幕蓄力光球；重擊前搖至少 400ms；前搖中被打會中斷（小王 / Boss 有霸體，出招中不會僵直）。
- 召喚的小怪不給經驗 / 掉落、不重生、不算任務擊殺（id 加 `#minion`），召喚者死亡時一起消失。

### 招式一覽
| 招式 | 說明 | 使用者 |
|------|------|--------|
| charge 衝撞 | 預警軌跡 → 衝刺 → 硬直 | 岩牙野豬、廢墟騎士 / 猛獸、暗夜猛獸、龐克 / 混混 / 流氓、冰原狼、火焰獵犬、企鵝（滑行）、毒眼鏡蛇（短）、沙漠盜賊、暗黑騎士、夜市扒手 |
| slam 跳躍震地 | 跳向玩家、落地小範圍傷害 + 左右兩道地面衝擊波（要跳過） | 石柱魔像、廢墟巨人、石頭精、雪怪、熔岩魔像、石像鬼、機械領袖、海盜船長、冰霜巨人、熔岩龍、Boss 第 2 階段 |
| pound 範圍重擊 | 腳下紅圈擴大 → 爆發（跳高可躲） | 怒木精、獨眼怪、石頭精、廢墟巨人、木乃伊、熔岩史萊姆、暗黑騎士、沙塵巨蟲、冰霜巨人、墮落騎士團長、試煉守衛、Boss |
| shoot 遠程 | 瞄準（含高低差）的投射物；箭 / 骨 / 冰錐 / 火球 / 毒液 / 砲彈 / 暗影彈，可多發扇形、可拋物線 | 雲端精靈、骷髏、古代惡靈、小藍龍、飛魚寶箱、巡邏空拍機、水母、章魚、仙人掌、沙漠盜賊、雪人、冰晶怪、雪怪、火焰小鬼、餘燼精靈、小惡魔、吸血鬼；所有守衛 |
| kite 後跳再射 | 往後跳、落地連射 | 空拍機、飛魚寶箱、章魚、火焰小鬼、小惡魔、夜市扒手 |
| burrow 潛地突襲 | 鑽進地下（無敵）朝玩家滑行 → 地面標記 → 竄出 | 沙蟲、沙漠蠍、螃蟹、沙塵巨蟲（第 2 階段連續兩次） |
| dive 俯衝 | 懸空預警 → 直線撲向玩家（可上下樓層） | 浮雲鳥、海鷗、吸血蝙蝠、海盜幽靈、古代惡靈、吸血鬼、石像鬼、熔岩龍 |
| summon 召喚 | 魔法陣 → 召喚小怪（有上限） | 機械領袖、海盜船長（幽靈）、沙塵巨蟲（沙蟲）、冰霜巨人（雪人）、墮落騎士團長（暗黑騎士）、試煉守衛（影子史萊姆）、Boss |
| rain 天降落彈 | 地面標記 → 彈幕從上落下 | 海盜船長 / 冰霜巨人 / 熔岩龍 / 墮落騎士團長（第 2 階段）、Boss（第 2 階段） |
| burst 環狀彈幕 | 蓄力 → 環狀發射 | 熔岩龍 / 墮落騎士團長（第 2 階段）、Boss（第 3 階段） |
| leap 撲擊 | 追不到玩家（在別層）時才會用的保底招式；沒有其他能打到別層招式的怪自動補上 | 所有沒有遠程 / 俯衝的怪 |

### 守衛與 Boss
- 海盜船長：彎刀衝刺、錨擊（震地 + 衝擊波）、砲擊（三連拋物線）／第 2 階段（< 50%）+ 召喚幽靈、落砲。
- 沙塵巨蟲：潛地突襲、噴沙（三連）、震地／第 2 階段 + 連續潛地、召喚沙蟲。
- 冰霜巨人：冰錘震擊、冰錐扇、暴風雪重擊／第 2 階段 + 落冰、召喚雪人。
- 熔岩龍：龍息五連火球、俯衝、尾擊震地／第 2 階段 + 隕石雨、環狀火球。
- 墮落騎士團長：騎士衝鋒、劍氣三連、召喚暗黑騎士、重擊／第 2 階段 + 劍雨、環狀劍氣。
- 試煉守衛（影之試煉）：暗影突襲、暗影彈三連、暗影重擊／第 2 階段 + 召喚影子史萊姆。
- 暗影魔君（最終 Boss）：階段 1 重擊 / 暗影彈 / 衝刺；60% 進入階段 2（咆哮 1.3 秒、全螢幕閃光、光環、清彈幕、先召喚）+ 召喚 / 暗影雨 / 震地；30% 進入階段 3（紅色狂暴、加速 ×1.4、傷害 ×1.25）+ 環狀彈幕。血條相位線修正為 60% / 30%；血量 28000（舊 10000 太脆）。

### 驗證
`npm test`（269 項）；`e2e/ai.cjs`：Boss 8 種站位無抖動、上下樓層 3 類怪不呆站、每種招式出手並造成傷害 / 投射物、守衛 / Boss 階段切換、機器人玩家難度抽樣（見 e2e/README.md）。

## 已有美術接線與小 bug 修正（Phase 25）

- NPC 任務標記（`ui_quest_mark / ing / done`）、殿堂專屬跳台、飛鏢旋轉動畫、漩渦動畫、三職業待機呼吸（影分身同）、死亡倒地姿勢都已接上；`item_boots.png` 本來就已登錄。`fx_shuriken` / `fx_vortex` 改走 `core` 範圍（原本標 lazy 沒人載入）。
- 修正：暗殺無目標退款；跳躍專用音效、受擊音效、擊殺音效；守護者血條加大；遠處怪物血條在 (0,0)（`NaN` 快取初值 + 畫面外不更新）；魔君王城亮圈放大。
- 新增測試 `test/artwiring.test.js`（任務標記狀態、待機選格、素材範圍）。

## 玩家體驗系統（UX 審查 U-01 ~ U-15 的一部分）

依 `docs/design/ux-onboarding.md` 實作的玩家面向系統；e2e 在 `e2e/ux.cjs`，單元測試 `test/saveCode.test.js`、`settings.test.js`、`danger.test.js`、`objective.test.js`、`uiScale.test.js`。

- **ESC 順序（U-01）**：世界地圖 → 道具 / 裝備 / 技能 / 設定 / 任務視窗 → NPC 對話 / 商店 → 才開暫停選單。Phaser 的按鍵事件是同步送出的，地圖場景的 ESC 處理器可能先關掉對話，所以 UIScene 每幀開始時記下「對話是否開著」（`_mapDialogOpen`），ESC 當下對話剛被關就不再開暫停。觸控暫停鈕送的合成 ESC 同樣適用。
- **存檔代碼（U-09 ~ U-11）**：`TL1:<檢查碼>:<base64url(JSON)>`（`saveManager.encodeSaveCode / decodeSaveCode`，解碼後一律走 `parseSave → sanitizeState`，另補了任務 id 的 `hasOwnProperty` 檢查擋 `__proto__` 之類）。DOM 視窗在 `src/ui/saveDialog.js`（複製、剪貼簿被拒時全選提示、貼上匯入、視窗內覆蓋確認，沒有 `confirm()` / `alert()`）。`createSaveStore(storage, { memory: true })`：儲存不可用或寫入失敗時最新存檔留在記憶體，`getSaveStatus().unsaved` 讓 HUD / 主選單常駐「未存檔」。檔案下載保留，`exportSaveFile()` 改回 `'started' | 'blocked' | 'failed' | 'nosave'`，不再假報成功（在 iframe / 沙箱頁面直接回 `'blocked'`）。
- **設定（U-04、U-18 部分）**：`src/engine/settings.js`（獨立 key `thief-legend-settings`、不進存檔；`settings.get()`、`settings.shake(camera, …)`、`settings.flash(camera, …)`、`shakeAllowed() / flashAllowed() / motionAllowed()`）。視窗在 `src/ui/settingsWindow.js`。音量：`audio.js` 只動音量管線（音樂走獨立主音量節點、音效在 `_tone` 乘係數、音樂音量 0 時不排程）。
- **別人檔案裡的震動 / 閃光 / 傷害數字**：不改 Skill.js / Player.js / Monster.js，`src/engine/settingsHooks.js` 在 `main.js` 開機時包住 `Camera.prototype.shake / flash` 與 `Monster.prototype._showDamageNumber`，所有現有呼叫端自動遵守設定。**還包不到**：`vfx.js` 的 `screenFlash(...)`（滿版白色矩形，不是相機效果）：呼叫端 `BaseMapScene.js:501`、`Skill.js` 約 566 / 850 / 961 / 1076 / 1218 行；UIScene 升級那次已接。建議直接在 `screenFlash` 開頭加 `if (!settings.flashAllowed()) return;`。
- **死亡警告（U-07 部分）**：`src/engine/danger.js`；HP < 25% 紅色邊緣暈影（呼吸，減少動態時固定亮度），首次 HP < 30% 且身上有裝備時提醒一次（`gs.deathWarned`，隨存檔，死亡重生後保留）。懲罰規則沒動。
- **目標列與任務日誌（U-02、U-03 部分、U-06）**：`src/engine/objective.js`（`getObjective(gs)`、`questLog(gs)`，地點全由 maps / quests / monsters / dungeons 推出）；UIScene 上方置中的目標列、J 鍵 / HUD「任務」鈕開 `src/ui/questLogWindow.js`。
- **手機（U-05、U-13、U-15）**：`src/ui/uiScale.js`（觸控且畫布縮放 < 0.8 時 HUD 文字自動放大，上限 1.6 倍）；道具 / 裝備 / 技能 / 地圖彈窗用 Container 以右下角為基準整體放大；視窗 / 暫停 / 對話 / 世界地圖開著時 `registry.uiModal` → `touchControls.setModal()` 收起移動與動作鈕；技能鈕冷卻掃描（CSS conic-gradient，`touchControls.setCooldown`）與 MP 不足變灰；Phaser `pixelArt: false, antialias: true` 並把 canvas CSS 的 `image-rendering` 改回 `auto`（肉眼檢查：精靈沒有明顯糊邊或接縫）。

## 補給商店與 e2e 穩定化（2026-10）

- 補給斷層（經濟審查 P6）：森林獵場「行商阿福」（只賣 HP 藥水 5 個 150、10 個 290，單價 30 / 29）、古代廢墟「遺跡商販老莫」（HP / MP 藥水各 5 個 155）、碧濤港「船具商阿海」（HP / MP 5 個 160、強效 HP / MP 3 個 240、萬靈藥 1 個 140）。圖沿用 `npc_merchant` / `npc_townsfolk` 加色調，單價比晨曦鎮（30 / 75 / 130）略高並隨區域上升，強效藥水 80 介於晨曦鎮 75 與黃沙遺跡 90 之間。`test/content.test.js` 的「補給商店」兩項檢查 Lv9 以上每張地圖都有商店（例外：暗巷城、台北都會、神秘之境、決戰場，皆在商店地圖一步或兩步內）。實測截圖與購買流程見 `e2e/world/shops.cjs`。
- 真實 bug：`engine/assetLoader.js` 的 `releaseExcept` 現在釋放紋理前會先銷毀仍使用它們的場上物件。以前換職業（只有除錯 `__setJob` 或轉職時）會讓還在場上的斷命印記圖示讀到空的 glTexture，渲染丟例外、遊戲迴圈整個停住。
- e2e 腳本診斷結果與已知偶發項目見 `e2e/README.md` 的「穩定性筆記」。單元測試 292 項。

## 穩定性與安裝（錯誤防護、離線、版本）

- **全域錯誤防護**：`src/engine/errorGuard.js`（`main.js` 掛上）。`window` 的 `error` / `unhandledrejection` → 只認本站來源（擴充功能、其他網域、跨來源 `Script error.`、ResizeObserver 迴圈、`AbortError` / `NotAllowedError` 略過）→ 先用 `saveIfPlaying()` 存檔（回傳 `saved` / `failed` / `skipped`，選單與結算畫面不存）→ 畫面下方小框（DOM，`#err-guard`）說明是否已存檔，「重新載入」與「繼續」兩鈕。每次載入頁面只提示一次；防護本身全包 try/catch。
- **Service Worker**：根目錄 `sw.js`，由 `src/engine/serviceWorker.js` 註冊。只在 http(s) 正式網址註冊；`localhost` / `127.0.0.1`（開發與 e2e）、`?debug=1`、`file://`、iframe 中都不註冊（本機開發時若之前註冊過會自動解除並清快取，避免舊 bundle 蓋住剛建置的版本）。`dist/bundle.js` 與 `dist/assets/*` 快取優先，頁面與 `dist/version.json` 網路優先，其他靜態檔先回快取再背景更新；安裝時預先快取頁面外殼，素材清單在背景下載。要在區網 IP 測離線功能，用正式建置並以 https 或瀏覽器的「視為安全來源」旗標開啟。
- **版本**：`npm run build` 後 `scripts/buildVersion.js` 依 `dist/bundle.js` 內容算雜湊、依 `dist/assets` 全部檔案算素材雜湊，寫入 `dist/version.json` 並改寫 `sw.js` 的 `SHELL_VERSION` / `ASSETS_VERSION`（只依內容，不含時間，可重現）。新版 SW 啟用時刪除名稱不符的舊快取（bundle 變了只重抓外殼，素材沒變就沿用）。
- **設定視窗**：標題列右側「版本 3.0.0-xxxxxxx · 更新紀錄」，點開更新紀錄面板（`src/ui/versionInfo.js`，內容在 `src/config/changelog.js`）。版號取自 `package.json`，雜湊執行時讀 `dist/version.json`（讀不到只顯示版號）。
- 單元測試 `test/stability.test.js`（錯誤過濾與限流、版本字串、更新紀錄、SW 註冊條件、建置雜湊與 sw.js 改寫）。

## 隱藏收集品：盜賊徽章（重玩 / 探索）

- 30 枚「盜賊徽章」藏在 13 張可探索地圖（Boss 房、副本沒有；每張 2～3 枚），位置在高層平台盡頭、地圖兩端、浮在高台上方要跳一下的地方。資料在 `src/config/badges.js`，規則（撿起、獎勵、存檔驗證、任務日誌摘要）在 `src/engine/badges.js`（純邏輯），場景端（程式繪製的盾牌徽章貼圖、浮動 + 光暈 + 小星星、碰觸判定、音效、浮字「盜賊徽章 n/30」、撿到立即存檔）在 `src/engine/badgeField.js`，`BaseMapScene` 只有建立 / update / 關閉三行。
- 存檔欄位 `badges`（已收集 id，只認已知 id、去重、依表順序）與 `badgeRewards`（已領門檻，不得超過收集數）；舊存檔沒有這兩個欄位時讀成空陣列。
- 收集獎勵各發一次：10 枚 2,000 金幣；20 枚 4,000 金幣 + 永久暴擊率 +2%；30 枚 8,000 金幣 + 永久暴擊傷害 +10%。暴擊不在死亡重算的屬性內，所以死亡不會洗掉加成。
- 進度顯示：任務日誌標題列「盜賊徽章 n/30」、最後一段列出去過的地圖各自的收集數與獎勵狀態；世界地圖右上角總數、資訊列「徽章 n/m」；HUD 資訊彈窗也有總數。
- 測試：`test/badges.test.js`（用 `maps.js` 的平台資料與 `platformGraph` 檢查每枚都在平台 / 地面上方 20～115px、在地圖內、不卡進平台、從地面用跑跳 / 二段跳到得了、離傳送門 100px 以上；存檔驗證、獎勵只發一次、死亡保留）；e2e `e2e/badges.cjs`。

## 手把與按鍵設定

- **按鍵設定**：`src/engine/keyBindings.js`（純邏輯：動作表與預設鍵位、允許的按鍵表、`rebind` 衝突時互換、保留鍵 ESC / M / J / 1 / 2 拒絕、`sanitizeBindings` 讀回清理）。鍵位存在設定的 `keys` 欄位（`thief-legend-settings`，不進存檔；「重設設定」也會一併回預設）。預設：← → ↑ ↓、Q / ↑ 跳（舊版 Alt；沒改過鍵的舊設定讀回時自動換成 Q）、空白鍵普攻、Z X C V 技能欄、A S D R G 藥水、F 互動）。
- **面板**：設定視窗右上「按鍵設定」鈕開 `src/ui/keyBindPanel.js`（點按鍵格 → 按鍵；等待時按鍵在 window capture 階段攔下，ESC 只取消；「恢復預設」要按兩次）。
- **生效**：`Player._bindKeys` 依鍵位建 Key（屬性名稱沿用 `cursors` / `keySpace` / `keyZ` / `keyAlt` / `keyPotA`…，e2e 腳本照舊可用），設定改了下一幀重綁；互動鍵在 `BaseMapScene` 改聽通用 `keydown` 比對鍵位；HUD 技能欄 / 藥水格角落字樣、技能視窗「X 欄」、道具欄、低血量提示、NPC / 傳送門提示、設定視窗操作說明、教學按鍵頁都跟著鍵位。觸控鈕送「目前綁定的鍵」（`createKeyState(emit, resolve)`）。
- **手把**：`src/engine/gamepad.js`，每步（`game.events` 的 `prestep`）讀 `navigator.getGamepads()`，按下 / 放開時送「目前綁定的鍵」的合成鍵盤事件，所以 ESC 順序、對話、主選單都沿用鍵盤邏輯。標準配置：搖桿 / 十字鍵左右移動、下 = 下穿、上 = 互動、A 跳、X 普攻、Y / B / LB / RB 技能欄 1–4、LT / RT 藥水 1 / 2、Start = ESC。選單 / 教學 / 結算畫面 A 當 Enter、左右固定送方向鍵。接上 / 拔掉時畫面上方短暫顯示「已連接手把」/「手把已中斷連線」（DOM 提示）。沒有用 Phaser 的 gamepad 外掛，遊戲設定不用改。
- **驗證**：`test/controls.test.js`；`e2e/controls.cjs`（假造 `navigator.getGamepads`：接上提示、主選單按 A、移動 / 跳 / 普攻 / 技能 / Start 暫停；設定面板改鍵、互換、拒絕、ESC 取消、HUD 字樣、改鍵後實際施放、重新載入保留、恢復預設）。
- **未做**：手把在設定 / 商店等視窗裡沒有游標導覽（用滑鼠或觸控點）；手把按鈕本身不能自訂；世界地圖 M、任務日誌 J、暫停 ESC 固定不能改。
## 通關後、難度與載入提示（2026-10）

- **通關旗標**：擊敗暗影魔君時 `BossScene` 設 `gs.gameCleared = true` 並立刻存檔（Boss 房存檔照舊回魔君王城）。和 `deathWarned` 一樣不在 `createInitialGameState` 裡，只有為 true 時才存在；`sanitizeState` 只認 `true`。舊存檔沒有這個欄位 = 未通關。
- **回程傳送門**：`config/maps.js` 的 `portal.requireCleared`（通關後才建立，`BaseMapScene._createPortals` 一行判斷）與 `portal.oneWay`（單向捷徑：`worldGraph.neighborsOf` 不算它，世界地圖不畫線、`test/content.test.js` 的「傳送門成對」略過）。魔君王城 x=2300（Boss 門左邊 210px）、暗影領域 x=70（進場落點 x=200），都是按 F 進入的金色門，通往晨曦鎮 x=240。地圖資訊視窗會標「（通關後開啟）」。
- **結算畫面**：勝利的「繼續冒險」回晨曦鎮（樞紐，世界地圖傳送免費）、滿血滿魔、存檔；按鈕下方說明回程傳送門。死亡結算畫面按鈕下方隨機顯示一則提示（一半機率挑和死亡有關的）。
- **難度**（設定視窗「難度」三段，存在 `settings.difficulty`，不進存檔）：`src/engine/difficulty.js`。

  | 難度 | 怪物 HP | 怪物對玩家的傷害 |
  |------|---------|------------------|
  | 簡單 | ×0.8 | ×0.7 |
  | 普通（預設） | ×1 | ×1 |
  | 困難 | ×1.4 | ×1.3 |

  套用點只有 `Monster` 建構子（Boss、副本、召喚小怪都經過）：HP 四捨五入，攻擊力 `atk` 直接乘倍率（所有近戰、招式、投射物、震波傷害都由 `atk` 算出）。遊戲中切換只影響之後生成的怪物（重生或換地圖後套用），已在場上的不變。熔岩噴發是依玩家最大 HP 的環境傷害，不受影響。普通 = 原數值，既有平衡與 e2e 數字不變。
- **載入提示**：`src/config/tips.js`（22 則：12 則玩法、10 則對應本作地圖的世界觀；`pickTipIndex` / `pickTip` / `createTipRotator` 為純函式）。`assetLoader.attachLoadingBar` 在載入條下方輪播（3.2 秒換一則，preload 期間場景時鐘不走所以用 `setInterval`，載完或場景關閉時清掉）。另外修正：第一個檔案就很慢時以前要等到它下載完才出現載入條，現在 160 ms 一到就先顯示。
- 測試：`test/difficulty.test.js`、`test/tips.test.js`、`test/postgame.test.js`；e2e `e2e/postgame.cjs`。`e2e/e2e-death.cjs` 改成等到結算畫面 / 地圖真的出現才往下（以前固定等 2.6 秒，機器忙時倒地 1.5 秒遊戲時間還沒跑完就判失敗）。

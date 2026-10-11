# 專案狀態盤點與下一步（原 ITERATION5_SPEC）
# 最後更新：Phase 23（世界重整：星光碎片主線 + 四張新地圖）後

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
- 測試：`test/mobile.test.js`；Chromium 手機模擬（多指、暫停、失焦、直向）端對端已驗證，**尚未在真機上測試**。

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
- **普通攻擊與技能（Phase 20 調整後）**：空白鍵 = 近戰揮刀普通攻擊（`Skill.js` 的 `castSlash`，面前 90px 範圍內全部命中、傷害 ×0.9、不耗 MP、冷卻 0.4s、不吃技能等級，常數在 `BASIC_ATTACK_DEF`）；Z = 三連飛鏢技能（耗 MP 10、冷卻 0.5s）。電腦版 ↑ 與 Alt 都能跳躍。
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
- **影之試煉的做法**：沿用既有副本機制，新增副本 `shadow_trial`（限時 120 秒、單波：試煉守衛 `shadow_guardian`（小王）+ 2 隻影子史萊姆，通關觸發任務完成，失敗可重試）；入口是影之殿堂右端傳送門（Phase 22 前在晨曦鎮），`requiresQuest: 'job_trial'`，沒接任務進不去；副本的 `returnMap: 'shrine'`，結算後回到影之殿堂。
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
- Boss 第三階段狂暴視覺

---

## 四、目前差距分析

### 高優先
（Phase 15 已清空：ESC 暫停選單、目標選取框、Level Up 演出皆已完成）

### 中優先
1. Boss 第三階段缺少狂暴視覺層，強度變化不夠直觀。
2. 玩家姿態變化仍以單圖加 transform 模擬為主，尚未做到完整姿勢差異。
3. 視差背景目前是單層基礎版，仍有空間擴充為多層。

### 低優先 / 加值
1. 藥水經濟平衡（商店已接入主流程，可由 sky 傳送門進入）
2. 魔法陣通用效果與更多技能後製

---

## 五、下一步建議順序

### 下一批建議
1. Boss 第三階段狂暴視覺與技能特效升級。
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
- ✅ 地圖切換（sky→ruins→kerning，雙向）
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

### 階段 3：世界地圖與傳送（**未完成**，見 TODO）

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

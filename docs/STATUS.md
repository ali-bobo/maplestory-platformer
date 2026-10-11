# 專案狀態盤點與下一步（原 ITERATION5_SPEC）
# 最後更新：Phase 15 後

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
- 依地圖設定編曲：浮空島（音樂盒 + 豎琴 + 高音閃爍）、森林獵場（民謠長笛 + 撥弦 + 手鼓）、古代廢墟（空五度持續音 + 慢起音弦樂）、神秘之境（多利安 + 合唱襯底 + 魔法閃爍）、台北都會（電鋼琴切分 + 搖擺鼓組）、暗巷城（夜色爵士：深色弦樂 + 彈撥低音 + 慢搖擺）、晨曦鎮（溫暖長笛 + 吉他撥奏）、Boss（E 小調 + 銅管 + 16 分音符驅動）、副本（D 小調 + 驅動低音）。
- 離線渲染量測（新舊對照，9 首平均）：5 kHz 以上刺耳能量 0.60% → 0.12%（原方波曲目 2.8% / 1.8% → 0.006% / 0.15%）、爆音指標 1.18 → 0.67、平均響度 −28 → −25 dB、無爆音；去掉打擊樂後的粗糙度與「純三和弦基準」相同，表示和聲本身一樣協調。
- 測試：`test/music.test.js`（強拍和弦音、無外音、無半音衝突、低音根音、聲部連接平順、循環銜接等 112 項）。
- SFX（打擊 / 技能 / 升級音）沒有改動。

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

## 1. Asset Inventory Baseline

- [x] 1.1 建立 runtime asset inventory，盤點 dist/assets 中目前已載入的背景、怪物、小王、NPC 與其 used/replace/reserve 狀態。
- [x] 1.2 建立 candidate asset inventory，盤點 參考用遊戲畫面 與使用者提供的怪物總覽圖，並為每個候選條目標示 visual group、預計用途與 promotion status。
- [x] 1.3 定義 assetId、groupId、status、source reference、target map、notes 等欄位命名規格，確保背景、平台、怪物都使用同一套 catalog 欄位語言。

## 2. Map Visual Integration

- [x] 2.1 為現有 ellinia 地圖寫出玩具城替換規格，明確標示舊背景、新背景、保留的 map key/sceneKey、portal 與 spawn 契約。
- [x] 2.2 為森林與玩具城建立長條平台 style 規格，記錄候選圖片、renderHeight、collisionPolicy 與預定使用的平台段。
- [x] 2.3 為台北地圖建立 deferred map spec，定義背景、平台布局、怪物候選組合、推薦等級帶與延後啟用策略。

## 3. Monster Catalog Consolidation

- [x] 3.1 建立 runtime monster catalog，至少分為 legacy、new-crop、big、miniboss、boss-support 五組。
- [x] 3.2 將 city_boss1、city_boss2 升級為正式 miniboss catalog 條目，補齊 spriteKey、地圖使用與對齊狀態欄位。
- [x] 3.3 為 runtime monster catalog 增加 alignment coverage 欄位，並明確列出 monster_big_3、monster_big_4、miniboss_0、miniboss_1 的 pending-alignment 狀態。
- [x] 3.4 建立 candidate monster master sheet，把怪物總覽圖中的候選怪物分組編號，但不要將其誤標為 runtime asset。
- [x] 3.5 將 monster3 已辨識出的第一批裁切怪（monster_big_2~4、miniboss_0~1）回填到 runtime / candidate catalog，並完成實際地圖分流。

## 4. Code Alignment Follow-up

- [x] 4.1 以最小變更方式將第一批 catalog 真相同步回程式，至少覆蓋玩具城背景替換入口、台北背景預載入口規劃與怪物群組盤點註記。
- [x] 4.2 補齊或標記缺失的 alignment metadata，並驗證 catalog 描述與 src/config/alignment.js 的實際狀態一致。
- [x] 4.3 驗證視覺替換後既有 map flow、portal、spawn 與怪物生成契約沒有回歸。
- [x] 4.4 在後續 coding 過程中持續同步更新規格、design 與 tasks，避免文件與實作脫節。

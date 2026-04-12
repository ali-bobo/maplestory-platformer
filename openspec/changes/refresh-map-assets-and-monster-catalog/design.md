## Context

目前 runtime 素材進場流程為：BootScene preload 載入背景與怪物圖、monsters.js 以 id 對應 spriteKey、maps.js 決定每張圖會在哪張地圖生成、BaseMapScene 依 mapData 建立背景與怪物、alignment.js 以 texture key 補腳底留白比例。這個模型可以運作，但素材真相被拆散在四處，對新玩具城背景替換、台北地圖規格、長條跳台圖片導入與怪物族群重整都不利。

目前已知可驗證的根因有三個。第一，怪物與小王的使用資訊沒有單一清單，只有在多個 config 交叉比對後才能知道一張圖是否正在被用。第二，裁切怪物圖的對齊資訊不完整，monster_big_3、monster_big_4、miniboss_0、miniboss_1 目前沒有對應 alignment metadata。第三，使用者新提供的怪物總覽圖屬於候選視覺母表，但現有系統沒有地方記錄「候選但尚未成為 runtime asset」的狀態，之後極易再次漏怪或誤以為已接線。

## Goals / Non-Goals

**Goals:**
- 建立資產 catalog 規格，讓背景、平台、怪物與小王都能被唯一識別、分組與追溯。
- 把 runtime monster catalog 與 candidate monster master sheet 分離，避免候選圖與已上線資產混淆。
- 讓玩具城視覺替換與台北地圖規格可以沿用現有 scene flow 與怪物生成模型，不先觸碰主線流程。
- 為未來實作保留低風險導入路徑，先以 catalog 成為單一事實來源，再逐步讓 preload 與 map config 從 catalog 派生。

**Non-Goals:**
- 本 change 不直接重寫 BootScene、maps、MONSTERS、alignment 為完整 registry-driven runtime。
- 本 change 不刪除任何現有圖片，不在本輪強制接入台北地圖到正式傳送門流程。
- 本 change 不新增台北專屬 Boss，也不改動既有地圖順序與 sceneKey。

## Decisions

1. 使用雙層怪物資料模型，而不是只做單一 monster list。
   理由：runtime 怪物與候選怪物的生命週期不同。runtime catalog 需要對應 spriteKey、地圖、alignment metadata；candidate master sheet 只需要記錄來源、預計用途與晉升狀態。若混在一起，之後會無法區分哪些怪物真的能被 preload 與 spawn。
   替代方案：只維持一份總怪物表並用 status 欄位區分。這種做法可行，但對 runtime 驗證不夠直接，且容易讓尚未裁切的候選圖混入程式實作範圍，因此不採用。

2. 將小王正式納入 miniboss group。
   理由：city_boss1、city_boss2 目前已存在於 monsters.js、maps.js 與 BootScene preload，但規格層沒有把它們獨立為一類，導致盤點時容易被當作一般怪物遺漏。將其升級為獨立群組後，後續新增小王或區域中 Boss 會有固定位置可掛接。
   替代方案：繼續把小王留在一般 monster list 中。這會讓圖像尺寸、生成規則與平衡資料混在一起，不利後續擴充，因此不採用。

3. 玩具城替換採用「保留 ellinia 結構，只替換視覺來源」策略。
   理由：目前 ellinia 已綁定 map key、sceneKey、portal 與 NPC 流程，直接替換背景與平台樣式可最大限度降低影響面，並保留既有 progression。
   替代方案：重命名或重建 ellinia 為全新地圖。這會牽動主線流程與相鄰 portal，超出本輪範圍，因此不採用。

4. 台北地圖先寫成可延後啟用的 map spec，而不是立即接入主流程。
   理由：使用者目前優先需求是先把素材規則與怪物整併方式定清楚。先完成規格可讓台北地圖作為獨立資料模型驗證點，後續再決定是否插入主線或作為隱藏測試地圖。
   替代方案：直接新增地圖、Scene 與 portal。這會把規格與 runtime 改動綁在一起，增加回歸風險，因此暫不採用。

5. 長條跳台圖片採用平台 style catalog，而不是直接覆蓋所有程序平台。
   理由：目前 BaseMapScene 平台碰撞依賴固定高度 24px 與 thin/non-thin 邏輯。若直接全面替換，容易讓碰撞規則與視覺尺寸脫鉤。先把長條跳台寫成 style object，並明確指定玩具城與森林哪些平台段可使用，風險較低。
   替代方案：整張地圖的平台全部改吃圖片。這會同時放大視覺與碰撞風險，因此不採用。

6. alignment metadata 缺口先寫入 catalog 欄位與待辦，不在設計階段假裝已解決。
   理由：目前 monster_big_3、monster_big_4、miniboss_0、miniboss_1 的缺口是已知真相。規格必須允許 runtime asset 先以 pending-alignment 狀態存在，後續再補齊數值，避免假資料污染實作。

## Risks / Trade-offs

- [Risk] catalog 規格先行，但 runtime 仍維持舊結構一段時間，可能出現文件與程式碼雙軌期。 → Mitigation：要求每個 runtime 資產條目都能反查到目前程式檔案位置，並在 tasks 中安排第一次 code-side 對齊。
- [Risk] 使用者提供的怪物總覽圖包含大量候選種族，若一次全部拉進 runtime 會造成範圍失控。 → Mitigation：以 candidate master sheet 分層，只有完成裁切、命名、preload 與配置的資產才能晉升為 runtime。
- [Risk] 長條平台圖若視覺高度與現有 24px 碰撞模型不一致，會讓角色站位看起來錯。 → Mitigation：規格先要求 style catalog 記錄 renderHeight 與 collisionPolicy，實作前先挑玩具城與森林局部平台驗證。
- [Risk] 只替換 ellinia 視覺可能讓地圖命名與視覺風格暫時不完全一致。 → Mitigation：先把規格重點放在素材替換與流程穩定，等台北地圖與 catalog 落地後再評估是否重命名 map display name。

## 2026-04-12 實作記錄（成功 / 未完成）

**成功**
- 已導入使用者提供的 Boss 主體圖與 Boss 房背景，並接入 runtime asset 流程。
- 已按地圖主題整理 runtime 怪物配置，移除 Kerning 的奇幻系混入與 Henesys 的天空系重複。
- 已把三張原始怪物母圖提升為已分類的 candidate sheet，補上 target maps 與候選用途。

**未完成 / 後續**
- `monster3.jpg` 目前只完成分類與對應地圖規劃；受限於本輪環境無法穩定辨識全部子圖邊界，尚未完成精準逐張裁切。
- 候選怪物尚未新增對應的 monster id、preload key、alignment metadata 與 spawn 配置。
- 視覺與站位的最終確認仍依賴 build 後實機驗證；本輪先以 build 與資料契約檢查為主。

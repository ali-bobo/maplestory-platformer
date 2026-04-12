## Why

目前地圖背景、平台樣式、怪物圖片與對齊 metadata 分散在 BootScene、maps、monsters、alignment 四個位置，導致新素材替換、未使用裁切圖盤點與怪物重整時容易遺漏。玩具城背景替換、台北地圖規格與小王/候選怪物整併需要先建立單一可追溯的資產規格，否則後續實作會持續依賴人工比對檔名與場景設定。

## What Changes

- 新增資產目錄管理能力，定義背景、平台、怪物與候選怪物的 catalog 結構、分組方式、編號規則與狀態欄位。
- 將 runtime monster catalog 與 candidate monster master sheet 分離，明確標示哪些怪物已進入遊戲、哪些仍是候選參考素材。
- 把現有小王 city_boss1、city_boss2 升級為正式的 miniboss 群組規格，而不是只留在一般怪物清單中。
- 定義玩具城視覺替換規格，維持現有 ellinia map key、sceneKey 與 portal 流程不變，只更換背景與平台樣式來源。
- 定義台北地圖的背景、平台、怪物分配與延後啟用策略，允許先完成規格與資料模型，之後再接入主流程。
- 要求 runtime 怪物資產必須能追溯 spriteKey、來源圖、地圖使用狀態與 alignment metadata 覆蓋情況，避免裁切圖無法判斷是否已接線。

## Capabilities

### New Capabilities
- `asset-catalog-management`: 管理 runtime 與候選素材的目錄、分組、編號、狀態與追溯規則，覆蓋背景、平台、怪物、小王與候選怪物母表。

### Modified Capabilities
- `core-gameplay`: 地圖視覺替換與新地圖規格必須在不破壞既有 scene flow、portal 邏輯與怪物生成模型的前提下進行。

## Impact

- Affected code: src/scenes/BootScene.js, src/config/maps.js, src/config/monsters.js, src/config/alignment.js, src/scenes/BaseMapScene.js
- Affected assets: dist/assets, 參考用遊戲畫面
- Affected systems: 地圖背景切換、平台樣式指定、怪物生成映射、小王分組、素材盤點與對齊 metadata 追溯
## Why

目前怪物圖片已存在多張 runtime png，但地圖分配、命名、來源追溯與逐批驗證流程仍不夠明確。使用者已多次在「一次整理太多怪物與平台圖片」的情況下失敗，且最新判斷認為根因更接近圖片拆分流程本身不穩，而不是單一地圖設定錯誤。因此需要先把怪物整理流程拆成兩個批次，讓每一批都能用固定步驟完成裁切、命名、分類與地圖綁定，再進入下一批。

## What Changes

- 新增一個以怪物拆分流程穩定化為核心的 change，先處理 Batch A，明確限制每次只整理一張來源圖或一組可追溯的同源怪物。
- 把整體怪物整理正式拆成兩階段：Batch A 負責建立穩定的拆分與驗證流程；Batch B 才處理剩餘候選怪物與全地圖覆蓋。
- 針對「同一怪物重複出現在不同地圖」的現況，要求在 Batch A 就先建立單一地圖歸屬規則，但只對第一批怪物實際套用。
- 要求 Batch A 完成後，必須能把已整理好的怪物接到對應地圖測試名單，而不是只停留在圖片命名。
- 明確把森林看台壓縮與隱形固體問題列為後續批次，不與本次怪物拆分第一階段混做。

## Capabilities

### Modified Capabilities
- `core-gameplay`: 怪物整理流程改為分批導入，並要求每一批都以地圖測試驗證完成度，而不是一次全量替換。

## Impact

- Affected specs: `openspec/specs/core-gameplay/spec.md`
- New change: `openspec/changes/stage-monster-crop-rollout/`
- Future affected code after Batch A implementation: `src/config/monsters.js`, `src/config/maps.js`, `src/config/assetCatalog.js`, `src/scenes/BootScene.js`
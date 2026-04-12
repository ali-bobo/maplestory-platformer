## Why

目前所有動態角色的視覺腳底與平台頂部未能穩定對齊。從實機畫面可見，NPC 站位大致正確，但玩家與怪物在多張地圖上都存在懸空、下沉或與紅線基準不一致的問題，導致遊戲看起來不像正式作品，也會讓之後的角色美術替換與碰撞調整持續失準。

## What Changes

- 以新版 OpenSpec 正式定義平台與角色的視覺腳底對齊規則。
- 明確記錄目前錯誤：玩家與怪物未與平台頂部紅線對齊，但 NPC 可作為正確參考。
- 把使用者提供的浮空島嶼、古代廢墟、森林獵場與正式遊戲參考畫面寫成可驗證情境。
- 明確列出過去已失敗的方法、失敗原因，以及更可實作的替代方案。
- 評估圖片尺寸標準化是否有助於降低對齊成本，並界定其適用範圍與限制。
- 建立可驗收的修正方向：統一 NPC、玩家、怪物、Boss 的站位基準，不再混用腳底原點與 display/body offset 推算模型。
- 將手動驗證標準寫入 tasks 與 spec delta，方便後續每次修改回查。

## Capabilities

### New Capabilities

### Modified Capabilities
- `platform-alignment`: 站位規則從單純碰撞成立提升為可見腳底基準一致，並補上成功方案與失敗方法紀錄。

## Impact

- Affected code: `src/scenes/BaseMapScene.js`, `src/entities/Player.js`, `src/entities/Monster.js`, `src/entities/Boss.js`, `src/config/maps.js`
- Affected systems: 場景進場對齊、平台碰撞、角色初始化、Boss 與怪物生成、手動驗收流程

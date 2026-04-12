# Platform Alignment Specification

## Purpose
定義玩家、怪物、Boss、NPC 與平台之間的視覺站位基準，避免不同實體使用不同腳底模型而造成懸空、陷地或層級錯位。

## Requirements

### Requirement: Dynamic entities SHALL share a visual standing baseline
玩家、怪物與 Boss 站在同一塊平台時，視覺腳底 MUST 對齊到同一條平台頂部基準線。這個基準線 MUST 以實際可見腳底為準，不得僅以圖片透明留白或碰撞盒接觸作為最終驗收標準。

#### Scenario: Screenshot case - floating island upper platform
- **WHEN** 在浮空島嶼的上層綠色平台檢視玩家站位
- **THEN** 玩家的可見腳底應與平台頂部重合
- **AND** 不得出現角色大腿或身體下半部明顯穿入平台、但碰撞仍視為站立成功的情況

#### Scenario: Screenshot case - ruins ground baseline
- **WHEN** 在古代廢墟的地面檢視玩家、怪物與 NPC 的相對高度
- **THEN** 玩家與怪物的腳底應與 NPC 所代表的地面基準一致
- **AND** 不得出現 NPC 看起來正常、但玩家與怪物整體漂浮或下沉的相對錯位

#### Scenario: Screenshot case - forest upper platform contact
- **WHEN** 在森林獵場的上層平台檢視玩家站位
- **THEN** 玩家腳底應貼齊平台上表面
- **AND** 不得因圖片透明邊界或碰撞盒高度推算，使角色看起來像掛在平台下緣或卡進平台內部

#### Scenario: Player and monster stand on the same platform
- **WHEN** 玩家與任一怪物在同一塊平台或地面上靜止
- **THEN** 兩者的視覺腳底應落在同一平台頂部基準線
- **AND** 不得出現玩家明顯懸空但怪物貼地，或怪物貼地但玩家陷入平台的情況

#### Scenario: Boss follows the same standing rule
- **WHEN** Boss 站在 Boss 房的地面或平台上
- **THEN** Boss 也必須遵守相同的腳底基準
- **AND** 不得因大型 sprite 縮放而單獨漂浮或下沉

### Requirement: NPC SHALL use the same visual ground rule
NPC 的站位規則 MUST 與動態角色一致，作為場景內同一條地面基準的參考物。

#### Scenario: NPC and player share a platform reference
- **WHEN** NPC 與玩家位於同一高度的平台區域
- **THEN** NPC 與玩家的可見腳底應對齊到同一條平台頂部線
- **AND** NPC 可作為手動驗證站位正確性的參考對象

### Requirement: Spawn placement SHALL resolve to a valid platform top
場景建立玩家、怪物、Boss 或 NPC 時，初始生成位置 MUST 被解析到一個有效的平台頂部或地面回退位置，不能停留在半空或嵌入平台內。

#### Scenario: Scene entry resolves to nearest valid top surface
- **WHEN** 角色因新場景建立、切圖或怪物生成而取得一個目標 x 座標
- **THEN** 系統應找到對應的有效平台頂部或地面回退值
- **AND** 實體在首次穩定後的站位應符合視覺腳底貼齊規則

#### Scenario: No containing platform falls back safely
- **WHEN** 目標 x 座標不落在任何中層平台範圍內
- **THEN** 系統應回退到地面站位
- **AND** 角色不得落在 HUD 區域、背景層或地板貼圖內部

### Requirement: Physics correction SHALL not break post-spawn alignment
即使 Arcade Physics 在碰撞建立後進行位置修正，實體最終穩定站位也 MUST 回到視覺腳底對齊的平台頂部線。

#### Scenario: Collider setup does not introduce drift
- **WHEN** 場景建立實體並完成平台 collider 設定
- **THEN** 實體在落地穩定後的最終站位仍應符合平台頂部腳底基準
- **AND** 不得出現進場第一幀正確、下一幀被 Physics 推離基準線的情況

### Requirement: Alignment expectations SHALL be verifiable across maps
站位規則 MUST 能在所有主要地圖中用一致的驗收方式觀察，而非只對某一張圖成立。

#### Scenario: Shared validation across all maps
- **WHEN** 驗證浮空島嶼、古代廢墟、森林獵場與 Boss 房的地面與中層平台
- **THEN** 玩家、怪物與 NPC 的腳底表現都應符合相同基準
- **AND** 若只有單張圖例外，應視為地圖資料特例而非全域對齊邏輯已正確

#### Scenario: Official reference is used as visual intent only
- **WHEN** 參考正式遊戲畫面進行站位比較
- **THEN** 驗收應比對角色腳底貼地感、平台接觸感與相對層次
- **AND** 不應要求本專案背景圖、平台寬度或場景構圖與正式遊戲逐像素一致

### Requirement: Asset sizing SHALL support alignment maintenance
素材尺寸策略 MUST 支援站位維護，但不得把統一圖片大小誤當成唯一解法。

#### Scenario: Standardized sprite boxes reduce manual drift
- **WHEN** 角色與怪物圖片採用接近的來源尺寸規格與一致的輸出 display 尺寸策略
- **THEN** 對齊維護成本應下降
- **AND** 站位問題仍需由腳底基準或錨點規則決定，而非只依靠圖片尺寸一致

#### Scenario: Background dimensions do not define standing contact
- **WHEN** 調整背景圖片尺寸或背景構圖
- **THEN** 平台站位規則不應因此改變
- **AND** 背景圖不應被當成角色腳底對齊的計算依據

### Requirement: Image-native platforms SHALL be allowed as solid platform pilots
當平台圖片本身帶有明確的看台或橋面設計時，系統 MUST 允許以圖片原生長寬與可行走區域 metadata 建立平台，而不是一律先套進固定高度框架再貼圖。

#### Scenario: Forest long platform pilot uses image-based dimensions
- **WHEN** 森林地圖導入第一個長條看台實驗
- **THEN** 平台 render size 應以森林看台圖片的原生比例或明確的 image metadata 為基準
- **AND** 不得只取圖片一小段後再壓縮到通用 24px 平台高度，導致看台視覺被擠壓變形

#### Scenario: Walkable surface is defined separately from decorative image bounds
- **WHEN** 一張看台圖片包含欄杆、藤蔓、屋頂或其他非行走裝飾
- **THEN** 規格必須允許以 metadata 指定真正可碰撞、可站立的 walkable strip
- **AND** 圖片整體尺寸可大於碰撞高度，但角色腳底仍必須對齊到該 walkable strip 的頂線

#### Scenario: Forest pilot remains localized before global rollout
- **WHEN** 森林看台開始採用圖片原生尺寸實體化
- **THEN** 這項策略應先限制在森林長條看台試點
- **AND** 在未完成站位、碰撞與進場驗證前，不得直接推廣到所有地圖平台

### Requirement: Verified alignment implementation SHALL be traceable
目前已驗證成功的站位實作 MUST 可被後續修改者回查，不得再回到純憑感覺調 offset 的狀態。

#### Scenario: Successful implementation record remains queryable
- **WHEN** 後續有人再次調整腳底對齊
- **THEN** 規格中應能回查目前成功方案為「HUD 上緣作為地板基準 + 動態實體共用腳底錨點 + 原始貼圖尺寸換算 Arcade body + 依 texture key 套用腳底留白比例」
- **AND** 後續除錯應優先檢查 body 尺寸換算、貼圖底部透明留白比例與對齊 metadata，而非先調 portal 或單張地圖平台座標

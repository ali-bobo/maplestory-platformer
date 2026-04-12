## MODIFIED Requirements

### Requirement: Map traversal SHALL preserve cross-scene game state
玩家在多張地圖與 Boss 房之間切換時，核心遊戲狀態 MUST 被保留，且地圖視覺替換不得破壞既有的 scene flow、portal 行為或進場位置規則。

#### Scenario: Replacing Ellinia visuals does not change the existing map flow
- **WHEN** 現有 ellinia 地圖套用新的玩具城背景與平台樣式規格
- **THEN** 該地圖的 map key、sceneKey、portal 方向與 spawn 行為必須保持不變
- **AND** 玩家不得因單純視覺替換而失去既有地圖切換能力

#### Scenario: Visual replacement does not invalidate spawn placement
- **WHEN** 地圖背景或平台 style 被重新指定
- **THEN** 玩家、怪物與 NPC 的生成位置仍應落在有效的平台或地面基準上
- **AND** 不得因素材替換而讓進場站位退化為半空、陷地或錯誤 portal 落點

### Requirement: The main loop SHALL allow deferred map onboarding
遊戲主流程 MUST 允許新地圖先以規格與資料模型存在，再於後續實作中決定是否接入主線 progression。

#### Scenario: Taipei map can exist as a deferred gameplay target
- **WHEN** 台北地圖先完成背景、平台、怪物分配與啟用策略規格
- **THEN** 該地圖可以先作為 deferred map profile 存在
- **AND** 不得要求在同一輪變更內就必須新增正式 portal 或插入既有主線順序

### Requirement: Monster assignment SHALL remain reorganizable by themed map rules
地圖怪物配置 MUST 允許依視覺主題與資產整併結果重新分配，但不得破壞目前依 mapData.monsters 與 monster id 生成怪物的核心模型。

#### Scenario: Map-themed monster reshuffle keeps the current spawn contract
- **WHEN** 開發者重整玩具城、森林或台北地圖的怪物名單
- **THEN** 地圖配置仍應以 monster id 與 count 為核心契約
- **AND** 不得因 monster catalog 分組化而強迫重寫 BaseMapScene 的基本生成流程才能完成第一次整併
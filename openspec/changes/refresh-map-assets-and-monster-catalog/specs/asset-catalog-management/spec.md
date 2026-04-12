## ADDED Requirements

### Requirement: Runtime assets SHALL be tracked with stable catalog identifiers
The system SHALL maintain a runtime asset catalog for background, platform, monster, miniboss, boss, and support-monster assets. Each runtime asset entry SHALL have a unique asset identifier, a group identifier, a source file reference, a runtime status, and a traceable binding to the current code path.

#### Scenario: A runtime monster can be traced end-to-end
- **WHEN** 開發者查詢任一已上線怪物圖片
- **THEN** 文件中必須能追溯該資產的 assetId、spriteKey、來源圖檔、對應 monster id、使用地圖與目前 alignment 狀態
- **AND** 不得只剩檔名或美術截圖而無法確認是否已實際接入遊戲

#### Scenario: A runtime background has an explicit replacement role
- **WHEN** 現有玩具城背景準備被新圖片取代
- **THEN** runtime background catalog 必須標示原背景條目、替代背景條目與對應 target map
- **AND** 替換規格不得要求先改動該地圖的 map key 或 sceneKey

#### Scenario: Boss art can be traced as runtime assets
- **WHEN** 使用者提供新的 Boss 主體圖或 Boss 房背景並接入遊戲
- **THEN** runtime catalog 必須能追溯其 assetId、texture key、來源圖與 target map/scene
- **AND** 不得只在工作目錄存在圖片卻缺少 runtime 綁定紀錄

#### Scenario: A monster sheet crop is promoted with source traceability
- **WHEN** `monster3.jpg` 中的子圖被正式裁切並接入 runtime
- **THEN** runtime catalog 必須保留該 spriteKey 對應的來源母圖資訊
- **AND** 地圖配置必須能看出這批 monster3 衍生怪目前實際落在哪些 map

### Requirement: Candidate assets SHALL be separated from runtime assets
The system MUST keep candidate monster, background, and platform references separate from runtime assets. Candidate entries SHALL record intended use and promotion status, but SHALL NOT be treated as loadable runtime assets until they complete the runtime onboarding path.

#### Scenario: Candidate monster art remains non-runtime until onboarded
- **WHEN** 使用者提供新的怪物總覽圖或參考怪物圖
- **THEN** 該素材必須先進入 candidate monster master sheet，並記錄 visual group、預計用途與晉升狀態
- **AND** 不得因圖片已被收錄在規格中，就視為 BootScene 或地圖配置已可直接使用

#### Scenario: Reference platform art stays outside runtime until collision policy is defined
- **WHEN** 參考用遊戲畫面中的 jump_plat 或其他長條平台圖被列入候選
- **THEN** 規格必須先記錄其預計地圖、renderHeight 與 collisionPolicy
- **AND** 在未定義碰撞策略前，不得把它標示為正式 runtime 平台樣式

### Requirement: Runtime monster catalog SHALL formalize miniboss and alignment coverage
The runtime monster catalog SHALL represent generic monsters, minibosses, and support monsters as explicit groups. Each runtime monster entry MUST indicate whether alignment metadata is complete, pending, or not required.

#### Scenario: Existing minibosses are no longer hidden in the generic monster list
- **WHEN** 盤點 city_boss1 與 city_boss2
- **THEN** 規格必須把它們歸類到 miniboss group，而不是只視為一般怪物資料列
- **AND** 每個小王條目都必須保留 spriteKey、出現地圖與尺寸/對齊狀態

#### Scenario: Missing alignment coverage is surfaced instead of ignored
- **WHEN** 某張 runtime 怪物圖尚未有完整的 alignment metadata
- **THEN** catalog 必須明確標示為 pending-alignment
- **AND** 不得因該圖已能載入與生成，就把對齊缺口視為已解決

#### Scenario: Runtime coverage does not imply mandatory map usage
- **WHEN** 某張怪物圖片已完成 runtime onboarding
- **THEN** 文件可以將其標示為 used、reserve 或特定地圖限定使用
- **AND** 不得因資產已存在 runtime catalog，就要求每張圖都必須在當前版本同時上場

### Requirement: Asset statuses SHALL distinguish used, replace, candidate, reserve, and unused-research
The asset catalog SHALL classify tracked assets by lifecycle status so that developers can tell whether a file is active, replacing another file, waiting for onboarding, reserved for future use, or still under research.

#### Scenario: A file in dist/assets is not deleted just because it is unused today
- **WHEN** 某張圖片已存在於 dist/assets 但沒有綁定任何 runtime 條目
- **THEN** 規格必須把它標記為 reserve 或 unused-research
- **AND** 不得在沒有明確淘汰決策前直接刪除該檔案

#### Scenario: Candidate and replacement statuses are not conflated
- **WHEN** 一張新背景準備取代玩具城舊背景，而另一張台北背景僅做新地圖候選
- **THEN** 前者必須標記為 replace，後者可標記為 candidate
- **AND** 文件必須能清楚區分「取代現有畫面」與「新增但尚未啟用」兩種狀態

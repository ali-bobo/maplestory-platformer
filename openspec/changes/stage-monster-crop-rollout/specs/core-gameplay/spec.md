## MODIFIED Requirements

### Requirement: Monster catalog SHALL support explicit gameplay classification
怪物資料 MUST 支援明確分類，且在新怪物圖導入時應能以分批方式整理，不得再依賴一次全量拆圖與全地圖替換。

#### Scenario: Candidate monsters are onboarded in bounded batches
- **WHEN** 開發者開始整理一批新的怪物來源圖
- **THEN** 該批次必須先明確限定單一來源圖或單一同源怪物群組
- **AND** 不得在同一批內無上限地擴充到其他來源圖、其他平台圖或其他未確認地圖議題

#### Scenario: Batch A establishes the first stable monster crop workflow
- **WHEN** 團隊執行第一批怪物拆分整理
- **THEN** Batch A 必須先完成來源對照、輸出命名、monster id 綁定與目標地圖指派
- **AND** 只有在 Batch A 驗證通過後，後續 Batch B 才能沿用同一流程處理剩餘怪物

#### Scenario: Batch onboarding includes map-specific verification
- **WHEN** 任一批怪物完成裁切與命名
- **THEN** 該批怪物必須被加入自己的目標地圖測試並確認可正常生成
- **AND** 在完成地圖測試前，不得視為該批怪物已完成 onboarding

#### Scenario: A reorganized monster appears only in its assigned map
- **WHEN** 某個已整理的怪物被重新分類到指定地圖
- **THEN** 該怪物在 runtime roster 中應只出現在自己的目標地圖
- **AND** 不得保留同一怪物在多張主題不相符地圖中的重複配置，除非規格另外明確記錄例外原因

#### Scenario: Platform fixes are deferred when the active batch is monster-only
- **WHEN** 本輪批次被定義為 monster-only onboarding
- **THEN** 森林看台壓縮、裁短與隱形碰撞問題必須被標記為後續批次
- **AND** 不得與當前怪物拆分批次一起混做，避免再次失去問題定位能力
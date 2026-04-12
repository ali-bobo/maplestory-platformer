# Core Gameplay Specification

## Purpose
整合目前遊戲主流程、成長、地圖、Boss、HUD 與結算等已建立能力，形成新版 OpenSpec 的現況主規格。

## Requirements

### Requirement: The main loop SHALL support a playable action-RPG progression path
遊戲 MUST 支援從主選單進入、在多張地圖戰鬥、升級、掉寶、解鎖 Boss，到死亡或勝利結算的完整單機流程。

#### Scenario: Player can traverse the main loop end-to-end
- **WHEN** 玩家從主選單開始遊戲並持續戰鬥
- **THEN** 系統應支援進場、戰鬥、獲得 EXP、升級、拾取裝備、切換地圖與進入 Boss 戰
- **AND** 最終應能進入死亡或勝利結算畫面

### Requirement: Player progression SHALL update combat capability
玩家的等級、EXP、技能解鎖與裝備加成 MUST 共同影響戰鬥能力。

#### Scenario: Leveling up modifies stats and unlocks skills
- **WHEN** 玩家 EXP 達到升級門檻
- **THEN** 系統應提升 HP、MP、ATK、速度與技能點數，並按等級解鎖技能
- **AND** 新狀態應立即同步到 HUD 與後續戰鬥邏輯

#### Scenario: Equipment upgrades alter the active build
- **WHEN** 玩家拾取並裝備更好的裝備
- **THEN** 裝備屬性應影響攻擊力、最大 HP、最大 MP 或速度
- **AND** 玩家目前裝備欄應反映最新套用結果

### Requirement: Map traversal SHALL preserve cross-scene game state
玩家在多張地圖與 Boss 房之間切換時，核心遊戲狀態 MUST 被保留。

#### Scenario: Scene changes keep player state intact
- **WHEN** 玩家透過傳送門或流程切換進入另一張地圖
- **THEN** 等級、HP、MP、裝備、技能冷卻、擊殺數與 Boss 解鎖進度應保持一致
- **AND** 切換後的進場位置應落在有效地面或平台上

#### Scenario: Taipei city exists as a playable side-route map
- **WHEN** 玩家在主流程中進入台北城支線地圖
- **THEN** 系統應將台北城視為正式可載入、可戰鬥、可切回主線的地圖，而不是僅存在於 deferred spec 的候選資料
- **AND** 台北城的背景、平台、怪物配置與傳送門進出行為必須遵守與其他主線地圖相同的 scene flow 與 state preservation 規則

### Requirement: Boss progression SHALL be gated by combat progress
Boss 入口 MUST 由玩家在主線地圖中的擊殺進度解鎖，並在 Boss 戰中提供完整的多階段體驗。

#### Scenario: Boss unlock follows kill count threshold
- **WHEN** 玩家達成 Boss 解鎖條件
- **THEN** 對應地圖的 Boss 傳送門應可進入
- **AND** 勝利後應進入勝利結算而非一般死亡結算

#### Scenario: Planned boss map and boss art can be specified before implementation
- **WHEN** 使用者已完成新 Boss 地圖構圖與 Boss 圖片設計，但本輪尚未要求接入 runtime
- **THEN** 規格必須允許先記錄新的 Boss arena 與 Boss 視覺作為 planned content
- **AND** 這些條目在未實作前不得被視為已接線的場景、可載入圖片或正式替代現行 Boss 房與 Boss 圖

### Requirement: The HUD SHALL present essential combat state persistently
遊戲畫面 MUST 持續顯示與戰鬥決策直接相關的資訊，並在切場與結算時妥善管理場景生命週期。

#### Scenario: HUD shows core resources and shortcuts
- **WHEN** 玩家處於主線地圖或 Boss 戰中
- **THEN** HUD 應顯示 HP、MP、EXP、等級、技能快捷列、藥水欄與功能按鈕
- **AND** 技能冷卻顯示應與實際技能可用性一致

#### Scenario: HUD does not remain over non-gameplay scenes
- **WHEN** 玩家進入主選單、死亡結算或勝利結算
- **THEN** UIScene 或等效 HUD 場景應停止或隱藏
- **AND** 不得出現底部狀態列或透明疊圖殘留在非戰鬥畫面上

### Requirement: The runtime baseline SHALL remain stable for the current playable build
目前版本基線 MUST 維持可進場、可施放技能、可戰鬥與無明顯 runtime error 的狀態。

#### Scenario: Current baseline remains usable after incremental changes
- **WHEN** 開發者對站位、技能、HUD 或場景切換做增量修改
- **THEN** 主流程不應因此失去可玩性
- **AND** 已知尚未完成的能力，例如 ESC 暫停選單、目標選取框、Level Up 全屏演出與 Town 商店正式接入，應視為後續能力缺口，而不是目前基線已完成項

### Requirement: Monster catalog SHALL support explicit gameplay classification
怪物資料 MUST 支援明確分類，讓後續調整地圖分配、素材替換與平衡時不需要重新猜測怪物定位。

#### Scenario: Runtime monsters are grouped by gameplay-facing families
- **WHEN** 開發者整理或擴充怪物 catalog
- **THEN** 系統應至少能以天空系、森林系、廢墟系、玩具城系、城市系、菁英 / 小王 / Boss 援軍等分類描述目前 runtime 怪物
- **AND** 分類規格不得破壞既有 monster id、spriteKey、mapData.monsters count 契約

#### Scenario: Monster classification can drive later map revisions
- **WHEN** 開發者準備調整台北城、Kerning City 或其他地圖的怪物名單
- **THEN** 可先依怪物分類挑選候選群組，再回填到地圖配置
- **AND** 分類名稱應作為 spec 與 catalog 的穩定語彙，而不是只散落在臨時盤點文件中

#### Scenario: Biome-themed map rosters use nearby monster families
- **WHEN** 開發者依地圖主題重新整理怪物分布
- **THEN** 森林地圖應優先使用精靈類、林地獸類、植物 / 菇類等貼近自然場景的群組
- **AND** 勇士峽谷應優先使用戰士類、重裝類、岩石 / 野獸類等近戰壓迫感較強的群組
- **AND** 天空之城或高空奇幻地圖應優先使用奇幻類、飛行類、星空 / 史萊姆變體等高辨識度幻想群組

#### Scenario: Mismatched runtime monsters may be moved out before replacement
- **WHEN** 既有某張地圖的怪物與地圖主題明顯不相符
- **THEN** 規格應允許先將不適合的怪物移出該地圖，再由更貼近主題的新群組遞補
- **AND** 這種替換必須先以分類邏輯與候選清單成立，而不是單純依目前有哪些圖檔可用決定

#### Scenario: Candidate monsters stay pending until crop, category, and map binding are complete
- **WHEN** 使用者提供的新怪物圖尚未完成裁切、分類或地圖歸屬
- **THEN** 這些怪物必須維持 pending onboarding 狀態
- **AND** 在完成裁切、分類與地圖綁定前，不得直接塞進正式 runtime roster

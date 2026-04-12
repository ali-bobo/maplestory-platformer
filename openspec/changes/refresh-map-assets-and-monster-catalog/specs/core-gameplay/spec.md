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

#### Scenario: Boss art replacement keeps the boss scene contract
- **WHEN** Boss 房背景或 Boss 主體圖被替換為新的 runtime asset
- **THEN** `BossScene`、Boss 勝利流程與援軍生成契約必須保持不變
- **AND** 不得因美術替換而要求改寫既有 Boss 場景切換流程

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

#### Scenario: Curated map rosters do not require every runtime monster to appear
- **WHEN** 開發者依森林、峽谷、城市等主題精簡地圖實際上場怪物
- **THEN** 可只選用最符合版面與主題的部分 runtime monster
- **AND** 不得要求每一張已上線怪物圖都必須同時出現在目前版本的所有地圖中

#### Scenario: Miniboss emphasis uses size and rarity instead of crowding
- **WHEN** 某些特別怪被提升為小王
- **THEN** 它們可以透過較大的 display size 與較低 count 在地圖中出場
- **AND** 不得因小王放大而破壞既有平台站位、碰撞或怪物生成流程

### Requirement: Toytown platform presentation SHALL be treated as the validated image-platform reference
玩具城長條跳台樣式 MUST 被視為已驗證的圖片平台展示基準，供森林等同類型地圖沿用。

#### Scenario: Toytown keeps enlarged, de-backgrounded, image-native presentation
- **WHEN** ellinia 套用玩具城背景與長條平台樣式
- **THEN** 圖片平台必須保留放大後的顯示高度、去除近白底的透明邊界與靠上方的站立接觸線
- **AND** 不得為了對齊一般平台寬度而再次將其壓縮成扁平外觀

#### Scenario: Forest inherits Toytown footing while narrowing the visible span
- **WHEN** 森林長條跳台參考玩具城樣式重做
- **THEN** 森林可以保留相同的裁切 / 腳底接觸線模型，但應使用較窄的顯示寬度來貼近原始森林構圖
- **AND** 玩家、怪物與 NPC 的站位不得因寬度修正而再次陷入平台

#### Scenario: Forest, Toytown, and Taipei use one image-platform flow
- **WHEN** 森林、玩具城或台北的可見跳台被建立
- **THEN** 它們都應透過同一套 `image-native` 平台流程建立可見圖層與碰撞面
- **AND** 不得在同一批長條跳台中混用舊的平面程序跳台，造成接觸線或素材 row 錯置

#### Scenario: Image platforms remove white fringes and fade their seams
- **WHEN** 長條跳台母圖仍帶有近白背景或明顯矩形邊界
- **THEN** runtime 處理應將近白像素淡出，並對平台左右端與下緣做融合淡化
- **AND** 不得留下明顯白邊或硬切矩形邊框破壞背景融合

### Requirement: Runtime monster polish SHALL cover roster uniqueness, large-monster sizing, and light mobility pressure
runtime 怪物整修 MUST 同時處理首章輪廓重複、後段大型怪物尺寸不足與選定怪物缺乏位移威脅的問題。

#### Scenario: The first map avoids duplicate-looking monster silhouettes
- **WHEN** 第一章地圖整理起手怪名單
- **THEN** 應移除視覺上像同素材縮放版的重複輪廓組合
- **AND** 改用輪廓差異更明顯的天空 / 新手區怪物組合

#### Scenario: Larger monsters in later maps use explicit size metadata
- **WHEN** 廢墟、Kerning 或 Taipei 使用 big 系列或明顯屬於大型體型的怪物
- **THEN** 這些怪物應透過 `visualScale` 顯式放大到符合預期的區域壓迫感
- **AND** 不得只讓 miniboss 放大而忽略其他大型怪

#### Scenario: Monster rendering preserves source proportions while keeping a baseline size
- **WHEN** 怪物圖的原始尺寸明顯大於或小於 legacy 80x80 基準
- **THEN** runtime 顯示尺寸應保留來源圖長寬比，且小型怪不得低於基本可讀尺寸
- **AND** 較大的怪物不得再被強制壓成與小怪相同的固定方形尺寸而失去量感或清晰度

#### Scenario: Selected monsters gain low-frequency jumping pressure
- **WHEN** 某些近戰或追擊型怪物需要提升威脅性
- **THEN** 系統可為其加入帶冷卻與機率控制的低頻跳躍行為
- **AND** 跳躍頻率必須維持在不會讓整張地圖變成持續彈跳噪音的範圍內

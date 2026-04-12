# Combat Skills Specification

## Purpose
定義盜賊角色五個主動技能的行為、解鎖條件、最低視覺回饋標準與特效清理原則，讓技能邏輯、光影演出與施放後的畫面穩定性可以被一致維護、回查與驗證。

## Requirements

### Requirement: The player SHALL have five active combat skills
系統 MUST 提供 Z、X、C、V、B 五個主動技能，並以等級、冷卻與 MP 消耗控制可用性。

#### Scenario: Skill access follows level and resource constraints
- **WHEN** 玩家按下任一技能快捷鍵
- **THEN** 系統應先檢查該技能是否已解鎖、冷卻是否結束、MP 是否足夠
- **AND** 若任一條件不成立，不得施放技能效果

### Requirement: Shuriken Triple SHALL behave as a multi-projectile ranged attack
Z 技能 MUST 發射三枚飛鏢，並提供明確的投擲、飛行與命中視覺回饋。

#### Scenario: Three shurikens launch with throw feedback
- **WHEN** 玩家施放 Z 技能
- **THEN** 系統應發射三枚飛鏢並播放投擲動作或等效的投擲姿勢演出
- **AND** 每枚飛鏢必須帶有可見尾跡與短暫殘影

#### Scenario: Shuriken impact creates directional burst feedback
- **WHEN** 飛鏢命中敵人
- **THEN** 命中點應產生扇形爆裂粒子與能量環
- **AND** 不得只有單點命中、看不出飛鏢方向與打擊感

### Requirement: Shadow Step SHALL behave as a burst dash attack
X 技能 MUST 讓玩家在短時間內高速衝刺，並在過程中留下清楚的殘影與起落點演出。

#### Scenario: Dash start and end are visually readable
- **WHEN** 玩家施放 X 技能
- **THEN** 起點應產生白色衝擊圓，衝刺期間應持續生成有限數量的紫色殘影與閃爍效果
- **AND** 結束時應在玩家落點產生地面粒子或等效的收尾演出

#### Scenario: Dash damage only hits enemies once per cast
- **WHEN** 玩家衝刺穿越同一敵人多次碰撞區域
- **THEN** 該敵人每次施放最多只應受到一次 X 技能傷害

### Requirement: Assassinate SHALL execute a stable teleport strike
C 技能 MUST 對最近敵人進行瞬移暗殺，並保持玩家施放後不進入錯誤狀態。

#### Scenario: Assassinate no longer freezes due to runtime errors
- **WHEN** 玩家施放 C 技能且範圍內存在可攻擊敵人
- **THEN** 技能流程應完整執行，不得因未宣告變數或特效流程錯誤而卡住玩家控制

#### Scenario: Assassinate produces high-impact strike feedback
- **WHEN** 玩家成功施放 C 技能
- **THEN** 畫面應出現短暫白閃、瞬移後衝擊波、十字斬光效與強烈相機震動
- **AND** 命中的敵人頭頂應出現暫時性的昏迷圖示或等效標記

#### Scenario: Assassinate death handling remains readable
- **WHEN** C 技能擊殺敵人
- **THEN** 目標應以縮退淡出或等效的強烈死亡收尾方式退場
- **AND** 不得在命中瞬間直接消失而缺乏打擊確認感

### Requirement: Shadow Vortex SHALL telegraph and release area control visually
V 技能 MUST 先提供 AoE 範圍提示，再以旋轉魔法陣與同步能量球完成施放。

#### Scenario: Vortex telegraphs before release
- **WHEN** 玩家施放 V 技能
- **THEN** 應先顯示半透明紅色範圍提示，再進入正式施放
- **AND** 不得讓能量球在沒有前搖提示的情況下直接出現

#### Scenario: Vortex uses rotating circles and simultaneous orb launch
- **WHEN** V 技能進入正式施放階段
- **THEN** 魔法陣應呈現旋轉動畫，且所有能量球應同批發射並帶有拖尾
- **AND** 技能結束時圓圈應以向外爆散的方式消散

### Requirement: Shadow Clone SHALL remain readable during its full lifespan
B 技能 MUST 在召喚、存在、攻擊與消散四個階段都提供清楚的視覺回饋。

#### Scenario: Clone summon and upkeep are visible
- **WHEN** 玩家施放 B 技能
- **THEN** 分身應以召喚粒子出場，存在期間保持微閃與可視生命條
- **AND** 玩家應能直觀看出分身還剩多少持續時間

#### Scenario: Clone attack and dispersal are staged
- **WHEN** 分身攻擊敵人或持續時間結束
- **THEN** 攻擊時應有揮擊弧線或等效打擊演出，消散時應向上飄散並伴隨紫色粒子
- **AND** 不得只用單純 destroy 而缺少退場段落

### Requirement: Skill visuals SHALL clean up transient artifacts
技能的粒子、殘影、震動與全畫面閃光 MUST 有明確生命週期，避免在場景內留下短暫透明重疊或殘留 HUD 疊圖。

#### Scenario: Temporary effects self-clean after each cast
- **WHEN** 任一技能施放完成或技能物件銷毀
- **THEN** 對應的粒子發射器、殘影、graphics 與 flash overlay 應自動停止並清理
- **AND** 不得在幾次施放後累積透明疊層而讓畫面看起來像重影或泛白

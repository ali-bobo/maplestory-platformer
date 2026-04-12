## MODIFIED Requirements

### Requirement: Dynamic entities SHALL share a visual standing baseline
The system SHALL ensure that players, monsters, and bosses share the same visual foot baseline when standing on the same platform. The baseline SHALL be judged by the visible foot contact line rather than transparent padding or collision contact alone.

#### Scenario: Current regression is visible on multiple maps
- **WHEN** 在浮空島嶼、古代廢墟或森林獵場檢視玩家與怪物站位
- **THEN** 目前可觀察到玩家或怪物未貼齊預期紅線基準，而 NPC 相對接近正確位置
- **AND** 此現象應被視為待修正的回歸，而不是可接受差異

#### Scenario: Screenshot case A is treated as a failing example
- **WHEN** 檢視浮空島嶼上層平台的玩家截圖
- **THEN** 玩家卡入平台或懸掛於平台下緣的畫面必須被判定為失敗
- **AND** 不得因碰撞仍成立就視為已對齊

#### Scenario: Screenshot case B is treated as a failing example
- **WHEN** 檢視古代廢墟地面的玩家、怪物與 NPC 截圖
- **THEN** 若三者無法共用同一條地面基準線，必須視為失敗
- **AND** 不得只挑其中一類實體對齊就宣告修正完成

#### Scenario: Screenshot case C is treated as a failing example
- **WHEN** 檢視森林獵場上層平台的玩家截圖
- **THEN** 若玩家下半身被平台吃入而非站在平台表面，必須視為失敗
- **AND** 此現象應優先歸因於腳底模型不一致，而非先歸因於背景圖本身

#### Scenario: Player and monster stand on the same platform after the fix
- **WHEN** 玩家與任一怪物在同一塊平台或地面上靜止
- **THEN** 兩者的視覺腳底應落在同一平台頂部基準線
- **AND** 不得出現玩家明顯懸空但怪物貼地，或怪物貼地但玩家陷入平台的情況

#### Scenario: Boss follows the same standing rule
- **WHEN** Boss 站在 Boss 房的地面或平台上
- **THEN** Boss 也必須遵守相同的腳底基準
- **AND** 不得因大型 sprite 縮放而單獨漂浮或下沉

## ADDED Requirements

### Requirement: Alignment implementation SHALL use one consistent model
The alignment implementation SHALL use one consistent dynamic foot-baseline model. It SHALL avoid leaving NPCs, players, monsters, and bosses on conflicting standing assumptions.

#### Scenario: Mixed alignment assumptions are removed
- **WHEN** 實作角色站位修正
- **THEN** 玩家、怪物與 Boss 的對齊方式應能用同一組腳底基準解釋
- **AND** 不得維持 NPC 用腳底原點、玩家與怪物用另一套 display/body offset 假設的長期狀態

#### Scenario: Validation is tied to visible outcome instead of magic numbers
- **WHEN** 調整 display size、body size、offset 或對齊公式
- **THEN** 驗收應以可見腳底與平台頂部是否重合為主
- **AND** 不得只因某組 offset 數值看似合理就視為完成

#### Scenario: Failed offset-only fixes are not repeated blindly
- **WHEN** 團隊再次嘗試只透過 `body.setSize()`、`body.setOffset()` 或單一 magic number 修正站位
- **THEN** 必須先說明該調整要驗證哪個明確假設
- **AND** 若同類方法先前已失敗，規格與任務中必須記錄為重試而非當成全新解法

### Requirement: Asset normalization SHALL be treated as a supporting tactic
Asset normalization SHALL be treated as a supporting tactic for maintainability rather than the primary alignment fix.

#### Scenario: Character and monster source boxes are standardized
- **WHEN** 角色與怪物圖片被整理為接近的來源尺寸與輸出規格
- **THEN** 後續維護與比對成本應下降
- **AND** 仍必須保留腳底基準或 foot-anchor 規則來決定最終站位

#### Scenario: Background normalization is evaluated and rejected for this bug
- **WHEN** 討論是否把所有背景圖做成幾乎相同大小來解決站位問題
- **THEN** 該方案應被記錄為低相關性方案
- **AND** 不應取代角色與怪物腳底模型修正

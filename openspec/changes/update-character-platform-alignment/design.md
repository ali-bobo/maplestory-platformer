# Design: Character Platform Alignment

## Context
既有專案已經有一套平台生成與場景切換邏輯，但站位計算目前分成兩種模型：NPC 以腳底原點直接貼齊平台，玩家與怪物則使用顯示尺寸、碰撞盒高度與 offset 推算 y 位置。這使得只要圖片透明留白、display size、body size 或 platform body refresh 有任一變動，就可能造成全地圖的視覺錯位。

## Why It Looks Wrong To The User
- 使用者提供的紅線代表「視覺腳底應該接觸的平台頂部」，而不是碰撞盒數學上已經成立的站立狀態。
- 在截圖中，NPC 接近紅線，但玩家與怪物沒有共用同一條接觸線，導致場景內角色彼此看起來像屬於不同世界座標系。
- 正式遊戲參考畫面中，多種角色即使素材大小不同，也會共享明確的腳底接觸感；目前專案缺的是這個視覺一致性，而不是單純的圖片縮放問題。

## Screenshot Case Inventory
- Case A: 浮空島嶼上層平台，玩家看起來卡進綠色平台下緣，沒有穩定站在平台上表面的感覺。
- Case B: 古代廢墟地面，NPC、玩家、怪物與地面黑色區域的相對高度明顯不一致，代表場景內至少有兩套站位基準。
- Case C: 森林獵場上層平台，玩家身體進入平台，說明 `displayHeight + body offset` 的推算與可見腳底不一致。
- Reference: 正式遊戲畫面可用來比較角色與平台的接觸感、前後層次與腳底落點，但不應拿來要求本專案背景構圖逐像素相同。

## Goals
- 用單一模型定義玩家、怪物、Boss、NPC 的視覺腳底基準。
- 讓平台站位在所有主要地圖中表現一致。
- 讓之後更換角色圖或怪物圖時，仍有規格可回查與重新驗證。

## Non-Goals
- 這次變更不處理技能平衡、怪物 AI、HUD 重構或背景美術升級。
- 不追求與官方遊戲素材逐像素重疊，只追求相同的腳底貼地感與層級合理性。

## Decisions
- 以「可見腳底貼齊平台頂部」作為驗收真相，而非單純 `body.bottom == platform.top`。
- 保留平台資料與場景流程，但重新審視動態角色的對齊方式，避免 NPC 與動態角色使用不同模型。
- 先在單一地圖驗證，再擴到所有地圖，避免多個變因同時改動後無法定位失敗原因。

## Failed Approaches So Far
- 方式 1: 只調整 `spawnX` 或傳送門位置。
  - 失敗原因: 這只能改變進場的水平位置，無法解決所有地圖都存在的垂直腳底錯位。
- 方式 2: 只在 `Player` 或 `Monster` 上微調 `body.setSize()` / `body.setOffset()`。
  - 失敗原因: 這些值目前建立在「用圖片透明留白推算腳底」的假設上；一旦圖片裁切、display size 或怪物種類不同，推算就失效。
- 方式 3: 保留 NPC 腳底原點模型，同時讓動態角色繼續使用 `displayHeight * originY - offset - body.height` 公式。
  - 失敗原因: 兩套模型沒有共同真相，結果是 NPC 看起來對，但玩家與怪物不對，或反之。
- 方式 4: 直接憑感覺改地圖平台資料。
  - 失敗原因: 若根因在角色腳底模型，改平台只是在用地圖資料補角色錯位，會讓不同地圖越修越分歧。
- 方式 5: 只看碰撞是否成立，不看角色視覺接觸線。
  - 失敗原因: Phaser 可以認定角色已站穩，但從玩家視角仍然像飄浮或陷入平台，因此問題沒有真正被解決。

## Alternative Options
- 方案 A: 單一視覺腳底模型。
  - 做法: 讓玩家、怪物、Boss 都以同一種「腳底錨點」規則對齊平台。
  - 優點: 最符合目前問題本質，也最容易和 NPC 模型對齊。
  - 風險: 需要重新整理動態實體的初始化與落地後穩定流程。
- 方案 B: 每個素材提供明確的 foot anchor metadata。
  - 做法: 為玩家、怪物、Boss 定義腳底基準點或底部留白量，對齊時直接用 metadata，而不是猜 offset。
  - 優點: 對不同素材差異最穩定，未來換圖時也較可控。
  - 風險: 需要補一層素材配置資料，初始整理成本較高。
- 方案 C: 標準化角色與怪物圖片盒尺寸。
  - 做法: 將角色與怪物盡量整理為接近的來源尺寸與輸出尺寸規格。
  - 優點: 可降低每張圖個別調 offset 的成本，讓維護比較容易。
  - 風險: 不能單獨解決站位問題，因為即使盒子相同，腳底在圖內的位置仍可能不同。

## Selected Implementation Path
- 本次實作採用「單一動態腳底基準 + per-asset foot-anchor metadata」的混合方案。
- 做法是讓 Player、Monster、Boss 都從對齊 metadata 取得 display size、body width、body offset 與 foot padding，並由 foot padding 反推 body height，使視覺腳底與 Physics 站位使用同一組來源資料。
- `BaseMapScene` 的動態對齊函式改為優先讀取實體上的 `visualFootPadding`，不再讓每個角色類各自用註解或魔術數字猜測底部留白。
- Boss 與 Boss 召喚的小怪也必須接入同一條對齊流程，避免場景內再次分裂成多套站位模型。

## Verified Root Cause During Implementation
- Phaser Arcade Physics 的 `body.setSize()` 與 `body.setOffset()` 以原始貼圖座標為基準，不是以 `setDisplaySize()` 之後的畫面像素為基準。
- 先前失敗的版本把顯示尺寸直接當成 body 尺寸使用，導致玩家與怪物在 physics 落地後被系統重新推到底線下方，即使 `_alignDynamicEntityToPlatformTop()` 當下看起來有對齊。
- 玩家與怪物素材的透明底邊差異也已被實測確認：`final_char` 底部留白 29px / 231px，高於多數怪物，因此不能再用單一魔術數字處理所有動態實體。
- 最新版本改為：先依原始貼圖尺寸換算 body size/offset，再依 texture key 套用對應的腳底留白比例，最後用 live runtime 數值驗證 `player.body.bottom`、`npc.body.bottom`、`monster.body.bottom` 是否共線。

## Risks / Trade-offs
- 若只調整玩家 body size 而不調整怪物與 Boss，場景內仍會出現相對錯位。
- 若只用圖片直覺調整而沒有規格，之後更換素材會再次漂移。
- 若過度依賴某一張地圖的視覺結果，可能掩蓋其他地圖的平台資料特例。

## Validation Approach
- 以使用者提供的紅線截圖作為錯誤樣貌與目標位置參考。
- 以 NPC 當作場景內既有的站位參考物。
- 先觀察 ground 與 mid-platform，再驗證 thin-platform 與切圖重生。
- 每當驗證結果推翻目前假設時，必須同步更新 tasks、design 與 spec delta，避免規格和實作再次脫節。
- 最新一次 live 驗證已直接讀取執行中場景數值：`player.body.bottom = 600`、`npc.body.bottom = 600`、地面怪物 `body.bottom = 600`，上層怪物則分別貼齊 `400` 與 `240` 平台頂線。

## Successful Record
- 已確認最終可行解為「HUD 上緣作為地板基準 + 動態實體共用腳底錨點 + 依貼圖原始尺寸換算 Arcade body + 依 texture key 套用腳底留白比例」。
- 已透過 live 畫面與 runtime 數值雙重驗證，確認 NPC、玩家與怪物已共享同一條平台接觸線，而不是僅有碰撞成立但視覺錯位。
- 已確認先前造成使用者誤判的因素包含：額外黑帶、NPC 與動態實體使用不同對齊模型、以及將顯示尺寸誤當成 Arcade body 尺寸。
- 後續若再發生站位異常，應優先檢查對齊 metadata、貼圖底部透明留白比例與 body 尺寸換算，不應再先從 portal 或單一地圖 platform 座標下手。

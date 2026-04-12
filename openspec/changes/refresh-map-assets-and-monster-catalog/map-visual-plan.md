## Map Visual Plan

### Ellinia / Toytown Replacement

- targetMap: ellinia
- keep: map key `ellinia`, sceneKey `ElliniaScene`, portals, NPC flow, spawnX, monster spawn contract
- replace runtime background: BG-TOY-001 `bg_toytown`
- replacement candidate: CAND-BG-TOY-001 from 參考用遊戲畫面/toy-TOWN_new (1).png
- fallback candidate: CAND-BG-TOY-002 from 參考用遊戲畫面/toytown.png
- rollout rule: 先替換背景，再局部導入長條平台 style，不同時改 portal 或怪物生成邏輯

### Forest And Toytown Long Platform Style

candidate source: 參考用遊戲畫面/jump_plat.png

| platformStyleId | targetMaps | renderHeight | collisionPolicy | planned segments | status |
| --- | --- | --- | --- | --- | --- |
| PLT-LONG-001 | henesys, ellinia, taipei | 固定畫面高度；森林約 86px、玩具城約 92px、台北約 80px，並以中央裁切視窗保留原圖細節大小，不再把整張 1377px 橫圖壓縮到單一平台寬度 | render-only 圖層 + thin-platform 碰撞；碰撞高度維持 18~20px，禁止把整張圖片直接當實心牆 | 第一層與第二層各挑 1 到 2 段做局部替換 | implemented |

導入原則：
- 長條平台先做局部替換，不直接覆蓋整張地圖全部平台。
- 若圖片視覺高度高於 24px，優先以 render-only 外觀處理，不先改碰撞盒高度。
- 森林與玩具城使用同一個 long platform style catalog，避免兩張圖各自分叉命名。
- 過去嘗試的失敗點：若直接用 `displayHeight = width * ratio` 依寬度等比拉高，全景平台會因寬度不同而厚薄失真；若直接讓圖像 sprite 承擔實體碰撞，玩家從下方起跳時會撞到看不見的實心牆。現行規格明確要求分離 render 與 collision。
- 第二次校正的失敗點：即使把碰撞拆開，若仍直接把整張 row 素材橫向縮到平台寬度，細節尺寸會被壓扁，導致畫面不協調。現行規格要求使用中央裁切視窗保留素材原始細節比例，再以固定 renderHeight 做輕度縮放。

### Taipei Deferred Map Spec

- targetMap: taipei
- runtime state: deferred
- candidate background: CAND-BG-TPE-001
- planned runtime key: `bg_taipei`
- suggested sceneKey: `TaipeiScene`
- suggested map role: 新城市系地圖，先不插入既有主線 portal

#### Platform Sketch

| lane | planned material | note |
| --- | --- | --- |
| ground | brick / city deck | 保留城市地面感 |
| mid-left | long platform style | 測試新長條跳台在城市場景的可讀性 |
| mid-right | brick | 與既有城市平台保持連續性 |
| upper-left | long platform style | 提供跳躍節奏變化 |
| upper-right | wood or brick | 視背景構圖調整 |

#### Monster Candidate Direction

- 低優先：沿用現有 city_thug、city_mech、city_beast、city_elite 做第一版地圖驗證
- 中期：從候選怪物母表選入 spirit、wolf、mechanical pig 等更貼近台北都市風格的族群
- 本輪限制：不新增台北專屬 Boss，不強制接正式 portal
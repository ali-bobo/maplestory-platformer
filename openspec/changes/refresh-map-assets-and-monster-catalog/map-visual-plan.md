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
| PLT-LONG-001 | henesys, ellinia | 24px baseline first | 沿用現有平台頂部與 thin-platform 規則，先不改碰撞高度 | 第一層與第二層各挑 1 到 2 段做局部替換 | candidate |

導入原則：
- 長條平台先做局部替換，不直接覆蓋整張地圖全部平台。
- 若圖片視覺高度高於 24px，優先以 render-only 外觀處理，不先改碰撞盒高度。
- 森林與玩具城使用同一個 long platform style catalog，避免兩張圖各自分叉命名。

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
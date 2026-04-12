## Candidate Asset Inventory

本表只收候選參考素材，不代表已可由遊戲 runtime 直接載入。候選素材要晉升為 runtime asset，至少需要完成命名、放入 dist/assets、BootScene preload、config 綁定與必要的 alignment/collision metadata。

### Workspace Reference Assets

| candidateId | groupId | source | kind | planned use | promotion status | notes |
| --- | --- | --- | --- | --- | --- | --- |
| CAND-BG-TOY-001 | CAND-BG-TOY | 參考用遊戲畫面/toy-TOWN_new (1).png | background | 取代現有玩具城背景 | promoted-runtime | 已複製為 dist/assets/bg_toytown_refresh.png |
| CAND-BG-TOY-002 | CAND-BG-TOY | 參考用遊戲畫面/toytown.png | background | 備用玩具城背景 | reserve | 與上一張互為候選 |
| CAND-BG-TPE-001 | CAND-BG-TPE | 參考用遊戲畫面/Taipei_city.png | background | 台北地圖背景 | promoted-runtime | 已複製為 dist/assets/bg_taipei.png 並接入 taipei map |
| CAND-BG-RUI-001 | CAND-BG-RUI | 參考用遊戲畫面/ruins_background.png | background | 廢墟背景優化參考 | reserve | 本輪不優先實作 |
| CAND-PLT-LONG-001 | CAND-PLT-LONG | 參考用遊戲畫面/jump_plat.png | platform | 玩具城/森林長條跳台 | promoted-runtime | 已複製為 dist/assets/platform_long.png，先以 overlay 方式接入 |
| CAND-MON-REF-001 | CAND-MON-REF | 參考用遊戲畫面/monster.png | monster-sheet | 候選怪物風格參考 | unused-research | 未切成 runtime sprite |
| CAND-MON-REF-002 | CAND-MON-REF | 參考用遊戲畫面/monster2.jpg | monster-sheet | 候選怪物風格參考 | unused-research | 未切成 runtime sprite |
| CAND-MON-REF-003 | CAND-MON-REF | 參考用遊戲畫面/monster3.jpg | monster-sheet | 候選怪物風格參考 | unused-research | 未切成 runtime sprite |

### User-Provided Monster Overview

來源：2026-04-12 使用者提供的總覽圖「NEW ARTALE MONSTER CATALOG」。

| candidateId | groupId | source | planned role | promotion status | notes |
| --- | --- | --- | --- | --- | --- |
| CAND-MON-SLIME-001 | CAND-MON-SLIME | 使用者提供總覽圖 | slime 系候選母表 | candidate | 可衍生 crystal、lava、steel、galaxy、glowing 等變體 |
| CAND-MON-MUSH-001 | CAND-MON-MUSH | 使用者提供總覽圖 | mushroom 系候選母表 | candidate | 可衍生 spiky、glowing、mechanical、cursed 等變體 |
| CAND-MON-SPIRIT-001 | CAND-MON-SPIRIT | 使用者提供總覽圖 | spirit 系候選母表 | candidate | 包含 cursed、cutey、sunflower、ice、cycloid 等支線 |
| CAND-MON-WOLF-001 | CAND-MON-WOLF | 使用者提供總覽圖 | wolf / beast 系候選母表 | candidate | 包含 armored、frost、fire、doom 等大型候選 |
| CAND-MON-PIG-001 | CAND-MON-PIG | 使用者提供總覽圖 | pig / boar 系候選母表 | candidate | 包含 mechanical pig、armored boar 等分支 |
| CAND-MON-INSECT-001 | CAND-MON-INSECT | 使用者提供總覽圖 | insect / bug 系候選母表 | candidate | 適合森林或特殊地圖補種族 |
| CAND-MB-VOID-001 | CAND-MB | 使用者提供總覽圖 | Void Slime King 候選小王 | candidate | 候選大型 slime miniboss |
| CAND-MB-ZAKUM-001 | CAND-MB | 使用者提供總覽圖 | Inferno Zakum 候選區域 Boss | candidate | 超出本輪主線範圍，不直接 runtime 化 |
| CAND-MB-DEMON-001 | CAND-MB | 使用者提供總覽圖 | Dark Mushroom Demon Emperor 候選區域 Boss | candidate | 超出本輪主線範圍，不直接 runtime 化 |

### Candidate Rules

- candidate 不等於 runtime。只要素材還沒有放進 dist/assets 並完成程式綁定，就不得標示為 used。
- replace 只用於準備接手現有 runtime 條目的素材；candidate 用於新候選或尚未決定是否上線的素材。
- 使用者後續若再補新的怪物總覽或單張素材，應先新增 candidateId，再決定是否晉升為 runtime asset。
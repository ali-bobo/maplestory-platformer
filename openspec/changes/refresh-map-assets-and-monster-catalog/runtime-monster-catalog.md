## Runtime Monster Catalog

本表以目前 [src/config/monsters.js](src/config/monsters.js)、[src/config/maps.js](src/config/maps.js)、[src/scenes/BootScene.js](src/scenes/BootScene.js)、[src/config/alignment.js](src/config/alignment.js) 的真實狀態整理，作為第一版 runtime monster catalog。

### Legacy Group

| monsterId | assetId | spriteKey | maps | alignment coverage | notes |
| --- | --- | --- | --- | --- | --- |
| slime | MON-LEG-001 | monster_slime | sky, boss-support | complete | 與 shadow-slime 共用圖片 |
| mushroom | MON-LEG-002 | monster_mushroom | sky, henesys | complete | |
| snail | MON-LEG-003 | monster_snail | sky, henesys | complete | |
| stump | MON-LEG-004 | monster_stump | henesys | complete | |
| boar | MON-LEG-005 | monster_boar | henesys | complete | |
| robot | MON-LEG-006 | monster_robot | taipei | complete | 都市機械系 |
| skeleton | MON-LEG-007 | monster_skeleton | ruins | complete | |
| snake | MON-LEG-008 | monster_snake | henesys | complete | |
| dragon | MON-LEG-009 | monster_dragon | ellinia | complete | 奇幻高空系 |
| cyclops | MON-LEG-010 | monster_cyclops | ellinia | complete | |
| golem | MON-LEG-011 | monster_golem | ruins | complete | 岩石系回歸廢墟 |
| mimic | MON-LEG-012 | monster_mimic | ellinia | complete | |

### New-Crop Group

| monsterId | assetId | spriteKey | maps | alignment coverage | notes |
| --- | --- | --- | --- | --- | --- |
| sky_imp | MON-NEW-001 | monster_new_0 | sky, ellinia | complete | |
| sky_bird | MON-NEW-002 | monster_new_1 | sky, ellinia | complete | |
| sky_puff | MON-NEW-003 | monster_new_2 | sky, ellinia | complete | |
| ruin_knight | MON-NEW-004 | monster_new_3 | ruins | complete | |
| ruin_golem | MON-NEW-005 | monster_new_4 | ruins | complete | |
| ruin_wraith | MON-NEW-006 | monster_new_5 | ruins, ellinia | complete | |
| city_thug | MON-NEW-007 | monster_new_6 | kerning | complete | 只留在 Kerning 夜區維持城市分工 |

### Big Group

| monsterId | assetId | spriteKey | maps | alignment coverage | notes |
| --- | --- | --- | --- | --- | --- |
| ruin_beast | MON-BIG-001 | monster_big_0 | ruins | complete | |
| ruin_giant | MON-BIG-002 | monster_big_1 | ruins | complete | |
| city_mech | MON-BIG-003 | monster_big_2 | taipei | complete | 來自 monster3，集中作為台北都會機械主力 |
| city_beast | MON-BIG-004 | monster_big_3 | kerning | complete | 來自 monster3，保留在 Kerning 黑幫夜區 |
| city_elite | MON-BIG-005 | monster_big_4 | taipei | complete | 來自 monster3，作為台北都會菁英主力 |

### Miniboss Group

| monsterId | assetId | spriteKey | maps | alignment coverage | notes |
| --- | --- | --- | --- | --- | --- |
| city_boss1 | MON-MB-001 | miniboss_0 | taipei | complete | 小王：都會督軍，來自 monster3，放大顯示且固定低頻率 |
| city_boss2 | MON-MB-002 | miniboss_1 | kerning | complete | 小王：機械領袖，放大顯示且固定低頻率 |

### Boss-Support Group

| monsterId | assetId | spriteKey | maps | alignment coverage | notes |
| --- | --- | --- | --- | --- | --- |
| shadow-slime | MON-SUP-001 | monster_slime | boss | complete | 共用 legacy slime 圖並帶 tint |

### Alignment Gap List

目前第一批 runtime 缺口已補齊；後續若新增候選怪物晉升為 runtime，必須在晉升當下同步補 alignment metadata。

### Map Assignment Notes

- sky 保留新手與天空系怪物，避免過多森林/都市怪重複。
- henesys 現在以植物 / 菇類為主，只留少量林地獸陪襯，避免畫面過雜。
- ruins 集中戰士、岩石與少量重裝大型怪，讓勇士峽谷主題更明確。
- ellinia / 玩具城保留精靈、飛行與奇幻怪物，作為進入城市區前的色彩過渡。
- kerning 與 taipei 進一步分工為「黑幫 / 夜獸 / 有趣異種」vs「機械 / 菁英 / 都會督軍」，且不要求每張 runtime 怪圖都要同時上場。

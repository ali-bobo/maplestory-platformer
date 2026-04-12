## Runtime Asset Inventory

本表只收目前已可由程式實際載入或引用的 runtime 素材，來源以 BootScene preload、maps config、monsters config、alignment config 與 dist/assets 現況為準。

### Background Assets

| assetId | groupId | file | textureKey | status | current binding | notes |
| --- | --- | --- | --- | --- | --- | --- |
| BG-SKY-001 | BG-SKY | dist/assets/bg_sky.png | bg_sky | used | MAPS.sky | 浮空島嶼背景 |
| BG-FOR-001 | BG-FOR | dist/assets/bg_forest.png | bg_forest | used | MAPS.henesys | 森林獵場背景 |
| BG-RUI-001 | BG-RUI | dist/assets/bg_ruins.png | bg_ruins | used | MAPS.ruins | 古代廢墟背景 |
| BG-TOY-001 | BG-TOY | dist/assets/bg_toytown.png | bg_toytown | reserve | fallback only | 舊玩具城背景，保留作回退素材 |
| BG-TOY-002 | BG-TOY | dist/assets/bg_toytown_refresh.png | bg_toytown_refresh | used | MAPS.ellinia | 新玩具城背景，已接手 ellinia |
| BG-CIT-001 | BG-CIT | dist/assets/bg_city.png | bg_city | used | MAPS.kerning | Kerning City 背景 |
| BG-TPE-001 | BG-TPE | dist/assets/bg_taipei.png | bg_taipei | used | MAPS.taipei | 台北都會背景 |
| BG-BOSS-001 | BG-BOSS | dist/assets/bg_boss_room.png | bg_boss_room | used | MAPS.boss | 使用者提供的 Boss 房背景 |

### Monster Assets

| assetId | groupId | file | textureKey | status | current binding | notes |
| --- | --- | --- | --- | --- | --- | --- |
| MON-LEG-001 | MON-LEG | dist/assets/monster_slime.png | monster_slime | used | slime, shadow-slime | legacy 史萊姆族 |
| MON-LEG-002 | MON-LEG | dist/assets/monster_mushroom.png | monster_mushroom | used | mushroom | legacy 蘑菇族 |
| MON-LEG-003 | MON-LEG | dist/assets/monster_snail.png | monster_snail | used | snail | legacy 蝸牛族 |
| MON-LEG-004 | MON-LEG | dist/assets/monster_stump.png | monster_stump | used | stump | legacy 樹樁族 |
| MON-LEG-005 | MON-LEG | dist/assets/monster_boar.png | monster_boar | used | boar | legacy 野豬族 |
| MON-LEG-006 | MON-LEG | dist/assets/monster_robot.png | monster_robot | used | robot | legacy 機械族 |
| MON-LEG-007 | MON-LEG | dist/assets/monster_skeleton.png | monster_skeleton | used | skeleton | legacy 骷髏族 |
| MON-LEG-008 | MON-LEG | dist/assets/monster_snake.png | monster_snake | used | snake | legacy 蛇系 |
| MON-LEG-009 | MON-LEG | dist/assets/monster_dragon.png | monster_dragon | used | dragon | legacy 龍系 |
| MON-LEG-010 | MON-LEG | dist/assets/monster_cyclops.png | monster_cyclops | used | cyclops | legacy 獨眼族 |
| MON-LEG-011 | MON-LEG | dist/assets/monster_golem.png | monster_golem | used | golem | legacy 石像族 |
| MON-LEG-012 | MON-LEG | dist/assets/monster_mimic.png | monster_mimic | used | mimic | legacy 擬態箱 |
| MON-NEW-001 | MON-NEW | dist/assets/monster_new_0.png | monster_new_0 | used | sky_imp | 新裁切天空系 0 |
| MON-NEW-002 | MON-NEW | dist/assets/monster_new_1.png | monster_new_1 | used | sky_bird | 新裁切天空系 1 |
| MON-NEW-003 | MON-NEW | dist/assets/monster_new_2.png | monster_new_2 | used | sky_puff | 新裁切天空系 2 |
| MON-NEW-004 | MON-NEW | dist/assets/monster_new_3.png | monster_new_3 | used | ruin_knight | 新裁切廢墟系 3 |
| MON-NEW-005 | MON-NEW | dist/assets/monster_new_4.png | monster_new_4 | used | ruin_golem | 新裁切廢墟系 4 |
| MON-NEW-006 | MON-NEW | dist/assets/monster_new_5.png | monster_new_5 | used | ruin_wraith | 新裁切廢墟系 5 |
| MON-NEW-007 | MON-NEW | dist/assets/monster_new_6.png | monster_new_6 | used | city_thug | 新裁切城市系 6 |
| MON-BIG-001 | MON-BIG | dist/assets/monster_big_0.png | monster_big_0 | used | ruin_beast | 大型廢墟怪 |
| MON-BIG-002 | MON-BIG | dist/assets/monster_big_1.png | monster_big_1 | used | ruin_giant | 大型廢墟怪 |
| MON-BIG-003 | MON-BIG | dist/assets/monster_big_2.png | monster_big_2 | used | city_mech | 來自 monster3 的機械系裁切，alignment complete |
| MON-BIG-004 | MON-BIG | dist/assets/monster_big_3.png | monster_big_3 | used | city_beast | 來自 monster3 的都市獸系裁切，alignment complete |
| MON-BIG-005 | MON-BIG | dist/assets/monster_big_4.png | monster_big_4 | used | city_elite | 來自 monster3 的菁英系裁切，alignment complete |

### Miniboss And Support Assets

| assetId | groupId | file | textureKey | status | current binding | notes |
| --- | --- | --- | --- | --- | --- | --- |
| MON-MB-001 | MON-MB | dist/assets/miniboss_0.png | miniboss_0 | used | city_boss1 | 來自 monster3 的都會督軍裁切，alignment complete |
| MON-MB-002 | MON-MB | dist/assets/miniboss_1.png | miniboss_1 | used | city_boss2 | 來自 monster3 的重裝頭目裁切，alignment complete |
| MON-SUP-001 | MON-SUP | dist/assets/monster_slime.png | monster_slime | used | shadow-slime | Boss 房援軍，共用 legacy 資產 |
| BOSS-MAIN-001 | BOSS-MAIN | dist/assets/boss_main.png | boss_main | used | BossScene | 使用者提供的 Boss 主體圖 |

### NPC Assets

| assetId | groupId | file | textureKey | status | current binding | notes |
| --- | --- | --- | --- | --- | --- | --- |
| NPC-NEW-000 | NPC-NEW | dist/assets/npc_new_0.png | npc_new_0 | used | MAPS.henesys NPC | 森林獵場 NPC |
| NPC-NEW-001 | NPC-NEW | dist/assets/npc_new_1.png | npc_new_1 | used | MAPS.ellinia NPC | 神秘之境 NPC |
| NPC-NEW-002 | NPC-NEW | dist/assets/npc_new_2.png | npc_new_2 | used | MAPS.sky NPC | 浮空島嶼 NPC |
| NPC-NEW-003 | NPC-NEW | dist/assets/npc_new_3.png | npc_new_3 | used | MAPS.ruins NPC | 古代廢墟 NPC |
| NPC-NEW-004 | NPC-NEW | dist/assets/npc_new_4.png | npc_new_4 | used | MAPS.kerning NPC | Kerning NPC |
| NPC-NEW-005 | NPC-NEW | dist/assets/npc_new_5.png | npc_new_5 | used | MAPS.taipei NPC | 台北都會 NPC |

### Current Runtime Gaps

- 長條平台目前採用 render overlay 方式套在既有碰撞平台上，後續若要完全圖片化仍需額外驗證 collisionPolicy。
- 台北地圖已可載入與進入，並已開始使用 monster3 裁出的機械 / 菁英 / 小王素材。
- monster3 已完成第一批 runtime 導入；若要擴編其餘候選，仍需逐張補命名與 alignment。

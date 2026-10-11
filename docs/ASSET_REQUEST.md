# 素材需求書（交給 AI / 畫師製作用）

這份文件列出遊戲**還缺的美術素材**，每項都有：用途、檔名、尺寸、張數、描述與提示詞。
內容路線與玩法設計見 [`ROADMAP.md`](ROADMAP.md)。交付後由我接進 `src/config/assetCatalog.js`，`npm test` 會檢查每個檔案是否存在、引用有沒有接錯。

優先級：**P0** 補齊現有缺口（最先給）→ **P1** 新地圖包 → **P2** 轉職與職業 → **P3** 品質提升（選配）。

---

## 0. 全體規範（務必先讀）

### 0.1 美術風格

- **楓之谷風手繪卡通 2D**：粗細一致的深色細輪廓線、柔和賽璐珞上色（2～3 階明暗）、飽和但不刺眼的色彩、可愛圓潤的比例（角色約 2.5～3 頭身）。
- 光源固定**左上**；陰影偏冷色；高光用小塊亮色，不要寫實漸層、不要寫實質感、不要 3D 渲染感。
- 與現有素材並排時要看不出差異：參考 `dist/assets/` 內既有圖（`player_idle.png`、`monster_slime.png`、`npc_merchant.png`、`bg_sky.webp`）。
- **圖中不可出現文字、浮水印、簽名、UI 邊框**（文字由遊戲繪製）。

### 0.2 技術規格

| 項目 | 規格 |
|------|------|
| 格式 | 角色 / 怪物 / NPC / 平台 / 圖示 / 特效：**PNG，RGBA，背景全透明**（不要白底、不要棋盤格底）。場景大背景：**PNG 或 WebP，RGB** |
| 朝向 | 角色、怪物、NPC 一律**面向右**（遊戲會自動水平翻轉） |
| 腳底對齊 | 圖片**下緣貼齊腳底**（腳底以下不留透明空白），身體水平置中。程式用「腳底在圖片底邊」做站位 |
| 邊緣 | 邊緣抗鋸齒、無白邊 / 綠邊（去背後請檢查深色背景上的殘邊） |
| 色彩 | sRGB；不要預乘 alpha |
| 同一組動作 | 同一角色的所有影格**畫布大小相同**、腳底位置相同、角色比例相同（否則走路會抖） |
| 命名 | 全小寫英文 + 底線，見各表「檔名」欄。檔名即遊戲內的素材鍵（去掉副檔名） |

> 建議作法：先用 AI 以 **4 倍大小**（例如 400×320）生成，再用 Lanczos 縮到目標尺寸，線條會比較乾淨。
> 交付時兩種都給最好（`x4/` 原圖資料夾 + 目標尺寸），之後要換高解析度可以直接用。

### 0.3 現有素材尺寸參考（新圖要與之相容）

| 類別 | 現有尺寸 | 備註 |
|------|----------|------|
| 主角動作圖 | 100×80 | 身體約 44px 寬，腳底貼底邊 |
| 小怪 | 48×56 ～ 69×80；中大型 80×120 ～ 185×120 | 每種怪 1 張靜態圖（程式做上下彈跳 / 翻轉） |
| 小王（miniboss） | 163×150 ～ 232×200 | |
| Boss | 460×220（idle / move / attack / death1 / death2） | |
| NPC | 39×80 ～ 62×80 | |
| 平台 | 175×40 ～ 246×52（橫向可平鋪的一段平台） | 左右兩端是收邊 |
| 場景背景 | 1376×768（RGB） | 約 5 畫面寬的橫向捲動地圖，遊戲會拉伸 / 重複 |
| 藥水圖示 | 26×38 | |
| 裝備圖示 | 28×28 | |
| HUD 木框 | 見 `hud_*.png` | |

### 0.4 交付方式

- 一個 zip，資料夾結構：`P0/`、`P1_<地圖名>/`、`P2_<職業名>/`…，每個檔案命名同本文件。
- 附一個 `manifest.csv`（欄位：檔名,尺寸,張數,備註），方便我核對。
- **先交 P0 與 P1 的第一張地圖當「樣品」**，我接進遊戲確認風格與尺寸 OK 後，再整批量產，避免整批不合用。

### 0.5 驗收清單（自檢）

- [ ] 背景全透明（用深色背景預覽無白邊）
- [ ] 尺寸與表格一致、同一角色所有影格尺寸一致
- [ ] 腳底貼齊底邊、朝右
- [ ] 圖中沒有文字 / 浮水印
- [ ] 與現有素材並排風格接近（線條粗細、飽和度、陰影方向）
- [ ] 檔名正確、沒有中文與空格

### 0.6 通用提示詞模板

> 在每張的「提示詞」前面加上這段風格前綴（英文效果較穩定），並固定使用同一組參考圖（image reference）：

```
STYLE PREFIX:
2D side-view game sprite in MapleStory-like hand-painted cartoon style, chibi 2.5-3 heads tall,
clean uniform dark outline, soft cel shading with 2-3 tones, light from upper-left, saturated but
harmonious colors, cute rounded proportions, facing right, full body, transparent background,
no text, no watermark, no ground shadow, centered, feet touching the bottom edge of the image.
```

```
NEGATIVE:
photorealistic, 3D render, blurry, text, signature, watermark, background scenery, cropped limbs,
extra limbs, white background, gradient background, harsh outline variation
```

背景類改用：

```
BACKGROUND PREFIX:
Wide 2D side-scrolling game background, MapleStory-like painterly cartoon style, soft clouds and
atmospheric depth, three depth layers (far / mid / near), the lower 20% of the image is a calm
area where platforms will be placed, no characters, no text, no UI, horizontally seamless composition,
aspect ratio 1376:768.
```

---

## P0 — 補齊現有缺口（最先給）

這些是**現在遊戲裡已經在用、但是用程式暫時畫出來或單張撐場**的東西，換成正式圖會立刻改善觀感。

### P0-1 靴子圖示（目前唯一缺圖的裝備）

遊戲有 5 個裝備欄，武器 / 防具 / 手套 / 頭盔都有圖，**靴子是程式畫的簡易像素圖**（`ProceduralAssets.js` 的 `item-boots`）。

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `item_boots.png` | 28×28 | 1 | 盜賊風格的深色輕便皮靴，側視，紅色滾邊，與 `item_gloves.png` 同風格 |

提示詞：`a pair of light dark-leather thief boots with red trim, single item icon, side view, game inventory icon, 28x28 after downscale`

可選：4 個稀有度外框（普通 / 優良 / 稀有 / 傳說，顏色對應遊戲內稀有度色）`item_frame_common.png` / `_fine` / `_rare` / `_legend`，**32×32**，透明中空方框（選配；若現有程式畫的色框已夠用可略過）。

### P0-2 主角動作補全

目前只有 7 張（idle、walk×2、jump、attack、hurt、portrait），所有技能都共用 `player_attack`。普通攻擊改成揮刀後，最需要：

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `player_slash_1.png` `player_slash_2.png` `player_slash_3.png` | 100×80 | 3 | 揮刀三段：預備（刀在後）→ 揮出（刀在前、身體前傾）→ 收刀。**揮刀的刀光不要畫進角色圖**（刀光由特效處理） |
| `player_throw_1.png` `player_throw_2.png` | 100×80 | 2 | 丟飛鏢：蓄力 → 擲出（手臂前伸） |
| `player_dash.png` | 100×80 | 1 | 衝刺 / 暗影步伐：身體極度前傾，帶殘影感（殘影用半透明重影畫在同張圖內） |
| `player_cast.png` | 100×80 | 1 | 施法 / 暗殺：雙手結印或持刀上舉 |
| `player_walk_3.png` `player_walk_4.png` | 100×80 | 2 | 把走路由 2 格補成 4 格（現有 `walk_1` `walk_2` 保留，順序 1-2-3-4） |
| `player_idle_2.png` | 100×80 | 1 | 待機第二格（呼吸：身體微微上下、披風擺動） |
| `player_jump_fall.png` | 100×80 | 1 | 下落姿勢（`player_jump` 作上升） |
| `player_down.png` | 100×80 | 1 | 蹲下 / 按 ↓ 下穿平台 |
| `player_die.png` | 100×80 | 1 | 死亡倒地（橫躺、眼睛閉起來） |

> **一定要與現有 `player_idle.png` 是同一個角色**：深色兜帽斗篷、紅色圍巾、黑髮、短刀。請把 `player_idle.png` 與 `player_portrait.png` 當參考圖。

### P0-3 技能圖示與特效素材（目前全為程式繪製）

HUD 的技能圖示現在是程式用 canvas 畫的簡單圖形。需要換成手繪。

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `skill_icon_ATK.png` | 38×38 | 1 | 普通攻擊：短刀斜斬弧光 |
| `skill_icon_Z.png` | 38×38 | 1 | 三連飛鏢：三枚十字鏢扇形飛出 |
| `skill_icon_X.png` | 38×38 | 1 | 暗影步伐：紫色殘影向前衝 |
| `skill_icon_C.png` | 38×38 | 1 | 暗殺：匕首刺入、紅色一閃 |
| `skill_icon_V.png` | 38×38 | 1 | 暗影漩渦：紫色旋渦 |
| `skill_icon_B.png` | 38×38 | 1 | 影分身：兩個重疊的黑影人 |

底色：深紫寶石質感圓角方塊（與現有 HUD 技能格相容），圖案置中。

特效（透明底，亮色，**純白或單色**，程式會染色與縮放）：

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `fx_slash_sheet.png` | 4 格橫排 ×（200×200）= 800×200 | 1 張 sheet | 揮刀刀光 4 影格：弧形光刃由細到粗再淡出，朝右 |
| `fx_shuriken.png` | 32×32 | 1 | 十字飛鏢（金屬、4 刃），單張 |
| `fx_hit_sheet.png` | 5 格橫排 ×（96×96）= 480×96 | 1 張 sheet | 命中火花 5 影格（星形爆開 → 消散） |
| `fx_vortex_sheet.png` | 6 格橫排 ×（256×256）= 1536×256 | 1 張 sheet | 暗影漩渦 6 影格（旋轉） |
| `fx_clone.png` | 100×80 | 1 | 影分身用：黑色半透明剪影（與主角站姿相同） |

### P0-4 Boss 第三階段（狂暴）

規格書要求第三階段「紫光閃爍、紅眼、背景加深」，目前沒有視覺。

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `boss_rage_idle.png` `boss_rage_move.png` `boss_rage_attack.png` | 460×220 | 3 | 現有 `boss_*.png` 的狂暴版：紅眼發光、身上紫色火焰 / 裂紋、體態更前傾。**姿勢與現有對應圖一致**，只改色與氣場 |
| `fx_boss_aura.png` | 512×512 | 1 | 紫黑色氣場（透明漸層外圈，疊在 Boss 後面） |
| `bg_boss_room_rage.webp` | 1376×768 | 1 | 現有 `bg_boss_room` 的狂暴版：整體更暗、紅紫色光、地面裂縫 |

### P0-5 介面與劇情圖

| 檔名 | 尺寸 | 張數 | 描述 |
|------|------|------|------|
| `story_1.webp` … `story_4.webp` | 960×540 | 4 | **新手教學的 4 張故事插畫**（目前用 emoji 代替）：①晨曦鎮的星光之塔，一顆發光的「晨曦之星」；②暗影魔君降臨、星星被擊碎成碎片飛向各地；③小鎮陷入黑暗、怪物出現；④戴兜帽的盜賊少年「影子」接過最後一塊星光碎片，轉身出發 |
| `ui_quest_mark.png` `ui_quest_done.png` `ui_quest_ing.png` | 24×24 | 3 | NPC 頭上的任務標記：黃色「!」可接、灰色「?」進行中、金色「?」可交付 |
| `ui_title_logo.png` | 600×160 | 1 | 標題「盜賊傳說」藝術字 Logo（**此處可以有字**；繁體中文；金色描邊、帶小星光；透明底） |

---

## P1 — 新地圖包（每張地圖 = 一包）

每張地圖固定要交付：

| 項目 | 規格 | 張數 |
|------|------|------|
| 大背景 | `bg_<map>.webp`，1376×768 | 1 |
| 平台 | `platform_<map>.png`，約 210×45，可橫向平鋪、兩端收邊 | 1 |
| 小怪 | `monster_<id>.png`，依下表尺寸，面向右 | 5～6 |
| 小王 | `miniboss_<id>.png`，約 200×180 | 1 |
| NPC | `npc_<id>.png`，約 45×80 | 2 |
| （選配）遠景層 | `bg_<map>_far.png` 1376×768 透明（雲 / 遠山），做視差用 | 1 |

> **先做第一張（碧濤港）當樣品**，確認風格後再做其餘。

### 地圖 A：碧濤港（Lv12–18，海港 / 海盜）

- 背景：黃昏的熱鬧港口，木造碼頭、帆船桅杆、紅橙天空、海鷗；下方 20% 是木棧橋平地。
- 平台：`platform_harbor.png`（舊木板 + 繩索收邊）。
- 怪物（尺寸為遊戲內顯示大小）：

| 檔名 | 尺寸 | 描述 |
|------|------|------|
| `monster_crab.png` | 64×56 | 橘紅色螃蟹，大螯 |
| `monster_jellyfish.png` | 56×72 | 半透明藍紫水母，飄浮 |
| `monster_pirate_ghost.png` | 60×80 | 破爛海盜帽的幽靈，半透明下半身 |
| `monster_octopus.png` | 80×80 | 紫色章魚，持破桶 |
| `monster_seagull.png` | 70×56 | 兇惡海鷗（展翅） |
| `miniboss_captain.png` | 200×180 | 海盜船長：獨眼、鐵鉤手、大帽子 |

- NPC：`npc_dockworker.png`（碼頭工人，45×80）、`npc_sailor.png`（老水手，45×80）。

### 地圖 B：黃沙遺跡（Lv16–22，**沙漠**）

- 背景：金黃沙丘、遠方金字塔與石柱遺跡、大太陽、熱浪感；地面是沙地。
- 平台：`platform_desert.png`（砂岩磚塊）。
- 怪物：

| 檔名 | 尺寸 | 描述 |
|------|------|------|
| `monster_scorpion.png` | 72×56 | 沙色蠍子，尾針翹起 |
| `monster_sandworm.png` | 64×80 | 半截出土的大沙蟲，環狀牙口 |
| `monster_mummy.png` | 56×80 | 繃帶木乃伊（卡通可愛不恐怖） |
| `monster_cactus.png` | 56×80 | 仙人掌怪，有臉，頭上開花 |
| `monster_bandit.png` | 56×80 | 沙漠強盜：纏頭巾、彎刀 |
| `miniboss_sandworm.png` | 220×180 | 沙塵巨蟲：巨大沙蟲，背上有遺跡碎片 |

- NPC：`npc_archaeologist.png`（考古學者）、`npc_caravan.png`（駱駝商人）。

### 地圖 C：霜牙峰（Lv20–26，冰雪）

- 背景：藍白雪山、極光、飄雪；地面積雪。平台：`platform_snow.png`（積雪冰塊）。
- 怪物：`monster_snowman.png`（雪人，60×80）、`monster_icewolf.png`（冰狼，90×72）、`monster_crystal.png`（冰晶精靈，56×72）、`monster_penguin.png`（企鵝戰士，56×64）、`monster_yeti.png`（小雪怪，80×100）；小王：`miniboss_frostgiant.png`（冰霜巨人，220×200）。
- NPC：`npc_ranger.png`（山林巡守員）、`npc_monk.png`（山頂僧侶）。

### 地圖 D：熔岩巢穴（Lv26–32，火山）

- 背景：暗紅火山洞窟、岩漿河、冒煙的岩壁；平台：`platform_lava.png`（黑色火山岩帶發光裂紋）。
- 怪物：`monster_fireimp.png`（火焰精靈，60×72）、`monster_lavaslime.png`（岩漿史萊姆，64×56）、`monster_firehound.png`（炎犬，90×72）、`monster_lavagolem.png`（岩漿魔像，100×120）、`monster_ember.png`（餘燼蝙蝠，64×56）；小王：`miniboss_lavadragon.png`（熔岩龍，240×200）。
- NPC：`npc_blacksmith.png`（鐵匠）、`npc_miner.png`（礦工）。

### 地圖 E：魔君王城（Lv30–40，**暗黑風**）

- 背景：暗紫黑色的哥德式城堡走廊、破碎彩繪玻璃、紅月、蝙蝠剪影；整體低飽和、冷色。平台：`platform_castle.png`（黑色石磚帶金屬鑲邊）。
- 怪物：`monster_darkknight.png`（暗影騎士，70×90）、`monster_imp.png`（小惡魔，60×72）、`monster_bat.png`（巨蝙蝠，70×56）、`monster_vampire.png`（吸血鬼，56×84）、`monster_gargoyle.png`（石像鬼，80×96）；小王：`miniboss_fallen.png`（墮落騎士團長，220×200）。
- NPC：`npc_prisoner.png`（被囚禁的守衛）、`npc_ghostmaid.png`（幽靈侍女）。

### 地圖 F：影之殿堂（安全地圖 / 轉職）

- 背景：夜空下的神殿，月光、漂浮的星光碎片、石柱與水池；寧靜神聖感（藍紫 + 金）。平台：`platform_shrine.png`（白石 + 金邊）。
- 無怪物。NPC：`npc_jobmaster_a.png`（轉職官：神祕的女性影之長老，55×85）、`npc_jobmaster_b.png`（技能導師：老者，50×80）、`npc_trial_guard.png`（試煉守衛，小王等級：`miniboss_trialguard.png` 200×180，戴面具的影子戰士）。

---

## P2 — 轉職與職業

> 一轉兩個方向，各需**整套角色動作圖**。尺寸與 P0-2 完全相同（100×80），同樣朝右、腳底貼底。
> 外觀要看得出是「同一個少年」成長（保留紅圍巾 / 兜帽元素），再依職業換服裝與武器。

### 每個職業一套（單位：張）

| 部位 | 檔名範例（`<job>` 例：`assassin`） | 張數 |
|------|--------------------------------|------|
| 待機 | `player_<job>_idle.png`、`_idle_2.png` | 2 |
| 走路 | `player_<job>_walk_1..4.png` | 4 |
| 跳躍 | `_jump.png`、`_jump_fall.png` | 2 |
| 攻擊 | `_slash_1..3.png` | 3 |
| 丟擲 / 施法 | `_throw_1.png`、`_cast.png` | 2 |
| 衝刺 / 蹲下 | `_dash.png`、`_down.png` | 2 |
| 受傷 / 死亡 | `_hurt.png`、`_die.png` | 2 |
| 頭像 | `player_<job>_portrait.png`（74×72） | 1 |
| **合計** | | **18 張 / 職業** |

### 一轉（Lv.10）

| 職業 | 外觀方向 | 武器 |
|------|---------|------|
| **刺客** `assassin` | 全黑勁裝、深紫圍巾、半臉面罩，輕盈 | 雙短刃 / 手裡劍 |
| **俠盜** `bandit` | 皮甲、紅色頭巾、毛皮領，壯一點 | 單把大匕首 / 短彎刀 |

### 二轉（Lv.30，之後再做；先預留）

四個職業，沿用上面 18 張規格：`shadowkiller`（影殺者，由刺客）、`nightlord`（暗夜使者，由刺客）、`bandit_king`（盜賊王，由俠盜）、`shadowranger`（暗影遊俠，由俠盜）。

### 職業專屬技能圖示（每個職業 3 個，38×38，規格同 P0-3）

- 刺客：`skill_icon_shadowstrike`（影襲）、`skill_icon_poison`（毒飛鏢）、`skill_icon_mark`（致命標記）
- 俠盜：`skill_icon_whirl`（迴旋斬）、`skill_icon_steal`（竊取）、`skill_icon_smoke`（煙幕）

### 其他基礎職業（選配，P3）

戰士、法師、弓箭手各一套（同樣 18 張規格 + 技能圖示），**確定要做時再細化**；每個職業約需 18 張角色圖 + 6 張技能圖示。

---

## P3 — 品質提升（選配）

| 項目 | 規格 | 張數 |
|------|------|------|
| **怪物動畫** | 每種怪補第二格（`monster_<id>_2.png`，與原圖同尺寸，做簡單兩格循環：走路 / 呼吸），優先做最常見的 8 種：slime、mushroom、snail、stump、boar、skeleton、sky_imp、sky_bird | 8（再逐步擴充） |
| **視差多層背景** | 每張地圖拆 3 層透明 PNG：`bg_<map>_far/mid/near.png`，1376×768；現有背景為單張 | 3 / 地圖 |
| **平台變化** | 每張地圖補 2 種平台長度（短 120 / 長 320）與 1 組裝飾（草、燈、旗）| 3 / 地圖 |
| **傳送門** | `portal_blue.png` / `portal_gold.png`，64×96，4 格動畫 sheet（橫排 256×96） | 2 |
| **掉落物** | 金幣（16×16）、裝備掉落光柱（32×64 sheet）、任務物品（試煉之證 / 星光碎片 24×24） | 數張 |
| **裝備外觀** | 在角色上可見的武器 / 頭盔變化（需先確定角色圖尺寸，此項最後做） | — |
| **NPC 頭像** | 對話框用半身像 96×96 | 每個 NPC 1 |
| **特別任務插畫** | 轉職 / 星光碎片完成演出的 960×540 插圖 | 3～5 |

---

## 附錄 A：素材總量估算

| 區塊 | 張數（約） | 備註 |
|------|-----------|------|
| P0 | 30～35 | 一次到位，影響最大 |
| P1（6 張地圖） | 6 × 14 ≈ 84 | 先做 1 張當樣品 |
| P2（一轉 2 職業） | 2 × 19 + 6 ≈ 44 | 二轉再 +76 |
| P3 | 視進度 | 選配 |

## 附錄 B：目前已有的素材清單（不需要重做）

- 角色：`player_idle / walk_1 / walk_2 / jump / attack / hurt / portrait`、`title_hero`
- 背景（WebP）：`bg_sky / forest / ruins / mystic / city / taipei / town / dungeon / boss_room`、`title_bg`
- 平台：`platform_sky / forest / ruins / mystic / city / town / dungeon / boss`
- 怪物：小怪 `monster_*` 27 種、小王 `miniboss_0 / 1 / street`
- Boss：`boss_idle / move / attack / death1 / death2`
- NPC：`npc_merchant / townsfolk / npc_new_0..5`
- 藥水：`potion_hp / hp_big / mp / mp_big / elixir`；裝備圖示：`item_weapon / armor / gloves / helmet`
- HUD 木框：`hud_bar_frame / panel / panel_sm / slot_42 / slot_52 / slot_80`
- 以上檔案都在 `dist/assets/`，可以當風格參考圖。

## 附錄 C：給 AI 的「角色一致性」小技巧

1. 先生成 1 張**角色設定圖**（正面 / 側面 / 背面 + 配色），之後所有動作都用它當參考圖（image reference / character reference）。
2. 每次只改「動作描述」，其餘提示詞與風格前綴原封不動。
3. 同一職業的 18 張圖建議**同一批次、同一組種子**生成，避免顏色飄移。
4. 生成後用同一個去背流程（例如 rembg 或 AI 去背）處理，再統一裁切到「腳底貼底、水平置中」。
5. 動作圖先做「待機 / 走路 / 攻擊」三組就能在遊戲裡看效果，再補其餘。

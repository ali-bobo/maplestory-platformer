# 素材缺口總表與提示詞（2026-10 盤點）

> 這份文件是 [`ASSET_REQUEST.md`](ASSET_REQUEST.md)「現況總表」的後續：以 **實際程式與 `src/config/assetCatalog.js`** 交叉檢查後，列出目前還缺的美術、每項的接線點，並為每一項附上可直接貼給圖像 AI 的英文提示詞。
> 使用步驟（命名、放哪、哪些由我處理）見 [`asset-requests/README.md`](asset-requests/README.md)。
> 參考圖都放在 [`asset-requests/ref/`](asset-requests/ref/)（複本，原圖在 `dist/assets/`、`docs/asset_src/` 沒動）。
> 已排除：`dist/assets/hisoka.jpg`（疑似其他作品角色，與遊戲無關，不列入、不複製、不使用）。

---

## 1. 交叉檢查結果（先看結論）

| 檢查 | 結果 |
|------|------|
| `assetCatalog.js` 登錄的檔案是否都存在 | **全部存在**（166 筆路徑逐一檢查；`item-star-shard`、`item-quest-token` 是貼圖鍵，實際檔案是 `item_star_shard.png`、`item_trial_token.png`） |
| 程式引用但不存在的圖 | **沒有真正缺檔**。掃描到的 `fx_shuriken_spin`、`hud_wood_bg`、`hud_mm_bg`、`hud_lowhp_vignette` 都是程式執行時建立的動畫 / 貼圖，不是檔案 |
| 會退回程序化畫法的素材 | 見下表「仍是程序化占位」 |
| 內容已放進專案但沒接線 | `story_1.webp`、`story_3.webp` **完全沒被引用**（`TutorialScene` 四頁都是 emoji：🌟 🌑 🗡️ 🗺️），見第 3 節 |
| 刺客 / 俠盜普攻圖示 | `skill_icon_ATK_assassin.png`、`skill_icon_ATK_bandit.png` **檔案存在，但與 `skill_icon_ATK.png` 位元組完全相同（md5 一致）**，所以畫面上仍是盜賊短刀。要「換圖」不是「新增檔」 |

**仍是程序化占位（`src/assets/ProceduralAssets.js` 與地圖設定）**

| 占位 | 位置 | 說明 |
|------|------|------|
| Boss 第三階段 | `Boss.js` `_updatePose` / `_onPhaseChange` | 只有閃光 + `fx_boss_aura` 染紅，Boss 本體與背景沒有狂暴版 |
| 傳送門 `portal` | `ProceduralAssets.js:294`、`BaseMapScene.js:353` | 44×78 紫色漸層長方形，所有地圖共用 |
| 金幣 `item-meso` | `ProceduralAssets.js:261` | 16×16 程式畫 |
| 粒子 `particle-dot` / `particle-star`、`skill-orb`、`skill-clone` | `ProceduralAssets.js` | 小件，影響低；`skill-shuriken` 已被 `fx_shuriken` 取代（缺圖才退回） |
| 岩漿火柱 `lava-flame`、燭台 `prop-torch`、暗黑視野 `dark-vignette` | `generateModifierTextures` | 地圖機制用，視覺尚可，列 P2 備註 |
| 補給商 NPC ×3 | `maps.js` 272 / 307 / 340 行 | 行商阿福、船具商阿海、遺跡商販老莫分別是 `npc_merchant` / `npc_townsfolk` 加 `tint` 染色 |
| 影子史萊姆 | `monsters.js` `shadow-slime`（Boss 房小怪） | `monster_slime` 加紫色 `tint` |
| 影之試煉場景背景 | `dungeons.js` `bgImage: 'bg_dungeon'` | 可直接改用既有 `bg_shrine`（**不需要新圖**，列在第 3 節） |
| 平台 | `PLATFORM_THEMES` | 14 張地圖都已有專屬平台圖；`platform-grass/stone/brick/wood` 程式平台已不是主要路徑 |
| 技能圖示 | `skillIcons.js` | 12 個技能圖示 PNG 都在；程式繪製只剩缺圖時的後備 |

沒有缺背景、怪物、小王、NPC（除上面 3 個染色商人）、地圖平台、HUD 木框、世界地圖。

---

## 2. 缺口總表

優先級：**P0** 影響主線體驗（開局 3 分鐘、最終 Boss）→ **P1** 加分（常見、辨識度高）→ **P2** 之後 / 取決於設計決定。
「參考圖」欄是要附給 AI 的 `asset-requests/ref/` 檔案；「現況」中 **缺** = 完全沒有檔案，**需調整** = 已有檔案要改。

| ID | 優先 | 項目 | 檔名（交付後我命名） | 遊戲內尺寸 | 請 AI 產出尺寸 | 程式接線點 | 現況 | 附參考圖 |
|----|------|------|----------------------|-----------|----------------|-----------|------|----------|
| G-01 | P0 | Boss 狂暴姿勢 ×3（待機 / 移動 / 攻擊） | `boss_rage_idle.png` `boss_rage_move.png` `boss_rage_attack.png` | 460×220 | 各 1380×660（3 倍），綠底 | `src/entities/Boss.js`：`_updatePose`（97 行）、`_triggerAttackPose`（103 行）、`_onPhaseChange(newPhase>=3)`（137 行附近）；`assetCatalog.js` `BOSS_ASSETS`（798 行） | **缺**（上次產出畫進王座房無法去背，需重生） | `ref_boss_idle.png` `ref_boss_move.png` `ref_boss_attack.png`（及 `_green_x3` 版） |
| G-02 | P0 | Boss 狂暴背景（不含角色） | `bg_boss_room_rage.webp` | 1376×768 | 1376×768 或 2752×1536 | `BaseMapScene._addCoverBackground`（189–202 行）；第三階段由 `Boss._onPhaseChange` 或 `BossScene` 換圖；`BACKGROUND_ASSETS`（172 行） | **缺**（上次的圖可當構圖參考） | `ref_bg_boss_room.png` |
| G-03 | P0 | 劇情插畫 2：魔君擊碎星星 | `story_2.webp` | 960×540 | 1920×1080 | `TutorialScene.buildPages`（23–44 行 `art`）、`_renderPage`（222 行）；`UI_ASSETS` | **缺**（目前 🌑 emoji） | `ref_story_1.png` `ref_story_3.png`（風格） |
| G-04 | P0 | 劇情插畫 4：戴兜帽少年接下最後一塊碎片 | `story_4.webp` | 960×540 | 1920×1080 | 同上 | **缺**（目前 🗺️ emoji） | `ref_story_1.png` `ref_story_3.png`（風格）、`ref_title_hero.png`（少年外觀）、`ref_item_star_shard_x4.png`（碎片外觀） |
| G-05 | P1 | 標題徽章 | `ui_title_badge.png` | 約 320×200（我依畫面微調） | 1280×800，綠底 | `MenuScene.js` 27 行目前只用文字「盜賊傳說」；徽章加在標題旁 / 上方；`UI_ASSETS` | **缺** | `ref_title_hero.png`（配色與線條） |
| G-06 | P1 | 刺客普通攻擊圖示 | `skill_icon_ATK_assassin.png` | 38×38 | 152×152 | `SKILL_ICON_PNG_IDS`（1036 行）已登錄，**同檔名覆蓋即可**；`skillIcons.js` 另有程式版 `drawTwinBlades` | **需調整**（現為盜賊短刀複本） | `ref_skill_icon_ATK_x4.png` `ref_skill_icon_backstab_x4.png` |
| G-07 | P1 | 俠盜普通攻擊圖示 | `skill_icon_ATK_bandit.png` | 38×38 | 152×152 | 同上；程式版 `drawSabre` | **需調整**（同上） | `ref_skill_icon_ATK_x4.png` `ref_skill_icon_whirl_x4.png` |
| G-08 | P1 | 傳送門（藍紫，通用）4 格動畫 | `portal_blue.png`（橫排 4 格，每格 64×96，共 256×96） | 64×96 | 4 格橫排 1024×384，黑底 | `BaseMapScene.js:353` `this.portals.create(pd.x, pd.y, 'portal')`；程式圖在 `ProceduralAssets.js:294`；需改成 spritesheet + 循環動畫，判定框維持原值 | **缺**（程序化占位） | 無（風格描述即可） |
| G-09 | P1 | 金幣圖示 | `item_meso.png` | 16×16 | 128×128，綠底 | `ProceduralAssets.js:261` `item-meso`；`assetCatalog.js` `ICON_ASSETS` 加一筆 | **缺**（程序化占位） | `ref_item_trial_token_x4.png`（圖示風格） |
| G-10 | P2 | 補給商 NPC ×3：行商阿福、船具商阿海、遺跡商販老莫 | `npc_peddler.png` `npc_chandler.png` `npc_trader.png` | 約 56×80 / 56×80 / 48×80 | 同一張橫排三人，3 倍 | `maps.js` 272 / 307 / 340 行（改 `id`、移除 `tint`）；`NPC_ASSETS`（690 行） | **缺**（染色借用） | `ref_npc_merchant.png` `ref_npc_townsfolk.png` |
| G-11 | P2 | 影子史萊姆（Boss 房小怪） | `monster_shadow_slime.png` | 48×56 | 192×224，綠底 | `monsters.js` `shadow-slime` 的 `spriteKey` + 移除 `tint`；`MONSTER_ASSETS`（375 行） | **缺**（染色借用） | `ref_monster_slime.png` |
| G-12 | P2 | 二轉四個職業（各 18+ 張動作圖） | `player_<job>_*.png`、`portrait_<job>.png`；job = `shadowkiller` `nightlord` `bandit_king` `shadowranger` | 100×80（頭像 74×72） | 每職業 1 張設定圖 + 3 張動作表 | `poses.js` `JOB_POSES`（要新增職業姿勢清單）、`assetCatalog.js` `JOB_CHARACTER_ASSETS`；Lv30 二轉流程尚未實作 | **缺**（之後；外觀為提案，技能未設計） | `ref_player_assassin_idle_x4.png` `ref_player_bandit_idle_x4.png` `ref_player_idle_x4.png`、`ref_player_*_slash_2_x4.png` |
| G-13 | P2 | 影之殿堂專屬傳送門（金色） | `portal_gold.png`（4 格，256×96） | 64×96 | 1024×384，黑底 | `BaseMapScene` 同 G-08，shrine 地圖指定；目前由程式畫金色傳送門 | **缺**（選配） | `ref_prop_star_tower_x4.png`（金色調） |
| G-14 | P1 / P2（取決於是否採用新劇情） | 夜渡（魔君）設定圖 | `npc_yedu.png`（暫名）或 Boss 重繪 | — | 3 視圖設定圖 | 取決於劇情：`content-narrative.md` 第 8 節 | **缺**（待決定） | `ref_boss_idle.png`（現有魔君） |
| G-15 | P1 / P2（同上） | 可調查石碑 | `prop_tablet.png` | 約 48×64 | 3 倍，綠底 | 可調查物件（P-05，未做） | **缺**（待決定） | 無 |
| G-16 | P1 / P2（同上） | 寶箱（關 / 開） | `prop_chest_closed.png` `prop_chest_open.png` | 約 40×36 | 兩張並排 | P-10 隱藏寶箱（未做） | **缺**（待決定） | 無 |
| G-17 | P1 / P2（同上） | 夜渡之信道具圖示 | `item_night_letter.png` | 28×28 | 112×112，綠底 | P-01 / P-14（未做） | **缺**（待決定） | `ref_item_star_shard_x4.png` |
| G-18 | P2（同上） | 結局插畫 ×2 | `ending_1.webp` `ending_2.webp` | 960×540 | 1920×1080 | P-07（未做） | **缺**（待決定） | `ref_story_1.png` `ref_title_hero.png` |
| G-19 | P2（同上） | 星光之塔點亮前 / 後 | `prop_star_tower_dark.png`（暗版） | 185×420 | 3 倍，綠底 | `maps.js` 589 行 `prop_star_tower`；現圖頂端有金星（點亮態），缺「未點亮」版 | **缺**（選配，目前可能用程式染色） | `ref_prop_star_tower_x4.png` |
| G-20 | P2（同上） | 稀有怪金色光環 | `fx_rare_aura.png`（6 格橫排） | 每格 96×96 | 黑底 | P-13（未做） | **缺**（待決定） | `ref_fx_boss_aura.png`（特效風格） |
| G-21 | P3 | 怪物第二格、視差多層背景、平台長短變化、NPC 對話頭像 | 見 `ASSET_REQUEST.md` P3 | — | — | 量大且影響低 | **缺**（之後） | 視項目而定 |

> G-14 ～ G-20 是 `design/content-narrative.md` 第 8 節的新圖，**要不要做取決於是否採用新劇情**（見該檔「待 owner 確認」）。提示詞先備好，決定採用再產。
> G-21 沒有逐項提示詞（量大、之後再細化），通用模板見 `ASSET_REQUEST.md` 第 0.6 節。

### 建議順序

1. **G-03、G-04**（開局 3 分鐘留人；順手把 `story_1/3` 與 `story_2/4` 一起接進教學）
2. **G-01、G-02**（最終 Boss 第三階段；先產 G-01 的待機，確認風格後再做移動 / 攻擊）
3. **G-06、G-07、G-05、G-08、G-09**（小而明顯）
4. G-10、G-11、G-13，再來是 G-12（二轉，量最大，等 Lv30 設計定案）
5. G-14 ～ G-20 依劇情決定

---

## 3. 不需要新圖、但還沒接的項目（給我處理）

| 項目 | 現況 | 做法 |
|------|------|------|
| `story_1.webp`、`story_3.webp` | 檔案與尺寸（960×540）都在，但**教學頁沒有引用** | G-03/G-04 到位後，一次把 4 張接進 `TutorialScene`；依 `design/content-narrative.md` 的 4 張插畫順序（星光塔 / 魔君奪星 / 小鎮陷入黑暗 / 少年接碎片）調整教學頁，必要時重排頁面文字 |
| 影之試煉場景背景 | `dungeons.js` 兩處 `bgImage: 'bg_dungeon'` | 改用既有 `bg_shrine` |
| `item_skill_book.png` | 已登錄、`status: 'unused'` | 技能重置 / 轉職獎勵再接 |
| `monster_big_2`、`monster_big_4`、`miniboss_0` | 已登錄、`status: 'unused'` | 沒有地圖使用；之後可當新怪或刪除 |
| 刺客 `guard / lunge / slash_alt_1 / slash_alt_2`、俠盜 `guard / slash_alt / crouch_sabre` | 已有圖、未接 | 配合戰鬥手感提案 |

---

## 4. 提示詞

### 共通規則（每一段都已內含，這裡只是提醒）

- **綠底去背**：角色 / 怪物 / NPC / 圖示 / 道具都用 **純 #00FF00 平塗綠底**，不要漸層、不要地面、不要陰影、不要暈影；主體上**不要使用綠色**（會被去背吃掉）。
- **特效 / 傳送門** 用純黑底（遊戲用加亮疊色，不需去背）。
- **場景大圖（背景、劇情插畫）** 不去背，不要綠底。
- 面向右、全身、2.5～3 頭身楓之谷風手繪、深色細輪廓、2～3 階賽璐珞明暗、光源左上。
- 圖中**不要文字、浮水印、簽名、UI 邊框**。
- 一張一張產；**先產哪張、後面哪些要附它當參考**都寫在每段開頭的「順序」。
- 附圖時請用 `asset-requests/ref/` 裡的檔案；若工具不接受透明 PNG，改用 `_green_x3` 版本（Boss）。

共用負面提示詞（有欄位就貼；每段內也有）：

```
photorealistic, 3D render, blurry, text, signature, watermark, background scenery, cropped limbs, extra limbs,
white background, gradient background, checkerboard, ground shadow, motion blur, harsh outline variation
```

---

### G-01 Boss 狂暴姿勢 ×3（P0）

**順序**：先產 **G-01a 待機**（附 `ref_boss_idle.png`）。確認風格與顏色 OK 後，再產 **G-01b 移動**、**G-01c 攻擊**，這兩張要同時附：該姿勢的原圖（`ref_boss_move.png` / `ref_boss_attack.png`）**與剛通過的狂暴待機圖**，以保持角色一致。三張的畫布比例同為 460:220（約 2.09:1），請用 3 倍 1380×660。

**要改什麼**：只改「色與氣場」，**姿勢、輪廓、位置、畫布大小與原圖一致**——紅眼發光、符文改成紅色、身上有紫色火焰與裂紋、披風邊緣燃燒、周圍黑球帶紫焰；體態可略為前傾。**不要畫王座房、不要地面、不要背景**（上次就是這樣失敗的）。

**G-01a 待機**（附 `ref_boss_idle.png`，必要時再附 `ref_boss_idle_green_x3.png`）

```
Use the attached REFERENCE image as the exact character and exact pose: a small chibi dark lord with a spiked
black-and-purple crown, purple glowing face, arms crossed, long dark purple cape with glowing runes, and floating
black orbs around him. Redraw THE SAME CHARACTER IN THE SAME POSE, same silhouette, same canvas proportions
(460:220, wide, character centred, feet near the bottom edge), but in his RAGE FORM (third boss phase):
glowing red eyes, the cape runes now glow red instead of magenta, cracks of violet fire along the armour and
cape edges, small purple flames licking off the shoulders and crown, the floating orbs now wrapped in purple
flame, body leaning very slightly forward with a more menacing posture. Keep the same MapleStory-like
hand-painted cartoon style, clean uniform dark outline, soft cel shading with 2-3 tones, light from upper-left.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no throne room, no scenery, no
ground shadow, no vignette, no glow spilling onto the background. Do not use green on the character.
Facing right (same as the reference). No text, no watermark.
NEGATIVE: throne room, scenery, floor, background, ground shadow, text, watermark, photorealistic, 3D render,
different pose, different character, cropped crown, cropped cape, white background, gradient background
OUTPUT: PNG, 1380x660, highest quality.
```

**G-01b 移動**（附 `ref_boss_move.png` + 通過的狂暴待機圖）

```
Use the FIRST attached image (the original boss MOVE pose) as the exact pose and silhouette, and the SECOND
attached image (the approved RAGE IDLE) as the exact character design, colours and rage effects. Draw the same
dark lord in the MOVE pose of the first image but in his rage form as in the second image: glowing red eyes,
red glowing cape runes, cracks of violet fire along the armour and cape, small purple flames off the shoulders
and crown, floating orbs wrapped in purple flame. Same canvas proportions 460:220, same body position and
size as the first image, feet near the bottom edge, facing right.
Same MapleStory-like hand-painted cartoon style, clean uniform dark outline, soft cel shading, light from
upper-left. BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no scenery, no ground
shadow, no vignette. No green on the character. No text, no watermark.
NEGATIVE: throne room, scenery, floor, background, ground shadow, text, watermark, photorealistic, 3D render,
different pose, different character, white background, gradient background
OUTPUT: PNG, 1380x660, highest quality.
```

**G-01c 攻擊**（附 `ref_boss_attack.png` + 通過的狂暴待機圖）

```
Use the FIRST attached image (the original boss ATTACK pose) as the exact pose and silhouette, and the SECOND
attached image (the approved RAGE IDLE) as the exact character design, colours and rage effects. Draw the same
dark lord in the ATTACK pose of the first image (keep the arms, the cast gesture and any magic orbs exactly where
they are) but in his rage form as in the second image: glowing red eyes, red glowing cape runes, cracks of violet
fire along the armour and cape, purple flames off the shoulders and crown. Any energy being cast becomes red-violet
instead of its original colour. Same canvas proportions 460:220, same body position and size as the first
image, feet near the bottom edge, facing right.
Same MapleStory-like hand-painted cartoon style, clean uniform dark outline, soft cel shading, light from
upper-left. BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no scenery, no ground
shadow, no vignette. No green on the character. No text, no watermark.
NEGATIVE: throne room, scenery, floor, background, ground shadow, text, watermark, photorealistic, 3D render,
different pose, different character, white background, gradient background
OUTPUT: PNG, 1380x660, highest quality.
```

---

### G-02 Boss 狂暴背景（P0）

**順序**：獨立產出，與 G-01 無相依。附 `ref_bg_boss_room.png`（構圖與風格參考）。**不要有任何角色**（沒有王座上的人、沒有怪物）。

```
Use the attached image as the exact composition and art style reference: a wide 2D side-scrolling game
background of a dark gothic throne room, a tall horned stone throne at the centre-right on a three-step dais,
floating glowing magic circles, three tall brazier torches, tattered banners on the left, stone arches on both
sides, a dark polished stone floor with faint cracks.
Redraw THE SAME ROOM with the SAME composition, SAME camera, SAME throne position, SAME arches, banners and
braziers, but in its RAGE STATE (final boss third phase): the whole image darker and heavier, the ambient light
shifted from soft violet to deep crimson and purple, the magic circles now glow red-violet and look unstable
and cracked, the brazier flames turn violet-red and flare higher, glowing red cracks run across the floor and
up the throne's steps, drifting red-violet embers in the air, the stained windows in the far background dim to
near black, a faint red mist along the floor. Keep the lower 20% of the image a calm dark floor area where
platforms will be placed.
Same MapleStory-like painterly cartoon style with clean dark outlines and soft shading as the reference.
NO characters, NO monsters, NO figure on the throne, NO text, NO UI, NO watermark. Horizontally balanced
composition. Aspect ratio 1376:768 (16:9).
NEGATIVE: characters, people, monsters, boss, text, watermark, UI, photorealistic, 3D render, different room,
different camera angle, white background, empty black image
OUTPUT: PNG or WebP, 1376x768 (or 2752x1536), RGB, no transparency.
```

---

### G-03 劇情插畫 2：魔君擊碎星星（P0）

**順序**：先產 G-03，通過後再產 G-04，並附 G-03 讓兩張的魔君 / 光色一致（G-04 會出現長老與少年，不一定要有魔君，但天空與配色要連得上）。風格參考附 `ref_story_1.png`（晨曦星光塔，暖色）與 `ref_story_3.png`（小鎮陷入黑暗，冷色）。**分開輸出，不要拼在一張**。

```
Use the attached STYLE REFERENCE images (a golden four-pointed star above a stone tower at dusk, and a dark
town overrun by monsters at night) for art style only: MapleStory-like hand-painted cartoon story illustration,
thin dark outline, soft cel shading with 2-3 tones, saturated but harmonious colours, slightly storybook mood.
Story illustration, 16:9, one single scene: a tall dark hooded lord in a torn black-purple cape, standing at the
top of a ruined stone stair under a moonless night sky, holding a large glowing golden four-pointed star between
both hands; the star is cracking and breaking, bright golden shards and light flying outward in all directions
into the dark sky. His face is half in shadow under the hood and shows PAIN and SORROW, not triumph and not
evil laughter (tears of light on one cheek, clenched teeth, eyes shut or downcast). Warm golden light from the
star lights his hands and chin; the surroundings are cold dark blue and violet. Small dark clouds, a few
ruined pillars, distant silhouettes of mountains. Composition: the lord on the left third, the breaking star
in the upper centre, shards streaming to the right so the eye travels right.
NO text, NO captions, NO watermark, NO UI frame, NO border. Do not draw any other character.
NEGATIVE: smiling villain, triumphant pose, gore, blood, photorealistic, 3D render, text, watermark, frame,
border, multiple panels, comic panels, blurry
OUTPUT: 1920x1080 (16:9), RGB, no transparency.
```

---

### G-04 劇情插畫 4：少年接下最後一塊碎片（P0）

**順序**：在 G-03 之後產；附 G-03 成品、`ref_story_1.png`、`ref_story_3.png`（風格）、`ref_title_hero.png`（少年的臉、黑色短髮、褐色眼睛、深藍兜帽、紅圍巾）、`ref_item_star_shard_x4.png`（碎片外觀）。**分開輸出**。

```
Use the attached STYLE REFERENCE images for art style only: MapleStory-like hand-painted cartoon story
illustration, thin dark outline, soft cel shading with 2-3 tones, saturated but harmonious colours.
Use the attached HERO reference (the small hooded boy with short messy black hair, brown eyes, dark blue hood
with gold trim and a red scarf) for the boy's face and outfit: the same boy. Use the attached SHARD reference
for the look of the star shard.
Story illustration, 16:9, one single scene: night at the edge of a quiet town. A small hooded boy in a dark blue
hood and red scarf (the hero, seen from the side or three-quarters, facing right) reaches out with one open hand
to receive the last glowing golden star shard from an old robed elder with a long white beard and a gentle,
solemn face, who holds it out in both hands. The shard glows warm gold and lights both faces and hands; the rest
of the scene is dark blue and violet. Behind them a dark, quiet town with a few lit windows and the stone
watchtower silhouette on a hill. The boy's expression is determined and calm. Composition: the two figures in
the lower centre, the shard at the exact centre as the brightest point, a hint of golden light drifting up into
the night sky to the right.
NO text, NO captions, NO watermark, NO UI frame, NO border. Only these two characters.
NEGATIVE: photorealistic, 3D render, extra people, monsters, text, watermark, frame, border, multiple panels,
different face, different hair colour, blurry, crowd
OUTPUT: 1920x1080 (16:9), RGB, no transparency.
```

---

### G-05 標題徽章（P1）

**順序**：獨立產出。附 `ref_title_hero.png`（配色與線條參考）。**不要文字**（「盜賊傳說」由遊戲繪製）。

```
Use the attached image for art style and palette only: MapleStory-like hand-painted game emblem, thin dark
outline, soft cel shading with 2-3 tones, light from upper-left.
Game title emblem, centred, symmetrical: a large golden four-pointed star in the centre with a soft inner glow,
behind it two crossed daggers (steel blades pointing up and outward, dark red-wrapped handles, gold crossguards)
forming an X, and under them a wide EMPTY ribbon banner (deep red cloth with gold trim, curled ends, completely
blank, no writing) wrapping across the lower third. A few tiny sparkles around the star. Keep it compact and
readable at small size; strong silhouette.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no ground shadow, no vignette. Do
not use green anywhere on the emblem. NO text, NO letters, NO symbols on the ribbon, NO watermark.
NEGATIVE: text, letters, writing, watermark, photorealistic, 3D render, background scenery, gradient background,
white background, checkerboard, asymmetry, extra weapons
OUTPUT: PNG, 1280x800, highest quality.
```

---

### G-06 刺客普通攻擊圖示（P1，需調整現有檔）

**順序**：獨立。附 `ref_skill_icon_ATK_x4.png`（現有盜賊普攻圖示，風格與底框參考）與 `ref_skill_icon_backstab_x4.png`（現有刺客影襲圖示，紫色雙刃，風格要與它同組）。**調整內容**：保留相同的深紫圓角寶石底框、金邊、尺寸與光源，把圖案由「單把短刀斜斬弧光」改成「雙短刃反手交叉揮出兩道紫白色弧光」，要與影襲圖示明顯不同（影襲是交叉匕首＋紫色殘影，這張要以弧形斬擊為主）。

```
Use the attached images as the exact style reference: a 38x38 game skill icon with a rounded-square dark
purple gem-like frame with a thin gold border, a single centred symbol, thin dark outline, soft cel shading,
light from upper-left (the first image is the basic-attack icon of the thief class, the second is the
Assassin's Shadowstrike icon).
Draw a NEW icon for the Assassin's basic attack, same frame, same border, same size and the same level of
detail: two short curved blades held in reverse grip, one swinging a violet-white crescent slash arc to the
right and the other crossing behind it, a second thinner arc echoing the first. Steel blades with purple
wraps on the handles. Keep the symbol centred with a small margin inside the frame; clearly different from the
Shadowstrike icon (that one is two crossed daggers with a violet streak) by emphasising the curved slash arcs.
BACKGROUND outside the frame: perfectly flat solid pure green #00FF00. No text, no watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, different frame colour, extra icons, white
background, gradient background
OUTPUT: PNG, 152x152 (4x of 38x38), highest quality. Make 3-4 variations.
```

---

### G-07 俠盜普通攻擊圖示（P1，需調整現有檔）

**順序**：獨立（可在 G-06 之後，附 G-06 成品讓兩張同組）。附 `ref_skill_icon_ATK_x4.png`（底框）與 `ref_skill_icon_whirl_x4.png`（現有俠盜迴旋斬圖示，橘紅色調，風格要與它同組）。**調整內容**：同樣保留深紫寶石底框，圖案改成「一把大彎刀大範圍橫斬，橘紅色寬弧光」，要與迴旋斬（圓形旋轉）明顯不同。

```
Use the attached images as the exact style reference: a 38x38 game skill icon with a rounded-square dark
purple gem-like frame with a thin gold border, a single centred symbol, thin dark outline, soft cel shading,
light from upper-left (the first image is the basic-attack icon of the thief class, the second is the
Bandit's Whirlwind Slash icon in orange and white).
Draw a NEW icon for the Bandit's basic attack, same frame, same border, same size and level of detail: one
large curved dagger / short sabre (steel blade, red-wrapped handle, small guard) swinging a wide heavy
horizontal slash, leaving a broad orange-red crescent arc with a white core. Keep the symbol centred with a
small margin inside the frame; clearly different from the Whirlwind icon (that one is a circular spin) by being
a single wide sideways arc with the sabre visible.
BACKGROUND outside the frame: perfectly flat solid pure green #00FF00. No text, no watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, circular spin, different frame colour, extra
icons, white background, gradient background
OUTPUT: PNG, 152x152 (4x of 38x38), highest quality. Make 3-4 variations.
```

---

### G-08 傳送門（藍紫，通用）（P1）

**順序**：先產 G-08；通過後再產 G-13（金色版）並附 G-08 保持同一形狀。**黑底**（遊戲用加亮疊色，不去背）。無需附既有圖。

```
Game visual effect sprite sheet, MapleStory-like painterly style, bright glowing colours on a pure black
#000000 background, NO character, effect only. 4 frames in one horizontal row, evenly spaced, each frame the
same size and the same position of the gate, no text.
Effect: a vertical oval magic portal, tall and narrow (about 2:3, width to height), a swirling blue-violet and
cyan light vortex inside a thin glowing rim, small white sparkles drifting upward along the rim, the swirl
rotating a quarter turn between frames so the 4 frames loop seamlessly (frame 4 leads back to frame 1), soft
inner glow, brightest at the centre, rim thicker at the bottom and top. The portal stands upright on the
ground: bottom edge at the same height in every frame. No stone frame, no ground, no floor shadow, no light
spilling beyond the rim into the black, nothing touching the frame borders.
NEGATIVE: character, text, watermark, stone arch, floor, ground, scenery, photorealistic, 3D render, blurry,
white background, grey background, different gate size between frames
OUTPUT: PNG, 4 frames in a row, 1024x384 total (each frame 256x384), pure black background.
```

---

### G-09 金幣圖示（P1）

**順序**：獨立。附 `ref_item_trial_token_x4.png`（現有任務道具圖示，風格、線條與尺寸感）。

```
Use the attached image for art style only: a small game item icon, MapleStory-like hand-painted cartoon style,
thin dark outline, soft cel shading with 2-3 tones, light from upper-left, glossy highlights.
A single gold coin ("meso"), slightly tilted three-quarter view, round, bright yellow-gold with a darker
orange-gold rim, a simple embossed star in the centre (no letters, no numerals), a small white highlight on the
upper left, a tiny sparkle. Must stay readable when shrunk to 16x16 pixels: bold shape, strong outline,
high contrast.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the coin. NO text, NO watermark.
NEGATIVE: text, numerals, watermark, photorealistic, 3D render, blurry, multiple coins, ground shadow, white
background, gradient background
OUTPUT: PNG, 128x128, highest quality.
```

---

### G-10 補給商 NPC ×3（P2）

**順序**：一次產一張橫排三人的圖（同一畫布比例才好統一大小）；附 `ref_npc_merchant.png`（62×80，圓胖商人，參考比例、線條、頭身比）與 `ref_npc_townsfolk.png`（42×80，老人）。三人**身高與頭身比一致**，每人身體寬度不同。若 AI 做不好三人合照，可拆成三次，每次都附同兩張參考並照抄同一段風格文字。

```
Use the attached images for art style and proportions only: MapleStory-like hand-painted 2D game NPC sprites,
chibi 2.5 heads tall, thin dark outline, soft cel shading with 2-3 tones, light from upper-left, saturated but
harmonious colours, standing, facing right, full body, feet at the same baseline.
Draw THREE different shopkeeper NPCs side by side, left to right, same standing height, at least 80 pixels of
empty space between them, none touching or overlapping:
1. "Peddler Afu": a cheerful travelling forest peddler, round-faced, wearing a warm orange-brown vest and a
straw hat, a huge wooden backpack stacked with herb bundles, bottles and a ladle on the back, friendly smile.
2. "Chandler Ahai": a stocky harbour ship-supplies seller, short beard, a navy blue sailor cap, a cream shirt
with rolled sleeves, a coil of rope over one shoulder and a small brass lantern in one hand, weathered tan skin.
3. "Trader Lao Mo": a thin elderly ruins relic trader with round goggles pushed up on a bald head, an ochre
scarf, a patched brown coat, a leather satchel stuffed with scrolls, a small sack in one hand, a wise squint.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no ground shadow, no vignette.
Do not use green on the characters or props. NO text, NO watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, scenery, ground shadow, white background,
gradient background, merged or touching characters, oversized heads, different art style, green clothing
OUTPUT: PNG, 2400x1200, highest quality.
```

---

### G-11 影子史萊姆（P2）

**順序**：獨立。附 `ref_monster_slime.png`（48×56 原史萊姆，需同一形狀與大小）。

```
Use the attached image as the exact shape reference: the small slime monster of the game. Draw the same slime
in a SHADOW VARIANT: same body shape, same pose, same size and proportions, same MapleStory-like hand-painted
cartoon style, thin dark outline, soft cel shading with 2-3 tones, light from upper-left — but made of dark
violet-black goo (#2a1840 to #5b2a86) with a glossy highlight, glowing magenta eyes, a few tiny floating purple
motes around it, a faint wisp of dark violet smoke from the top. Facing right, bottom of the body touching the
bottom edge of the image.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the monster. NO text, NO watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, scenery, ground shadow, white background,
gradient background, different shape, extra limbs
OUTPUT: PNG, 384x448, highest quality.
```

---

### G-12 二轉四個職業（P2）

> **外觀與武器是提案**（Lv30 二轉的技能與任務尚未設計，見 `ROADMAP.md`、`content-narrative.md` 第七節）；決定做之前請先確認方向。流程與 `JOB_PROMPTS.md` 的刺客 / 俠盜完全相同：**每職業 4 次生成（1 張設定圖 + 3 張動作表）**，每職業約 24 張可切出的姿勢（沿用 `JOB_POSES`）。
> **同一職業的順序**：步驟 1 設定圖 → 通過 → 步驟 2/3/4 每次都附該設定圖。四個職業可獨立進行，建議先做 `shadowkiller` 當樣品。
> 所有動作表一律套用 `JOB_PROMPTS.md` 的 **3.2 排版區塊、3.3 負面提示詞、3.4 風格前綴**（下面用 `[3.2]` `[3.3]` `[3.4]` 代稱；貼上時請把那三段原文展開貼進去，使每段能獨立使用）。

**參考圖（每次都附，順序固定）**
1. 風格 / 一轉前身：刺客系（影殺者、暗夜使者）附 `ref_player_assassin_idle_x4.png` + `ref_player_assassin_slash_2_x4.png`；俠盜系（盜賊王、暗影遊俠）附 `ref_player_bandit_idle_x4.png` + `ref_player_bandit_slash_2_x4.png`。
2. 原始主角（臉）：`ref_player_idle_x4.png`。
3. 步驟 2 之後再加：該職業的設定圖（步驟 1 成品）。

**共用的「設定圖」模板**（把 `<...>` 換成下面各職業的內容）

```
[3.4 風格前綴]
Character design sheet of the hero after his SECOND job advancement, "<JOB NAME>", evolving from the
"<FIRST JOB>" shown in the attached reference: the same boy (same face, black short messy hair, brown eyes), now
older and more experienced, but still with the SAME silhouette language as the reference (keep the <scarf /
bandana> element) so he is clearly the same character grown up.
OUTFIT: <outfit>. WEAPON: <weapon>. PALETTE: <palette>.
Show 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour
palette strip at the bottom. Same chibi proportions as the reference (about 2.5 heads tall).
Background: flat solid green #00FF00. No text.
```

| 職業 | `<JOB NAME>` / `<FIRST JOB>` | `<outfit>` | `<weapon>` | `<palette>` |
|------|-----------------------------|-----------|-----------|-------------|
| `shadowkiller` 影殺者（單體爆發） | Shadowkiller / Assassin | black hood with silver trim and a crimson inner lining, a half-face silver-edged mask covering the nose and mouth, fitted black coat with a short high collar and crimson stitching, long crimson-and-black scarf with two long tails, wrist guards with red gems, slim and agile | two long curved kris-style blades in reverse grip, dark steel with red wraps | near-black #1a1722, crimson #a3222e, silver, small gold accents |
| `nightlord` 暗夜使者（飛鏢 / 遠程） | Night Lord / Assassin | midnight-blue hooded cloak with a faint star pattern on the lining, the lower face covered by a dark-blue cloth mask, black and navy fitted outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, clawed leather glove on the throwing hand, slim | a fan of large star-shaped throwing stars held in one hand (silver with a violet glint), a short dagger on the hip | midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents |
| `bandit_king` 盜賊王（重型近戰） | Bandit King / Bandit | NO hood, a small gold circlet worn over the red bandana, rust-brown and black leather coat with a big cream fur collar and gold trim, one large metal shoulder plate on each shoulder, a wide red sash with a gold buckle, bandaged forearms with gold bracers, broader and sturdier than the Bandit | one very large curved sabre with a gold-trimmed guard and red-wrapped handle, forward grip | dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel |
| `shadowranger` 暗影遊俠（機動 / 混合） | Shadow Ranger / Bandit | NO hood, a dark teal-grey half cape over one shoulder, a charcoal-grey leather vest, a dark teal bandana tied at the neck (instead of the forehead) with two tails, forearm guards, a belt of small pouches and throwing knives, lean and athletic, slightly narrower than the Bandit | a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip | charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel |

**步驟 2：動作表 A（移動，8 張）**

```
[3.4 風格前綴] Use the attached <JOB> DESIGN SHEET as the exact character (same outfit, colours, weapons).
Draw 8 poses, left to right, top row then bottom row:
1 idle: standing relaxed, weapons held low, <scarf/bandana> tails resting.
2 idle 2: same as pose 1 but the whole body about 3% lower (breathing), tails slightly different.
3 walk 1: right foot forward, contact pose.   4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.    6 walk 4: passing pose, legs together.
7 jump up: knees tucked, weapons back, tails flowing downward.
8 fall: legs extended downward, tails flowing upward.
[3.2 排版區塊]   [3.3 負面提示詞]
```

**步驟 3：動作表 B（狀態與技能，8 張）**

```
[3.4 風格前綴] Use the attached <JOB> DESIGN SHEET as the exact character.
Draw 8 poses:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, weapons loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, weapons ready.
3 dead: lying flat on the ground on his back, eyes closed, a weapon dropped beside him.
4 cast: free hand stretched forward, fingers open, as if marking or grabbing a target, tails fluttering.
5 dash: body leaning far forward in a sprint, weapon pulled back, tails streaming straight back.
6 throw 1: winding up to throw, arm cocked behind the head, weapon in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: weapon(s) crossed or held in front of the chest in a defensive stance.
[3.2 排版區塊]   [3.3 負面提示詞]
```

**步驟 4：動作表 C（近戰，5 張；刺客系用突刺、俠盜系用旋轉）**

```
[3.4 風格前綴] Use the attached <JOB> DESIGN SHEET as the exact character.
Draw 5 poses (grid 3 on the top row, 2 on the bottom row):
1 slash 1: wind-up, weapon(s) pulled back, body twisted, weight on the back foot.
2 slash 2: weapon slashing forward, body leaning in.
3 slash 3: heavy finishing slash, follow-through, body fully extended.
<ASSASSIN-LINE: 4 backstab 1: very low crouch, blades pulled in close, eyes narrowed (about to strike).
 5 backstab 2: lunging forward with both blades thrust straight ahead at chest height, long forward stride.>
<BANDIT-LINE: 4 spin 1: starting a spin, body twisted away from the viewer, weapon swung out wide to the side.
 5 spin 2: mid-spin, body turned sideways, weapon extended fully horizontal, tails whipping around.>
[3.2 排版區塊]   [3.3 負面提示詞]
```

> 頭像 `portrait_<job>.png`（74×72）：步驟 2 通過後，另附設定圖，要求 "bust portrait, head and shoulders, three-quarter view facing right, same character, flat solid green #00FF00 background, no text"，產出 296×288。
> 二轉的技能圖示要等技能設計定案後再列（目前沒有二轉技能）。

---

### G-13 影之殿堂專屬傳送門（金色）（P2，選配）

**順序**：在 G-08 通過後產出，附 G-08 成品保持形狀與格數。黑底。

```
Use the attached image as the exact shape and frame-layout reference: a 4-frame horizontal sprite sheet of a
tall oval magic portal on a pure black background.
Draw the SAME portal sheet (same 4 frames, same size, same position, same seamless loop) recoloured as a
sacred GOLDEN version for the Shadow Shrine: a swirling warm gold, soft white and pale amber light vortex, a thin
bright gold rim, tiny star-shaped sparkles drifting upward, a gentle moonlit feeling. Bright glowing colours
on pure black #000000 background, NO character, effect only, no stone frame, no ground, no text, nothing
touching the frame borders.
NEGATIVE: character, text, watermark, stone arch, floor, scenery, photorealistic, 3D render, blurry, white
background, grey background, different gate size between frames
OUTPUT: PNG, 4 frames in a row, 1024x384 total (each frame 256x384), pure black background.
```

---

### G-14 夜渡（魔君）設定圖（P1 / P2，取決於劇情）

**順序**：先確認是否採用「魔君曾是上一代影子」轉折。附 `ref_boss_idle.png`（現有魔君，要保留他的辨識點：尖冠、披風、浮動黑球），並**只改氣質**：疲憊溫柔的眼神、破損披風、有裂痕的金色王冠。

```
Use the attached image as the base character: a small chibi dark lord with a spiked crown, dark purple cape
and floating black orbs. Draw a CHARACTER DESIGN SHEET of the same lord in his true, former self: "Yedu", a
fallen guardian. MapleStory-like hand-painted chibi (about 2.5 heads tall), thin dark outline, soft cel shading
with 2-3 tones, light from upper-left. Dark armour with worn silver edges, a TORN dark cape with golden-thread
runes that have faded, a CRACKED GOLDEN crown (not black spikes), eyes TIRED and KIND rather than menacing, a
faint soft smile, no glowing red, one gauntlet bare. Show 3 views in one row, evenly spaced: front, side facing
right, back; plus a small colour palette strip at the bottom.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no ground shadow, no vignette. No
green on the character. No text, no watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, menacing expression, red eyes, scenery, white
background, gradient background, extra limbs
OUTPUT: PNG, highest quality.
```

---

### G-15 可調查石碑（P1 / P2，取決於劇情）

**順序**：獨立。

```
Game prop, MapleStory-like hand-painted chibi style, thin dark outline, soft cel shading with 2-3 tones, light
from upper-left. An ancient carved stone tablet standing upright, weathered grey-blue stone with moss at the
base, chipped top, faint glowing gold-blue runes carved on its face (abstract rune shapes only, no readable
text), a small pebble base. Side-on slight three-quarter view, bottom edge flat so it sits on the ground.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the tablet (use blue-grey moss instead). NO text, NO letters, NO watermark.
NEGATIVE: readable text, letters, watermark, photorealistic, 3D render, blurry, scenery, ground shadow, white
background, gradient background
OUTPUT: PNG, 384x512, highest quality.
```

---

### G-16 寶箱（關 / 開）（P1 / P2，取決於劇情）

**順序**：先產關閉狀態，再產打開狀態並附關閉圖（同一個箱子）。也可一次出兩個並排。

```
Game prop sheet, MapleStory-like hand-painted chibi style, thin dark outline, soft cel shading with 2-3 tones,
light from upper-left. A small wooden treasure chest with gold trim, a gold lock and rounded lid, side view
slightly from above. Draw TWO versions side by side with the same size and baseline: left, CLOSED; right, OPEN
with the lid tilted back, warm golden light and a few sparkles rising from inside, a few coins visible. Wide
empty space (at least 60 pixels) between the two.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the chest. NO text, NO watermark.
NEGATIVE: text, watermark, photorealistic, 3D render, blurry, scenery, ground shadow, white background,
gradient background, different chest between the two
OUTPUT: PNG, 1600x640, highest quality.
```

---

### G-17 夜渡之信道具圖示（P1 / P2，取決於劇情）

**順序**：獨立。附 `ref_item_star_shard_x4.png`（現有星光碎片圖示，風格與大小感）。

```
Use the attached image for art style only: a small game item icon, MapleStory-like hand-painted cartoon style,
thin dark outline, soft cel shading with 2-3 tones, light from upper-left.
A single folded old letter, aged cream-yellow paper with slightly torn corners, sealed with a small round
silver wax seal stamped with a four-pointed star, a thin faded ribbon. Bold simple shape that stays readable
at 28x28 pixels, strong outline.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the letter. NO text, NO writing on the paper, NO watermark.
NEGATIVE: text, writing, watermark, photorealistic, 3D render, blurry, multiple items, ground shadow, white
background, gradient background
OUTPUT: PNG, 112x112, highest quality.
```

---

### G-18 結局插畫 ×2（P2，取決於劇情）

**順序**：先產 18a，再產 18b（附 18a 保持光色一致）。兩張**分開輸出**。附 `ref_story_1.png`（風格）；18a 另附 `ref_title_hero.png`（少年外觀）。

**18a：重組星星**

```
Use the attached STYLE REFERENCE for art style only: MapleStory-like hand-painted cartoon story illustration,
thin dark outline, soft cel shading, warm saturated colours. Use the attached HERO reference for the boy's face
and outfit (short messy black hair, brown eyes, dark blue hood down on his shoulders, red scarf).
Ending illustration, 16:9: dawn. The hooded boy stands on a grassy hill seen from behind and slightly to the
side, looking up at a restored glowing golden four-pointed star in the sky; on the ground beside him he casts NO
shadow, bathed in warm light from the star. Soft pink and gold sky, distant quiet town and the stone tower, a
few drifting golden sparkles. Peaceful, hopeful mood.
NO text, NO watermark, NO frame, NO border.
NEGATIVE: photorealistic, 3D render, text, watermark, frame, border, multiple panels, monsters, blurry
OUTPUT: 1920x1080 (16:9), RGB, no transparency.
```

**18b：釋放碎片**

```
Use the attached STYLE REFERENCE for art style only: MapleStory-like hand-painted cartoon story illustration,
thin dark outline, soft cel shading, warm saturated colours.
Ending illustration, 16:9: dawn over a quiet continent seen from high above: forests, a river, mountains, a
small town with a tall stone tower, and thousands of small star shards drifting upward and outward like golden
fireflies across the whole landscape, each leaving a faint glowing trail, the sky turning from deep blue to
soft pink and gold at the horizon. Calm, bittersweet and hopeful mood.
NO characters, NO text, NO watermark, NO frame, NO border.
NEGATIVE: photorealistic, 3D render, text, watermark, frame, border, multiple panels, characters, monsters,
blurry
OUTPUT: 1920x1080 (16:9), RGB, no transparency.
```

---

### G-19 星光之塔（未點亮版）（P2，取決於劇情 / 選配）

**順序**：獨立。附 `ref_prop_star_tower_x4.png`（現有塔：藤蔓石塔、頂端金星）。**調整內容**：同一座塔、同構圖、同大小，但塔頂**沒有金星**，改成一個空的、暗淡的燈座 / 星形凹槽，整體色調略冷暗。

```
Use the attached image as the exact reference: a tall round stone watchtower with ivy, two arched windows, a
wooden door and a small floating golden four-pointed star above the top. Draw THE SAME TOWER with the SAME
shape, SAME composition, SAME size and proportions, SAME art style (MapleStory-like hand-painted chibi, thin
dark outline, soft cel shading), but in its UNLIT STATE: NO golden star above it; at the top, an empty dark
star-shaped lantern cradle with dull grey-blue stone, the windows dark, the overall colour slightly colder and
dimmer, more ivy shadows. Bottom edge flat so it sits on the ground.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no ground shadow, no vignette. Do not use
green on the tower except natural dark-green ivy that is clearly different from #00FF00. NO text, NO watermark.
NEGATIVE: golden star, glow, text, watermark, photorealistic, 3D render, blurry, scenery, ground shadow, white
background, gradient background
OUTPUT: PNG, 740x1680 (4x of 185x420), highest quality.
```

---

### G-20 稀有怪金色光環（P2，取決於劇情）

**順序**：獨立。附 `ref_fx_boss_aura.png`（現有特效 4 格橫排的風格）。黑底。

```
Game visual effect sprite sheet, MapleStory-like painterly style, bright glowing colours on a pure black
#000000 background, NO character, effect only, 6 frames in one horizontal row, evenly spaced, same size, no
text. Effect: a soft golden sparkle aura ring, a gentle warm glow with small four-pointed gold sparkles that
twinkle and drift upward, the ring slowly pulsing so the 6 frames loop seamlessly; hollow in the centre so a
monster can be seen through it, nothing touching the frame borders.
NEGATIVE: character, text, watermark, photorealistic, 3D render, blurry, white background, grey background,
solid centre
OUTPUT: PNG, 6 frames in a row, 1152x192 total (each frame 192x192), pure black background.
```

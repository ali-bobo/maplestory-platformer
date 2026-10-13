# 素材缺口總表與提示詞（2026-10 盤點）

> 這份文件是 [`ASSET_REQUEST.md`](ASSET_REQUEST.md)「現況總表」的後續：以 **實際程式與 `src/config/assetCatalog.js`** 交叉檢查後，列出目前還缺的美術、每項的接線點，並為每一項附上可直接貼給圖像 AI 的英文提示詞（**2026-10 改版：每段都單獨、完整、自足，適合免費版 Gemini 的全新對話**；可複製版見 [`asset-requests/PROMPTS.md`](asset-requests/PROMPTS.md)）。
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
| G-10 | P2 | 補給商 NPC ×3：行商阿福、船具商阿海、遺跡商販老莫 | `npc_peddler.png` `npc_chandler.png` `npc_trader.png` | 約 56×80 / 56×80 / 48×80 | 三人各產一次（每人約 3:4 直式） | `maps.js` 272 / 307 / 340 行（改 `id`、移除 `tint`）；`NPC_ASSETS`（690 行） | **缺**（染色借用） | `ref_npc_merchant.png` `ref_npc_townsfolk.png` |
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

> **2026-10 再改版：提示詞要短。** 免費版 Gemini 輸入太長會被截斷或忽略，所以每個「貼這段」本體 **≤ 700 個英文字元**（約 100 字），一個區塊只貼一段；之後新增的提示詞也照做。
> 每段只留：一句風格（2D cartoon game art, MapleStory-style, clean outline）、最關鍵的 4～6 個外觀特徵、姿勢或內容、背景規則（純綠 `#00FF00`、無地面陰影、無文字）、一句構圖／比例。長篇色碼與重複禁止項已刪；失敗修正句放在「若失敗再貼」（每句 ≤ 150 字元，不計入本體）。
> 每段仍可單獨貼到全新對話；有參考圖時第一句 "If an image is attached, ..." 會生效，沒圖時其餘文字仍能獨立產圖。二轉職業（G-12）改成「一次只產 2 格」，由我（AI）切開並組合成動畫。
> 完整可複製版在 [`asset-requests/PROMPTS.md`](asset-requests/PROMPTS.md)，兩處內容相同，**以 PROMPTS.md 為準**。參考圖在 `asset-requests/ref/`（選配）。

共用規則：綠底 `#00FF00` 去背（角色 / 怪物 / NPC / 圖示 / 道具）、黑底 `#000000`（特效 / 傳送門）、場景大圖不去背；面向右；2.5～3 頭身楓之谷風；圖中不要文字與浮水印。

---

### G-01　Boss 狂暴姿勢 x3（待機 / 移動 / 攻擊）｜P0

- 最終檔名 `boss_rage_idle.png` / `boss_rage_move.png` / `boss_rage_attack.png`｜遊戲內尺寸 460x220
- 建議：各 1380x660（約 2.1:1）綠底，三個姿勢各產一次、不拼圖，每段產 2～3 張挑最好的。只改色與氣場，姿勢與輪廓照原圖

#### G-01a 待機

**貼這段**（620 字元）

```
If an image is attached, use it as the exact character reference; only change: RAGE form (red eyes and runes, purple flames). 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi Dark Lord boss, side view facing right: hairless grey-violet head, no mouth or nose, glowing RED slanted eyes; tall spiked black crown; spiked shoulders, clawed gauntlets; purple cape with glowing red runes and flame edges; floating black orbs ringed with purple fire. Pose: standing, arms crossed over the chest. Flat green #00FF00 background, no throne room, no floor, no shadow, no text. Wide 2.1:1, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Draw only the character, no room or scenery; keep the pose, only colors and flames change.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_boss_idle.png（若工具把透明顯示成黑／白，改附 ref_boss_idle_green_x3.png）

#### G-01b 移動

**貼這段**（663 字元）

```
If an image is attached, use it as the exact character reference; only change: RAGE form (red eyes and runes, purple flames). 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi Dark Lord boss, side view facing right: hairless grey-violet head, no mouth or nose, glowing RED slanted eyes; tall spiked black crown; spiked shoulders, clawed gauntlets; purple cape with glowing red runes and flame edges; floating black orbs ringed with purple fire. Pose: flying dash, leaning far forward, one claw reaching forward, cape streaming left. Flat green #00FF00 background, no throne room, no floor, no shadow, no text. Wide 2.1:1, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Draw only the character, no room or scenery; keep the pose, only colors and flames change.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_boss_move.png（或 ref_boss_move_green_x3.png）

#### G-01c 攻擊

**貼這段**（668 字元）

```
If an image is attached, use it as the exact character reference; only change: RAGE form (red eyes and runes, purple flames). 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi Dark Lord boss, side view facing right: hairless grey-violet head, no mouth or nose, glowing RED slanted eyes; tall spiked black crown; spiked shoulders, clawed gauntlets; purple cape with glowing red runes and flame edges; floating black orbs ringed with purple fire. Pose: wide stance, right arm extended, launching a huge black-violet fireball with red core. Flat green #00FF00 background, no throne room, no floor, no shadow, no text. Wide 2.1:1, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Draw only the character, no room or scenery; keep the pose, only colors and flames change.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_boss_attack.png（或 ref_boss_attack_green_x3.png）

---

### G-02　Boss 狂暴背景（不含角色）｜P0

- 最終檔名 `bg_boss_room_rage.webp`｜遊戲內尺寸 1376x768
- 建議：1376x768 或 2752x1536（16:9），不去背，產 2～3 張

**貼這段**（540 字元）

```
If an image is attached, keep its exact composition; only change: darker, crimson-violet rage mood. 2D cartoon game background, MapleStory-style, clean outline, soft cel shading, 16:9. Gothic throne hall: big stone arches at both edges, an EMPTY tall black throne with two horn spikes on a 3-step dais at centre-right, cracked red-violet magic circles floating above, three tall braziers with violet-red flames, tattered banners top-left, glowing red cracks on the dark floor, red embers. Lower 20% calm plain floor. No characters, no text.
```

**若失敗再貼**

```
Remove every character and creature; the throne is empty. No text, border or panels.
One full-bleed 16:9 illustration, no border, no panels, no text, not photorealistic.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_bg_boss_room.png（構圖與風格）

---

### G-03　劇情插畫 2：魔君擊碎星星｜P0

- 最終檔名 `story_2.webp`｜遊戲內尺寸 960x540
- 建議：1920x1080（16:9），不去背，與 G-04 分開產，產 2～3 張

**貼這段**（557 字元）

```
2D cartoon storybook illustration, MapleStory-style, clean dark outline, soft cel shading, 16:9, full-bleed. A tall dark lord in a black-purple hood and torn cape with a small spiked crown, pale grey-violet skin, stands at the top of ruined stairs under a moonless night sky. Between his hands a golden four-pointed star cracks apart, shards flying right. His face shows deep SORROW, eyes shut, a tear of light, not evil. Warm gold light on his hands, everything else dark blue-violet. Lord on the left third, star upper centre. Only one character. No text.
```

**若失敗再貼**

```
Change his expression to deep sorrow: eyes closed, a tear of light, no smile, no triumph.
One full-bleed 16:9 illustration, no border, no panels, no text, not photorealistic.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_story_1.png（風格）；ref_story_3.png（風格）

---

### G-04　劇情插畫 4：戴兜帽少年接下最後一塊碎片｜P0

- 最終檔名 `story_4.webp`｜遊戲內尺寸 960x540
- 建議：1920x1080（16:9），不去背，產 2～3 張

**貼這段**（555 字元）

```
2D cartoon storybook illustration, MapleStory-style, clean dark outline, soft cel shading, 16:9, full-bleed. Night at a quiet town edge. An old elder (indigo robe, long white beard, gentle sad face) holds out a glowing golden star shard in both hands; a small young thief boy (spiky black hair, brown eyes, navy hood with gold trim, red scarf, brown leather armor, facing right) reaches out to take it. The shard is the brightest point at image centre and lights both faces; a stone watchtower silhouette on a hill behind. Exactly two characters. No text.
```

**若失敗再貼**

```
The boy has spiky BLACK hair, brown eyes, navy hood with gold trim, red scarf. Exactly two characters.
One full-bleed 16:9 illustration, no border, no panels, no text, not photorealistic.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_title_hero.png（少年外觀）；ref_item_star_shard_x4.png（碎片）；ref_story_1.png（風格）

---

### G-05　標題徽章｜P1

- 最終檔名 `ui_title_badge.png`｜遊戲內尺寸約 320x200
- 建議：1280x800（8:5）綠底，產 2～3 張

**貼這段**（482 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game title emblem, symmetrical, bold simple shapes: a large faceted golden four-pointed star in the centre, two crossed daggers behind it (steel blades, red handles, gold guards), and a wide EMPTY deep-red ribbon banner with gold trim across the bottom, completely blank. A few tiny sparkles. Pure flat green #00FF00 background, no ground shadow, no text. No green on the emblem. One emblem, centred, 8:5.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Make the ribbon completely blank, no writing at all.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_title_hero.png（只取配色與線條）

---

### G-06　刺客普通攻擊圖示（需調整現有檔）｜P1

- 最終檔名 `skill_icon_ATK_assassin.png`｜遊戲內尺寸 38x38
- 建議：152x152 正方形，磚外綠底，產 2～3 張。現有檔是盜賊普攻的複本，需換圖案

**貼這段**（467 字元）

```
If an image is attached, keep its tile frame exactly; only change the symbol inside. 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Rounded-square icon tile: dark purple gem-like face with a thin gold-beige border. Symbol: two short curved blades in reverse grip with two violet-white crescent slash arcs. Bold, simple, readable at 38x38. Outside the tile: pure flat green #00FF00, no green inside, no shadow, no text. One icon, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the frame: dark purple gem-like rounded square, thin gold-beige border. Symbol bolder and simpler.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_skill_icon_ATK_x4.png（底框）；ref_skill_icon_backstab_x4.png（同組風格，勿照抄）

---

### G-07　俠盜普通攻擊圖示（需調整現有檔）｜P1

- 最終檔名 `skill_icon_ATK_bandit.png`｜遊戲內尺寸 38x38
- 建議：152x152 正方形，磚外綠底，產 2～3 張。現有檔是盜賊普攻的複本，需換圖案

**貼這段**（565 字元）

```
If an image is attached, keep its tile frame exactly; only change the symbol inside. 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Rounded-square icon tile: dark purple gem-like face with a thin gold-beige border. Symbol: one large curved sabre (steel blade, gold guard, red handle) making ONE wide horizontal orange-red crescent slash with a white core; the sabre clearly visible, not a circular spin. Bold, simple, readable at 38x38. Outside the tile: pure flat green #00FF00, no green inside, no shadow, no text. One icon, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Draw ONE wide sideways crescent slash with the sabre visible, not a circular spin.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_skill_icon_ATK_x4.png（底框）；ref_skill_icon_whirl_x4.png（同組風格，勿照抄）

---

### G-08　傳送門（藍紫通用）4 格動畫｜P1

- 最終檔名 `portal_blue.png`｜遊戲內尺寸 64x96（每格）
- 建議：橫排 4 格 1024x384，純黑底（不去背），產 2～3 張。排不好就改單格，由我（AI）組成動畫

**貼這段**（555 字元）

```
2D cartoon game effect sprite sheet, MapleStory-style, bright glowing colors, no character, no text. Blue-violet and cyan light with a cyan-white rim. Vertical oval magic portal, tall and narrow (2:3), swirling vortex with a bright rim and small sparkles rising along it, brightest at the centre; the swirl turns a quarter turn per frame. Exactly 4 identical-size frames in one row (8:3), same position and size, nothing touching the edges. Pure flat black #000000 background, no floor, no arch, no stone frame. If 4 frames are impossible, draw ONE frame.
```

**若失敗再貼**

```
Redo: glowing effect only on one flat pure black #000000 background; no character or scenery; nothing touches the edges.
If 4 frames are not possible, draw ONE single frame centred on pure black; I will build the animation myself.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：無（只靠文字即可）

---

### G-09　金幣圖示｜P1

- 最終檔名 `item_meso.png`｜遊戲內尺寸 16x16
- 建議：128x128 正方形綠底，產 2～3 張

**貼這段**（460 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game icon: ONE gold coin in slight three-quarter view, bright yellow-gold face, darker orange-gold rim with visible thickness, an embossed four-pointed star in the centre (no letters or numbers), white highlight upper-left, one tiny sparkle. Bold, high contrast, readable at 16x16. Pure flat green #00FF00 background, no ground shadow, no text. No green on the coin. Centred, square.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Draw exactly ONE coin, centred, no letters or numbers.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_item_trial_token_x4.png（取風格與線條）

---

### G-10a　補給商 NPC：行商阿福｜P2

- 最終檔名 `npc_peddler.png`｜遊戲內尺寸約 56x80
- 建議：直式 3:4（如 900x1200）綠底，產 2～3 張

**貼這段**（524 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi shopkeeper NPC, round friendly stocky body, about 2.5 heads tall, side view facing right, full body, standing relaxed. Peddler Afu: cheerful face with a big smile, pale-yellow straw hat, orange-brown vest over a cream shirt, brown trousers and boots, a huge wooden backpack stacked with herb bundles and glass bottles. Single character. Pure flat green #00FF00 background, no ground shadow, no text. No green clothing. Portrait 3:4, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Make him a short chibi NPC, about 2.5 heads tall, big round head, small stocky body.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_npc_merchant.png（比例與線條）；ref_npc_townsfolk.png（比例與線條）

---

### G-10b　補給商 NPC：船具商阿海｜P2

- 最終檔名 `npc_chandler.png`｜遊戲內尺寸約 56x80
- 建議：直式 3:4 綠底，產 2～3 張

**貼這段**（549 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi shopkeeper NPC, round friendly stocky body, about 2.5 heads tall, side view facing right, full body, standing relaxed. Chandler Ahai: weathered tan skin, short brown beard, navy-blue sailor cap, cream shirt with rolled sleeves, dark brown trousers, a coil of thick rope on one shoulder, a small brass lantern in one hand, kind squinting smile. Single character. Pure flat green #00FF00 background, no ground shadow, no text. No green clothing. Portrait 3:4, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Make him a short chibi NPC, about 2.5 heads tall, big round head, small stocky body.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_npc_merchant.png（比例與線條）；ref_npc_townsfolk.png（比例與線條）

---

### G-10c　補給商 NPC：遺跡商販老莫｜P2

- 最終檔名 `npc_trader.png`｜遊戲內尺寸約 48x80
- 建議：直式 3:4 綠底，產 2～3 張

**貼這段**（539 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi shopkeeper NPC, round friendly stocky body, about 2.5 heads tall, side view facing right, full body, standing relaxed. Trader Lao Mo: thin old man, bald, round brass goggles pushed up on the forehead, small white moustache, ochre scarf, patched brown long coat, a satchel of rolled scrolls on one hip, a small cloth sack in one hand. Single character. Pure flat green #00FF00 background, no ground shadow, no text. No green clothing. Portrait 3:4, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Make him a short chibi NPC, about 2.5 heads tall, big round head, small stocky body.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_npc_merchant.png（比例與線條）；ref_npc_townsfolk.png（比例與線條）

---

### G-11　影子史萊姆（Boss 房小怪）｜P2

- 最終檔名 `monster_shadow_slime.png`｜遊戲內尺寸 48x56
- 建議：約 384x448（4:5）綠底，產 2～3 張

**貼這段**（547 字元）

```
If an image is attached, keep its shape and size; only change the colors and aura. 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Cute small slime monster, round jelly blob with a flat bottom, slightly side view facing right: dark violet-black goo, glossy white highlight upper-left, two glowing magenta eyes, small smirk, a withered dark sprout on top, a few tiny purple motes and a wisp of dark smoke. Cute, not scary. Pure flat green #00FF00 background, no ground shadow, no text. No green on the monster. Centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep it cute and simple like a game mascot: round jelly blob, big glossy highlight, simple face.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_monster_slime.png（原史萊姆）

---

### G-12a　二轉：影殺者（單體爆發） Shadowkiller｜P2（外觀為提案）

- 最終檔名 `player_shadowkiller_*.png`、`portrait_shadowkiller.png`｜遊戲內尺寸 100x80（頭像 74x72）
- 建議：設定圖 1 張（約 16:9）；動作格每段**只產 2 格並排**（約 2:1 橫幅，每段 2～3 張挑最好的）；頭像約 296x288。全部綠底
- 共 12 段，順序：設定圖 → 動作 1～10 → 頭像（選配）。待機呼吸（idle 2）不用產；**所有動作格由我（AI）切開、對齊並組合成動畫**
- 外觀、武器與配色是**提案**（尚待確認）；一轉前身供對照：黑兜帽銀邊、黑布面罩、紫圍巾、反手雙短刃

#### 設定圖

**貼這段**（580 字元）

```
If an image is attached, use it as the face and style reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Character design sheet of Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. 3 views in one row: front, side facing right, back; full body. Flat green #00FF00 background, no shadow, no text. No green on the character.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and every listed outfit feature; same chibi proportions in all three views.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_player_assassin_idle_x4.png + ref_player_assassin_slash_2_x4.png（一轉前身：線條與比例）；ref_player_idle_x4.png（主角的臉與風格）

#### 動作 1：idle + walk 1

**貼這段**（642 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) idle: relaxed stand, the blades held low. B) walk 1: walking, right foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 2：walk 2 + walk 3

**貼這段**（645 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) walk 2: walking, legs together, passing pose. B) walk 3: walking, left foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 3：walk 4 + jump

**貼這段**（646 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) walk 4: walking, legs together, body slightly raised. B) jump: jump up, knees tucked. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 4：fall + hurt

**貼這段**（675 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) fall: falling, legs extended down, scarf tails flowing up. B) hurt: hurt, leaning back, eyes shut, arms flung out. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 5：crouch + dead

**貼這段**（666 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) crouch: crouched low, knees deeply bent. B) dead: lying flat on his back, eyes closed, weapon beside him. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 6：cast + dash

**貼這段**（685 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) cast: one open hand stretched forward to mark a target. B) dash: sprinting, leaning far forward, scarf tails streaming back. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 7：throw 1 + throw 2

**貼這段**（671 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) throw 1: wind-up to throw, arm cocked behind the head. B) throw 2: throw follow-through, arm extended forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 8：guard + slash 1

**貼這段**（675 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) guard: the blades crossed in front of the chest, defensive. B) slash 1: wind-up, blades pulled back, body twisted. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 9：slash 2 + slash 3

**貼這段**（650 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) slash 2: slashing forward, leaning in. B) slash 3: heavy finishing slash, fully extended. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 10：backstab 1 + backstab 2

**貼這段**（684 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Draw 2 poses side by side, same size, wide gap: A) backstab 1: very low crouch, blades close, eyes narrowed. B) backstab 2: long lunge, blades thrust forward at chest height. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 頭像（選配）

**貼這段**（533 字元）

```
If an image is attached, use it as the exact character reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bust portrait, three-quarter view facing right, calm look. Shadowkiller (grown-up hero, spiky black hair, brown eyes): black hood with silver trim and crimson lining, black half-mask over nose and mouth, black coat with crimson stitching, long crimson-black scarf with two tails, red-gem wrist guards, two long curved kris blades in reverse grip. Flat green #00FF00 background, no shadow, no text. Centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; bust portrait only.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：設定圖

---

### G-12b　二轉：暗夜使者（飛鏢 / 遠程） Night Lord｜P2（外觀為提案）

- 最終檔名 `player_nightlord_*.png`、`portrait_nightlord.png`｜遊戲內尺寸 100x80（頭像 74x72）
- 建議：設定圖 1 張（約 16:9）；動作格每段**只產 2 格並排**（約 2:1 橫幅，每段 2～3 張挑最好的）；頭像約 296x288。全部綠底
- 共 12 段，順序：設定圖 → 動作 1～10 → 頭像（選配）。待機呼吸（idle 2）不用產；**所有動作格由我（AI）切開、對齊並組合成動畫**
- 外觀、武器與配色是**提案**（尚待確認）；一轉前身供對照：黑兜帽銀邊、黑布面罩、紫圍巾、反手雙短刃

#### 設定圖

**貼這段**（588 字元）

```
If an image is attached, use it as the face and style reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Character design sheet of Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. 3 views in one row: front, side facing right, back; full body. Flat green #00FF00 background, no shadow, no text. No green on the character.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and every listed outfit feature; same chibi proportions in all three views.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_player_assassin_idle_x4.png + ref_player_assassin_slash_2_x4.png（一轉前身：線條與比例）；ref_player_idle_x4.png（主角的臉與風格）

#### 動作 1：idle + walk 1

**貼這段**（658 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) idle: relaxed stand, the throwing stars held low. B) walk 1: walking, right foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 2：walk 2 + walk 3

**貼這段**（653 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) walk 2: walking, legs together, passing pose. B) walk 3: walking, left foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 3：walk 4 + jump

**貼這段**（654 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) walk 4: walking, legs together, body slightly raised. B) jump: jump up, knees tucked. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 4：fall + hurt

**貼這段**（683 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) fall: falling, legs extended down, scarf tails flowing up. B) hurt: hurt, leaning back, eyes shut, arms flung out. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 5：crouch + dead

**貼這段**（674 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) crouch: crouched low, knees deeply bent. B) dead: lying flat on his back, eyes closed, weapon beside him. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 6：cast + dash

**貼這段**（693 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) cast: one open hand stretched forward to mark a target. B) dash: sprinting, leaning far forward, scarf tails streaming back. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 7：throw 1 + throw 2

**貼這段**（679 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) throw 1: wind-up to throw, arm cocked behind the head. B) throw 2: throw follow-through, arm extended forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 8：guard + slash 1

**貼這段**（691 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) guard: the throwing stars crossed in front of the chest, defensive. B) slash 1: wind-up, dagger pulled back, body twisted. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 9：slash 2 + slash 3

**貼這段**（665 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) slash 2: dagger slashing forward, leaning in. B) slash 3: heavy finishing slash, fully extended. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 10：backstab 1 + backstab 2

**貼這段**（692 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Draw 2 poses side by side, same size, wide gap: A) backstab 1: very low crouch, dagger close, eyes narrowed. B) backstab 2: long lunge, dagger thrust forward at chest height. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 頭像（選配）

**貼這段**（541 字元）

```
If an image is attached, use it as the exact character reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bust portrait, three-quarter view facing right, calm look. Night Lord (grown-up hero, spiky black hair, brown eyes): midnight-blue hooded cloak with faint stars, dark-blue cloth mask over the lower face, black-navy outfit with silver star buckles, long deep-purple scarf with two tails, clawed glove holding a fan of silver throwing stars, dagger on hip. Flat green #00FF00 background, no shadow, no text. Centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; bust portrait only.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：設定圖

---

### G-12c　二轉：盜賊王（重型近戰） Bandit King｜P2（外觀為提案）

- 最終檔名 `player_bandit_king_*.png`、`portrait_bandit_king.png`｜遊戲內尺寸 100x80（頭像 74x72）
- 建議：設定圖 1 張（約 16:9）；動作格每段**只產 2 格並排**（約 2:1 橫幅，每段 2～3 張挑最好的）；頭像約 296x288。全部綠底
- 共 12 段，順序：設定圖 → 動作 1～10 → 頭像（選配）。待機呼吸（idle 2）不用產；**所有動作格由我（AI）切開、對齊並組合成動畫**
- 外觀、武器與配色是**提案**（尚待確認）；一轉前身供對照：紅頭巾、鏽褐皮甲單肩甲、奶油毛領、紅腰帶、大彎刀

#### 設定圖

**貼這段**（570 字元）

```
If an image is attached, use it as the face and style reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Character design sheet of Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. 3 views in one row: front, side facing right, back; full body. Flat green #00FF00 background, no shadow, no text. No green on the character.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and every listed outfit feature; same chibi proportions in all three views.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_player_bandit_idle_x4.png + ref_player_bandit_slash_2_x4.png（一轉前身：線條與比例）；ref_player_idle_x4.png（主角的臉與風格）

#### 動作 1：idle + walk 1

**貼這段**（631 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) idle: relaxed stand, the sabre held low. B) walk 1: walking, right foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 2：walk 2 + walk 3

**貼這段**（635 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) walk 2: walking, legs together, passing pose. B) walk 3: walking, left foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 3：walk 4 + jump

**貼這段**（636 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) walk 4: walking, legs together, body slightly raised. B) jump: jump up, knees tucked. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 4：fall + hurt

**貼這段**（667 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) fall: falling, legs extended down, bandana tails flowing up. B) hurt: hurt, leaning back, eyes shut, arms flung out. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 5：crouch + dead

**貼這段**（656 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) crouch: crouched low, knees deeply bent. B) dead: lying flat on his back, eyes closed, weapon beside him. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 6：cast + dash

**貼這段**（677 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) cast: one open hand stretched forward to mark a target. B) dash: sprinting, leaning far forward, bandana tails streaming back. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 7：throw 1 + throw 2

**貼這段**（661 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) throw 1: wind-up to throw, arm cocked behind the head. B) throw 2: throw follow-through, arm extended forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 8：guard + slash 1

**貼這段**（661 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) guard: the sabre crossed in front of the chest, defensive. B) slash 1: wind-up, sabre raised high behind head. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 9：slash 2 + slash 3

**貼這段**（655 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) slash 2: big horizontal slash, body turning. B) slash 3: heavy upward finishing slash, leaping slightly. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 10：spin 1 + spin 2

**貼這段**（673 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Draw 2 poses side by side, same size, wide gap: A) spin 1: starting a spin, body twisted away, sabre swung wide. B) spin 2: mid-spin, sabre fully horizontal, tails whipping. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 頭像（選配）

**貼這段**（523 字元）

```
If an image is attached, use it as the exact character reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bust portrait, three-quarter view facing right, calm look. Bandit King (grown-up hero, spiky black hair, brown eyes): no hood, gold circlet over a red bandana with two tails, rust-brown coat with big cream fur collar, large metal plate on each shoulder, red sash with gold buckle, bandaged arms with gold bracers, one huge curved sabre. Flat green #00FF00 background, no shadow, no text. Centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; bust portrait only.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：設定圖

---

### G-12d　二轉：暗影遊俠（機動 / 混合） Shadow Ranger｜P2（外觀為提案）

- 最終檔名 `player_shadowranger_*.png`、`portrait_shadowranger.png`｜遊戲內尺寸 100x80（頭像 74x72）
- 建議：設定圖 1 張（約 16:9）；動作格每段**只產 2 格並排**（約 2:1 橫幅，每段 2～3 張挑最好的）；頭像約 296x288。全部綠底
- 共 12 段，順序：設定圖 → 動作 1～10 → 頭像（選配）。待機呼吸（idle 2）不用產；**所有動作格由我（AI）切開、對齊並組合成動畫**
- 外觀、武器與配色是**提案**（尚待確認）；一轉前身供對照：紅頭巾、鏽褐皮甲單肩甲、奶油毛領、紅腰帶、大彎刀

#### 設定圖

**貼這段**（574 字元）

```
If an image is attached, use it as the face and style reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Character design sheet of Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. 3 views in one row: front, side facing right, back; full body. Flat green #00FF00 background, no shadow, no text. No green on the character.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and every listed outfit feature; same chibi proportions in all three views.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_player_bandit_idle_x4.png + ref_player_bandit_slash_2_x4.png（一轉前身：線條與比例）；ref_player_idle_x4.png（主角的臉與風格）

#### 動作 1：idle + walk 1

**貼這段**（635 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) idle: relaxed stand, the sabre held low. B) walk 1: walking, right foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 2：walk 2 + walk 3

**貼這段**（639 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) walk 2: walking, legs together, passing pose. B) walk 3: walking, left foot forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 3：walk 4 + jump

**貼這段**（640 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) walk 4: walking, legs together, body slightly raised. B) jump: jump up, knees tucked. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 4：fall + hurt

**貼這段**（671 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) fall: falling, legs extended down, bandana tails flowing up. B) hurt: hurt, leaning back, eyes shut, arms flung out. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 5：crouch + dead

**貼這段**（660 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) crouch: crouched low, knees deeply bent. B) dead: lying flat on his back, eyes closed, weapon beside him. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 6：cast + dash

**貼這段**（681 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) cast: one open hand stretched forward to mark a target. B) dash: sprinting, leaning far forward, bandana tails streaming back. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 7：throw 1 + throw 2

**貼這段**（665 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) throw 1: wind-up to throw, arm cocked behind the head. B) throw 2: throw follow-through, arm extended forward. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 8：guard + slash 1

**貼這段**（665 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) guard: the sabre crossed in front of the chest, defensive. B) slash 1: wind-up, sabre raised high behind head. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 9：slash 2 + slash 3

**貼這段**（659 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) slash 2: big horizontal slash, body turning. B) slash 3: heavy upward finishing slash, leaping slightly. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 動作 10：spin 1 + spin 2

**貼這段**（677 字元）

```
If an image is attached, it is this exact character; only change the pose. 2D cartoon game art, MapleStory-style, clean outline, chibi. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Draw 2 poses side by side, same size, wide gap: A) spin 1: starting a spin, body twisted away, sabre swung wide. B) spin 2: mid-spin, sabre fully horizontal, tails whipping. Side view facing right, full body. Flat green #00FF00 background, no shadow, no text.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; only the pose changes. Poses must not touch each other.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：把設定圖通過的那張一起附上（最有效）

#### 頭像（選配）

**貼這段**（527 字元）

```
If an image is attached, use it as the exact character reference. 2D cartoon game art, MapleStory-style, clean outline, chibi. Bust portrait, three-quarter view facing right, calm look. Shadow Ranger (grown-up hero, spiky black hair, brown eyes): no hood, dark teal-grey half cape on one shoulder, charcoal leather vest, teal neck bandana with two tails, leather arm guards, belt of pouches and throwing knives, curved short sabre in hand, small crossbow on the back. Flat green #00FF00 background, no shadow, no text. Centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Keep the face and outfit exactly; bust portrait only.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：設定圖

---

### G-13　影之殿堂專屬傳送門（金色）｜P2（選配）

- 最終檔名 `portal_gold.png`｜遊戲內尺寸 64x96（每格）
- 建議：橫排 4 格 1024x384，純黑底，產 2～3 張。排不好就改單格，由我（AI）組成動畫

**貼這段**（631 字元）

```
2D cartoon game effect sprite sheet, MapleStory-style, bright glowing colors, no character, no text. Warm gold, soft white and pale amber light with a bright gold rim, tiny four-pointed star sparkles, a sacred moonlit feeling. Vertical oval magic portal, tall and narrow (2:3), swirling vortex with a bright rim and small sparkles rising along it, brightest at the centre; the swirl turns a quarter turn per frame. Exactly 4 identical-size frames in one row (8:3), same position and size, nothing touching the edges. Pure flat black #000000 background, no floor, no arch, no stone frame. If 4 frames are impossible, draw ONE frame.
```

**若失敗再貼**

```
Redo: glowing effect only on one flat pure black #000000 background; no character or scenery; nothing touches the edges.
If 4 frames are not possible, draw ONE single frame centred on pure black; I will build the animation myself.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：（選配）G-08 成品：加一句 same shape, recolored to gold

---

### G-14　夜渡（魔君真身）設定圖｜P1/P2（取決於劇情）

- 最終檔名 `npc_yedu.png`（暫名）
- 建議：3 視圖設定圖約 16:9，綠底，產 2～3 張

**貼這段**（656 字元）

```
If an image is attached, keep its silhouette (chibi body, crown, long cape, floating orbs); only change: his former self, no glow. 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Chibi, 2.5 heads tall. Yedu, a fallen guardian: dark charcoal armor with worn silver edges, TORN dark cape with faded gold rune threads, CRACKED GOLDEN crown, pale human face, short dark hair, TIRED KIND eyes with a faint gentle smile, one bare hand, a couple of floating dark orbs. No magenta or red glow. 3 views in one row: front, side facing right, back. Pure flat green #00FF00 background, no ground shadow, no text. No green on the character.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Make his eyes tired and kind, a faint gentle smile, no glow at all, no red, no menace.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_boss_idle.png（保留尖冠、披風、浮動黑球的辨識點）

---

### G-15　可調查石碑｜P1/P2（取決於劇情）

- 最終檔名 `prop_tablet.png`｜遊戲內尺寸約 48x64
- 建議：384x512（3:4）綠底，產 2～3 張

**貼這段**（471 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game prop: an ancient carved stone tablet standing upright, weathered grey-blue stone with dark cracks, a chipped rounded top, blue-grey moss at the base (NOT green), faint glowing gold-blue abstract rune shapes on its face (not readable text), flat bottom, slight three-quarter view. Pure flat green #00FF00 background, no ground shadow, no text. No green on the tablet. Portrait 3:4, centred.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Replace the writing with abstract rune-like scratches that form no readable letters.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：無（只靠文字即可）

---

### G-16　寶箱（關 / 開）｜P1/P2（取決於劇情）

- 最終檔名 `prop_chest_closed.png` / `prop_chest_open.png`｜遊戲內尺寸約 40x36
- 建議：約 1600x640（5:2）兩個並排，綠底，產 2～3 張。兩個箱子長得不同時，改成各產一張，由我（AI）整合

**貼這段**（480 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game prop: a small wooden treasure chest, warm brown planks, gold corner plates, bands and lock, rounded lid, slightly from above. Draw the SAME chest twice side by side, same size and baseline, wide gap: LEFT closed; RIGHT open with lid tilted back, warm golden light, sparkles and a few gold coins inside. Pure flat green #00FF00 background, no ground shadow, no text. No green on the chest. Wide 5:2.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Both chests must be the exact same design; only the lid state differs.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：無（只靠文字即可）

---

### G-17　夜渡之信道具圖示｜P1/P2（取決於劇情）

- 最終檔名 `item_night_letter.png`｜遊戲內尺寸 28x28
- 建議：112x112 正方形綠底，產 2～3 張

**貼這段**（433 字元）

```
2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game icon: ONE folded old letter, aged cream-yellow paper with slightly torn curled corners, a round silver wax seal stamped with a small four-pointed star, a thin faded dark-red ribbon, slightly tilted. Paper completely blank. Bold, readable at 28x28. Pure flat green #00FF00 background, no ground shadow, no text. No green on the letter. Centred, square.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
The paper must be completely blank: no writing, no lines of text.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_item_star_shard_x4.png（風格與大小感）

---

### G-18　結局插畫 x2（18a 重組星星 / 18b 釋放碎片）｜P2（取決於劇情）

- 最終檔名 `ending_1.webp` / `ending_2.webp`｜遊戲內尺寸 960x540
- 建議：各 1920x1080（16:9），不去背，分開產，產 2～3 張

#### G-18a 重組星星

**貼這段**（478 字元）

```
2D cartoon storybook illustration, MapleStory-style, clean dark outline, soft cel shading, 16:9, full-bleed. Dawn. A young thief boy (spiky black hair, navy hood pushed down on his shoulders, red scarf, brown leather armor), seen from behind, stands on a grassy hill looking up at a restored glowing golden four-pointed star in a pink and gold sky. Warm light, no shadow on the ground, a distant town and round stone tower, golden sparkles. Hopeful. Only one character. No text.
```

**若失敗再貼**

```
One full-bleed 16:9 illustration, no border, no panels, no text, not photorealistic.
Only one character: the boy, seen from behind.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_story_1.png（風格）；ref_title_hero.png（少年外觀）

#### G-18b 釋放碎片

**貼這段**（437 字元）

```
2D cartoon storybook illustration, MapleStory-style, clean dark outline, soft cel shading, 16:9, full-bleed. Dawn over a quiet continent seen from high above: forests, a winding river, mountains, a small town with a tall round stone tower, and thousands of small golden star shards drifting upward like fireflies, each with a faint glowing trail. Sky from deep blue to soft pink and gold. Bittersweet and hopeful. No characters. No text.
```

**若失敗再貼**

```
One full-bleed 16:9 illustration, no border, no panels, no text, not photorealistic.
Remove every character; only the landscape and golden shards.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_story_1.png（風格）

---

### G-19　星光之塔（未點亮版）｜P2（取決於劇情 / 選配）

- 最終檔名 `prop_star_tower_dark.png`｜遊戲內尺寸 185x420
- 建議：約 740x1680（11:25）綠底，產 2～3 張

**貼這段**（578 字元）

```
If an image is attached, keep the same tower exactly; only change: unlit, colder and dimmer, no star. 2D cartoon game art, MapleStory-style, clean dark outline, soft cel shading. Game prop: tall round beige-tan stone watchtower with mortar lines, crenellated top, dark olive ivy up the left and centre, two arched windows (now dark), arched brown wooden door with iron ring. On top an EMPTY dim star-shaped stone lantern cradle, NO golden star, no glow. Flat bottom. Pure flat green #00FF00 background, no ground shadow, no text. Ivy dark olive, clearly not #00FF00. Tall 11:25.
```

**若失敗再貼**

```
Redo: only the subject on one flat pure green #00FF00 background; no gradient, floor, scenery, glow or shadow.
Remove the golden star and every glow completely; the top is an empty, dark star-shaped cradle.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_prop_star_tower_x4.png（現有點亮版）

---

### G-20　稀有怪金色光環｜P2（取決於劇情）

- 最終檔名 `fx_rare_aura.png`｜遊戲內尺寸 96x96（每格）
- 建議：橫排 6 格 1152x192（6:1），純黑底，產 2～3 張。排不好就改單格，由我（AI）組成動畫

**貼這段**（470 字元）

```
2D cartoon game effect sprite sheet, MapleStory-style, bright glowing, no character, no text. A soft golden sparkle aura RING, hollow in the centre, warm gold glow with small four-pointed gold sparkles drifting upward; the ring gently pulses larger/brighter then smaller across frames so it loops. Exactly 6 identical-size frames in one row (6:1), same position, nothing touching the edges. Pure flat black #000000 background. If 6 frames are impossible, draw ONE frame.
```

**若失敗再貼**

```
Redo: glowing effect only on one flat pure black #000000 background; no character or scenery; nothing touches the edges.
If 6 frames are not possible, draw ONE single frame centred on pure black; I will build the animation myself.
```

**可附參考圖**（選配，檔案在 `docs/asset-requests/ref/`）：ref_fx_boss_aura.png（現有特效風格）

---

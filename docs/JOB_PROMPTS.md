# 轉職角色生成提示詞（刺客 / 俠盜）

> 目標：每個職業**只生成 4 次就完整**（1 張設定圖 + 3 張動作表），不用來回修。
> 切圖、去背、對齊、縮放、接進遊戲由我處理。你只需要照順序貼提示詞、附參考圖、挑最好的一張傳給我。
> 職業與技能的玩法設計見 [`ROADMAP.md`](ROADMAP.md)，其他素材見 [`ASSET_REQUEST.md`](ASSET_REQUEST.md)。

---

## 一、造型要不要變？— 設計原則

**要變，但保留「同一個人」的辨識點。** 轉職是玩家的大目標，換職業後外觀不變會沒有成就感；但整個人換掉又會像換角。所以分兩層：

| 層 | 內容 | 轉職後 |
|----|------|--------|
| **不變（辨識點）** | 臉、髮型（黑色短髮微亂）、褐色眼睛、2.5 頭身比例、線條粗細與上色風格、有一條飄動的圍巾 / 頭巾 | 全部職業一致 |
| **會變（職業外觀）** | 服裝、配色、頭部裝備、武器、體型微調 | 每職業不同 |
| **只在技能不同** | 特效（刀光、毒霧、煙幕…）| 由程式畫，**不畫進角色圖** |

> 原因：特效畫進角色圖會和動畫、冷卻不同步，也很難去背。角色圖只畫「人 + 武器」。

| | 盜賊（現有） | 刺客 | 俠盜 |
|---|---|---|---|
| 色調 | 深藍兜帽 + 紅圍巾 + 褐皮甲 | **黑 + 深紫** | **鏽褐 + 紅** |
| 頭部 | 深藍兜帽 | 黑色兜帽（銀邊）+ 下半臉面罩 | **不戴帽**，紅頭巾（兩條尾巴飄動） |
| 上身 | 褐色皮甲 | 貼身黑色勁裝，護腕鑲紫寶石 | 褐色皮甲 + 單邊肩甲、毛皮領 |
| 體型 | 標準 | 較纖細輕盈 | 較壯、肩略寬 |
| 武器 | 短刀 | **雙短刃**（反手握） | **單把大彎刀**（正手握） |
| 圍巾 | 紅 | 深紫 | 紅色腰帶（取代圍巾） |

---

## 二、技能組設計（職業之間要「按起來不一樣」）

共通技能池（盜賊現有）：Z 三連飛鏢、X 暗影步伐、C 暗殺、V 暗影漩渦、B 影分身。
轉職後**每職業 = 繼承 3 個 + 專屬 3 個 = 6 個**，欄位仍是 4 格（Phase 20 的「N 選 4」介面已可用）。

| | 刺客（單體爆發、遠近兼具） | 俠盜（近戰連擊、群怪） |
|---|---|---|
| 繼承 | Z 三連飛鏢、X 暗影步伐、C 暗殺 | X 暗影步伐、V 暗影漩渦、B 影分身 |
| 專屬 1 | **影襲**：瞬移到敵人背後連刺（突刺姿勢） | **迴旋斬**：原地旋轉斬周圍所有敵人（旋轉姿勢） |
| 專屬 2 | **毒飛鏢**：丟出毒鏢，持續傷害（丟擲姿勢，沿用） | **竊取**：命中有機率掉額外金幣（揮刀，沿用） |
| 專屬 3 | **致命標記**：標記敵人，下次攻擊必暴擊（施法姿勢，沿用） | **煙幕**：丟煙彈，範圍內敵人命中降低（丟擲姿勢，沿用） |
| 普通攻擊 | 雙刃兩連斬（揮刀 1-3 以雙刃表現） | 大彎刀大範圍橫斬，第 3 下擊飛 |

→ 所以**專屬動作只多 2 張**（刺客：突刺；俠盜：旋轉）。其餘技能沿用丟擲 / 施法 / 衝刺 / 揮刀姿勢，不用多畫。

---

## 三、通用規則（每次生成都要附在提示詞裡）

### 3.1 參考圖（每次都附，順序固定）

1. **風格參考**：`docs/asset_src/player_slash_2_x4.png`、`player_idle_x4.png`、`player_walk_1_x4.png`（現有主角，仿它的線條、上色、比例、頭身比）
2. **職業設定圖**（第 1 步產出後，之後每次都附同一張）

### 3.2 排版區塊（貼在每個「動作表」提示詞後面）

```
LAYOUT: one image, 2 rows x 4 columns grid, every pose in its own invisible cell, each character
fully inside its cell, at least 80 pixels of empty green space between neighbouring characters;
no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale
(the standing height is identical across the sheet; crouching and lying poses keep the same body size).
Upright poses stand on the same baseline within a row.
VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible.
BACKGROUND: perfectly flat solid pure green #00FF00, no gradient, no floor, no cast shadow, no vignette.
FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers,
grid lines, watermark, checkerboard. Draw ONLY the character and the held weapon.
OUTPUT: PNG, highest resolution available.
```

### 3.3 負面提示詞（有欄位就貼）

```
transparent checkerboard, ground shadow, motion blur, glow, particles, text, watermark, photorealistic,
3D render, different face, different hairstyle, oversized head, extra limbs, merged or touching characters
```

### 3.4 風格前綴（每個提示詞開頭都要有）

```
Use the attached STYLE REFERENCE images for art style only: hand-painted 2D game sprite,
chibi about 2.5 heads tall, thin dark outline, soft cel shading with 2-3 tones and light gradients,
light from upper-left, saturated but harmonious colours. The character's face, black short messy hair
and brown eyes must stay exactly the same as the reference hero.
```

---

## 四、刺客（assassin）

### 步驟 1：職業設定圖（只做 1 張，之後所有動作都附這張）

```
[3.4 風格前綴]
Character design sheet of the hero after his first job advancement, "Assassin".
Same boy as the reference (same face, black short messy hair, brown eyes) but older-looking and slimmer.
OUTFIT: black hood with thin silver trim, lower half of the face covered by a black cloth mask (eyes and
brow clearly visible), fitted all-black combat outfit with subtle dark-grey stitching, deep purple scarf with
two fluttering tails, leather wrist guards with small purple gems, dark belt with a few small pouches,
black boots with purple trim. WEAPON: two curved short blades held in reverse grip, steel with purple wraps.
PALETTE: near-black #1c1b26, deep purple #5b2a86, steel grey, small gold accents.
Show 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small
colour palette strip at the bottom. Same chibi proportions as the reference.
Background: flat solid green #00FF00. No text.
```

### 步驟 2：動作表 A（移動，8 張）

```
[3.4 風格前綴] Use the attached ASSASSIN DESIGN SHEET as the exact character (same outfit, mask, colours, blades).
Draw 8 poses, left to right, top row then bottom row:
1 idle: standing relaxed, blades held low and reversed, scarf tails resting.
2 idle 2: same as pose 1 but the whole body about 3% lower (breathing), scarf tails slightly different.
3 walk 1: right foot forward, contact pose.   4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.    6 walk 4: passing pose, legs together.
7 jump up: knees tucked, blades back, scarf flowing downward.
8 fall: legs extended downward, scarf flowing upward.
[3.2 排版區塊]
```

### 步驟 3：動作表 B（狀態與技能，8 張）

```
[3.4 風格前綴] Use the attached ASSASSIN DESIGN SHEET as the exact character.
Draw 8 poses:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, blades loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, blades ready.
3 dead: lying flat on the ground on his back, eyes closed, one blade dropped beside him.
4 cast: both hands forward with open fingers as if marking a target, scarf fluttering.
5 dash: body leaning far forward in a sprint, one arm back with a blade, scarf streaming straight back.
6 throw 1: winding up to throw a shuriken, arm cocked behind the head, holding a blade in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: both blades crossed in front of the chest in a defensive stance.
[3.2 排版區塊]
```

### 步驟 4：動作表 C（近戰 + 專屬，5 張）

```
[3.4 風格前綴] Use the attached ASSASSIN DESIGN SHEET as the exact character.
Draw 5 poses (grid 3 on the top row, 2 on the bottom row):
1 slash 1: wind-up, both blades pulled back, body twisted, weight on the back foot.
2 slash 2: right blade slashing forward, body leaning in, left blade held back.
3 slash 3: left blade slashing forward, follow-through, body fully extended.
4 backstab 1: very low crouch, both blades pulled in close, eyes narrowed (about to strike).
5 backstab 2: lunging forward with both blades thrust straight ahead at chest height, long forward stride.
[3.2 排版區塊]
```

---

## 五、俠盜（bandit）

### 步驟 1：職業設定圖

```
[3.4 風格前綴]
Character design sheet of the hero after his first job advancement, "Bandit".
Same boy as the reference (same face, black short messy hair, brown eyes) but sturdier with slightly wider
shoulders. NO hood: head uncovered, hair visible, a red bandana tied around the forehead with two long
fluttering tails. OUTFIT: rust-brown leather armour with a single metal shoulder plate on the left shoulder,
cream fur collar, bare forearms wrapped in bandages, dark trousers, wide red cloth sash around the waist
(instead of the scarf), brown boots with metal toe caps. WEAPON: one large curved dagger / short sabre held
forward-grip, steel blade, red-wrapped handle.
PALETTE: rust brown #6b3d22, red #b3262a, cream #e8dcc0, steel grey.
Show 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small
colour palette strip at the bottom. Same chibi proportions as the reference.
Background: flat solid green #00FF00. No text.
```

### 步驟 2：動作表 A（移動，8 張）

```
[3.4 風格前綴] Use the attached BANDIT DESIGN SHEET as the exact character (same outfit, bandana, colours, sabre).
Draw 8 poses, left to right, top row then bottom row:
1 idle: standing with a confident wide stance, sabre held low in the right hand, bandana tails resting.
2 idle 2: same as pose 1 but the whole body about 3% lower (breathing), bandana tails slightly different.
3 walk 1: right foot forward, contact pose.   4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.    6 walk 4: passing pose, legs together.
7 jump up: knees tucked, sabre held back, bandana tails flowing downward.
8 fall: legs extended downward, bandana tails flowing upward.
[3.2 排版區塊]
```

### 步驟 3：動作表 B（狀態與技能，8 張）

```
[3.4 風格前綴] Use the attached BANDIT DESIGN SHEET as the exact character.
Draw 8 poses:
1 hurt: leaning backward, eyes squeezed shut, teeth clenched, arms flung out, sabre loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, sabre ready.
3 dead: lying flat on the ground on his back, eyes closed, sabre dropped beside him.
4 cast: free hand stretched forward, palm open, as if grabbing something, sabre held back.
5 dash: body leaning far forward in a sprint, sabre pulled back for a charge, bandana tails streaming back.
6 throw 1: winding up to throw a small bomb, arm cocked behind the head, sabre in the other hand.
7 throw 2: arm fully extended forward after throwing, body leaning forward.
8 guard: sabre held across the chest with both hands in a defensive stance.
[3.2 排版區塊]
```

### 步驟 4：動作表 C（近戰 + 專屬，5 張）

```
[3.4 風格前綴] Use the attached BANDIT DESIGN SHEET as the exact character.
Draw 5 poses (grid 3 on the top row, 2 on the bottom row):
1 slash 1: wind-up, sabre raised high behind the head, weight on the back foot.
2 slash 2: big horizontal slash forward, body turning with the swing.
3 slash 3: heavy upward finishing slash, body leaping slightly off the ground.
4 spin 1: starting a spin, body twisted away from the viewer, sabre swung out wide to the side.
5 spin 2: mid-spin, body turned sideways, sabre extended fully horizontal, bandana tails whipping around.
[3.2 排版區塊]
```

---

## 六、特效與技能圖示（可後做，用黑底而不是綠底）

特效是亮色的，**用純黑底（不是綠底）**，我在遊戲裡用「加亮疊色」混合，不需要去背，也不會有綠邊。

### 6.1 特效動畫表（每個一張，橫排）

```
Game visual effect sprite sheet, painterly style, bright glowing colours on a pure black
#000000 background, NO character, effect only, frames in one horizontal row, evenly spaced, same size,
no text. Effect: [下表的描述]
```

| 檔名（我之後命名） | 影格 | 描述（貼在 `Effect:` 後） |
|---|---|---|
| `fx_slash_assassin` | 4 | crescent slash arc in violet-white, thin to thick then fading, facing right |
| `fx_slash_bandit` | 4 | wide heavy slash arc in orange-red with white core, facing right |
| `fx_backstab` | 5 | X-shaped double slash flash in violet and white that bursts then fades |
| `fx_poison` | 5 | green-purple poison cloud with small droplets, expanding then dissipating |
| `fx_mark` | 4 | glowing red-gold crosshair sigil that pulses and tightens |
| `fx_whirl` | 6 | circular blade ring spinning in orange-white, motion trails, expanding |
| `fx_smoke` | 5 | grey-white smoke puff rolling outward, soft edges, then thinning |

### 6.2 技能圖示（38×38，圓角深紫寶石底，置中圖案）

```
Game skill icon, hand-painted cartoon style, rounded-square dark purple gem frame, single centred symbol,
thin dark outline, no text. Symbol: [描述]. Background: flat solid green #00FF00 outside the frame.
```

| 圖示 | 描述 |
|---|---|
| `skill_icon_shadowstrike` 影襲 | two crossed daggers with a violet afterimage streak |
| `skill_icon_poison` 毒飛鏢 | a shuriken dripping green poison |
| `skill_icon_mark` 致命標記 | red crosshair over a small skull |
| `skill_icon_whirl` 迴旋斬 | a circular orange blade spin |
| `skill_icon_steal` 竊取 | a gold coin with a small hand grabbing it |
| `skill_icon_smoke` 煙幕 | a round grey smoke bomb with a puff of smoke |

---

## 七、交付與我這邊的處理

- 每個職業 4 張圖（設定圖 + A/B/C 三張動作表），特效與圖示另外。
- **每張多生成 2～4 個版本**，傳給我時附上你認為最好的那張就行。我會檢查：臉角度、大小一致、有沒有多餘特效、肢體有沒有黏在一起。
- 我會做的事：去背（綠底）、依姿勢切開、統一縮放（刺客用兜帽、俠盜無帽所以改用待機身高為基準）、腳底對齊、輸出 100×80 與 x4 原圖、接進遊戲並實測。
- 命名：`player_assassin_idle` / `player_bandit_walk_1` …（與盜賊同樣的動作名稱 + 職業前綴）。
- 提醒：交付的圖片請用 **PNG**，不要 JPG（JPG 的綠底邊緣有雜訊）。

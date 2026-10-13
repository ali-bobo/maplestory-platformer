# 可直接複製的提示詞（Gemini 免費版專用）

> 對應缺口總表：[`../ASSET_GAPS.md`](../ASSET_GAPS.md)。使用步驟在 [`README.md`](README.md)。
> **每個區塊都是獨立、完整、自足的**：直接複製區塊裡的程式碼區塊到**全新對話**就能用，不依賴前一段、不依賴前導、不依賴上傳的圖。
> 參考圖是**選配加強**：支援上傳就附（檔案在 [`ref/`](ref/)），不支援就只用文字。

## 區塊索引

- G-01　Boss 狂暴姿勢 x3（待機 / 移動 / 攻擊）｜P0
- G-02　Boss 狂暴背景（不含角色）｜P0
- G-03　劇情插畫 2：魔君擊碎星星｜P0
- G-04　劇情插畫 4：戴兜帽少年接下最後一塊碎片｜P0
- G-05　標題徽章｜P1
- G-06　刺客普通攻擊圖示（需調整現有檔）｜P1
- G-07　俠盜普通攻擊圖示（需調整現有檔）｜P1
- G-08　傳送門（藍紫通用）4 格動畫｜P1
- G-09　金幣圖示｜P1
- G-10a　補給商 NPC：行商阿福｜P2
- G-10b　補給商 NPC：船具商阿海｜P2
- G-10c　補給商 NPC：遺跡商販老莫｜P2
- G-11　影子史萊姆（Boss 房小怪）｜P2
- G-12a　二轉：影殺者（單體爆發） Shadowkiller｜P2（外觀為提案）
- G-12b　二轉：暗夜使者（飛鏢 / 遠程） Night Lord｜P2（外觀為提案）
- G-12c　二轉：盜賊王（重型近戰） Bandit King｜P2（外觀為提案）
- G-12d　二轉：暗影遊俠（機動 / 混合） Shadow Ranger｜P2（外觀為提案）
- G-13　影之殿堂專屬傳送門（金色）｜P2（選配）
- G-14　夜渡（魔君真身）設定圖｜P1/P2（取決於劇情）
- G-15　可調查石碑｜P1/P2（取決於劇情）
- G-16　寶箱（關 / 開）｜P1/P2（取決於劇情）
- G-17　夜渡之信道具圖示｜P1/P2（取決於劇情）
- G-18　結局插畫 x2（18a 重組星星 / 18b 釋放碎片）｜P2（取決於劇情）
- G-19　星光之塔（未點亮版）｜P2（取決於劇情 / 選配）
- G-20　稀有怪金色光環｜P2（取決於劇情）

---

## 通用前導（風格＋規則）

先把下面整段貼進新的 Gemini 對話，再貼各區塊的提示詞。**不貼也沒關係**：每個區塊都已把這些規則完整重述一遍，可以單獨貼。

```
You will generate game art for a 2D platformer called "Thief Legend". Follow these rules for every image I ask for in this conversation.

OVERALL ART STYLE: 2D hand-painted cartoon in the style of MapleStory (Nexon). Chibi characters about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp highlights, saturated but harmonious colours. Light from the upper-left, shadows slightly cooler to the lower-right. No realistic textures, no 3D-render look, no painterly blur. Characters, monsters and NPCs are drawn in side view, full body, facing RIGHT.

CHROMA-KEY RULE (characters, monsters, NPCs, props, icons): the background is ONE perfectly flat uniform pure green #00FF00, no gradient, no floor, no scenery, no cast shadow, no glow spilling onto the green; never use green on the subject.
EFFECT RULE (effects, portals): the background is ONE perfectly flat pure black #000000, glowing bright effect only, no character.
SCENE RULE (backgrounds, story illustrations): full-bleed 16:9 image, no green background, no border, no frame, no panels.
ALWAYS: no text, letters, numbers, signature or watermark in the image.

RECURRING CHARACTERS
- The hero (young thief boy): short messy spiky black hair, large round warm-brown eyes, calm slightly serious face; dark navy-blue (#1f2547) pointed hood with thin gold trim, bright red (#b3262a) scarf with a long fluttering tail, brown leather chest armour (#6b4328) with straps and belt, brown fingerless gloves and bracers, black trousers, brown boots, short steel dagger.
- The Dark Lord (final boss): smooth hairless grey-violet (#6b5b8a) head with no mouth or nose and two narrow slanted glowing magenta (#ff3df0) eyes; tall spiked black crown with a magenta diamond at the front; slim dark-violet (#3b2a55) bodysuit; spiked dark-grey shoulder armour and clawed gauntlets with magenta runes; long ragged dark-purple (#4a2a6e) cape covered with glowing magenta runes; floating black-violet orbs around him.
- The star shard: a faceted, glossy golden (#f5d142) four-pointed star or a broken irregular piece of it, with small sparkles.

If I attach reference images, match them. Otherwise rely on the written descriptions. Reply "OK" and wait for my next message.
```

**通用提醒（使用者）**
- 免費版 Gemini 通常**不保證像素尺寸**，也**不會產出真透明背景**，所以才用綠底（#00FF00）與黑底。尺寸對不上沒關係，**比例對**即可（提示詞裡有寫比例）；我會縮放、裁切與去背。
- 一個提示詞**多產 2～4 個版本**，挑最好的一張。
- 每個區塊都能**開新對話單獨貼**。想要更穩定時，「可選加強」是把前一張成品一起上傳。
- 角色圖請存成 **PNG**（綠底圖不要 JPG）。

---

## G-01　Boss 狂暴姿勢 x3（待機 / 移動 / 攻擊）｜P0

- **最終檔名**：`boss_rage_idle.png / boss_rage_move.png / boss_rage_attack.png`　**遊戲內尺寸**：460x220
- **輸出規格／建議張數**：各 1380x660（比例 2.1:1），綠底；三張各產一次，不要拼圖；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_boss_idle.png`（待機原圖）；`ref_boss_move.png`（移動原圖）；`ref_boss_attack.png`（攻擊原圖）；若工具把透明處顯示成黑或白：改附同名 `_green_x3.png`
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相（供你確認文字描述）**：暗影魔君，Q 版約 2.5 頭身；灰紫色光滑無毛的頭，沒有嘴鼻，只有兩隻細長斜吊的洋紅色發光眼；黑色高尖王冠，額前中央有一顆洋紅菱形寶石；深紫色緊身衣；帶尖刺的深灰肩甲與利爪護手，上面有洋紅符文；長而破碎的深紫色披風，邊緣像火焰、披風上有發光洋紅符文；周圍飄著數顆黑紫色圓球。三個原圖姿勢：**待機** = 雙臂交叉於胸前、站立、披風垂下；**移動** = 身體前傾斜衝（像飛行），一隻利爪向前伸、披風往後方（左側）甩得很長；**攻擊** = 站穩、右臂完全前伸（向右），手前方射出一顆巨大的黑紫色火焰能量球（洋紅核心），左臂後收。

**要改什麼**：只改「色與氣場」成狂暴第三階段：眼睛與符文變**紅色**、身上出現紫色火焰與裂紋、披風邊緣燃燒、黑球裹紫焰、體態略前傾。姿勢、輪廓、畫布比例不變。**絕對不要畫王座房、地面或任何背景**（上次失敗原因）。

**多步驟 / 一致性**：三個姿勢各自完整自足（每段都重述了魔君全部外觀與狂暴規則）。**可選加強**：待機圖通過後，產移動 / 攻擊時把剛通過的狂暴待機圖一起上傳，並在提示詞最前面加一句 `The attached rage idle image shows the exact same character; keep his face, crown, colours and rage effects identical.`（沒有圖就不要加這句）。

**G-01a 待機**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the subject faces RIGHT, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
SUBJECT: THE DARK LORD (the game's final boss, chibi, about 2.5 heads tall): a smooth hairless head of muted grey-violet skin (about #6b5b8a) with NO mouth and NO nose, only two narrow slanted glowing magenta (about #ff3df0) eyes; a tall spiked black crown (near-black #1d1a26 with grey edge highlights) with several pointed spikes, one taller spike in the middle, and a small magenta diamond gem at the centre front; a slim dark-violet (about #3b2a55) bodysuit with subtle wavy fold lines; spiked dark-grey armoured shoulder pads and clawed dark-grey gauntlets with small glowing magenta rune marks; a long dark-purple (about #4a2a6e) cape with a violet lining, ragged flame-like tips along its edges, covered with glowing magenta rune symbols; several floating dark orbs (black-violet spheres with a soft purple rim, in different sizes) hovering around him; dark violet pointed feet.
POSE (IDLE): standing upright facing right-front, both arms crossed over the chest with the clawed gauntlets visible, legs slightly apart, the cape hanging down on both sides with its runes visible, orbs floating around him (two on the left, one on the right of the head, one near the lower right), body leaning very slightly forward
RAGE FORM changes (third boss phase): the eyes glow RED (about #ff2020) instead of magenta; every rune on the cape, shoulders and gauntlets glows RED instead of magenta; glowing cracks of violet fire run along the armour, bodysuit and cape edges; small purple flames lick upward from the shoulders, the crown and the cape tips; every floating orb is wrapped in a ring of purple flame; the body leans very slightly more forward with a more menacing posture. Colours stay dark violet and black overall; the red and the violet flames are the accents.
CANVAS: a very wide landscape image, aspect ratio about 2.1:1 (460:220). The character is centred and occupies about 85 percent of the height, with generous empty flat green on both sides, feet near the bottom edge.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. No throne room, no scenery, no floor.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, throne room, different character, different pose
OUTPUT: PNG, 1380x660 if possible (aspect 2.1:1), highest quality. Make 3 to 4 variants if possible.
```

**G-01b 移動**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the subject faces RIGHT, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
SUBJECT: THE DARK LORD (the game's final boss, chibi, about 2.5 heads tall): a smooth hairless head of muted grey-violet skin (about #6b5b8a) with NO mouth and NO nose, only two narrow slanted glowing magenta (about #ff3df0) eyes; a tall spiked black crown (near-black #1d1a26 with grey edge highlights) with several pointed spikes, one taller spike in the middle, and a small magenta diamond gem at the centre front; a slim dark-violet (about #3b2a55) bodysuit with subtle wavy fold lines; spiked dark-grey armoured shoulder pads and clawed dark-grey gauntlets with small glowing magenta rune marks; a long dark-purple (about #4a2a6e) cape with a violet lining, ragged flame-like tips along its edges, covered with glowing magenta rune symbols; several floating dark orbs (black-violet spheres with a soft purple rim, in different sizes) hovering around him; dark violet pointed feet.
POSE (MOVE): a fast diagonal dash like flying: the body leans far forward to the right, one clawed hand reaches forward and the other arm is bent back, one leg stretched back and the other bent, the long cape streams far behind him to the left showing its runes, orbs trail behind and around him, head turned forward with glaring red eyes
RAGE FORM changes (third boss phase): the eyes glow RED (about #ff2020) instead of magenta; every rune on the cape, shoulders and gauntlets glows RED instead of magenta; glowing cracks of violet fire run along the armour, bodysuit and cape edges; small purple flames lick upward from the shoulders, the crown and the cape tips; every floating orb is wrapped in a ring of purple flame; the body leans very slightly more forward with a more menacing posture. Colours stay dark violet and black overall; the red and the violet flames are the accents.
CANVAS: a very wide landscape image, aspect ratio about 2.1:1 (460:220). The character is centred and occupies about 85 percent of the height, with generous empty flat green on both sides, feet near the bottom edge.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. No throne room, no scenery, no floor.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, throne room, different character, different pose
OUTPUT: PNG, 1380x660 if possible (aspect 2.1:1), highest quality. Make 3 to 4 variants if possible.
```

**G-01c 攻擊**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the subject faces RIGHT, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
SUBJECT: THE DARK LORD (the game's final boss, chibi, about 2.5 heads tall): a smooth hairless head of muted grey-violet skin (about #6b5b8a) with NO mouth and NO nose, only two narrow slanted glowing magenta (about #ff3df0) eyes; a tall spiked black crown (near-black #1d1a26 with grey edge highlights) with several pointed spikes, one taller spike in the middle, and a small magenta diamond gem at the centre front; a slim dark-violet (about #3b2a55) bodysuit with subtle wavy fold lines; spiked dark-grey armoured shoulder pads and clawed dark-grey gauntlets with small glowing magenta rune marks; a long dark-purple (about #4a2a6e) cape with a violet lining, ragged flame-like tips along its edges, covered with glowing magenta rune symbols; several floating dark orbs (black-violet spheres with a soft purple rim, in different sizes) hovering around him; dark violet pointed feet.
POSE (ATTACK): standing in a wide low stance facing right, the right arm fully extended forward to the right with the claws open, launching a huge swirling ball of black-violet flame with a glowing core (the core and flame edges are red-violet in rage form) just in front of the hand at the far right of the image, with a flame tail trailing back to the hand; the left arm drawn back; a few small black dots and two dark orbs scattered behind him; the cape hangs back with its runes visible
RAGE FORM changes (third boss phase): the eyes glow RED (about #ff2020) instead of magenta; every rune on the cape, shoulders and gauntlets glows RED instead of magenta; glowing cracks of violet fire run along the armour, bodysuit and cape edges; small purple flames lick upward from the shoulders, the crown and the cape tips; every floating orb is wrapped in a ring of purple flame; the body leans very slightly more forward with a more menacing posture. Colours stay dark violet and black overall; the red and the violet flames are the accents.
CANVAS: a very wide landscape image, aspect ratio about 2.1:1 (460:220). The character is centred and occupies about 85 percent of the height, with generous empty flat green on both sides, feet near the bottom edge.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. No throne room, no scenery, no floor.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, throne room, different character, different pose
OUTPUT: PNG, 1380x660 if possible (aspect 2.1:1), highest quality. Make 3 to 4 variants if possible.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 姿勢和原圖差太多 | `Keep the pose exactly as described: do not change the arm positions or the direction of the cast; only the colours and flames change.` |

---

## G-02　Boss 狂暴背景（不含角色）｜P0

- **最終檔名**：`bg_boss_room_rage.webp`　**遊戲內尺寸**：1376x768
- **輸出規格／建議張數**：1376x768 或 2752x1536，不去背；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_bg_boss_room.png`（構圖與風格；沒圖時靠文字也可）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：深紫藍色哥德式王座房。左右兩側大石拱門與粗柱，中右有高大黑色石王座（尖背、兩側各一支向上的角）放在三階石台上；上方空中飄著數個發光的紫色魔法陣（圓環內有六芒星）；三座細長金屬燭台（網格狀的腳）燃著粉紫色火焰（王座左、右、最右側各一）；左上有金黃色與暗紅色破舊掛旗；遠景有高拱窗和柱影；地面是深色光滑石板，帶紫色裂紋反光，下緣平坦。

**要改什麼**：同一個房間、同構圖，變成狂暴狀態：更暗、紅紫光、魔法陣不穩定裂開、火焰紫紅且更高、地面紅色裂縫、飄紅紫火星。**不要有任何角色**。

**G-02 狂暴王座房背景**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): wide 2D side-scrolling game background in a MapleStory-like painterly cartoon style: thin dark outlines on large shapes, soft cel shading with 2 to 3 tone steps, atmospheric depth with three layers (far, middle, near), saturated but harmonious colours. The lower 20% of the image is a calm, plain floor area where game platforms will be placed. Horizontally balanced composition, 16:9 landscape (aspect 1376:768). No characters, no creatures, no text, no letters, no UI, no border, no watermark.
SCENE (RAGE STATE of the final boss throne room, a dark gothic hall with NO characters): wide hall seen straight on. Large dark stone arches with chunky pillars frame the far left and far right edges of the image. At the centre-right stands a tall dark stone throne with a pointed back and two upward horn-like spikes on its sides, sitting on a three-step stone dais; the throne is EMPTY. Several large glowing magic circles (rings with a six-pointed star inside) of different sizes float in the air in the upper centre and upper right of the hall. Three tall slim metal brazier stands with lattice legs hold burning flames: one just left of the throne, one just right of it, one near the far right edge. Tattered hanging banners (faded gold on the top-left, dark red on the left-centre) hang from the ceiling on the left. In the hazy far background are tall arched windows and faint stone columns. The floor is dark polished stone with thin cracks and faint reflections.
RAGE-STATE COLOUR AND MOOD (compared with the calm version, whose light is soft violet-blue): the whole image is darker and heavier; the ambient light is deep crimson and purple instead of soft violet; the magic circles glow red-violet and look unstable and cracked; the brazier flames turn violet-red and flare higher; glowing red cracks run across the floor and up the dais steps; red-violet embers drift in the air; the far windows are dimmed almost to black; a faint red mist lies along the floor. The lower 20 percent of the image stays a calm, plain dark floor.
Absolutely NO characters, NO monsters, NO figure sitting on the throne, no text, no UI, no watermark.
NEGATIVE (avoid): photorealistic, 3D render, text, captions, letters, watermark, signature, frame, border, multiple panels, comic panels, blurry, gore, blood, characters, people, monsters, boss, bright daylight, different room
OUTPUT: PNG or WebP, 16:9 landscape (1376x768, or 2752x1536 if possible), RGB, no transparency. Make 2 to 3 variants if possible.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 出現文字、字幕、邊框、漫畫分格 | `Remove all text, captions, borders and panel divisions. One single full-bleed illustration with no frame.` |
| 風格變寫實或 3D | `Redraw as a hand-painted 2D cartoon storybook illustration with thin dark outlines and soft cel shading, not photorealistic and not 3D-rendered.` |
| 比例不是 16:9 | `Make it a wide 16:9 landscape image filling the whole frame, with no letterbox bars.` |
| 多出不該有的角色 | `Remove every extra character and creature; only the characters named in the description may appear.` |
| 王座上有人或有怪物 | `Remove every character and creature. The throne must be completely empty and the hall must contain no living thing.` |
| 房間構圖整個變了 | `Keep the same composition: throne at the centre-right on a three-step dais, arches at both edges, three braziers, magic circles in the upper centre; only the colours, flames and cracks change.` |

---

## G-03　劇情插畫 2：魔君擊碎星星｜P0

- **最終檔名**：`story_2.webp`　**遊戲內尺寸**：960x540
- **輸出規格／建議張數**：1920x1080，不去背；與 G-04 分開輸出；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_story_1.png`（風格：黃昏紫橘天空、金色四芒星與石塔）；`ref_story_3.png`（風格：夜晚冷色、被怪物襲擊的小鎮）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**風格原圖長相**：story_1 = 黃昏漸層天空（上紫下橘），一顆發光的金色四芒星（切面感、黃金色）飄在灰色石塔上方，下面是小鎮屋頂與遠山；story_3 = 深藍夜色，小鎮街道，怪物趴在屋頂，居民驚恐奔逃，遠處小山上有一顆小金星。兩者都是細深色輪廓、柔和賽璐珞上色的繪本卡通風，**不是**寫實。

**多步驟 / 一致性**：此段完全自足。**可選加強**：若 Gemini 能上傳圖，把 ref_story_1.png 一起附上，風格會更接近。G-03 與 G-04 是兩次獨立生成，文字裡各自重述了星星與夜空的配色（金色四芒星、深藍紫夜空）以保持連貫。

**G-03 魔君擊碎星星**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon storybook illustration in the style of MapleStory (Nexon) key art: thin, clean, uniform-weight dark outline, soft cel shading with only 2 to 3 tone steps, saturated but harmonious colours, softly painted skies allowed, one clear consistent light source, no photorealism, no 3D-render look, no heavy blur. Wide 16:9 landscape, full-bleed illustration filling the entire image: no border, no frame, no letterbox bars, no comic panels, no captions, no text, no letters, no watermark, no signature.
STORY ILLUSTRATION: one single scene. A tall dark lord (the villain of the story, but shown in grief): a tall figure wearing a black-purple hood and a long torn black-and-purple cape, with a small spiked black crown sitting on the hood, pale grey-violet skin, standing at the top of a ruined stone staircase under a moonless night sky. He holds a large glowing golden four-pointed star (faceted, bright yellow-gold with a white-hot core) between both hands in front of his chest; the star is cracking and breaking apart, bright golden shards and rays of light flying outward in all directions into the dark sky. His face is half in shadow under the hood and shows PAIN and SORROW, not triumph and not evil laughter: eyes shut or downcast, clenched teeth, a tear of light running down one cheek. Warm golden light from the star lights his hands and chin; everything else is cold dark blue and violet. Small dark clouds, a few broken stone pillars, distant mountain silhouettes. COMPOSITION: the lord on the left third of the image, the breaking star in the upper centre, the shards streaming to the right so the eye travels right. Only this one character appears.
NEGATIVE (avoid): photorealistic, 3D render, text, captions, letters, watermark, signature, frame, border, multiple panels, comic panels, blurry, gore, blood, smiling villain, triumphant pose, evil laugh, extra characters
OUTPUT: 16:9 landscape (1920x1080 if possible), RGB, no transparency. Make 3 to 4 variants if possible.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 出現文字、字幕、邊框、漫畫分格 | `Remove all text, captions, borders and panel divisions. One single full-bleed illustration with no frame.` |
| 風格變寫實或 3D | `Redraw as a hand-painted 2D cartoon storybook illustration with thin dark outlines and soft cel shading, not photorealistic and not 3D-rendered.` |
| 比例不是 16:9 | `Make it a wide 16:9 landscape image filling the whole frame, with no letterbox bars.` |
| 多出不該有的角色 | `Remove every extra character and creature; only the characters named in the description may appear.` |
| 魔君看起來得意或邪惡 | `Change his expression to deep sorrow and pain: eyes closed or downcast, a tear of light on his cheek, no smile and no triumphant pose.` |

---

## G-04　劇情插畫 4：戴兜帽少年接下最後一塊碎片｜P0

- **最終檔名**：`story_4.webp`　**遊戲內尺寸**：960x540
- **輸出規格／建議張數**：1920x1080，不去背；與 G-03 分開輸出；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_story_1.png` / `ref_story_3.png`（風格）；`ref_title_hero.png`（少年外觀：黑短髮、褐眼、深藍兜帽、紅圍巾）；`ref_item_star_shard_x4.png`（碎片外觀：切面金色星形）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：ref_title_hero = 戴深藍兜帽（金邊）、紅圍巾、棕皮甲的少年，黑色亂短髮、褐色大眼、表情堅定，正在丟十字飛鏢。ref_item_star_shard = 圓潤的金色切面星形，帶小閃光。老人長老沒有現成參考圖（見下方提示詞文字，為提案設計）。

**多步驟 / 一致性**：此段完全自足（已用文字特徵清單描述少年、長老、碎片與配色）。**可選加強**：產出後，請把 G-03 成品與 ref_title_hero.png 一起上傳再重生一次，少年的臉會更穩。

**G-04 少年接碎片**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon storybook illustration in the style of MapleStory (Nexon) key art: thin, clean, uniform-weight dark outline, soft cel shading with only 2 to 3 tone steps, saturated but harmonious colours, softly painted skies allowed, one clear consistent light source, no photorealism, no 3D-render look, no heavy blur. Wide 16:9 landscape, full-bleed illustration filling the entire image: no border, no frame, no letterbox bars, no comic panels, no captions, no text, no letters, no watermark, no signature.
CHARACTER 1 - THE BOY (the hero): a small chibi-like young thief boy, short messy spiky black hair, large round warm-brown eyes, calm and determined expression; he wears a dark navy-blue (about #1f2547) hood with thin gold trim, the hood up, a bright red (#b3262a) scarf, brown leather armour. He is seen from the side or three-quarters, facing right.
CHARACTER 2 - THE ELDER: an old man in a long soft robe (muted indigo-grey, with a pale sash), a long white beard and white eyebrows, a gentle, solemn, slightly sad face, kind eyes, a bald or thinly white-haired head.
THE SHARD: a glowing, irregular golden piece of a broken four-pointed star (faceted, bright yellow-gold with a white-hot core and a few small sparkles), about the size of a hand.
STORY ILLUSTRATION: one single scene. Night at the edge of a quiet town. The elder holds out the last glowing golden star shard in both hands; the boy reaches out with one open hand to receive it. The shard glows warm gold and lights both faces and hands; everything else is dark blue and violet. Behind them is a dark, quiet town with a few lit windows and, on a hill, the silhouette of a round stone watchtower. COMPOSITION: the two figures in the lower centre, the shard at the exact centre of the image as the brightest point, a few specks of golden light drifting up into the night sky to the right. Only these two characters appear.
NEGATIVE (avoid): photorealistic, 3D render, text, captions, letters, watermark, signature, frame, border, multiple panels, comic panels, blurry, gore, blood, extra people, crowd, monsters, different face, blonde hair
OUTPUT: 16:9 landscape (1920x1080 if possible), RGB, no transparency. Make 3 to 4 variants if possible.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 出現文字、字幕、邊框、漫畫分格 | `Remove all text, captions, borders and panel divisions. One single full-bleed illustration with no frame.` |
| 風格變寫實或 3D | `Redraw as a hand-painted 2D cartoon storybook illustration with thin dark outlines and soft cel shading, not photorealistic and not 3D-rendered.` |
| 比例不是 16:9 | `Make it a wide 16:9 landscape image filling the whole frame, with no letterbox bars.` |
| 多出不該有的角色 | `Remove every extra character and creature; only the characters named in the description may appear.` |
| 少年長相跑掉（髮色、兜帽） | `The boy must have short messy spiky BLACK hair, brown eyes, a dark navy-blue hood with gold trim and a red scarf. Keep those exactly.` |
| 出現第三個人 | `Remove every extra person. Exactly two characters: the boy and the elder.` |

---

## G-05　標題徽章｜P1

- **最終檔名**：`ui_title_badge.png`　**遊戲內尺寸**：約 320x200
- **輸出規格／建議張數**：1280x800，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_title_hero.png`（配色與線條參考，不是要畫進去）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。風格參考 ref_title_hero：粗細一致的深色細輪廓、柔和賽璐珞、飽和色。緞帶必須空白，標題文字由遊戲繪製。

**G-05 標題徽章**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game icon in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp white highlights, saturated but harmonious colours, light from the upper-left. Bold simple shape with high contrast so it stays readable when shrunk to a tiny size. No realistic textures, no 3D-render look, no blur. Single emblem, centred, symmetrical, with a small margin around it.
SUBJECT: a game title emblem, symmetrical and compact. In the centre a large golden four-pointed star (faceted, bright yellow-gold #f5d142 with lighter facets and a soft inner glow). Behind it two crossed daggers forming an X, blades pointing up and outward (steel silver-grey blades, dark red-wrapped handles, small gold crossguards). Under them a wide EMPTY ribbon banner wrapping across the lower third: deep red (#8f1d24) cloth with gold trim, curled ends, completely blank - no writing, no symbols on it. A few tiny sparkles around the star. Strong readable silhouette, compact.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green anywhere on the emblem.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, text on the ribbon, asymmetry, extra weapons
OUTPUT: PNG, 1280x800 if possible (aspect 8:5), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 緞帶上被寫了字 | `Make the ribbon completely blank. No letters, no symbols, no writing on it at all.` |
| 左右不對稱 | `Make the emblem perfectly symmetrical left to right.` |

---

## G-06　刺客普通攻擊圖示（需調整現有檔）｜P1

- **最終檔名**：`skill_icon_ATK_assassin.png`　**遊戲內尺寸**：38x38
- **輸出規格／建議張數**：152x152（任何正方形皆可），綠底（磚外）；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_skill_icon_ATK_x4.png`（盜賊普攻圖示：底框與風格）；`ref_skill_icon_backstab_x4.png`（刺客影襲：同組風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：現在這個檔案其實是盜賊普攻圖示的複本——深紫色圓角寶石底框＋細金邊，中間一隻手握一把銀色短刀，後方一道白色新月形弧光。**要改什麼**：底框、金邊、尺寸、光源不變；圖案改成「雙短刃反手握、兩道紫白色弧形斬擊」，要和影襲圖示（兩把交叉匕首＋紫色殘影）明顯不同。

**多步驟 / 一致性**：此段自足（底框與對照圖案都用文字寫了）。**可選加強**：G-06 與 G-07 通過後，把兩張一起上傳給任一張重生，可讓兩枚圖示更同組。

**G-06 刺客普攻圖示**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game icon in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp white highlights, saturated but harmonious colours, light from the upper-left. Bold simple shape with high contrast so it stays readable when shrunk to a tiny size. No realistic textures, no 3D-render look, no blur. Single subject, centred, with a small margin around it.
THE ICON FRAME (identical for every icon of the game): a rounded-square tile; the face is a dark purple (about #3f2d66 at the edges to #5b4690 at the centre) gem-like panel with a subtle bevel and faint facet highlights, a thin inner dark outline, and a thin gold-beige (about #d9b66a) border around it; square canvas, the tile fills almost the whole image with a very small margin.
SUBJECT (Assassin class basic attack icon): a single centred symbol inside the frame: two short curved blades held in reverse grip (blades pointing backward past the forearms); one blade swings a violet-white crescent slash arc to the right, the other crosses behind it, and a second thinner arc echoes the first. Steel blades with purple-wrapped handles; the arcs are the main shape. For contrast: the thief's basic attack icon (do NOT copy it) shows ONE hand holding ONE silver short dagger with a single white crescent arc; and the Assassin's Shadowstrike icon (do NOT copy it) shows two crossed daggers with a violet streak. This new icon must emphasise curved slash arcs with two blades.
Same size and detail level as a 38x38 game icon, symbol centred with a small margin.
BACKGROUND RULE (very important): everything outside the rounded-square tile is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green inside the tile.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, different frame colour, extra icons, circular spin
OUTPUT: PNG, 152x152 (or any square size), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 底框顏色或樣式跑掉 | `Keep the frame exactly: dark purple gem-like rounded square with a thin gold-beige border, same on every side.` |

---

## G-07　俠盜普通攻擊圖示（需調整現有檔）｜P1

- **最終檔名**：`skill_icon_ATK_bandit.png`　**遊戲內尺寸**：38x38
- **輸出規格／建議張數**：152x152（任何正方形皆可），綠底（磚外）；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_skill_icon_ATK_x4.png`（底框）；`ref_skill_icon_whirl_x4.png`（俠盜迴旋斬，橘白色：同組風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：現在是盜賊普攻圖示複本（紫色寶石底框、一手握銀短刀、白色弧光）。迴旋斬圖示是橘色與白色交織的圓形旋渦。**要改什麼**：底框不變；圖案改成「一把大彎刀大範圍橫斬，橘紅色寬弧光、白色核心」，看得到刀，不是圓形旋轉。

**多步驟 / 一致性**：此段自足。**可選加強**：同 G-06。

**G-07 俠盜普攻圖示**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game icon in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp white highlights, saturated but harmonious colours, light from the upper-left. Bold simple shape with high contrast so it stays readable when shrunk to a tiny size. No realistic textures, no 3D-render look, no blur. Single subject, centred, with a small margin around it.
THE ICON FRAME (identical for every icon of the game): a rounded-square tile; the face is a dark purple (about #3f2d66 at the edges to #5b4690 at the centre) gem-like panel with a subtle bevel and faint facet highlights, a thin inner dark outline, and a thin gold-beige (about #d9b66a) border around it; square canvas, the tile fills almost the whole image with a very small margin.
SUBJECT (Bandit class basic attack icon): a single centred symbol inside the frame: one large curved dagger / short sabre (steel blade, small gold guard, red-wrapped handle) swinging a wide heavy horizontal slash, leaving one broad orange-red (#e8602c to #f5a25a) crescent arc with a white core. It must be a single wide sideways arc with the sabre clearly visible. For contrast: the Bandit's Whirlwind Slash icon (do NOT copy it) is an orange-and-white circular spiral vortex of curved blades with no visible weapon handle; the thief's basic attack icon (do NOT copy it) is a hand holding a small dagger with a thin white arc.
Same size and detail level as a 38x38 game icon, symbol centred with a small margin.
BACKGROUND RULE (very important): everything outside the rounded-square tile is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green inside the tile.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, different frame colour, extra icons, circular spin
OUTPUT: PNG, 152x152 (or any square size), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 畫成圓形旋轉像迴旋斬 | `Draw ONE single wide sideways crescent slash arc with the sabre visible, not a circular spin.` |

---

## G-08　傳送門（藍紫通用）4 格動畫｜P1

- **最終檔名**：`portal_blue.png`　**遊戲內尺寸**：64x96（每格）
- **輸出規格／建議張數**：橫排 4 格 1024x384，純黑底（不去背）；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：無（風格只靠文字）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：現在只是程式畫的 44x78 紫色漸層長方形。這是全新的特效圖。

**多步驟 / 一致性**：此段自足。若 Gemini 4 格排得不整齊，改產單格（讓同一個傳送門的 4 個旋轉角度各產一次也可），我來組動畫。

**G-08 藍紫傳送門**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): game visual-effect sprite sheet in a MapleStory-like painterly cartoon style, bright glowing saturated colours. NO character, effect only, no text, no letters, no watermark. Nothing may touch the image borders.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, pure black #000000: no gradient, no vignette, no floor, no scenery, no border. The black will be removed by additive blending, so the effect itself must be bright and glowing and must not contain pure black. No text, no watermark.
LAYOUT: one horizontal sprite sheet with exactly 4 frames in one row, evenly spaced, each frame the same size, the portal at the same position and the same size in every frame. Overall the image is very wide (aspect 8:3). If a single row of 4 is impossible, draw ONE frame only, centred.
SUBJECT (blue-violet town-to-town portal): a vertical oval magic portal, tall and narrow (about 2:3 width to height), a swirling blue-violet and cyan light vortex with a bright cyan-white rim; a thin glowing rim, rim slightly thicker at the top and bottom, small star-like white sparkles drifting upward along the rim; soft inner glow, brightest at the centre; a mystical, calm, magical mood. The swirl rotates a quarter turn from frame to frame so the 4 frames loop seamlessly (frame 4 leads back to frame 1). The portal stands upright: its bottom edge is at the same height in every frame. No stone frame, no arch, no ground, no floor shadow, no light spilling beyond the rim.
NEGATIVE (avoid): character, creature, text, watermark, photorealistic, 3D render, blurry, white background, grey background, gradient background, scenery, floor, frames of different size, stone arch, different gate size between frames
OUTPUT: PNG, 1024x384 total (4 frames of 256x384) if possible, pure black background. Make 2 to 3 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純黑（灰、有漸層、有場景） | `Redo it. The background must be ONLY one perfectly flat pure black #000000, no gradient, no grey, no scenery, no floor.` |
| 各格大小或位置不一致 | `Make all frames exactly the same size, evenly spaced in one horizontal row, the effect centred in each frame at the same position and the same overall size.` |
| 畫出了角色或文字 | `Remove every character and all text. Draw the glowing effect only.` |
| 效果碰到畫面邊緣 | `Shrink the effect so there is clear black margin around every frame; nothing touches the image border.` |
| 只出得來單格 | `If a full row is not possible, draw ONE single frame of the effect centred on pure black; I will build the animation myself.` |

---

## G-09　金幣圖示｜P1

- **最終檔名**：`item_meso.png`　**遊戲內尺寸**：16x16
- **輸出規格／建議張數**：128x128，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_item_trial_token_x4.png`（任務道具圖示：銀灰圓盤、月牙浮雕、紫寶石；取風格與線條）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：現在是程式畫的 16x16 小金幣。這是全新圖示。

**G-09 金幣**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game icon in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp white highlights, saturated but harmonious colours, light from the upper-left. Bold simple shape with high contrast so it stays readable when shrunk to a tiny size. No realistic textures, no 3D-render look, no blur. Single subject, centred, with a small margin around it.
SUBJECT: a single gold coin (the game currency 'meso') in slightly tilted three-quarter view: round, bright yellow-gold (#f5c542) with a darker orange-gold (#c98a1e) rim and a visible thickness edge, a simple embossed four-pointed star in the centre (no letters, no numerals), a small white highlight on the upper left, one tiny sparkle. Bold shape, strong outline, high contrast; it must stay readable at 16x16 pixels. For style comparison only: the game's existing quest-token icon is a silver-grey round disc with a crescent-moon relief and a purple gem, drawn with the same thin dark outline and soft cel shading.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the coin.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, multiple coins, numerals
OUTPUT: PNG, 128x128 (square), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 一次畫了很多枚金幣 | `Draw exactly ONE coin, centred, on flat green.` |

---

## G-10a　補給商 NPC：行商阿福｜P2

- **最終檔名**：`npc_peddler.png`　**遊戲內尺寸**：約 56x80
- **輸出規格／建議張數**：直式約 3:4（如 900x1200），綠底；每位 NPC 各產一次；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_npc_merchant.png`（圓胖商人，比例與線條）；`ref_npc_townsfolk.png`（老人，比例與線條）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：目前阿福借用 npc_merchant（圓胖男人、藍色上衣、褐色肩背包、微笑）並加染色。要換成專屬造型。

**多步驟 / 一致性**：三位 NPC 各自完整（G-10a / b / c 分開）。三人的身高比例由我統一縮放，所以每次只要畫出「2.5 頭身 Q 版」即可。

**G-10a 行商阿福**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the NPC stands facing right, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
STYLE NOTE: shopkeeper NPCs of this game are round, friendly, slightly stocky chibi characters with soft shapes, e.g. a round bald-ish man in a blue shirt with a brown shoulder bag, and a gentle old man with grey hair in an olive tunic with a brown apron. Draw yours in the same simple, friendly style.
SUBJECT (Peddler Afu): a cheerful travelling forest peddler, round friendly face with a big smile, round stocky body; a straw hat (pale yellow, #d8c27a) on his head, a warm orange-brown (#b8662a) vest over a cream shirt, brown trousers and boots; a huge wooden backpack on his back stacked with herb bundles, small glass bottles and a ladle sticking out. Standing relaxed, facing right, both feet on the same baseline, a single character only.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the character or props.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, oversized head, green clothing, multiple characters
OUTPUT: PNG, tall portrait aspect about 3:4 (e.g. 600x800 or 900x1200), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 人物太高大或像成人比例 | `Make him a short chibi NPC, about 2.5 heads tall, with a big round head and a small stocky body.` |

---

## G-10b　補給商 NPC：船具商阿海｜P2

- **最終檔名**：`npc_chandler.png`　**遊戲內尺寸**：約 56x80
- **輸出規格／建議張數**：直式約 3:4，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_npc_merchant.png`；`ref_npc_townsfolk.png`
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：目前阿海借用 npc_townsfolk（灰髮老人、橄欖色束衣、褐色圍裙）加染色。要換成專屬造型。

**多步驟 / 一致性**：自足，與 G-10a 分開產。

**G-10b 船具商阿海**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the NPC stands facing right, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
STYLE NOTE: shopkeeper NPCs of this game are round, friendly, slightly stocky chibi characters with soft shapes, e.g. a round bald-ish man in a blue shirt with a brown shoulder bag, and a gentle old man with grey hair in an olive tunic with a brown apron. Draw yours in the same simple, friendly style.
SUBJECT (Chandler Ahai): a stocky harbour ship-supplies seller with weathered tan skin and a short brown beard; a navy-blue (#1f3a6e) sailor cap, a cream (#efe6cf) shirt with rolled-up sleeves, dark brown trousers and boots; a coil of thick rope over one shoulder and a small brass lantern (#c9a02e) hanging from one hand; a kind squinting smile. Standing relaxed, facing right, both feet on the same baseline, a single character only.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the character or props.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, oversized head, green clothing, multiple characters
OUTPUT: PNG, tall portrait aspect about 3:4 (e.g. 600x800 or 900x1200), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 人物太高大或像成人比例 | `Make him a short chibi NPC, about 2.5 heads tall, with a big round head and a small stocky body.` |

---

## G-10c　補給商 NPC：遺跡商販老莫｜P2

- **最終檔名**：`npc_trader.png`　**遊戲內尺寸**：約 48x80
- **輸出規格／建議張數**：直式約 3:4，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_npc_merchant.png`；`ref_npc_townsfolk.png`
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：目前老莫借用現有 NPC 加染色。要換成專屬造型。

**多步驟 / 一致性**：自足，與 G-10a 分開產。

**G-10c 遺跡商販老莫**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the NPC stands facing right, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
STYLE NOTE: shopkeeper NPCs of this game are round, friendly, slightly stocky chibi characters with soft shapes, e.g. a round bald-ish man in a blue shirt with a brown shoulder bag, and a gentle old man with grey hair in an olive tunic with a brown apron. Draw yours in the same simple, friendly style.
SUBJECT (Trader Lao Mo): a thin elderly ruins relic trader, a bald head with a pair of round brass goggles pushed up on his forehead, a small white moustache; an ochre (#c9962e) scarf, a patched brown (#6b4a2c) long coat with a few stitched patches, dark trousers; a leather satchel stuffed with rolled scrolls on one hip and a small cloth sack held in one hand; a wise squinting look. Standing relaxed, facing right, both feet on the same baseline, a single character only.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the character or props.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, oversized head, green clothing, multiple characters
OUTPUT: PNG, tall portrait aspect about 3:4 (e.g. 600x800 or 900x1200), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 人物太高大或像成人比例 | `Make him a short chibi NPC, about 2.5 heads tall, with a big round head and a small stocky body.` |

---

## G-11　影子史萊姆（Boss 房小怪）｜P2

- **最終檔名**：`monster_shadow_slime.png`　**遊戲內尺寸**：48x56
- **輸出規格／建議張數**：約 384x448，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_monster_slime.png`（48x56 原史萊姆：淺綠圓果凍、小黑點眼、頭頂小葉芽）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：淺綠色圓形果凍史萊姆，底部平，兩顆小黑點眼睛、微笑，頭頂一片小葉芽。**要改什麼**：同形狀同大小，改成暗紫黑色黏液、洋紅發光眼、周圍飄紫色小光點與一縷暗紫煙，葉芽枯萎。

**G-11 影子史萊姆**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, a small round blob monster, wider than tall. Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Slightly side view, facing right, full body visible, nothing cropped, centred in the frame, the bottom of the body touches the bottom of the frame with a small margin.
FOR YOUR UNDERSTANDING, the original monster this is based on: a small cute slime, a round jelly blob with a flat bottom, light green, two small black dot eyes, a small smile, and a tiny green leaf sprout on top of its head.
SUBJECT (SHADOW SLIME, a dark variant that you draw): the same simple shape (round jelly blob with a flat bottom, about as tall as it is wide, with a small leaf-like sprout on top, now withered and dark violet), body made of dark violet-black goo (from #2a1840 at the shadow side to #5b2a86 on the lit side) with a glossy white highlight on the upper left, two glowing magenta (#ff3df0) eyes, a small smirk, a few tiny floating purple motes around it and a faint wisp of dark violet smoke rising from the top. Cute, not scary.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the monster.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, extra limbs, scary realistic monster
OUTPUT: PNG, about 4:5 (e.g. 384x448 or 1024x1280), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 史萊姆變得很恐怖/寫實 | `Keep it cute and simple like a game mascot: round jelly blob, big glossy highlight, simple face.` |

---

## G-12a　二轉：影殺者（單體爆發） Shadowkiller｜P2（外觀為提案）

- **最終檔名**：`player_shadowkiller_*.png、portrait_shadowkiller.png`　**遊戲內尺寸**：100x80（頭像 74x72）
- **輸出規格／建議張數**：設定圖約 1920x1080；動作表盡量最大；各綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_player_assassin_idle_x4.png` + `ref_player_assassin_slash_2_x4.png`（一轉前身：看它的線條與比例）；`ref_player_idle_x4.png`（原始主角的臉與風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原始主角長相**（臉不變的依據）：THE HERO (a young thief boy, chibi): short messy spiky black hair with a few loose strands over the forehead; large round warm-brown eyes (about #7a4a2a) with a calm, slightly serious expression; light skin. He wears a dark navy-blue (about #1f2547) pointed hood pulled up over his head, with a thin gold (about #c9a24a) trim along the hood opening; a bright red (#b3262a) scarf around his neck with one long tail fluttering behind him; a brown leather chest armour (about #6b4328) with darker brown straps, a belt with a small buckle and a few pouches; brown leather fingerless gloves and leather bracers on both forearms; black trousers; brown leather boots (about #5a3820); a short steel dagger (silver-grey, slightly curved, dark leather-wrapped handle).

**一轉前身（Assassin）長相**：the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip。

**要畫什麼**：Shadowkiller 的外觀、武器與配色是**提案**（尚待你確認）。每個職業共 5 次生成：設定圖 → 動作表 A/B/C → 頭像（選配）。

**多步驟 / 一致性**：每一步都自足：都把「臉、髮、服裝、武器、色碼」以文字特徵清單完整重述，不寫「同上一張」。**可選加強**：步驟 1 通過後，步驟 2～5 每次把設定圖也一起上傳，並在提示詞前面加一句 `The attached design sheet shows the exact same character; keep his outfit and colours identical.`（沒有圖就不要加）。

**步驟 1 設定圖**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all views.
THE CHARACTER (hero after his second job advancement, "Shadowkiller"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a black hood with silver trim and a crimson inner lining, a half-face silver-edged black mask covering the nose and mouth (eyes and brow clearly visible), a fitted black coat with a short high collar and crimson stitching, a long crimson-and-black scarf with two long tails, wrist guards with red gems, black boots with crimson trim, slim and agile. WEAPON: two long curved kris-style blades held in reverse grip, dark steel with red-wrapped handles. PALETTE: near-black #1a1722, crimson #a3222e, silver, small gold accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a character design sheet showing 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour palette strip with the main colours at the bottom. Same chibi proportions in every view, full body.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face between views
OUTPUT: PNG, wide landscape (about 16:9, e.g. 1920x1080), highest quality. Make 3 to 4 variants and keep the best.
```

**步驟 2 動作表 A 移動（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadowkiller"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a black hood with silver trim and a crimson inner lining, a half-face silver-edged black mask covering the nose and mouth (eyes and brow clearly visible), a fitted black coat with a short high collar and crimson stitching, a long crimson-and-black scarf with two long tails, wrist guards with red gems, black boots with crimson trim, slim and agile. WEAPON: two long curved kris-style blades held in reverse grip, dark steel with red-wrapped handles. PALETTE: near-black #1a1722, crimson #a3222e, silver, small gold accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: movement poses. Draw the following poses, left to right, top row then bottom row:
1 idle: standing relaxed, blades held low and reversed, scarf tails resting.
2 idle 2: same as pose 1 but the whole body about 3 percent lower (breathing), tails slightly different.
3 walk 1: right foot forward, contact pose.
4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.
6 walk 4: passing pose, legs together.
7 jump up: knees tucked, weapon held back, scarf tails flowing downward.
8 fall: legs extended downward, scarf tails flowing upward.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 3 動作表 B 狀態與技能（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadowkiller"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a black hood with silver trim and a crimson inner lining, a half-face silver-edged black mask covering the nose and mouth (eyes and brow clearly visible), a fitted black coat with a short high collar and crimson stitching, a long crimson-and-black scarf with two long tails, wrist guards with red gems, black boots with crimson trim, slim and agile. WEAPON: two long curved kris-style blades held in reverse grip, dark steel with red-wrapped handles. PALETTE: near-black #1a1722, crimson #a3222e, silver, small gold accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: status and skill poses. Draw the following poses, left to right, top row then bottom row:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, weapon loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, weapon ready.
3 dead: lying flat on the ground on his back, eyes closed, a weapon dropped beside him.
4 cast: free hand stretched forward with open fingers as if marking or grabbing a target, scarf fluttering.
5 dash: body leaning far forward in a sprint, weapon pulled back, scarf tails streaming straight back.
6 throw 1: winding up to throw a small object, arm cocked behind the head, weapon in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: weapon(s) held across the chest in a defensive stance.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 4 動作表 C 近戰（5 張，上排 3、下排 2）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadowkiller"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a black hood with silver trim and a crimson inner lining, a half-face silver-edged black mask covering the nose and mouth (eyes and brow clearly visible), a fitted black coat with a short high collar and crimson stitching, a long crimson-and-black scarf with two long tails, wrist guards with red gems, black boots with crimson trim, slim and agile. WEAPON: two long curved kris-style blades held in reverse grip, dark steel with red-wrapped handles. PALETTE: near-black #1a1722, crimson #a3222e, silver, small gold accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: melee poses. Draw the following poses, left to right, top row then bottom row:
1 slash 1: wind-up, weapons pulled back, body twisted, weight on the back foot.
2 slash 2: weapon slashing forward, body leaning in.
3 slash 3: heavy finishing slash, follow-through, body fully extended.
4 backstab 1: very low crouch, weapons pulled in close, eyes narrowed (about to strike).
5 backstab 2: lunging forward with the weapons thrust straight ahead at chest height, long forward stride.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 3 poses on the top row and 2 on the bottom row.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 5（選配）頭像**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Bust portrait framing.
THE CHARACTER (hero after his second job advancement, "Shadowkiller"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a black hood with silver trim and a crimson inner lining, a half-face silver-edged black mask covering the nose and mouth (eyes and brow clearly visible), a fitted black coat with a short high collar and crimson stitching, a long crimson-and-black scarf with two long tails, wrist guards with red gems, black boots with crimson trim, slim and agile. WEAPON: two long curved kris-style blades held in reverse grip, dark steel with red-wrapped handles. PALETTE: near-black #1a1722, crimson #a3222e, silver, small gold accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a bust portrait (head and shoulders), three-quarter view facing right, calm confident expression, the face and hair exactly as described, centred with a small margin.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight
OUTPUT: PNG, 296x288 or any size with aspect about 74:72, highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 姿勢之間互相碰到 / 黏在一起 | `Space the poses much further apart: at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose.` |
| 各姿勢大小不一 | `Every pose must have exactly the same character scale (the standing height is identical across the sheet).` |
| 臉、髮型或配色跑掉 | `Keep the face, hairstyle and every colour exactly as in the written feature list; only the pose changes.` |
| 一次畫不完整張動作表 | `Draw only poses 1 to 4 now, in one row of four, same style and feature list; I will ask for the rest separately.` |
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |

---

## G-12b　二轉：暗夜使者（飛鏢 / 遠程） Night Lord｜P2（外觀為提案）

- **最終檔名**：`player_nightlord_*.png、portrait_nightlord.png`　**遊戲內尺寸**：100x80（頭像 74x72）
- **輸出規格／建議張數**：設定圖約 1920x1080；動作表盡量最大；各綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_player_assassin_idle_x4.png` + `ref_player_assassin_slash_2_x4.png`（一轉前身：看它的線條與比例）；`ref_player_idle_x4.png`（原始主角的臉與風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原始主角長相**（臉不變的依據）：THE HERO (a young thief boy, chibi): short messy spiky black hair with a few loose strands over the forehead; large round warm-brown eyes (about #7a4a2a) with a calm, slightly serious expression; light skin. He wears a dark navy-blue (about #1f2547) pointed hood pulled up over his head, with a thin gold (about #c9a24a) trim along the hood opening; a bright red (#b3262a) scarf around his neck with one long tail fluttering behind him; a brown leather chest armour (about #6b4328) with darker brown straps, a belt with a small buckle and a few pouches; brown leather fingerless gloves and leather bracers on both forearms; black trousers; brown leather boots (about #5a3820); a short steel dagger (silver-grey, slightly curved, dark leather-wrapped handle).

**一轉前身（Assassin）長相**：the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip。

**要畫什麼**：Night Lord 的外觀、武器與配色是**提案**（尚待你確認）。每個職業共 5 次生成：設定圖 → 動作表 A/B/C → 頭像（選配）。

**多步驟 / 一致性**：每一步都自足：都把「臉、髮、服裝、武器、色碼」以文字特徵清單完整重述，不寫「同上一張」。**可選加強**：步驟 1 通過後，步驟 2～5 每次把設定圖也一起上傳，並在提示詞前面加一句 `The attached design sheet shows the exact same character; keep his outfit and colours identical.`（沒有圖就不要加）。

**步驟 1 設定圖**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all views.
THE CHARACTER (hero after his second job advancement, "Night Lord"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a midnight-blue hooded cloak with a faint star pattern on its lining, the lower face covered by a dark-blue cloth mask (eyes and brow clearly visible), a fitted black-and-navy outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, a clawed leather glove on the throwing hand, black boots, slim. WEAPON: a fan of large star-shaped throwing stars held in one hand (silver with a violet glint) and a short dagger on the hip. PALETTE: midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a character design sheet showing 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour palette strip with the main colours at the bottom. Same chibi proportions in every view, full body.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face between views
OUTPUT: PNG, wide landscape (about 16:9, e.g. 1920x1080), highest quality. Make 3 to 4 variants and keep the best.
```

**步驟 2 動作表 A 移動（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Night Lord"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a midnight-blue hooded cloak with a faint star pattern on its lining, the lower face covered by a dark-blue cloth mask (eyes and brow clearly visible), a fitted black-and-navy outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, a clawed leather glove on the throwing hand, black boots, slim. WEAPON: a fan of large star-shaped throwing stars held in one hand (silver with a violet glint) and a short dagger on the hip. PALETTE: midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: movement poses. Draw the following poses, left to right, top row then bottom row:
1 idle: standing relaxed, the throwing stars fanned low in one hand, scarf tails resting.
2 idle 2: same as pose 1 but the whole body about 3 percent lower (breathing), tails slightly different.
3 walk 1: right foot forward, contact pose.
4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.
6 walk 4: passing pose, legs together.
7 jump up: knees tucked, weapon held back, scarf tails flowing downward.
8 fall: legs extended downward, scarf tails flowing upward.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 3 動作表 B 狀態與技能（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Night Lord"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a midnight-blue hooded cloak with a faint star pattern on its lining, the lower face covered by a dark-blue cloth mask (eyes and brow clearly visible), a fitted black-and-navy outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, a clawed leather glove on the throwing hand, black boots, slim. WEAPON: a fan of large star-shaped throwing stars held in one hand (silver with a violet glint) and a short dagger on the hip. PALETTE: midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: status and skill poses. Draw the following poses, left to right, top row then bottom row:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, weapon loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, weapon ready.
3 dead: lying flat on the ground on his back, eyes closed, a weapon dropped beside him.
4 cast: free hand stretched forward with open fingers as if marking or grabbing a target, scarf fluttering.
5 dash: body leaning far forward in a sprint, weapon pulled back, scarf tails streaming straight back.
6 throw 1: winding up to throw a small object, arm cocked behind the head, weapon in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: weapon(s) held across the chest in a defensive stance.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 4 動作表 C 近戰（5 張，上排 3、下排 2）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Night Lord"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a midnight-blue hooded cloak with a faint star pattern on its lining, the lower face covered by a dark-blue cloth mask (eyes and brow clearly visible), a fitted black-and-navy outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, a clawed leather glove on the throwing hand, black boots, slim. WEAPON: a fan of large star-shaped throwing stars held in one hand (silver with a violet glint) and a short dagger on the hip. PALETTE: midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: melee poses. Draw the following poses, left to right, top row then bottom row:
1 slash 1: wind-up, weapons pulled back, body twisted, weight on the back foot.
2 slash 2: weapon slashing forward, body leaning in.
3 slash 3: heavy finishing slash, follow-through, body fully extended.
4 backstab 1: very low crouch, weapons pulled in close, eyes narrowed (about to strike).
5 backstab 2: lunging forward with the weapons thrust straight ahead at chest height, long forward stride.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 3 poses on the top row and 2 on the bottom row.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 5（選配）頭像**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Bust portrait framing.
THE CHARACTER (hero after his second job advancement, "Night Lord"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: a midnight-blue hooded cloak with a faint star pattern on its lining, the lower face covered by a dark-blue cloth mask (eyes and brow clearly visible), a fitted black-and-navy outfit with silver star-shaped buckles, a long flowing deep-purple scarf with two long tails, a clawed leather glove on the throwing hand, black boots, slim. WEAPON: a fan of large star-shaped throwing stars held in one hand (silver with a violet glint) and a short dagger on the hip. PALETTE: midnight blue #14183a, deep purple #4b2a86, silver, pale-gold star accents. For your understanding, the first-job Assassin looks like: black hood with thin silver trim, lower face covered by a black cloth mask, fitted all-black outfit, a deep purple scarf with two tails, wrist guards with small purple gems, two curved short blades in reverse grip; the new look is clearly the grown-up version of that.
TASK: a bust portrait (head and shoulders), three-quarter view facing right, calm confident expression, the face and hair exactly as described, centred with a small margin.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight
OUTPUT: PNG, 296x288 or any size with aspect about 74:72, highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 姿勢之間互相碰到 / 黏在一起 | `Space the poses much further apart: at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose.` |
| 各姿勢大小不一 | `Every pose must have exactly the same character scale (the standing height is identical across the sheet).` |
| 臉、髮型或配色跑掉 | `Keep the face, hairstyle and every colour exactly as in the written feature list; only the pose changes.` |
| 一次畫不完整張動作表 | `Draw only poses 1 to 4 now, in one row of four, same style and feature list; I will ask for the rest separately.` |
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |

---

## G-12c　二轉：盜賊王（重型近戰） Bandit King｜P2（外觀為提案）

- **最終檔名**：`player_bandit_king_*.png、portrait_bandit_king.png`　**遊戲內尺寸**：100x80（頭像 74x72）
- **輸出規格／建議張數**：設定圖約 1920x1080；動作表盡量最大；各綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_player_bandit_idle_x4.png` + `ref_player_bandit_slash_2_x4.png`（一轉前身：看它的線條與比例）；`ref_player_idle_x4.png`（原始主角的臉與風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原始主角長相**（臉不變的依據）：THE HERO (a young thief boy, chibi): short messy spiky black hair with a few loose strands over the forehead; large round warm-brown eyes (about #7a4a2a) with a calm, slightly serious expression; light skin. He wears a dark navy-blue (about #1f2547) pointed hood pulled up over his head, with a thin gold (about #c9a24a) trim along the hood opening; a bright red (#b3262a) scarf around his neck with one long tail fluttering behind him; a brown leather chest armour (about #6b4328) with darker brown straps, a belt with a small buckle and a few pouches; brown leather fingerless gloves and leather bracers on both forearms; black trousers; brown leather boots (about #5a3820); a short steel dagger (silver-grey, slightly curved, dark leather-wrapped handle).

**一轉前身（Bandit）長相**：the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre。

**要畫什麼**：Bandit King 的外觀、武器與配色是**提案**（尚待你確認）。每個職業共 5 次生成：設定圖 → 動作表 A/B/C → 頭像（選配）。

**多步驟 / 一致性**：每一步都自足：都把「臉、髮、服裝、武器、色碼」以文字特徵清單完整重述，不寫「同上一張」。**可選加強**：步驟 1 通過後，步驟 2～5 每次把設定圖也一起上傳，並在提示詞前面加一句 `The attached design sheet shows the exact same character; keep his outfit and colours identical.`（沒有圖就不要加）。

**步驟 1 設定圖**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all views.
THE CHARACTER (hero after his second job advancement, "Bandit King"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a small gold circlet worn over a red bandana tied around the forehead with two fluttering tails; a rust-brown and black leather coat with a big cream fur collar and gold trim; one large metal shoulder plate on EACH shoulder; a wide red sash with a gold buckle; bandaged forearms with gold bracers; dark trousers and brown boots; broader and sturdier than the first-job Bandit. WEAPON: one very large curved sabre with a gold-trimmed guard and a red-wrapped handle, forward grip. PALETTE: dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a character design sheet showing 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour palette strip with the main colours at the bottom. Same chibi proportions in every view, full body.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face between views
OUTPUT: PNG, wide landscape (about 16:9, e.g. 1920x1080), highest quality. Make 3 to 4 variants and keep the best.
```

**步驟 2 動作表 A 移動（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Bandit King"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a small gold circlet worn over a red bandana tied around the forehead with two fluttering tails; a rust-brown and black leather coat with a big cream fur collar and gold trim; one large metal shoulder plate on EACH shoulder; a wide red sash with a gold buckle; bandaged forearms with gold bracers; dark trousers and brown boots; broader and sturdier than the first-job Bandit. WEAPON: one very large curved sabre with a gold-trimmed guard and a red-wrapped handle, forward grip. PALETTE: dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: movement poses. Draw the following poses, left to right, top row then bottom row:
1 idle: standing in a confident wide stance, the big sabre held low in the right hand, bandana tails resting.
2 idle 2: same as pose 1 but the whole body about 3 percent lower (breathing), tails slightly different.
3 walk 1: right foot forward, contact pose.
4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.
6 walk 4: passing pose, legs together.
7 jump up: knees tucked, weapon held back, bandana tails flowing downward.
8 fall: legs extended downward, bandana tails flowing upward.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 3 動作表 B 狀態與技能（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Bandit King"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a small gold circlet worn over a red bandana tied around the forehead with two fluttering tails; a rust-brown and black leather coat with a big cream fur collar and gold trim; one large metal shoulder plate on EACH shoulder; a wide red sash with a gold buckle; bandaged forearms with gold bracers; dark trousers and brown boots; broader and sturdier than the first-job Bandit. WEAPON: one very large curved sabre with a gold-trimmed guard and a red-wrapped handle, forward grip. PALETTE: dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: status and skill poses. Draw the following poses, left to right, top row then bottom row:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, weapon loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, weapon ready.
3 dead: lying flat on the ground on his back, eyes closed, a weapon dropped beside him.
4 cast: free hand stretched forward with open fingers as if marking or grabbing a target, bandana fluttering.
5 dash: body leaning far forward in a sprint, weapon pulled back, bandana tails streaming straight back.
6 throw 1: winding up to throw a small object, arm cocked behind the head, weapon in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: weapon(s) held across the chest in a defensive stance.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 4 動作表 C 近戰（5 張，上排 3、下排 2）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Bandit King"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a small gold circlet worn over a red bandana tied around the forehead with two fluttering tails; a rust-brown and black leather coat with a big cream fur collar and gold trim; one large metal shoulder plate on EACH shoulder; a wide red sash with a gold buckle; bandaged forearms with gold bracers; dark trousers and brown boots; broader and sturdier than the first-job Bandit. WEAPON: one very large curved sabre with a gold-trimmed guard and a red-wrapped handle, forward grip. PALETTE: dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: melee poses. Draw the following poses, left to right, top row then bottom row:
1 slash 1: wind-up, weapon raised high behind the head, weight on the back foot.
2 slash 2: big horizontal slash forward, body turning with the swing.
3 slash 3: heavy upward finishing slash, body leaping slightly off the ground.
4 spin 1: starting a spin, body twisted away from the viewer, weapon swung out wide to the side.
5 spin 2: mid-spin, body turned sideways, weapon extended fully horizontal, bandana tails whipping around.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 3 poses on the top row and 2 on the bottom row.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 5（選配）頭像**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Bust portrait framing.
THE CHARACTER (hero after his second job advancement, "Bandit King"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a small gold circlet worn over a red bandana tied around the forehead with two fluttering tails; a rust-brown and black leather coat with a big cream fur collar and gold trim; one large metal shoulder plate on EACH shoulder; a wide red sash with a gold buckle; bandaged forearms with gold bracers; dark trousers and brown boots; broader and sturdier than the first-job Bandit. WEAPON: one very large curved sabre with a gold-trimmed guard and a red-wrapped handle, forward grip. PALETTE: dark brown #4a2a18, red #b3262a, gold #d9a441, cream fur, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a bust portrait (head and shoulders), three-quarter view facing right, calm confident expression, the face and hair exactly as described, centred with a small margin.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight
OUTPUT: PNG, 296x288 or any size with aspect about 74:72, highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 姿勢之間互相碰到 / 黏在一起 | `Space the poses much further apart: at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose.` |
| 各姿勢大小不一 | `Every pose must have exactly the same character scale (the standing height is identical across the sheet).` |
| 臉、髮型或配色跑掉 | `Keep the face, hairstyle and every colour exactly as in the written feature list; only the pose changes.` |
| 一次畫不完整張動作表 | `Draw only poses 1 to 4 now, in one row of four, same style and feature list; I will ask for the rest separately.` |
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |

---

## G-12d　二轉：暗影遊俠（機動 / 混合） Shadow Ranger｜P2（外觀為提案）

- **最終檔名**：`player_shadowranger_*.png、portrait_shadowranger.png`　**遊戲內尺寸**：100x80（頭像 74x72）
- **輸出規格／建議張數**：設定圖約 1920x1080；動作表盡量最大；各綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_player_bandit_idle_x4.png` + `ref_player_bandit_slash_2_x4.png`（一轉前身：看它的線條與比例）；`ref_player_idle_x4.png`（原始主角的臉與風格）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原始主角長相**（臉不變的依據）：THE HERO (a young thief boy, chibi): short messy spiky black hair with a few loose strands over the forehead; large round warm-brown eyes (about #7a4a2a) with a calm, slightly serious expression; light skin. He wears a dark navy-blue (about #1f2547) pointed hood pulled up over his head, with a thin gold (about #c9a24a) trim along the hood opening; a bright red (#b3262a) scarf around his neck with one long tail fluttering behind him; a brown leather chest armour (about #6b4328) with darker brown straps, a belt with a small buckle and a few pouches; brown leather fingerless gloves and leather bracers on both forearms; black trousers; brown leather boots (about #5a3820); a short steel dagger (silver-grey, slightly curved, dark leather-wrapped handle).

**一轉前身（Bandit）長相**：the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre。

**要畫什麼**：Shadow Ranger 的外觀、武器與配色是**提案**（尚待你確認）。每個職業共 5 次生成：設定圖 → 動作表 A/B/C → 頭像（選配）。

**多步驟 / 一致性**：每一步都自足：都把「臉、髮、服裝、武器、色碼」以文字特徵清單完整重述，不寫「同上一張」。**可選加強**：步驟 1 通過後，步驟 2～5 每次把設定圖也一起上傳，並在提示詞前面加一句 `The attached design sheet shows the exact same character; keep his outfit and colours identical.`（沒有圖就不要加）。

**步驟 1 設定圖**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all views.
THE CHARACTER (hero after his second job advancement, "Shadow Ranger"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a dark teal-grey half cape over one shoulder; a charcoal-grey leather vest; a dark teal bandana tied at the neck (not on the forehead) with two fluttering tails; leather forearm guards; a belt of small pouches and throwing knives; dark trousers and boots; lean and athletic, slightly narrower than the first-job Bandit. WEAPON: a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip. PALETTE: charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a character design sheet showing 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour palette strip with the main colours at the bottom. Same chibi proportions in every view, full body.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face between views
OUTPUT: PNG, wide landscape (about 16:9, e.g. 1920x1080), highest quality. Make 3 to 4 variants and keep the best.
```

**步驟 2 動作表 A 移動（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadow Ranger"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a dark teal-grey half cape over one shoulder; a charcoal-grey leather vest; a dark teal bandana tied at the neck (not on the forehead) with two fluttering tails; leather forearm guards; a belt of small pouches and throwing knives; dark trousers and boots; lean and athletic, slightly narrower than the first-job Bandit. WEAPON: a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip. PALETTE: charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: movement poses. Draw the following poses, left to right, top row then bottom row:
1 idle: standing relaxed, the sabre held low in the right hand, neck-bandana tails resting.
2 idle 2: same as pose 1 but the whole body about 3 percent lower (breathing), tails slightly different.
3 walk 1: right foot forward, contact pose.
4 walk 2: passing pose, legs together, body slightly raised.
5 walk 3: left foot forward, contact pose.
6 walk 4: passing pose, legs together.
7 jump up: knees tucked, weapon held back, bandana tails flowing downward.
8 fall: legs extended downward, bandana tails flowing upward.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 3 動作表 B 狀態與技能（8 張，2x4 格）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadow Ranger"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a dark teal-grey half cape over one shoulder; a charcoal-grey leather vest; a dark teal bandana tied at the neck (not on the forehead) with two fluttering tails; leather forearm guards; a belt of small pouches and throwing knives; dark trousers and boots; lean and athletic, slightly narrower than the first-job Bandit. WEAPON: a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip. PALETTE: charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: status and skill poses. Draw the following poses, left to right, top row then bottom row:
1 hurt: leaning backward, eyes squeezed shut, arms flung out, weapon loosely held.
2 crouch: crouching low with knees deeply bent, body close to the ground, weapon ready.
3 dead: lying flat on the ground on his back, eyes closed, a weapon dropped beside him.
4 cast: free hand stretched forward with open fingers as if marking or grabbing a target, bandana fluttering.
5 dash: body leaning far forward in a sprint, weapon pulled back, bandana tails streaming straight back.
6 throw 1: winding up to throw a small object, arm cocked behind the head, weapon in the other hand.
7 throw 2: arm fully extended forward after throwing, fingers open, body leaning forward.
8 guard: weapon(s) held across the chest in a defensive stance.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 2 rows x 4 columns.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 4 動作表 C 近戰（5 張，上排 3、下排 2）**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Chibi proportions identical in all poses.
THE CHARACTER (hero after his second job advancement, "Shadow Ranger"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a dark teal-grey half cape over one shoulder; a charcoal-grey leather vest; a dark teal bandana tied at the neck (not on the forehead) with two fluttering tails; leather forearm guards; a belt of small pouches and throwing knives; dark trousers and boots; lean and athletic, slightly narrower than the first-job Bandit. WEAPON: a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip. PALETTE: charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a pose sheet of this exact character: melee poses. Draw the following poses, left to right, top row then bottom row:
1 slash 1: wind-up, weapon raised high behind the head, weight on the back foot.
2 slash 2: big horizontal slash forward, body turning with the swing.
3 slash 3: heavy upward finishing slash, body leaping slightly off the ground.
4 spin 1: starting a spin, body twisted away from the viewer, weapon swung out wide to the side.
5 spin 2: mid-spin, body turned sideways, weapon extended fully horizontal, bandana tails whipping around.
LAYOUT: one image, a grid with every pose in its own invisible cell, each character fully inside its cell, at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose. Every pose has the SAME character scale (the standing height is identical across the sheet; crouching and lying poses keep the same body size). Upright poses stand on the same baseline within a row. VIEW: side view, body facing right (the head may turn slightly toward the viewer), full body visible. FORBIDDEN: motion blur, speed lines, afterimages, glow, smoke, particles, magic effects, text, numbers, grid lines, watermark. Draw ONLY the character and the held weapon. Grid: 3 poses on the top row and 2 on the bottom row.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, different face, different outfit between poses, oversized head
OUTPUT: PNG, highest resolution available (landscape). Make 2 to 3 variants and keep the best.
```

**步驟 5（選配）頭像**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Bust portrait framing.
THE CHARACTER (hero after his second job advancement, "Shadow Ranger"): the same young boy as the hero: short messy spiky black hair, large round warm-brown eyes, light skin, calm slightly serious face, now an older, more experienced young man but with the same face and hairstyle. OUTFIT: NO hood; a dark teal-grey half cape over one shoulder; a charcoal-grey leather vest; a dark teal bandana tied at the neck (not on the forehead) with two fluttering tails; leather forearm guards; a belt of small pouches and throwing knives; dark trousers and boots; lean and athletic, slightly narrower than the first-job Bandit. WEAPON: a curved short sabre in the right hand and a compact hand crossbow strapped on the back / left hip. PALETTE: charcoal #2a2d33, dark teal #1f5f63, rust-orange accents #c8662a, steel grey. For your understanding, the first-job Bandit looks like: no hood, black messy hair, a red bandana tied around the forehead with two long tails, rust-brown leather armour with one metal shoulder plate, a cream fur collar, bandaged forearms, a wide red sash, brown boots, one large curved short sabre; the new look is clearly the grown-up version of that.
TASK: a bust portrait (head and shoulders), three-quarter view facing right, calm confident expression, the face and hair exactly as described, centred with a small margin.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight
OUTPUT: PNG, 296x288 or any size with aspect about 74:72, highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 姿勢之間互相碰到 / 黏在一起 | `Space the poses much further apart: at least 80 pixels of empty flat green between neighbouring characters; no limb, weapon or scarf may touch or overlap another pose.` |
| 各姿勢大小不一 | `Every pose must have exactly the same character scale (the standing height is identical across the sheet).` |
| 臉、髮型或配色跑掉 | `Keep the face, hairstyle and every colour exactly as in the written feature list; only the pose changes.` |
| 一次畫不完整張動作表 | `Draw only poses 1 to 4 now, in one row of four, same style and feature list; I will ask for the rest separately.` |
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |

---

## G-13　影之殿堂專屬傳送門（金色）｜P2（選配）

- **最終檔名**：`portal_gold.png`　**遊戲內尺寸**：64x96（每格）
- **輸出規格／建議張數**：橫排 4 格 1024x384，純黑底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_prop_star_tower_x4.png`（金色調參考，非必要）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。形狀與 G-08 相同，只是改成神聖金色。以下提示詞已完整描述形狀，不需要 G-08 成品。

**多步驟 / 一致性**：此段自足。**可選加強**：若已有 G-08 成品，上傳它並加一句「same shape and frame layout as the attached image, recoloured to gold」。

**G-13 金色傳送門**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): game visual-effect sprite sheet in a MapleStory-like painterly cartoon style, bright glowing saturated colours. NO character, effect only, no text, no letters, no watermark. Nothing may touch the image borders.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, pure black #000000: no gradient, no vignette, no floor, no scenery, no border. The black will be removed by additive blending, so the effect itself must be bright and glowing and must not contain pure black. No text, no watermark.
LAYOUT: one horizontal sprite sheet with exactly 4 frames in one row, evenly spaced, each frame the same size, the portal at the same position and the same size in every frame. Overall the image is very wide (aspect 8:3). If a single row of 4 is impossible, draw ONE frame only, centred.
SUBJECT (golden sacred portal for the Shadow Shrine): a vertical oval magic portal, tall and narrow (about 2:3 width to height), a swirling warm gold, soft white and pale amber light vortex with a bright gold rim and tiny four-pointed star sparkles; a thin glowing rim, rim slightly thicker at the top and bottom, small star-like white sparkles drifting upward along the rim; soft inner glow, brightest at the centre; a gentle, sacred, moonlit feeling. The swirl rotates a quarter turn from frame to frame so the 4 frames loop seamlessly (frame 4 leads back to frame 1). The portal stands upright: its bottom edge is at the same height in every frame. No stone frame, no arch, no ground, no floor shadow, no light spilling beyond the rim.
NEGATIVE (avoid): character, creature, text, watermark, photorealistic, 3D render, blurry, white background, grey background, gradient background, scenery, floor, frames of different size, stone arch, different gate size between frames
OUTPUT: PNG, 1024x384 total (4 frames of 256x384) if possible, pure black background. Make 2 to 3 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純黑（灰、有漸層、有場景） | `Redo it. The background must be ONLY one perfectly flat pure black #000000, no gradient, no grey, no scenery, no floor.` |
| 各格大小或位置不一致 | `Make all frames exactly the same size, evenly spaced in one horizontal row, the effect centred in each frame at the same position and the same overall size.` |
| 畫出了角色或文字 | `Remove every character and all text. Draw the glowing effect only.` |
| 效果碰到畫面邊緣 | `Shrink the effect so there is clear black margin around every frame; nothing touches the image border.` |
| 只出得來單格 | `If a full row is not possible, draw ONE single frame of the effect centred on pure black; I will build the animation myself.` |

---

## G-14　夜渡（魔君真身）設定圖｜P1/P2（取決於劇情）

- **最終檔名**：`npc_yedu.png（暫名）`　**遊戲內尺寸**：—
- **輸出規格／建議張數**：3 視圖設定圖，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_boss_idle.png`（現有魔君：保留尖冠、披風、浮動黑球的辨識點）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：暗影魔君 = 灰紫色光滑無口鼻頭、洋紅發光眼、黑色尖冠（額前洋紅寶石）、深紫緊身衣、尖刺肩甲、洋紅符文披風、周圍黑色圓球（詳見提示詞內文字）。**要改什麼**：變成他曾經的樣子：疲憊溫柔、破損披風、有裂痕的金色王冠、無紅光。

**G-14 夜渡設定圖**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game sprite in the style of MapleStory (Nexon). Chibi proportions, about 2.5 to 3 heads tall (large round head, small body). Thin, clean, uniform-weight dark (near-black brown) outline. Soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours. Light comes from the upper-left, shadows are slightly cooler and fall to the lower-right of each form. No realistic textures, no 3D-render look, no painterly blur, no heavy gradients. Side view, the subject faces RIGHT, full body visible, nothing cropped, centred in the frame, feet at the bottom of the frame with a small margin.
FOR YOUR UNDERSTANDING, the base design this character was derived from: THE DARK LORD (the game's final boss, chibi, about 2.5 heads tall): a smooth hairless head of muted grey-violet skin (about #6b5b8a) with NO mouth and NO nose, only two narrow slanted glowing magenta (about #ff3df0) eyes; a tall spiked black crown (near-black #1d1a26 with grey edge highlights) with several pointed spikes, one taller spike in the middle, and a small magenta diamond gem at the centre front; a slim dark-violet (about #3b2a55) bodysuit with subtle wavy fold lines; spiked dark-grey armoured shoulder pads and clawed dark-grey gauntlets with small glowing magenta rune marks; a long dark-purple (about #4a2a6e) cape with a violet lining, ragged flame-like tips along its edges, covered with glowing magenta rune symbols; several floating dark orbs (black-violet spheres with a soft purple rim, in different sizes) hovering around him; dark violet pointed feet.
SUBJECT: draw the same lord as his TRUE FORMER SELF, "Yedu", a fallen guardian, keeping the base silhouette (small chibi body, crown, long cape, a couple of floating dark orbs) but with a changed temperament: dark charcoal armour with worn silver edges instead of the violet bodysuit; a TORN dark cape with golden-thread rune patterns that have mostly faded; a CRACKED GOLDEN crown (warm gold #c9a24a, with a visible crack) instead of the black spiked crown; a normal human-like face with pale skin, eyes TIRED and KIND (soft grey-violet irises, no glow, no red), a faint gentle smile, short dark hair; no magenta glow anywhere; one gauntlet removed so one hand is bare.
TASK: a character design sheet with 3 views in one row, evenly spaced: front view, side view facing right, back view; plus a small colour palette strip at the bottom. Same chibi proportions in all views.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the character.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, signature, watermark, background scenery, floor, ground shadow, white background, gradient background, checkerboard, cropped limbs, extra limbs, motion blur, speed lines, inconsistent outline weight, menacing expression, red eyes, glowing eyes
OUTPUT: PNG, wide landscape (about 16:9), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 臉看起來還是很兇 | `Make his eyes tired and kind, a faint gentle smile, no glow at all, no red, no menace.` |

---

## G-15　可調查石碑｜P1/P2（取決於劇情）

- **最終檔名**：`prop_tablet.png`　**遊戲內尺寸**：約 48x64
- **輸出規格／建議張數**：384x512，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：無
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。

**G-15 石碑**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game prop in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours, light from the upper-left with cooler shadows to the lower-right. No realistic textures, no 3D-render look, no blur. Slight side view, the bottom edge of the object is flat so it can sit on the ground, nothing cropped, centred.
SUBJECT: an ancient carved stone tablet (stele) standing upright: weathered grey-blue (#7d8aa0) stone with darker cracks, blue-grey moss at the base (use blue-grey moss, NOT green), a chipped rounded top, a small pebble base, and faint glowing gold-blue (#e6c35a and #6fa8ff) rune shapes carved on its face (abstract rune-like shapes only, NOT readable text). Slight three-quarter view, about 3:4 tall, the bottom edge flat.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the tablet.
NEGATIVE (avoid): photorealistic, 3D render, blurry, readable text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, scenery
OUTPUT: PNG, 384x512 (aspect 3:4), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 石碑上出現可讀文字 | `Replace the writing with abstract rune-like scratches that do not form any readable letters.` |

---

## G-16　寶箱（關 / 開）｜P1/P2（取決於劇情）

- **最終檔名**：`prop_chest_closed.png / prop_chest_open.png`　**遊戲內尺寸**：約 40x36
- **輸出規格／建議張數**：1600x640 兩個並排，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：無
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。兩個狀態請在同一張圖並排畫（保證是同一個箱子）。

**多步驟 / 一致性**：若 Gemini 兩個箱子長得不同，改成先只產「關閉」一張；再開新對話貼同一段文字並把 `Draw TWO versions ... ` 改為只畫「OPEN」並重述外觀特徵（已在文字內）。

**G-16 寶箱 關/開**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game prop in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours, light from the upper-left with cooler shadows to the lower-right. No realistic textures, no 3D-render look, no blur. Slight side view, the bottom edge of the object is flat so it can sit on the ground, nothing cropped, centred.
SUBJECT: a small wooden treasure chest with gold trim: warm brown (#8a5a2c) planks with darker grain lines, gold (#e0b04a) corner plates and bands, a gold lock plate, a rounded lid; side view slightly from above. Draw TWO versions of the SAME chest side by side, same size and same baseline, at least 60 pixels apart: on the LEFT the chest CLOSED; on the RIGHT the chest OPEN with the lid tilted back, a warm golden light and a few small sparkles rising from inside, and a few gold coins visible inside.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the chest.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, different chest between the two, scenery
OUTPUT: PNG, wide landscape about 5:2 (e.g. 1600x640), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 兩個箱子長得不一樣 | `Both chests must be the exact same design: same planks, same gold trim, same lock, same size; only the lid state differs.` |

---

## G-17　夜渡之信道具圖示｜P1/P2（取決於劇情）

- **最終檔名**：`item_night_letter.png`　**遊戲內尺寸**：28x28
- **輸出規格／建議張數**：112x112，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_item_star_shard_x4.png`（風格與大小感）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。

**G-17 夜渡之信**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game icon in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp white highlights, saturated but harmonious colours, light from the upper-left. Bold simple shape with high contrast so it stays readable when shrunk to a tiny size. No realistic textures, no 3D-render look, no blur. Single subject, centred, with a small margin around it.
SUBJECT: a single folded old letter: aged cream-yellow (#e8d9a8) paper with slightly torn, slightly curled corners, a darker fold line, sealed with a small round silver wax seal (silver-grey #b8bcc8) stamped with a small four-pointed star relief, and a thin faded dark-red ribbon. Slightly tilted three-quarter view. Bold simple shape that stays readable at 28x28 pixels. For style comparison only: the game's star shard icon is a chubby faceted golden four-pointed star with tiny sparkles.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. Do not use green on the letter.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, writing on the paper
OUTPUT: PNG, 112x112 (square), highest quality. Make 3 to 4 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠 / 有漸層 | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the icon on flat green.` |
| 圖示裡出現文字或數字 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 圖示太細、縮小後看不清 | `Make the symbol bolder and simpler: thicker outline, higher contrast, larger shapes, fewer small details, so it stays readable at 38x38 pixels.` |
| 一次出了很多個圖示 | `Draw exactly ONE single icon, centred, on the flat green background. Do not draw a sheet or several variants.` |
| 紙上出現字 | `The paper must be completely blank: no writing, no lines of text.` |

---

## G-18　結局插畫 x2（18a 重組星星 / 18b 釋放碎片）｜P2（取決於劇情）

- **最終檔名**：`ending_1.webp / ending_2.webp`　**遊戲內尺寸**：960x540
- **輸出規格／建議張數**：各 1920x1080，不去背；分開輸出；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_story_1.png`（風格：黃昏星光塔）；`ref_title_hero.png`（18a 少年外觀）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：無（全新）。風格參考 story_1：細深色輪廓、柔和賽璐珞、漸層天空、金色切面四芒星。

**多步驟 / 一致性**：18a、18b 各自完整；兩段都重述了金色星星與黎明配色（粉紅＋金）。**可選加強**：先通過 18a 後，把它一起上傳再產 18b 以統一光色。

**G-18a 重組星星**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon storybook illustration in the style of MapleStory (Nexon) key art: thin, clean, uniform-weight dark outline, soft cel shading with only 2 to 3 tone steps, saturated but harmonious colours, softly painted skies allowed, one clear consistent light source, no photorealism, no 3D-render look, no heavy blur. Wide 16:9 landscape, full-bleed illustration filling the entire image: no border, no frame, no letterbox bars, no comic panels, no captions, no text, no letters, no watermark, no signature.
THE BOY (the hero): a young thief boy with short messy spiky black hair, a dark navy-blue (#1f2547) hood with thin gold trim pushed DOWN onto his shoulders (hair visible), a bright red (#b3262a) scarf, brown leather armour; seen from behind and slightly from the side.
ENDING ILLUSTRATION: dawn. The boy stands on a grassy hill looking up at a restored, glowing golden four-pointed star (faceted, bright yellow-gold with a white core) in the sky. He is bathed in warm light from the star and casts NO shadow on the ground. A soft pink and gold dawn sky, a distant quiet town and a round stone watchtower on the horizon, a few drifting golden sparkles. Peaceful, hopeful mood. Only this one character appears.
NEGATIVE (avoid): photorealistic, 3D render, text, captions, letters, watermark, signature, frame, border, multiple panels, comic panels, blurry, gore, blood, monsters, extra people
OUTPUT: 16:9 landscape (1920x1080 if possible), RGB, no transparency. Make 3 variants.
```

**G-18b 釋放碎片**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon storybook illustration in the style of MapleStory (Nexon) key art: thin, clean, uniform-weight dark outline, soft cel shading with only 2 to 3 tone steps, saturated but harmonious colours, softly painted skies allowed, one clear consistent light source, no photorealism, no 3D-render look, no heavy blur. Wide 16:9 landscape, full-bleed illustration filling the entire image: no border, no frame, no letterbox bars, no comic panels, no captions, no text, no letters, no watermark, no signature.
ENDING ILLUSTRATION: dawn over a quiet continent seen from high above: forests, a winding river, mountains, a small town with a tall round stone tower, and thousands of small golden star shards drifting upward and outward like fireflies across the whole landscape, each leaving a faint glowing trail; the sky turns from deep blue at the top to soft pink and gold at the horizon. Calm, bittersweet and hopeful mood. No characters at all.
NEGATIVE (avoid): photorealistic, 3D render, text, captions, letters, watermark, signature, frame, border, multiple panels, comic panels, blurry, gore, blood, characters, monsters
OUTPUT: 16:9 landscape (1920x1080 if possible), RGB, no transparency. Make 3 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 出現文字、字幕、邊框、漫畫分格 | `Remove all text, captions, borders and panel divisions. One single full-bleed illustration with no frame.` |
| 風格變寫實或 3D | `Redraw as a hand-painted 2D cartoon storybook illustration with thin dark outlines and soft cel shading, not photorealistic and not 3D-rendered.` |
| 比例不是 16:9 | `Make it a wide 16:9 landscape image filling the whole frame, with no letterbox bars.` |
| 多出不該有的角色 | `Remove every extra character and creature; only the characters named in the description may appear.` |

---

## G-19　星光之塔（未點亮版）｜P2（取決於劇情 / 選配）

- **最終檔名**：`prop_star_tower_dark.png`　**遊戲內尺寸**：185x420
- **輸出規格／建議張數**：約 740x1680，綠底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_prop_star_tower_x4.png`（現有點亮版）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：a tall round stone watchtower built of beige-tan (about #bda98a) stone blocks with visible mortar lines and a few small cracks; a crenellated top with chunky battlement blocks and a row of small stone brackets under the parapet; dark olive-green ivy vines climbing up the left side, the centre and the lower right of the tower; one arched window with a stone sill in the upper left part and one smaller arched window lower on the right; an arched wooden door (warm brown, with an iron ring handle) in a stone arch frame at the bottom with one stone step; the tower is slightly wider at the base. Floating above the top, a small faceted golden four-pointed star (about #f5d142 with lighter facets) when the tower is lit.

**要改什麼**：同一座塔同構圖，塔頂沒有金星、改成空的暗淡星形燈座，窗戶暗，色調偏冷暗。

**G-19 未點亮的塔**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): 2D hand-painted cartoon game prop in the style of MapleStory (Nexon). Thin, clean, uniform-weight dark (near-black brown) outline, soft cel shading with only 2 to 3 tone steps per colour, small crisp light highlights, saturated but harmonious colours, light from the upper-left with cooler shadows to the lower-right. No realistic textures, no 3D-render look, no blur. Slight side view, the bottom edge of the object is flat so it can sit on the ground, nothing cropped, centred.
FOR YOUR UNDERSTANDING, the original lit version of this tower: a tall round stone watchtower built of beige-tan (about #bda98a) stone blocks with visible mortar lines and a few small cracks; a crenellated top with chunky battlement blocks and a row of small stone brackets under the parapet; dark olive-green ivy vines climbing up the left side, the centre and the lower right of the tower; one arched window with a stone sill in the upper left part and one smaller arched window lower on the right; an arched wooden door (warm brown, with an iron ring handle) in a stone arch frame at the bottom with one stone step; the tower is slightly wider at the base. Floating above the top, a small faceted golden four-pointed star (about #f5d142 with lighter facets) when the tower is lit.
SUBJECT: draw THIS SAME TOWER (same shape, composition, proportions, ivy, windows, door and stone colour, tall portrait aspect about 11:25) in its UNLIT STATE: NO golden star above it; instead, at the very top of the tower, an empty dark star-shaped lantern cradle (dull grey-blue stone, with a star-shaped hollow); the windows are dark; the overall colours are slightly colder and dimmer, with deeper ivy shadows. The bottom edge is flat so it sits on the ground.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, uniform, pure green #00FF00 (RGB 0, 255, 0) chroma-key colour: no gradient, no noise, no vignette, no texture, no floor, no ground line, no scenery, no border, no cast shadow or contact shadow under the feet, and no glow or light spilling onto the green. Because green is removed later, do NOT use any green on the subject itself. Do not draw any text, letters, numbers, signature or watermark. The ivy must be a dark olive green (about #4a5a30) that is clearly different from the pure green #00FF00 background.
NEGATIVE (avoid): photorealistic, 3D render, blurry, text, letters, numerals, watermark, multiple items, ground shadow, white background, gradient background, checkerboard, golden star, glow, scenery
OUTPUT: PNG, tall portrait about 11:25 (e.g. 740x1680), highest quality. Make 3 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純綠（有漸層、場景、地面、發光） | `Redo it. The background must be ONLY one perfectly flat, uniform pure green #00FF00 with no gradient, no floor, no scenery, no glow and no shadow. Nothing except the subject on flat green.` |
| 主體被畫進場景裡（例如 Boss 畫進王座房） | `Remove the room and every piece of scenery completely. Draw only the character on a perfectly flat pure green #00FF00 background, no throne, no floor, no walls.` |
| 有文字／字母／浮水印 | `Remove all text, letters, numbers, symbols, watermark and signature completely. The image must contain no writing at all.` |
| 主體身上有綠色，或邊緣有綠光 | `Do not use any green on the subject. Remove the green glow around the edges; keep a crisp dark outline against the flat green.` |
| 比例不對（太寫實、太高、頭太小） | `Redraw in MapleStory chibi proportions: the head is about 40 percent of the total height, the body is small, about 2.5 heads tall, thin dark outline, soft cel shading.` |
| 沒有面向右 / 被裁切 | `Show a side view facing RIGHT, the full body inside the frame with a generous flat green margin on every side, nothing cropped.` |
| 腳下有地面陰影 | `Remove the shadow under the feet completely; the subject floats on the flat green with no shadow at all.` |
| 塔頂還是有星星或發光 | `Remove the golden star and every glow completely; the top is an empty, dark star-shaped cradle.` |

---

## G-20　稀有怪金色光環｜P2（取決於劇情）

- **最終檔名**：`fx_rare_aura.png`　**遊戲內尺寸**：96x96（每格）
- **輸出規格／建議張數**：橫排 6 格 1152x192，純黑底；每個提示詞建議產 2～4 個版本（內文 OUTPUT 行也有寫）
- **若 Gemini 支援上傳圖片，請附**（檔案在 `docs/asset-requests/ref/`）：`ref_fx_boss_aura.png`（現有特效風格：紫色火焰環）
- **沒有圖片也可僅依文字產出**：下方提示詞已完整描述外觀，不需要任何參考圖。

**原圖長相**：現有 boss 氣場是 4 格橫排、細紫色火焰圓環，中空。新圖改為金色、閃光、6 格循環。

**多步驟 / 一致性**：若 6 格排不好，改產單格；我來組動畫。

**G-20 金色光環**（整段複製貼上；可單獨貼到全新對話）

```
If reference images are attached, match their art style, proportions and colours. If no image is attached, rely only on the written description below; everything needed is written here.
ART STYLE (apply strictly): game visual-effect sprite sheet in a MapleStory-like painterly cartoon style, bright glowing saturated colours. NO character, effect only, no text, no letters, no watermark. Nothing may touch the image borders.
BACKGROUND RULE (very important): the whole background is ONE perfectly flat, pure black #000000: no gradient, no vignette, no floor, no scenery, no border. The black will be removed by additive blending, so the effect itself must be bright and glowing and must not contain pure black. No text, no watermark.
LAYOUT: one horizontal sprite sheet with exactly 6 frames in one row, evenly spaced, each frame the same size, the effect at the same position and same overall size in every frame. Overall the image is very wide (aspect 6:1). If a single row of 6 is impossible, draw ONE frame only, centred.
SUBJECT: a soft golden sparkle aura RING (a hollow ring, empty in the centre so a monster can be seen through it): a gentle warm gold (#f5c842) glow with small four-pointed gold sparkles that twinkle and drift upward; the ring slowly pulses between frames (slightly larger and brighter, then smaller) so the 6 frames loop seamlessly. For style comparison only: the game's existing boss aura is a thin violet flame ring on a transparent background.
NEGATIVE (avoid): character, creature, text, watermark, photorealistic, 3D render, blurry, white background, grey background, gradient background, scenery, floor, frames of different size, solid centre
OUTPUT: PNG, 1152x192 total (6 frames of 192x192) if possible, pure black background. Make 2 to 3 variants.
```

**失敗時常見問題與修正句**（貼在 Gemini 的下一句，不用重貼整段）

| 狀況 | 貼這句（英文） |
|------|----------------|
| 背景不是純黑（灰、有漸層、有場景） | `Redo it. The background must be ONLY one perfectly flat pure black #000000, no gradient, no grey, no scenery, no floor.` |
| 各格大小或位置不一致 | `Make all frames exactly the same size, evenly spaced in one horizontal row, the effect centred in each frame at the same position and the same overall size.` |
| 畫出了角色或文字 | `Remove every character and all text. Draw the glowing effect only.` |
| 效果碰到畫面邊緣 | `Shrink the effect so there is clear black margin around every frame; nothing touches the image border.` |
| 只出得來單格 | `If a full row is not possible, draw ONE single frame of the effect centred on pure black; I will build the animation myself.` |

---

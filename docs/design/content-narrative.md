# 內容與敘事設計審查：世界、劇情、任務、NPC、探索

> 審查視角：世界、故事、任務、NPC、內容多樣性、探索。依據 `maps.js`、`quests.js`、`monsters.js`、`dungeons.js`、`shards.js`、`TutorialScene.js`、`npcDialog.js`、`WORLD_DESIGN.md`、`ROADMAP.md`。未改任何程式或素材。
> 與他處的分工：怪物攻擊、技能平衡、傳送門 / 世界地圖、經濟與 UX 由其他審查處理，本文只提主題與機制點子。

---

## 一、現況診斷

**1. 骨架好，血肉缺。** 有主線（5 碎片 → 點亮星光之塔 → `requireBoss` 傳送門），但故事只存在於「教學 4 頁」與「塔的對話」，中間 40 級沒有人再提魔君。
- 教學說魔君在「古代廢墟地底甦醒」，但 `ruins` 的 NPC `npc_new_3`（廢墟探險家）只講「小心骷髏」，任務是 `reach_ruins` / `skeleton_purge`。劇情起點的地圖毫無劇情。
- 教學說老陳交給玩家短劍和飛鏢，`npc_merchant` 老陳在遊戲裡卻只說「歡迎光臨雜貨店！」。第一個承諾沒有兌現。
- 玩家對魔君的認識到最終 Boss 為止是零：沒有任何 NPC 提到他的動機、長相、過去。`BossScene` 只有「暗影魔君降臨」，`GameOverScene` 勝利只有「恭喜您擊敗了暗影魔君！」，沒有結局。

**2. 劇情斷層。** Lv1-17（sky、forest、ruins）與 Lv14-29 的支線（mystic、alley、taipei）全是「打 N 隻」。第一塊碎片在 Lv22 的碧濤港才出現。轉職鏈（job_call 到 job_awaken）是唯一有敘事的任務鏈，但長老只說「影子裡藏著力量」，沒提星光或魔君。

**3. 後四張圖模板重複。** harbor、desert、snow、lava、castle 都是「kill N / talk NPC / 擊敗 Boss」三步同一格式（`harbor_captain`、`desert_sandworm`、`snow_giant`、`lava_dragon_hunt`、`castle_commander`，各 `requires` 前一個 talk）。talk 任務的 NPC 對話文字只有 1 行（如 `npc_miner`、`npc_ghostmaid`），任務描述承諾「去問團長的事」，但 `castle_maid` 完成後沒有任何內容揭露。承諾比交付大。

**4. 任務類型單一。** 型別有 kill / reach / talk / choice / collect / dungeon，實際上 collect 只用在 `job_proof`，dungeon 只用在 `job_trial`，choice 只用在轉職。獎勵只有 exp + meso（`advanceJob` 例外），沒有物品、稱號、外觀。

**5. 支線地圖沒有身分。** mystic（神秘之境）、alley（暗巷城）、taipei（台北）的 NPC 是通用嚮導，對話像導覽簡介（`npc_new_1`、`npc_new_4`、`npc_new_5`）。台北是具辨識度的在地題材（夜市、捷運），卻沒利用。

**6. 探索內容幾乎為零。** 每張圖都是 2560 寬、3 層平台、固定怪物數，沒有寶箱、隱藏區、稀有怪、可調查物件。`mimic`（飛魚寶箱）是唯一「寶箱」，卻是怪物。

**7. 副本只有兩個。** `slime_cave`（3 波）與 `shadow_trial`（1 隻守衛 + 2 史萊姆）。WORLD_DESIGN 規劃的 5 個區域副本尚未做。

**8. 優點，要保留。** 任務、NPC `questIds`、`talk` 對話、`requires` 鏈、碎片系統、`modifier` 地圖機制都是資料驅動；加內容主要是加資料。四個主題機制（流沙、冰、岩漿、暗黑）已讓各區玩起來不同，故事應該強化它們，不是另起爐灶。

---

## 二、故事骨架

### 核心設定：「影子是星光的另一半」

晨曦之星不是單純的光源。它每一百年需要一個「影子」承載它的重量（光越亮，影子越深），歷代影子都在年輕時耗盡。**暗影魔君曾是上一代影子**，名叫**夜渡**（可只在後期揭露）。他發現星光正在殺死承載它的孩子，所以打碎星星，想讓這份重量不再落在任何人身上。他把碎片交給五位他信得過的守護者保管，不是掠奪，是託付。碎片的暗影侵蝕是副作用：星光失去載體後會外溢，讓守護者與怪物狂暴。

玩家的角色名叫「影子」，這不是巧合：玩家是下一代的影子。教學第 4 張插畫（少年接下最後一塊碎片）因此成為伏筆。

### 玩家逐步得知什麼

| 階段 | 玩家以為 | 實際線索 |
|---|---|---|
| 教學 | 魔君偷星星，邪惡 | 插畫 2 的魔君表情不是勝利，是痛苦 |
| 1-2 號碎片 | 守護者被暗影污染 | 守護者留有「夜渡的信」，字跡溫柔 |
| 3-4 號碎片 | 魔君在掠奪 | 山寺僧侶、鐵匠都說「他來過，是他請我們保管」 |
| 5 號碎片 | — | 幽靈女僕揭露夜渡是這座城的末代王，也是團長的摯友 |
| 塔點亮 | 要打 Boss 了 | 影之長老坦承：「我是他的師妹。你就是下一個。」 |
| 最終戰 | 擊敗反派 | 魔君不是想贏，是想確認你是否準備好 |

### 各區域節拍與守護者

| 區域 | 節拍 | 守護者為何持有碎片 | 簽名機制（主題，實作由他人） |
|---|---|---|---|
| sky 1-8 | 新手村：傳聞星星碎了，「天上的雲開始變重」 | — | — |
| forest 5-12 | 動物變得暴躁，獵人說牠們「聞到了碎片的氣味」 | — | — |
| ruins 9-17 | **起點揭露**：地底有一扇被從內部打開的石門，不是被破壞，是被「請」開的 | — | 可調查的石門，後期回來有新對話 |
| harbor 14-20 | 海盜船長「鐵鉤」為了救被詛咒的船員，抱住碎片求星光解咒；幽靈船是被碎片拉來的 | 他是自願的，老水手是他的大副，要你「帶他回家」 | 召喚幽靈船員、鐵鉤拉回玩家（鉤索拉扯）|
| desert 20-26 | 沙塵巨蟲吞下碎片護住綠洲；星光衰弱後綠洲乾涸，牠才出洞 | 夜渡託付：「讓綠洲活著」 | 鑽沙、從流沙區冒出，逼玩家不要站在沙坑 |
| snow 25-31 | 冰霜巨人是山寺的敲鐘者，碎片的寒光凍住了牠的記憶，只會敲鐘 | 僧侶每天供奉他 | 以鐘聲震波節奏 + 冰面滑行讓玩家走位 |
| lava 30-36 | 熔岩龍是鐵匠親手孵大的，碎片是它的「第二顆心」 | 鐵匠鍛造過星塔的燈罩，欠星光一個人情 | 噴發預警與龍息疊加，玩家需躲上平台 |
| castle 35-42 | 墮落騎士團長艾德，夜渡的摯友，被暗影附身但仍在守門 | 夜渡臨走前的命令：「守住最後一塊，等一個能扛起它的人」 | 暗角視野，只有燭台下看得清團長的招式前搖 |
| boss 45+ | 夜渡 | — | 三階段：第一階段是魔君、第二階段回憶幻象（對應五守護者各一招）、第三階段脫去暗影 |

### 結局與餘韻

- 最終戰後，夜渡在倒下前說：「你扛得住嗎？……那就好。」並給玩家選擇：
  - **重組晨曦之星**：星光回歸，玩家成為新的影子（稱號「晨曦之影」），代價是玩家角色從此在星光下沒有影子（畫面特效）。
  - **釋放星光**：碎片化為光點散入大陸，所有區域守護者恢復原形，不再有影子。稱號「無影之人」。
- 兩種結局都回到晨曦鎮，塔頂長出新的東西。
- **後續鉤子**：結局後長老留下一句「碎片在你胸口還有一塊。第六塊從來就不在塔裡。」開啟二轉內容（見第七節）與每週挑戰。

---

## 三、任務清單與 NPC 聲音

### 3.1 新任務類型（先用現有引擎，再加少量新型別）

| 型別 | 用現有引擎? | 說明 |
|---|---|---|
| kill / collect / talk / reach / dungeon / choice | 是 | 現有 |
| collect 擴大使用 | 是 | `collect.maps` + `dropRate` 已可用，每區 1 條 |
| 多步 talk 鏈 | 是 | `requires` 串 3-4 個 talk，每步一位 NPC，當作「小故事」|
| 隱藏任務 | 小改 | 新增 `hidden: true`，任務不出現在 NPC 清單，靠調查物件觸發 |
| 計時 | 小改 | 新增 `timeLimit`，倒數內達成 |
| 護送 escort | 新 | NPC 跟隨玩家到目的地（reach 的變體） |
| 防守 defend | 新 | 站定守 60 秒（可重用 dungeon 波次系統） |
| 抉擇後果 | 小改 | `choice` 擴大，選項寫入 `gameState.flags`，影響後續對話與獎勵 |
| 每日委託 | 小改 | 布告欄，每天 3 個隨機 kill / collect，WORLD_DESIGN 的 G |

另需擴充 `rewards`：`item`（裝備 / 藥水）、`title`、`flag`、`unlockMap`。

### 3.2 各地圖任務（新增，粗體為建議優先）

| 地圖 | 任務 ID / 標題 | 給予者 | 目標 | 獎勵 | 對話 |
|---|---|---|---|---|---|
| town | **`town_dagger` 老陳的短劍** | 商人老陳 | talk 老陳（教學兌現），贈短劍與 5 瓶紅藥 | 藥水 x5 | 「這把短劍是我年輕時用的。別看它舊，替我偷回一點光。」 |
| town | `town_tower_hint` 塔下的低語 | 星光之塔 | reach shrine | 稱號「聽見星光的人」 | 「……有人在塔裡呼吸。」（塔是活的） |
| sky | **`sky_letter` 雲端的信** | 島嶼義工 | collect 3 個「雲絮」（蝸牛、史萊姆掉）交給她 | exp + 10 藥水 | 「天上的雲變重了。傳說星星碎了，你相信嗎？」 |
| sky | `sky_hidden_bird` 迷路的浮雲鳥（隱藏） | 平台上的雛鳥物件 | 護送雛鳥到右端 | 外觀「雲絮披肩」 | 「啾……」 |
| forest | **`forest_scent` 碎片的氣味** | 獵人協會員 | collect 5 個「異味蘑菇」 | exp + 野豬牙 | 「牠們不是發瘋，是聞到了什麼。你帶這個去廢墟問問。」 |
| forest | `forest_boar_king` 野豬王的挑戰（計時） | 獵人協會員 | 90 秒內擊敗 3 隻 boar | 獵人護腕 | 「野豬王在看著你。他不喜歡磨蹭的人。」 |
| ruins | **`ruins_door` 被請開的門** | 廢墟探險家 | reach 石門 → talk 探險家 | 稱號「門前的旅人」 + 地圖記錄 | 「這扇門沒有撬痕。有人客客氣氣地進去過。」 |
| ruins | `ruins_scroll` 失落的卷軸（收集） | 探險家 | 找到 3 個可調查石碑（lore） | 卷軸圖鑑 | 「第三塊石碑上寫：影子是星的重量。我不懂。」 |
| mystic | **`mystic_mimic_who` 誰是真箱子** | 神秘嚮導 | kill 3 mimic 後，開啟 1 個真寶箱 | 稀有裝備 | 「箱子會說謊，但真的那個，會安靜。」 |
| mystic | `mystic_dragon_egg` 護送龍蛋 | 神秘嚮導 | 護送龍蛋至入口 | 寵物蛋外觀 | 「別讓媽媽發現。」 |
| harbor | **`hb_first_mate` 大副的請求**（取代 harbor_sailor 的單純 talk） | 老水手 | talk 老水手 → collect 4 個「船員的銀鈕扣」（pirate_ghost 掉） | exp + 銀鈕扣勳章 | 「我是他的大副。這些扣子是兄弟們的。把船長帶回來，不是殺了他。」 |
| harbor | `hb_cargo_defend` 守住貨箱 | 碼頭工人 | 守 60 秒，貨箱 HP 條 | 水手帽 | 「螃蟹們又來了，這次我們一起撐住！」 |
| desert | **`ds_dry_oasis` 乾涸的綠洲**（取代 desert_caravan 單句） | 商隊領隊 | talk → reach 綠洲遺址 → talk | 水壺（回 MP 道具） | 「三年前這裡是湖。那條蟲不是來吃人，是來守水。」 |
| desert | `ds_inscription` 壁畫三連 | 考古學家 | 調查 3 面壁畫（lore） | 稱號「文字的朋友」 | 「這幅畫……一個黑衣人把東西遞給巨大的蟲子。他在鞠躬。」 |
| snow | **`sn_bell` 沒有人敲的鐘** | 山寺僧侶 | talk → collect 3 個「冰晶碎片」→ 敲鐘 | 禦寒披風 | 「巨人以前每天敲鐘。現在牠只會敲，不記得為什麼敲。」 |
| snow | `sn_lost_hiker` 雪中失蹤者（計時 + 護送） | 雪原巡守員 | 在暴風雪前護送旅人回山寺 | 暖手爐 | 「再不走，冰就裂了。跟著我的腳印，別踩白色的地方。」 |
| lava | **`lv_scale` 一片龍鱗** | 熔爐鐵匠 | 擊敗熔岩龍後，把鱗片交給鐵匠 | 「龍鱗匕首」 | 「我孵牠的時候牠才這麼大。別殺牠。……好吧，替我留一片。」 |
| lava | `lv_ore_run` 礦工的最後一車（計時） | 礦工 | 60 秒內避開噴發，運送礦石至出口 | 礦工頭燈 | 「地一紅就跳！我就是這樣丟了半個肩膀。」 |
| castle | **`cs_maid_story` 女僕的茶**（取代單句 castle_maid） | 幽靈女僕 | talk → reach 三處燭台（lore） → talk | 稱號「王城的客人」 | 「他們小時候一起偷過我的糖。一個成了王，一個成了騎士。」 |
| castle | `cs_prisoner_choice` 囚牢的鑰匙（抉擇） | 被囚的騎士 | 選擇：放走他（他死於追兵）或留他（他幫你守門） | 騎士劍 / 盾 | 「我是團長的副手。給我一把劍，或者把我鎖好。你決定。」 |
| alley | `alley_night_watch` 夜巡（每日） | 地下城嚮導 | 夜間擊殺 city_beast | 暗巷通行證 | 「夜裡的暗巷，亮的地方才安全。」 |
| taipei | **`tp_night_market` 夜市失物** | 台北導遊 | collect 3 個失物（city_elite 掉）還給 3 位攤商 | 夜市小吃（回血）| 「老闆的錢包，阿嬤的戒指……每一樣都有人在等。」 |
| taipei | `tp_mrt_secret`（隱藏） | 捷運站旁的舊廣告機 | 輸入 7-3-5 順序踩三塊地磚 | 外觀「捷運悠遊卡」 | 「歡迎搭乘。下一站：不存在。」 |
| shrine | `sh_elder_memory` 長老的記憶 | 影之長老 | 塔點亮後 talk | 轉職二階任務鏈開端 | 「我是他的師妹。你的路他走過。」 |

### 3.3 NPC 聲音表

| NPC | 地圖 | 聲音 | 小弧線與範例 |
|---|---|---|---|
| 商人老陳 | town | 嘮叨、務實、嘴硬心軟 | 每擊敗一個守護者換新台詞。初：「賒帳免談。」中：「欸，你的臉怎麼比上次亮？」末：「其實那把短劍是我的兒子留下的。」 |
| 技能導師 | shrine | 簡短、禪意、不給答案 | 「出招太快，你就聽不見自己。」第 20 級後：「你的影子比你早半步。」 |
| 影之長老 | shrine | 溫柔、遲疑，藏著愧疚 | 初期說「影子裡藏著力量」。揭露後：「我沒資格教你。我只是他沒說完的話。」 |
| 老水手 | harbor | 豪邁、粗話軟化成哽咽 | 「四十年了，我還記得他罵我的方式。」擊敗船長後：「謝了，孩子。這杯酒我替他喝。」 |
| 碼頭工人 | harbor | 嘴碎、愛抱怨 | 「螃蟹加班費誰付！」 |
| 考古學家 | desert | 興奮、語無倫次、愛打岔 | 「別碰那塊！……好吧，碰一下，輕一點。你看這裡的刻痕——對不起我又說多了。」 |
| 商隊領隊 | desert | 精打細算、守信用 | 「我賣水，不賣謊。這條蟲沒你想的壞。」 |
| 山寺僧侶 | snow | 平靜、偶爾冷幽默 | 「冷嗎？心不冷就好。……我的腳趾已經沒了。」 |
| 雪原巡守員 | snow | 簡潔、實戰 | 「別踩白色的地方。那不是雪。」 |
| 熔爐鐵匠 | lava | 暴躁、手藝人、自責 | 「又斷了？不是我的鐵不行，是你太急。」揭露後：「那顆蛋是我孵的。我不會原諒我自己。」 |
| 礦工 | lava | 開朗、黑色幽默 | 「我挖了二十年，頭頂只掉過三次岩石。第三次是今天。」 |
| 被囚的騎士 | castle | 古板、忠誠、疲憊 | 「我曾以為劍是用來揮的。後來發現，是用來守的。」 |
| 幽靈女僕 | castle | 優雅、碎碎唸、帶點寂寞 | 「兩位少爺偷了我的糖，一個當了王，一個當了騎士。……糖還在抽屜裡。」 |
| 島嶼義工 / 獵人協會員 | sky / forest | 熱心、新手向導 | 要有口頭禪，如義工「雲會記得你」。 |

### 3.4 NPC 服務提案

現有：商店（`shop`）、轉職、導師（無重置，見 npcDialog 註記）。建議：
- **熔爐鐵匠**：裝備強化 / 修理（用掉落材料與 meso，成功率可見）。
- **技能導師**：技能重置（花 meso，Lv 越高越貴），目前缺這項。
- **商隊領隊 / 老水手**：單向快速旅行到「已到過的」港口與沙漠（配合另一 agent 的世界地圖）。
- **老陳**：收購怪物雜物（分類）。
- **幽靈女僕**：把怪物掉落做成茶點增益（短時加成）。
- **布告欄（town）**：每日委託。

---

## 四、探索、收藏與事件

**1. 可調查物件（F 鍵互動，重用 NPC 互動框架，不需要新系統）**
- `ruins` 的石碑 x3、`desert` 的壁畫 x3、`castle` 的燭台畫像 x3：每個一句 lore，集齊後在 town 給稱號。
- 合計「傳說殘頁」15 張，放進暫停選單的「圖鑑」，集 5/10/15 張給永久小加成。

**2. 隱藏平台與破牆**
- 平台高度已固定兩層，可在 2560 寬的地圖兩端各加一個「高層外側平台」，放寶箱。入口提示：地面有一點閃光。
- 薄平台（`thin`）已能下穿；可做「站立 3 秒下穿出現地下層」。

**3. 寶箱**：每圖 1-2 個，每天重生，內容為該區域的藥水 / 材料；小心 `mimic` 偽裝（mystic 以外也偶爾出現，製造驚喜）。

**4. 稀有怪**：每圖 1 隻，每 10-15 分鐘低機率出現，頭上有金色光點。例：sky 的「金蝸牛」、harbor 的「幽靈船長影」、snow 的「白毛雪怪」。掉落外觀道具。

**5. 彩蛋（遊戲內可見，不是隱藏下載）**
- town 的星光塔在夜間（遊戲計時）會輕微呼吸。
- 在 sky 站在最高層平台 30 秒，雲朵會排成「星」字。
- shrine 連按導師 7 次，他會說：「別吵，我在冥想。」

**6. 地圖事件**
- 天氣：snow 暴風雪 / harbor 起霧 / desert 沙塵暴，只改粒子與視野，安全。
- 日夜：用遊戲時間 10 分鐘一輪，只換背景色疊層，夜間 `city_beast` 數量 +50%（alley 的 `beast_hunt` 因此有意義）。
- 事件怪：每圖每 15 分鐘「入侵」一波，全地圖提示，擊敗給額外獎勵。

---

## 五、副本與守護者變化

| 副本 | 型態 | 內容與敘事 |
|---|---|---|
| `slime_cave`（現有） | 生存波次 | 保持，作為新手訓練 |
| `shadow_trial`（現有） | 單 Boss | 加 20 秒開場對話：試煉守衛其實是長老的幻影 |
| 船艙突圍 harbor Lv18 | 逃脫賽跑 | 船沉水，限時往上爬，躲幽靈手 |
| 金字塔密室 desert Lv25 | 機關謎題 | 三個壓力板按對順序，錯了落沙坑 |
| 冰窟 snow Lv30 | 滑行迷宮 | 利用冰面慣性衝到對岸 |
| 熔爐核心 lava Lv36 | Boss 連戰 | 3 隻小熔岩 + 龍幼體，鐵匠視角，少量彈幕 |
| 王城地牢 castle Lv42 | 守衛戰 | 守住囚牢 90 秒，被囚騎士是需要保護的目標 |
| 夜渡的試煉（endgame） | Boss Rush | 連打 5 守護者的「記憶幻象」，每隻只有招牌一招 |

守護者記憶點：每個守護者在 30% HP 時暫停，說一句遺言台詞（對應 NPC 弧線）；擊敗後掉落「夜渡的信」殘頁（一人一句，集齊可拼成完整信件，是真相的線索）。

---

## 六、前 15 分鐘

**現況問題。** 標題畫面後直接進入 4 頁插畫 + 按鍵頁 + 3 頁文字說明，共約 8 頁文字牆；2 與 4 號插畫尚缺，目前用 emoji 頂著。進入 sky 後 NPC 只給「史萊姆獵手」（5 隻），沒有引導接技能、沒有第一個驚喜。Lv10 轉職的信（`job_call`）靠 town 居民，但玩家未必回得去 town；長老也說「Lv10 再來」，但沒有強迫提示。

**建議流程。**

| 時間 | 目標 | 做法 |
|---|---|---|
| 0-3 分 | 立即動手 + 一個鉤子 | 教學縮成 2 頁故事（星碎 + 影子接下碎片）+ 實戰提示在遊戲中（頭頂箭頭提示）。進入 sky 時天空有一顆流星墜入遠處，島嶼義工說：「剛剛那是什麼？」第一隻怪 3 秒內可遇。第一次擊殺顯示「按 Z 試試三連飛鏢」。 |
| 3-8 分 | 第一次升級、第一個任務、第一個小驚喜 | 升到 Lv3 前完成 `sky_letter`，獎勵給第一瓶藥水；Lv5 解鎖暗影步伐時彈出簡短演出；平台上藏一個發光寶箱（隱藏平台教學）。 |
| 8-15 分 | 第一個選擇 + 轉職預告 | 到 forest 時獵人說「廢墟那邊有扇不尋常的門」，Lv8 玩家已有進廢墟的動機。Lv10 時畫面中央提示：「有人在鎮上等你」，信自動出現在背包，不再依賴找居民。轉職鏈 4 步內加入 2 句關於星光的暗示：「你身上有星光的氣息。」 |

**教學插畫（4 張）**
1. 星光塔：晨曦之星懸在塔頂（已有）。
2. **缺**：魔君奪星，雙手捧著星星，面容痛苦（不是勝利）。
3. 小鎮陷入黑暗（已有）。
4. **缺**：戴兜帽的少年（影子）接過最後一塊碎片，長老在旁。

---

## 七、二轉與終局概要

- **Lv30 二轉**：「夜渡之影」任務鏈，長老揭露後觸發。四個職業（影殺者 / 暗夜使者 / 盜賊王 / 暗影遊俠）各一個。步驟：talk 長老 → 蒐集 5 張「夜渡的信」殘頁 → 王城地牢副本 → 抉擇（如何看待夜渡）→ 覺醒。
- **終局狀態**：Lv50、五件區域套裝（WORLD_DESIGN C）、圖鑑完成、15 張傳說殘頁、兩個結局都看過。
- **終局內容**：Boss Rush（夜渡的試煉）、每週首領（守護者強化版）、每日委託、稀有怪、稱號。
- **後續鉤子**：第六塊碎片在玩家胸口，是下一章（海外 / 星之海）的伏筆。

---

## 八、需要新美術（依優先順序）

風格共通：hand-painted chibi, thin dark outline, soft cel shading; character sheets on flat #00FF00 green.

| 優先 | 素材 | 英文提示詞 |
|---|---|---|
| P0 | 教學插畫 2：魔君奪星 | `Story illustration, hand-painted style, a tall dark hooded lord holding a glowing shattered star in both hands, expression painful and sorrowful not triumphant, night sky, soft cel shading, thin dark outline, 16:9` |
| P0 | 教學插畫 4：少年接碎片 | `Story illustration, hand-painted chibi style, a small hooded boy in a dark cloak receiving a glowing golden star shard from an old robed elder, warm light on faces, dark town background, thin dark outline, soft cel shading, 16:9` |
| P1 | 夜渡（魔君）立繪 | `Character sheet, hand-painted chibi, dark armored lord with a torn cape and a cracked golden crown, eyes tired and kind, thin dark outline, soft cel shading, flat #00FF00 green background, front, side, back views` |
| P1 | 可調查石碑 / 壁畫 / 燭台畫像 | `Game prop, hand-painted chibi, ancient carved stone tablet with glowing faint runes, thin dark outline, soft cel shading, flat #00FF00 green background` |
| P1 | 寶箱（關 / 開） | `Game prop sheet, wooden treasure chest with gold trim, closed and open with sparkle, hand-painted chibi, thin dark outline, soft cel shading, flat #00FF00 green background` |
| P1 | 夜渡之信 道具圖示 | `Item icon, folded old letter sealed with a small silver star, hand-painted chibi, thin dark outline, soft cel shading, flat #00FF00 green background` |
| P2 | 金色稀有怪光環 | `Sparkle aura effect sheet, soft golden glow, 6 frames in a row, hand-painted, black background` |
| P2 | 星光之塔 點亮前後 | `Game prop, tall stone watchtower with a dark empty lantern at top vs. glowing golden star lit tower, hand-painted chibi, flat #00FF00 green background` |
| P2 | 結局插畫（兩張） | `Ending illustration, hooded boy standing under a restored golden star with no shadow on the ground, hand-painted, warm light, 16:9` ／ `Ending illustration, star shards drifting as golden fireflies over a quiet continent at dawn, hand-painted, 16:9` |
| P3 | 老陳 / 長老 / 鐵匠 NPC 頭像 | `Portrait sheet, hand-painted chibi bust shots, elderly merchant, gentle robed elder, burly blacksmith, thin dark outline, soft cel shading, flat #00FF00 green background` |

---

## 九、提案總表

| ID | 提案 | 為什麼 | 影響(1-5) | 工作量 | 涉及檔案 | 需美術? |
|---|---|---|---|---|---|---|
| P-01 | 寫入「夜渡」設定與守護者信件 | 給主線意義 | 5 | M | `quests.js`, `maps.js`, `monsters.js` | 否 |
| P-02 | 老陳短劍任務兌現教學 | 降低開局落差 | 4 | S | `quests.js`, `maps.js` | 否 |
| P-03 | 後四區改為「小故事」多步 talk 鏈 | 打破模板重複 | 5 | M | `quests.js`, `maps.js` | 否 |
| P-04 | `rewards` 增加 item / title / flag | 任務更有味道 | 4 | M | `questManager.js`, `quests.js` | 否 |
| P-05 | 可調查物件（石碑、壁畫） | 低成本探索 | 4 | M | `BaseMapScene`, `maps.js` | 是(P1) |
| P-06 | 守護者 30% HP 遺言 + 掉信 | 讓 Boss 有記憶點 | 4 | S | `Boss.js` / `Monster.js`, `shards.js` | 否 |
| P-07 | 結局抉擇（兩種結局） | 情感出口 | 5 | M | `BossScene`, `GameOverScene` | 是(P2) |
| P-08 | 教學縮短 + 流星開場 | 前 3 分鐘留人 | 5 | M | `TutorialScene`, `SkyIslandScene` | 是(P0) |
| P-09 | 技能重置 + 鐵匠強化 | 服務深度 | 3 | M | `npcDialog.js`, 新 `blacksmith.js` | 否 |
| P-10 | 隱藏任務與寶箱 | 驚喜 | 3 | M | `quests.js`, `maps.js` | 是(P1) |
| P-11 | 護送 / 防守 / 計時型任務 | 玩法多樣 | 3 | L | `questManager.js` | 否 |
| P-12 | 區域副本（船艙、金字塔、冰窟等） | 長線內容 | 4 | L | `dungeons.js`, `DungeonScene` | 部分重用背景 |
| P-13 | 稀有怪與日夜 / 天氣 | 地圖活起來 | 3 | M | 場景檔 | 小 |
| P-14 | 傳說殘頁圖鑑 | 收藏動機 | 3 | M | UI, 存檔 | 小 |
| P-15 | 二轉任務鏈（Lv30） | 長期目標 | 5 | L | `quests.js`, `jobChange.js` | 是 |
| P-16 | alley / taipei / mystic 加入在地特色對話 | 支線有身分 | 2 | S | `maps.js`, `quests.js` | 否 |

---

## 十、三個階段的工作順序

1. **第 1 輪（低風險、高回報）**：P-02、P-01 的文字部分、P-16、P-06，全是資料與對話，不動系統。同步請 owner 出 P0 插畫 2、4，並進行 P-08 教學縮短。
2. **第 2 輪**：P-03（後四區重寫）、P-04（獎勵擴充）、P-05 + P-14（調查物件與殘頁），開始有探索與收集。
3. **第 3 輪**：P-07 結局、P-09 服務、P-10 隱藏任務；再評估 P-12 副本與 P-15 二轉。

### 不要做

- 不要在沒有劇情意義的情況下再加 kill N 任務。
- 不要為每個 NPC 做長篇對話樹；一句有個性的台詞勝過三頁導覽。
- 不要一次加全部新任務型別；先用 collect / talk / reach 串故事，再逐步加 escort / defend。
- 不要把真相放在冗長過場；用信、壁畫、NPC 一句話分散揭露。
- 不要為了結局再新增一張地圖。

### 待 owner 確認

1. 是否接受「魔君曾是上一代影子，打碎星星是為救孩子」這個轉折？它會改變 Boss 的氣氛。
2. 結局是否要兩種（重組 / 釋放），還是單一結局加後記？
3. 台北、暗巷城、神秘之境是否要納入主線，還是維持純支線？
4. 玩家名字「影子」是否固定？若要自訂名字，部分台詞要改。
5. 每日委託與稀有怪的重置時間依真實日期，還是遊戲內時間？
6. 在地化（台北夜市題材）要多強？

# Core Gameplay Integration And Gap Analysis

## Sources Integrated
- GAME_SPEC.md：設計意圖、架構、視覺語言、玩家/怪物/地圖/Boss/HUD/流程目標。
- ITERATION5_SPEC.md：目前版本基線、已完成項、已知缺口、下一步優先順序。
- 技能/技能設計.md：五個技能的視覺與數值設計基線。
- openspec-tw-legacy/specs/platform-alignment/spec.md：既有正式規格。
- openspec-tw-legacy/changes/update-character-platform-alignment/*：既有 active change、任務、設計與成功紀錄。

## Integration Decisions
- 將已驗證且已落地的能力整理進 current specs，避免把純設計願景誤寫成當前真相。
- 將技能效果與平台站位分成獨立能力，因為兩者會獨立迭代且驗證方式不同。
- 將 GAME_SPEC 中較宏觀的主流程、成長、Boss、HUD 與場景切換收斂到 core-gameplay。
- 保留 legacy change `update-character-platform-alignment` 為新版 active change，而不是直接封存，因為其任務清單與規格差異仍是可回查的工作脈絡。
- 將怪物分類提升為地圖主題驅動的正式規格，而不是只在 runtime catalog 中做資產盤點；分類先於地圖名單，地圖名單再依分類挑選。
- 將森林看台列為第一個圖片原生尺寸實體平台試點，避免所有長條平台都被固定高度框架壓縮後再貼圖。

## Gap Analysis
- GAME_SPEC 中仍有多項願景尚未在現況實作，例如 ESC 暫停選單、目標選取框、Level Up 全屏演出、Boss 第三階段狂暴視覺與 Town 商店正式主流程接入；這些未被寫成 current specs 的 MUST，而是保留為後續 change 的候選能力。
- 技能設計文件描述的是 Iteration 5 設計版本；近期對 Skill.js 的視覺增強已部分超出該文件，因此 combat-skills spec 以「目前已確認的技能體驗底線」為主，而不是完整複製舊設計稿的每個粒子參數。
- 舊版 openspec-tw 的 `project.md` 在新版 Fission OpenSpec 中改以 `openspec/config.yaml` 的 `context` 與 `rules` 承載，因此不再保留獨立 `project.md`。
- 舊版根目錄 AGENTS.md 以 `openspec-tw update` 生成，新版改為 `.github/prompts` 與 `.github/skills`；因此不直接沿用舊版 AGENTS，而是保留新版 GitHub Copilot 指令結構。
- 目前怪物名單雖然已有 runtime catalog，但仍偏向「有哪些圖檔被接進來」的盤點，而不是「哪些怪物應該出現在哪種地圖」的分類規格，因此地圖主題容易被現成素材反過來主導。
- 目前長條看台仍多依附在既有固定高度平台框架上，再把圖片局部塞進該框架，這會讓素材的原始長寬比例與可行走區域設計被破壞，尤其在森林看台最明顯。

## Planned Direction
- 怪物名單後續以「主題分類 → 候選群組 → 地圖名單」的順序整理，而不是先看現有地圖名單再硬分類。
- 第一批建議分類語彙包含：精靈類、林地獸類、植物 / 菇類、戰士類、重裝類、岩石類、奇幻類、飛行類、機械類、菁英 / 小王 / Boss 援軍。
- 森林地圖作為分類重整的首個驗證場，應優先聚焦精靈類與林地相關怪物，先把不貼題的怪物挪出，再決定哪些候選怪物值得裁切上線。
- 森林長條看台作為圖片原生尺寸平台的首個驗證場，後續若成功，才推廣到玩具城、台北都會等同類型長平台。

## Migration Coverage
- 已移植：平台對齊正式規格、平台對齊 active change、專案脈絡、技能能力規格、核心遊戲流程規格。
- 已整合：GAME_SPEC 與 ITERATION5_SPEC 中對現況基線的重疊描述，避免在新版內重複維護兩份真相。
- 未直接移植為 current specs：尚未完成的願景項目、純建議排序、Claude 能否生成圖片的討論段落、過期的 OpenSpec-tw 指令說明。

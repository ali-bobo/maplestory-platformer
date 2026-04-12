## Catalog Schema

本文件定義背景、平台、怪物與候選怪物共用的欄位語言，作為後續 catalog 與程式同步的單一事實來源。

### Shared Fields

| field | required | description |
| --- | --- | --- |
| assetId | yes | runtime asset 的唯一識別碼，例如 BG-TOY-001、MON-MB-001 |
| candidateId | candidate only | 候選素材識別碼，例如 CAND-MON-SLIME-001 |
| groupId | yes | 群組代碼，例如 BG-TOY、PLT-LONG、MON-LEG、MON-MB |
| displayName | optional | 對人可讀名稱，可晚於首輪盤點補齊 |
| source | yes | 檔案路徑、外部參考描述或使用者提供來源 |
| textureKey | runtime only | BootScene preload 與實體生成使用的 texture key |
| status | yes | 資產狀態，限 used、replace、candidate、reserve、unused-research、pending-alignment、promoted-runtime |
| targetMaps | optional | 對應地圖清單，例如 sky、henesys、ellinia、taipei |
| binding | runtime only | 目前程式綁定位置，例如 monster id、map key、NPC entry |
| promotionStatus | candidate only | 候選晉升狀態，例如 candidate、reviewing、approved-runtime |
| notes | optional | 補充說明、限制、下一步 |

### Naming Rules

- 背景：BG-<theme>-<index>，例如 BG-TOY-001、BG-TPE-001。
- 平台：PLT-<style>-<index>，例如 PLT-LONG-001。
- runtime 怪物：MON-<group>-<index>，例如 MON-LEG-001、MON-BIG-004、MON-MB-001。
- 候選怪物：CAND-MON-<family>-<index>，例如 CAND-MON-SLIME-001。
- textureKey 與 assetId 必須解耦，避免改檔名時連 catalog 編號一起失效。

### Status Semantics

| status | meaning |
| --- | --- |
| used | 已在 runtime 中實際載入與使用 |
| replace | 將取代現有 runtime 條目 |
| candidate | 候選素材，尚未 runtime 化 |
| reserve | 已保留但目前未使用 |
| unused-research | 僅供參考或待研究，尚未形成明確導入決策 |
| pending-alignment | 已屬 runtime，但對齊 metadata 尚未完整 |
| promoted-runtime | 原本為候選素材，現已被晉升並接入 runtime |

### Group Baseline

- 背景群組：BG-SKY、BG-FOR、BG-RUI、BG-TOY、BG-TPE、BG-CIT。
- 平台群組：PLT-PROC、PLT-LONG。
- 怪物群組：MON-LEG、MON-NEW、MON-BIG、MON-MB、MON-SUP。
- 候選怪物群組：CAND-MON-SLIME、CAND-MON-MUSH、CAND-MON-SPIRIT、CAND-MON-WOLF、CAND-MON-PIG、CAND-MON-INSECT。
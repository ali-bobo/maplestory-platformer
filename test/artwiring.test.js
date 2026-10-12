// 已有美術接進程式的純邏輯：NPC 任務標記狀態、待機呼吸選格、素材範圍標籤
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../src/config/constants.js';
import { MAPS } from '../src/config/maps.js';
import { npcQuestMarker, QUEST_MARK_KEYS as K } from '../src/engine/questMarkers.js';
import { idleFrameKey, IDLE_PERIOD_MS } from '../src/config/poses.js';
import { ASSET_BY_KEY, PLATFORM_THEMES } from '../src/config/assetCatalog.js';
import { mapAssetKeys, coreAssets } from '../src/engine/assetPlan.js';

function gsWith(level, active = [], completed = []) {
  const gs = createInitialGameState();
  gs.level = level;
  gs.quests = { active: active.map((id) => ({ id, progress: 0 })), completed: [...completed] };
  return gs;
}
const townsfolk = MAPS.town.npcs.find((n) => n.npcId === undefined && n.questIds && n.questIds.includes('job_call'));
const elder = MAPS.shrine.npcs.find((n) => n.npcId === 'shadow_elder');

test('npcQuestMarker：可接 / 進行中 / 可交付 / 沒有任務', () => {
  const merchant = MAPS.town.npcs.find((n) => n.shop);
  assert.equal(npcQuestMarker(gsWith(1), merchant), null);                       // 沒有任務的 NPC
  assert.equal(npcQuestMarker(null, townsfolk), null);
  assert.equal(npcQuestMarker(gsWith(1), townsfolk), K.available);               // reach_town 可接
  // reach_town 完成後 job_call 要 Lv10：Lv9 沒標記，Lv10 又出現
  assert.equal(npcQuestMarker(gsWith(9, [], ['reach_town']), townsfolk), null);
  assert.equal(npcQuestMarker(gsWith(10, [], ['reach_town']), townsfolk), K.available);
  // 全部做完後消失
  assert.equal(npcQuestMarker(gsWith(10, [], ['reach_town', 'job_call']), townsfolk), null);
});

test('npcQuestMarker：進行中（灰 ?）與對話型任務的可交付（金 ?）', () => {
  const field = MAPS.henesys.npcs.find((n) => n.questIds && n.questIds.includes('mushroom_hunt'));
  assert.ok(field);
  const ids = field.questIds;
  // 全部已接 -> 進行中
  assert.equal(npcQuestMarker(gsWith(20, ids, []), field), K.inProgress);
  // 一個進行中、另一個仍可接 -> 可接優先
  assert.equal(npcQuestMarker(gsWith(20, [ids[0]], []), field), K.available);
  // 全部完成 -> 無
  assert.equal(npcQuestMarker(gsWith(20, [], ids), field), null);
  // 影之長老：job_call（talk -> shadow_elder）進行中，長老頭上是金色 ?
  assert.equal(npcQuestMarker(gsWith(10, ['job_call']), elder), K.ready);
  // 長老：選擇職業（choice）進行中也是金色 ?
  assert.equal(npcQuestMarker(gsWith(10, ['job_choose'], ['job_call']), elder), K.ready);
  // 長老：收集試煉之證（collect）進行中是灰色 ?
  assert.equal(npcQuestMarker(gsWith(10, ['job_proof'], ['job_call', 'job_choose']), elder), K.inProgress);
  // 還沒到長老的任務（job_call 未完成）：長老頭上沒有標記，因為前置沒完成
  assert.equal(npcQuestMarker(gsWith(10, [], []), elder), null);
});

test('idleFrameKey：每 600ms 在兩格間交替，缺第二格退回單格', () => {
  assert.equal(IDLE_PERIOD_MS, 600);
  assert.equal(idleFrameKey(0, 'a', 'b'), 'a');
  assert.equal(idleFrameKey(599, 'a', 'b'), 'a');
  assert.equal(idleFrameKey(600, 'a', 'b'), 'b');
  assert.equal(idleFrameKey(1199, 'a', 'b'), 'b');
  assert.equal(idleFrameKey(1200, 'a', 'b'), 'a');
  assert.equal(idleFrameKey(700, 'a', null), 'a');
  assert.equal(idleFrameKey(700, 'a', undefined), 'a');
  assert.equal(idleFrameKey(700, 'a', 'a'), 'a');
});

test('素材範圍：影之殿堂用 platform_shrine、飛鏢 / 漩渦走 core、待機與倒地圖有登錄', () => {
  assert.equal(PLATFORM_THEMES.shrine.key, 'platform_shrine');
  assert.ok(PLATFORM_THEMES.shrine.stretchH >= 30);
  assert.ok(mapAssetKeys('shrine').has('platform_shrine'));
  assert.ok(!mapAssetKeys('shrine').has('platform_town'));
  const core = new Set(coreAssets().map((a) => a.key));
  assert.ok(core.has('fx_shuriken') && core.has('fx_vortex'));
  for (const key of ['player_idle_2', 'player_die', 'player_assassin_idle_2', 'player_assassin_die', 'player_bandit_idle_2', 'player_bandit_die', 'item-boots', 'ui_quest_mark', 'ui_quest_ing', 'ui_quest_done']) {
    const a = ASSET_BY_KEY.get(key);
    assert.ok(a, key + ' 沒登錄');
    assert.notEqual(a.status, 'unused', key + ' 仍標為 unused');
  }
});

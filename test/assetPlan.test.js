// 素材分批載入計畫：每張地圖 / 職業需要的圖都有登錄、有 scope，且開機清單夠小。
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ASSETS, ASSET_BY_KEY, ASSET_SCOPES, PRELOAD_IMAGE_ASSETS, PRELOAD_SPRITESHEET_ASSETS, PLATFORM_THEMES } from '../src/config/assetCatalog.js';
import { MAPS } from '../src/config/maps.js';
import { MONSTERS } from '../src/config/monsters.js';
import { DUNGEONS } from '../src/config/dungeons.js';
import { JOB_IDS } from '../src/config/constants.js';
import { mapAssetKeys, jobAssets, coreAssets, bootAssets, neighborMapKeys, residentKeys, allJobIds } from '../src/engine/assetPlan.js';

test('每個素材都有合法的 scope；job 範圍有 jobs、map 範圍有 maps 欄位', () => {
  for (const a of ALL_ASSETS) {
    assert.ok(ASSET_SCOPES.includes(a.scope), `${a.key} scope`);
    if (a.scope === 'job') assert.ok(Array.isArray(a.jobs) && a.jobs.length, `${a.key} jobs`);
    if (a.scope === 'map') assert.ok(Array.isArray(a.maps), `${a.key} maps`);
  }
});

test('開機只載入小圖：沒有地圖背景、怪物、NPC、職業動作圖、特效', () => {
  for (const a of [...PRELOAD_IMAGE_ASSETS, ...PRELOAD_SPRITESHEET_ASSETS]) {
    assert.equal(a.scope, 'boot', a.key);
    assert.ok(!['monster', 'npc', 'boss', 'fx'].includes(a.kind), `${a.key} 不該在開機載入`);
    assert.ok(a.kind !== 'background' || a.key === 'title_bg', `${a.key} 不該在開機載入`);
  }
  assert.ok(PRELOAD_IMAGE_ASSETS.some((a) => a.key === 'title_bg'), '主選單背景要在開機清單');
  assert.ok(bootAssets().length < 140, `開機素材數 ${bootAssets().length}`);
});

test('每張地圖：背景、跳台圖、怪物圖、NPC 圖都在該地圖的載入清單內', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    const keys = mapAssetKeys(key);
    assert.ok(keys.has(map.bgImage), `${key} 背景`);
    if (PLATFORM_THEMES[key]) assert.ok(keys.has(PLATFORM_THEMES[key].key), `${key} 跳台圖`);
    for (const m of map.monsters) assert.ok(keys.has(MONSTERS.find((d) => d.id === m.id).spriteKey), `${key} 怪物 ${m.id}`);
    for (const n of map.npcs || []) assert.ok(keys.has(n.id), `${key} NPC ${n.id}`);
    for (const k of keys) assert.ok(ASSET_BY_KEY.has(k), k);
  }
});

test('Boss 戰載入 Boss 動作圖與援軍（暗影史萊姆）；副本載入各波怪物', () => {
  const boss = mapAssetKeys('boss');
  for (const k of ['boss_idle', 'boss_attack', 'monster_slime']) assert.ok(boss.has(k), k);
  for (const [id, d] of Object.entries(DUNGEONS)) {
    const keys = mapAssetKeys('dungeon', { dungeonId: id });
    assert.ok(keys.has(d.bgImage), `${id} 背景`);
    for (const w of d.waves) for (const m of w.monsters) assert.ok(keys.has(MONSTERS.find((x) => x.id === m.id).spriteKey), `${id} ${m.id}`);
  }
});

test('職業圖：每個轉職職業都有自己的動作圖；盜賊沒有額外圖（用開機的盜賊動作）', () => {
  for (const job of JOB_IDS) {
    if (job === 'thief') { assert.equal(jobAssets('thief').length, 0); continue; }
    assert.ok(allJobIds().includes(job), `${job} 有 job 範圍素材`);
    assert.ok(jobAssets(job).some((a) => a.key === `player_${job}_idle`), `${job} idle`);
  }
});

test('常駐集合（含相鄰地圖）比全部素材小得多', () => {
  const all = ALL_ASSETS.filter((a) => a.status !== 'unused').length;
  for (const key of Object.keys(MAPS)) {
    const res = residentKeys(key, 'assassin', { withNeighbors: true });
    assert.ok(res.size < all * 0.6, `${key} 常駐 ${res.size}/${all}`);
  }
  assert.ok(coreAssets().length > 0);
  for (const key of Object.keys(MAPS)) for (const n of neighborMapKeys(key)) assert.ok(MAPS[n], n);
});

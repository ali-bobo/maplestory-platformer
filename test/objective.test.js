// 常駐目標與任務日誌的邏輯
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getObjective, questLog, mapDistance, nextHop, grindMap, MAIN_LINE } from '../src/engine/objective.js';
import { createInitialGameState } from '../src/config/constants.js';
import { QUESTS, JOB_QUEST_CHAIN } from '../src/config/quests.js';
import { MAPS } from '../src/config/maps.js';
import { SHARD_IDS } from '../src/config/shards.js';

function gsAt(map, level = 1, extra = {}) {
  const gs = createInitialGameState();
  gs.currentMap = map;
  gs.level = level;
  gs.quests = { active: [], completed: [] };
  return Object.assign(gs, extra);
}
const active = (id, progress = 0) => ({ id, progress });

test('新遊戲：目標是找島嶼義工接史萊姆獵手（在同一張地圖，沒有箭頭）', () => {
  const o = getObjective(gsAt('sky'));
  assert.equal(o.kind, 'available');
  assert.equal(o.mapKey, 'sky');
  assert.ok(o.text.includes('島嶼義工'));
  assert.ok(o.text.includes('史萊姆獵手'));
  assert.ok(!o.text.includes('→'));
});

test('在別張地圖時，可接任務的目標帶「→ 地圖名」', () => {
  const inTown = getObjective(gsAt('town'));
  assert.equal(inTown.questId, 'reach_town');   // 同一張地圖的任務最近
  assert.ok(!inTown.text.includes('→'));
  const o = getObjective(gsAt('town', 1, { quests: { active: [], completed: ['reach_town'] } }));
  assert.equal(o.kind, 'available');
  assert.equal(o.questId, 'slime_hunt');
  assert.equal(o.text, '接任務「史萊姆獵手」：找島嶼義工 → 浮空島嶼');
});

test('進行中的討伐任務：顯示「擊敗怪物名 進度/數量」，進度變化文字跟著變', () => {
  const gs = gsAt('sky', 1, { quests: { active: [active('slime_hunt', 0)], completed: [] } });
  assert.equal(getObjective(gs).text, '擊敗果凍精 0/5');
  gs.quests.active[0].progress = 3;
  const o = getObjective(gs);
  assert.equal(o.text, '擊敗果凍精 3/5');
  assert.equal(o.kind, 'quest');
  assert.equal(o.questId, 'slime_hunt');
  assert.equal(o.more, 0);
});

test('進行中任務的怪物不在目前地圖：指向最近有這種怪的地圖，並說明先走哪一站', () => {
  const gs = gsAt('ruins', 5, { quests: { active: [active('slime_hunt', 1)], completed: [] } });
  const o = getObjective(gs);
  assert.ok(o.text.startsWith('擊敗果凍精 1/5 → 浮空島嶼'), o.text);
  assert.ok(o.text.includes('先到森林獵場'), o.text);   // ruins → henesys → sky
  assert.equal(o.mapKey, 'sky');
});

test('多個進行中任務：優先顯示目前地圖就能做的，並回報還有幾個', () => {
  const gs = gsAt('henesys', 6, { quests: { active: [active('slime_hunt', 0), active('stump_clear', 2), active('reach_ruins', 0)], completed: [] } });
  const o = getObjective(gs);
  assert.equal(o.questId, 'stump_clear');
  assert.equal(o.text, '擊敗怒木精 2/5');
  assert.equal(o.more, 2);
});

test('各種任務類型都有可讀的目標文字（抵達 / 對話 / 抉擇 / 收集 / 副本）', () => {
  const t = (id, map) => getObjective(gsAt(map, 12, { quests: { active: [active(id)], completed: [] } }));
  assert.equal(t('reach_ruins', 'ruins').text, '前往古代廢墟');
  assert.ok(t('reach_ruins', 'sky').text.startsWith('前往古代廢墟 → 古代廢墟'));
  assert.equal(t('harbor_sailor', 'harbor').text, '和老水手說話');
  assert.ok(t('job_choose', 'shrine').text.includes('影之長老'));
  assert.ok(t('job_proof', 'sky').text.startsWith('收集試煉之證 0/5'));
  assert.ok(t('job_trial', 'shrine').text.startsWith('通關影之試煉'));
  assert.ok(t('job_trial', 'town').text.includes('→ 影之殿堂'));
});

test('每一個任務當成進行中都能產生目標文字，地圖 key 有效或為 null', () => {
  for (const id of Object.keys(QUESTS)) {
    const o = getObjective(gsAt('town', 20, { quests: { active: [active(id)], completed: [] } }));
    assert.equal(o.kind, 'quest', id);
    assert.ok(o.text.length > 0, id);
    assert.ok(o.mapKey === null || MAPS[o.mapKey], `${id} → ${o.mapKey}`);
  }
});

test('Lv.10 起轉職任務鏈優先於一般任務', () => {
  const o = getObjective(gsAt('sky', 10));
  assert.equal(o.questId, 'job_call');
  assert.ok(JOB_QUEST_CHAIN.includes(o.questId));
  assert.ok(o.text.includes('城鎮居民'));
  assert.ok(o.text.includes('→ 晨曦鎮'));
  // Lv.9 還沒有（job_call 要 Lv.10）
  assert.notEqual(getObjective(gsAt('sky', 9)).questId, 'job_call');
});

test('等級不夠的高階地圖任務不推薦：Lv.1 不會被叫去魔君王城', () => {
  const o = getObjective(gsAt('town', 1));
  assert.notEqual(o.mapKey, 'castle');
  assert.ok(!['castle_knights', 'castle_maid', 'castle_commander'].includes(o.questId));
});

test('任務都做完時走主線：低等級先練功、等級夠了去挑戰守護者', () => {
  const all = Object.keys(QUESTS);
  const done = (map, level, extra) => gsAt(map, level, { quests: { active: [], completed: all }, ...extra });
  const low = getObjective(done('sky', 3));
  assert.equal(low.kind, 'grind');
  assert.ok(low.text.includes('練功'));
  assert.ok(low.text.includes('Lv.14'));
  const away = getObjective(done('town', 3));
  assert.equal(away.kind, 'grind');
  assert.ok(away.text.includes('→ 浮空島嶼'));
  const ready = getObjective(done('town', 13));
  assert.equal(ready.kind, 'main');
  assert.ok(ready.text.includes('碧濤港的守護者'));
  assert.ok(ready.text.includes('星光碎片 0/5'));
  assert.equal(ready.mapKey, 'harbor');
});

test('星光碎片主線：下一塊、集滿要點亮塔、點亮後去暗影領域', () => {
  const all = Object.keys(QUESTS);
  const base = (shards, extra) => gsAt('town', 40, { quests: { active: [], completed: all }, shards, ...extra });
  assert.ok(getObjective(base(['harbor'])).text.includes('沙漠') === false);   // 第二塊是黃沙遺跡
  assert.ok(getObjective(base(['harbor'])).text.includes('黃沙遺跡的守護者'));
  assert.ok(getObjective(base(['harbor'])).text.includes('星光碎片 1/5'));
  const full = getObjective(base([...SHARD_IDS]));
  assert.ok(full.text.includes('星光之塔'));
  assert.equal(full.mapKey, 'town');
  assert.ok(!full.text.includes('→'));          // 已經在晨曦鎮
  const boss = getObjective(base([...SHARD_IDS], { towerLit: true, bossUnlocked: true }));
  assert.ok(boss.text.includes('暗影魔君'));
  assert.equal(boss.mapKey, 'boss');
});

test('副本與 Boss 房：副本不顯示（有自己的 HUD），Boss 房顯示擊敗魔君', () => {
  assert.equal(getObjective(gsAt('dungeon')).text, '');
  assert.equal(getObjective(gsAt('dungeon')).kind, 'none');
  assert.equal(getObjective(gsAt('boss')).text, '擊敗暗影魔君');
  assert.equal(getObjective(null), null);
});

test('壞資料不會丟例外：未知任務 id、缺欄位、怪進度值', () => {
  const gs = gsAt('sky', 1, { quests: { active: [{ id: '__proto__' }, { id: 'nope', progress: 2 }, active('slime_hunt', 'x')], completed: ['??'] } });
  assert.doesNotThrow(() => getObjective(gs));
  assert.equal(getObjective(gs).questId, 'slime_hunt');
  const bare = { currentMap: 'sky', level: 1 };
  assert.doesNotThrow(() => getObjective(bare));
  assert.doesNotThrow(() => questLog(bare));
  assert.deepEqual(questLog(null), { active: [], available: [], completed: [] });
});

test('地圖距離與下一站：由傳送門推出', () => {
  assert.equal(mapDistance('sky', 'sky'), 0);
  assert.equal(mapDistance('sky', 'henesys'), 1);
  assert.equal(mapDistance('sky', 'ruins'), 2);
  assert.equal(nextHop('sky', 'ruins'), 'henesys');
  assert.equal(nextHop('ruins', 'sky'), 'henesys');
  assert.equal(nextHop('sky', 'sky'), null);
  assert.equal(mapDistance('sky', 'nowhere'), Infinity);
});

test('練功地圖依等級帶：主線地圖都有等級帶，等級越高越後面', () => {
  assert.equal(grindMap(1), 'sky');
  assert.equal(grindMap(5), 'henesys');
  assert.equal(grindMap(9), 'ruins');
  assert.equal(grindMap(14), 'harbor');
  assert.equal(grindMap(50), 'castle');
  for (const k of MAIN_LINE) assert.ok(MAPS[k].levelBand, k);
});

test('任務日誌：進行中（含進度與地點）、可接取（含發任務的人）、已完成', () => {
  const gs = gsAt('sky', 6, { quests: { active: [active('slime_hunt', 2)], completed: ['reach_town'] } });
  const log = questLog(gs);
  assert.equal(log.active.length, 1);
  assert.equal(log.active[0].progressText, '2/5');
  assert.equal(log.active[0].name, '史萊姆獵手');
  assert.ok(log.active[0].desc.length > 0);
  assert.ok(log.active[0].where.includes('浮空島嶼'));
  assert.ok(log.active[0].reward.includes('EXP'));
  const snail = log.available.find((q) => q.id === 'snail_collect');
  assert.ok(snail);
  assert.equal(snail.where, '浮空島嶼 · 島嶼義工');
  assert.ok(!log.available.some((q) => q.id === 'slime_hunt'));   // 進行中的不在可接取裡
  assert.ok(!log.available.some((q) => q.id === 'reach_town'));   // 完成的也不在
  assert.deepEqual(log.completed, [{ id: 'reach_town', name: '初訪晨曦鎮' }]);
  const castle = questLog(gs).available.find((q) => q.id === 'castle_knights');
  assert.equal(castle.far, true);                                   // 地點太高階：標示 far，日誌可淡化
  assert.equal(log.available.find((q) => q.id === 'snail_collect').far, false);
});

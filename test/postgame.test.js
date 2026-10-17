// 通關後：gameCleared 存檔往返、回程傳送門只在通關後出現且不算世界地圖連線
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeState, serializeSave, parseSave } from '../src/engine/saveManager.js';
import { neighborsOf, worldEdges } from '../src/engine/worldGraph.js';
import { MAPS } from '../src/config/maps.js';

test('gameCleared：只認 true、存檔往返保留、舊存檔沒有這個欄位', () => {
  assert.equal(sanitizeState({}).gameCleared, undefined);
  assert.equal(sanitizeState({ gameCleared: 'yes' }).gameCleared, undefined);
  assert.equal(sanitizeState({ gameCleared: true }).gameCleared, true);
  const res = parseSave(serializeSave({ ...sanitizeState({ level: 45 }), gameCleared: true, currentMap: 'boss' }));
  assert.equal(res.ok, true);
  assert.equal(res.state.gameCleared, true);
  assert.equal(res.state.currentMap, 'castle');   // Boss 房存檔回魔君王城，回程門就在那裡
});

test('回程傳送門：魔君王城與暗影領域各一道，通關才出現、單向、按 F、通往晨曦鎮', () => {
  for (const key of ['castle', 'boss']) {
    const ret = MAPS[key].portals.filter((p) => p.requireCleared);
    assert.equal(ret.length, 1, key);
    const p = ret[0];
    assert.equal(p.target, 'town');
    assert.equal(p.oneWay, true);
    assert.equal(p.interact, true);
    assert.ok(p.spawnX > 0 && p.spawnX < MAPS.town.width);
    // 不和其他傳送門 / 進場落點重疊
    for (const q of MAPS[key].portals) if (q !== p) assert.ok(Math.abs(q.x - p.x) >= 150, `${key} 傳送門間距`);
    assert.ok(Math.abs((MAPS[key].spawnX ?? 0) - p.x) >= 100, `${key} 進場落點不站在回程門上`);
  }
});

test('單向回程門不算世界地圖連線', () => {
  assert.ok(!neighborsOf('castle').includes('town'));
  assert.deepEqual(neighborsOf('boss'), []);
  assert.ok(!worldEdges().some(([a, b]) => (a === 'castle' && b === 'town') || (a === 'town' && b === 'castle')));
});

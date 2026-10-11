// 怪物 AI 的純邏輯：平台圖、追擊轉向（遲滯 / 垂直落差 / 卡住）、選招與冷卻、招式分配表
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlatformGraph, getTable, platformAt, jumpClassFor, jumpVelFor, EDGE_JUMP,
} from '../src/engine/platformGraph.js';
import {
  SteerState, makeSteerInput, makeSteerOut, steer, UNREACH_MS, FLIP_COMMIT_MS,
  pickAttack, attackEligible, cooldownFor, attackDamage, phaseIndexFor, clampWindup,
  inGroundBlast, circleHitsRect, leapVelocity, leapVx, tickCooldowns,
} from '../src/engine/aiLogic.js';
import { MONSTERS } from '../src/config/monsters.js';
import { ATTACK_TYPES, getAttackProfile, MONSTER_ATTACKS } from '../src/config/monsterAttacks.js';

// Boss 房的平台配置（與 maps.js 的 BOSS_PLATFORMS 相同形狀）
const PLATS = [
  { x: 0, y: 600, width: 1280 },     // 0 地板
  { x: 80, y: 444, width: 280 },     // 1
  { x: 920, y: 444, width: 280 },    // 2
  { x: 280, y: 304, width: 360 },    // 3
  { x: 640, y: 304, width: 360 },    // 4
  { x: 440, y: 164, width: 400 },    // 5
];
const G = buildPlatformGraph(PLATS);

test('平台圖：platformAt 依腳底高度與 x 找出所在平台，空中回傳 -1', () => {
  assert.equal(platformAt(G, 500, 600), 0);
  assert.equal(platformAt(G, 200, 444), 1);
  assert.equal(platformAt(G, 200, 520), -1);
  assert.equal(platformAt(G, 700, 304), 4);
});

test('平台圖：不會跳的怪只能「走下去」，會跳的才能往上；下一步表可串起多層', () => {
  const walker = getTable(G, jumpClassFor(0));
  assert.equal(walker[1 * G.n + 0], 0);            // 平台 1 → 地板：走下去
  assert.equal(walker[0 * G.n + 1], -1);           // 地板 → 平台 1：到不了
  const boss = getTable(G, jumpClassFor(640));
  assert.equal(boss[0 * G.n + 1], 1);
  assert.equal(boss[1 * G.n + 5] >= 0, true);
  // 地板到最高層要經過至少兩次跳躍
  let hops = 0, at = 0;
  while (at !== 5 && hops < 10) { at = boss[at * G.n + 5]; hops++; }
  assert.equal(at, 5);
  assert.ok(hops >= 3);
  // 需要的起跳速度與落差一致
  const e = 0 * G.n + 1;
  assert.equal(G.kind[e], EDGE_JUMP);
  assert.ok(Math.abs(G.need[e] - jumpVelFor(156 + 22)) < 1);
});

test('平台圖：低跳（速度 390）上不去 156px 的平台', () => {
  const low = getTable(G, jumpClassFor(390));
  assert.equal(low[0 * G.n + 1], -1);
});

function sim(inp, st, out, steps, dtMs, mover) {
  const dirs = [];
  for (let i = 0; i < steps; i++) {
    mover(i, inp);
    steer(st, inp, dtMs, out);
    dirs.push(out.dir);
  }
  return dirs;
}
function flips(dirs) {
  let n = 0, last = 0;
  for (const d of dirs) { if (d !== 0) { if (last !== 0 && d !== last) n++; last = d; } }
  return n;
}
function baseInput() {
  const inp = makeSteerInput();
  inp.graph = G; inp.table = getTable(G, jumpClassFor(0));
  inp.speed = 100; inp.arrive = 40; inp.grounded = true;
  return inp;
}

test('追擊：目標在正上 / 正下方 x 抖動時，不會每幀左右翻轉（死區 + 遲滯）', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 0; inp.tgtPlat = 0; inp.x = 300;
  const dirs = sim(inp, st, out, 200, 50, (i, p) => { p.dx = (i % 2 ? 1 : -1) * 6; p.dy = 0; });
  assert.equal(flips(dirs), 0);
  assert.equal(dirs.every((d) => d === 0), true);
});

test('追擊：目標在邊界附近左右跳動（±30px）時，反向最多每 FLIP_COMMIT_MS 一次', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 0; inp.tgtPlat = 0; inp.x = 300; inp.arrive = 10;
  // 每 50ms 目標在左右 30px 之間跳；10 秒 = 200 步
  const dirs = sim(inp, st, out, 200, 50, (i, p) => { p.dx = (i % 2 ? 1 : -1) * 30; p.dy = 0; });
  assert.ok(flips(dirs) <= Math.ceil(10000 / FLIP_COMMIT_MS), `flips=${flips(dirs)}`);
});

test('追擊：到位後停下，目標走遠超過死區 + 遲滯才重新追', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 0; inp.tgtPlat = 0; inp.x = 300; inp.dy = 0;
  inp.dx = 100; steer(st, inp, 50, out); assert.equal(out.dir, 1);
  inp.dx = 30; steer(st, inp, 50, out); assert.equal(out.dir, 0);
  inp.dx = 55; steer(st, inp, 50, out); assert.equal(out.dir, 0);   // 還在遲滯區內
  inp.dx = 90; steer(st, inp, 50, out); assert.equal(out.dir, 1);
});

test('追擊：目標在上層且會跳 → 先走到起跳點，再起跳', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.table = getTable(G, jumpClassFor(640)); inp.jumpVel = 640;
  inp.selfPlat = 0; inp.tgtPlat = 1; inp.dy = -156;
  inp.x = 700;
  const take = G.takeX[0 * G.n + 1];
  let jumped = false;
  for (let i = 0; i < 400 && !jumped; i++) {
    inp.dx = 200 - inp.x;
    steer(st, inp, 50, out);
    if (out.jump) { jumped = true; break; }
    inp.x += out.dir * 5;
  }
  assert.equal(jumped, true);
  assert.ok(Math.abs(inp.x - take) <= 12);
  assert.ok(out.jumpVel >= G.need[0 * G.n + 1]);
});

test('追擊：目標在上層、自己不會跳 → 先走到下方，UNREACH_MS 後回報 unreach（不會永遠站著）', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 0; inp.tgtPlat = 3; inp.dy = -296; inp.x = 800;
  let unreachAt = -1;
  for (let i = 0; i < 400; i++) {
    inp.dx = 450 - inp.x;
    steer(st, inp, 50, out);
    inp.x += out.dir * 5;
    if (out.unreach && unreachAt < 0) unreachAt = i * 50;
    assert.equal(out.jump, false);
  }
  assert.ok(Math.abs(inp.x - 450) < 60, `x=${inp.x}`);
  assert.ok(unreachAt >= UNREACH_MS - 50 && unreachAt < UNREACH_MS + 8000, `unreachAt=${unreachAt}`);
});

test('追擊：目標在下層 → 往平台邊緣走並走出去', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 1; inp.tgtPlat = 0; inp.dy = 156; inp.x = 200;
  inp.dx = 0;
  steer(st, inp, 50, out);
  assert.notEqual(out.dir, 0);
  // 走到邊緣後方向不變（繼續走出去）
  const edge = G.takeX[1 * G.n + 0];
  inp.x = edge + (out.dir > 0 ? -4 : 4);
  steer(st, inp, 50, out);
  assert.equal(out.dir, G.exitDir[1 * G.n + 0]);
});

test('追擊：卡住（想走卻沒位移）→ 能跳就跳，再卡就往反方向繞一小段', () => {
  const inp = baseInput(), st = new SteerState(), out = makeSteerOut();
  inp.selfPlat = 0; inp.tgtPlat = 0; inp.x = 300; inp.dx = 200; inp.dy = 0; inp.jumpVel = 350;
  let jumps = 0, detour = 0;
  for (let i = 0; i < 100; i++) {
    steer(st, inp, 50, out);
    if (out.jump) jumps++;
    if (out.dir === -1) detour++;
  }
  assert.ok(jumps >= 1);
  assert.ok(detour >= 1);
});

test('選招：冷卻中 / 距離外 / 空中 / 落差太大的招式不會被選；vertical 模式只選能打不同層的', () => {
  const defs = [
    { type: 'charge', cd: 1000, min: 100, max: 300, weight: 1, grounded: true, vert: false },
    { type: 'shoot', cd: 1000, min: 80, max: 500, weight: 1, grounded: false, vert: true },
  ];
  const cds = new Float32Array([0, 0]);
  assert.equal(pickAttack(defs, 2, cds, 50, 0, true, false, 0.5), -1);
  assert.equal(pickAttack(defs, 2, cds, 200, 0, true, false, 0.0), 0);
  assert.equal(pickAttack(defs, 2, cds, 200, 0, true, false, 0.99), 1);
  assert.equal(pickAttack(defs, 2, cds, 200, 0, false, false, 0.0), 1);          // 空中不能衝撞
  assert.equal(pickAttack(defs, 2, cds, 200, 200, true, false, 0.0), 1);         // 落差太大，衝撞打不到
  assert.equal(pickAttack(defs, 2, cds, 200, 0, true, true, 0.0), 1);            // vertical 模式
  cds[1] = 500;
  assert.equal(pickAttack(defs, 2, cds, 200, 200, true, false, 0.0), -1);
  assert.equal(attackEligible({ ...defs[0], fallbackOnly: true }, 0, 200, 0, true, false), false);
});

test('冷卻：tickCooldowns 遞減不小於 0；cooldownFor 落在 0.9~1.2 倍並吃階段係數', () => {
  const cds = new Float32Array([100, 0, 5000]);
  tickCooldowns(cds, 3, 300);
  assert.deepEqual(Array.from(cds), [0, 0, 4700]);
  const def = { cd: 5000 };
  assert.equal(cooldownFor(def, 1, 0), 4500);
  assert.equal(cooldownFor(def, 1, 1), 6000);
  assert.equal(cooldownFor(def, 0.5, 0), 2250);
});

test('傷害：以 atk 為基準，倍率 / 階段加成 / 迷煙減半', () => {
  assert.equal(attackDamage(100, 1, 1, 1, 0.5), 100);
  assert.equal(attackDamage(100, 1.2, 1.25, 1, 0.5), 150);
  assert.equal(attackDamage(100, 1, 1, 0.5, 0.5), 50);
  assert.ok(attackDamage(1, 0.1, 1, 0.5, 0) >= 1);
});

test('階段：血量比例降到門檻以下才進入下一階段', () => {
  const phases = [{ at: 0.6 }, { at: 0.3 }];
  assert.equal(phaseIndexFor(1, phases), 0);
  assert.equal(phaseIndexFor(0.61, phases), 0);
  assert.equal(phaseIndexFor(0.6, phases), 1);
  assert.equal(phaseIndexFor(0.31, phases), 1);
  assert.equal(phaseIndexFor(0.2, phases), 2);
  assert.equal(phaseIndexFor(0.2, null), 0);
});

test('前搖：重擊至少 400ms', () => {
  assert.equal(clampWindup(200, 1.3, false), 400);
  assert.equal(clampWindup(200, 0.5, true), 400);
  assert.equal(clampWindup(200, 0.5, false), 200);
  assert.equal(clampWindup(700, 1.3, false), 700);
});

test('判定：地面範圍攻擊跳高可躲；圓對矩形', () => {
  assert.equal(inGroundBlast(100, 600, 150, 600, 80, 55), true);     // 站在原地
  assert.equal(inGroundBlast(100, 520, 150, 600, 80, 55), false);    // 跳到 80px 高
  assert.equal(inGroundBlast(300, 600, 150, 600, 80, 55), false);    // 水平太遠
  assert.equal(circleHitsRect(0, 0, 10, 15, 0, 6, 6), true);
  assert.equal(circleHitsRect(0, 0, 10, 30, 0, 6, 6), false);
});

test('撲擊：初速依落差在上下限內，水平速度有上限', () => {
  assert.equal(leapVelocity(0, 740, 420), -420);
  assert.ok(leapVelocity(200, 740, 420) < -640);
  assert.equal(leapVelocity(2000, 740, 420), -740);
  assert.equal(leapVx(5000, -600, 340), 340);
  assert.equal(leapVx(-5000, -600, 340), -340);
});

// ── 招式分配表 ──
const GUARDIANS = ['pirate_captain', 'sandworm_boss', 'frost_giant', 'lava_dragon', 'fallen_commander', 'shadow_guardian'];

test('招式表：每隻怪都能解析；招式類型合法；數值合理', () => {
  for (const def of MONSTERS) {
    const prof = getAttackProfile(def);
    for (const a of prof.attacks) {
      assert.ok(ATTACK_TYPES[a.type], `${def.id}: 未知招式 ${a.type}`);
      assert.ok(a.cd >= 1500, `${def.id}/${a.type}: 冷卻太短`);
      assert.ok(a.windup >= 150, `${def.id}/${a.type}: 前搖太短`);
      if (a.dmg !== undefined) assert.ok(a.dmg <= 1.6, `${def.id}/${a.type}: 倍率太高`);
      if (a.dmg >= 1.2 || a.heavy) assert.ok(a.windup >= 400, `${def.id}/${a.type}: 重擊前搖需 >= 400ms`);
    }
  }
  // 表內的 id 都對得上實際怪物
  const ids = new Set(MONSTERS.map((m) => m.id));
  for (const id of Object.keys(MONSTER_ATTACKS)) assert.ok(id === 'boss' || ids.has(id), `招式表有未知怪物 ${id}`);
});

test('招式表：五位區域守衛與試煉守衛各有 2~3 種以上招式、至少兩個階段', () => {
  for (const id of GUARDIANS) {
    const def = MONSTERS.find((m) => m.id === id);
    const prof = getAttackProfile(def);
    const base = new Set(prof.attacks.map((a) => a.type));
    assert.ok(base.size >= 2, `${id}: 基礎招式 < 2`);
    assert.ok(prof.phases.length >= 1, `${id}: 沒有第二階段`);
    const p2 = prof.phases[0];
    assert.ok(p2.at > 0 && p2.at <= 0.6);
    assert.ok(new Set(p2.attacks.map((a) => a.type)).size >= base.size, `${id}: 第二階段招式不比第一階段多`);
    assert.ok(p2.speedMult > 1 || p2.cdMult < 1 || p2.dmgMult > 1, `${id}: 第二階段沒有變強`);
  }
});

test('招式表：最終 Boss 有三個階段，招式逐階段增加', () => {
  const prof = getAttackProfile({ id: 'boss', behavior: 'chase' });
  assert.equal(prof.phases.length, 2);
  assert.ok(prof.attacks.length >= 3);
  assert.ok(prof.phases[0].attacks.length > prof.attacks.length);
  assert.ok(prof.phases[1].attacks.length > prof.phases[0].attacks.length);
  assert.ok(prof.phases[0].at > prof.phases[1].at);
});

test('招式表：新舊家族依類型分配（不是全部都一樣）', () => {
  const typesOf = (id) => {
    const prof = getAttackProfile(MONSTERS.find((m) => m.id === id));
    const last = prof.phases.length ? prof.phases[prof.phases.length - 1].attacks : prof.attacks;
    return last.map((a) => a.type);
  };
  assert.ok(typesOf('boar').includes('charge'));
  assert.ok(typesOf('icewolf').includes('charge'));
  assert.ok(typesOf('golem').includes('slam'));
  assert.ok(typesOf('yeti').includes('slam'));
  assert.ok(typesOf('bat').includes('dive'));
  assert.ok(typesOf('sky_bird').includes('dive'));
  assert.ok(typesOf('octopus').includes('shoot'));
  assert.ok(typesOf('sandworm').includes('burrow'));
  assert.ok(typesOf('fireimp').includes('kite'));
  assert.ok(typesOf('cyclops').includes('pound'));
  const all = new Set();
  for (const m of MONSTERS) for (const t of typesOf(m.id)) all.add(t);
  for (const t of ['charge', 'slam', 'pound', 'shoot', 'kite', 'burrow', 'dive', 'summon', 'rain', 'burst']) assert.ok(all.has(t), `沒有任何怪使用 ${t}`);
});

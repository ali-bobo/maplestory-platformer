#!/usr/bin/env node
// 進度 / 經濟模擬器（純 Node、無相依）。用法：node tools/sim-progression.mjs [--seeds=N] [--json]
//
// 做什麼：直接 import 遊戲的 config（怪物 / 地圖 / 任務 / 裝備 / 商店），以「逐隻擊殺的蒙地卡羅」模擬
// 一名玩家從 Lv1 打到最終 Boss：每隻怪的擊殺時間、受傷、藥水、死亡、金幣、裝備掉落、守護者戰。
// 輸出：等級帶時間表、各地圖 exp/meso 每分鐘、守護者戰長度、金幣收支、裝備、問題旗標。
// 所有「玩家技術」假設都集中在 PROFILES 與 ASSUME；改數字重跑即可。詳見 docs/design/progression-economy.md。
//
// 不修改任何遊戲檔案。equipment.js 的 rollEquipmentDrop 用 Math.random，這裡以固定種子的 PRNG 暫時取代它，結果可重現。

process.emitWarning = () => {};   // package.json 沒有 "type":"module"，import 會噴一行無害警告

const seedsArg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = seedsArg ? Math.max(1, parseInt(seedsArg.slice(8), 10) || 1) : 12;
const AS_JSON = process.argv.includes('--json');

const root = new URL('../src/config/', import.meta.url);
const { MONSTERS } = await import(new URL('monsters.js', root));
const { MAPS } = await import(new URL('maps.js', root));
const { QUESTS } = await import(new URL('quests.js', root));
const C = await import(new URL('constants.js', root));
const E = await import(new URL('equipment.js', root));
const { DEFAULT_SHOP } = await import(new URL('shops.js', root));
const { DUNGEONS } = await import(new URL('dungeons.js', root));
const { SHARDS } = await import(new URL('shards.js', root));

const MAX_L = C.MAX_LEVEL;
const MON = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

// ───────────────────────── --retune：套用文件第 4 節的建議數值重跑 ─────────────────────────
// 不加旗標 = 現況（讀 src/config 原值）。加 --retune = 以下覆寫（只在模擬內生效，不改遊戲檔案）。
const RETUNE = process.argv.includes('--retune');
const RT = RETUNE ? {
  // expNeeded' = expNeeded × (1 + 3.4 × ((L-1)/49)^1.5)：Lv10 ×1.28、Lv20 ×1.85、Lv30 ×2.6、Lv40 ×3.5、Lv49 ×4.4
  expMult: (L) => 1 + 3.4 * Math.pow((L - 1) / 49, 1.5),
  hpMult: { sky: 1, henesys: 1, ruins: 1.05, harbor: 1.1, desert: 1.15, snow: 1.2, lava: 1.25, castle: 1.3 },   // 一般怪 HP 倍率
  guardTargetSec: 35,       // 守護者戰 normal 玩家目標秒數
  finalTargetSec: 150,      // 最終 Boss
  dropRate: 0.08,           // 一般怪掉裝機率（取代 0.05~0.40）
  rarityW: { common: 62, rare: 26, epic: 10, legendary: 2 },
  rarityMult: { common: 1, rare: 1.3, epic: 1.7, legendary: 2.3 },
  lvBonus: 0.05,
  epicMinLv: 12, legendMinLv: 30,
  pityEpic: 18, pityLegend: 80,
  finalAtk: 100, finalPh3: 2.0,   // 最終 Boss 單下傷害（現況 160 / 1.2 倍、狂暴 1.5×1.8 倍）
  gentleDeath: true,        // 預設不掉裝，扣 10% 金幣
  potionFrac: { A: 0.25, S: 0.5, G: 0.4 },
  potionPrice: (k, L) => ({ A: 10 + 1.2 * L, S: 25 + 3 * L, G: 40 + 4 * L }[k]),
} : null;
const needed = (L) => Math.floor(C.expNeeded(L) * (RT ? RT.expMult(L) : 1));
const mobHp = (mon, mk) => mon.hp * (RT ? (RT.hpMult[mk] ?? 1) : 1);

// ───────────────────────── 假設（可調） ─────────────────────────
// 三種玩家：casual 新手 / normal 一般 / expert 熟手。
//  overhead 每隻怪之間的找怪 + 撿寶 + 跳平台秒數；hit 技能 / 飛鏢命中率；zDuty 主力技能 Z 佔輸出時間比例（受 MP 回復 10/s 限制，上限約 0.5）
//  pack 每隻怪發生「被圍毆 / 跳劈連擊」的機率（連吃 5 下、中途來不及喝藥）；contact 戰鬥中被怪貼身的時間比例；first 接近時先吃一下的機率；react 低血時成功喝藥的機率；uptime 打 Boss 時輸出時間比例；bossContact Boss 戰被貼身比例
const PROFILES = {
  casual: { overhead: 4.4, hit: 0.60, zDuty: 0.30, contact: 0.65, first: 0.50, react: 0.80, uptime: 0.45, bossContact: 0.55, pack: 0.12 },
  normal: { overhead: 3.2, hit: 0.70, zDuty: 0.40, contact: 0.45, first: 0.30, react: 0.92, uptime: 0.60, bossContact: 0.40, pack: 0.06 },
  expert: { overhead: 2.4, hit: 0.80, zDuty: 0.50, contact: 0.25, first: 0.15, react: 0.97, uptime: 0.75, bossContact: 0.25, pack: 0.025 },
};
const ASSUME = {
  crit: 0.2 * (1.8 - 1) + 1,        // 期望暴擊倍率 1.16
  extraSkillBonus: 0.06,            // 每多解鎖 1 個非 Z 技能，期望 DPS +6%
  mobAttackCd: 1.5, rangedCd: 2.0,  // Monster._doAttack / _doRangedAttack 冷卻（秒）
  crowd: 1.2,                       // 同時被 1.2 隻怪圍毆
  regenHpPerSec: 5,                 // Player.recoverHp：0.005 HP/ms
  walkPerMap: 22,                   // 秒：穿過一張 2560px 的圖
  shopSec: 25,                      // 買藥停留
  worldMapTeleport: false,          // true = 補給走世界地圖（固定 45 秒往返）
  respawnSec: 15,                   // 死亡後重新站起來的時間
  restockBelow: 4,                  // HP 藥水少於 4 瓶就回頭補
  restockTarget: 12,
  bossLevel: 44,                    // 玩家挑戰最終 Boss 的等級（等級帶 45-50）
  guardianLead: 3,                  // 等級 >= 守護者等級 - 3 才去挑戰
};

// 地圖順序與玩家行進策略：「等級到了下一張圖的下限就換圖」
const MAIN = ['sky', 'henesys', 'ruins', 'harbor', 'desert', 'snow', 'lava', 'castle'];
const HOPS = { sky: 1, henesys: 2, ruins: 3, harbor: 4, desert: 5, snow: 6, lava: 7, castle: 8 };
const HAS_REGION_SHOP = new Set(['desert', 'snow', 'lava', 'castle']);
const mapLo = (k) => MAPS[k].levelBand[0];
// 行進規則：等級到了下一張圖的下限，而且前面每張圖的守護者都打倒了（或該圖沒有守護者）才換圖
function mapForLevel(L, shards = null) {
  let cur = MAIN[0];
  for (const k of MAIN) {
    if (L < mapLo(k)) break;
    if (shards) {
      const i = MAIN.indexOf(k);
      const blocked = MAIN.slice(0, i).some((pk) => { const sh = SHARDS.find((x) => x.map === pk); return sh && !shards.includes(sh.id); });
      if (blocked) break;
    }
    cur = k;
  }
  return cur;
}
function mapMobs(key) {      // 該圖會生的一般怪（不含小王）
  return MAPS[key].monsters.map((e) => ({ def: MON[e.id], count: e.count })).filter((e) => e.def && e.def.spawnRole !== 'miniboss');
}
function mapGuardian(key) {
  const e = MAPS[key].monsters.find((m) => MON[m.id]?.spawnRole === 'miniboss');
  return e ? MON[e.id] : null;
}
function mapQuestRewards(key) {   // 該圖 NPC 發的任務（小王討伐另計）
  const ids = (MAPS[key].npcs || []).flatMap((n) => n.questIds || []);
  const list = ids.map((id) => QUESTS[id]).filter(Boolean);
  const boss = list.filter((q) => q.type === 'kill' && MON[q.target]?.spawnRole === 'miniboss');
  const rest = list.filter((q) => !boss.includes(q));
  const sum = (a) => a.reduce((s, q) => ({ exp: s.exp + (q.rewards.exp || 0), meso: s.meso + (q.rewards.meso || 0) }), { exp: 0, meso: 0 });
  return { rest: sum(rest), boss: sum(boss), count: list.length };
}

// ───────────────────────── 工具 ─────────────────────────
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const poisson = (lam, r) => { let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= r(); } while (p > L && k < 40); return k - 1; };
const baseHp = (L) => 400 + 20 * (L - 1);
const baseAtk = (L) => 70 + 5 * (L - 1);
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// DPS 係數：單位是「每秒造成 atk 的幾倍」。Z = 三連飛鏢 3×1.2 倍 / 0.5 秒；普攻 0.9 倍 / 0.4 秒。SP 先全點 Z。
function dpsK(L, p) {
  const sp = 3 * (L - 1) + (L >= C.JOB_CHANGE_LEVEL ? C.JOB_CHANGE_SKILL_POINTS : 0);
  const zs = C.skillDamageScale(Math.min(10, 1 + sp));
  const extra = [5, 10, 15, 20, 24].filter((u) => L >= u).length;
  const zRate = (3 * 1.2) / 0.5 * p.hit * zs;
  const basic = 0.9 / 0.4 * 0.9;
  return (p.zDuty * zRate + (1 - p.zDuty) * basic) * ASSUME.crit * (1 + ASSUME.extraSkillBonus * extra);
}

// 守護者 / 最終 Boss 血量：現況讀原值；retune = 目標秒數 × 0.6 輸出時間比 × DPS（以挑戰等級的基礎 atk ×1.35 估裝備）
const guardHp = (gd) => {
  if (!RT) return gd.hp;
  const Lc = gd.level - ASSUME.guardianLead;
  return Math.round(RT.guardTargetSec * 0.6 * dpsK(Lc, PROFILES.normal) * baseAtk(Lc) * 1.35 / 100) * 100;
};
const finalHp = () => {
  if (!RT) return 10000;
  return Math.round(RT.finalTargetSec * 0.6 * dpsK(ASSUME.bossLevel, PROFILES.normal) * baseAtk(ASSUME.bossLevel) * 1.4 / 1000) * 1000;
};

// retune 的掉裝：固定機率 + 稀有度門檻 + 保底（pity）+ ±12% 數值浮動，裝備等級跟著怪物等級
function rollDropRT(mon, st, rnd) {
  if (rnd() > RT.dropRate) return null;
  const slot = E.EQUIPMENT_SLOTS[Math.floor(rnd() * 5)];
  st.pity = st.pity || { e: 0, l: 0 };
  st.pity.e++; st.pity.l++;
  let rar = 'common';
  if (st.pity.l >= RT.pityLegend && mon.level >= RT.legendMinLv) rar = 'legendary';
  else if (st.pity.e >= RT.pityEpic && mon.level >= RT.epicMinLv) rar = 'epic';
  else {
    const w = { ...RT.rarityW };
    if (mon.level < RT.epicMinLv) w.epic = 0;
    if (mon.level < RT.legendMinLv) w.legendary = 0;
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    let r = rnd() * tot;
    for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { rar = k; break; } }
  }
  if (rar === 'legendary') st.pity.l = 0;
  if (rar === 'legendary' || rar === 'epic') st.pity.e = 0;
  const b = E.EQUIPMENT_BASES[slot], m = RT.rarityMult[rar], lb = 1 + (mon.level - 1) * RT.lvBonus, v = () => 0.88 + 0.24 * rnd();
  return { slot, rarity: rar, atk: Math.floor(b.baseAtk * m * lb * v()), hp: Math.floor(b.baseHp * m * lb * v()), mp: 0, speed: 0 };
}

// ───────────────────────── 單次模擬 ─────────────────────────
function simulate(profKey, seed, opts = {}) {
  const p = PROFILES[profKey];
  const rnd = mulberry32(seed * 7919 + profKey.length);
  const origRandom = Math.random;
  Math.random = rnd;               // equipment.js 用
  try { return run(); } finally { Math.random = origRandom; }

  function run() {
    const st = {
      L: 1, exp: 0, meso: 0, t: 0, map: 'sky', kills: 0, deaths: 0,
      pot: { A: 5, S: 3, G: 2 }, gear: {}, shards: [], towerDone: false,
      spent: 0, spentTotalPot: 0, mesoEarned: 0, potUsed: 0, equipDrops: { common: 0, rare: 0, epic: 0, legendary: 0 },
    };
    const lvl = {};                 // lvl[L] = { t, map, kills, deathsBefore }
    const perMap = {};
    const guardian = {};            // 守護者戰紀錄
    const reached = { };            // 事件時間
    const pm = (k) => (perMap[k] ||= { sec: 0, exp: 0, meso: 0, kills: 0, potUsed: 0, potCost: 0, deaths: 0, equip: 0, rarePlus: 0, restSec: 0, tripSec: 0, lvIn: null, lvOut: null });
    const gearSum = () => {
      let atk = 0, hp = 0, def = 0;
      for (const it of Object.values(st.gear)) { atk += it.atk; hp += it.hp; }
      if (st.gear.armor) def = Math.min(0.5, st.gear.armor.hp / 500);
      return { atk, hp, def };
    };
    const stats = () => { const g = gearSum(); return { atk: baseAtk(st.L) + g.atk, maxHp: baseHp(st.L) + g.hp, def: g.def }; };
    st.hp = baseHp(1);
    const hpPots = () => st.pot.A + st.pot.S + st.pot.G;
    const potionPrice = { A: 30, S: 75, G: 130 };   // 單瓶（雜貨店 3/90、2/150、1/130）；區域店 S=90
    const addTime = (sec, mk, ev = true) => { st.t += sec; st.evSec = (st.evSec || 0) + (ev ? sec : 0); if (mk) pm(mk).sec += sec; };

    function gain(exp, meso, mk, lump = false) {
      if (RT && lump) exp = Math.round(exp * RT.expMult(st.L));   // 任務 / 副本 / 守護者的固定獎勵隨曲線等比放大
      st.exp += exp; st.meso += meso; st.mesoEarned += meso;
      const m = pm(mk); m.exp += exp; m.meso += meso;
      while (st.L < MAX_L && st.exp >= needed(st.L)) {
        st.exp -= needed(st.L);
        st.L++;
        st.hp = stats().maxHp;
        lvl[st.L] = { t: st.t, map: st.map, kills: st.kills, deaths: st.deaths, ev: st.evSec || 0 };
      }
      if (st.L >= MAX_L) st.exp = Math.min(st.exp, needed(st.L) - 1);
    }
    function drink(missing) {
      let k = null;
      if (st.pot.S > 0 && missing >= 180) k = 'S'; else if (st.pot.A > 0) k = 'A'; else if (st.pot.S > 0) k = 'S'; else if (st.pot.G > 0) k = 'G';
      if (!k) return false;
      st.pot[k]--; st.potUsed++;
      const heal = RT ? Math.max({ A: 100, S: 250, G: 200 }[k], Math.floor(RT.potionFrac[k] * stats().maxHp)) : { A: 100, S: 250, G: 200 }[k];
      st.hp = Math.min(stats().maxHp, st.hp + heal);
      const cost = RT ? RT.potionPrice(k, st.L) : (HAS_REGION_SHOP.has(st.map) && k === 'S' ? 90 : potionPrice[k]);
      pm(st.map).potUsed++; pm(st.map).potCost += cost; st.spentTotalPot += cost;
      return true;
    }
    function restock() {
      const mk = st.map;
      const trip = HAS_REGION_SHOP.has(mk) ? ASSUME.shopSec : (ASSUME.worldMapTeleport ? 45 : 2 * HOPS[mk] * ASSUME.walkPerMap + ASSUME.shopSec);
      let bought = 0;
      const unit = RT ? { S: RT.potionPrice('S', st.L), A: RT.potionPrice('A', st.L) } : HAS_REGION_SHOP.has(mk) ? { S: 90, A: 32 } : { S: 75, A: 30 };
      const budget = st.meso * 0.7;
      let spent = 0;
      while (hpPots() < ASSUME.restockTarget) {
        const useS = st.L >= 12;                          // 一般玩家 Lv12 後改買強效
        const k = useS ? 'S' : 'A';
        if (spent + unit[k] > budget) break;
        spent += unit[k]; st.pot[k]++; bought++;
      }
      st.meso -= spent; st.spent += spent;
      addTime(trip, mk); pm(mk).tripSec += trip;
      return bought > 0;
    }
    function die(mk) {
      st.deaths++; pm(mk).deaths++;
      if (RT && RT.gentleDeath) { st.meso = Math.floor(st.meso * 0.9); }
      else st.gear = {};                      // death.js：失去全部裝備
      st.hp = stats().maxHp;
      addTime(ASSUME.respawnSec, mk);
    }
    function takeBurst(n, dmgBase, mk) {     // 連吃 n 下，中途不能喝藥（只有開頭看一眼血量）
      const s0 = stats();
      if (st.hp < 0.6 * s0.maxHp && rnd() < p.react) drink(s0.maxHp - st.hp);
      for (let i = 0; i < n; i++) {
        const s = stats();
        st.hp -= Math.max(1, Math.floor(dmgBase * (0.8 + 0.4 * rnd()) * (1 - s.def)));
        if (st.hp <= 0) { die(mk); return false; }
      }
      return true;
    }
    function takeHits(n, dmgBase, mk) {
      for (let i = 0; i < n; i++) {
        const s = stats();
        const dmg = Math.max(1, Math.floor(dmgBase * (0.8 + 0.4 * rnd()) * (1 - s.def)));
        // 受擊前的緊急喝藥
        if (st.hp < 0.45 * s.maxHp && rnd() < p.react) drink(s.maxHp - st.hp);
        st.hp -= dmg;
        if (st.hp <= 0) {
          if (rnd() < p.react * 0.35 && drink(s.maxHp)) { st.hp = Math.max(1, st.hp + 250); continue; }   // 致命一擊前最後一搏
          die(mk); return false;
        }
      }
      return true;
    }

    // 開局：新手副本（史萊姆洞窟）一次
    {
      const d = DUNGEONS.slime_cave;
      addTime(170, 'sky');
      gain(d.rewards.exp, d.rewards.meso, 'sky', true);
      reached.slimeCave = st.t;
    }
    gain(QUESTS.reach_town ? QUESTS.reach_town.rewards.exp : 0, QUESTS.reach_town ? QUESTS.reach_town.rewards.meso : 0, 'sky', true);
    let visited = new Set();
    let jobDone = false;

    let guard = 0;
    while (guard++ < 400000 && st.t < 3600 * 60) {
      if (st.L >= MAX_L && st.shards.length === 5 && st.towerDone) break;
      const tgt = mapForLevel(st.L, st.shards);
      if (tgt !== st.map) {
        const hop = Math.abs(MAIN.indexOf(tgt) - MAIN.indexOf(st.map)) * ASSUME.walkPerMap;
        addTime(hop, st.map);
        st.map = tgt;
      }
      const mk = st.map, m = pm(mk);
      if (m.lvIn == null) m.lvIn = st.L;
      m.lvOut = st.L;
      if (!visited.has(mk)) {
        visited.add(mk);
        const q = mapQuestRewards(mk);
        addTime(40 * q.count, mk);                 // 對話 / 接任務 / 回報
        gain(q.rest.exp, q.rest.meso, mk, true);
      }
      if (!jobDone && st.L >= C.JOB_CHANGE_LEVEL) {
        jobDone = true;
        addTime(330, mk);                           // 影之試煉：收集 5 個證物 + 副本 2 分 + 對話
        const ids = ['job_call', 'job_choose', 'job_proof', 'job_trial', 'job_awaken'];
        gain(ids.reduce((s, id) => s + (QUESTS[id]?.rewards.exp || 0), 0) + DUNGEONS.shadow_trial.rewards.exp, ids.reduce((s, id) => s + (QUESTS[id]?.rewards.meso || 0), 0) + DUNGEONS.shadow_trial.rewards.meso, mk, true);
        reached.job = st.t;
      }

      // 守護者
      const gd = mapGuardian(mk);
      const shard = SHARDS.find((s) => s.map === mk);
      if (gd && shard && !st.shards.includes(shard.id) && st.L >= gd.level - ASSUME.guardianLead) {
        fightGuardian(gd, shard, mk);
        continue;
      }
      // 最終 Boss
      if (st.shards.length === 5 && !st.towerDone && st.L >= ASSUME.bossLevel) {
        const back = ASSUME.worldMapTeleport ? 90 : 2 * HOPS.castle * ASSUME.walkPerMap + 60;
        addTime(back, mk); reached.towerLit = st.t;
        fightFinal();
        st.towerDone = true;
        continue;
      }
      killOne(mk);
    }
    return { st, lvl, perMap, guardian, reached, p };

    function fightGuardian(gd, shard, mk) {
      let attempts = 0, won = false, sec0 = st.t, dur = 0, potsBefore = st.potUsed;
      while (!won && attempts < 6) {
        attempts++;
        if (hpPots() < 6) restock();
        st.hp = stats().maxHp;
        let hpB = guardHp(gd), t = 0, alive = true;
        const interval = ASSUME.mobAttackCd;
        while (hpB > 0 && alive && t < 600) {
          const s = stats();
          const dps = s.atk * dpsK(st.L, p) * p.uptime;
          hpB -= dps * interval; t += interval;
          st.hp = Math.min(s.maxHp, st.hp + ASSUME.regenHpPerSec * interval);
          if (hpB <= 0) break;
          if (rnd() < p.bossContact) {
            alive = takeHits(1, gd.atk * 1.2 * (gd.behavior === 'ranged' ? 0.7 : 1), mk);
          }
          if (alive && st.hp < 0.4 * s.maxHp && rnd() < p.react) drink(s.maxHp - st.hp);
        }
        dur += t;
        if (alive && hpB <= 0) won = true;
      }
      addTime(dur, mk);
      guardian[gd.id] = guardian[gd.id] || [];
      guardian[gd.id].push({ sec: dur, attempts, level: st.L, potions: st.potUsed - potsBefore, won });
      if (won) {
        st.shards.push(shard.id);
        const q = mapQuestRewards(mk);
        gain(gd.exp + q.boss.exp, Math.floor(gd.meso * 1.0) + q.boss.meso, mk, true);
        reached['shard_' + shard.id] = st.t;
      }
    }

    function fightFinal() {
      const H = finalHp(), atk = RT ? RT.finalAtk : 160;
      let attempts = 0, won = false, dur = 0, potsBefore = st.potUsed, mk = 'castle';
      while (!won && attempts < 8) {
        attempts++;
        if (hpPots() < 8) restock();
        st.hp = stats().maxHp;
        let hpB = H, t = 0, alive = true;
        while (hpB > 0 && alive && t < 900) {
          const s = stats();
          const ratio = hpB / H;
          const ph = ratio > 0.6 ? 1 : ratio > 0.3 ? 2 : 3;
          const dps = s.atk * dpsK(st.L, p) * p.uptime * (ph === 3 ? 0.85 : 1);      // 狂暴 Boss 速度 ×1.5 較難輸出
          hpB -= dps * 1.5; t += 1.5;
          st.hp = Math.min(s.maxHp, st.hp + ASSUME.regenHpPerSec * 1.5);
          if (hpB <= 0) break;
          const bossHit = atk * (ph === 3 ? (RT ? RT.finalPh3 : 1.5 * 1.8) : 1.2);
          if (rnd() < p.bossContact * (ph === 3 ? 1.2 : 1)) alive = takeHits(1, bossHit / 1.0 * 1.0 / 1.0, mk);
          if (alive && ph >= 2 && rnd() < 0.5 * p.bossContact) alive = takeHits(1, 80 * 0.9, mk);   // 援軍
          if (alive && st.hp < 0.4 * s.maxHp && rnd() < p.react) drink(s.maxHp - st.hp);
        }
        dur += t;
        if (alive && hpB <= 0) won = true;
      }
      addTime(dur, mk);
      guardian.final = [{ sec: dur, attempts, level: st.L, potions: st.potUsed - potsBefore, won }];
      reached.final = st.t;
      gain(5000, 500, mk, true);
    }

    function killOne(mk) {
      const mobs = mapMobs(mk);
      const total = mobs.reduce((s, e) => s + e.count, 0);
      let r = rnd() * total, mon = mobs[0].def;
      for (const e of mobs) { r -= e.count; if (r <= 0) { mon = e.def; break; } }
      const s = stats();
      const ttk = Math.max(0.7, mobHp(mon, mk) / (s.atk * dpsK(st.L, p)));
      const melee = mon.behavior !== 'ranged';
      const lam = (ttk * p.contact / (melee ? ASSUME.mobAttackCd : ASSUME.rangedCd)) * ASSUME.crowd + (melee ? p.first : p.first * 0.5);
      const hits = poisson(lam, rnd);
      const dmgBase = mon.atk * (melee ? 1 : 0.7);
      let sec = ttk + p.overhead;
      st.hp = Math.min(s.maxHp, st.hp + ASSUME.regenHpPerSec * sec);
      let alive = takeHits(hits, dmgBase, mk);
      if (alive && rnd() < p.pack) alive = takeBurst(5, dmgBase * 1.1, mk);
      if (!alive) return;
      st.kills++;
      pm(mk).kills++;
      // 低血量處理
      const s2 = stats();
      if (st.hp < 0.5 * s2.maxHp) {
        if (hpPots() > 0 && rnd() < p.react) drink(s2.maxHp - st.hp);
        else if (hpPots() === 0) {
          // 沒藥：先試著補給（有錢才跑），否則原地休息到 75%
          if (st.meso >= 60 && st.L >= 3 && restock()) { /* 已補 */ }
          if (st.hp < 0.5 * s2.maxHp) {
            const need = 0.75 * s2.maxHp - st.hp, rest = need / ASSUME.regenHpPerSec;
            st.hp += need; pm(mk).restSec += rest; sec += rest;
          }
        }
      }
      if (hpPots() < ASSUME.restockBelow && st.meso >= 120 && st.L >= 3) restock();
      addTime(sec, mk, false);
      const mesoDrop = Math.floor(mon.meso * (0.5 + rnd()));
      gain(mon.exp, mesoDrop, mk);
      const it = RT ? rollDropRT(mon, st, rnd) : E.rollEquipmentDrop(st.L, mon.dropRate);
      if (it) {
        pm(mk).equip++; st.equipDrops[it.rarity]++;
        if (it.rarity !== 'common') pm(mk).rarePlus++;
        if (E.isEquipmentBetter(it, st.gear[it.slot])) st.gear[it.slot] = it;
        if (it.rarity === 'legendary' && reached.firstLegend == null) reached.firstLegend = st.t;
        const gl = Object.values(st.gear);
        if (reached.allEpic == null && gl.length === 5 && gl.every((x) => x.rarity === 'epic' || x.rarity === 'legendary')) reached.allEpic = st.t;
      }
    }
  }
}

// ───────────────────────── 執行與彙整 ─────────────────────────
const runs = {};
for (const k of Object.keys(PROFILES)) {
  runs[k] = [];
  for (let s = 1; s <= SEEDS; s++) runs[k].push(simulate(k, s));
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const levelTime = (profKey, L) => mean(runs[profKey].map((r) => (r.lvl[L] ? r.lvl[L].t : r.st.t)));   // 到達 L 的秒數
const out = [];
const log = (s = '') => out.push(s);

log(`# 模擬結果 ${RETUNE ? '【套用建議 retune】' : '【現況】'}（seeds=${SEEDS}；玩家：${Object.keys(PROFILES).join(' / ')}；世界地圖補給=${ASSUME.worldMapTeleport}）`);
log('');

// 表 1：等級帶時間
log('## T1 到達各等級的累計時間（分鐘；每格為多次模擬平均）');
const marks = [2, 3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50];
log(pad('等級', 6) + Object.keys(PROFILES).map((k) => padL(k, 9)).join(''));
for (const L of marks) log(pad('Lv' + L, 6) + Object.keys(PROFILES).map((k) => padL(fmt(levelTime(k, L) / 60, 1), 9)).join(''));
const finalT = Object.fromEntries(Object.keys(PROFILES).map((k) => [k, mean(runs[k].map((r) => r.reached.final || r.st.t))]));
const shard5T = Object.fromEntries(Object.keys(PROFILES).map((k) => [k, mean(runs[k].map((r) => r.reached.shard_castle || r.st.t))]));
log(pad('5/5碎片', 6) + Object.keys(PROFILES).map((k) => padL(fmt(shard5T[k] / 60, 1), 9)).join(''));
log(pad('擊敗終Boss', 6) + Object.keys(PROFILES).map((k) => padL(fmt(finalT[k] / 60, 1), 9)).join(''));
log('');

// 表 2：逐級（normal）
log('## T2 逐級耗時（normal）：每級分鐘、每級擊殺數、所在地圖、旗標');
const perLevel = [];
const evAt = (r, L) => (L === 1 ? 0 : (r.lvl[L]?.ev ?? 0));
for (let L = 1; L < MAX_L; L++) {
  const dt = mean(runs.normal.map((r) => ((r.lvl[L + 1]?.t ?? r.st.t) - (L === 1 ? 0 : (r.lvl[L]?.t ?? 0)))));
  const de = mean(runs.normal.map((r) => ((r.lvl[L + 1]?.ev ?? r.st.evSec ?? 0) - evAt(r, L))));
  const dk = mean(runs.normal.map((r) => ((r.lvl[L + 1]?.kills ?? r.st.kills) - (L === 1 ? 0 : (r.lvl[L]?.kills ?? 0)))));
  const mp = runs.normal[0].lvl[L + 1]?.map || '-';
  perLevel.push({ L, min: dt / 60, grind: (dt - de) / 60, kills: dk, map: mp });
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
for (const x of perLevel) {
  const nb = perLevel.filter((y) => Math.abs(y.L - x.L) <= 3 && y.L !== x.L).map((y) => y.grind);
  x.wall = x.L >= 4 && x.grind > 1.35 * med(nb) && x.grind > 1.8;
  x.fast = x.L > 4 && x.grind < 0.6 * med(nb);
}
log('「總」= 含補給 / 任務 / 守護者 / 換圖；「純刷」= 只算打怪時間（旗標以純刷判定：> 鄰近 6 級中位數 1.35 倍）');
log(pad('Lv→', 7) + pad('map', 9) + padL('總分', 7) + padL('純刷分', 8) + padL('擊殺', 7) + '  旗標');
for (const x of perLevel) log(pad(`${x.L}→${x.L + 1}`, 7) + pad(x.map, 9) + padL(fmt(x.min, 1), 7) + padL(fmt(x.grind, 1), 8) + padL(fmt(x.kills), 7) + '  ' + (x.wall ? 'GRIND-WALL ' : '') + (x.fast ? 'too-fast' : ''));
log('');

// 表 3：各地圖
log('## T3 各地圖（normal 平均）：停留等級、分鐘、exp/min、meso/min、藥水錢/min、死亡/小時、裝備/小時（稀有以上/小時）、補給+休息佔比');
log(pad('map', 9) + padL('Lv進→出', 9) + padL('分鐘', 7) + padL('殺/分', 6) + padL('exp/m', 8) + padL('meso/m', 8) + padL('藥錢/m', 8) + padL('死/時', 6) + padL('裝/時', 6) + padL('稀+/時', 7) + padL('補給%', 7));
const mapRows = [];
for (const mk of MAIN) {
  const rs = runs.normal.map((r) => r.perMap[mk]).filter(Boolean);
  if (!rs.length) continue;
  const sec = mean(rs.map((x) => x.sec)), exp = mean(rs.map((x) => x.exp)), meso = mean(rs.map((x) => x.meso));
  const pc = mean(rs.map((x) => x.potCost)), de = mean(rs.map((x) => x.deaths)), eq = mean(rs.map((x) => x.equip)), rp = mean(rs.map((x) => x.rarePlus));
  const lost = mean(rs.map((x) => x.restSec + x.tripSec));
  const row = { kpm: mean(rs.map((x) => x.kills)) / (sec / 60), mk, lvIn: Math.round(mean(rs.map((x) => x.lvIn))), lvOut: Math.round(mean(rs.map((x) => x.lvOut))), min: sec / 60, expm: exp / (sec / 60), mesom: meso / (sec / 60), potm: pc / (sec / 60), dph: de / (sec / 3600), eqh: eq / (sec / 3600), rph: rp / (sec / 3600), lostPct: 100 * lost / sec };
  mapRows.push(row);
  log(pad(mk, 9) + padL(`${row.lvIn}→${row.lvOut}`, 9) + padL(fmt(row.min, 1), 7) + padL(fmt(row.kpm, 1), 6) + padL(fmt(row.expm), 8) + padL(fmt(row.mesom), 8) + padL(fmt(row.potm), 8) + padL(fmt(row.dph, 1), 6) + padL(fmt(row.eqh), 6) + padL(fmt(row.rph), 7) + padL(fmt(row.lostPct), 6) + '%');
}
log('');
log('死亡次數（每局平均；casual / normal / expert）按地圖：');
log('  ' + MAIN.map((mk) => `${mk} ${['casual', 'normal', 'expert'].map((k) => fmt(mean(runs[k].map((r) => r.perMap[mk]?.deaths || 0)), 1)).join('/')}`).join('  '));
log('');

// 表 4：守護者
log('## T4 守護者戰（平均）：秒數 / 首次勝率 / 藥水 / 挑戰時等級');
log(pad('boss', 18) + pad('hp', 8) + Object.keys(PROFILES).map((k) => padL(k + ' 秒/勝率%/藥', 20)).join(''));
const bossIds = [...SHARDS.map((s) => s.monsterId), 'final'];
for (const id of bossIds) {
  const hp = id === 'final' ? finalHp() : guardHp(MON[id]);
  let line = pad(id, 18) + pad(fmt(hp), 8);
  for (const k of Object.keys(PROFILES)) {
    const recs = runs[k].flatMap((r) => r.guardian[id] || []);
    if (!recs.length) { line += padL('-', 20); continue; }
    const sec = mean(recs.map((x) => x.sec / x.attempts)), win1 = 100 * mean(recs.map((x) => (x.attempts === 1 ? 1 : 0))), pots = mean(recs.map((x) => x.potions));
    line += padL(`${fmt(sec)}/${fmt(win1)}/${fmt(pots, 1)}`, 20);
  }
  log(line);
}
log('');

// 表 5：金幣
log('## T5 金幣收支（normal 平均，整個戰役）');
const totalEarn = mean(runs.normal.map((r) => r.st.mesoEarned)), totalPot = mean(runs.normal.map((r) => r.st.spentTotalPot)), left = mean(runs.normal.map((r) => r.st.meso));
const questMeso = Object.values(QUESTS).reduce((s, q) => s + (q.rewards.meso || 0), 0), questExp = Object.values(QUESTS).reduce((s, q) => s + (q.rewards.exp || 0), 0);
log(`累計收入 ${fmt(totalEarn)}；藥水消耗價值 ${fmt(totalPot)}（${fmt(100 * totalPot / totalEarn)}%）；通關時手上剩 ${fmt(left)}；金幣用途：只有藥水。`);
log(`全部任務 meso ${fmt(questMeso)} / exp ${fmt(questExp)}（${fmt(100 * questMeso / totalEarn)}% 的 meso）；升到 50 需 ${fmt(Array.from({ length: 49 }, (_, i) => needed(i + 1)).reduce((a, b) => a + b, 0))} exp。`);
log(`分數公式（death.js）：金幣 ÷10 → 通關時囤積的金幣約 ${fmt(left / 10)} 分，擊殺 ${fmt(mean(runs.normal.map((r) => r.st.kills)))} 隻 ×10 = ${fmt(10 * mean(runs.normal.map((r) => r.st.kills)))} 分，等級 5000 分，通關 5000 分。`);
log('');

// 表 6：裝備
log('## T6 裝備（normal 平均）');
const eqT = mean(runs.normal.map((r) => r.st.equipDrops.common + r.st.equipDrops.rare + r.st.equipDrops.epic + r.st.equipDrops.legendary));
const eqR = ['common', 'rare', 'epic', 'legendary'].map((k) => `${k} ${fmt(mean(runs.normal.map((r) => r.st.equipDrops[k])))}`).join(' / ');
log(`整局掉裝備 ${fmt(eqT)} 件（${eqR}）；平均每小時 ${fmt(eqT / (mean(runs.normal.map((r) => r.st.t)) / 3600))} 件。死亡總次數 ${fmt(mean(runs.normal.map((r) => r.st.deaths)), 1)}（casual ${fmt(mean(runs.casual.map((r) => r.st.deaths)), 1)} / expert ${fmt(mean(runs.expert.map((r) => r.st.deaths)), 1)}）。`);
{
  const f = (k) => fmt(mean(runs.normal.map((r) => (r.reached[k] ?? r.st.t))) / 60, 1);
  log(`第一件傳說出現於 ${f('firstLegend')} 分鐘；五部位全 >= 史詩於 ${f('allEpic')} 分鐘（通關約 ${fmt(finalT.normal / 60, 0)} 分鐘）。`);
}
// 死亡後重湊 5 件的期望擊殺數
log('死亡後重湊 5 部位的期望擊殺數（任一件即可，不論品質）= (5/dropRate)×H5：');
for (const mk of MAIN) {
  const mobs = mapMobs(mk), tot = mobs.reduce((s, e) => s + e.count, 0), dr = RT ? RT.dropRate : mobs.reduce((s, e) => s + e.def.dropRate * e.count, 0) / tot;
  log(`  ${pad(mk, 9)} 平均 dropRate ${fmt(dr, 2)} → 約 ${fmt(5 / dr * 2.283)} 擊殺（約 ${fmt(5 / dr * 2.283 * (3.2 + 2) / 60, 1)} 分鐘）`);
}
// 裝備佔戰力
{
  const L = 40, lb = 1 + (L - 1) * (RT ? RT.lvBonus : 0.06), rm = RT ? RT.rarityMult : { common: 1, rare: 1.5, epic: 2.2, legendary: 3.5 };
  const w = (r) => Math.floor(20 * r * lb), g = (r) => Math.floor(8 * r * lb);
  log(`Lv40 裝備（weapon+gloves）atk：普通 ${w(rm.common) + g(rm.common)} / 稀有 ${w(rm.rare) + g(rm.rare)} / 史詩 ${w(rm.epic) + g(rm.epic)} / 傳說 ${w(rm.legendary) + g(rm.legendary)}；玩家基礎 atk ${baseAtk(L)}（傳說 +${fmt(100 * (w(rm.legendary) + g(rm.legendary)) / baseAtk(L))}%）。`);
}
log('');

// 表 7：靜態分析 — 各地圖在各等級的 exp/min 與最佳地圖（含支線）
log('## T7 靜態分析：各地圖在各等級的期望 exp/min（normal，單隻 = hp/DPS + 找怪），標 * 表示怪平均單擊 > 16% 最大 HP（太危險）');
const ALLMAPS = Object.keys(MAPS).filter((k) => mapMobs(k).length);
const lvs = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
function mapRate(mk, L, p = PROFILES.normal) {
  const mobs = mapMobs(mk), tot = mobs.reduce((s, e) => s + e.count, 0);
  const atk = baseAtk(L), hp = baseHp(L);
  let sec = 0, exp = 0, meso = 0, danger = 0;
  for (const e of mobs) {
    const w = e.count / tot, ttk = Math.max(0.7, mobHp(e.def, mk) / (atk * dpsK(L, p)));
    sec += w * (ttk + p.overhead); exp += w * e.def.exp; meso += w * e.def.meso; danger += w * e.def.atk * 0.9 / hp;
  }
  return { expm: exp / sec * 60, mesom: meso / sec * 60, danger, expk: exp, killsPerMin: 60 / sec };
}
log(pad('map', 9) + pad('帶', 7) + lvs.map((l) => padL('Lv' + l, 8)).join(''));
const bestCount = {};
const bestByLevel = {};
for (const L of lvs.concat([])) {
  let best = null;
  for (const mk of ALLMAPS) { const r = mapRate(mk, L); if (r.danger <= 0.16 && (!best || r.expm > best.r.expm)) best = { mk, r }; }
  bestByLevel[L] = best ? best.mk : '(none)';
}
for (let L = 1; L <= MAX_L; L++) {
  let best = null;
  for (const mk of ALLMAPS) { const r = mapRate(mk, L); if (r.danger <= 0.16 && (!best || r.expm > best.r.expm)) best = { mk, r }; }
  if (best) bestCount[best.mk] = (bestCount[best.mk] || 0) + 1;
}
for (const mk of ALLMAPS) {
  const b = MAPS[mk].levelBand;
  log(pad(mk, 9) + pad(`${b[0]}-${b[1]}`, 7) + lvs.map((L) => { const r = mapRate(mk, L); return padL(fmt(r.expm) + (r.danger > 0.16 ? '*' : ''), 8); }).join(''));
}
log('逐級「安全前提下 exp/min 最高的地圖」勝出次數（0 = 從來不是最佳 = 被跳過的內容）：');
log('  ' + ALLMAPS.map((mk) => `${mk}:${bestCount[mk] || 0}`).join('  '));
log('');

// 表 8：每級所需擊殺（以該級帶內最佳一般怪），與 EXP 曲線
log('## T8 EXP 曲線：每級需求 exp、以「所在地圖平均 exp/kill」換算的擊殺數（normal 路線）');
log('  ' + [5, 10, 15, 20, 25, 30, 35, 40, 45, 49].map((L) => { const mk = mapForLevel(L), r = mapRate(mk, L); return `Lv${L}:${fmt(needed(L))}exp/${fmt(needed(L) / r.expk)}隻(${mk})`; }).join('\n  '));
log('');

// 表 9：新鮮感事件與死區
log('## T9 「新東西」事件與死區（連續 >=5 級沒有任何新事件）');
const events = new Map();
const addEv = (L, s) => events.set(L, [...(events.get(L) || []), s]);
for (const [k, u] of Object.entries({ X: 5, C: 10, V: 15, B: 20 })) addEv(u, '技能' + k);
addEv(10, '一轉'); [12, 18, 24].forEach((l) => addEv(l, '職業技能'));
for (const k of MAIN.slice(1)) addEv(mapLo(k), '新地圖' + k);
addEv(18, '城市支線開放');
for (const s of SHARDS) addEv(MON[s.monsterId].level - ASSUME.guardianLead, '守護者' + s.id);
addEv(45, '最終Boss');
const evLv = [...events.keys()].sort((a, b) => a - b);
let prev = 1; const dead = [];
for (const L of [...evLv, 51]) { if (L - prev >= 5) dead.push(`Lv${prev + 1}-${L - 1}（${L - prev - 1} 級）`); prev = Math.min(L, 51); }
log('  事件等級：' + evLv.map((L) => `${L}[${events.get(L).join(',')}]`).join(' '));
log('  死區：' + (dead.join('；') || '無'));
log(`  技能點 SP：每級 +3，到 Lv${MAX_L} 累計 ${3 * (MAX_L - 1) + C.JOB_CHANGE_SKILL_POINTS}，技能池全部點滿只需 ${6 * 9}（6 技能 × 升 9 級）→ Lv${Math.ceil((6 * 9 - 5) / 3) + 1} 起 SP 毫無用處。`);
log('');

// 表 10：小王經濟（exp 效率）
log('## T10 守護者 vs 一般怪：exp/HP、掉裝率');
for (const s of SHARDS) {
  const g = MON[s.monsterId];
  const mobs = mapMobs(s.map), tot = mobs.reduce((a, e) => a + e.count, 0);
  const mexpHp = mobs.reduce((a, e) => a + (e.def.exp / e.def.hp) * e.count, 0) / tot;
  log(`  ${pad(g.id, 18)} Lv${g.level} hp ${padL(fmt(g.hp), 6)} exp ${padL(fmt(g.exp), 5)} exp/hp ${fmt(g.exp / g.hp, 3)} vs 同圖一般怪 ${fmt(mexpHp, 3)}；hp 倍率 ${fmt(g.hp / (mobs.reduce((a, e) => a + e.def.hp * e.count, 0) / tot), 1)}x；exp 倍率 ${fmt(g.exp / (mobs.reduce((a, e) => a + e.def.exp * e.count, 0) / tot), 1)}x`);
}
log('');
log('## T11 其他');
log('  DPS 係數 K（每秒造成 atk 的幾倍，normal）：' + [1, 5, 10, 20, 30, 40, 50].map((L) => `Lv${L} ${fmt(dpsK(L, PROFILES.normal), 1)}`).join('，'));
log(`  新手副本 slime_cave 每日 ${DUNGEONS.slime_cave.dailyLimit} 次 ×（${DUNGEONS.slime_cave.rewards.exp} exp, ${DUNGEONS.slime_cave.rewards.meso} meso）；占 Lv20 升級需求的 ${fmt(100 * DUNGEONS.slime_cave.rewards.exp / needed(20), 1)}%、Lv40 的 ${fmt(100 * DUNGEONS.slime_cave.rewards.exp / needed(40), 1)}%。`);
log(`  藥水回復量佔最大 HP：A(100) Lv1 ${fmt(100 * 100 / baseHp(1))}% / Lv20 ${fmt(100 * 100 / baseHp(20))}% / Lv40 ${fmt(100 * 100 / baseHp(40))}%；S(250) Lv40 ${fmt(100 * 250 / baseHp(40))}%。`);
log(`  怪物單擊占最大 HP（地圖加權 atk×0.9 / 基礎 HP）：` + MAIN.map((mk) => `${mk}@Lv${Math.max(mapLo(mk), 1)} ${fmt(100 * mapRate(mk, Math.max(mapLo(mk), 1)).danger)}%`).join('，'));

if (AS_JSON) {
  console.log(JSON.stringify({ perLevel, mapRows, finalT, shard5T }, null, 1));
} else {
  console.log(out.join('\n'));
}

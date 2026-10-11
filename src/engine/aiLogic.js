// 怪物 AI 的純決策邏輯（不依賴 Phaser，可單元測試）。
// 規則：所有函式都不配置新物件；狀態放在呼叫端預先建好的 SteerState / out 物件裡。

import { EDGE_JUMP } from './platformGraph.js';

// ── 轉向 / 追擊（steering）──────────────────────────────────────────────────
export const LEVEL_TOL = 36;          // 沒有平台資訊時，腳底落差小於此視為同一層
export const RESUME_GAP = 26;         // 到達死區後，目標要再離開這麼遠才重新追
export const FLIP_COMMIT_MS = 380;    // 轉向後這段時間內不允許反向（避免左右抖動）
export const FLIP_OVERRIDE = 70;      // 目標已越過自己這麼遠時，允許提早反向
export const TAKE_TOL = 12;           // 到起跳點 / 邊緣的容許誤差
export const UNREACH_MS = 1200;       // 連續到不了目標這麼久 → 改用遠程 / 撲擊 / 回巡邏
export const STUCK_MS = 650;          // 想走卻沒位移這麼久 → 判定卡住

export class SteerState {
  constructor() {
    this.dir = 0;
    this.commitMs = 0;
    this.stopped = false;
    this.unreachMs = 0;
    this.stuckMs = 0;
    this.stuckCount = 0;
    this.lastX = NaN;
    this.detourMs = 0;
    this.detourDir = 0;
  }
  reset() {
    this.dir = 0; this.commitMs = 0; this.stopped = false; this.unreachMs = 0;
    this.stuckMs = 0; this.stuckCount = 0; this.lastX = NaN; this.detourMs = 0; this.detourDir = 0;
  }
}

export function makeSteerOut() {
  return { dir: 0, jump: false, jumpVel: 0, unreach: false, stuck: false };
}

export function makeSteerInput() {
  return {
    x: 0, dx: 0, dy: 0,            // dx = 目標 - 自己；dy = 目標腳底 - 自己腳底（正 = 目標在下方）
    selfPlat: -1, tgtPlat: -1,
    grounded: true, speed: 60, arrive: 40,
    jumpVel: 0, graph: null, table: null,
    half: 20, minX: 0, maxX: 99999,     // 身體半寬與重心可到的 x 範圍（地圖邊界）
  };
}

// 從 edgeX 往 dir 方向走出去，身體（半寬 clear）完整離開平台時重心要到的位置，是否還在地圖範圍內
function exitFeasible(edgeX, dir, clear, inp) {
  const c = edgeX + dir * clear;
  return c >= inp.minX && c <= inp.maxX;
}

function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }

/**
 * 決定這一輪要往哪走 / 要不要跳。結果寫進 out：
 *   dir 為 -1/0/1；jump 為 true 時呼叫端以 -jumpVel 起跳；unreach 為「已經到不了目標超過 UNREACH_MS」
 */
export function steer(st, inp, dtMs, out) {
  out.jump = false; out.jumpVel = 0; out.unreach = false; out.stuck = false;
  st.commitMs = Math.max(0, st.commitMs - dtMs);

  // 繞路狀態：卡住後往反方向走一小段，期間不重新判斷
  if (st.detourMs > 0) {
    st.detourMs -= dtMs;
    out.dir = st.dir = st.detourDir;
    st.lastX = inp.x;
    return out;
  }

  const g = inp.graph;
  const haveTable = !!(g && inp.table && inp.selfPlat >= 0 && inp.tgtPlat >= 0);
  const sameLevel = haveTable ? inp.selfPlat === inp.tgtPlat : Math.abs(inp.dy) < LEVEL_TOL;
  const ad = Math.abs(inp.dx);
  let want = 0;
  let wantJump = false;
  let wantJumpVel = 0;
  let farOverride = ad > FLIP_OVERRIDE;

  if (sameLevel) {
    st.unreachMs = 0;
    if (st.stopped) { if (ad > inp.arrive + RESUME_GAP) st.stopped = false; }
    else if (ad < inp.arrive) st.stopped = true;
    want = st.stopped ? 0 : sgn(inp.dx);
  } else {
    let hop = -1;
    if (haveTable) hop = inp.table[inp.selfPlat * g.n + inp.tgtPlat];
    if (hop >= 0 && hop !== inp.selfPlat) {
      const e = inp.selfPlat * g.n + hop;
      // 兩個出口都能走時，選身體真的能完整離開平台、且比較近的那個（寬身體貼著地圖邊界的平台只能走另一側）
      let tx = g.takeX[e], exitDir = g.exitDir[e];
      if (g.has2[e]) {
        const clear1 = inp.half + 4, ok1 = exitFeasible(tx, exitDir, clear1, inp);
        const tx2 = g.takeX2[e], ed2 = g.exitDir2[e], ok2 = exitFeasible(tx2, ed2, clear1, inp);
        if ((ok2 && !ok1) || (ok1 === ok2 && Math.abs(tx2 - inp.x) < Math.abs(tx - inp.x))) { tx = tx2; exitDir = ed2; }
      }
      const ex = tx - inp.x;
      st.unreachMs = 0;
      st.stopped = false;
      farOverride = Math.abs(ex) > FLIP_OVERRIDE;
      // 已經到了（或已越過）起跳 / 離開邊緣的位置：繼續往外走，不要被拉回邊緣（寬身體的怪重心要走出邊緣才會掉）
      const past = exitDir !== 0 && (inp.x - tx) * exitDir >= -TAKE_TOL;
      if (past || Math.abs(ex) <= TAKE_TOL) {
        want = exitDir;
        if (g.kind[e] === EDGE_JUMP && inp.grounded) {
          wantJump = true;
          wantJumpVel = Math.min(inp.jumpVel, g.need[e] * 1.04 + 4);
        }
      } else {
        want = sgn(ex);
      }
    } else {
      // 到不了（或沒有平台資訊且落差很大）：先走到目標正下 / 正上方，之後由呼叫端改用其他手段
      st.unreachMs += dtMs;
      if (st.stopped) { if (ad > inp.arrive + RESUME_GAP) st.stopped = false; }
      else if (ad < inp.arrive) st.stopped = true;
      want = st.stopped ? 0 : sgn(inp.dx);
      // 到不了的時候不要為了靠近而走出自己的平台邊緣
      if (want !== 0 && g && inp.selfPlat >= 0) {
        if (want > 0 && inp.x >= g.right[inp.selfPlat] - 14) want = 0;
        else if (want < 0 && inp.x <= g.left[inp.selfPlat] + 14) want = 0;
      }
      if (st.unreachMs >= UNREACH_MS) out.unreach = true;
    }
  }

  // 方向承諾：剛轉向的一小段時間內不允許直接反向（除非目標已遠遠越過）
  if (want !== st.dir) {
    const reversing = want !== 0 && st.dir !== 0 && want === -st.dir;
    if (reversing && st.commitMs > 0 && !farOverride) want = st.dir;
    else st.commitMs = FLIP_COMMIT_MS;
  }
  st.dir = want;

  // 卡住偵測：想走、在地面，但位移幾乎為 0
  if (want !== 0 && inp.grounded && st.lastX === st.lastX) {
    const moved = Math.abs(inp.x - st.lastX);
    if (moved < inp.speed * dtMs / 1000 * 0.2) st.stuckMs += dtMs; else { st.stuckMs = 0; st.stuckCount = 0; }
    if (st.stuckMs >= STUCK_MS) {
      st.stuckMs = 0;
      st.stuckCount++;
      out.stuck = true;
      if (inp.jumpVel > 0 && st.stuckCount === 1) { wantJump = true; wantJumpVel = inp.jumpVel; }
      else { st.detourDir = -want; st.detourMs = 700; st.stuckCount = 0; }
    }
  } else {
    st.stuckMs = 0;
  }
  st.lastX = inp.x;

  out.dir = st.dir;
  out.jump = wantJump;
  out.jumpVel = wantJumpVel;
  return out;
}

// ── 攻擊選擇 / 冷卻 ─────────────────────────────────────────────────────────
// 每個攻擊定義（見 config/monsterAttacks.js）至少有：type, cd, min, max, weight, vert(可打不同層), grounded(要在地面)

export function tickCooldowns(cds, n, dtMs) {
  for (let i = 0; i < n; i++) if (cds[i] > 0) cds[i] = Math.max(0, cds[i] - dtMs);
}

export function attackEligible(def, cd, dist, dyAbs, grounded, verticalOnly) {
  if (cd > 0) return false;
  if (def.grounded && !grounded) return false;
  if (verticalOnly && !def.vert) return false;
  if (def.fallbackOnly && !verticalOnly) return false;   // 只在追不到目標時才會用的招式
  if (dist < def.min || dist > def.max) return false;
  // 不能打到不同層的招式（衝撞 / 震地 / 範圍）：落差太大就不選
  if (!def.vert && dyAbs > (def.maxDy ?? 70)) return false;
  return true;
}

/** 依權重從可用招式中選一個；回傳索引，沒有可用回傳 -1。rnd 為 0..1 的亂數。 */
export function pickAttack(defs, n, cds, dist, dyAbs, grounded, verticalOnly, rnd) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (attackEligible(defs[i], cds[i], dist, dyAbs, grounded, verticalOnly)) total += defs[i].weight;
  }
  if (total <= 0) return -1;
  let r = rnd * total;
  let last = -1;
  for (let i = 0; i < n; i++) {
    if (!attackEligible(defs[i], cds[i], dist, dyAbs, grounded, verticalOnly)) continue;
    last = i;
    r -= defs[i].weight;
    if (r <= 0) return i;
  }
  return last;
}

/** 冷卻計算：基礎冷卻 × 階段係數 × (0.9~1.2 隨機) */
export function cooldownFor(def, cdMult, rnd) {
  return Math.round(def.cd * cdMult * (0.9 + rnd * 0.3));
}

/** 傷害 = atk × 招式倍率 × 階段倍率 × (0.9~1.1)，迷煙減半 */
export function attackDamage(atk, mult, dmgMult, smokeFactor, rnd) {
  return Math.max(1, Math.floor(atk * mult * dmgMult * smokeFactor * (0.9 + rnd * 0.2)));
}

/** 目前處於第幾階段（0 = 初始）：phases 依 at 由大到小排列，血量比例 <= at 即進入該階段 */
export function phaseIndexFor(hpRatio, phases) {
  let idx = 0;
  if (!phases) return 0;
  for (let i = 0; i < phases.length; i++) if (hpRatio <= phases[i].at) idx = i + 1;
  return idx;
}

/** 前搖下限：重擊（dmg >= 1.2 或標記 heavy）至少 400ms，方便玩家反應 */
export function clampWindup(windup, dmg, heavy) {
  const min = (heavy || dmg >= 1.2) ? 400 : 150;
  return Math.max(windup, min);
}

// ── 幾何判定 ────────────────────────────────────────────────────────────────
/** 地面範圍攻擊：玩家腳底要在攻擊者腳底附近（跳高過一定高度可躲）且水平在半徑內 */
export function inGroundBlast(px, pFeetY, cx, footY, radius, hMax) {
  if (Math.abs(px - cx) >= radius) return false;
  return pFeetY > footY - hMax && pFeetY < footY + 40;
}

/** 以中心 + 半徑的圓，對上玩家矩形（中心 + 半寬高） */
export function circleHitsRect(cx, cy, r, rx, ry, hw, hh) {
  const nx = Math.max(rx - hw, Math.min(cx, rx + hw));
  const ny = Math.max(ry - hh, Math.min(cy, ry + hh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/** 撲擊 / 跳躍的初速：要升高 rise 像素、水平飛 dx，回傳 vy（負值向上）；vx 由 leapVx 算 */
export function leapVelocity(rise, maxVel, minVel) {
  const v = Math.sqrt(2000 * Math.max(0, rise + 30));
  return -Math.max(minVel, Math.min(maxVel, v));
}
export function leapVx(dx, vy, maxVx) {
  const t = (-vy / 1000) + 0.25;     // 上升時間 + 落到目標高度的緩衝
  const v = dx / Math.max(0.3, t);
  return Math.max(-maxVx, Math.min(maxVx, v));
}

// 平台圖（純函式，不依賴 Phaser）：每張地圖建一次，讓怪物知道「玩家在另一層時該往哪走」。
//
// 節點 = 平台；邊 = 從 A 走到 B 的方式：
//   kind 1 = 走下去（從平台邊緣走出去，會落到下方第一個平台）或同高相接
//   kind 2 = 往上跳（需要 need 的起跳速度）
// 下一步表（next-hop table）依「怪物的最大起跳速度級距」各算一次並快取，
// 之後每次決策只是查陣列，沒有任何配置。

export const GRAVITY = 1000;                       // 與 main.js 的 arcade gravity 一致
export const JUMP_CLASSES = [0, 340, 420, 520, 640, 760];   // 起跳速度級距（0 = 不會跳）

const UP_GAP_MAX = 90;       // 往上跳時，兩平台水平間隙上限
const EXIT_PAD = 24;         // 走出邊緣後身體重心的偏移，用來判斷會落在哪個平台
const JUMP_CLEARANCE = 22;   // 起跳高度要比平台落差多出的餘裕
const LEVEL_EPS = 10;        // 落差小於此視為同高

export const EDGE_NONE = 0;
export const EDGE_WALK = 1;
export const EDGE_JUMP = 2;

export function jumpClassFor(vel) {
  let c = 0;
  for (let i = 0; i < JUMP_CLASSES.length; i++) if (vel >= JUMP_CLASSES[i]) c = i;
  return c;
}

export function jumpHeight(vel) { return (vel * vel) / (2 * GRAVITY); }
export function jumpVelFor(height) { return Math.sqrt(2 * GRAVITY * Math.max(0, height)); }

// 水平方向落地前能走多遠不在這裡算；只用間隙門檻保守判斷
export function buildPlatformGraph(platforms) {
  const n = platforms ? platforms.length : 0;
  const g = {
    n,
    left: new Float32Array(n), right: new Float32Array(n), top: new Float32Array(n),
    kind: new Uint8Array(n * n), need: new Float32Array(n * n),
    takeX: new Float32Array(n * n), exitDir: new Int8Array(n * n),
    // 兩個邊緣都會落到同一個平台時的第二個出口（身體很寬、一側貼著地圖邊界時要改走另一側）
    has2: new Uint8Array(n * n), takeX2: new Float32Array(n * n), exitDir2: new Int8Array(n * n),
    tables: [],
  };
  for (let i = 0; i < n; i++) {
    const p = platforms[i];
    g.left[i] = p.x; g.right[i] = p.x + p.width; g.top[i] = p.y;
  }
  for (let a = 0; a < n; a++) {
    // 走下去：左右兩個邊緣各找「正下方第一個平台」
    for (let side = -1; side <= 1; side += 2) {
      const edgeX = side < 0 ? g.left[a] : g.right[a];
      const probeX = edgeX + side * EXIT_PAD;
      let best = -1;
      for (let b = 0; b < n; b++) {
        if (b === a || g.top[b] <= g.top[a] + LEVEL_EPS) continue;
        if (probeX < g.left[b] || probeX > g.right[b]) continue;
        if (best < 0 || g.top[b] < g.top[best]) best = b;
      }
      if (best >= 0) {
        const e = a * n + best;
        if (g.kind[e] === EDGE_NONE) {
          g.kind[e] = EDGE_WALK; g.takeX[e] = edgeX; g.exitDir[e] = side;
        } else if (g.kind[e] === EDGE_WALK && !g.has2[e]) {
          g.has2[e] = 1; g.takeX2[e] = edgeX; g.exitDir2[e] = side;
        }
      }
    }
    for (let b = 0; b < n; b++) {
      if (a === b) continue;
      const e = a * n + b;
      const dy = g.top[a] - g.top[b];            // >0：b 比 a 高
      const gap = Math.max(0, g.left[b] - g.right[a], g.left[a] - g.right[b]);
      if (Math.abs(dy) <= LEVEL_EPS) {
        // 同高且幾乎相接：直接走過去
        if (gap <= 8) {
          g.kind[e] = EDGE_WALK;
          g.takeX[e] = g.left[b] >= g.right[a] - 8 ? g.right[a] : g.left[a];
          g.exitDir[e] = g.left[b] >= g.right[a] - 8 ? 1 : -1;
        }
        continue;
      }
      if (dy > 0 && gap <= UP_GAP_MAX) {
        g.kind[e] = EDGE_JUMP;
        g.need[e] = jumpVelFor(dy + JUMP_CLEARANCE);
        if (gap === 0) {
          const o0 = Math.max(g.left[a], g.left[b]), o1 = Math.min(g.right[a], g.right[b]);
          g.takeX[e] = (o0 + o1) / 2; g.exitDir[e] = 0;
        } else if (g.left[b] > g.right[a]) {
          g.takeX[e] = g.right[a] - 6; g.exitDir[e] = 1;
        } else {
          g.takeX[e] = g.left[a] + 6; g.exitDir[e] = -1;
        }
      }
    }
  }
  return g;
}

// 某個跳躍級距的下一步表：table[from * n + to] = 下一個平台，-1 = 到不了，from === to 時為 to
export function getTable(g, classIdx) {
  if (g.tables[classIdx]) return g.tables[classIdx];
  const n = g.n, maxVel = JUMP_CLASSES[classIdx];
  const table = new Int16Array(n * n).fill(-1);
  const dist = new Int16Array(n);
  const queue = new Int16Array(n);
  for (let t = 0; t < n; t++) {
    dist.fill(-1);
    dist[t] = 0; table[t * n + t] = t;
    let qh = 0, qt = 0;
    queue[qt++] = t;
    while (qh < qt) {
      const u = queue[qh++];
      for (let v = 0; v < n; v++) {
        if (dist[v] >= 0) continue;
        const e = v * n + u;
        const k = g.kind[e];
        if (k === EDGE_NONE) continue;
        if (k === EDGE_JUMP && g.need[e] > maxVel) continue;
        dist[v] = dist[u] + 1;
        table[v * n + t] = u;
        queue[qt++] = v;
      }
    }
  }
  g.tables[classIdx] = table;
  return table;
}

// 站在哪個平台上（腳底 y 與平台頂差不多、x 在範圍內）；空中回傳 -1。
// margin：重心超出平台邊緣多少仍算站在上面（寬身體的怪重心走出邊緣前不會掉下去，傳入半個身體寬）
export function platformAt(g, x, feetY, tol = 14, margin = 6) {
  let best = -1, bestD = tol + 1;
  for (let i = 0; i < g.n; i++) {
    if (x < g.left[i] - margin || x > g.right[i] + margin) continue;
    const d = Math.abs(feetY - g.top[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

const cache = new WeakMap();
// 以 mapData.platforms 陣列為 key 快取（同一張地圖只建一次）
export function getPlatformGraph(platforms) {
  if (!platforms || platforms.length === 0) return null;
  let g = cache.get(platforms);
  if (!g) { g = buildPlatformGraph(platforms); cache.set(platforms, g); }
  return g;
}

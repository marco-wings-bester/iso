import { CELL, COLS, ROWS, DATA } from './walkMask.js';

// Walkable area = the dirt path, baked from the map by scripts/build-walkmask.py.
// Everything here works in image-space pixels (768 × 1376).
const bits = Uint8Array.from(atob(DATA), ch => ch.charCodeAt(0));

function cellWalkable(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  const i = r * COLS + c;
  return ((bits[i >> 3] >> (7 - (i & 7))) & 1) === 1;
}

export function isWalkable(ix, iy) {
  return cellWalkable(Math.floor(ix / CELL), Math.floor(iy / CELL));
}

// sx/sy are the player's feet in screen-space; scale+offsets convert to image-space.
export function isOnPath(sx, sy, scale, offX, offY) {
  return isWalkable((sx - offX) / scale, (sy - offY) / scale);
}

function lineWalkable(ax, ay, bx, by) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (CELL / 2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Route along the path from (fx,fy) toward (tx,ty), image-space.
// If the target is off the path, heads to the closest reachable path point.
// Returns a list of waypoints (excluding the start), or [] if already there.
export function findRoute(fx, fy, tx, ty) {
  const start = Math.floor(fy / CELL) * COLS + Math.floor(fx / CELL);
  const goalC = tx / CELL - 0.5;
  const goalR = ty / CELL - 0.5;
  const goal = Math.floor(ty / CELL) * COLS + Math.floor(tx / CELL);

  const prev = new Int32Array(COLS * ROWS).fill(-1);
  prev[start] = start;
  const queue = [start];
  let best = start;
  let bestD = Infinity;

  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const c = cur % COLS;
    const r = (cur - c) / COLS;
    const d = (c - goalC) ** 2 + (r - goalR) ** 2;
    if (d < bestD) { best = cur; bestD = d; }
    if (cur === goal) break;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!cellWalkable(nc, nr)) continue;
        // No corner cutting on diagonals
        if (dr && dc && !(cellWalkable(c + dc, r) && cellWalkable(c, r + dr))) continue;
        const n = nr * COLS + nc;
        if (prev[n] !== -1) continue;
        prev[n] = cur;
        queue.push(n);
      }
    }
  }

  // Cell chain from start to best, as cell-centre points
  const cells = [];
  for (let n = best; n !== start; n = prev[n]) cells.push(n);
  cells.reverse();
  const pts = cells.map(n => ({
    x: (n % COLS + 0.5) * CELL,
    y: (Math.floor(n / COLS) + 0.5) * CELL,
  }));
  if (best === goal && isWalkable(tx, ty) && pts.length) pts[pts.length - 1] = { x: tx, y: ty };

  // Smooth: skip waypoints while there's a straight walkable line
  const route = [];
  let ax = fx;
  let ay = fy;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineWalkable(ax, ay, pts[j].x, pts[j].y)) j--;
    route.push(pts[j]);
    ax = pts[j].x;
    ay = pts[j].y;
    i = j + 1;
  }
  return route;
}

import { CELL, COLS, ROWS, DATA } from './walkMask.js';

// A grid of walkable cells over a scene, in world pixels. Movement only checks
// the player's feet against it; tap-to-walk routes along it.
export default class WalkGrid {
  constructor(cols, rows, cell, cells /* Uint8Array, 1 = walkable */) {
    Object.assign(this, { cols, rows, cell, cells });
  }

  // Build from a predicate on cell centres (used for interiors).
  static fromFn(width, height, cell, walkable) {
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const cells = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells[r * cols + c] = walkable((c + 0.5) * cell, (r + 0.5) * cell) ? 1 : 0;
      }
    }
    return new WalkGrid(cols, rows, cell, cells);
  }

  cellWalkable(c, r) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.cells[r * this.cols + c] === 1;
  }

  isWalkable(x, y) {
    return this.cellWalkable(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  lineWalkable(ax, ay, bx, by) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (this.cell / 2));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  // Route from (fx,fy) toward (tx,ty). If the target isn't walkable, heads to
  // the closest reachable point. Returns waypoints (excluding the start).
  findRoute(fx, fy, tx, ty) {
    const { cols, rows, cell } = this;
    const start = Math.floor(fy / cell) * cols + Math.floor(fx / cell);
    const goalC = tx / cell - 0.5;
    const goalR = ty / cell - 0.5;
    const goal = Math.floor(ty / cell) * cols + Math.floor(tx / cell);

    const prev = new Int32Array(cols * rows).fill(-1);
    prev[start] = start;
    const queue = [start];
    let best = start;
    let bestD = Infinity;

    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const c = cur % cols;
      const r = (cur - c) / cols;
      const d = (c - goalC) ** 2 + (r - goalR) ** 2;
      if (d < bestD) { best = cur; bestD = d; }
      if (cur === goal) break;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (!this.cellWalkable(nc, nr)) continue;
          // No corner cutting on diagonals
          if (dr && dc && !(this.cellWalkable(c + dc, r) && this.cellWalkable(c, r + dr))) continue;
          const n = nr * cols + nc;
          if (prev[n] !== -1) continue;
          prev[n] = cur;
          queue.push(n);
        }
      }
    }

    // Cell chain from start to best, as cell-centre points
    const cellsOnPath = [];
    for (let n = best; n !== start; n = prev[n]) cellsOnPath.push(n);
    cellsOnPath.reverse();
    const pts = cellsOnPath.map(n => ({
      x: (n % cols + 0.5) * cell,
      y: (Math.floor(n / cols) + 0.5) * cell,
    }));
    if (best === goal && this.isWalkable(tx, ty) && pts.length) pts[pts.length - 1] = { x: tx, y: ty };

    // Smooth: skip waypoints while there's a straight walkable line
    const route = [];
    let ax = fx;
    let ay = fy;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineWalkable(ax, ay, pts[j].x, pts[j].y)) j--;
      route.push(pts[j]);
      ax = pts[j].x;
      ay = pts[j].y;
      i = j + 1;
    }
    return route;
  }
}

// The farm: walkable = the dirt path, baked from the map by scripts/build-walkmask.py.
const bits = Uint8Array.from(atob(DATA), ch => ch.charCodeAt(0));
const farmCells = new Uint8Array(COLS * ROWS);
for (let i = 0; i < farmCells.length; i++) farmCells[i] = (bits[i >> 3] >> (7 - (i & 7))) & 1;
export const farmGrid = new WalkGrid(COLS, ROWS, CELL, farmCells);

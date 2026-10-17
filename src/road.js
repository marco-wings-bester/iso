import { obj } from './pixelArt.js';
import { hash, smooth, pixels, GRASS, GRASS_HI, FLOWERS } from './views/art.js';

// The crossroads past the farm gate (Level 2, src/RoadScene.js), drawn as
// pixel art like the farm map, w × h px to fit the screen: the road down
// from the farm (up, through the farm's fence) crosses the road from the
// beach (left: sand and a strip of sea) to Pieter's house (right: his
// picket fence and post box), and carries on down to town (cobbles and a
// street lamp). Signs name each road.

const DIRT = [[228, 180, 110], [218, 170, 102]];
const DIRT_EDGE = [196, 150, 90];
const SANDY = [[236, 212, 156], [226, 200, 144]];
const SAND = [[240, 222, 170], [228, 208, 152]];
const SEA = [86, 160, 216];
const SEA_DEEP = [64, 132, 196];
const SEA_HI = [128, 192, 236];
const FOAM = [240, 248, 252];
const GRASS_SHADOW = [96, 146, 52];
const KERB = [120, 112, 100];
const MORTAR = [132, 124, 110];
const STONES = [[182, 176, 162], [168, 162, 148], [196, 190, 176]];
const LEAVES = ['#3c6e26', '#4f8a30', '#6fae3e', '#9ccc58'];
const INK = '#2e1d0c';

// Where everything is, for a w × h picture: the roads (and where he can
// walk on them), where he arrives from the farm, the signs, and where he
// steps back to at the end of a road that isn't open yet.
export function roadLayout(w, h) {
  const cx = Math.round(w / 2);
  const cy = Math.round(h * 0.55);
  const half = 10; // half a road's width
  // the roads wander a little (straight through the crossing)
  const mv = y => Math.round(1.6 * Math.sin((y - cy) * 0.05) + 0.8 * Math.sin((y - cy) * 0.13));
  const mh = x => Math.round(1.6 * Math.sin((x - cx) * 0.06) + 0.8 * Math.sin((x - cx) * 0.15));
  // how far inside a road (x, y) is, in px (negative: out on the grass)
  const depth = (x, y) => Math.max(
    half - Math.abs(x - cx - mv(y)),
    half - Math.abs(y - cy - mh(x)),
    half + 5 - Math.hypot(x - cx, y - cy),
  );
  const onRoadV = y => ({ x: cx + mv(y), y });
  const onRoadH = x => ({ x, y: cy + mh(x) });
  return {
    w, h, cx, cy, half, mv, mh, depth,
    walkable: (x, y) => depth(x, y) >= 4, // his feet, a body's width from the verge
    fromFarm: onRoadV(16),
    crossing: { x: cx, y: cy },
    // a few steps back from the end of each road
    back: { farm: onRoadV(16), town: onRoadV(h - 14), beach: onRoadH(14), pieter: onRoadH(w - 14) },
    // signs: anchor point, which corner of the board is on it, and the end of its road
    signs: [
      { to: 'farm', x: cx + half + 4, y: 22, ox: 0, oy: 0, end: onRoadV(0) },
      { to: 'town', x: cx + half + 4, y: h - 4, ox: 0, oy: 1, end: onRoadV(h) },
      { to: 'beach', x: 3, y: cy - half - 5, ox: 0, oy: 1, end: onRoadH(0) },
      { to: 'pieter', x: w - 3, y: cy - half - 5, ox: 1, oy: 1, end: onRoadH(w) },
    ],
  };
}

export function drawRoad(ctx, L) {
  const { w, h, cx, cy, half, mv, depth } = L;
  const shore = y => 7 + Math.round(1.2 * Math.sin(y * 0.11) + 0.7 * Math.sin(y * 0.27)); // the sea's edge
  const sandTo = y => 20 + Math.round(2 * Math.sin(y * 0.07 + 1)); // the beach's sand reaches here

  // the ground: sea, sand, grass and the roads
  pixels(ctx, w, h, (x, y) => {
    const n = hash(x >> 1, y >> 1);
    const sea = shore(y);
    if (x < sea) {
      if (x === sea - 1) return FOAM;
      if (hash(x >> 1, y >> 2) < 0.12) return SEA_HI; // glints on the waves
      return x < sea - 4 ? SEA_DEEP : SEA;
    }
    const d = depth(x, y);
    if (d >= 0) {
      // towards town (down) the road is cobbled
      if (Math.abs(x - cx - mv(y)) <= half + 1 && y > h - 30 + 6 * hash(x, 7)) {
        if (d < 1) return KERB;
        const row = Math.floor(y / 4);
        const off = (row & 1) * 3;
        if (y % 4 === 0 || (x + off) % 6 === 0) return MORTAR;
        return STONES[Math.floor(hash(Math.floor((x + off) / 6), row) * 3)];
      }
      if (d < 1) return DIRT_EDGE;
      // towards the beach (left) it turns sandy
      const sandy = hash(x, y) < smooth(sandTo(y) + 16, sandTo(y), x);
      const c = sandy ? SANDY : DIRT;
      return hash(x, y) < 0.05 ? DIRT_EDGE : n < 0.3 ? c[1] : c[0];
    }
    if (x < sandTo(y) + (hash(x, y) - 0.5) * 3) return n < 0.3 ? SAND[1] : SAND[0];
    if (d > -1.5) return GRASS_SHADOW;
    if (hash(x * 3 + 1, y * 5) < 0.005) return FLOWERS[Math.floor(hash(x, y * 3) * FLOWERS.length)];
    if (hash(x, y) < 0.03) return GRASS_HI;
    return GRASS[n < 0.3 ? 2 : n < 0.65 ? 1 : 0];
  });

  // tufts of dune grass on the sand, and a shell
  for (let y = 8; y < h - 4; y += 9) {
    const x = shore(y) + 3 + Math.floor(hash(y, 3) * (sandTo(y) - shore(y) - 5));
    if (depth(x, y) > -3 || hash(y, 9) < 0.3) continue;
    ctx.fillStyle = '#7aa848';
    ctx.fillRect(x, y - 3, 1, 3);
    ctx.fillRect(x + 1, y - 2, 1, 2);
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  const shellY = Math.round(L.cy + half + 14);
  ctx.fillStyle = '#f4c8b8';
  ctx.fillRect(shore(shellY) + 4, shellY, 2, 1);
  ctx.fillStyle = '#d89888';
  ctx.fillRect(shore(shellY) + 4, shellY + 1, 2, 1);

  // the farm's fence along the top, open where the road comes through
  const wood = (x, y, ww, hh) => obj(ctx, x, y, ww, hh, (r) => { r(0, 0, ww, hh, '#8c5838'); r(0, 0, ww, 1, '#a86a3c'); });
  const gapL = cx + mv(10) - half - 1;
  const gapR = cx + mv(10) + half + 1;
  [8, 13].forEach((y) => {
    wood(0, y, gapL - 2, 2);
    wood(gapR + 2, y, w - gapR - 2, 2);
  });
  for (let x = 3; x < w; x += 10) {
    if (x > gapL - 6 && x < gapR + 3) continue;
    wood(x, 5, 2, 12);
  }
  wood(gapL - 3, 2, 3, 16);
  wood(gapR, 2, 3, 16);

  // trees, bushes and a rock in the four corners between the roads
  const areas = {
    tl: { x0: 20, x1: cx - half - 6, y0: 24, y1: cy - half - 8 },
    tr: { x0: cx + half + 6, x1: w - 10, y0: 30, y1: cy - half - 10 },
    bl: { x0: 20, x1: cx - half - 6, y0: cy + half + 6, y1: h - 6 },
    br: { x0: cx + half + 6, x1: w - 10, y0: cy + half + 14, y1: h - 18 },
  };
  const at = (a, fx, fy) => ({ x: Math.round(a.x0 + (a.x1 - a.x0) * fx), y: Math.round(a.y0 + (a.y1 - a.y0) * fy) });
  const size = a => Math.max(7, Math.min(13, Math.round(Math.min(a.x1 - a.x0, a.y1 - a.y0) * 0.24)));
  const tall = a => a.y1 - a.y0 > (a.x1 - a.x0) * 1.5;
  Object.values(areas).forEach((a, i) => {
    if (a.x1 - a.x0 < 14 || a.y1 - a.y0 < 20) return;
    const r = size(a);
    const foot = (fx, fy) => {
      const p = at(a, fx, fy);
      return { x: p.x, y: Math.max(p.y, a.y0 + 2 * r + 8) };
    };
    if (tall(a)) {
      tree(ctx, foot([0.55, 0.62, 0.45, 0.6][i], 0.3), r);
      tree(ctx, foot([0.4, 0.4, 0.62, 0.45][i], 0.85), r - 2);
    } else {
      tree(ctx, foot([0.6, 0.62, 0.45, 0.6][i], 0.6), r);
    }
    // bushes along the verges, some with berries, some in flower
    [[0.15, 0.9], [0.9, 0.12]].forEach(([fx, fy], j) => {
      const b = at(a, [fx, 1 - fx, fx, 1 - fx][i], [fy, fy, 1 - fy, 1 - fy][i]);
      if (depth(b.x, b.y) < -8) bush(ctx, b.x, b.y, 4 + j, ['#d04c3a', '#f8f0e0', '#c8a0e6', '#f8d870'][(i + j) % 4]);
    });
  });
  const rk = at(areas.bl, 0.25, 0.92);
  if (depth(rk.x, rk.y) < -6) obj(ctx, rk.x - 3, rk.y - 4, 6, 4, (r) => { r(0, 1, 6, 3, '#9a948a'); r(1, 0, 4, 1, '#9a948a'); r(1, 1, 2, 1, '#c4beb2'); });

  // a signpost at the crossing
  const sx = cx + half + 7;
  const sy = cy - half - 3;
  obj(ctx, sx, sy - 18, 2, 18, (r) => { r(0, 0, 2, 18, '#7a4a2a'); r(0, 0, 1, 18, '#a86a3c'); });
  const board = (x, y, left) => obj(ctx, x, y, 8, 3, (r) => {
    r(left ? 1 : 0, 0, 7, 3, '#c88a52');
    r(left ? 1 : 0, 0, 7, 1, '#e0a868');
    r(left ? 0 : 7, 1, 1, 1, '#c88a52');
  });
  board(sx - 8, sy - 17, true);
  board(sx + 2, sy - 13, false);
  board(sx - 8, sy - 9, true);

  // Pieter's place: his white picket fence along the right, and his post box
  [[22, cy - half - 6], [cy + half + 6, h - 2]].forEach(([y0, y1]) => {
    obj(ctx, w - 4, y0, 1, y1 - y0, r => r(0, 0, 1, y1 - y0, '#c8bca8'));
    for (let y = y0; y < y1 - 3; y += 6) obj(ctx, w - 5, y, 3, 4, (r) => { r(0, 0, 3, 4, '#f0e8d8'); r(1, 0, 1, 1, '#ffffff'); });
  });
  const mb = { x: w - 15, y: cy + half + 5 };
  obj(ctx, mb.x, mb.y, 7, 11, (r) => {
    r(2, 4, 2, 7, '#7a4a2a');
    r(0, 0, 7, 5, '#c04a3a');
    r(0, 0, 7, 1, '#e06a50');
    r(6, 1, 1, 3, '#f8d870');
  });

  // a street lamp where the cobbles start, towards town
  const lx = cx - half - 8;
  const ly = h - 36;
  obj(ctx, lx, ly, 5, 20, (r) => {
    r(2, 4, 1, 15, '#4a4a52');
    r(1, 19, 3, 1, '#3a3a40');
    r(0, 0, 5, 4, '#3a3a40');
    r(1, 1, 3, 2, '#f8e8a0');
  });
}

// A round tree like the farm's: trunk, a shadow on the grass and a lumpy
// canopy lit from the top left; (x, y) is the foot of the trunk.
function tree(ctx, { x, y }, r) {
  ctx.fillStyle = 'rgb(96, 146, 52)';
  for (let dx = -r; dx <= r; dx++) {
    const hh = Math.round(2 * Math.sqrt(1 - (dx / (r + 1)) ** 2));
    ctx.fillRect(x + dx + 2, y - hh + 1, 1, hh * 2);
  }
  obj(ctx, x - 2, y - 8, 4, 8, (rr) => { rr(0, 0, 4, 8, '#7a4a2a'); rr(0, 0, 1, 8, '#a86a3c'); });
  canopy(ctx, x, y - 7 - r, r, x);
}

function bush(ctx, x, y, r, berry) {
  canopy(ctx, x, y - r, r, y);
  [[-2, -r], [1, -r + 2], [-1, -1]].forEach(([dx, dy]) => {
    ctx.fillStyle = berry;
    ctx.fillRect(x + dx, y + dy, 1, 1);
  });
}

function canopy(ctx, cx, cy, r, seed) {
  for (let py = -r - 2; py <= r + 2; py++) {
    for (let px = -r - 2; px <= r + 2; px++) {
      const lump = r + 0.6 * Math.sin(Math.atan2(py, px) * 7 + seed);
      const d = Math.hypot(px, py);
      if (d > lump + 1) continue;
      let c = INK;
      if (d <= lump) {
        const light = (-px - py * 1.2) / (r * 1.6) + (hash(cx + px, cy + py) - 0.5) * 0.25;
        c = LEAVES[light > 0.4 ? 3 : light > -0.05 ? 2 : light > -0.55 ? 1 : 0];
      }
      ctx.fillStyle = c;
      ctx.fillRect(cx + px, cy + py, 1, 1);
    }
  }
}

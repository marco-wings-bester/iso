import { hash } from './views/art.js';

// The crossroads past the farm gate (Level 2, src/RoadScene.js): pixel art
// in the farm map's style and scale, drawn in code for the screen's shape.
// Art pixels are 2 world px (as on the farm map). The road from the farm
// (up) crosses the road from the beach (left: dunes, the sea, a boat) to
// Pieter's house (right: his roof, picket fence and post box), and carries
// on down to town (cobbles, lamps, stone walls and rooftops). In between:
// a wheat field with a scarecrow, an orchard, a pond and a sheep paddock.

const PX = 2; // world px per art pixel

// colours, sampled from the farm map where it has them
const C = {
  grass: [128, 176, 64], grassLo: [120, 168, 58], grassHi: [136, 184, 70], grassDark: [110, 160, 48],
  tuft: [100, 150, 46], tuftHi: [154, 198, 84],
  road: [225, 175, 102], roadLo: [210, 162, 92], roadHi: [236, 188, 116], roadRim: [204, 156, 88],
  sand: [236, 214, 160], sandLo: [224, 200, 144], sandWet: [208, 184, 130], foam: [244, 250, 252],
  sea: [72, 150, 210], seaDeep: [56, 128, 196], seaHi: [112, 182, 232],
  cobble: [[184, 178, 164], [170, 164, 150], [198, 192, 178]], mortar: [132, 124, 110],
  ink: [46, 29, 12], leafInk: [36, 56, 26], pineInk: [22, 44, 28],
  leaves: [[52, 96, 38], [74, 124, 44], [98, 150, 54], [124, 174, 66], [150, 196, 84]],
  pine: [[30, 70, 42], [44, 96, 54], [62, 122, 66], [86, 146, 80]],
  trunk: [[70, 40, 28], [99, 58, 40], [130, 80, 52]],
  wood: [[100, 60, 36], [140, 88, 50], [176, 116, 66]],
  wheat: [[190, 150, 60], [222, 186, 84], [244, 214, 120]],
  hay: [[196, 156, 64], [230, 196, 96], [248, 222, 140]],
  water: [[64, 130, 190], [88, 160, 214], [130, 190, 232]],
  wool: [[214, 210, 198], [240, 238, 228], [252, 252, 248]], sheepFace: [60, 56, 60],
  stone: [[150, 144, 134], [176, 170, 160], [204, 198, 188]],
  roofRed: [[150, 56, 42], [188, 78, 58], [214, 104, 80]], roofBlue: [[60, 92, 130], [84, 122, 164], [112, 150, 190]],
  white: [[208, 202, 190], [240, 234, 222], [255, 255, 250]],
  flowers: [[248, 248, 240], [248, 216, 112], [232, 140, 180], [190, 150, 230], [230, 80, 70]],
};

const lerp = (a, b, t) => a + (b - a) * t;
// smooth value noise, 0…1
function noise(x, y, s) {
  const gx = x / s;
  const gy = y / s;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(x0, y0), hash(x0 + 1, y0), u), lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), u), v);
}

// Where everything is, in world px for a w × h screen: the roads (and where
// he can walk on them), where he comes in from the farm, where each road
// ends, the signs, and where he steps back to from a road that isn't open.
export function roadLayout(w, h) {
  const aw = Math.ceil(w / PX);
  const ah = Math.ceil(h / PX);
  const cx = Math.round(aw / 2);
  const cy = Math.round(ah * 0.5);
  const half = 18; // half a road's width, art px (the farm's path is as wide)
  const sea = y => 16 + Math.round(2 * Math.sin(y * 0.05) + Math.sin(y * 0.13)); // the shoreline
  const sand = y => 44 + Math.round(3 * Math.sin(y * 0.03 + 1)); // where the grass starts
  const mv = y => Math.round(4 * Math.sin((y - cy) * 0.018) + 1.5 * Math.sin((y - cy) * 0.05));
  const mh = x => Math.round(3 * Math.sin((x - cx) * 0.022) + 1.5 * Math.sin((x - cx) * 0.06));
  // how far inside a road an art pixel is (negative: off it)
  const depth = (x, y) => Math.max(
    half - Math.abs(x - cx - mv(y)),
    x > sea(y) + 6 ? half - Math.abs(y - cy - mh(x)) : -99,
    half + 8 - Math.hypot(x - cx, y - cy),
  );
  const beachEnd = sea(cy) + 12;
  const v = y => ({ x: (cx + mv(y / PX)) * PX, y }); // on the road up/down, world px
  const hz = x => ({ x, y: (cy + mh(x / PX)) * PX }); // on the road left/right
  return {
    w, h, aw, ah, px: PX, cx, cy, half, sea, sand, mv, mh, depth,
    walkable: (x, y) => depth(x / PX, y / PX) >= 6 && x / PX >= beachEnd - 4,
    fromFarm: v(24),
    arrive: v(Math.round(h * 0.16)),
    crossing: { x: cx * PX, y: cy * PX },
    // past these he's off the screen (farm) or at the end of the road (the rest)
    exits: { farm: y => y <= 10, town: y => y >= h - 10 },
    top: 50, // a tap above this walks back up to the farm…
    farmEnd: v(0), // …to the top of the road
    beachX: beachEnd * PX + 8,
    pieterX: w - 10,
    back: { town: v(h - 44), beach: hz(beachEnd * PX + 40), pieter: hz(w - 44) },
    signs: [
      { to: 'farm', x: (cx + half + 6) * PX, y: Math.round(h * 0.12), ox: 0, oy: 0.5, end: v(0) },
      { to: 'town', x: (cx - half - 8) * PX, y: h - 150, ox: 1, oy: 1, end: v(h) },
      { to: 'beach', x: beachEnd * PX, y: (cy - half - 6) * PX, ox: 0, oy: 1, end: hz(0) },
      { to: 'pieter', x: w - 8, y: (cy - half - 6) * PX, ox: 1, oy: 1, end: hz(w) },
    ],
  };
}

// A pixel buffer to paint into, then put on the canvas.
function buffer(aw, ah) {
  const data = new Uint8ClampedArray(aw * ah * 4);
  return {
    aw, ah, data,
    set(x, y, c) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= aw || y >= ah) return;
      const i = (y * aw + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    },
  };
}

// Paint a shape over its box: `inside(x, y)` says whether a pixel is in it,
// `color(x, y)` its colour; pixels just outside it get the outline colour.
function shape(b, x0, y0, x1, y1, inside, color, outline) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (inside(x, y)) b.set(x, y, color(x, y));
      else if (outline && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1))) b.set(x, y, outline);
    }
  }
}

const rect = (b, x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) b.set(xx, yy, c); };
const ellipse = (b, cx, cy, rx, ry, c) => shape(b, cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, () => c);

export function drawRoad(ctx, L) {
  const { aw, ah, cx, cy, half, sea, sand, mv, depth } = L;
  const b = buffer(aw, ah);
  const townY = y => ah - 64 + Math.round(4 * Math.sin(y)); // where the cobbles start

  // the ground: sea, beach, grass, the roads
  for (let y = 0; y < ah; y++) {
    const s = sea(y);
    const g = sand(y);
    for (let x = 0; x < aw; x++) {
      const d = depth(x, y);
      const n = noise(x, y, 14);
      let c;
      if (x < s) {
        c = x === s - 1 ? C.foam : x === s - 2 && hash(x, y >> 1) < 0.5 ? C.foam : x < s - 6 ? C.seaDeep : C.sea;
        if (hash(x >> 2, y >> 1) < 0.08 && x < s - 2) c = C.seaHi;
      } else if (d >= 0) {
        if (y > townY(x) && Math.abs(x - cx - mv(y)) <= half + 1) {
          // cobbles towards town
          const row = Math.floor(y / 4);
          const off = (row & 1) * 3;
          c = d < 1.5 ? C.stone[0] : (y % 4 === 0 || (x + off) % 6 === 0) ? C.mortar : C.cobble[Math.floor(hash(Math.floor((x + off) / 6), row) * 3)];
        } else {
          const sandy = x < g + 24 && hash(x, y) < (g + 24 - x) / 30;
          c = sandy ? (n < 0.4 ? C.sandLo : C.sand) : d < 1.5 ? C.roadRim : C.road;
          if (!sandy && d >= 1.5) {
            const r = hash(x * 7, y * 3);
            if (r < 0.04) c = C.roadLo;
            else if (r > 0.97) c = C.roadHi;
          }
        }
      } else if (x < g + (hash(x, y) - 0.5) * 3) {
        c = x < s + 3 ? C.sandWet : n < 0.35 ? C.sandLo : C.sand;
      } else if (d > -2) {
        c = C.grassDark; // the road's verge
      } else {
        c = n < 0.33 ? C.grassLo : n > 0.68 ? C.grassHi : C.grass;
      }
      b.set(x, y, c);
    }
  }

  // tufts and little flowers in the grass (not on the roads or the beach)
  const onGrass = (x, y) => x > sand(y) + 3 && depth(x, y) < -4;
  for (let i = 0; i < aw * ah / 90; i++) {
    const x = Math.floor(hash(i, 1) * aw);
    const y = Math.floor(hash(i, 2) * ah);
    if (!onGrass(x, y)) continue;
    if (hash(i, 3) < 0.8) {
      b.set(x, y, C.tuft); b.set(x - 1, y - 1, C.tuft); b.set(x + 1, y - 1, C.tuft); b.set(x, y - 1, C.tuftHi);
    } else {
      const f = C.flowers[Math.floor(hash(i, 4) * C.flowers.length)];
      b.set(x, y - 1, f); b.set(x - 1, y, f); b.set(x + 1, y, f); b.set(x, y + 1, f); b.set(x, y, C.flowers[1]);
    }
  }
  // dune grass and shells on the sand
  for (let y = 4; y < ah - 4; y += 7) {
    const x = sea(y) + 6 + Math.floor(hash(y, 5) * (sand(y) - sea(y) - 8));
    if (depth(x, y) > -3) continue;
    if (hash(y, 6) < 0.7) [[0, 0], [0, -1], [0, -2], [-1, -1], [1, -2], [1, -3]].forEach(([dx, dy]) => b.set(x + dx, y + dy, [118, 160, 70]));
    else { b.set(x, y, [244, 196, 180]); b.set(x + 1, y, [220, 160, 150]); }
  }

  // Things standing about, in the four corners between the roads: first the
  // big pieces (a wheat field, an orchard, a pond, a sheep paddock), then
  // trees, pines and bushes wherever there's room. Drawn back to front.
  const items = [];
  const corners = {
    tl: { x0: sand(cy / 2) + 6, x1: cx - half - 6, y0: 0, y1: cy - half - 6 },
    tr: { x0: cx + half + 6, x1: aw - 10, y0: 0, y1: cy - half - 6 },
    bl: { x0: sand(cy * 1.5) + 6, x1: cx - half - 6, y0: cy + half + 6, y1: ah - 72 },
    br: { x0: cx + half + 6, x1: aw - 10, y0: cy + half + 6, y1: ah - 72 },
  };
  const taken = [];
  const overlaps = (x, y, w, h) => taken.some(t => x < t.x + t.w && x + w > t.x && y < t.y + t.h && y + h > t.y);
  // keep clear: the signs, the signpost, Pieter's cottage
  const keep = (x, y, w, h) => taken.push({ x, y, w, h });
  keep(cx + half + 4, Math.round(ah * 0.12) - 10, 56, 20);
  keep(cx + half + 2, cy - half - 34, 26, 30);
  keep(sand(cy) - 4, cy - half - 22, 50, 18);
  keep(aw - 62, cy - half - 22, 62, 18);
  keep(cx - half - 64, ah - 96, 60, 20);
  // a big piece at fraction (fx, fy) of a corner, `w` × `h`; false if it won't fit
  const place = (corner, fx, fy, w, h, draw, { flat = false, pad = 0 } = {}) => {
    const a = corners[corner];
    if (a.x1 - a.x0 < w || a.y1 - a.y0 < h) return false;
    const x = Math.round(a.x0 + (a.x1 - a.x0 - w) * fx);
    const y = Math.round(a.y0 + (a.y1 - a.y0 - h) * fy);
    if (overlaps(x - pad, y - pad, w + 2 * pad, h + 2 * pad)) return false;
    keep(x - pad, y - pad, w + 2 * pad, h + 2 * pad);
    items.push({ base: flat ? -1 : y + h, draw: () => draw(x, y, w, h) });
    return true;
  };
  const qw = a => corners[a].x1 - corners[a].x0;
  const qh = a => corners[a].y1 - corners[a].y0;

  place('tl', 0.5, 0.88, Math.min(qw('tl') - 4, 96), Math.min(Math.round(qh('tl') * 0.36), 84), (x, y, w, h) => wheatField(b, x, y, w, h), { flat: true, pad: 3 });
  place('tr', 0.35, 0.7, Math.min(qw('tr') - 4, 100), Math.min(Math.round(qh('tr') * 0.42), 104), (x, y, w, h) => orchard(b, x, y, w, h), { pad: 2 });
  place('bl', 0.65, 0.15, Math.min(qw('bl') - 6, 76), Math.min(Math.round(qh('bl') * 0.26), 48), (x, y, w, h) => pond(b, x, y, w, h), { flat: true, pad: 4 });
  place('br', 0.3, 0.22, Math.min(qw('br') - 4, 96), Math.min(Math.round(qh('br') * 0.3), 66), (x, y, w, h) => paddock(b, x, y, w, h), { flat: true, pad: 3 });

  // then fill in: big trees, pines, bushes, the odd rock
  Object.keys(corners).forEach((corner, ci) => {
    for (let i = 0; i < 60; i++) {
      const k = hash(i * 13 + ci, 77);
      const fx = hash(i, ci * 7 + 1);
      const fy = hash(ci * 3 + 2, i);
      if (k < 0.34) {
        const r = 20 + Math.floor(hash(i, ci) * 8);
        place(corner, fx, fy, 2 * r + 4, Math.round(r * 2.7), (x, y, w, h) => tree(b, x + w / 2, y + h - 2, r), { pad: -Math.round(r * 0.35) });
      } else if (k < 0.58) {
        const r = 14 + Math.floor(hash(ci, i) * 6);
        const tall = Math.round(r * 4.2);
        place(corner, fx, fy, 2 * r + 4, tall + 10, (x, y, w, h) => pine(b, x + w / 2, y + h - 3, r, tall), { pad: -Math.round(r * 0.3) });
      } else if (k < 0.9) {
        const r = 7 + Math.floor(hash(i, ci + 9) * 4);
        place(corner, fx, fy, 2 * r + 2, 2 * r + 4, (x, y, w, h) => bush(b, x + w / 2, y + h - 2, r, C.flowers[(i + ci) % C.flowers.length]));
      } else {
        place(corner, fx, fy, 10, 7, (x, y) => rock(b, x, y));
      }
    }
  });

  // the beach: a little jetty where the beach road meets the sea, and a rowing boat
  items.push({ base: -1, draw: () => jetty(b, sea(cy), cy + L.mh(sea(cy)) - 5) });
  const boatY = Math.round(cy + half + 22);
  if (boatY + 14 < ah - 72) items.push({ base: boatY + 8, draw: () => boat(b, sea(boatY) + 6, boatY) });

  // Pieter's place, off to the right: the corner of his cottage, his picket fence, his post box
  const cottageY = cy - half - 64;
  if (cottageY > 8) {
    keep(aw - 46, cottageY - 8, 46, 64);
    items.push({ base: cottageY + 54, draw: () => cottage(b, aw - 42, cottageY, C.roofBlue, [236, 226, 204]) });
  }
  items.push({ base: -1, draw: () => pickets(b, aw - 5, 4, cottageY - 6, cottageY + 58, cy - half - 6, cy + half + 6, ah - 70) });
  items.push({ base: cy + half + 16, draw: () => postBox(b, aw - 20, cy + half + 4) });

  // towards town: street lamps, the first houses, and low stone walls between
  const roadX = cx + mv(ah - 40);
  items.push({ base: ah - 40, draw: () => lamp(b, roadX - half - 7, ah - 74) });
  items.push({ base: ah - 40, draw: () => lamp(b, roadX + half + 4, ah - 74) });
  items.push({ base: ah, draw: () => cottage(b, roadX - half - 74, ah - 62, C.roofRed, [232, 214, 186]) });
  items.push({ base: ah, draw: () => cottage(b, roadX + half + 14, ah - 58, C.roofRed, [220, 200, 170]) });
  items.push({ base: ah + 1, draw: () => wall(b, 0, ah - 8, roadX - half - 74) });
  items.push({ base: ah + 1, draw: () => wall(b, roadX + half + 76, ah - 8, aw) });

  // a signpost at the crossing
  items.push({ base: cy - half - 6, draw: () => signpost(b, cx + half + 10, cy - half - 6) });

  items.sort((p, q) => p.base - q.base).forEach(it => it.draw());
  ctx.putImageData(new ImageData(b.data, aw, ah), 0, 0);
}

// A clump of leaves: overlapping round clusters, each lit from the top left,
// with dark creases where one sits in front of another.
function canopy(b, cx, cy, r, fruit) {
  const clumps = [[0, 0, 0.62], [-0.45, -0.25, 0.48], [0.45, -0.25, 0.48], [0, -0.5, 0.5], [-0.5, 0.25, 0.45], [0.5, 0.25, 0.45], [0, 0.35, 0.5]]
    .map(([dx, dy, k]) => ({ x: cx + dx * r, y: cy + dy * r, r: k * r }));
  const inside = (x, y) => clumps.some(c => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r);
  shape(b, cx - r, cy - r, cx + r, cy + r, inside, (x, y) => {
    let front = null;
    clumps.forEach((c) => { if ((x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r && (!front || c.y > front.y)) front = c; });
    const nx = (x - front.x) / front.r;
    const ny = (y - front.y) / front.r;
    const edge = Math.hypot(nx, ny);
    let l = -0.55 * nx - 0.8 * ny + (hash(x, y) - 0.5) * 0.35 - (front.y - cy) / r * 0.15;
    if (edge > 0.82 && clumps.some(c => c !== front && c.y < front.y && (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r)) l -= 0.8;
    return C.leaves[Math.max(0, Math.min(4, Math.round(1.8 + l * 1.6)))];
  }, C.leafInk);
  if (!fruit) return;
  for (let i = 0; i < 9; i++) {
    const a = hash(cx + i, cy) * Math.PI * 2;
    const d = Math.sqrt(hash(cy, cx + i)) * r * 0.75;
    const fx = Math.round(cx + Math.cos(a) * d);
    const fy = Math.round(cy + Math.sin(a) * d);
    shape(b, fx - 1.5, fy - 1.5, fx + 1.5, fy + 1.5, (x, y) => (x - fx) ** 2 + (y - fy) ** 2 <= 2.2,
      (x, y) => (x < fx && y < fy ? [Math.min(255, fruit[0] + 40), Math.min(255, fruit[1] + 50), Math.min(255, fruit[2] + 40)] : fruit), C.leafInk);
  }
}

// A round tree like the farm's: shadow, trunk with roots, leafy crown
// (with fruit, if given). (x, y) is the foot of the trunk.
function tree(b, x, y, r, fruit) {
  ellipse(b, x + 2, y - 1, r * 0.9, r * 0.32, C.grassDark);
  const top = y - r * 0.9;
  shape(b, x - 6, top, x + 6, y, (px, py) => {
    const t = (py - top) / (y - top); // 0 at the top, 1 at the roots
    const halfW = 2.5 + (t > 0.75 ? (t - 0.75) * 18 : 0);
    return py >= top && py <= y && Math.abs(px - x) <= halfW && !(t > 0.85 && Math.abs(px - x) > 2 && hash(px, 3) < 0.5);
  }, (px) => C.trunk[px < x - 1 ? 2 : px > x + 1 ? 0 : 1], C.ink);
  canopy(b, x, top - r * 0.7, r, fruit);
  if (fruit) {
    [[-r * 0.8, 1], [r * 0.6, -1]].forEach(([dx, dy]) => {
      const fx = Math.round(x + dx);
      shape(b, fx - 1, y + dy - 1, fx + 1, y + dy + 1, (px, py) => Math.abs(px - fx) + Math.abs(py - y - dy) <= 1, () => fruit, C.leafInk);
    });
  }
}

// A pine: tiers of jagged boughs, lit from the left.
function pine(b, x, y, r, h) {
  ellipse(b, x + 2, y, r * 0.8, 3, C.grassDark);
  rect(b, x - 1, y - 6, 3, 6, C.trunk[1]);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t0 = y - 4 - h + (h * i) / (tiers + 0.5);
    const t1 = t0 + h / (tiers - 0.6);
    const w = r * (0.45 + 0.55 * (i + 1) / tiers);
    shape(b, x - w - 1, t0, x + w + 1, t1, (px, py) => {
      if (py < t0 || py > t1) return false;
      const t = (py - t0) / (t1 - t0);
      const jag = py > t1 - 3 ? ((px + i) % 4 < 2 ? 0 : 2) : 0;
      return Math.abs(px - x) <= w * t && py <= t1 - jag;
    }, (px, py) => {
      const l = -(px - x) / w * 0.9 + (hash(px, py) - 0.5) * 0.5;
      return C.pine[Math.max(0, Math.min(3, Math.round(1.5 + l * 1.4)))];
    }, C.pineInk);
  }
}

function bush(b, x, y, r, flower) {
  ellipse(b, x + 1, y, r, r * 0.3, C.grassDark);
  canopy(b, x, y - r * 0.8, r * 0.95);
  for (let i = 0; i < 7; i++) {
    const fx = Math.round(x + (hash(x + i, y) - 0.5) * r * 1.4);
    const fy = Math.round(y - r * 0.8 + (hash(y, x + i) - 0.5) * r * 1.2);
    b.set(fx, fy, flower); b.set(fx + 1, fy, flower); b.set(fx, fy + 1, flower); b.set(fx + 1, fy + 1, [248, 216, 112]);
  }
}

function rock(b, x, y) {
  shape(b, x, y + 1, x + 9, y + 6, (px, py) => ((px - x - 4.5) / 4.5) ** 2 + ((py - y - 4) / 3) ** 2 <= 1,
    (px, py) => C.stone[py < y + 3 && px < x + 5 ? 2 : py > y + 4 ? 0 : 1], C.ink);
}

// A wooden rail fence, left to right at y (its feet), as on the farm.
function fenceH(b, x0, x1, y) {
  [y - 8, y - 4].forEach(ry => shape(b, x0, ry, x1, ry + 1, (px, py) => px >= x0 && px <= x1 && py >= ry && py <= ry + 1,
    (px, py) => C.wood[py === ry ? 2 : 1], C.ink));
  for (let px = x0; px <= x1; px += 9) post(b, Math.min(px, x1 - 2), y);
  post(b, x1 - 2, y);
}

// …and top to bottom at x.
function fenceV(b, x, y0, y1) {
  shape(b, x, y0 - 6, x + 1, y1 - 6, (px, py) => px >= x && px <= x + 1 && py >= y0 - 6 && py <= y1 - 6, px => C.wood[px === x ? 2 : 1], C.ink);
  for (let py = y0; py <= y1; py += 8) post(b, x - 1, py);
}

function post(b, x, y) {
  shape(b, x, y - 11, x + 2, y, (px, py) => px >= x && px <= x + 2 && py >= y - 11 && py <= y,
    (px, py) => (py === y - 11 ? C.wood[2] : C.wood[px === x ? 2 : px === x + 2 ? 0 : 1]), C.ink);
}

function wheatField(b, x, y, w, h) {
  for (let py = y + 4; py < y + h - 2; py++) {
    for (let px = x + 3; px < x + w - 3; px++) {
      const row = (py - y) % 5;
      let c = row === 0 ? C.wheat[0] : row === 1 ? C.wheat[2] : C.wheat[1];
      if (row !== 0 && hash(px, py) < 0.12) c = C.wheat[2];
      if (row === 4 && hash(px * 3, py) < 0.3) c = C.wheat[0];
      b.set(px, py, c);
    }
  }
  // a scarecrow and two hay bales
  const sx = x + Math.round(w * 0.62);
  const sy = y + Math.round(h * 0.45);
  rect(b, sx, sy - 14, 1, 16, C.wood[0]);
  shape(b, sx - 5, sy - 10, sx + 5, sy - 9, (px, py) => px >= sx - 5 && px <= sx + 5 && py >= sy - 10 && py <= sy - 9, () => C.wood[1], C.ink);
  shape(b, sx - 2, sy - 10, sx + 2, sy - 4, (px, py) => px >= sx - 2 && px <= sx + 2 && py >= sy - 10 && py <= sy - 4, (px, py) => ((px + py) % 3 ? [70, 110, 170] : [200, 70, 60]), C.ink);
  shape(b, sx - 2, sy - 15, sx + 2, sy - 11, (px, py) => (px - sx) ** 2 + (py - sy + 13) ** 2 <= 4.5, () => [236, 214, 160], C.ink);
  rect(b, sx - 3, sy - 16, 7, 1, [150, 110, 60]);
  rect(b, sx - 2, sy - 17, 5, 1, [150, 110, 60]);
  [[x + 10, y + h - 9], [x + 20, y + h - 7]].forEach(([hx, hy]) => hayBale(b, hx, hy));
  fenceH(b, x, x + w, y + 3);
  fenceH(b, x, x + w, y + h);
  fenceV(b, x, y + 4, y + h);
  fenceV(b, x + w - 2, y + 4, y + h);
}

function hayBale(b, x, y) {
  shape(b, x - 5, y - 5, x + 5, y + 4, (px, py) => ((px - x) / 5) ** 2 + ((py - y) / 4.5) ** 2 <= 1, (px, py) => {
    const d = Math.hypot((px - x) / 5, (py - y) / 4.5);
    return d > 0.55 && d < 0.75 ? C.hay[0] : px < x && py < y ? C.hay[2] : C.hay[1];
  }, C.ink);
}

function pond(b, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const inside = (px, py) => ((px - cx) / (w / 2 - 3)) ** 2 + ((py - cy) / (h / 2 - 3)) ** 2 + 0.08 * Math.sin(px * 0.5 + py) <= 1;
  shape(b, x, y, x + w, y + h, inside, (px, py) => {
    const d = ((px - cx) / (w / 2 - 3)) ** 2 + ((py - cy) / (h / 2 - 3)) ** 2;
    if (d > 0.8) return C.water[0];
    return hash(px >> 2, py) < 0.06 ? C.water[2] : C.water[1];
  }, [92, 120, 70]);
  // lily pads and reeds
  [[0.3, 0.45], [0.62, 0.6], [0.5, 0.3]].forEach(([fx, fy]) => {
    const lx = Math.round(x + w * fx);
    const ly = Math.round(y + h * fy);
    shape(b, lx - 2, ly - 1, lx + 2, ly + 1, (px, py) => ((px - lx) / 2.3) ** 2 + ((py - ly) / 1.4) ** 2 <= 1 && !(px === lx + 1 && py === ly - 1), () => [92, 160, 64], null);
  });
  b.set(Math.round(x + w * 0.62), Math.round(y + h * 0.6) - 1, [240, 160, 200]);
  for (let i = 0; i < 6; i++) {
    const rx = Math.round(x + 4 + (i < 3 ? i * 3 : w - 14 + (i - 3) * 3));
    const ry = Math.round(y + h * 0.55 + (i % 2) * 3);
    rect(b, rx, ry - 7, 1, 7, [70, 120, 50]);
    rect(b, rx, ry - 9, 1, 2, [130, 84, 50]);
  }
}

function paddock(b, x, y, w, h) {
  // three sheep and a trough
  [[0.22, 0.45], [0.55, 0.7], [0.7, 0.35]].forEach(([fx, fy], i) => sheep(b, Math.round(x + w * fx), Math.round(y + h * fy), i % 2 === 0));
  shape(b, x + w - 22, y + h - 14, x + w - 8, y + h - 10, (px, py) => px >= x + w - 22 && px <= x + w - 8 && py >= y + h - 14 && py <= y + h - 10,
    (px, py) => (py === y + h - 14 ? [130, 180, 220] : C.stone[1]), C.ink);
  fenceH(b, x, x + w, y + 3);
  fenceH(b, x, x + w, y + h);
  fenceV(b, x, y + 4, y + h);
  fenceV(b, x + w - 2, y + 4, y + h);
}

function sheep(b, x, y, left) {
  ellipse(b, x + 1, y + 4, 7, 2, C.grassDark);
  [-4, -1, 2, 4].forEach(dx => rect(b, x + dx, y + 1, 1, 3, C.sheepFace));
  shape(b, x - 6, y - 6, x + 6, y + 2, (px, py) => ((px - x) / 6.5) ** 2 + ((py - y + 2) / 4.5) ** 2 <= 1 || (((px - x) / 5) ** 2 + ((py - y + 5) / 3) ** 2 <= 1),
    (px, py) => C.wool[py > y ? 0 : (px + py) % 4 === 0 ? 0 : px < x && py < y - 2 ? 2 : 1], C.ink);
  const hx = x + (left ? -7 : 7);
  shape(b, hx - 2, y - 5, hx + 2, y - 1, (px, py) => ((px - hx) / 2.2) ** 2 + ((py - y + 3) / 2.4) ** 2 <= 1, () => C.sheepFace, C.ink);
  b.set(hx + (left ? -1 : 1), y - 4, [240, 240, 240]);
}

function boat(b, x, y) {
  shape(b, x, y, x + 24, y + 9, (px, py) => ((px - x - 12) / 12) ** 2 + ((py - y - 4.5) / 4.5) ** 2 <= 1, (px, py) => {
    if (py === y + 4) return [110, 66, 40];
    return py < y + 4 ? (px < x + 12 ? [190, 120, 70] : [160, 98, 56]) : [130, 80, 46];
  }, C.ink);
  rect(b, x + 3, y + 10, 20, 1, C.sandWet);
}

// A cottage seen as on the farm map: a tiled roof with a chimney over a
// front wall with a window and a door (cut off at the screen's edge).
function cottage(b, x, y, tiles, plaster) {
  const w = 60;
  const rh = 26;
  // the wall
  shape(b, x + 3, y + rh, x + w - 3, y + rh + 28, (px, py) => px >= x + 3 && px <= x + w - 3 && py >= y + rh && py <= y + rh + 28,
    (px, py) => (py < y + rh + 3 ? [plaster[0] - 40, plaster[1] - 40, plaster[2] - 40] : plaster), C.ink);
  shape(b, x + 12, y + rh + 8, x + 22, y + rh + 17, (px, py) => px >= x + 12 && px <= x + 22 && py >= y + rh + 8 && py <= y + rh + 17,
    (px, py) => (px === x + 17 || py === y + rh + 12 ? [90, 60, 40] : [150, 200, 230]), C.ink);
  shape(b, x + 34, y + rh + 8, x + 43, y + rh + 28, (px, py) => px >= x + 34 && px <= x + 43 && py >= y + rh + 8 && py <= y + rh + 28,
    (px) => C.wood[px < x + 37 ? 2 : 1], C.ink);
  // the roof, its eaves over the wall
  shape(b, x, y, x + w, y + rh, (px, py) => py >= y && py <= y + rh && px >= x + Math.max(0, 6 - (py - y)) && px <= x + w - Math.max(0, 6 - (py - y)), (px, py) => {
    if (py <= y + 2) return tiles[2];
    const row = Math.floor((py - y) / 4);
    if ((py - y) % 4 === 3 || (px + row * 3) % 7 === 0) return tiles[0];
    return py > y + rh - 3 ? tiles[0] : tiles[1];
  }, C.ink);
  const ch = x + Math.round(w * 0.66);
  shape(b, ch, y - 8, ch + 6, y + 6, (px, py) => px >= ch && px <= ch + 6 && py >= y - 8 && py <= y + 6,
    (px, py) => (py <= y - 7 ? [90, 80, 74] : px <= ch + 1 ? [200, 120, 96] : [170, 90, 70]), C.ink);
}

// Fruit trees in rows, apples and oranges, with windfalls.
function orchard(b, x, y, w, h) {
  const cols = w > 70 ? 2 : 1;
  const rows = h > 70 ? 2 : 1;
  const r = Math.min(18, Math.floor(w / cols / 2) - 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const tx = x + Math.round((i + 0.5) * w / cols) + (j % 2 ? 4 : -4);
      const ty = y + Math.round((j + 1) * h / rows) - 3;
      tree(b, tx, ty, r, (i + j) % 3 === 2 ? [240, 150, 60] : C.flowers[4]);
    }
  }
}

// A short wooden jetty out into the sea at the end of the beach road.
function jetty(b, xEnd, y) {
  shape(b, 0, y, xEnd + 2, y + 10, (px, py) => px >= 0 && px <= xEnd + 2 && py >= y && py <= y + 10,
    (px, py) => (px % 5 === 0 ? C.wood[0] : py === y ? C.wood[2] : C.wood[1]), C.ink);
  [2, 8].forEach(dy => rect(b, xEnd - 1, y + dy, 2, 3, C.wood[0]));
}

// Pieter's white picket fence down the right-hand side, with gaps for his
// cottage and the road.
function pickets(b, x, y0, gap1, gap1To, gap2, gap2To, yEnd) {
  const run = (from, to) => {
    if (to - from < 8) return;
    rect(b, x - 1, from + 2, 4, to - from - 2, [216, 210, 196]);
    for (let py = from; py < to; py += 4) {
      shape(b, x - 1, py, x + 2, py + 5, (px, py2) => px >= x - 1 && px <= x + 2 && py2 >= py + (px === x - 1 || px === x + 2 ? 1 : 0) && py2 <= py + 5,
        px => C.white[px === x - 1 ? 2 : 1], [120, 110, 96]);
    }
  };
  if (gap1 > y0) {
    run(y0, gap1);
    run(gap1To, gap2);
  } else {
    run(y0, gap2);
  }
  run(gap2To, yEnd);
}

function postBox(b, x, y) {
  rect(b, x + 2, y + 5, 2, 8, C.wood[0]);
  shape(b, x, y, x + 6, y + 5, (px, py) => px >= x && px <= x + 6 && py >= y && py <= y + 5, (px, py) => (py === y ? [230, 110, 90] : [196, 64, 50]), C.ink);
  rect(b, x + 7, y + 1, 1, 3, [248, 216, 112]);
}

function wall(b, x0, y, x1) {
  if (x1 - x0 < 4) return;
  shape(b, x0, y, x1, y + 6, (px, py) => px >= x0 && px <= x1 && py >= y && py <= y + 6, (px, py) => {
    const row = Math.floor((py - y) / 3);
    if ((py - y) % 3 === 2 || (px + row * 3) % 7 === 0) return C.stone[0];
    return py === y ? C.stone[2] : C.stone[1];
  }, C.ink);
}

function lamp(b, x, y) {
  shape(b, x, y + 6, x + 2, y + 30, (px, py) => px >= x && px <= x + 2 && py >= y + 6 && py <= y + 30, px => (px === x ? [90, 90, 100] : [56, 56, 64]), C.ink);
  shape(b, x - 2, y, x + 4, y + 6, (px, py) => px >= x - 2 && px <= x + 4 && py >= y && py <= y + 6, (px, py) => (py === y || py === y + 6 ? [56, 56, 64] : [252, 232, 150]), C.ink);
}

// A signpost: a post with boards pointing each way.
function signpost(b, x, y) {
  shape(b, x, y - 26, x + 2, y, (px, py) => px >= x && px <= x + 2 && py >= y - 26 && py <= y, px => C.wood[px === x ? 2 : 1], C.ink);
  const board = (bx, by, left) => shape(b, bx, by, bx + 12, by + 4, (px, py) => {
    if (py < by || py > by + 4) return false;
    const tip = left ? px - bx : bx + 12 - px;
    return px >= bx && px <= bx + 12 && (tip >= 2 || Math.abs(py - by - 2) <= tip);
  }, (px, py) => (py === by ? C.wood[2] : C.wood[1]), C.ink);
  board(x - 12, y - 25, true);
  board(x + 2, y - 20, false);
  board(x - 12, y - 15, true);
  board(x + 2, y - 10, false);
}

import { obj } from '../pixelArt.js';
import { hash, mix, band, pixels, ellipse, rgb } from './art.js';

// Farmer Jones at the end of the jetty, looking out over the pond: sky and
// clouds, the far bank's trees mirrored in the water, glints of sun on the
// surface, lily pads flattened by distance, cattails at the edges, and the
// jetty's last planks, posts and the toes of his boots in the foreground.

const SKY = [[104, 168, 224], [120, 180, 232], [140, 194, 236], [164, 208, 240], [188, 222, 244], [208, 232, 246]];
const WATER = [[150, 200, 230], [124, 182, 220], [100, 162, 206], [80, 142, 190], [64, 124, 174], [52, 108, 158]];
const TREES = [[112, 168, 76], [88, 144, 62], [64, 116, 50], [48, 92, 42]];
const HILLS = [158, 196, 128];
const BANK = [120, 176, 64];

function geometry(w, h) {
  const portrait = h > w;
  const hz = Math.round(h * (portrait ? 0.36 : 0.42)); // far bank's waterline
  const end = Math.round(h * (portrait ? 0.8 : 0.78)); // end of the jetty
  const k = Math.min(w, h) / 160;
  return { hz, end, k };
}

// Height of the tree line above the waterline at x.
const treeTop = (x, k) => (17 + 5 * Math.sin(x * 0.19) + 4 * Math.sin(x * 0.47 + 2) + 3 * Math.sin(x * 0.9 + 1)) * k;

function treeColor(x, y, hz, k) {
  const top = hz - treeTop(x, k);
  const t = (y - top) / (hz - top);
  const leaf = hash(x >> 1, y >> 1) < 0.35 ? 1 : 0;
  return TREES[Math.max(0, Math.min(3, Math.floor(t * 3.2) + leaf))];
}

function draw(ctx, w, h) {
  const { hz, end, k } = geometry(w, h);

  pixels(ctx, w, h, (x, y) => {
    const tree = hz - treeTop(x, k);
    const hill = hz - (26 + 6 * Math.sin(x * 0.05 + 1)) * k;
    if (y < hill) return band(SKY, y / hill, x, y);
    if (y < tree) return HILLS;
    if (y < hz - 4 * k) return treeColor(x, y, hz, k);
    if (y < hz) return y < hz - 3 * k ? mix(BANK, [255, 255, 255], 0.15) : BANK;

    // Water: sky-coloured far away, deeper blue close by.
    const p = (y - hz) / (h - hz);
    let c = band(WATER, Math.min(1, p * 1.6), x, y);
    // the far bank mirrored, with a little wobble
    const dy = y - hz;
    const wob = x + (((y * 7) % 3) - 1);
    const mirror = hz - dy / 0.85;
    if (mirror > hz - treeTop(wob, k)) {
      const src = mirror > hz - 4 * k ? BANK : treeColor(wob, Math.floor(mirror), hz, k);
      c = mix(src, c, 0.35 + 0.4 * (dy / (treeTop(wob, k) * 0.85)));
      c = [c[0] * 0.85, c[1] * 0.9, c[2] * 0.95];
    }
    // glints of sun: short streaks, longer and sparser closer to him
    const gap = 2 + Math.floor(p * 7);
    const seg = 2 + Math.floor(p * 10);
    if (y % gap === 0 && hash(Math.floor((x + y * 3) / seg), y) > 0.82) c = mix(c, [236, 248, 252], 0.65);
    return c;
  });

  // Clouds
  [[0.2, 0.08, 1], [0.7, 0.14, 0.8], [0.95, 0.05, 0.6]].forEach(([cx, cy, s]) => cloud(ctx, cx * w, cy * h, s * 14 * k));

  // Lily pads (x, y as fractions; r = size), flattened with distance
  [
    [0.12, 0.43, 3, 0], [0.47, 0.45, 3.5, 0], [0.74, 0.5, 5, 0], [0.2, 0.54, 6, 1],
    [0.58, 0.58, 7, 0], [0.88, 0.63, 8, 1], [0.32, 0.68, 10, 0], [0.7, 0.74, 9, 0],
  ].forEach(([fx, fy, r, flower]) => {
    const py = fy * h;
    if (py > end - 2) return;
    lilyPad(ctx, fx * w, py, r * k, (py - hz) / (h - hz), flower);
  });

  cattails(ctx, 0, hz + (end - hz) * 0.55, k, 1, 7);
  cattails(ctx, w, hz + (end - hz) * 0.35, k * 0.8, -1, 13);

  jetty(ctx, w, h, end, k);
}

function cloud(ctx, cx, cy, r) {
  const puffs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [0.35, -0.35, 0.7], [-0.4, -0.25, 0.6]];
  puffs.forEach(([dx, dy, s]) => ellipse(ctx, cx + dx * r, cy + dy * r * 0.6, r * s, r * s * 0.6, (u, v) => (v > 0.35 ? [214, 228, 240] : [252, 252, 252])));
}

function lilyPad(ctx, cx, cy, r, p, flower) {
  const ry = r * (0.3 + 0.25 * p);
  ellipse(ctx, cx, cy, r + 1, ry + 1, (u, v) => (u > 0.1 && Math.abs(v) < u * 0.45 ? null : [32, 72, 32]));
  ellipse(ctx, cx, cy, r, ry, (u, v) => {
    if (u > 0 && Math.abs(v) < u * 0.45 + 0.08) return null; // the notch
    if (u * u + v * v > 0.7) return [64, 128, 52];
    return u < -0.3 && v < -0.1 ? [140, 196, 96] : [96, 164, 68];
  });
  if (!flower) return;
  ellipse(ctx, cx - r * 0.3, cy - ry * 0.6, Math.max(2, r * 0.32), Math.max(1.5, r * 0.22), (u, v) => (u * u + v * v < 0.25 ? [248, 220, 120] : v < 0 ? [250, 180, 210] : [232, 140, 180]));
}

// A clump of cattails growing out of the water at the edge of his view.
function cattails(ctx, x0, base, k, dir, seed) {
  for (let i = 0; i < 6; i++) {
    const x = Math.round(x0 + dir * (2 + i * 3.2 + hash(i, seed) * 3) * k);
    const tall = (26 + hash(seed, i) * 22) * k;
    const lean = (hash(i + 3, seed) - 0.5) * 0.25;
    for (let j = 0; j < tall; j++) {
      const xx = Math.round(x + lean * j);
      ctx.fillStyle = j > tall - 2 ? '#8cc850' : '#4f8a30';
      ctx.fillRect(xx, Math.round(base - j), 1, 1);
    }
    if (i % 2 === 0) {
      const tx = Math.round(x + lean * (tall - 9 * k));
      obj(ctx, tx - 1, Math.round(base - tall + 2 * k), 3, Math.round(6 * k), r => {
        r(0, 0, 3, Math.round(6 * k), '#7a4a2a');
        r(0, 0, 1, Math.round(6 * k), '#9a6038');
      });
    } else {
      // a long leaf blade arching out
      for (let j = 0; j < tall * 0.8; j++) {
        ctx.fillStyle = '#5f9e38';
        ctx.fillRect(Math.round(x - dir * (j * j) / (tall * 1.6)), Math.round(base - j), 1, 1);
      }
    }
  }
  // their reflections, faint
  ctx.fillStyle = 'rgba(40, 80, 40, 0.25)';
  ctx.fillRect(dir > 0 ? x0 : x0 - 20 * k, base + 1, 20 * k, 3 * k);
}

// The end of the jetty under him: planks widening towards him, two posts at
// the corners and the toes of his boots.
function jetty(ctx, w, h, end, k) {
  const BOARDS = [[178, 120, 68], [166, 110, 62]];
  const left = y => -0.12 * w + (0.2 * w) * (h - y) / (h - end);
  const right = y => w - left(y);
  // shadow on the water just past the end
  ctx.fillStyle = 'rgba(20, 40, 60, 0.35)';
  ctx.fillRect(Math.round(left(end)), end - 2, Math.round(right(end) - left(end)), 2);
  // end face of the last board
  const face = Math.round(3 * k);
  let y = end;
  let board = 0;
  let height = 4 * k;
  while (y < h) {
    const isFace = y < end + face;
    const bh = isFace ? face : Math.round(height);
    for (let yy = y; yy < Math.min(h, y + bh); yy++) {
      const l = Math.round(left(yy));
      const r = Math.round(right(yy));
      for (let x = Math.max(0, l); x < Math.min(w, r); x++) {
        let c = isFace ? [112, 70, 40] : BOARDS[board % 2];
        if (!isFace && hash(Math.floor(x / (6 * k)), board) > 0.86 && yy === y + 1) c = [140, 90, 50]; // grain
        if (yy === y + bh - 1) c = [70, 44, 24]; // gap between boards
        if (x === l || x === r - 1) c = [46, 29, 12];
        ctx.fillStyle = rgb(c);
        ctx.fillRect(x, yy, 1, 1);
      }
    }
    if (!isFace) {
      // nail heads near each end of the board
      ctx.fillStyle = '#5a5050';
      [0.22, 0.78].forEach(f => ctx.fillRect(Math.round(left(y) + (right(y) - left(y)) * f), y + 1, 1, 1));
      board++;
      height *= 1.22;
    }
    y += bh;
  }
  // posts at the corners of the end
  [0, 1].forEach(side => {
    const px = side ? right(end) - 9 * k : left(end) + 1;
    const pw = Math.round(8 * k);
    const top = Math.round(end - 14 * k);
    obj(ctx, Math.round(px), top, pw, Math.round(26 * k), r => {
      r(0, 0, pw, 26 * k, '#8c5838');
      r(0, 0, 2, 26 * k, '#a86a3c');
      r(pw - 2, 0, 2, 26 * k, '#6b4226');
      r(0, 0, pw, 3, '#c88a52');
      r(1, 1, pw - 2, 1, '#e0a868');
    });
  });
  // the toes of his boots
  [-1, 1].forEach(side => {
    const bx = Math.round(w / 2 + side * 13 * k - 7 * k);
    const by = Math.round(h - 12 * k);
    obj(ctx, bx, by, Math.round(14 * k), Math.round(14 * k), r => {
      r(1, 0, 12 * k, 14 * k, '#7a4a2a');
      r(0, 3, 14 * k, 11 * k, '#7a4a2a');
      r(2, 1, 4 * k, 3, '#9a6038');
      r(0, 9 * k, 14 * k, 2, '#4a2a14');
    });
  });
}

// Sparkles on the water and, now and then, a fish jumping.
function animate(scene, w, h) {
  const { hz, end, k } = geometry(w, h);
  const flatten = y => 0.18 + 0.3 * (y - hz) / (h - hz);

  scene.time.addEvent({
    delay: 260,
    loop: true,
    callback: () => {
      const x = Math.random() * w;
      const y = hz + 4 + Math.random() * (end - hz - 8);
      const s = scene.add.rectangle(x, y, 1 + (y > hz + (end - hz) / 2 ? 1 : 0), 1, 0xf4fcff).setOrigin(0);
      scene.tweens.add({ targets: s, alpha: 0, duration: 600, onComplete: () => s.destroy() });
    },
  });

  const g = scene.add.graphics();
  const jump = () => {
    const x = w * (0.25 + Math.random() * 0.5);
    const y = hz + (end - hz) * (0.25 + Math.random() * 0.45);
    const size = (1 + (y - hz) / (h - hz) * 3) * k;
    const arc = { t: 0 };
    scene.tweens.add({
      targets: arc,
      t: 1,
      duration: 650,
      onUpdate: () => {
        const fx = x - 10 * size + 20 * size * arc.t;
        const fy = y - Math.sin(arc.t * Math.PI) * 14 * size;
        g.clear().fillStyle(0xc8d8e0).fillRect(fx - 2 * size, fy - size / 2, 4 * size, size);
        g.fillStyle(0x8898a8).fillRect(fx - 2 * size, fy, 4 * size, Math.max(1, size / 2));
      },
      onComplete: () => {
        g.clear();
        splash(scene, x + 10 * size, y, size, flatten(y));
      },
    });
    splash(scene, x - 10 * size, y, size * 0.6, flatten(y));
  };
  scene.time.addEvent({ delay: 5200, startAt: 3600, loop: true, callback: jump });
}

function splash(scene, x, y, size, flat) {
  [0, 260].forEach(delay => {
    const ring = { r: 1, a: 0.7 };
    const g = scene.add.graphics();
    scene.tweens.add({
      targets: ring,
      r: 14 * size,
      a: 0,
      delay,
      duration: 1400,
      onUpdate: () => g.clear().lineStyle(1, 0xe8f6ff, ring.a).strokeEllipse(x, y, ring.r * 2, ring.r * 2 * flat),
      onComplete: () => g.destroy(),
    });
  });
}

export default { draw, animate };

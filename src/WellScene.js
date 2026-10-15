import Phaser from 'phaser';
import { obj } from './pixelArt.js';

// Farmer Jones's view straight down a well: the underside of his hat brim at
// the top, his hands on the stone rim, the shaft's stone courses vanishing into
// darkness, the rope hanging down, and far below black water reflecting the
// small bright opening with his own silhouette in it. Drawn as pixel art in
// perspective: a pixel's distance from the centre maps to depth down the shaft.

const ART = 160; // pixel-art size of the shorter screen side
const FADE_MS = 300;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Posterised, ordered-dithered brightness: smooth light falloff, pixel-art look.
function shade(rgb, b, x, y, levels = 8) {
  const q = Math.min(1, Math.max(0, Math.round((b + BAYER[(y & 3) * 4 + (x & 3)] / levels) * levels) / levels));
  return [rgb[0] * q, rgb[1] * q, rgb[2] * q];
}

const STONES = [[128, 122, 110], [110, 106, 96], [140, 132, 118], [100, 98, 90]];
const RIM_STONES = [[184, 178, 164], [168, 162, 148], [196, 190, 174]];
const MOSS = [74, 100, 50];
const MORTAR = [40, 36, 30];
const OUTLINE = [46, 29, 12];

export function wellGeometry(w, h) {
  const M = Math.min(w, h);
  const cx = w / 2;
  const cy = h * 0.47;
  const R = M * 0.36;              // top of the shaft (inner edge of the rim)
  const RIM = R * 1.42;            // outer edge of the rim
  const WATER = 2.8;               // depth of the water, in shaft radii
  return { M, cx, cy, R, RIM, WATER, rWater: R / (1 + WATER), rSky: R / (1 + 2 * WATER) };
}

export function drawWellView(ctx, w, h) {
  const g = wellGeometry(w, h);
  const { M, cx, cy, R, RIM, WATER, rWater, rSky } = g;
  const ROW = 0.17;   // depth of one stone course
  const N = 20;       // stones per course
  const K = 12;       // stones around the rim
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1; // 0 = right, 0.25 = down
      let c;

      if (r < rWater) {
        // Water: black, with the bright opening reflected small in the middle
        // and his silhouette (hat brim seen from below, shoulders) inside it.
        const u = dx / rSky;
        const v = dy / rSky;
        const inSky = r < rSky;
        const hat = Math.hypot(u, v - 0.12) < 0.5;
        const shoulders = (u / 0.8) ** 2 + ((v - 0.85) / 0.4) ** 2 < 1;
        if (inSky && !hat && !shoulders) c = shade([96, 128, 150], 0.5 - 0.15 * (r / rSky), x, y);
        else if (inSky) c = [8, 9, 12];
        else c = shade([30, 44, 56], 0.18 * (1 - smooth(rSky, rWater, r)) + 0.05, x, y);
        if (rWater - r < 1) c = [24, 34, 42]; // wet edge where water meets stone
      } else if (r < R) {
        // Shaft wall: courses of stone, darker with depth.
        const d = R / r - 1;
        const course = d / ROW;
        const row = Math.floor(course);
        const col = a * N + (row % 2) * 0.5;
        const ci = Math.floor(col);
        const pxCourse = (R * ROW) / (1 + d) ** 2;
        const pxStone = (2 * Math.PI * r) / N;
        const mortar = (course - row) * pxCourse < 1 || (col - ci) * pxStone < 1;
        let b = 0.55 * Math.exp(-d * 1.6) * (0.7 + 0.3 * Math.cos(2 * Math.PI * (a - 0.125)));
        if (d < 0.06) b *= 1.15; // lip catching the light
        let rgb = STONES[Math.floor(hash(row, ci) * STONES.length)];
        if (d < 1 && hash(ci, row + 9) < 0.28) rgb = MOSS;
        if (d > WATER - 0.4) rgb = [rgb[0] * 0.7, rgb[1] * 0.8, rgb[2]]; // damp near the water
        c = shade(mortar ? MORTAR : rgb, b, x, y);
      } else if (r < RIM) {
        // Rim: a ring of big capstones in daylight, his shadow on the near side.
        const col = a * K + 0.3;
        const ci = Math.floor(col);
        const edge = r - R < 1.2 || RIM - r < 1.2;
        const seam = (col - ci) * ((2 * Math.PI * r) / K) < 1.2;
        let b = 0.3 + 0.09 * Math.cos(2 * Math.PI * (a - 0.625));
        if (a > 0.12 && a < 0.38) b *= 0.65; // his shadow on the near side
        if (!edge && !seam && (col - ci) * ((2 * Math.PI * r) / K) < 2.6) b *= 1.15; // stone edge highlight
        c = edge ? OUTLINE : seam ? shade(MORTAR, 1, x, y) : shade(RIM_STONES[Math.floor(hash(ci, 3) * 3)], b, x, y);
      } else {
        // Grass around the well, fading into the dark edges of his view.
        const n = hash(Math.floor(x / 2), Math.floor(y / 2));
        let b = (0.32 + 0.08 * n) * (1 - 0.9 * smooth(RIM, RIM + M * 0.45, r));
        if (r < RIM + 3) b *= 0.55;
        c = shade(n < 0.15 ? [96, 140, 56] : [70, 112, 44], b, x, y);
      }

      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  drawRope(ctx, g);
  drawHands(ctx, w, h, g);
  drawHatBrim(ctx, w, g);
}

// The bucket rope, hanging from the windlass above him down into the dark.
function drawRope(ctx, { cx, cy, R }) {
  const x0 = cx + R * 0.28;
  const y0 = 0;
  const x1 = cx + 1;
  const y1 = cy - 2;
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    const depth = Math.max(0, (Math.hypot(x - cx, y - cy) < R ? R / Math.max(1, Math.hypot(x - cx, y - cy)) - 1 : 0));
    const b = 0.75 * Math.exp(-depth * 1.5);
    if (b < 0.06) break;
    const twist = i % 3 === 0 ? 0.75 : 1;
    const wdt = t < 0.45 ? 2 : 1;
    ctx.fillStyle = `rgb(${190 * b * twist | 0}, ${146 * b * twist | 0}, ${84 * b * twist | 0})`;
    ctx.fillRect(x, y, wdt, 1);
    if (t < 0.45) {
      ctx.fillStyle = `rgb(${70 * b | 0}, ${44 * b | 0}, ${20 * b | 0})`;
      ctx.fillRect(x + wdt, y, 1, 1);
    }
  }
}

// Fill a thick line from (x0,y0) to (x1,y1), pixel by pixel, with a dark
// outline; `color(side)` picks the shade across its width (-1 … 1).
function limb(ctx, x0, y0, x1, y1, rad, color) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const len2 = vx * vx + vy * vy;
  const minX = Math.floor(Math.min(x0, x1) - rad - 1);
  const maxX = Math.ceil(Math.max(x0, x1) + rad + 1);
  const minY = Math.floor(Math.min(y0, y1) - rad - 1);
  const maxY = Math.ceil(Math.max(y0, y1) + rad + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * vx + (y + 0.5 - y0) * vy) / len2));
      const px = x + 0.5 - (x0 + vx * t);
      const py = y + 0.5 - (y0 + vy * t);
      const dist = Math.hypot(px, py);
      if (dist > rad) continue;
      const side = (px * -vy + py * vx) / Math.sqrt(len2) / rad;
      ctx.fillStyle = dist > rad - 1 ? '#2e1d0c' : color(side);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// His arms reaching in from the bottom corners, hands gripping the near rim.
function drawHands(ctx, w, h, { cx, cy, R }) {
  const SK = '#e0b090';
  const SKd = '#b88068';
  [-1, 1].forEach(side => {
    const hx = cx + side * R * 0.66;
    const hy = cy + R * 1.02;
    const sx = cx + side * R * 1.9;
    const sy = h + R * 0.4;
    // sleeve (in shadow, he's leaning over), then the cuff
    limb(ctx, sx, sy, hx + side * 2, hy + 12, 13, t => (t * side > 0.4 ? '#5a1c14' : t * side < -0.5 ? '#9a3428' : '#7a261c'));
    obj(ctx, Math.round(hx - 8), Math.round(hy - 4), 16, 13, r => {
      r(0, 2, 16, 9, SK);
      r(0, 8, 16, 3, SKd);
      // fingers curling over the inner edge of the rim
      for (let f = 0; f < 4; f++) r(1 + f * 3.5 | 0, 0, 3, 4, SK);
      for (let f = 0; f < 3; f++) r(4 + f * 3.5 | 0, 0, 1, 4, SKd);
      r(side < 0 ? 14 : 0, 4, 2, 5, SKd);
      r(0, 11, 16, 2, '#6a2018'); // cuff
    });
  });
}

// Underside of his straw hat brim across the top of his view.
function drawHatBrim(ctx, w, { M }) {
  const depth = Math.round(M * 0.13);
  for (let x = 0; x < w; x++) {
    const t = (x - w / 2) / (w * 0.58);
    const bottom = Math.round(depth * (1 - t * t));
    if (bottom <= 0) continue;
    for (let y = 0; y < bottom; y++) {
      const weave = (x + y * 2) % 5 === 0 || (x - y) % 7 === 0;
      ctx.fillStyle = weave ? '#3e2812' : y > bottom - 3 ? '#7a5428' : '#563a1a';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#b88038';
    ctx.fillRect(x, bottom - 1, 1, 1);
    ctx.fillStyle = '#2e1d0c';
    ctx.fillRect(x, bottom, 1, 1);
  }
}

export default class WellScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Well' });
  }

  create() {
    const { width: W, height: H } = this.scale;
    const s = Math.min(W, H) / ART;
    const w = Math.ceil(W / s);
    const h = Math.ceil(H / s);
    if (this.textures.exists('well-view')) this.textures.remove('well-view');
    const tex = this.textures.createCanvas('well-view', w, h);
    drawWellView(tex.getContext(), w, h);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'well-view').setOrigin(0);
    // Nothing but his view: hide page buttons (e.g. Install app) meanwhile.
    document.body.classList.add('well-view');
    this.events.once('shutdown', () => document.body.classList.remove('well-view'));

    // Lean in: start slightly zoomed out and settle.
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000').setZoom(s * 0.92).centerOn(w / 2, h / 2).fadeIn(FADE_MS);
    this.tweens.add({ targets: cam, zoom: s, duration: 900, ease: 'Sine.easeOut' });

    // Now and then a drip sends a ripple across the water.
    const g = wellGeometry(w, h);
    const ripples = this.add.graphics();
    const drip = () => {
      const ox = (Math.random() - 0.5) * g.rWater * 0.5;
      const oy = (Math.random() - 0.5) * g.rWater * 0.5;
      const ring = { r: 0.5, alpha: 0.5 };
      this.tweens.add({
        targets: ring,
        r: g.rWater * 0.75,
        alpha: 0,
        duration: 1600,
        onUpdate: () => {
          ripples.clear().lineStyle(1, 0x8fb0c8, ring.alpha).strokeCircle(g.cx + ox, g.cy + oy, ring.r);
        },
      });
    };
    this.time.addEvent({ delay: 2800, startAt: 1800, loop: true, callback: drip });

    // Tap or press any key to stop looking.
    const done = () => {
      if (this.leaving) return;
      this.leaving = true;
      cam.fadeOut(FADE_MS);
      cam.once('camerafadeoutcomplete', () => {
        this.scene.resume('Game');
        this.scene.stop();
      });
    };
    this.leaving = false;
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', done);
      this.input.keyboard.once('keydown', done);
    });
  }
}

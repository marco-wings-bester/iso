// Shared helpers for the first-person views (well, pond, tractor): drawn as
// pixel art at ~160px on the short side, with dithered, posterised shading.

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);

export const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Posterised, ordered-dithered brightness: smooth light falloff, pixel-art look.
export function shade(rgb, b, x, y, levels = 8) {
  const q = Math.min(1, Math.max(0, Math.round((b + BAYER[(y & 3) * 4 + (x & 3)] / levels) * levels) / levels));
  return [rgb[0] * q, rgb[1] * q, rgb[2] * q];
}

// Pick from a gradient of colours with ordered dithering between bands.
export function band(colors, t, x, y) {
  const f = Math.min(colors.length - 1, Math.max(0, t * (colors.length - 1) + BAYER[(y & 3) * 4 + (x & 3)]));
  return colors[Math.round(f)];
}

// Fill the whole canvas from a per-pixel colour function.
export function pixels(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export const rgb = c => `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;

export const GRASS = [[140, 192, 76], [120, 176, 64], [104, 156, 56]]; // the farm's greens
export const GRASS_HI = [168, 212, 96];
export const FLOWERS = [[248, 240, 220], [248, 216, 112], [200, 160, 230]];
export const SKIN = '#f8c8a0';
export const SKIN_DK = '#d89870';
export const SLEEVE = ['#d04c3a', '#b8402e', '#982f2a'];
export const OUTLINE = '#2e1d0c';

// Fill a thick line from (x0,y0) to (x1,y1), pixel by pixel, with a dark
// outline; `color(side)` picks the shade across its width (-1 … 1).
export function limb(ctx, x0, y0, x1, y1, rad, color) {
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
      ctx.fillStyle = dist > rad - 1 ? OUTLINE : color(side);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// A red shirt sleeve, lit from the left.
export const sleeve = side => t => (t * side > 0.4 ? SLEEVE[2] : t * side < -0.5 ? SLEEVE[0] : SLEEVE[1]);

// Filled ellipse, pixel by pixel; `color(u, v)` gets coordinates in -1 … 1.
export function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      if (u * u + v * v > 1) continue;
      const c = color(u, v, x, y);
      if (!c) continue;
      ctx.fillStyle = typeof c === 'string' ? c : rgb(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

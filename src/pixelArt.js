// Tiny pixel-art toolkit: paint into a grid of colours, add the dark outline
// every object on the map has, then blit to a canvas.

export const OUTLINE = '#2e1d0c';

export function grid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(null));
}

export function rect(g, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (yy >= 0 && yy < g.length && xx >= 0 && xx < g[0].length) g[yy][xx] = color;
    }
  }
}

export function outline(g, color = OUTLINE) {
  const out = g.map(row => row.slice());
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (g[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = color;
    }
  }
  return out;
}

export function blit(ctx, g, ox, oy, scale = 1) {
  g.forEach((row, y) => row.forEach((color, x) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
  }));
}

// Paint an outlined object whose body occupies (x, y, w, h) on the canvas.
// `paint(r)` receives r(x, y, w, h, color) in object-local coordinates.
export function obj(ctx, x, y, w, h, paint) {
  const g = grid(w + 2, h + 2);
  paint((rx, ry, rw, rh, c) => rect(g, rx + 1, ry + 1, rw, rh, c));
  blit(ctx, outline(g), x - 1, y - 1);
}

// Deterministic randomness so textures look the same every time.
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

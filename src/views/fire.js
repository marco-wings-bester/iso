import Phaser from 'phaser';
import { obj } from '../pixelArt.js';
import { BAYER, hash, mix, smooth, shade, pixels, ellipse, rgb, limb, OUTLINE } from './art.js';

// Farmer Jones crouched at the hearth, looking into the fire: the stone
// fireplace from his room (mantel beam with its candle and jug), the sooty
// brick firebox, logs on iron fire dogs over a bed of embers, and the hearth
// stone and floorboards in front of him, all lit by the flames. Animated:
// flames, sparks (now and then a crackle), embers, firelight and the candle.

const STONE = [[196, 196, 188], [168, 168, 160], [150, 150, 140]];
const MORTAR = [100, 98, 90];
const BRICK = [[110, 62, 44], [94, 54, 38], [124, 72, 50]];
const SOOT = [30, 22, 20];
const WALLPAPER = [[239, 217, 176], [229, 203, 160]];
const PANEL = [[168, 106, 60], [140, 88, 56], [74, 42, 20]];
const OAK = [[176, 122, 72], [200, 143, 90], [90, 52, 24]];
const GLOW = [255, 150, 70]; // the colour of firelight
const FLAME = [[255, 250, 214], [255, 216, 80], [255, 150, 40], [234, 86, 28], [168, 40, 20]];

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const portrait = h > w;
  const cx = w / 2;
  const hearth = Math.round(h * (portrait ? 0.68 : 0.78)); // the firebox floor meets the hearth
  const ow = Math.min(w * 0.4, 64 * k);                    // half-width of the opening
  const top = hearth - Math.round((portrait ? 92 : 76) * k);
  const bw = Math.round(ow * 0.62);                        // half-width of the back wall
  const back = hearth - Math.round(16 * k);                // back wall meets the firebox floor
  const backTop = top + Math.round(14 * k);
  return {
    k, cx, hearth, ow, top, bw, back, backTop,
    sw: ow + 24 * k,                                       // half-width of the stone surround
    mantel: top - Math.round(20 * k),
    front: Math.min(h, hearth + Math.round(46 * k)),       // front edge of the hearth stone
    vy: backTop + (back - backTop) * 0.3,                  // eye level (vanishing point)
    fire: { x: cx, y: back - 4 * k },
  };
}

// Top edge of the opening: a shallow arch.
const arch = (g, dx) => g.top - 7 * g.k * Math.max(0, 1 - (dx / g.ow) ** 2);

// Light from the fire at (x, y), 0 … 1; `reach` stretches how far it carries.
function light(g, x, y, reach = 1) {
  const d = Math.hypot(x - g.fire.x, (y - g.fire.y) * 1.3) / (95 * g.k * reach);
  return Math.max(0, 1 - d) ** 1.6;
}

// A colour in the room's dim light, warmed and brightened near the fire.
function lit(c, x, y, g, ambient = 0.55, reach = 1) {
  const l = light(g, x, y, reach);
  return shade(mix(c, GLOW, l * 0.45), ambient + (1 - ambient) * l, x, y, 10);
}

function stoneAt(x, y, g) {
  const rowH = Math.round(9 * g.k);
  const bwid = Math.round(16 * g.k);
  const row = Math.floor(y / rowH);
  const sx = x + (row % 2 ? bwid >> 1 : 0);
  const col = Math.floor(sx / bwid);
  const ix = sx - col * bwid;
  const iy = y - row * rowH;
  if (iy === rowH - 1 || ix === 0) return lit(MORTAR, x, y, g);
  let c = STONE[Math.floor(hash(col, row) * 3)];
  if (iy === 0 || ix === 1) c = mix(c, [255, 255, 255], 0.25); // lit from the top-left, like the room
  else if (iy === rowH - 2) c = mix(c, [0, 0, 0], 0.2);
  return lit(c, x, y, g);
}

// Striped wallpaper over a wooden wainscot, either side of the chimney breast.
function wallAt(x, y, g) {
  const { k } = g;
  const wains = g.hearth - Math.round(34 * k);
  if (y >= wains) {
    if (y < wains + 2 * k) return lit(PANEL[0], x, y, g, 0.5, 1.6);
    const pw = Math.round(10 * k);
    const c = x % pw === 0 ? PANEL[2] : PANEL[hash(Math.floor(x / pw), 3) > 0.5 ? 0 : 1];
    return lit(c, x, y, g, 0.5, 1.6);
  }
  return lit(WALLPAPER[x % Math.round(8 * k) < 2 * k ? 1 : 0], x, y, g, 0.55, 1.6);
}

// Bricks of the firebox, blackened with soot towards the top. On the side
// walls (side = 1) the courses run back towards the vanishing point.
function brick(x, y, g, ambient, side) {
  const { k, bw, ow, vy } = g;
  const adx = Math.abs(x + 0.5 - g.cx);
  const bh = Math.max(2, Math.round(4 * k));
  const yy = side ? vy + (y - vy) * (bw / adx) : y;
  const row = Math.floor(yy / bh);
  let joint;
  if (side) {
    const d = (ow / adx - 1) / (ow / bw - 1); // 0 at the opening … 1 at the back
    const j = d * 3 + (row % 2) * 0.5;
    joint = j - Math.floor(j) < 0.09;
  } else {
    const bwid = Math.round(9 * k);
    joint = (x + (row % 2 ? bwid >> 1 : 0)) % bwid === 0;
  }
  let c = joint || yy - row * bh >= bh - 1 ? [44, 28, 22] : BRICK[Math.floor(hash(Math.floor(x / (9 * k)), row) * 3)];
  c = mix(c, SOOT, 0.75 * (1 - smooth(g.top, g.back, y)));
  return lit(c, x, y, g, ambient, 0.8);
}

function firebox(x, y, dx, adx, g) {
  const { bw, ow, back, backTop, hearth } = g;
  if (y >= back) {
    const inner = bw + (ow - bw) * (y - back) / (hearth - back);
    if (adx > inner) return brick(x, y, g, 0.15, 1);
    const c = hash(x >> 1, y) > 0.7 ? [112, 100, 92] : [82, 72, 66]; // ash
    return lit(c, x, y, g, 0.25, 0.7);
  }
  if (y < backTop) return lit(mix(SOOT, [0, 0, 0], 0.4), x, y, g, 0.15, 0.6); // the throat
  return adx < bw ? brick(x, y, g, 0.2, 0) : brick(x, y, g, 0.15, 1);
}

function hearthStone(x, y, g) {
  const { k, hearth, cx, vy } = g;
  const rows = [0, 8, 19, 33, 46].map(v => hearth + v * k);
  let row = 0;
  while (row < rows.length - 2 && y >= rows[row + 1]) row++;
  const col = px => Math.floor(((px + 0.5 - cx) / (y - vy)) * 2.4 + (row % 2) * 0.5);
  if (y >= g.front - 3 * k) return lit([110, 106, 98], x, y, g, 0.4, 1.3); // its front edge
  if (y - rows[row] < 1 || col(x) !== col(x - 1)) return lit([92, 88, 80], x, y, g, 0.45, 1.3);
  return lit(mix(STONE[Math.floor(hash(col(x), row + 9) * 3)], [80, 78, 72], 0.3), x, y, g, 0.45, 1.3);
}

// Floorboards running across, wider closer to him.
function floorboard(x, y, g) {
  const { k, cx, vy } = g;
  const board = y2 => Math.floor((900 * k) / (y2 - vy));
  const b = board(y);
  const joint = px => Math.floor(((px + 0.5 - cx) / (y - vy)) * 1.4 + b * 0.37);
  if (b !== board(y + 1) || joint(x) !== joint(x - 1)) return lit(OAK[2], x, y, g, 0.45, 1.5);
  const c = hash(Math.floor(x / (5 * k)), b) > 0.8 ? OAK[1] : OAK[0];
  return lit(c, x, y, g, 0.45, 1.5);
}

function draw(ctx, w, h) {
  const g = geometry(w, h);
  const { k, cx, back, bw } = g;

  pixels(ctx, w, h, (x, y) => {
    const dx = x + 0.5 - cx;
    const adx = Math.abs(dx);
    if (y >= g.front) return floorboard(x, y, g);
    if (y >= g.hearth) return adx < g.sw + 8 * k + (y - g.hearth) * 0.6 ? hearthStone(x, y, g) : floorboard(x, y, g);
    if (adx < g.ow && y >= arch(g, dx)) return firebox(x, y, dx, adx, g);
    if (adx < g.sw) return stoneAt(x, y, g);
    return wallAt(x, y, g);
  });

  // a bed of embers, and the back log on it
  ellipse(ctx, cx, back + 3 * k, bw * 0.95, 5 * k, (u, v, x, y) => {
    const r = hash(x, y * 5);
    return r > 0.88 ? [255, 210, 110] : r > 0.6 ? [240, 110, 30] : r > 0.3 ? [150, 42, 20] : [64, 32, 24];
  });
  log(ctx, cx - bw * 0.85, back - 2 * k, cx + bw * 0.85, back - 4 * k, 5 * k, 0.2, 0.8);

  // the mantel beam, its underside lit by the fire
  const mx = Math.round(cx - g.sw - 6 * k);
  const mw = Math.round(2 * (g.sw + 6 * k));
  const mh = Math.round(8 * k);
  obj(ctx, mx, g.mantel, mw, mh, r => {
    r(0, 0, mw, mh, '#a86a3c');
    r(0, 0, mw, 1, '#e0a868');
    r(0, 1, mw, 1, '#c88a52');
    for (let i = 0; i < mw; i += 13) r(i, 3 + (i % 3), 6, 1, '#8c5838');
    r(0, mh - 2, mw, 2, '#d07a40');
  });
  // the candle and the blue jug on it, as in the room
  const c = candle(g);
  obj(ctx, c.x, c.y, Math.round(4 * k), Math.round(9 * k), r => {
    r(0, 0, 4 * k, 9 * k, '#f8f0e0');
    r(3 * k, 0, k, 9 * k, '#d8ccb8');
  });
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(c.x + Math.round(2 * k) - 1, c.y - 1, 1, 1); // wick
  const jx = Math.round(cx + g.ow - 16 * k);
  const jh = Math.round(11 * k);
  obj(ctx, jx, g.mantel - jh, Math.round(9 * k), jh, r => {
    r(0, 2 * k, 9 * k, 9 * k, '#5b86c4');
    r(2 * k, 0, 5 * k, 2 * k, '#5b86c4');
    r(6 * k, 2 * k, 3 * k, 9 * k, '#3f5f96');
    r(2 * k, 4 * k, 1, 4 * k, '#8cb0e0');
  });
}

function candle(g) {
  return { x: Math.round(g.cx - g.ow + 6 * g.k), y: g.mantel - Math.round(9 * g.k) };
}

// A log from (x0, y0) to (x1, y1), charred and glowing between `burnFrom`
// and `burnTo` (fractions along it).
function log(ctx, x0, y0, x1, y1, rad, burnFrom, burnTo) {
  limb(ctx, x0, y0, x1, y1, rad, (side, t, x, y) => {
    const burn = smooth(burnFrom - 0.1, burnFrom + 0.1, t) * (1 - smooth(burnTo - 0.1, burnTo + 0.1, t));
    let c = side < -0.45 ? [132, 92, 56] : side > 0.45 ? [66, 42, 26] : [100, 66, 40];
    if (hash(x >> 1, y) > 0.82) c = mix(c, [40, 26, 16], 0.5); // furrows in the bark
    c = mix(c, [34, 26, 24], burn * 0.85);
    if (burn > 0.4 && hash(x, y * 3) > 0.78) c = hash(y, x) > 0.5 ? [255, 160, 60] : [220, 80, 30];
    return rgb(c);
  });
}

// The sawn end of a log, facing him: rings in pale wood.
function logEnd(ctx, x, y, r) {
  ellipse(ctx, x, y, r + 1, r + 1, () => OUTLINE);
  ellipse(ctx, x, y, r, r, (u, v) => {
    const d = Math.hypot(u, v);
    if (d > 0.78) return [112, 72, 44];
    return Math.floor(d * 4) % 2 ? [190, 146, 92] : [214, 170, 112];
  });
}

// What's in front of the flames: two logs leaning across, and the fire dogs.
function drawFront(ctx, g) {
  const { k, cx, back, bw } = g;
  const ends = [[cx - bw * 0.9, back + 7 * k], [cx + bw * 0.9, back + 8 * k]];
  log(ctx, ends[0][0], ends[0][1], cx + bw * 0.35, back - 9 * k, 4.5 * k, 0.45, 1.1);
  log(ctx, ends[1][0], ends[1][1], cx - bw * 0.3, back - 8 * k, 4.5 * k, 0.4, 1.1);
  ends.forEach(([x, y]) => logEnd(ctx, x, y, 4.5 * k));
  [-1, 1].forEach(s => {
    const x = Math.round(cx + s * (bw - 3 * k));
    obj(ctx, x - Math.round(1.5 * k), Math.round(back - 4 * k), Math.round(3 * k), Math.round(13 * k), r => {
      r(0, 0, 3 * k, 13 * k, '#34343a');
      r(0, 0, k, 13 * k, '#6a6a74');
    });
    ellipse(ctx, x, back - 5 * k, 2.5 * k, 2.5 * k, (u, v) => (Math.hypot(u, v) > 0.75 ? OUTLINE : u < -0.2 && v < -0.2 ? [140, 140, 150] : [70, 70, 78]));
  });
}

// Smooth value noise, repeating every `py` cells in y (so the flames loop).
function noise(x, y, py) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const sx = smooth(0, 1, x - xi);
  const sy = smooth(0, 1, y - yi);
  const n = (a, b) => hash(a, ((b % py) + py) % py);
  const t = n(xi, yi) + (n(xi + 1, yi) - n(xi, yi)) * sx;
  const b = n(xi, yi + 1) + (n(xi + 1, yi + 1) - n(xi, yi + 1)) * sx;
  return t + (b - t) * sy;
}

// NF frames of flames, FW × FH each, side by side: tongues of hot colour
// rising out of a white-hot base, the pattern moving up STEP px per frame.
function drawFlames(ctx, FW, FH, NF) {
  const STEP = 4;
  const img = ctx.createImageData(FW * NF, FH);
  for (let f = 0; f < NF; f++) {
    for (let yb = 0; yb < FH; yb++) {
      const v = yb / FH;
      const ys = yb - f * STEP;
      for (let x = 0; x < FW; x++) {
        const u = ((x + 0.5) / FW) * 2 - 1;
        const env = Math.max(0, 1 - u * u) ** 0.7;
        const n = 0.65 * noise(x / 5, ys / 6, (NF * STEP) / 6) + 0.35 * noise(x / 2.5 + 17, ys / 3, (NF * STEP) / 3);
        const heat = env * (1.2 - v * 1.3) + (n - 0.5) * (0.5 + v * 0.9) - smooth(0.8, 1, v) * 0.6
          + BAYER[(yb & 3) * 4 + (x & 3)] * 0.08;
        const c = heat > 0.95 ? 0 : heat > 0.74 ? 1 : heat > 0.54 ? 2 : heat > 0.38 ? 3 : heat > 0.27 ? 4 : -1;
        if (c < 0) continue;
        const i = ((FH - 1 - yb) * FW * NF + f * FW + x) * 4;
        [img.data[i], img.data[i + 1], img.data[i + 2]] = FLAME[c];
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function animate(scene, w, h) {
  const g = geometry(w, h);
  const { k, cx, back, bw } = g;
  const crisp = tex => tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // the flames: a looping strip, made for this size each time
  const FW = Math.round(bw * 2);
  const FH = Math.round(60 * k);
  const NF = 12;
  if (scene.anims.exists('pov-flames')) scene.anims.remove('pov-flames');
  if (scene.textures.exists('pov-flames')) scene.textures.remove('pov-flames');
  const flames = scene.textures.createCanvas('pov-flames', FW * NF, FH);
  drawFlames(flames.getContext(), FW, FH, NF);
  for (let f = 0; f < NF; f++) flames.add(f, 0, f * FW, 0, FW, FH);
  flames.refresh();
  crisp(flames);
  scene.anims.create({ key: 'pov-flames', frames: [...Array(NF).keys()].map(frame => ({ key: 'pov-flames', frame })), frameRate: 11, repeat: -1 });
  scene.add.sprite(cx, back + 2 * k, 'pov-flames', 0).setOrigin(0.5, 1).setDepth(2).play('pov-flames');

  // the logs and fire dogs in front of them
  if (scene.textures.exists('pov-front')) scene.textures.remove('pov-front');
  const front = scene.textures.createCanvas('pov-front', w, h);
  drawFront(front.getContext(), g);
  front.refresh();
  crisp(front);
  scene.add.image(0, 0, 'pov-front').setOrigin(0).setDepth(3);

  // embers twinkling
  scene.time.addEvent({
    delay: 90,
    loop: true,
    callback: () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const e = scene.add.rectangle(Math.round(cx + Math.cos(a) * r * bw * 0.9), Math.round(back + 3 * k + Math.sin(a) * r * 4 * k), 1, 1, 0xffd070).setOrigin(0).setDepth(1);
      scene.tweens.add({ targets: e, alpha: 0, duration: 500, onComplete: () => e.destroy() });
    },
  });

  // sparks drifting up, and now and then a crackle throws out a handful
  const spark = (fast) => {
    const x = cx + (Math.random() - 0.5) * bw * 1.2;
    const y = back - (6 + Math.random() * 14) * k;
    const s = scene.add.rectangle(Math.round(x), Math.round(y), 1, 1, [0xffd040, 0xff9a30, 0xfff0a0][Math.floor(Math.random() * 3)]).setOrigin(0).setDepth(4);
    scene.tweens.add({
      targets: s,
      x: x + (Math.random() - 0.5) * (fast ? 40 : 16) * k,
      y: y - (fast ? 40 + Math.random() * 30 : 25 + Math.random() * 35) * k,
      alpha: 0,
      duration: fast ? 700 + Math.random() * 500 : 1000 + Math.random() * 900,
      ease: 'Sine.easeOut',
      onComplete: () => s.destroy(),
    });
  };
  scene.time.addEvent({ delay: 170, loop: true, callback: () => spark(false) });

  // firelight flickering over everything
  const glow = scene.add.rectangle(0, 0, w, h, 0xff7a1a).setOrigin(0).setDepth(10).setAlpha(0.05)
    .setBlendMode(Phaser.BlendModes.ADD);
  const flicker = () => scene.tweens.add({
    targets: glow, alpha: 0.03 + Math.random() * 0.07, duration: 80 + Math.random() * 140, onComplete: flicker,
  });
  flicker();
  const crackle = () => {
    for (let i = 0; i < 7; i++) spark(true);
    glow.setAlpha(0.14);
    scene.time.delayedCall(3500 + Math.random() * 3000, crackle);
  };
  scene.time.delayedCall(2000, crackle);

  // the candle on the mantel
  const c = candle(g);
  const wick = { x: c.x + Math.round(2 * k) - 1, y: c.y - 1 };
  const flame = scene.add.graphics().setDepth(5);
  scene.time.addEvent({
    delay: 110,
    loop: true,
    startAt: 110,
    callback: () => {
      const tall = Math.round((2 + Math.random() * 1.5) * k);
      flame.clear().fillStyle(0xff9a30).fillRect(wick.x, wick.y - tall - 1, 1, tall);
      flame.fillStyle(0xfff0a0).fillRect(wick.x, wick.y - tall + Math.round(tall / 2), 1, Math.ceil(tall / 2));
    },
  });
}

export default { draw, animate };

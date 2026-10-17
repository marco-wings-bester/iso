import Phaser from 'phaser';
import { obj } from '../pixelArt.js';
import { hash, mix, shade, pixels, rgb, limb, ellipse, OUTLINE } from './art.js';

// Boer Johan at the cafe's counter, opening his wallet to pay for his
// coffee: his hands holding it open over the counter top, the cafe's striped
// wall beyond. The card slots are empty, so is the note pocket: a moth
// flutters out of it, a puff of dust after it, and he finds he hasn't a cent
// in cash. Moving that thought along looks away (back to the cafe, src/cafe.js).

const OAK = [[236, 204, 156], [226, 192, 142], [214, 180, 130]]; // pale, like the cafe's counter
const SEAM = [150, 104, 60];
const WALL = [244, 236, 216];
const STRIPE = [156, 200, 228];
const PANEL = [[168, 106, 60], [146, 92, 54]];
const LEATHER = [[134, 74, 44], [112, 60, 36], [92, 48, 30], [70, 36, 22]];
const LIP = [160, 96, 58];
const INSIDE = [[58, 36, 20], [40, 24, 14]];
const STITCH = [226, 190, 134];
const SKIN = [[250, 206, 168], [236, 180, 140], [214, 150, 110]];
const SLEEVE = [[226, 98, 76], [208, 76, 58], [152, 47, 42]];
const STUD = [[236, 234, 226], [196, 192, 180], [140, 136, 126]];

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const portrait = h > w;
  const cx = Math.round(w / 2);
  const ww = Math.round(Math.min(w * 0.84, 136 * k)); // the wallet, open
  const wh = Math.round(ww * 0.56);
  const x0 = cx - Math.round(ww / 2);
  const y0 = Math.round(h * (portrait ? 0.5 : 0.44) - wh / 2);
  const s = Math.round(3 * k); // the stitching's inset
  return {
    k, cx, ww, wh, x0, y0, x1: x0 + ww, y1: y0 + wh, s,
    edge: Math.round(h * (portrait ? 0.2 : 0.12)), // the counter's far edge
    pocket: { x0: cx + 2 + s + 1, x1: x0 + ww - s - 1, y: y0 + Math.round(wh * 0.3) }, // the note pocket's mouth
  };
}

// Inside the rectangle [ax, bx) × [ay, by) with corners rounded to r.
function inRound(x, y, ax, ay, bx, by, r) {
  if (x < ax || x >= bx || y < ay || y >= by) return false;
  const dx = Math.max(ax + r - x - 0.5, 0, x + 0.5 - (bx - r));
  const dy = Math.max(ay + r - y - 0.5, 0, y + 0.5 - (by - r));
  return dx * dx + dy * dy <= r * r;
}

// The counter top (light oak planks, a lip at the far edge) and the cafe's
// wall beyond, blue stripes over a wainscot; the wallet's shadow.
function background(ctx, w, h, g) {
  const { k, cx, edge } = g;
  const stripe = Math.round(12 * k);
  const plank = Math.round(14 * k);
  pixels(ctx, w, h, (x, y) => {
    if (y < edge - 10 * k) return mix(Math.floor(x / (stripe / 2)) % 2 ? WALL : STRIPE, [0, 0, 0], 0.08);
    if (y < edge) return x % stripe === 0 ? SEAM : PANEL[y < edge - 8 * k ? 0 : 1];
    if (y < edge + 2 * k) return [246, 222, 182];
    const row = Math.floor((y - edge) / plank);
    if ((y - edge) % plank === 0) return SEAM;
    let c = OAK[Math.floor(hash(row, 1) * 3)];
    if (hash(Math.floor((x + row * 37) / (5 * k)), y) > 0.9) c = mix(c, SEAM, 0.25); // grain
    const sx = (x - cx + 3 * k) / (g.ww / 2 + 2 * k);
    const sy = (y - (g.y0 + g.y1) / 2 - 9 * k) / (g.wh / 2 + 2 * k);
    if (sx * sx + sy * sy <= 1) c = mix(c, [0, 0, 0], 0.3); // under the wallet
    const b = 1 - 0.22 * ((x - cx) / (w / 2)) ** 2 - 0.2 * (y - edge) / (h - edge);
    return shade(c, b, x, y, 10);
  });
}

// His forearms (red sleeves) up from the bottom, and his hands under the
// wallet's outer edges, their sides showing past it.
function arms(ctx, h, g) {
  const { k, x0, x1, y0, wh } = g;
  [[x0, -1], [x1, 1]].forEach(([ex, side]) => {
    const wrist = { x: ex + side * -1 * k, y: y0 + wh * 0.78 };
    limb(ctx, ex + side * 16 * k, h + 14 * k, wrist.x, wrist.y, 11 * k, (u, t, x, y) => {
      if (Math.abs(t - 0.86) < 0.02) return rgb(SLEEVE[2]); // the cuff's seam
      return rgb(SLEEVE[u * side > 0.35 ? 2 : u * side < -0.4 ? 0 : 1]);
    });
    const hx = ex - side * 1 * k;
    const hy = y0 + wh * 0.6;
    const rx = 11 * k;
    const ry = 17 * k;
    ellipse(ctx, hx, hy, rx, ry, (u, v, x, y) => {
      if (u * u + v * v > (1 - 1.4 / Math.min(rx, ry)) ** 2) return OUTLINE;
      if ((y - Math.round(hy - ry)) % Math.round(5 * k) === 0 && u * side > 0.2) return rgb(SKIN[2]); // between his fingers
      return rgb(SKIN[u * side > 0.5 ? 2 : v < -0.4 ? 0 : 1]);
    });
  });
}

// The wallet, held open: two halves of brown leather either side of the
// fold, stitched round; empty card slots on the left, the note pocket
// gaping empty on the right, and a coin flap with its press stud.
function wallet(ctx, g) {
  const { k, cx, ww, wh, x0, y0, x1, y1, s, pocket } = g;
  const r = Math.round(4 * k);
  const inside = (x, y) => inRound(x, y, x0, y0, x1, y1, r);
  const slots = [0.3, 0.48, 0.66].map(f => y0 + Math.round(wh * f));
  const flap = { x0: cx + Math.round(ww * 0.12), x1: cx + Math.round(ww * 0.4), y0: y0 + Math.round(wh * 0.5), y1: y0 + Math.round(wh * 0.84) };
  const stud = { x: (flap.x0 + flap.x1) / 2, y: flap.y1 - 4 * k, r: 2.2 * k };
  const lipY = x => pocket.y + Math.round(2.5 * k * Math.sin(Math.PI * (x - pocket.x0) / (pocket.x1 - pocket.x0)));
  const stitched = (x, y, ax, ay, bx, by) => {
    const onV = (x === ax || x === bx) && y >= ay && y <= by;
    const onH = (y === ay || y === by) && x >= ax && x <= bx;
    return (onV || onH) && Math.floor((x + y) / Math.max(1, Math.round(k))) % 3 !== 0;
  };

  const color = (x, y) => {
    if (Math.abs(x - cx) <= 1) return x === cx ? [60, 34, 18] : LEATHER[3]; // the fold
    const left = x < cx;
    const hx0 = left ? x0 : cx + 2;
    const hx1 = left ? cx - 2 : x1 - 1;
    const t = (y - y0) / wh;
    let l = 0.82 - 0.4 * t - 0.15 * (x - hx0) / (hx1 - hx0) - (left ? 0 : 0.06);
    if (left) {
      // the card slots, nothing in them
      const slot = slots.find(sy => y >= sy - Math.round(1.5 * k) && y <= sy + 1);
      if (slot !== undefined && x > hx0 + s + 2 && x < hx1 - s - 2) {
        if (y === slot) return [60, 34, 18];
        if (y === slot + 1) return LIP;
        return INSIDE[0];
      }
      if (slots.some(sy => y > sy)) l += 0.05; // each pocket's front a little nearer the light
    } else {
      // the note pocket's mouth, gaping open: dark and empty inside
      if (x >= pocket.x0 && x < pocket.x1 && y > y0 + s && y <= lipY(x)) {
        if (y === lipY(x)) return LIP;
        return INSIDE[y < y0 + s + 3 * k ? 1 : 0];
      }
      // the coin flap and its stud
      const sd = Math.hypot(x + 0.5 - stud.x, y + 0.5 - stud.y);
      if (sd <= stud.r) return sd > stud.r - 1 ? OUTLINE : STUD[y < stud.y - 0.5 ? 0 : x > stud.x ? 2 : 1];
      if (inRound(x, y, flap.x0, flap.y0, flap.x1, flap.y1, Math.round(3 * k))) {
        const edge = !inRound(x, y, flap.x0 + 1, flap.y0, flap.x1 - 1, flap.y1 - 1, Math.round(3 * k));
        if (edge) return OUTLINE;
        if (stitched(x, y, flap.x0 + s - 1, flap.y0 - 1, flap.x1 - s, flap.y1 - s)) return STITCH;
        l -= 0.08;
      }
    }
    if (stitched(x, y, hx0 + s, y0 + s, hx1 - s, y1 - 1 - s)) return STITCH;
    if (y === y0 || (left && x === x0)) return LEATHER[0];
    const i = Math.max(0, Math.min(3, Math.round((1 - l) * 3 + (hash(x >> 1, y >> 1) - 0.5) * 0.6)));
    return LEATHER[i];
  };

  for (let y = y0 - 1; y <= y1; y++) {
    for (let x = x0 - 1; x <= x1; x++) {
      let c = null;
      if (inside(x, y)) c = color(x, y);
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy))) c = OUTLINE;
      if (!c) continue;
      ctx.fillStyle = typeof c === 'string' ? c : rgb(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// His thumbs over the wallet's outer edges, holding it open.
function thumbs(ctx, g) {
  const { k, x0, x1, y0, wh } = g;
  [[x0 + 5 * k, -1], [x1 - 5 * k, 1]].forEach(([tx, side]) => {
    const ty = y0 + wh * 0.48;
    const rx = 6 * k;
    const ry = 10 * k;
    ellipse(ctx, tx, ty, rx, ry, (u, v) => {
      if (u * u + v * v > (1 - 1.3 / rx) ** 2) return OUTLINE;
      if (v < -0.4 && Math.abs(u) < 0.5) return '#fde4d0'; // the nail
      return rgb(SKIN[u * side > 0.45 ? 2 : u * side < -0.3 ? 0 : 1]);
    });
  });
}

function draw(ctx, w, h) {
  const g = geometry(w, h);
  background(ctx, w, h, g);
  arms(ctx, h, g);
  wallet(ctx, g);
  thumbs(ctx, g);
}

// A moth: wings out (frame 0) and up (frame 1).
function mothTexture(scene) {
  if (scene.textures.exists('moth')) return;
  const tex = scene.textures.createCanvas('moth', 30, 10);
  const ctx = tex.getContext();
  const W = '#d8ccb0';
  const w = '#a89878';
  const B = '#7a6a58';
  obj(ctx, 1, 1, 13, 8, (r) => {
    r(0, 1, 5, 3, W); r(1, 4, 4, 2, W); r(1, 0, 3, 1, W);
    r(8, 1, 5, 3, W); r(8, 4, 4, 2, W); r(9, 0, 3, 1, W);
    r(2, 2, 1, 1, w); r(10, 2, 1, 1, w);
    r(5, 1, 3, 6, B);
  });
  obj(ctx, 16, 1, 13, 8, (r) => {
    r(2, 0, 3, 4, W); r(8, 0, 3, 4, W); r(3, 1, 1, 1, w); r(9, 1, 1, 1, w);
    r(5, 1, 3, 6, B);
  });
  tex.add(0, 0, 0, 0, 15, 10);
  tex.add(1, 0, 15, 0, 15, 10);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// A moment's look, then a puff of dust and a moth out of the empty note
// pocket, fluttering away up past the counter; then his thought.
function animate(scene, w, h) {
  const { k, pocket } = geometry(w, h);
  const from = { x: (pocket.x0 + pocket.x1) / 2, y: pocket.y - 2 * k };
  mothTexture(scene);
  scene.busy = true;
  scene.time.delayedCall(800, () => {
    for (let i = 0; i < 8; i++) {
      const d = scene.add.rectangle(from.x + (Math.random() - 0.5) * 22 * k, from.y, Math.ceil(k), Math.ceil(k), 0xd8ccb8).setOrigin(0);
      scene.tweens.add({
        targets: d, y: d.y - (8 + Math.random() * 16) * k, x: d.x + (Math.random() - 0.5) * 12 * k, alpha: 0,
        duration: 900 + Math.random() * 700, delay: Math.random() * 250, onComplete: () => d.destroy(),
      });
    }
    const moth = scene.add.sprite(from.x, from.y, 'moth', 0).setScale(k);
    let frame = 0;
    const flap = scene.time.addEvent({ delay: 90, loop: true, callback: () => moth.setFrame(frame ^= 1) });
    const path = { t: 0 };
    scene.tweens.add({
      targets: path, t: 1, duration: 2600, ease: 'Sine.easeIn',
      onUpdate: () => {
        const { t } = path;
        moth.setPosition(from.x + Math.sin(t * 10) * 14 * k + t * 24 * k, from.y - t * (from.y + 24 * k));
      },
      onComplete: () => { flap.remove(); moth.destroy(); },
    });
    scene.time.delayedCall(1500, () => {
      scene.busy = false;
      scene.say({ af: 'Leeg! Ek het nie ’n sent kontant nie.', en: "Empty! I haven't got a cent in cash." }, () => scene.close());
    });
  });
}

export default { draw, animate };

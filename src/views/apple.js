import Phaser from 'phaser';
import { obj, rng } from '../pixelArt.js';
import { hash, mix, band, pixels, rgb } from './art.js';
import { hasFlag, setFlag } from '../state.js';
import { line } from '../hints.js';

// Farmer Jones under an apple tree, looking up into it: the trunk rising from
// below, branches spreading out, leaves lit from behind by the sun with sky
// between them, and red apples swaying on their stalks. The apples are out of
// reach by hand; with the apple picker from the tool shed, tapping one lifts
// the pole up from below, the apple drops into its basket and comes down
// with it (that's the apple for the pie). Tapping anywhere else looks away.

const SKY = [[92, 156, 222], [112, 172, 230], [140, 192, 236], [178, 216, 242]];
const LEAF = [[30, 66, 30], [48, 94, 40], [72, 132, 54], [104, 166, 68], [150, 204, 92]];
const LEAF_EDGE = [24, 52, 24];
const BARK = [[138, 96, 62], [104, 70, 44], [66, 44, 28]];

// Leaf clumps overhead, in rows from the top of his view down to where the
// canopy ends: the higher ones are further away and smaller, a few left out
// so the sky shows through. Apples hang from the lower half of near clumps.
function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const cx = w / 2;
  const R = rng(Math.round(w * 7 + h));
  const clumps = [];
  [0, 0.08, 0.17, 0.27, 0.38, 0.49, 0.59].forEach((fy, row) => {
    const r = (10 + 15 * fy / 0.59) * k;
    const step = r * 1.4;
    for (let x = -r * 0.5 + (row % 2) * step * 0.5; x < w + r; x += step) {
      if (R() < 0.06 + row * 0.03) continue;
      clumps.push({ x: x + (R() - 0.5) * step * 0.5, y: fy * h + (R() - 0.5) * r * 0.6, r: r * (0.85 + R() * 0.3), seed: R() * 10 });
    }
  });
  const apples = clumps
    .filter(c => c.y > h * 0.1 && c.x > 10 * k && c.x < w - 10 * k && R() < 0.55)
    .slice(0, 10)
    .map(c => ({ x: Math.round(c.x + (R() - 0.5) * c.r * 0.6), y: Math.round(c.y + c.r * 0.3) }));
  return { k, cx, clumps, apples, fork: { x: cx - 4 * k, y: h * 0.58 }, sun: { x: w * 0.18, y: h * 0.06 } };
}

// A thick limb tapering from r0 to r1, with a dark outline along its sides
// and a rounded tip (no cap at its base, so it grows out of what's under it).
function taper(ctx, x0, y0, x1, y1, r0, r1) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const len2 = vx * vx + vy * vy;
  const len = Math.sqrt(len2);
  const R = Math.max(r0, r1) + 1;
  for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
      const t = ((x + 0.5 - x0) * vx + (y + 0.5 - y0) * vy) / len2;
      if (t < 0) continue;
      const tc = Math.min(1, t);
      const r = r0 + (r1 - r0) * tc;
      const px = x + 0.5 - (x0 + vx * tc);
      const py = y + 0.5 - (y0 + vy * tc);
      const dist = Math.hypot(px, py);
      if (dist > r) continue;
      const side = (px * -vy + py * vx) / len / r;
      let c = dist > r - 1 ? [46, 29, 12] : BARK[side < -0.3 ? 0 : side > 0.4 ? 2 : 1];
      if (dist <= r - 1 && hash(x >> 1, Math.floor(y / 3)) > 0.8) c = mix(c, [40, 26, 16], 0.5); // furrows
      ctx.fillStyle = rgb(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// A rounded clump of leaves with a scalloped edge and a dark outline, lit
// from the sun's side, its rim glowing where the light comes through.
function clump(ctx, { x, y, r, seed }, sun, w) {
  const near = 1 - Math.min(1, Math.hypot(x - sun.x, y - sun.y) / (w * 1.2));
  for (let py = Math.floor(y - r * 1.2); py <= Math.ceil(y + r * 1.2); py++) {
    for (let px = Math.floor(x - r * 1.25); px <= Math.ceil(x + r * 1.25); px++) {
      const u = (px + 0.5 - x) / r;
      const v = (py + 0.5 - y) / (r * 0.85);
      const a = Math.atan2(v, u);
      const d = Math.hypot(u, v) / (1 + 0.1 * Math.sin(5 * a + seed) + 0.07 * Math.sin(9 * a + seed * 2));
      if (d > 1) continue;
      let c;
      if (d > 1 - 1.2 / r) c = LEAF_EDGE;
      else {
        const t = 0.5 - 0.3 * v - 0.2 * u + (d > 0.78 ? 0.22 : 0) + 0.15 * near + (hash(px >> 1, py >> 1) - 0.5) * 0.3;
        c = band(LEAF, Math.max(0, Math.min(1, t)), px, py);
      }
      ctx.fillStyle = rgb(c);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function draw(ctx, w, h) {
  const { k, cx, clumps, fork, sun } = geometry(w, h);

  // sky, brighter round the sun
  pixels(ctx, w, h, (x, y) => {
    const glow = Math.max(0, 1 - Math.hypot(x - sun.x, y - sun.y) / (60 * k)) ** 2;
    return mix(band(SKY, y / h, x, y), [255, 250, 222], glow);
  });

  // the trunk rising from below him into the branches, then the leaves
  taper(ctx, cx + 8 * k, h + 10 * k, fork.x, fork.y, 15 * k, 8 * k);
  taper(ctx, fork.x, fork.y, w * 0.08, h * 0.28, 6 * k, 2.5 * k);
  taper(ctx, fork.x, fork.y, w * 0.94, h * 0.22, 6 * k, 2.5 * k);
  taper(ctx, fork.x, fork.y, cx + 6 * k, h * 0.02, 5.5 * k, 2.5 * k);
  taper(ctx, w * 0.3, h * 0.43, w * 0.22, h * 0.06, 3.5 * k, 1.5 * k);
  taper(ctx, w * 0.72, h * 0.4, w * 0.78, h * 0.04, 3.5 * k, 1.5 * k);
  clumps.forEach(c => clump(ctx, c, sun, w));
}

function texture(scene, key, w, h, paint) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  paint(tex.getContext());
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function animate(scene, w, h) {
  const { k, sun, apples } = geometry(w, h);

  // sunlight glinting through the leaves near the sun
  scene.time.addEvent({
    delay: 160,
    loop: true,
    callback: () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 40 * k;
      const g = scene.add.rectangle(Math.round(sun.x + Math.cos(a) * r), Math.round(sun.y + Math.sin(a) * r), 1, 1, 0xfffbe0).setOrigin(0).setDepth(7);
      scene.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
    },
  });

  // the apples, swaying on their stalks
  const appleKey = texture(scene, 'pov-apple', 9, 10, (ctx) => {
    obj(ctx, 1, 2, 7, 7, r => {
      r(0, 1, 7, 5, '#d04c3a');
      r(1, 0, 5, 7, '#d04c3a');
      r(1, 1, 2, 2, '#f07a5a');
      r(5, 3, 2, 2, '#982f2a');
      r(2, 6, 3, 1, '#982f2a');
    });
    ctx.fillStyle = '#5a3418';
    ctx.fillRect(4, 0, 1, 3);
    ctx.fillStyle = '#5f9e38';
    ctx.fillRect(5, 1, 2, 1);
  });
  scene.apples = apples.map(({ x, y }) => {
    const a = scene.add.image(x, y, appleKey).setOrigin(0.5, 0).setDepth(6);
    scene.tweens.add({
      targets: a, angle: { from: -6, to: 6 }, duration: 1200 + Math.random() * 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800,
    });
    return a;
  });

  // now and then a leaf comes down
  scene.time.addEvent({
    delay: 1700,
    loop: true,
    callback: () => {
      const x = Math.random() * w;
      const leaf = scene.add.rectangle(x, Math.random() * h * 0.5, 2, 1, 0x5f9e38).setDepth(7);
      scene.tweens.add({ targets: leaf, y: h + 4, duration: 4200, onComplete: () => leaf.destroy() });
      scene.tweens.add({ targets: leaf, x: x + 8 * k, angle: 90, duration: 900, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    },
  });

  // still after an apple for the pie? (a nudge, at the chosen hint level)
  if (hasFlag('read') && !hasFlag('apple') && !hasFlag('baked')) {
    const text = line('treeEnter');
    if (text) scene.time.delayedCall(1000, () => scene.say(text));
  }
}

// The apple picker reaching up from below to (x, y), taking the apple and
// coming back down with it.
function pickWithPole(scene, apple, w, h) {
  const L = Math.round(h * 1.4);
  const poleKey = texture(scene, 'pov-picker', 9, L, (ctx) => {
    obj(ctx, 3, 9, 2, L - 10, r => { r(0, 0, 2, L, '#c88a52'); r(0, 0, 1, L, '#e0a868'); });
    obj(ctx, 1, 1, 7, 8, r => {
      r(0, 0, 1, 4, '#a0a8b4'); r(3, 0, 1, 3, '#a0a8b4'); r(6, 0, 1, 4, '#a0a8b4');
      r(0, 3, 7, 5, '#5a6070'); r(1, 3, 5, 4, '#2a2a30');
    });
  });
  // from his hands, below his view, up to just under the apple
  const target = { x: apple.x, y: apple.y + 7 };
  const base = { x: w * 0.62, y: h + 30 };
  const dx = base.x - target.x;
  const dy = base.y - target.y;
  const len = Math.hypot(dx, dy);
  const below = (h + 12 - target.y) / (dy / len);
  const start = { x: target.x + (dx / len) * below, y: target.y + (dy / len) * below };
  const pole = scene.add.image(start.x, start.y, poleKey).setOrigin(0.5, 5 / L).setRotation(Math.atan2(-dx, dy)).setDepth(5);

  scene.busy = true;
  scene.tweens.add({
    targets: pole, x: target.x, y: target.y, duration: 800, ease: 'Sine.easeOut',
    onComplete: () => {
      scene.tweens.killTweensOf(apple);
      apple.setAngle(0);
      scene.tweens.add({
        targets: apple, y: target.y - 3, duration: 220, ease: 'Quad.easeIn',
        onComplete: () => {
          scene.tweens.add({ targets: [pole, apple], x: `+=${start.x - target.x}`, y: `+=${start.y - target.y}`, duration: 800, ease: 'Sine.easeIn' });
          scene.time.delayedCall(820, () => {
            pole.destroy();
            apple.destroy();
            scene.apples = scene.apples.filter(a => a !== apple);
            setFlag('apple');
            scene.busy = false;
            scene.say(hasFlag('read') ? 'Got one! Just right for a pie.' : 'A lovely apple!');
          });
        },
      });
    },
  });
}

// Taps on an apple: pick it (with the picker), or find it's out of reach.
// Anything else isn't ours: the view closes.
function tap(scene, x, y) {
  const { w, h } = scene.pov;
  const apple = scene.apples.find(a => Math.hypot(a.x - x, a.y + 5 - y) < 8);
  if (!apple) return false;
  if (hasFlag('apple') || hasFlag('baked')) {
    scene.say('One apple is enough for a pie.');
  } else if (!hasFlag('picker')) {
    scene.tweens.add({ targets: apple, scale: 1.15, duration: 120, yoyo: true });
    scene.say(line('tooHigh'));
  } else {
    pickWithPole(scene, apple, w, h);
  }
  return true;
}

export default { draw, animate, tap };

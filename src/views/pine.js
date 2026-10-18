import Phaser from 'phaser';
import { obj } from '../pixelArt.js';
import { hash, mix, band, pixels, rgb, GRASS } from './art.js';

// Boer Johan by the big pine at the bottom right of the farm, looking at it:
// tiers of drooping boughs from above his view down to its trunk, needles
// under it, and pine cones lying about. Tapping a cone gives it a little
// hop. A secret: the bottom right cone, then the top right one, opens the
// day select (`scene.close` then the game event 'days', src/menu.js).
// Anything else looks away.

const SKY = [[118, 176, 228], [140, 192, 236], [170, 210, 242], [204, 228, 246]];
const NEEDLES = [[22, 52, 32], [32, 72, 44], [46, 96, 56], [66, 124, 70], [96, 152, 86]];
const NEEDLE_EDGE = [16, 36, 22];
const BARK = [[150, 92, 58], [118, 70, 44], [82, 48, 30]];
const LITTER = [[176, 132, 80], [152, 110, 64], [126, 88, 50]];
const FAR_TREES = [[92, 140, 112], [78, 126, 100]];

// The cones: two rows, further away (higher, smaller) and nearer; the code
// is 'br' then 'tr'.
const CONES = [
  { id: 'tl', fx: 0.2, fy: 0.71 }, { id: 'tr', fx: 0.83, fy: 0.69 },
  { id: 'ml', fx: 0.32, fy: 0.84 }, { id: 'mr', fx: 0.64, fy: 0.87 },
  { id: 'bl', fx: 0.15, fy: 0.95 }, { id: 'br', fx: 0.85, fy: 0.95 },
];

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const cx = Math.round(w / 2);
  const horizon = Math.round(h * 0.58);
  const foot = Math.round(h * 0.79);
  const tiers = Array.from({ length: 7 }, (_, i) => {
    const top = -0.08 * h + i * 0.09 * h;
    return { top, bottom: top + 0.17 * h, hw: Math.min(w * 0.5, (26 + 9 * i) * k), i };
  });
  const cones = CONES.map(c => ({ ...c, x: Math.round(w * c.fx), y: Math.round(h * c.fy), big: c.fy > 0.8 }));
  return { k, cx, horizon, foot, tiers, cones };
}

function draw(ctx, w, h) {
  const { k, cx, horizon, foot, tiers, cones } = geometry(w, h);
  const litter = (x, y) => ((x - cx) / (w * 0.46)) ** 2 + ((y - foot) / (h * 0.13)) ** 2 <= 1 + (hash(x >> 1, y) - 0.5) * 0.25;

  // sky, a far line of trees on the horizon, the grass, needles under the tree
  pixels(ctx, w, h, (x, y) => {
    if (y < horizon) {
      const far = horizon - (6 + 8 * Math.abs(Math.sin(x * 0.21)) + 5 * Math.abs(Math.sin(x * 0.07 + 1))) * k;
      if (y > far) return FAR_TREES[(x >> 1) % 3 === 0 ? 1 : 0];
      return band(SKY, y / horizon, x, y);
    }
    if (litter(x, y)) {
      const streak = hash(x >> 2, y) > 0.86 || hash(x, y >> 2) > 0.92;
      return streak ? [196, 156, 98] : band(LITTER, hash(x >> 1, y >> 1), x, y);
    }
    const t = (y - horizon) / (h - horizon);
    return band(GRASS, 1 - t * 0.9 + (hash(x >> 1, y >> 1) - 0.5) * 0.4, x, y);
  });

  // the trunk, roots spreading into the needles
  for (let y = Math.round(h * 0.42); y <= foot + 2 * k; y++) {
    const t = (y - h * 0.42) / (foot - h * 0.42);
    const half = (3.5 + 2.5 * t + (y > foot - 4 * k ? (y - foot + 4 * k) * 1.4 : 0)) * k;
    for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
      const u = (x + 0.5 - cx) / half;
      if (Math.abs(u) > 1) continue;
      let c = Math.abs(u) > 1 - 1.2 / half ? [46, 29, 12] : BARK[u < -0.35 ? 0 : u > 0.4 ? 2 : 1];
      if (Math.abs(u) <= 0.8 && hash(x >> 1, Math.floor(y / (3 * k))) > 0.78) c = mix(c, [60, 34, 20], 0.5);
      ctx.fillStyle = rgb(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // the boughs, top tier first so the lower ones come in front: each tier a
  // row of drooping fans of needles, lit from the left, creased between
  tiers.forEach(({ top, bottom, hw, i }) => {
    const fans = 3 + i;
    const fw = (2 * hw) / fans;
    for (let y = Math.floor(top); y <= Math.ceil(bottom + 6 * k); y++) {
      const t = (y - top) / (bottom - top);
      if (t < 0) continue;
      const half = hw * (0.28 + 0.72 * Math.min(1, t));
      for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
        const u = (x + 0.5 - cx) / half;
        if (Math.abs(u) > 1) continue;
        const fx = (x + 0.5 - (cx - hw)) / fw;
        const f = fx - Math.floor(fx); // across one fan, 0…1
        const end = bottom + Math.sin(Math.PI * f) * 4 * k + Math.abs(u) * 2 * k;
        if (y > end) continue;
        let c = NEEDLE_EDGE;
        const edge = Math.abs(u) > 1 - 1.3 / half || y > end - 1.2;
        const crease = (f < 0.07 || f > 0.93) && t > 0.45;
        if (!edge && !crease) {
          let l = 0.62 - 0.35 * u - 0.45 * Math.max(0, t - 0.5) + (0.5 - f) * 0.25;
          if (hash((x + y) >> 1, y >> 2) > 0.8) l += 0.16; // needles catching the light…
          if (hash((x - y) >> 1, y >> 2) > 0.84) l -= 0.16; // …and in shadow
          c = band(NEEDLES, Math.max(0, Math.min(1, l)), x, y);
        } else if (crease && !edge) {
          c = NEEDLES[0];
        }
        ctx.fillStyle = rgb(c);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // little shadows where the cones lie
  cones.forEach(({ x, y, big }) => {
    ctx.fillStyle = 'rgba(40, 30, 16, 0.35)';
    ctx.fillRect(Math.round(x - (big ? 4 : 3) * k), y - 1, Math.round((big ? 9 : 6) * k), Math.max(1, Math.round(k)));
  });
}

// A pine cone: rows of woody scales, lit from the left.
function coneTexture(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w + 2, h + 2);
  obj(tex.getContext(), 1, 1, w, h, (r) => {
    for (let y = 0; y < h; y++) {
      const half = (w / 2) * Math.sin(Math.PI * Math.min(1, (y + 1.2) / (h + 0.4)));
      const x0 = Math.round(w / 2 - half);
      const x1 = Math.round(w / 2 + half);
      for (let x = x0; x < x1; x++) {
        const scale = (x + (y % 2) * 1) % 2 === 0;
        r(x, y, 1, 1, y % 2 === 1 && scale ? '#5a3418' : x < w / 2 ? '#b07a44' : '#8c5c32');
      }
    }
    r(Math.floor(w / 2), 0, 1, 1, '#d09a5c');
  });
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function animate(scene, w, h) {
  const { k, cones, horizon } = geometry(w, h);
  const big = coneTexture(scene, 'pov-cone', Math.round(8 * k), Math.round(11 * k));
  const small = coneTexture(scene, 'pov-cone-far', Math.round(6 * k), Math.round(8 * k));
  scene.cones = cones.map(c => ({ ...c, img: scene.add.image(c.x, c.y, c.big ? big : small).setOrigin(0.5, 1).setDepth(5) }));
  scene.coneCode = null;

  // now and then a needle drifts down
  scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => {
      const x = w * (0.2 + Math.random() * 0.6);
      const n = scene.add.rectangle(Math.round(x), Math.round(h * (0.1 + Math.random() * 0.3)), 1, Math.max(2, Math.round(2 * k)), 0x6a4a2a).setOrigin(0).setDepth(6);
      scene.tweens.add({
        targets: n, y: horizon + Math.random() * (h - horizon), x: x + (Math.random() - 0.5) * 20 * k, angle: 90,
        duration: 2600 + Math.random() * 1200, onComplete: () => n.destroy(),
      });
    },
  });
}

// Tapping a cone: it hops; the bottom right one and then the top right one
// open the day select. Anything else isn't ours: the view closes.
function tap(scene, x, y) {
  const { k } = geometry(scene.pov.w, scene.pov.h);
  const cone = scene.cones.find(c => Math.hypot(c.x - x, c.y - (c.big ? 5 : 3.5) * k - y) < (c.big ? 9 : 7) * k);
  if (!cone) return false;
  scene.tweens.killTweensOf(cone.img);
  cone.img.setY(cone.y);
  scene.tweens.add({ targets: cone.img, y: cone.y - 3 * k, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  if (cone.id === 'tr' && scene.coneCode === 'br') {
    scene.coneCode = null;
    scene.busy = true; // no looking away meanwhile
    sparkle(scene, cone, k);
    scene.time.delayedCall(450, () => scene.close(() => scene.game.events.emit('days')));
  } else {
    scene.coneCode = cone.id === 'br' ? 'br' : null;
  }
  return true;
}

function sparkle(scene, cone, k) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = scene.add.rectangle(cone.x, cone.y - 5 * k, Math.max(1, k), Math.max(1, k), i % 2 ? 0xfff3a0 : 0xffffff).setDepth(8);
    scene.tweens.add({ targets: s, x: cone.x + Math.cos(a) * 12 * k, y: cone.y - 5 * k + Math.sin(a) * 12 * k, alpha: 0, duration: 450, onComplete: () => s.destroy() });
  }
}

export default { draw, animate, tap };

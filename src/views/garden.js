import Phaser from 'phaser';
import { obj } from '../pixelArt.js';
import { hash, band, pixels, ellipse, rgb, limb, OUTLINE } from './art.js';

// Boer Johan at the cafe's back window, looking out at the garden behind it:
// through the panes, the sea far off under the sky, a hedge and a white
// picket fence, flower beds along it, a lemon tree, a bird bath and a stone
// path across the lawn; the window's wooden frame, its red curtains and the
// striped wall round it. Clouds drift by, a butterfly flits about, a bird
// hops on the bird bath. With his coffee (ViewScene `spot` 'coffee'), the cup
// on the sill in front of him, steaming, lifted for a sip now and then.

const SKY = [[118, 178, 232], [146, 196, 240], [184, 218, 246]];
const SEA = [[64, 134, 196], [92, 162, 214]];
const HEDGE = [[34, 82, 40], [50, 108, 50], [72, 136, 62]];
const LAWN = [[104, 164, 64], [120, 178, 72], [138, 192, 84]];
const WOOD = { lt: [196, 140, 86], mid: [168, 112, 64], dk: [120, 76, 40] };
const CURTAIN = [[208, 82, 64], [176, 60, 48], [132, 40, 34]];
const FLOWERS = [[240, 120, 160], [250, 210, 80], [180, 120, 220], [250, 250, 240], [240, 140, 60]];

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const gx0 = Math.round(18 * k);
  const gx1 = w - Math.round(18 * k);
  const gy0 = Math.round(20 * k);
  const gy1 = Math.round(h * 0.7); // the sill
  const hz = Math.round(gy0 + (gy1 - gy0) * 0.3); // the sea's far edge
  const fence = Math.round(hz + 16 * k);           // the fence's foot
  return { k, gx0, gx1, gy0, gy1, hz, fence, mid: Math.round((gx0 + gx1) / 2), my: Math.round(gy0 + (gy1 - gy0) * 0.42) };
}

function draw(ctx, w, h) {
  const g = geometry(w, h);
  const { k, gx0, gx1, gy0, gy1, hz, fence } = g;
  const glass = (x, y) => x >= gx0 && x < gx1 && y >= gy0 && y < gy1;
  const hedgeTop = x => hz + Math.round(5 * k - 2.5 * k * Math.abs(Math.sin(x / (7 * k))));

  pixels(ctx, w, h, (x, y) => {
    if (glass(x, y)) {
      if (y < hz - 6 * k) return band(SKY, (y - gy0) / (hz - gy0), x, y);
      if (y < hz) return hash(x >> 1, y) > 0.93 ? [220, 236, 248] : band(SEA, (y - hz + 6 * k) / (6 * k), x, y);
      if (y < hz + 2 * k) return [236, 220, 172]; // the dunes
      if (y < hedgeTop(x) + 9 * k && y >= hedgeTop(x)) {
        const l = 1 - (y - hedgeTop(x)) / (9 * k) + (hash(x >> 1, y >> 1) - 0.5) * 0.5;
        return band(HEDGE, l, x, y);
      }
      if (y < hz + 2 * k) return [236, 220, 172];
      if (y < hedgeTop(x)) return [236, 220, 172];
      // the lawn, mown in stripes, darker under the hedge
      const stripe = Math.floor((x + (y - fence) * 0.6) / (10 * k)) % 2;
      const l = 0.45 + stripe * 0.25 + (y - fence) / (gy1 - fence) * 0.25 + (hash(x >> 1, y >> 1) - 0.5) * 0.25;
      return band(LAWN, l, x, y);
    }
    // the wall round the window: cream with blue stripes, a wooden wainscot below the sill
    if (y >= gy1 + 8 * k) return (x % Math.round(12 * k)) === 0 ? WOOD.dk : y < gy1 + 10 * k ? WOOD.lt : WOOD.mid;
    return Math.floor(x / (6 * k)) % 2 ? [156, 200, 228] : [244, 236, 216];
  });

  // clip what's outside to the panes
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  ctx.clip();

  // the picket fence along the hedge, a gap with a gate in the middle
  const pw = Math.round(3 * k);
  for (let x = gx0 - pw; x < gx1; x += Math.round(6 * k)) {
    obj(ctx, x, fence - Math.round(9 * k), pw, Math.round(9 * k), (r) => {
      r(0, 1, pw, 9 * k, '#f4f0e6');
      r(1, 0, Math.max(1, pw - 2), 1, '#f4f0e6');
      r(pw - 1, 1, 1, 9 * k, '#c8c0b0');
    });
  }
  ctx.fillStyle = '#e8e2d4';
  ctx.fillRect(gx0, fence - Math.round(7 * k), gx1 - gx0, Math.max(1, Math.round(k)));
  ctx.fillRect(gx0, fence - Math.round(3 * k), gx1 - gx0, Math.max(1, Math.round(k)));

  // flower beds along the fence's foot
  for (let x = gx0; x < gx1; x++) {
    for (let y = fence; y < fence + 6 * k; y++) {
      const n = hash(x, y);
      ctx.fillStyle = n > 0.8 ? rgb(FLOWERS[Math.floor(hash(y, x) * FLOWERS.length)]) : n > 0.4 ? rgb([62, 118, 52]) : rgb([82, 140, 62]);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const L = gy1 - fence; // the lawn's depth
  // round flower beds in the lawn: a rim of soil, leaves, flowers in clumps
  const bed = (cx, cy, rx, ry) => ellipse(ctx, cx, cy, rx, ry, (u, v, x, y) => {
    const d = u * u + v * v;
    if (d > 0.86) return OUTLINE;
    if (d > 0.68) return [122, 78, 44];
    if (hash(x >> 1, y >> 1) > 0.55) return FLOWERS[Math.floor(hash(x >> 2, y >> 2) * FLOWERS.length)];
    return hash(x, y) > 0.5 ? [58, 116, 48] : [78, 138, 58];
  });
  bed(gx0 + 32 * k, fence + L * 0.8, 24 * k, 9 * k);
  bed(gx1 - 30 * k, fence + L * 0.58, 22 * k, 8 * k);

  // the stone path, from below the window to the gate
  const pathPts = 10;
  for (let i = 0; i < pathPts; i++) {
    const f = i / (pathPts - 1);
    const px = g.mid + Math.sin(f * 3) * 14 * k * (1 - f);
    const py = gy1 - 3 * k - f * (L - 6 * k);
    const sz = (1 - f * 0.55) * 6.5 * k;
    ellipse(ctx, px, py, sz, sz * 0.55, (u, v) => (u * u + v * v > 0.72 ? OUTLINE : v < -0.2 ? [214, 208, 196] : [180, 174, 164]));
  }
  // the gate in the fence, an arch over it
  const gw = Math.round(14 * k);
  obj(ctx, g.mid - Math.round(gw / 2), fence - Math.round(12 * k), gw, Math.round(12 * k), (r) => {
    r(0, 0, 2 * k, 12 * k, '#f4f0e6'); r(gw - 2 * k, 0, 2 * k, 12 * k, '#f4f0e6');
    r(0, 0, gw, 2 * k, '#f4f0e6'); r(2 * k, 2 * k, gw - 4 * k, 1, '#c8c0b0');
  });

  // a lemon tree on the left: trunk and a round crown, lemons in it
  const tx = gx0 + 22 * k;
  const ty = fence + L * 0.42;
  limb(ctx, tx, ty, tx + 2 * k, ty - 26 * k, 3 * k, sd => (sd < -0.3 ? '#a87048' : '#7a4a2a'));
  ellipse(ctx, tx, ty + 1 * k, 10 * k, 3 * k, () => [84, 136, 58]); // its shadow
  [[0, -34, 17], [-11, -27, 12], [12, -28, 12], [3, -45, 12]].forEach(([dx, dy, r]) => {
    ellipse(ctx, tx + dx * k, ty + dy * k, r * k, r * k * 0.85, (u, v, x, y) => {
      if (u * u + v * v > 0.86) return OUTLINE;
      return band(HEDGE, 0.8 - v * 0.4 - u * 0.25, x, y);
    });
  });
  [[-7, -34], [6, -29], [9, -41], [-2, -46], [-12, -25], [14, -23], [0, -24], [-5, -42]].forEach(([dx, dy]) => {
    ellipse(ctx, tx + dx * k, ty + dy * k, 2 * k, 1.6 * k, (u, v) => (u * u + v * v > 0.7 ? [150, 120, 30] : u < -0.2 && v < -0.2 ? [255, 246, 160] : [246, 214, 60]));
  });

  // a bird bath on the right
  const bx = gx1 - 26 * k;
  const by = fence + L * 0.3;
  ellipse(ctx, bx, by + 1 * k, 9 * k, 2.5 * k, () => [84, 136, 58]);
  obj(ctx, Math.round(bx - 2.5 * k), Math.round(by - 15 * k), Math.round(5 * k), Math.round(15 * k), r => { r(0, 0, 5 * k, 15 * k, '#d0ccc4'); r(3 * k, 0, 2 * k, 15 * k, '#aaa69e'); });
  ellipse(ctx, bx, by - 16 * k, 12 * k, 4 * k, (u, v) => (u * u + v * v > 0.74 ? OUTLINE : v < 0.1 ? [120, 184, 226] : [212, 208, 200]));
  obj(ctx, Math.round(bx - 6 * k), Math.round(by - 1 * k), Math.round(12 * k), Math.round(2 * k), r => r(0, 0, 12 * k, 2 * k, '#b8b4ac'));
  ctx.restore();

  // the window's frame and its cross bars
  const t = Math.max(2, Math.round(3 * k));
  ctx.fillStyle = rgb(WOOD.dk);
  ctx.fillRect(gx0 - t, gy0 - t, gx1 - gx0 + 2 * t, t);
  ctx.fillRect(gx0 - t, gy0, t, gy1 - gy0);
  ctx.fillRect(gx1, gy0, t, gy1 - gy0);
  ctx.fillStyle = rgb(WOOD.mid);
  ctx.fillRect(g.mid - 1, gy0, Math.max(2, Math.round(2 * k)), gy1 - gy0);
  ctx.fillRect(gx0, g.my, gx1 - gx0, Math.max(2, Math.round(2 * k)));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; // a glint on the glass
  for (let i = 0; i < 10 * k; i++) ctx.fillRect(Math.round(gx0 + 6 * k + i), Math.round(gy0 + 5 * k + i * 1.4), Math.max(1, Math.round(k)), Math.max(1, Math.round(k)));
  // the sill
  ctx.fillStyle = rgb(WOOD.lt);
  ctx.fillRect(gx0 - 2 * t, gy1, gx1 - gx0 + 4 * t, Math.round(5 * k));
  ctx.fillStyle = rgb(WOOD.dk);
  ctx.fillRect(gx0 - 2 * t, gy1 + Math.round(5 * k), gx1 - gx0 + 4 * t, Math.round(2 * k));

  // the curtains, drawn back either side, in folds
  const cw = Math.round(16 * k);
  [[gx0 - t - cw + Math.round(6 * k), 1], [gx1 + t - Math.round(6 * k), -1]].forEach(([cx, side]) => {
    for (let y = Math.round(gy0 - 10 * k); y < gy1 + 4 * k; y++) {
      const tie = y > gy0 + (gy1 - gy0) * 0.55 && y < gy0 + (gy1 - gy0) * 0.55 + 3 * k;
      const narrow = y > gy0 + (gy1 - gy0) * 0.55 ? 0.7 : 1;
      for (let x = 0; x < cw * narrow; x++) {
        const xx = side > 0 ? cx + x : cx + cw - x;
        const fold = Math.floor(x / (4 * k)) % 2;
        ctx.fillStyle = tie ? '#f0d070' : x >= cw * narrow - 1 ? OUTLINE : rgb(CURTAIN[fold ? 1 : 0]);
        ctx.fillRect(xx, y, 1, 1);
      }
    }
  });
  // the curtain rail
  ctx.fillStyle = rgb(WOOD.dk);
  ctx.fillRect(gx0 - t - cw, Math.round(gy0 - 12 * k), gx1 - gx0 + 2 * (t + cw), Math.round(2 * k));
}

// A little picture into a texture: (w, h), painted by `paint(ctx)`.
function texture(scene, key, w, h, paint) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  paint(tex.getContext());
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function animate(scene, w, h) {
  const g = geometry(w, h);
  const { k, gx0, gx1, gy0, gy1, hz, fence } = g;
  const mask = scene.make.graphics({ add: false }).fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0).createGeometryMask();

  // clouds drifting across the sky
  const cloud = texture(scene, 'garden-cloud', 24, 10, (ctx) => {
    obj(ctx, 1, 2, 22, 7, (r) => { r(2, 2, 18, 5, '#ffffff'); r(5, 0, 8, 3, '#ffffff'); r(12, 1, 6, 2, '#ffffff'); r(2, 5, 18, 2, '#dce8f4'); });
  });
  [[0.2, 0.3, 0], [0.75, 0.55, 1]].forEach(([fx, fy, i]) => {
    const c = scene.add.image(gx0 + (gx1 - gx0) * fx, gy0 + (hz - gy0) * fy, cloud).setScale(k * (i ? 0.8 : 1.1)).setMask(mask);
    scene.tweens.add({ targets: c, x: gx1 + 20 * k, duration: 60000 * (1 - fx), onComplete: () => {
      c.x = gx0 - 20 * k;
      scene.tweens.add({ targets: c, x: gx1 + 20 * k, duration: 60000, repeat: -1 });
    } });
  });

  // a butterfly flitting about over the flowers
  const fly = scene.add.graphics().setMask(mask);
  const t0 = scene.time.now;
  scene.events.on('update', function flit(time) {
    if (!fly.active) { scene.events.off('update', flit); return; }
    const s = (time - t0) / 1000;
    const x = g.mid + Math.sin(s * 0.5) * (gx1 - gx0) * 0.35 + Math.sin(s * 2.3) * 4 * k;
    const y = fence + (gy1 - fence) * 0.55 + Math.sin(s * 0.8) * 22 * k - Math.abs(Math.sin(s * 3)) * 3 * k;
    const open = Math.sin(s * 18) > 0;
    const u = Math.max(1, Math.round(k));
    fly.clear().fillStyle(0xf0a030);
    if (open) fly.fillRect(x - 3 * u, y - u, 2 * u, 2 * u).fillRect(x + u, y - u, 2 * u, 2 * u);
    else fly.fillRect(x - u, y - 2 * u, u, 2 * u).fillRect(x + u, y - 2 * u, u, 2 * u);
    fly.fillStyle(0x2e1d0c).fillRect(x, y - u, u, 2 * u);
  });

  // a little bird on the bird bath, hopping now and then
  const bird = texture(scene, 'garden-bird', 8, 7, (ctx) => {
    obj(ctx, 1, 1, 6, 5, (r) => { r(1, 1, 4, 3, '#8a5a3a'); r(0, 1, 2, 2, '#8a5a3a'); r(1, 3, 3, 1, '#e0a070'); r(5, 2, 1, 1, '#f0c040'); });
  });
  const bx = gx1 - 26 * k;
  const by = fence + (gy1 - fence) * 0.3 - 19 * k;
  const b = scene.add.image(bx + 6 * k, by, bird).setScale(k * 1.4).setMask(mask);
  scene.time.addEvent({
    delay: 2200, loop: true,
    callback: () => {
      scene.tweens.add({ targets: b, y: by - 3 * k, duration: 140, yoyo: true });
      if (Math.random() < 0.4) b.setFlipX(!b.flipX);
    },
  });

  // his coffee on the sill, steaming; a sip now and then
  if (scene.spot === 'coffee') {
    const mug = texture(scene, 'garden-mug', 16, 15, (ctx) => {
      obj(ctx, 1, 1, 11, 13, (r) => { r(0, 0, 11, 13, '#f8f0e0'); r(8, 1, 3, 12, '#d8ccb8'); r(1, 0, 9, 3, '#6a3a1e'); r(1, 0, 3, 1, '#8a5a3a'); });
      obj(ctx, 12, 4, 3, 6, (r) => { r(0, 0, 3, 6, '#f8f0e0'); r(1, 1, 1, 4, '#4a2a14'); });
    });
    const mx = g.mid + 12 * k;
    const my = gy1 + 2 * k;
    const m = scene.add.image(mx, my, mug).setOrigin(0.5, 1).setScale(k * 1.2);
    scene.time.addEvent({
      delay: 380, loop: true,
      callback: () => {
        const s = scene.add.rectangle(m.x + (Math.random() - 0.5) * 6 * k, m.y - m.displayHeight, 2 * k, 2 * k, 0xffffff, 0.75);
        scene.tweens.add({ targets: s, y: s.y - 14 * k, x: s.x + (Math.random() - 0.5) * 6 * k, alpha: 0, duration: 1500, onComplete: () => s.destroy() });
      },
    });
    scene.time.addEvent({
      delay: 4200, startAt: 1800, loop: true,
      callback: () => scene.tweens.add({ targets: m, y: h + 6 * k, scale: k * 2.4, duration: 600, yoyo: true, hold: 700, ease: 'Sine.easeInOut' }),
    });
  }

  scene.time.delayedCall(1100, () => {
    if (scene.caption) return;
    scene.say(scene.spot === 'coffee'
      ? { af: 'Aah… ’n mooi tuin en ’n lekker koppie koffie.', en: 'Aah… a lovely garden and a lovely cup of coffee.' }
      : { af: 'Wat ’n mooi tuin agter die kafee.', en: 'What a lovely garden behind the cafe.' });
  });
}

export default { draw, animate };

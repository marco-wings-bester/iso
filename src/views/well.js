import Phaser from 'phaser';
import { hash, smooth, shade, GRASS, GRASS_HI, FLOWERS } from './art.js';
import { hasFlag, setFlag } from '../state.js';
import { today } from '../days.js';
import { WEDNESDAY } from '../chores.js';
import { line } from '../hints.js';

// Farmer Jones's view straight down a well: the underside of his hat brim at
// the top, the stone rim, the shaft's stone courses vanishing into
// darkness, the rope hanging down, and far below black water reflecting the
// small bright opening with his own silhouette in it. Drawn as pixel art in
// perspective: a pixel's distance from the centre maps to depth down the shaft.
// From Wednesday he checks the wells (src/chores.js): down goes the bucket and
// up it comes, full from the top well ('wellTop'), empty from the bottom one
// by the orchard ('wellBottom'), which has run dry: no water down there, just
// cracked mud. Once he's fished the old shoe out of the pond (src/views/pond.js:
// 'shoe'), it gives water again ('wellFixed').

// The bottom well, from Wednesday (until he's put it right): dry.
const isDry = spot => spot === 'wellBottom' && today() >= WEDNESDAY && !hasFlag('shoe') && !hasFlag('wellFixed');

const STONES = [[128, 122, 110], [110, 106, 96], [140, 132, 118], [100, 98, 90]];
const RIM_STONES = [[184, 178, 164], [168, 162, 148], [196, 190, 174]];
const MOSS = [74, 100, 50];
const MORTAR = [40, 36, 30];
const RIM_OUTLINE = [46, 29, 12];

function wellGeometry(w, h) {
  const M = Math.min(w, h);
  const cx = w / 2;
  const cy = h * 0.47;
  const R = M * 0.36;              // top of the shaft (inner edge of the rim)
  const RIM = R * 1.42;            // outer edge of the rim
  const WATER = 2.8;               // depth of the water, in shaft radii
  return { M, cx, cy, R, RIM, WATER, rWater: R / (1 + WATER), rSky: R / (1 + 2 * WATER) };
}

function draw(ctx, w, h, { spot } = {}) {
  const g = wellGeometry(w, h);
  const dry = isDry(spot);
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

      if (r < rWater && dry) {
        // Dry: cracked mud and a few stones at the bottom, in the gloom.
        const crack = Math.abs(Math.sin(dx * 0.9 + Math.sin(dy * 0.7) * 2)) < 0.12 || Math.abs(Math.sin(dy * 1.1 + dx * 0.3)) < 0.1;
        const stone = hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.9;
        c = shade(crack ? [30, 22, 14] : stone ? [96, 92, 84] : [92, 70, 44], 0.32 - 0.12 * (r / rWater), x, y);
      } else if (r < rWater) {
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
        // Sun from the top-left lights a crescent of the far wall near the
        // top; everything else is in shade that deepens to black.
        const facing = Math.cos(2 * Math.PI * (a - 0.125));
        const sunlit = d < 0.75 * Math.max(0, facing);
        let b = 0.5 * Math.exp(-d * 1.7) + (sunlit ? 0.5 : 0);
        if (d < 0.06) b = Math.max(b, 0.8); // the lip, in daylight
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
        // Capstones in full sun.
        let b = 0.92 + 0.08 * Math.cos(2 * Math.PI * (a - 0.625));
        if (!edge && !seam && (col - ci) * ((2 * Math.PI * r) / K) < 2.6) b *= 1.15; // stone edge highlight
        c = edge ? RIM_OUTLINE : seam ? shade(MORTAR, 1, x, y) : shade(RIM_STONES[Math.floor(hash(ci, 3) * 3)], b, x, y);
      } else {
        // Grass around the well in full sun, like the rest of the farm, with
        // tufts and little flowers; the rim casts a thin shadow away from the sun.
        const fx = Math.floor(x / 2);
        const fy = Math.floor(y / 2);
        const n = hash(fx, fy);
        let rgb = GRASS[n < 0.33 ? 0 : n < 0.8 ? 1 : 2];
        if (hash(Math.floor(x / 3) + 17, Math.floor(y / 4)) > 0.93 && (x + y) % 3 === 0) rgb = GRASS_HI;
        if (hash(fx + 5, fy + 11) > 0.988) rgb = FLOWERS[Math.floor(hash(fy, fx) * FLOWERS.length)];
        const b = r < RIM + 5 && Math.cos(2 * Math.PI * (a - 0.125)) > 0.2 ? 0.72 : 1;
        c = shade(rgb, b, x, y);
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
    const b = Math.exp(-depth * 1.6);
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

// Underside of his straw hat brim across the top of his view.
function drawHatBrim(ctx, w, { M }) {
  const depth = Math.round(M * 0.13);
  for (let x = 0; x < w; x++) {
    const t = (x - w / 2) / (w * 0.58);
    const bottom = Math.round(depth * (1 - t * t));
    if (bottom <= 0) continue;
    for (let y = 0; y < bottom; y++) {
      const weave = (x + y * 2) % 5 === 0 || (x - y) % 7 === 0;
      ctx.fillStyle = weave ? '#6a4820' : y > bottom - 3 ? '#a87838' : '#8a6030';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#e0b050';
    ctx.fillRect(x, bottom - 1, 1, 1);
    ctx.fillStyle = '#2e1d0c';
    ctx.fillRect(x, bottom, 1, 1);
  }
}

// The well's bucket seen from above: wooden staves, an iron band, and inside
// it water (full) or nothing (empty).
function bucketTexture(scene, full) {
  const key = full ? 'pov-bucket-full' : 'pov-bucket';
  if (scene.textures.exists(key)) return key;
  const S = 30;
  const tex = scene.textures.createCanvas(key, S, S);
  const ctx = tex.getContext();
  const c = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > 14.5) continue;
      const a = Math.atan2(y + 0.5 - c, x + 0.5 - c);
      let col;
      if (d > 13.5) col = '#2e1d0c';
      else if (d > 11) col = Math.abs(Math.sin(a * 9)) < 0.15 ? '#6a4020' : a < 0 ? '#c08850' : '#9a6a3a'; // staves
      else if (d > 10) col = '#4a4e56'; // iron band
      else if (full) col = d < 4 && x < c && y < c ? '#bfe4f8' : d > 8.5 ? '#2a6aa0' : '#3a86c8';
      else col = d > 8.5 ? '#3a2614' : '#5a3a1e';
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

// Lowering the bucket down the shaft (it shrinks into the dark), a splash or
// a dull thud at the bottom, and winding it back up: full, or not.
function drawWater(scene, g, dry) {
  scene.busy = true;
  const { cx, cy, R, rWater } = g;
  const bucket = scene.add.image(cx + 1, cy, bucketTexture(scene, false)).setDepth(3);
  const top = (R * 0.55) / 15;    // its scale at the top of the shaft
  const bottom = (rWater * 0.8) / 15;
  bucket.setScale(top);
  const dim = (s) => { // darker the deeper it goes
    const b = Math.round(255 * Math.min(1, 0.25 + 0.75 * (s - bottom) / (top - bottom)));
    bucket.setTint(Phaser.Display.Color.GetColor(b, b, b));
  };
  const rings = scene.add.graphics().setDepth(2);
  scene.tweens.add({
    targets: bucket, scale: bottom, duration: 1600, ease: 'Quad.easeIn', onUpdate: () => dim(bucket.scale),
    onComplete: () => {
      if (dry) {
        // thud: a puff of dust
        const dust = scene.add.circle(cx, cy, 3, 0x9a8a70, 0.6).setDepth(2);
        scene.tweens.add({ targets: dust, scale: 3, alpha: 0, duration: 700, onComplete: () => dust.destroy() });
      } else {
        bucket.setTexture(bucketTexture(scene, true));
        const ring = { r: 2, alpha: 0.7 };
        scene.tweens.add({
          targets: ring, r: rWater * 0.9, alpha: 0, duration: 900,
          onUpdate: () => rings.clear().lineStyle(1, 0x8fb0c8, ring.alpha).strokeCircle(cx, cy, ring.r),
          onComplete: () => rings.clear(),
        });
      }
      scene.tweens.add({
        targets: bucket, scale: top * 1.1, duration: 1800, delay: 700, ease: 'Quad.easeOut', onUpdate: () => dim(bucket.scale),
        onComplete: () => {
          const fixed = !dry && scene.spot === 'wellBottom';
          setFlag(dry ? 'wellBottom' : fixed ? 'wellFixed' : 'wellTop');
          scene.busy = false;
          const hint = dry ? line('wellDry') : null;
          scene.say(dry
            ? { af: 'Leeg?! Daar is geen water in hierdie put nie. Iets is fout…', en: "Empty?! There's no water in this well. Something's wrong…" }
            : fixed
              ? { af: '’n Volle emmer! Wat ’n geluk dat ek daai ou skoen uitgevis het: dit het die pyp toegestop. Nou werk die put weer!', en: "A full bucket! What luck that I fished out that old shoe: it was blocking the pipe. Now the well works again!" }
              : { af: '’n Volle emmer! Hierdie put werk goed. Ek sit dit langs die put neer.', en: "A full bucket! This well works fine. I'll leave it beside the well." },
          () => (hint ? scene.say(hint, () => scene.close()) : scene.close()));
        },
      });
    },
  });
}

// Now and then a drip sends a ripple across the water (not when it's dry).
// And, from Wednesday, if he hasn't yet: a bucket of water from it.
function animate(scene, w, h) {
  const g = wellGeometry(w, h);
  const dry = isDry(scene.spot);
  const flag = scene.spot === 'wellBottom' ? (hasFlag('shoe') ? 'wellFixed' : 'wellBottom') : 'wellTop';
  if (today() >= WEDNESDAY && !hasFlag(flag)) {
    scene.time.delayedCall(900, () => {
      if (!scene.caption) scene.say({ af: 'Kom ek kyk of die put werk: ’n emmer water.', en: "Let's see that the well works: a bucket of water." }, () => drawWater(scene, g, dry));
    });
  }
  if (dry) return;
  const ripples = scene.add.graphics();
  const drip = () => {
    const ox = (Math.random() - 0.5) * g.rWater * 0.5;
    const oy = (Math.random() - 0.5) * g.rWater * 0.5;
    const ring = { r: 0.5, alpha: 0.5 };
    scene.tweens.add({
      targets: ring,
      r: g.rWater * 0.75,
      alpha: 0,
      duration: 1600,
      onUpdate: () => {
        ripples.clear().lineStyle(1, 0x8fb0c8, ring.alpha).strokeCircle(g.cx + ox, g.cy + oy, ring.r);
      },
    });
  };
  scene.time.addEvent({ delay: 2800, startAt: 1800, loop: true, callback: drip });
}

export default { draw, animate };

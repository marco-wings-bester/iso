import { t } from './i18n.js';

// The night passing, over the farm, as a pixel-art animation (no words): the
// farm (its own map, the sky taken out of it, so the hills and the windmill
// stand against ours) under a sky that runs from golden light through
// sunset, dusk and a starry night (the moon going down behind the hills, a
// shooting star, fireflies over the farm, the farmhouse's windows lit) to
// dawn and the sun coming up again. Drawn small and scaled up crisp, the
// sky dithered like the rest of the game. A tap or key hurries it along.
//
//   night(map, onDawn)  the whole night; `onDawn()` as the sun comes up (the
//                       new day: the badge at the top changes then)
//   lastNight(map)      Sunday night: to the stars, and the week is done

const DURATION = 12000; // ms, sunset to morning
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const CROP = 1030; // map rows shown: from its hills down past the farmhouse, the barn and the fields
const SKY_ROWS = 150; // map rows with sky in them

// The sky at each moment: top, upper, lower, horizon.
const SKIES = [
  [0.00, [[92, 142, 212], [150, 170, 212], [250, 194, 146], [255, 176, 96]]],   // golden hour
  [0.10, [[58, 66, 150], [168, 98, 150], [248, 118, 92], [255, 168, 72]]],      // sunset
  [0.20, [[24, 28, 80], [66, 48, 118], [166, 78, 120], [236, 128, 92]]],        // dusk
  [0.32, [[6, 8, 30], [12, 18, 52], [22, 32, 76], [36, 52, 98]]],               // night
  [0.64, [[6, 8, 30], [12, 18, 52], [22, 32, 76], [36, 52, 98]]],
  [0.75, [[16, 20, 62], [52, 50, 112], [140, 88, 140], [228, 138, 128]]],       // first light
  [0.87, [[70, 112, 182], [160, 150, 192], [250, 182, 142], [255, 204, 112]]],  // sunrise
  [1.00, [[112, 172, 232], [150, 202, 242], [200, 226, 246], [236, 236, 214]]], // morning
];
// The light on the land (multiplied) and a warm glow on it (added).
const LIGHT = [
  [0.00, [255, 232, 200], 0.10], [0.10, [240, 170, 140], 0.25], [0.20, [126, 100, 142], 0.05],
  [0.32, [58, 70, 122], 0], [0.64, [58, 70, 122], 0], [0.75, [116, 100, 150], 0.05],
  [0.87, [244, 196, 172], 0.25], [1.00, [255, 255, 255], 0],
];

const lerp = (a, b, f) => a + (b - a) * f;
const mix = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
const ease = f => f * f * (3 - 2 * f);
const ramp = (x, a, b) => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
const rgb = c => `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;

// Between the keyframes around `at`.
function keyed(frames, at, pick) {
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1][0] <= at) i++;
  const [a, va] = frames[i];
  const [b, vb] = frames[i + 1];
  return pick(va, vb, ease(Math.min(1, Math.max(0, (at - a) / (b - a)))), frames[i], frames[i + 1]);
}

// A seeded random (the same stars every night).
function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

// The farm map's top, from its hills down, its sky made see-through.
function farmImage(map) {
  const c = document.createElement('canvas');
  c.width = map.width;
  c.height = CROP;
  const ctx = c.getContext('2d');
  ctx.drawImage(map, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, SKY_ROWS);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const sky = b > r + 25 && b > 170;              // blue
    const px = (i / 4) % c.width;
    const py = Math.floor(i / 4 / c.width);
    const smoke = px > 125 && px < 215 && py > 85;  // the farmhouse chimney's smoke stays
    const cloud = r > 222 && g > 228 && b > 230 && !smoke; // white
    const sun = r > 235 && g > 215 && b > 120 && px < 110 && py < 70; // the sun, top left
    if (sky || cloud || sun) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function start(map, { onDawn, end = 1 }) {
  const W = Math.max(120, Math.round(window.innerWidth / 2));
  const H = Math.max(160, Math.round(window.innerHeight / 2));
  const canvas = Object.assign(document.createElement('canvas'), { id: 'night', width: W, height: H });
  const ctx = canvas.getContext('2d');
  document.body.append(canvas);
  document.body.classList.add('nighttime');

  // the farm, small: across the width, its hills a little over a third of
  // the way down (on a wide screen its lower part goes off the bottom)
  const scale = W / map.width;
  const farmH = Math.round(CROP * scale);
  const top = Math.max(H - farmH, Math.round(H * 0.36));
  const farm = document.createElement('canvas');
  farm.width = W;
  farm.height = farmH;
  const fctx = farm.getContext('2d');
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(farmImage(map), 0, 0, W, farmH);
  const lit = document.createElement('canvas');
  lit.width = W;
  lit.height = farmH;
  const lctx = lit.getContext('2d');
  const horizon = top + Math.round(100 * scale); // the hilltops
  const at = (x, y) => [Math.round(x * scale), top + Math.round(y * scale)]; // map px → screen

  const R = rng(7);
  const stars = Array.from({ length: Math.round(W * horizon / 160) }, () => ({
    x: Math.floor(R() * W), y: Math.floor(R() * (horizon - 4)), b: 0.35 + R() * 0.65, big: R() < 0.12, p: R() * 6.3, s: 1 + R() * 3,
  }));
  const flies = Array.from({ length: 9 }, () => ({ x: R() * W, y: horizon + 30 + R() * (H - horizon - 40), p: R() * 6.3 }));
  const windows = [[232, 270], [244, 270], [289, 262], [262, 318]].map(([x, y]) => at(x, y)); // the farmhouse, its door's lamp
  const sky = ctx.createImageData(W, horizon + 40);

  let t0 = performance.now();
  let progress = 0;
  let last = t0;
  let speed = 1;
  let dawned = false;
  let stopped = false;
  let reached;
  const done = new Promise((r) => { reached = r; });

  const hurry = (e) => {
    if (e.repeat) return;
    speed = 5;
  };
  canvas.addEventListener('pointerdown', hurry);
  window.addEventListener('keydown', hurry);

  function draw(now) {
    if (stopped) return;
    progress = Math.min(end, progress + (now - last) / DURATION * speed);
    last = now;
    const p = progress;
    const time = (now - t0) / 1000;

    // where the sun and the moon are (screen px), and how bright
    const skyH = horizon;
    const sunSet = p < 0.16 ? [lerp(W * 0.24, W * 0.16, p / 0.16), lerp(horizon - skyH * 0.3, horizon + 14, ramp(p, 0, 0.16))] : null;
    const sunRise = p > 0.78 ? [lerp(W * 0.8, W * 0.74, (p - 0.78) / 0.22), lerp(horizon + 14, horizon - skyH * 0.38, ramp(p, 0.78, 1))] : null;
    const sun = sunSet ?? sunRise;
    const moonT = ramp(p, 0.2, 0.74);
    const moon = p > 0.2 && p < 0.76 ? [lerp(W * 0.8, W * 0.2, moonT), lerp(skyH * 0.2, horizon + 12, moonT * moonT)] : null;
    const moonA = ramp(p, 0.2, 0.28);
    const night = ramp(p, 0.18, 0.3) * (1 - ramp(p, 0.68, 0.8));

    // the sky, dithered between its bands; warm round the sun, pale round the moon
    const colours = keyed(SKIES, p, (a, b, f) => a.map((c, i) => mix(c, b[i], f)));
    const d = sky.data;
    for (let y = 0; y < sky.height; y++) {
      const v = Math.min(1, y / skyH) * 3;
      const k = Math.min(2, Math.floor(v));
      const row = mix(colours[k], colours[k + 1], v - k);
      for (let x = 0; x < W; x++) {
        let c = row;
        if (sun) {
          const dist = Math.hypot(x - sun[0], (y - sun[1]) * 1.4) / (W * 0.55);
          if (dist < 1) c = mix(c, [255, 190, 110], (1 - dist) ** 2 * 0.55);
        }
        if (moon) {
          const dist = Math.hypot(x - moon[0], y - moon[1]) / (W * 0.18);
          if (dist < 1) c = mix(c, [120, 140, 190], (1 - dist) ** 2 * 0.35 * moonA);
        }
        const q = BAYER[(y & 3) * 4 + (x & 3)] * 10;
        const i = (y * W + x) * 4;
        d[i] = Math.round((c[0] + q) / 6) * 6;
        d[i + 1] = Math.round((c[1] + q) / 6) * 6;
        d[i + 2] = Math.round((c[2] + q) / 6) * 6;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(sky, 0, 0);
    ctx.fillStyle = rgb(colours[3]);
    ctx.fillRect(0, sky.height, W, H - sky.height);

    // stars, twinkling, and once a shooting star
    stars.forEach((s) => {
      const a = night * s.b * (0.55 + 0.45 * Math.sin(time * s.s + s.p));
      if (a < 0.05) return;
      ctx.fillStyle = `rgba(255, 250, 230, ${a})`;
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big && a > 0.5) {
        ctx.fillStyle = `rgba(200, 210, 255, ${a * 0.5})`;
        ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1); ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    });
    if (p > 0.44 && p < 0.5) {
      const f = (p - 0.44) / 0.06;
      const x = lerp(W * 0.3, W * 0.65, f);
      const y = lerp(skyH * 0.12, skyH * 0.3, f);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(255, 255, 240, ${(1 - i / 8) * Math.sin(Math.PI * f)})`;
        ctx.fillRect(Math.round(x - i * 2), Math.round(y - i * 0.5), 2, 1);
      }
    }

    // the moon: a pale disc, its seas, shaded on one side
    if (moon) {
      const r = Math.max(5, Math.round(W / 34));
      const [mx, my] = moon.map(Math.round);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const dd = Math.hypot(x, y);
          if (dd > r + 0.3) continue;
          let c = [240, 236, 214];
          if (Math.hypot(x + r * 0.3, y - r * 0.2) < r * 0.3 || Math.hypot(x - r * 0.35, y + r * 0.35) < r * 0.22) c = [206, 202, 184];
          if (x > r * 0.35 && x + y * 0.2 > r * 0.4) c = mix(c, [150, 156, 180], 0.5); // in shadow
          if (dd > r - 0.7) c = [176, 178, 196];
          ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${moonA})`;
          ctx.fillRect(mx + x, my + y, 1, 1);
        }
      }
    }

    // the sun: a bright disc, paler at its heart
    if (sun) {
      const r = Math.max(6, Math.round(W / 22));
      const [sx, sy] = sun.map(Math.round);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const dd = Math.hypot(x, y) / r;
          if (dd > 1.02) continue;
          const c = dd < 0.45 ? [255, 250, 220] : dd < 0.8 ? [255, 222, 120] : [252, 176, 72];
          ctx.fillStyle = rgb(c);
          ctx.fillRect(sx + x, sy + y, 1, 1);
        }
      }
    }

    // the farm, in the light of the moment (keeping its see-through sky)
    const [light, glow] = keyed(LIGHT, p, (a, b, f, A, B) => [mix(A[1], B[1], f), lerp(A[2], B[2], f)]);
    lctx.globalCompositeOperation = 'copy';
    lctx.drawImage(farm, 0, 0);
    lctx.globalCompositeOperation = 'multiply';
    lctx.fillStyle = rgb(light);
    lctx.fillRect(0, 0, W, farmH);
    if (glow > 0) {
      lctx.globalCompositeOperation = 'lighter';
      lctx.fillStyle = `rgba(120, 50, 10, ${glow})`;
      lctx.fillRect(0, 0, W, farmH);
    }
    lctx.globalCompositeOperation = 'destination-in';
    lctx.drawImage(farm, 0, 0);
    ctx.drawImage(lit, 0, top);

    // lamplight in the farmhouse and fireflies over the farm, at night
    if (night > 0.05) {
      windows.forEach(([x, y]) => {
        ctx.fillStyle = `rgba(255, 190, 90, ${0.25 * night})`;
        ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.fillStyle = `rgba(255, 214, 120, ${night})`;
        ctx.fillRect(x, y, 2, 2);
      });
      flies.forEach((f) => {
        const a = night * Math.max(0, Math.sin(time * 1.7 + f.p));
        if (a < 0.1) return;
        ctx.fillStyle = `rgba(220, 255, 120, ${a})`;
        ctx.fillRect(Math.round(f.x + Math.sin(time * 0.6 + f.p) * 6), Math.round(f.y + Math.cos(time * 0.8 + f.p) * 3), 1, 1);
      });
    }

    if (!dawned && p >= 0.8) {
      dawned = true;
      onDawn?.();
    }
    if (p >= end) reached();
    requestAnimationFrame(draw);
  }
  canvas.style.opacity = '0';
  requestAnimationFrame((now) => {
    t0 = last = now;
    canvas.style.opacity = '1';
    draw(now);
  });

  const close = () => new Promise((r) => {
    canvas.style.opacity = '0';
    setTimeout(() => {
      stopped = true;
      canvas.removeEventListener('pointerdown', hurry);
      window.removeEventListener('keydown', hurry);
      canvas.remove();
      document.body.classList.remove('nighttime');
      r();
    }, 700);
  });
  return { done, close, canvas };
}

export async function night(map, onDawn) {
  const n = start(map, { onDawn });
  await n.done;
  await new Promise(r => setTimeout(r, 600)); // a moment of morning
  await n.close();
}

// Sunday night: under the stars, the week, and the game, is done; resolves
// when "Start a new week" is tapped.
export async function lastNight(map) {
  const n = start(map, { end: 0.42 });
  await n.done;
  const div = (className, text = '') => Object.assign(document.createElement('div'), { className, textContent: text });
  const words = div('week-done');
  const again = Object.assign(document.createElement('button'), { type: 'button', className: 'btn new', textContent: t({ af: 'Begin ’n nuwe week', en: 'Start a new week' }) });
  words.append(
    div('big', t({ af: 'Die week is klaar!', en: 'The week is done!' })),
    div('note', t({ af: 'Boer Johan het sy hele week op die plaas deurgemaak. Baie geluk!', en: 'Farmer Jones has made it through his whole week on the farm. Well done!' })),
    again,
  );
  document.body.append(words);
  await new Promise((r) => { again.onclick = r; });
  words.remove();
  await n.close();
}

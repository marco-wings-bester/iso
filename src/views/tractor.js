import { obj } from '../pixelArt.js';
import { hash, mix, band, pixels, ellipse, rgb, limb, OUTLINE } from './art.js';

// Farmer Jones in the tractor's seat: through the windshield the green hood
// with its exhaust stack, ploughed furrows running to the horizon, hills and
// sky; in front of him the dashboard gauges, the steering wheel and the gear
// lever.

const SKY = [[110, 172, 226], [128, 186, 234], [152, 202, 238], [178, 218, 242], [204, 230, 246]];
const FURROWS = [[132, 86, 48], [108, 68, 38]];
const GREEN = { hi: [112, 188, 88], mid: [72, 152, 60], lo: [44, 108, 42], dark: [28, 70, 30] };

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const portrait = h > w;
  const hz = Math.round(h * (portrait ? 0.3 : 0.32));
  const dashTop = Math.round(h * (portrait ? 0.56 : 0.58));
  const dashBot = Math.round(h * (portrait ? 0.7 : 0.74));
  const vx = w / 2;
  const wheel = { cx: vx, cy: Math.round(h * (portrait ? 0.8 : 0.86)), rx: Math.min(w * 0.38, 70 * k), ry: Math.round(h * 0.1) };
  const gauges = [-1, 1].map(s => ({ x: Math.round(vx + s * 34 * k), y: Math.round(dashTop + (dashBot - dashTop) * 0.45), r: Math.round(10 * k) }));
  const stack = { x: Math.round(vx + 30 * k), top: Math.round(hz - 22 * k), bottom: Math.round(dashTop - 6 * k) };
  return { k, hz, dashTop, dashBot, vx, wheel, gauges, stack };
}

function draw(ctx, w, h) {
  const g = geometry(w, h);
  const { k, hz, dashBot, vx, wheel, stack } = g;

  // Outside: sky, distant hills and trees, furrows converging on the horizon.
  pixels(ctx, w, h, (x, y) => {
    const hill = hz - (10 + 5 * Math.sin(x * 0.04) + 3 * Math.sin(x * 0.11 + 2)) * k;
    const trees = hz - (4 + 3 * Math.abs(Math.sin(x * 0.3)) + 2 * hash(x >> 2, 3)) * k;
    if (y < hill) return band(SKY, y / hill, x, y);
    if (y < trees) return [150, 194, 120];
    if (y < hz) return hash(x >> 1, y >> 1) < 0.4 ? [72, 128, 56] : [92, 150, 64];
    if (y < hz + 2 * k) return [120, 176, 64]; // headland at the far end of the field
    const f = (x - vx) / (y - hz + 0.5);
    const stripe = ((Math.floor(f * 5) % 2) + 2) % 2;
    const p = (y - hz) / (h - hz);
    return mix(FURROWS[stripe], [170, 150, 120], 0.35 * (1 - Math.min(1, p * 3)));
  });

  // a couple of clouds
  [[0.22, 0.07, 1], [0.78, 0.12, 0.7]].forEach(([cx, cy, s]) => {
    [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [0.3, -0.35, 0.7]].forEach(([dx, dy, ps]) => {
      const r = 12 * k * s;
      ellipse(ctx, cx * w + dx * r, cy * h + dy * r * 0.6, r * ps, r * ps * 0.6, (u, v) => (v > 0.35 ? [214, 228, 240] : [252, 252, 252]));
    });
  });

  hood(ctx, g);
  exhaust(ctx, stack, k);
  cab(ctx, w, h, g);
  dashboard(ctx, w, g);

  // steering column, wheel and gear lever
  obj(ctx, Math.round(vx - 6 * k), dashBot, Math.round(12 * k), h - dashBot, r => {
    r(0, 0, 12 * k, h, '#3a3e3c');
    r(0, 0, 3 * k, h, '#5a605c');
  });
  gearLever(ctx, w, h, g);
  steeringWheel(ctx, wheel, k);
}

function hood(ctx, { k, hz, dashTop, vx }) {
  const top = hz + Math.round(14 * k);
  const halfAt = y => (13 + (y - top) / (dashTop - top) * 34) * k;
  for (let y = top; y < dashTop; y++) {
    const half = halfAt(y);
    for (let x = Math.floor(vx - half); x < Math.ceil(vx + half); x++) {
      const u = (x + 0.5 - vx) / half; // -1 … 1 across the hood
      let c = u < -0.55 ? GREEN.hi : u > 0.55 ? GREEN.lo : GREEN.mid;
      if (Math.abs(u) < 0.08) c = GREEN.hi; // the ridge down the middle
      if (Math.abs(Math.abs(u) - 0.8) < 0.04) c = [240, 208, 80]; // yellow trim
      if (Math.abs(u) > 0.95) c = GREEN.dark;
      ctx.fillStyle = rgb(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // the front of the hood: grille edge and a little radiator cap
  const half = halfAt(top);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(Math.floor(vx - half), top - 1, Math.ceil(half * 2), 1);
  ctx.fillStyle = '#f0d050';
  ctx.fillRect(Math.floor(vx - half), top, Math.ceil(half * 2), 1);
  obj(ctx, Math.round(vx - 2 * k), top + Math.round(4 * k), Math.round(4 * k), Math.round(3 * k), r => r(0, 0, 4 * k, 3 * k, '#9098a0'));
  // the air intake on the left
  obj(ctx, Math.round(vx - 24 * k), top + Math.round(8 * k), Math.round(6 * k), Math.round(10 * k), r => {
    r(0, 0, 6 * k, 10 * k, '#2a2c2e');
    r(0, 0, 2, 10 * k, '#4a4e52');
    r(0, 0, 6 * k, 2, '#5a5e62');
  });
}

function exhaust(ctx, { x, top, bottom }, k) {
  obj(ctx, x, top, Math.round(4 * k), bottom - top, r => {
    r(0, 0, 4 * k, bottom - top, '#4a4a50');
    r(0, 0, 1, bottom - top, '#9a9aa4');
    r(3 * k, 0, 1, bottom - top, '#2e2e32');
  });
  obj(ctx, x - 1, top - Math.round(3 * k), Math.round(6 * k), Math.round(3 * k), r => {
    r(0, 0, 6 * k, 3 * k, '#3a3a40');
    r(0, 0, 6 * k, 1, '#6a6a72');
  });
}

// Pillars and roof around the windshield, with glints on the glass.
function cab(ctx, w, h, { k, dashTop }) {
  const roof = Math.round(10 * k);
  ctx.fillStyle = rgb(GREEN.dark);
  ctx.fillRect(0, 0, w, roof);
  ctx.fillStyle = rgb(GREEN.lo);
  ctx.fillRect(0, roof - 3, w, 2);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, roof - 1, w, 1);
  for (let y = 0; y < dashTop; y++) {
    const pw = Math.round((12 + (y / dashTop) * 6) * k);
    [[0, pw], [w - pw, pw]].forEach(([x0, wd], side) => {
      for (let x = x0; x < x0 + wd; x++) {
        const inner = side ? x === x0 : x === x0 + wd - 1;
        const lit = side ? x === x0 + 1 : x === x0 + wd - 2;
        ctx.fillStyle = inner ? OUTLINE : lit ? rgb(GREEN.mid) : rgb(GREEN.lo);
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }
  // glass glints
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 18 * k; i++) {
    ctx.fillRect(Math.round(w * 0.22 + i), Math.round(roof + 4 * k + i * 1.6), 2, 2);
    if (i < 10 * k) ctx.fillRect(Math.round(w * 0.3 + i), Math.round(roof + 4 * k + i * 1.6), 1, 2);
  }
}

function dashboard(ctx, w, { k, dashTop, dashBot, gauges }) {
  ctx.fillStyle = '#3c403e';
  ctx.fillRect(0, dashTop, w, dashBot - dashTop);
  ctx.fillStyle = '#5c625e';
  ctx.fillRect(0, dashTop, w, Math.round(3 * k));
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, dashTop - 1, w, 1);
  ctx.fillRect(0, dashBot, w, 1);
  // below the dash: the cab's lower panel, light enough for the wheel to stand out
  for (let y = dashBot + 1, i = 0; i < 400; y++, i++) {
    ctx.fillStyle = i < 3 ? '#6a766e' : i % 9 === 0 ? '#56625a' : '#5e6a62';
    ctx.fillRect(0, y, w, 1);
  }
  gauges.forEach(({ x, y, r }) => {
    ellipse(ctx, x, y, r + 1, r + 1, () => OUTLINE);
    ellipse(ctx, x, y, r, r, (u, v) => {
      const d = Math.hypot(u, v);
      if (d > 0.82) return [70, 74, 72];
      // tick marks around the top
      const a = Math.atan2(v, u);
      if (d > 0.62 && a < -0.2 && a > -2.94 && Math.abs(((a * 8) % 1)) < 0.25) return [40, 40, 40];
      return v < -0.2 && u < 0 ? [250, 248, 238] : [232, 228, 216];
    });
  });
  // warning lights and the ignition key
  const cx = w / 2;
  [['#58c050', -6], ['#f0a030', 0], ['#e04030', 6]].forEach(([c, dx]) => {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(Math.round(cx + dx * k - 2), dashTop + Math.round(5 * k) - 1, 4, 4);
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(cx + dx * k - 1), dashTop + Math.round(5 * k), 2, 2);
  });
  obj(ctx, Math.round(cx + 14 * k), dashBot - Math.round(8 * k), Math.round(3 * k), Math.round(5 * k), r => {
    r(0, 0, 3 * k, 5 * k, '#e8c050');
    r(0, 0, 1, 5 * k, '#f8e090');
  });
}

function steeringWheel(ctx, { cx, cy, rx, ry }, k) {
  const t = 4.5 * k; // rim thickness
  // spokes to the hub
  [[-1, 0.15], [1, 0.15], [0, 1]].forEach(([u, v]) => {
    limb(ctx, cx, cy, cx + u * rx * 0.85, cy + v * ry * 0.85, 2.2 * k, () => '#3a3c3e');
  });
  ellipse(ctx, cx, cy, rx + 1, ry + 1, (u, v) => {
    const d = Math.hypot(u, v);
    const inner = 1 - (t + 1) / rx;
    if (d < inner - 0.02) return null;
    if (d < inner + 0.02 || d > 0.985) return OUTLINE;
    return v < -0.3 ? [96, 98, 104] : v < 0.2 ? [60, 62, 66] : [36, 38, 40];
  });
  ellipse(ctx, cx, cy, 9 * k, 5 * k, (u, v) => (Math.hypot(u, v) > 0.8 ? OUTLINE : v < -0.2 ? [110, 112, 118] : [70, 72, 76]));
}

function gearLever(ctx, w, h, { k, dashBot }) {
  const x0 = w - 18 * k;
  const y0 = h + 4;
  const x1 = w - 26 * k;
  const y1 = dashBot + 12 * k;
  limb(ctx, x0, y0, x1, y1, 2 * k, () => '#2a2c2e');
  ellipse(ctx, x1, y1, 5 * k, 5 * k, (u, v) => (Math.hypot(u, v) > 0.8 ? OUTLINE : u < -0.2 && v < -0.2 ? [252, 228, 120] : [232, 192, 64]));
}

// Gauge needles flickering with the engine, and puffs from the exhaust.
function animate(scene, w, h) {
  const { k, gauges, stack } = geometry(w, h);
  const needles = scene.add.graphics();
  const base = [-2.2, -1.2]; // revs, temperature (radians)
  const draw = (time) => {
    needles.clear().lineStyle(1, 0xd02020, 1);
    gauges.forEach(({ x, y, r }, i) => {
      const a = base[i] + (i === 0 ? Math.sin(time / 90) * 0.05 + (Math.random() - 0.5) * 0.06 : 0);
      needles.lineBetween(x, y, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
    });
    needles.fillStyle(0x202020).fillRect(gauges[0].x - 1, gauges[0].y - 1, 2, 2).fillRect(gauges[1].x - 1, gauges[1].y - 1, 2, 2);
  };
  // (the View scene is reused, so drop the listener when it closes)
  scene.events.on('update', draw);
  scene.events.once('shutdown', () => scene.events.off('update', draw));

  scene.time.addEvent({
    delay: 420,
    loop: true,
    callback: () => {
      const puff = scene.add.circle(stack.x + 2 * k, stack.top - 3 * k, 2 * k, 0x6a6a70, 0.7);
      scene.tweens.add({
        targets: puff,
        y: puff.y - 26 * k,
        x: puff.x + (6 + Math.random() * 6) * k,
        scale: 3,
        alpha: 0,
        duration: 1800,
        onComplete: () => puff.destroy(),
      });
    },
  });
}

export default { draw, animate };

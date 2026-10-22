import Phaser from 'phaser';

// The river flowing (RiverScene): little ripples drifting downstream over the
// water, only where the picture has water, each going the way the river runs
// there (along COURSE, upstream at the top left to downstream at the bottom
// right, by eye, in picture px). Not over the sluice in the stream, though:
// that has its own water, running fast down its chute from the box at the
// top and splashing out at the bottom.

const COURSE = [[0, 640], [140, 715], [225, 800], [390, 905], [600, 1000], [740, 1100], [760, 1200],
  [680, 1300], [470, 1400], [470, 1500], [630, 1600], [790, 1700], [1040, 1800], [1110, 1900],
  [1080, 2000], [1020, 2100], [900, 2230], [920, 2330], [980, 2410], [1200, 2500], [1408, 2560]];
const CELL = 4; // picture px per cell of the water map
// The sluice: round it (no river ripples), and its chute, top to bottom.
const SLUICE = [[750, 975], [860, 995], [740, 1215], [610, 1200]];
const CHUTE = { top: [775, 1002], bottom: [664, 1162], half: 14 };

function inSluice(x, y) {
  let inside = false;
  for (let i = 0, j = SLUICE.length - 1; i < SLUICE.length; j = i++) {
    const [xi, yi] = SLUICE[i];
    const [xj, yj] = SLUICE[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const rand = (a, b) => a + Math.random() * (b - a);

// Which way the river runs at (x, y): along the nearest stretch of its course.
function downstream(x, y) {
  let best = null;
  for (let i = 0; i < COURSE.length - 1; i++) {
    const [ax, ay] = COURSE[i];
    const [bx, by] = COURSE[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx) };
  }
  return best.a;
}

export function flowRiver(scene) {
  // the water, from the picture's colours (blue), at a cell a few px across
  const src = scene.textures.get(scene.map.key).getSourceImage();
  const w = Math.ceil(src.width / CELL);
  const h = Math.ceil(src.height / CELL);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const wet = (x, y) => {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return false;
    const i = (cy * w + cx) * 4;
    return px[i + 2] > px[i] + 40 && px[i + 2] > 120;
  };

  const cam = scene.cameras.main;
  scene.time.addEvent({
    delay: 30, loop: true,
    callback: () => {
      const v = cam.worldView;
      for (let n = 0; n < 3; n++) spawn(v);
    },
  });

  function spawn(v) {
      for (let tries = 0; tries < 12; tries++) {
        const x = rand(v.x, v.right);
        const y = rand(v.y, v.bottom);
        if (!wet(x, y) || inSluice(x, y)) continue;
        const a = downstream(x, y);
        const len = rand(60, 110);
        let go = len;
        // only as far as the water goes, and not into the sluice (the ripple's
        // front end, half its length ahead, included)
        const clear = (d) => {
          for (let e = 0; e <= d + 30; e += 8) {
            const px = x + Math.cos(a) * e;
            const py = y + Math.sin(a) * e;
            if (!wet(px, py) || inSluice(px, py)) return false;
          }
          return true;
        };
        while (go > 10 && !clear(go)) go -= 10;
        if (!clear(go)) continue;
        const r = scene.add.rectangle(x, y, rand(30, 56), 5, 0xeaf6ff).setRotation(a).setDepth(1).setAlpha(0);
        scene.tweens.add({ targets: r, x: x + Math.cos(a) * go, y: y + Math.sin(a) * go, duration: go / 45 * 1000, ease: 'Linear', onComplete: () => r.destroy() });
        scene.tweens.add({ targets: r, alpha: 0.75, duration: go / 90 * 1000, yoyo: true, ease: 'Sine.easeInOut' });
        return;
      }
  }
}

// The sluice's own water: quick streaks down the chute, and a splash where it
// runs out at the bottom.
export function flowSluice(scene) {
  const { top, bottom, half } = CHUTE;
  const dx = bottom[0] - top[0];
  const dy = bottom[1] - top[1];
  const len = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);
  const nx = -dy / len;
  const ny = dx / len;
  scene.time.addEvent({
    delay: 60, loop: true,
    callback: () => {
      const off = rand(-half, half);
      const start = rand(0, 0.3);
      const x0 = top[0] + dx * start + nx * off;
      const y0 = top[1] + dy * start + ny * off;
      const r = scene.add.rectangle(x0, y0, rand(18, 30), 4, 0xf2faff).setRotation(a).setDepth(2).setAlpha(0.8);
      scene.tweens.add({
        targets: r, x: bottom[0] + nx * off, y: bottom[1] + ny * off, alpha: 0.4, duration: (1 - start) * 650, ease: 'Quad.easeIn',
        onComplete: () => r.destroy(),
      });
    },
  });
  // the splash at the bottom
  scene.time.addEvent({
    delay: 140, loop: true,
    callback: () => {
      const x = bottom[0] + rand(-24, 24);
      const y = bottom[1] + rand(4, 20);
      const d = scene.add.circle(x, y, rand(4, 8), 0xffffff, 0.85).setDepth(2);
      scene.tweens.add({ targets: d, y: y - rand(10, 24), scale: 1.8, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    },
  });
}

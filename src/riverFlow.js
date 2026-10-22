import Phaser from 'phaser';

// The river flowing (RiverScene): little ripples drifting downstream over the
// water, only where the picture has water, each going the way the river runs
// there (along COURSE, upstream at the top left to downstream at the bottom
// right, by eye, in picture px).

const COURSE = [[0, 640], [140, 715], [225, 800], [390, 905], [600, 1000], [740, 1100], [760, 1200],
  [680, 1300], [470, 1400], [470, 1500], [630, 1600], [790, 1700], [1040, 1800], [1110, 1900],
  [1080, 2000], [1020, 2100], [900, 2230], [920, 2330], [980, 2410], [1200, 2500], [1408, 2560]];
const CELL = 4; // picture px per cell of the water map
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
        if (!wet(x, y)) continue;
        const a = downstream(x, y);
        const len = rand(60, 110);
        // only as far as the water goes
        let go = len;
        while (go > 10 && !wet(x + Math.cos(a) * go, y + Math.sin(a) * go)) go -= 10;
        const r = scene.add.rectangle(x, y, rand(30, 56), 5, 0xeaf6ff).setRotation(a).setDepth(1).setAlpha(0);
        scene.tweens.add({ targets: r, x: x + Math.cos(a) * go, y: y + Math.sin(a) * go, duration: go / 45 * 1000, ease: 'Linear', onComplete: () => r.destroy() });
        scene.tweens.add({ targets: r, alpha: 0.75, duration: go / 90 * 1000, yoyo: true, ease: 'Sine.easeInOut' });
        return;
      }
  }
}

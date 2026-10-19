import { SPRITES, OVERHEAD } from './seasideSprites.js';
import { asset } from './asset.js';

// Life at the beach (BeachScene), besides its people (src/villagers.js): the
// boats cut out of its picture (scripts/cut-seaside.py) put back where they
// were, rocking gently at anchor; now and then a fish jumps by the jetty, and
// coffee steams at the cafe. And the umbrellas' canopies drawn over the
// picture at their places, in front of whoever's behind or under them. All
// in picture px; boats and canopies shrunk with the picture (MapScene.fit),
// so they match it.

const SHEET = 'seaside-sprites';
const OVER = 'seaside-overhead';
const loop = { yoyo: true, repeat: -1, ease: 'Sine.easeInOut' };
const rand = (a, b) => a + Math.random() * (b - a);

export function preloadSeaside(scene) {
  scene.load.image(SHEET, asset('seaside-sprites.png'));
  scene.load.image(OVER, asset('seaside-overhead.png'));
}

// A frame (x, y, w, h in picture px) of a fitted texture, as an image whose
// top left is at (x, y) in the picture, its origin at (ox, oy) of it.
export function piece(scene, fitted, name, [x, y, w, h], at, ox, oy) {
  const { key, tex, sx, sy } = fitted;
  const fx = Math.floor(x / sx);
  const fy = Math.floor(y / sy);
  const fw = Math.ceil((x + w) / sx) - fx;
  const fh = Math.ceil((y + h) / sy) - fy;
  if (!tex.has(name)) tex.add(name, 0, fx, fy, fw, fh);
  const px = at ? at[0] : fx * sx;
  const py = at ? at[1] : fy * sy;
  return scene.add.image(px + fw * sx * ox, py + fh * sy * oy, key, name).setScale(sx, sy).setOrigin(ox, oy);
}

// A little texture drawn once: (w, h) px, painted by `paint(g)`.
export function texture(scene, key, w, h, paint) {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    paint(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return key;
}

// A ring spreading on the water at (x, y).
function ripple(scene, x, y, size = 1) {
  const r = scene.add.ellipse(x, y, 10 * size, 4 * size).setStrokeStyle(3, 0xffffff, 0.8).setDepth(y);
  scene.tweens.add({ targets: r, scaleX: 3, scaleY: 3, alpha: 0, duration: 1100, onComplete: () => r.destroy() });
}

// Every so often (between `min` and `max` ms), `act()`.
export function nowAndThen(scene, min, max, act) {
  const next = () => scene.time.delayedCall(rand(min, max), () => { act(); next(); });
  next();
}

export function animateSeaside(scene) {
  // the umbrellas' canopies, in front of whoever's behind their poles
  const over = scene.fit(OVER);
  Object.entries(OVERHEAD).forEach(([name, { box, base }]) => piece(scene, over, name, box, null, 0, 0).setDepth(base));

  // boats at anchor, rocking gently on the swell (slowly, staying put)
  const boats = scene.fit(SHEET);
  Object.entries(SPRITES).forEach(([name, { frame, at }], i) => {
    const sail = name.startsWith('sail');
    const b = piece(scene, boats, name, frame, at, 0.5, sail ? 0.85 : 0.7);
    b.setDepth(at[1] + frame[3]);
    scene.tweens.add({ targets: b, y: b.y - 1.5, duration: 3400 + i * 450, delay: i * 600, ...loop });
    scene.tweens.add({ targets: b, angle: { from: sail ? -0.8 : -0.5, to: sail ? 0.8 : 0.5 }, duration: 4600 + i * 520, delay: i * 350, ...loop });
  });

  // now and then a fish jumps out of the sea by the jetty
  const fishKey = texture(scene, 'fish', 26, 12, (g) => {
    g.fillStyle(0x2e1d0c).fillEllipse(11, 6, 22, 12).fillTriangle(18, 6, 26, 0, 26, 12);
    g.fillStyle(0xf0a050).fillEllipse(11, 6, 18, 8).fillTriangle(19, 6, 24, 2, 24, 10);
    g.fillStyle(0xfff0d0).fillEllipse(10, 8, 12, 3);
    g.fillStyle(0x2e1d0c).fillRect(5, 4, 2, 2);
  });
  nowAndThen(scene, 5000, 10000, () => {
    const x = rand(90, 230);
    const y = rand(2470, 2560);
    const fish = scene.add.image(x, y, fishKey).setDepth(y).setAngle(-50).setScale(1.8);
    ripple(scene, x, y + 6, 1.4);
    scene.tweens.add({ targets: fish, x: x - 60, angle: 50, duration: 800, ease: 'Linear', onComplete: () => { ripple(scene, fish.x, y + 6, 1.4); fish.destroy(); } });
    scene.tweens.add({ targets: fish, y: y - 56, duration: 400, yoyo: true, ease: 'Quad.easeOut' });
  });

  // coffee steaming at the cafe
  [[804, 1630], [1222, 1688]].forEach(([x, y]) => {
    scene.time.addEvent({
      delay: 420, loop: true,
      callback: () => {
        const wisp = scene.add.rectangle(x + rand(-5, 5), y, 9, 9, 0xffffff, 0.75).setDepth(y + 1);
        scene.tweens.add({ targets: wisp, y: y - rand(36, 52), x: wisp.x + rand(-10, 10), scale: 1.6, alpha: 0, duration: 1700, onComplete: () => wisp.destroy() });
      },
    });
  });
}

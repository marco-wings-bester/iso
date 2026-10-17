import { SPRITES } from './seasideSprites.js';

// Life at the beach (BeachScene), besides its people (src/villagers.js): the
// boats cut out of its picture (scripts/cut-seaside.py) put back where they
// were, sailboats drifting and rocking, rowing boats bobbing; now and then a
// fish jumps by the jetty, and coffee steams at the cafe. All in picture px.

const SHEET = 'seaside-sprites';
const loop = { yoyo: true, repeat: -1, ease: 'Sine.easeInOut' };
const rand = (a, b) => a + Math.random() * (b - a);

export function preloadSeaside(scene) {
  scene.load.image(SHEET, 'assets/seaside-sprites.png');
}

// A cut-out back in its place, its origin at (ox, oy) of it; in front of
// whatever's behind its foot.
function put(scene, name, ox = 0.5, oy = 1) {
  const tex = scene.textures.get(SHEET);
  const { frame: [fx, fy, w, h], at: [x, y] } = SPRITES[name];
  if (!tex.has(name)) tex.add(name, 0, fx, fy, w, h);
  return scene.add.image(x + w * ox, y + h * oy, SHEET, name).setOrigin(ox, oy).setDepth(y + h);
}

// A little texture drawn once: (w, h) px, painted by `paint(g)`.
function texture(scene, key, w, h, paint) {
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
function nowAndThen(scene, min, max, act) {
  const next = () => scene.time.delayedCall(rand(min, max), () => { act(); next(); });
  next();
}

export function animateSeaside(scene) {
  // sailboats drifting, rocking and bobbing on the swell
  [['sail1', 0, 52, 8000], ['sail2', -34, 34, 9500]].forEach(([name, from, to, ms], i) => {
    const b = put(scene, name, 0.5, 0.85);
    const x = b.x;
    scene.tweens.add({ targets: b, x: { from: x + from, to: x + to }, duration: ms, ...loop });
    scene.tweens.add({ targets: b, angle: { from: -2.5, to: 2.5 }, duration: 2300 + i * 500, ...loop });
    scene.tweens.add({ targets: b, y: b.y - 5, duration: 1700 + i * 300, ...loop });
  });
  // rowing boats bobbing at their moorings
  ['row1', 'row2', 'row3'].forEach((name, i) => {
    const b = put(scene, name, 0.5, 0.7);
    scene.tweens.add({ targets: b, y: b.y - 4, duration: 1500 + i * 230, delay: i * 400, ...loop });
    scene.tweens.add({ targets: b, angle: { from: -1.6, to: 1.6 }, duration: 2100 + i * 310, delay: i * 250, ...loop });
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

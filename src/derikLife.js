import Phaser from 'phaser';
import { ANIMALS, COLD_FIRE } from './derikSprites.js';
import { piece, nowAndThen } from './seaside.js';
import { asset } from './asset.js';
import { hasFlag } from './state.js';
import { today, THURSDAY } from './days.js';
import { isEvening } from './evening.js';

// Life at Derik's place (DerikScene): his cows and sheep, cut out of the
// picture (scripts/cut-derik.py) and put back where they were, grazing,
// now and then shuffling a step or turning round; the fire in his boma
// burning on Thursday, the day of his braai, sparks flying up from it (any
// other day it's out: cold ash in the pit); and smoke from the farmhouse
// chimney.
// Once Johan's brought the chickens for the braai ('meatBrought',
// src/derik.js), they're on a grill over the fire, sizzling (`scene.grill`),
// and salted when he brings the salt (`scene.saltChicken`); then they're
// served (`scene.serve`) and night falls over the place (`scene.nightfall`),
// the fire glowing in the dark (as it is for the rest of the evening:
// src/evening.js).
// All in picture px.

const SHEET = 'derik-sprites';
const FIRE = { x: 1012, y: 1334 };    // the foot of the flames
const CHIMNEY = { x: 1137, y: 528 };  // the top of the chimney
const rand = (a, b) => a + Math.random() * (b - a);

export function preloadDerik(scene) {
  scene.load.image(SHEET, asset('derik-sprites.png'));
}

export function animateDerik(scene) {
  const sheet = scene.fit(SHEET);
  Object.entries(ANIMALS).forEach(([name, { frame, at }]) => animal(scene, sheet, name, frame, at));
  if (today() === THURSDAY) fire(scene);
  else piece(scene, sheet, 'coldFire', COLD_FIRE.frame, COLD_FIRE.at, 0, 0).setDepth(-0.5);
  chimney(scene);
  scene.grilled = false;
  scene.grill = () => grill(scene);
  scene.saltChicken = () => salt(scene);
  scene.chickens = [];
  scene.serve = () => { scene.chickens.forEach(c => c.destroy()); scene.chickens = []; };
  scene.nightfall = ms => nightfall(scene, ms);
  if (today() !== THURSDAY) return;
  if (hasFlag('meatBrought')) grill(scene);
  if (isEvening()) {
    scene.serve();
    nightfall(scene, 0);
  }
}

// Night over the whole place, and the fire's glow brighter in it, over `ms`.
function nightfall(scene, ms) {
  const { w, h } = scene.map;
  const { x, y } = FIRE;
  const dark = scene.add.rectangle(0, 0, w, h, 0x0b0a24).setOrigin(0).setDepth(5e4).setAlpha(0);
  const glow = scene.add.ellipse(x, y - 20, 420, 260, 0xff9a40).setDepth(5e4 + 1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.ellipse(x, y - 14, 120, 70, 0xffd070).setDepth(5e4 + 1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  return new Promise((done) => {
    scene.tweens.add({ targets: dark, alpha: 0.62, duration: ms });
    scene.tweens.add({ targets: [glow], alpha: 0.22, duration: ms });
    scene.tweens.add({ targets: [core], alpha: 0.45, duration: ms, onComplete: () => {
      scene.tweens.add({ targets: [glow, core], scaleX: 0.93, scaleY: 0.93, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      done();
    } });
  });
}

// The grill across the fire, two chickens on it browning, a wisp of steam
// off them now and then.
function grill(scene) {
  if (scene.grilled) return;
  scene.grilled = true;
  const { x, y } = FIRE;
  const g = scene.add.graphics().setDepth(y + 4);
  const L = x - 64;
  const T = y - 38;
  const W = 128;
  const H = 34;
  g.fillStyle(0x2e1d0c).fillRect(L - 2, T - 2, W + 4, H + 4); // its outline…
  g.fillStyle(0x4a4644).fillRect(L, T, W, H);                  // …the frame
  g.fillStyle(0x2e1d0c).fillRect(L + 4, T + 4, W - 8, H - 8);  // and the gaps between its bars,
  for (let bx = L + 8; bx < L + W - 6; bx += 9) {               // the bars across them
    g.fillStyle(0x5a5654).fillRect(bx, T + 4, 4, H - 8);
    g.fillStyle(0x8a8480).fillRect(bx, T + 4, 1, H - 8);
  }
  g.fillStyle(0x4a4644).fillRect(L - 10, T + H / 2 - 2, 10, 4).fillRect(L + W, T + H / 2 - 2, 10, 4); // handles
  [x - 30, x + 30].forEach((cx, i) => {
    const cy = y - 20 + i * 2;
    const c = scene.add.graphics().setDepth(y + 5);
    scene.chickens.push(c);
    c.fillStyle(0x2e1d0c).fillEllipse(cx, cy, 44, 28).fillEllipse(cx - 20, cy + 6, 16, 12).fillEllipse(cx + 20, cy + 6, 16, 12);
    c.fillStyle(0xa8582a).fillEllipse(cx, cy, 40, 24).fillEllipse(cx - 20, cy + 6, 12, 8).fillEllipse(cx + 20, cy + 6, 12, 8);
    c.fillStyle(0xd88a40).fillEllipse(cx - 3, cy - 3, 28, 13);
    c.fillStyle(0xf4c070).fillEllipse(cx - 8, cy - 6, 10, 4);
    c.fillStyle(0xf8ecd8).fillRect(cx - 27, cy + 4, 4, 4).fillRect(cx + 23, cy + 4, 4, 4); // the drumsticks' bones
  });
  scene.time.addEvent({
    delay: 500, loop: true,
    callback: () => {
      const wisp = scene.add.ellipse(x + rand(-50, 50), y - 30, 10, 8, 0xf4f0ea, 0.5).setDepth(y + 6);
      scene.tweens.add({ targets: wisp, y: wisp.y - rand(50, 80), scale: 2, alpha: 0, duration: 1500, onComplete: () => wisp.destroy() });
    },
  });
}

// Salt sprinkled over the chickens.
function salt(scene) {
  const { x, y } = FIRE;
  return new Promise((done) => {
    for (let i = 0; i < 40; i++) {
      const sx = x + rand(-50, 50);
      const grain = scene.add.rectangle(sx, y - 90 - rand(0, 30), 3, 3, 0xffffff).setDepth(y + 7);
      scene.tweens.add({
        targets: grain, y: y - 22 + rand(-6, 6), alpha: 0.3, delay: i * 25, duration: 500, ease: 'Quad.easeIn',
        onComplete: () => { grain.destroy(); if (i === 39) done(); },
      });
    }
  });
}

// One cow or sheep, standing at its feet; grazing (its head going down and
// up), and now and then a step to one side or a turn the other way, never
// far from where it was.
function animal(scene, sheet, name, frame, at) {
  const [, , w, h] = frame;
  const feet = { x: at[0] + w / 2, y: at[1] + h };
  const shadow = scene.add.ellipse(feet.x, feet.y - 3, w * 0.8, h * 0.22, 0x1e3a10, 0.3).setDepth(feet.y - 1);
  const a = piece(scene, sheet, name, frame, [feet.x - w / 2, feet.y - h], 0.5, 1).setDepth(feet.y);
  a.setPosition(feet.x, feet.y);
  scene.tweens.add({ targets: a, scaleY: a.scaleY * 0.96, duration: rand(900, 1400), delay: rand(0, 2000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  nowAndThen(scene, 4000, 9000, () => {
    if (Math.random() < 0.4) {
      a.setFlipX(!a.flipX);
      return;
    }
    const x = Phaser.Math.Clamp(a.x + rand(-10, 10), feet.x - 8, feet.x + 8);
    scene.tweens.add({ targets: [a, shadow], x, duration: 900, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: a, y: feet.y - 3, duration: 225, yoyo: true, repeat: 1 });
  });
}

// The fire: a warm glow round it, flames licking up (each its own height,
// flickering), and sparks drifting up.
function fire(scene) {
  const { x, y } = FIRE;
  const glow = scene.add.ellipse(x, y - 6, 150, 70, 0xffa040, 0.22).setDepth(y + 1).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, alpha: 0.12, scaleX: 0.92, scaleY: 0.92, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const flames = [
    [-18, 26, 0xe04a1c], [16, 28, 0xe04a1c], [-8, 40, 0xf08a2a], [9, 38, 0xf08a2a], [0, 48, 0xf8c040], [-4, 26, 0xfff0a0], [5, 22, 0xfff0a0],
  ];
  flames.forEach(([dx, tall, colour], i) => {
    const wide = tall * 0.42;
    const f = scene.add.triangle(x + dx, y + 4, 0, tall, wide / 2, 0, wide, tall, colour, 0.8).setOrigin(0.5, 1).setDepth(y + 2 + i * 0.01);
    const flick = () => scene.tweens.add({
      targets: f, scaleY: rand(0.6, 1.25), scaleX: rand(0.8, 1.15), x: x + dx + rand(-3, 3), duration: rand(110, 220), ease: 'Sine.easeInOut',
      onComplete: flick,
    });
    flick();
  });
  scene.time.addEvent({
    delay: 160, loop: true,
    callback: () => {
      const s = scene.add.rectangle(x + rand(-16, 16), y - rand(10, 30), 4, 4, Math.random() < 0.5 ? 0xffd060 : 0xff8030).setDepth(y + 3);
      scene.tweens.add({ targets: s, y: s.y - rand(60, 120), x: s.x + rand(-24, 24), alpha: 0, duration: rand(900, 1500), onComplete: () => s.destroy() });
    },
  });
  scene.time.addEvent({
    delay: 380, loop: true,
    callback: () => {
      const puff = scene.add.ellipse(x + rand(-8, 8), y - 44, 14, 12, 0xd8d0c8, 0.35).setDepth(y + 3);
      scene.tweens.add({ targets: puff, y: puff.y - rand(70, 110), x: puff.x + rand(-14, 20), scale: 2.4, alpha: 0, duration: 2200, onComplete: () => puff.destroy() });
    },
  });
}

// Smoke from the farmhouse chimney, drifting off in the breeze.
function chimney(scene) {
  const { x, y } = CHIMNEY;
  scene.time.addEvent({
    delay: 520, loop: true,
    callback: () => {
      const puff = scene.add.ellipse(x + rand(-4, 4), y, 18, 14, 0xeeeeee, 0.55).setDepth(y + 1);
      scene.tweens.add({ targets: puff, y: y - rand(110, 150), x: x + rand(20, 50), scale: 2.6, alpha: 0, duration: 3200, onComplete: () => puff.destroy() });
    },
  });
}

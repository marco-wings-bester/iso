import Phaser from 'phaser';
import { ANIMALS } from './derikSprites.js';
import { piece, nowAndThen } from './seaside.js';
import { asset } from './asset.js';

// Life at Derik's place (DerikScene): his cows and sheep, cut out of the
// picture (scripts/cut-derik.py) and put back where they were, grazing,
// now and then shuffling a step or turning round; the fire in his boma
// burning, sparks flying up from it; and smoke from the farmhouse chimney.
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
  fire(scene);
  chimney(scene);
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

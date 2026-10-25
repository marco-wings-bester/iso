import Phaser from 'phaser';
import { grid, outline, blit } from './pixelArt.js';
import { ART_PX } from './constants.js';
import { think } from './bubble.js';
import { getValue, setValue } from './state.js';
import { today } from './days.js';

// Evenings out (src/evening.js): street lamps glowing warm in the dark, a
// pool of light on the ground under each, flickering a little (the town's
// own lamps, in its picture; the one at the beach, src/BeachScene.js); and,
// where there are none (the crossroads), Johan's torch, its beam ahead of
// him the way he's facing.

const ABOVE_NIGHT = 5e4 + 1; // (over the dark: src/evening.js)

// A lamp's light: `head` (its lantern) and `foot` (where its post meets the
// ground), picture px; `k`, how big (1: the town's).
export function lampLight(scene, head, foot, k = 1) {
  const add = (x, y, rx, ry, colour, alpha) => scene.add.ellipse(x, y, rx * 2, ry * 2, colour, alpha)
    .setDepth(ABOVE_NIGHT).setBlendMode(Phaser.BlendModes.ADD);
  const pool = add(foot.x, foot.y, 70 * k, 26 * k, 0xffb860, 0.22);
  const halo = add(head.x, head.y, 34 * k, 34 * k, 0xffc860, 0.3);
  const core = add(head.x, head.y, 9 * k, 9 * k, 0xfff0c0, 0.85);
  scene.tweens.add({ targets: [pool, halo], alpha: '*=0.8', duration: 140 + Math.random() * 160, yoyo: true, repeat: -1, repeatDelay: 1500 + Math.random() * 3000 });
  return [pool, halo, core];
}

// A street lamp to stand in a picture that has none (the beach): a black
// post and its lantern, at its foot (x, y), at the place's scale `k` (like
// the people in it); lit in the evening.
export function lampPost(scene, x, y, k, lit) {
  const key = 'lamp-post';
  if (!scene.textures.exists(key)) {
    const rows = [
      '..ddd..',
      '.dHHHd.',
      'dGGGGGd',
      'dGgGgGd',
      'dGGGGGd',
      '.ddddd.',
      '...d...',
      ...Array(26).fill('...d...'),
      '..ddd..',
      '.ddddd.',
    ];
    const C = { d: '#2a2a30', H: '#4a4a54', G: '#f8e8b0', g: '#e8c870' };
    const g = grid(9, rows.length + 2);
    rows.forEach((row, r) => [...row].forEach((c, i) => { if (c !== '.') g[r + 1][i + 1] = C[c]; }));
    const tex = scene.textures.createCanvas(key, 9 * ART_PX, (rows.length + 2) * ART_PX);
    blit(tex.getContext(), outline(g), 0, 0, ART_PX);
    tex.refresh();
  }
  const img = scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(k).setDepth(y);
  if (lit) lampLight(scene, { x, y: y - img.displayHeight + 4 * ART_PX * k }, { x, y }, k / 1.5);
  return img;
}

// His torch: a beam of light ahead of him, the way he's facing, swinging
// round as he turns; the first time out in the dark each evening, he says so.
export function torch(scene) {
  const { player } = scene;
  const k = player.sprite.scaleX;
  // (darker still out here, away from the lamps)
  const { w, h } = scene.map;
  scene.add.rectangle(0, 0, w, h, 0x05040f, 0.3).setOrigin(0).setDepth(ABOVE_NIGHT - 0.5);
  const beam = scene.add.graphics().setDepth(ABOVE_NIGHT).setBlendMode(Phaser.BlendModes.ADD);
  const ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  let angle = ANGLE[player.dir] ?? 0;
  const draw = () => {
    const s = player.sprite;
    const want = ANGLE[player.dir] ?? angle;
    angle += Phaser.Math.Angle.Wrap(want - angle) * 0.2; // (swinging round)
    const hx = s.x + Math.cos(angle) * 6 * k;
    const hy = s.y - 14 * k + Math.sin(angle) * 4 * k;
    const len = 150 * k;
    beam.clear();
    [[1, 0.1], [0.75, 0.12], [0.5, 0.14]].forEach(([f, a]) => {
      const spread = 0.42 * f;
      beam.fillStyle(0xfff0c0, a).fillTriangle(
        hx, hy,
        hx + Math.cos(angle - spread) * len, hy + Math.sin(angle - spread) * len + 18 * k,
        hx + Math.cos(angle + spread) * len, hy + Math.sin(angle + spread) * len + 18 * k,
      );
    });
    beam.fillStyle(0xfff0c0, 0.16).fillEllipse(hx + Math.cos(angle) * len, hy + Math.sin(angle) * len + 18 * k, 70 * k, 40 * k);
    beam.fillStyle(0xffffe0, 0.9).fillCircle(hx, hy, 2.2 * k);
  };
  scene.events.on('update', draw);
  scene.events.once('shutdown', () => scene.events.off('update', draw));
  if (getValue('torchDay') !== today()) {
    setValue('torchDay', today());
    scene.time.delayedCall(800, () => {
      if (!scene.thought && !scene.busy) think(scene, player.sprite, { af: 'Dis pikdonker hier by die kruispad. Gelukkig het ek my flits!', en: "It's pitch dark here at the crossroads. Good thing I've got my torch!" });
    });
  }
  return beam;
}

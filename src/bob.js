import { FRAME_H, FEET_Y } from './constants.js';
import { createBob } from './CharacterSprite.js';
import { grid, rect, outline, blit } from './pixelArt.js';
import { ART_PX } from './constants.js';

// Bob, waiting at the farm gate once Farmer Jones has read and slept. He waves
// now and then; a "!" bobs over his head until they've talked.
export const BOB_SPOT = { x: 410, y: 1222 };
export const BOB_AREA = { x: BOB_SPOT.x - 16, y: BOB_SPOT.y - 58, w: 32, h: 64 }; // tap to talk
export const BOB_STAND = { x: BOB_SPOT.x - 24, y: BOB_SPOT.y };                  // where Jones stands

function makeMark(scene) {
  if (scene.textures.exists('bob-mark')) return;
  const p = ART_PX;
  const g = grid(9, 11);
  const r = (x, y, w, h, c) => rect(g, x + 1, y + 1, w, h, c);
  r(1, 0, 5, 7, '#fffcf2');
  r(0, 1, 7, 5, '#fffcf2');
  r(3, 7, 2, 1, '#fffcf2');
  r(3, 8, 1, 1, '#fffcf2');
  r(3, 1, 1, 3, '#d04c3a');
  r(3, 5, 1, 1, '#d04c3a');
  const tex = scene.textures.createCanvas('bob-mark', 9 * p, 11 * p);
  blit(tex.getContext(), outline(g), 0, 0, p);
  tex.refresh();
}

export function spawnBob(scene, { showMark }) {
  createBob(scene);
  makeMark(scene);
  const { x, y } = BOB_SPOT;
  const bob = scene.add.sprite(x, y, 'bob', 0).setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('bob-idle-down');

  // wave every few seconds, then back to standing
  const wave = () => {
    if (!bob.active) return;
    bob.play('bob-wave');
    bob.once('animationcomplete', () => bob.play(bob.facing === 'left' ? 'bob-idle-left' : 'bob-idle-down'));
    scene.time.delayedCall(3500 + Math.random() * 3000, wave);
  };
  scene.time.delayedCall(1200, wave);

  let mark = null;
  if (showMark) {
    mark = scene.add.image(x, y - FRAME_H * ART_PX - 4, 'bob-mark').setOrigin(0.5, 1).setDepth(5000);
    scene.tweens.add({ targets: mark, y: mark.y - 5, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  return {
    sprite: bob,
    faceJones() {
      bob.facing = 'left';
      bob.play('bob-idle-left');
    },
    faceFarm() {
      bob.facing = 'down';
      bob.play('bob-idle-down');
    },
    hideMark() {
      mark?.destroy();
      mark = null;
    },
  };
}

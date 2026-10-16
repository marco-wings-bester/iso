import { FRAME_H, FEET_Y } from './constants.js';
import { createBob } from './CharacterSprite.js';
import { grid, rect, outline, blit } from './pixelArt.js';
import { pieTexture } from './interiors.js';
import { eatAtTable } from './eating.js';
import { hasFlag, setFlag } from './state.js';
import { ART_PX } from './constants.js';

// Bob, waiting at the farm gate once Farmer Jones has read the recipe book,
// baked the pie and slept. He waves
// now and then; a "!" bobs over his head until they've talked. Once he's
// offered the pie he walks off to the farmhouse (walkInto) and eats what's
// left of it at the table (seatBob).
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
  let walking = false;
  const wave = () => {
    if (!bob.active || walking) return;
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
    // Walk along `route` (farm px) at `speed` px/s and go in at the end.
    walkInto(route, speed) {
      walking = true;
      this.hideMark();
      bob.off('animationcomplete');
      const step = () => {
        const p = route.shift();
        if (!p) {
          scene.tweens.add({ targets: bob, alpha: 0, duration: 250, onComplete: () => bob.destroy() });
          return;
        }
        const dx = p.x - bob.x;
        const dy = p.y - bob.y;
        const dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        bob.play(`bob-walk-${dir}`, true);
        scene.tweens.add({
          targets: bob, x: p.x, y: p.y, duration: (Math.hypot(dx, dy) / speed) * 1000,
          onUpdate: () => bob.setDepth(bob.y), onComplete: step,
        });
      };
      step();
    },
  };
}

// In the farmhouse: Bob on the chair behind the table, eating the half of the
// pie Farmer Jones left (src/eating.js). The first time he's seen there he
// sits down; once it's gone he sits back patting his belly. Returns him (to
// dim at night).
export function seatBob(scene) {
  createBob(scene);
  const at = scene.room.kitchen.table.pie;
  const pie = scene.add.image(at.x, at.y, pieTexture(scene, 4)).setOrigin(0).setDepth(0.45);
  return eatAtTable(scene, 'bob-px', pie, {
    from: hasFlag('pieEaten') ? 0 : 4,
    to: 0,
    sitDown: !hasFlag('bobSat'),
    onSeated: () => setFlag('bobSat'),
    onFull: () => setFlag('pieEaten'),
  });
}

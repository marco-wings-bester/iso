import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { FRAME_H, FEET_Y } from './constants.js';

// Boer Johan's bicycle. It lives in the barn, on its stand (ROOMS.barn.bike);
// once he's had the cafe's coffee (before that he's too busy), tapping it
// there takes it out, and from then on he rides it everywhere he
// would walk (the farm, the crossroads, the beach), only faster: each scene
// picks his riding sprite and speed while `riding`. Not indoors, though: the
// barn is the only place it goes in (riding in there, he leaves it on its
// stand); going into any other building, he leaves it outside the door
// (`parked`: the scene and where), and tapping it there gets him back on. A
// good long ride (`TIRING` seconds of pedalling) tires him out
// ('tired', and 'exercised'), so he can sleep (even after the cafe's
// coffee). Kept for this visit only: a reload puts it back in the barn.

export const SPEED = 1.7;  // times his walking speed
export const TIRING = 15; // seconds of pedalling
export const BODY = 10;   // half his width on it, side on (room px; walking, it's 5)

export const bike = { riding: false, pedalled: 0, parked: null };

export function resetBike() {
  Object.assign(bike, { riding: false, pedalled: 0, parked: null });
}

// Off it at the door into a building: left at `at` in `scene` (if he was on it).
export function park(scene, at) {
  if (!bike.riding) return;
  bike.riding = false;
  bike.parked = { scene: scene.scene.key, ...at };
}

// The bike where he left it, if that's in `scene` (`scale`: the scene's
// sprite scale), as `scene.parkedBike`.
export function showParked(scene, scale = 1) {
  const at = bike.parked;
  scene.parkedBike = at?.scene === scene.scene.key
    ? scene.add.image(at.x, at.y, 'bike').setOrigin(0.5, FEET_Y / FRAME_H).setScale(scale).setDepth(at.y)
    : null;
}

// A tap at (x, y): if it's on the parked bike, he walks over and gets on
// (his riding sprite and speed from then on). Returns whether it was.
export function tapParked(scene, x, y) {
  const img = scene.parkedBike;
  if (!img?.getBounds().contains(x, y)) return false;
  scene.player.walkTo(img.x, img.y, () => {
    const { player } = scene;
    bike.riding = true;
    bike.parked = null;
    img.destroy();
    scene.parkedBike = null;
    player.texture = 'player-bike';
    player.speed *= SPEED;
    player.face('left');
  });
  return true;
}

// A frame of `dt` seconds in `scene`, in which he `moved`: if that was on the
// bike (and he isn't tired already), it counts towards tiring him out.
// (Sleeping, or the cafe's coffee, starts the count again.)
export function pedal(scene, moved, dt) {
  if (!bike.riding || !moved || hasFlag('tired')) return;
  bike.pedalled += dt;
  if (bike.pedalled < TIRING) return;
  setFlag('tired');
  setFlag('exercised');
  think(scene, scene.player.sprite, line('tired'));
}

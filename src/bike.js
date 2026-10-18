import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// Boer Johan's bicycle. It lives in the barn, on its stand (ROOMS.barn.bike);
// once he's had the cafe's coffee (before that he's too busy), tapping it
// there takes it out, and from then on he rides it everywhere he
// would walk (the farm, the crossroads, the beach, and indoors too), only
// faster: each scene picks his riding sprite and speed while `riding`. The
// barn is the only place it's put away: riding in there, he leaves it on its
// stand. A good long ride (`TIRING` seconds of pedalling) tires him out
// ('tired', and 'exercised'), so he can sleep (even after the cafe's
// coffee). Kept for this visit only: a reload puts it back in the barn.

export const SPEED = 1.7;  // times his walking speed
export const TIRING = 15; // seconds of pedalling
export const BODY = 10;   // half his width on it, side on (room px; walking, it's 5)

export const bike = { riding: false, pedalled: 0 };

export function resetBike() {
  Object.assign(bike, { riding: false, pedalled: 0 });
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

import { hasFlag } from './state.js';
import { today, THURSDAY } from './days.js';

// Thursday evening, after Derik's braai ('braaiDone', src/derik.js): it's
// dark out everywhere (the farm, the crossroads, the beach…; at Derik's the
// night falls as they eat: src/derikLife.js), and all that's left is bed.
// Sleeping, it's Friday.
export function isEvening() {
  return today() === THURSDAY && hasFlag('braaiDone');
}

// Dark over a w × h picture (in its own px), the same night as at Derik's.
export function dusk(scene, w, h) {
  return scene.add.rectangle(0, 0, w, h, 0x0b0a24, 0.62).setOrigin(0).setDepth(5e4);
}

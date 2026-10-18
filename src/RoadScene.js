import MapScene from './MapScene.js';
import { roadGrid } from './WalkGrid.js';
import { setFlag } from './state.js';
import { asset } from './asset.js';
import { today } from './days.js';
import { WEDNESDAY, choresLeft } from './chores.js';

// The crossroads past the farm gate (assets/crossroads.jpg), where
// Boer Johan comes on his way to town once Pieter has gone home. He comes in
// from the farm at the top, and the road back up goes there (so does a tap
// right at the top). Left goes to the beach (BeachScene). Down goes to town
// (TownScene), from Wednesday afternoon, once the farm work's done; till then
// he turns back at the edge and it says so. Right goes to Pieter's farm
// (PieterScene), and the path off the bottom left to the river
// (RiverScene). (No name boards: the roads speak for themselves.)

const HERE = { af: 'Die kruispad', en: 'The crossroads' };

// The road to town: not before Wednesday, and then not till the farm work's
// done (src/chores.js).
function townClosed() {
  if (today() < WEDNESDAY) return { af: 'Die dorp\nnie vandag nie', en: 'The town\nnot today' };
  if (choresLeft()) return { af: 'Die dorp\neers die werk op die plaas', en: 'The town\nfarm work first' };
  return null;
}

export default class RoadScene extends MapScene {
  constructor() {
    super({ key: 'Road' });
    this.map = {
      key: 'crossroads', file: asset('crossroads.jpg'), w: 704, h: 1504, grid: roadGrid,
      scale: 0.85, // as big as the farmer in the picture
      home: { x: 350, y: 830 }, // the crossing
    };
    this.exits = {
      farm: { side: 'top', near: 350, strip: true, to: 'Game', data: { from: 'road' } },
      beach: { side: 'left', near: 940, to: 'Beach' },
      river: { side: 'left', near: 1420, to: 'River' },
      town: { side: 'bottom', near: 345, to: 'Town', soon: townClosed },
      pieter: { side: 'right', near: 955, to: 'Pieter' },
    };
  }

  // `at`: where he is, when redrawn for a new screen size; `from`: the road
  // he comes in by (the farm, unless back from the beach, the town,
  // Pieter's or the river).
  create({ at, from = 'farm' } = {}) {
    this.place(at, from);
    if (at) return;
    if (from === 'farm') setFlag('level2');
    this.game.events.emit('location', { name: HERE });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}

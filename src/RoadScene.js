import MapScene from './MapScene.js';
import { roadGrid } from './WalkGrid.js';
import { setFlag } from './state.js';
import { asset } from './asset.js';

// The crossroads past the farm gate (assets/crossroads.jpg), where
// Boer Johan comes on his way to town once Pieter has gone home. He comes in
// from the farm at the top, and the road back up goes there (so does a tap
// right at the top). Left goes to the beach (BeachScene). Down to town and
// right to Pieter's house aren't there yet: at the edge he turns back and it
// says so. (No name boards: the roads speak for themselves.)

const HERE = { af: 'Die kruispad', en: 'The crossroads' };

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
      town: { side: 'bottom', near: 345, soon: { af: 'Die dorp\nkom binnekort', en: 'Town\ncoming soon' } },
      pieter: { side: 'right', near: 955, soon: { af: 'Pieter se huis\nkom binnekort', en: "Bob's house\ncoming soon" } },
    };
  }

  // `at`: where he is, when redrawn for a new screen size; `from`: the road
  // he comes in by (the farm, unless back from the beach).
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

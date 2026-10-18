import MapScene from './MapScene.js';
import { pieterGrid } from './WalkGrid.js';
import { asset } from './asset.js';

// Pieter's farm (assets/pieter.jpg), right from the crossroads: his
// farmhouse with its long stoep and a water tower behind, cattle and sheep
// about, and below it a braai with a fire going, logs to sit on round it.
// Boer Johan comes in by the road from the left, which goes up to the stoep's
// steps, a path off it down to the braai; that road's the way back to the
// crossroads.

const HERE = { af: 'Pieter se plaas', en: "Bob's farm" };

export default class PieterScene extends MapScene {
  constructor() {
    super({ key: 'Pieter' });
    this.map = {
      key: 'pieter', file: asset('pieter.jpg'), w: 1408, h: 2550, grid: pieterGrid,
      scale: 2.1, // as big as his stoep and fences want
      home: { x: 300, y: 1040 }, // on the road in
    };
    this.exits = {
      crossroads: { side: 'left', near: 1080, to: 'Road', data: { from: 'pieter' } },
    };
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}

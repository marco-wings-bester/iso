import MapScene from './MapScene.js';
import { riverGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { flowRiver, flowSluice } from './riverFlow.js';
import { placeSteffi, isSteffi, talkToSteffi } from './steffi.js';
import { placeWillow, isWillow, atWillow } from './willow.js';
import { hasFlag } from './state.js';

// The river (assets/river.jpg), down the path off the bottom left of the
// crossroads: a gold diggers' camp in the woods, a tent and crates, pans
// and a sluice in the stream, a rocker on the near sandbar and more pans
// on the far one, across the river (which he can't wade: it flows, ripples
// drifting downstream, src/riverFlow.js). Boer Johan comes in by the track
// at the top, which is the way back to the crossroads. Steffi is in the
// shallows off the near sandbar, panning for gold (src/steffi.js), till he
// has his tuxedo for their date: then she's home (src/beachDoors.js).

const HERE = { af: 'Die rivier', en: 'The river' };

export default class RiverScene extends MapScene {
  constructor() {
    super({ key: 'River' });
    this.map = {
      key: 'river', file: asset('river.jpg'), w: 1408, h: 2550, grid: riverGrid,
      scale: 2.1, // as big as the tent and the pans want
      home: { x: 640, y: 640 }, // in the camp
    };
    this.exits = {
      crossroads: { side: 'top', near: 1110, to: 'Road', data: { from: 'river' } },
    };
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    flowRiver(this); // (src/riverFlow.js)
    flowSluice(this);
    // panning for gold (src/steffi.js); once he has his tuxedo, she's gone home to get ready (src/steffiHouse.js)
    this.steffi = hasFlag('tuxedo') ? null : placeSteffi(this);
    this.willow = placeWillow(this); // (src/willow.js)
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping Steffi: over to her for a chat; the willow: over to it.
  tapThing(x, y) {
    if (this.steffi && isSteffi(this.steffi, x, y)) {
      talkToSteffi(this, this.steffi);
      return true;
    }
    if (isWillow(this.willow, x, y)) {
      atWillow(this);
      return true;
    }
    return false;
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}

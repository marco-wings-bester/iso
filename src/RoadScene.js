import MapScene from './MapScene.js';
import { roadGrid } from './WalkGrid.js';
import { hasFlag, setFlag } from './state.js';
import { asset } from './asset.js';
import { today, daysToBraai } from './days.js';
import { WEDNESDAY, choresLeft } from './chores.js';

// The crossroads past the farm gate (assets/crossroads.jpg), where
// Boer Johan comes on his way to the beach once Pieter has gone home
// (Tuesday). He comes in from the farm at the top, and the road back up goes
// there (so does a tap right at the top). Left goes to the beach
// (BeachScene). Down goes to town (TownScene), from Wednesday afternoon,
// once the farm work's done (but not on the day of Derik's braai); right to Pieter's farm (PieterScene) and the
// path off the bottom left to the river (RiverScene), from Wednesday. Till
// then he turns back at the edge, saying why in his own words. (No name
// boards: the roads speak for themselves.)

const HERE = { af: 'Die kruispad', en: 'The crossroads' };

// Tuesday is for the beach: anywhere else, not today (once he's had his
// coffee there, he's had enough for one day anyway).
const beachDay = (af, en) => (hasFlag('coffee')
  ? { af: `${af} Ek het genoeg rondgeloop vir een dag.`, en: `${en} I've been about enough for one day.` }
  : { af: `${af} Vandag gaan ek strand toe.`, en: `${en} Today I'm off to the beach.` });

// The road to town: not before Wednesday, and then not till the farm work's
// done (src/chores.js); and not on the day of Derik's braai (src/days.js).
function townClosed() {
  if (today() < WEDNESDAY) return beachDay('Nee wat, die dorp kan wag.', 'Nah, the town can wait.');
  if (choresLeft()) return { af: 'Eers die werk op die plaas, dan kan ek dorp toe gaan.', en: 'Farm work first, then I can go to town.' };
  if (daysToBraai() === 0) return { af: 'Nie vandag nie: vanaand is Derik se braai in die dorpie by die strand.', en: "Not today: tonight's Derek's braai in the village by the beach." };
  return null;
}

// Pieter's: he's had enough of a day as it is (the chest!).
function pieterClosed() {
  if (today() >= WEDNESDAY) return null;
  return { af: 'Pieter het vandag genoeg gehad… ek los hom eers.', en: "Bob's had quite enough for one day… I'll leave him be." };
}

// The river.
function riverClosed() {
  if (today() >= WEDNESDAY) return null;
  return beachDay('Die rivier? Nie vandag nie.', 'The river? Not today.');
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
      river: { side: 'left', near: 1420, to: 'River', closed: riverClosed },
      town: { side: 'bottom', near: 345, to: 'Town', closed: townClosed },
      pieter: { side: 'right', near: 955, to: 'Pieter', closed: pieterClosed },
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

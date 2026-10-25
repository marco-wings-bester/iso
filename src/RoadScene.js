import MapScene from './MapScene.js';
import { roadGrid } from './WalkGrid.js';
import { hasFlag, setFlag } from './state.js';
import { asset } from './asset.js';
import { today, THURSDAY } from './days.js';
import { WEDNESDAY, choresLeft } from './chores.js';
import { FRIDAY } from './weather.js';
import { isEvening } from './evening.js';
import { torch } from './nightLights.js';

// The crossroads past the farm gate (assets/crossroads.jpg), where
// Boer Johan comes on his way to the beach once Pieter has gone home
// (Tuesday). He comes in from the farm at the top, and the road back up goes
// there (so does a tap right at the top). Left goes to the beach
// (BeachScene). Down goes to town (TownScene), from Wednesday afternoon,
// once the farm work's done; right to Derik's place (DerikScene), from
// Thursday, the day of his braai; the path off the bottom left to the river
// (RiverScene), from Saturday. On Thursday it's only the farm, the beach
// and Derik's place, not the town or the river; on Friday, in the rain, not
// the river either. Till then he turns back at the
// edge, saying why in his own words. (No name boards: the roads speak for
// themselves.)

const HERE = { af: 'Die kruispad', en: 'The crossroads' };

// Tuesday is for the beach: anywhere else, not today (once he's had his
// coffee there, he's had enough for one day anyway).
const beachDay = (af, en) => (hasFlag('coffee')
  ? { af: `${af} Ek het genoeg rondgeloop vir een dag.`, en: `${en} I've been about enough for one day.` }
  : { af: `${af} Vandag gaan ek strand toe.`, en: `${en} Today I'm off to the beach.` });

// Thursday is Derik's braai, at his place: the town and the river, not today.
const braaiDay = (af, en) => ({ af: `${af} Vanaand is Derik se braai.`, en: `${en} Tonight's Derek's braai.` });

// The road to town: not before Wednesday, and then not till the farm work's
// done (src/chores.js); not on Thursday.
function townClosed() {
  if (today() < WEDNESDAY) return beachDay('Nee wat, die dorp kan wag.', 'Nah, the town can wait.');
  if (choresLeft()) return { af: 'Eers die werk op die plaas, dan kan ek dorp toe gaan.', en: 'Farm work first, then I can go to town.' };
  if (today() === THURSDAY) return braaiDay('Nie vandag nie.', 'Not today.');
  return null;
}

// Derik's place: not before Thursday, the day of his braai.
function derikClosed() {
  if (today() >= THURSDAY) return null;
  if (today() < WEDNESDAY) return beachDay('Nee wat, nie vandag nie.', 'Nah, not today.');
  return { af: 'Nie vandag nie: môreaand is Derik se braai, dan gaan ek soontoe.', en: "Not today: Derek's braai is tomorrow evening, I'll go then." };
}

// The river: not before Saturday (on Friday it rains).
function riverClosed() {
  if (today() === THURSDAY) return braaiDay('Die rivier? Nie vandag nie.', 'The river? Not today.');
  if (today() === FRIDAY) return { af: 'Die rivier? Nie in hierdie reën nie.', en: 'The river? Not in this rain.' };
  if (today() > THURSDAY) return null;
  if (today() === WEDNESDAY) return { af: 'Die rivier? Nie vandag nie: daar is werk op die plaas.', en: "The river? Not today: there's work on the farm." };
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
      derik: { side: 'right', near: 955, to: 'Derik', closed: derikClosed },
    };
  }

  // `at`: where he is, when redrawn for a new screen size; `from`: the road
  // he comes in by (the farm, unless back from the beach, the town,
  // Derik's or the river).
  create({ at, from = 'farm' } = {}) {
    this.place(at, from);
    if (isEvening()) torch(this); // (no street lamps out here: src/nightLights.js)
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

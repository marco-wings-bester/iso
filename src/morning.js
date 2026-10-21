import { daysToBraai } from './days.js';
import { choresLeft } from './chores.js';
import { getSetting } from './settings.js';
import { isRaining } from './weather.js';

// The game is a week long, Monday to Sunday (src/days.js). Each night passes
// as an animation over the farm (src/night.js); then, up in the morning,
// Boer Johan thinks of what the day holds: its farm work (src/chores.js),
// Derik's braai coming up (only with hints on: src/hints.js), the rain on
// Friday (src/weather.js), or just what a lovely morning it is.
export function wakeThought() {
  const af = [];
  const en = [];
  if (choresLeft()) {
    af.push('Vandag moet ek die land ploeg en die putte nagaan.');
    en.push('Today I have to plough the land and check the wells.');
  }
  const braai = getSetting('hints') === 'none' ? null : daysToBraai();
  if (braai === 1) {
    af.push('Môreaand is Derik se braai.');
    en.push("Tomorrow evening is Derek's braai.");
  } else if (braai === 0) {
    af.push('Vanaand is Derik se braai!');
    en.push("Tonight is Derek's braai!");
  }
  if (isRaining()) {
    af.push('Hoor net hoe reën dit buite! Sjoe, dit sous behoorlik. Nou ja, die plaas het die water nodig.');
    en.push("Just listen to it raining outside! Goodness, it's pouring. Oh well, the farm needs the water.");
  }
  if (!af.length) {
    af.push('Goeiemôre! Wat ’n pragtige oggend.');
    en.push('Good morning! What a lovely morning.');
  }
  return { af: af.join(' '), en: en.join(' ') };
}

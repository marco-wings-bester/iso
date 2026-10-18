import { hasFlag } from './state.js';
import { today } from './days.js';

// The day's farm work that has to be done before bed. Wednesday: plough the
// land (the tractor's keys are lost: they're on the bookshelf in the house;
// 'tractorKeys', then 'plowed') and see that the wells are working, a bucket
// of water from each ('wellTop'; the bottom one, by the orchard, has run dry:
// 'wellBottom'). All done ('choresDone'), he's tired out, ready for bed.
// (On Thursday he'll see to the dry well.)

export const WEDNESDAY = 2;

// Today's jobs: [{ text: { af, en }, done }], or none.
export function chores() {
  if (today() !== WEDNESDAY) return [];
  return [
    { text: { af: 'Ploeg die land met die trekker', en: 'Plough the land with the tractor' }, done: hasFlag('plowed') },
    { text: { af: 'Tap ’n emmer water uit albei putte', en: 'Draw a bucket of water from both wells' }, done: hasFlag('wellTop') && hasFlag('wellBottom') },
  ];
}

export function choresLeft() {
  return chores().some(c => !c.done);
}

// Why he can't go to bed yet: what's still to do.
export function notYet() {
  const plough = !hasFlag('plowed');
  const wells = !(hasFlag('wellTop') && hasFlag('wellBottom'));
  const one = hasFlag('wellTop') || hasFlag('wellBottom');
  const af = [plough && 'die land ploeg', wells && (one ? 'die ander put nagaan' : 'die putte nagaan')].filter(Boolean).join(' en ');
  const en = [plough && 'plough the land', wells && (one ? 'check the other well' : 'check the wells')].filter(Boolean).join(' and ');
  return { af: `Nog nie! Daar is nog werk op die plaas: ek moet eers ${af}.`, en: `Not yet! There's still work on the farm: first I have to ${en}.` };
}

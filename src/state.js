// Story progress, kept in localStorage so it survives reloads and app
// updates; falls back to memory if storage is blocked. A new game (menu)
// forgets it all. The story so far: find the house key in the tractor ('key',
// the farmhouse is locked without it); read the recipe book ('read'); fetch the
// apple picker from the tool shed ('picker') and pick an apple ('apple'); bake
// the pie ('baked') → eat half of it ('ate') → sleep ('slept') → Bob at the
// gate ('metBob', 'gavePie', …), who eats the other half ('pieEaten') → a
// knock at the door: Sarah, Bob's wife ('sarahKnocked') → hide Bob in the
// chest ('bobHidden') → Sarah comes in for a chat ('sarahVisited'): Jones
// either owns up ('toldSarah', she waits) or not (she leaves); the chest is
// stuck ('chestStuck') → the crowbar from the tool shed ('crowbar') prises
// it open and Bob goes home, with Sarah or alone ('bobHome') → Jones wants to
// go to town: down the road past the gate to the crossroads, Level 2
// ('level2') → at the beach, into the cafe for a coffee: no cash ('noCash') →
// Derik, fishing off the jetty, lends him R15 ('loan'; to pay back at his
// braai) → he buys his coffee ('coffee') → home, he's too wide awake to
// sleep: a good long ride on his bike from the barn ('exercised') → bed.
// (v2: progress saved under the old order — read, sleep, Bob — is dropped.)
const KEY = 'farm-walk-story-v2';
let flags = {};
try {
  localStorage.removeItem('farm-walk-story');
  flags = JSON.parse(localStorage.getItem(KEY)) || {};
  if (flags.read) flags.key = true; // saved before the key was part of the story: he's been inside
} catch {
  flags = {};
}

// Level 2 (the crossroads) begins with the story up to Bob going home.
export const LEVEL2_STORY = [
  'key', 'read', 'picker', 'apple', 'baked', 'ate', 'slept', 'metBob', 'gavePie', 'bobSat',
  'pieEaten', 'sarahKnocked', 'bobHidden', 'sarahVisited', 'chestStuck', 'crowbar', 'bobHome',
];

export function hasFlag(name) {
  return !!flags[name];
}

export function setFlag(name) {
  if (flags[name]) return;
  flags[name] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // private mode: remember for this visit only
  }
}

export function resetFlags() {
  flags = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    // private mode: nothing was stored
  }
}

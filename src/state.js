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
// go to town: down the road past the gate to the crossroads
// ('level2') → at the beach, into the cafe for a coffee: no cash ('noCash') →
// Derik, fishing off the jetty, lends him R15 ('loan'; to pay back at his
// braai) → he buys his coffee ('coffee') → home, he's too wide awake to
// sleep: a good long ride on his bike from the barn ('exercised') → bed.
// He sleeps only when he's tired ('tired': after eating the pie, or a good
// long bike ride), not just after coffee ('wired'); each night is a new day
// (`day` below). Wednesday's farm work before bed (src/chores.js): the
// tractor's keys on the bookshelf ('tractorKeys'), ploughing ('plowed'), a
// bucket from each well ('wellTop'; 'wellBottom', which is dry); all done
// ('choresDone'). Thursday, Derik's braai at his place: Johan pays him back
// ('repaid'); Derik has no meat ('needMeat') → the knife in the tool shed
// ('knife') → two hens from the hen house (`hens`, then 'chickens') → on
// Derik's grill ('meatBrought') → no salt ('needSalt'), none at home either
// ('noSaltHome') → Sannie at the cafe lends hers ('salt') → salted ('salted').
// Numbers kept with them: `day`, the day of the week (0 = Monday, the day
// the story starts; one on each night he sleeps: src/days.js), and
// `loanDay`, the day Derik lent him the R15 (his braai is two days later).
// (v2: progress saved under the old order — read, sleep, Bob — is dropped.)
const KEY = 'farm-walk-story-v2';
let flags = {};
try {
  localStorage.removeItem('farm-walk-story');
  flags = JSON.parse(localStorage.getItem(KEY)) || {};
  if (flags.read) flags.key = true; // saved before the key was part of the story: he's been inside
  // saved before there were days: a night slept is Tuesday; full of pie, sleepy
  if (flags.day == null && flags.slept) flags.day = 1;
  if (flags.ate && !flags.slept) flags.tired = true;
  if (flags.coffee && !flags.exercised) flags.wired = true;
  if (flags.loan && flags.loanDay == null) flags.loanDay = flags.day ?? 1;
} catch {
  flags = {};
}

// The story done by the start of each day, for the day select (src/menu.js):
// Tuesday begins the morning after the pie (Bob at the gate); Wednesday after
// Tuesday's trip to the beach (Derik's loan, the coffee, a bike ride);
// Thursday and on after Wednesday's farm work.
const MONDAY = ['key', 'read', 'picker', 'apple', 'baked', 'ate', 'slept'];
const TUESDAY = [...MONDAY, 'metBob', 'gavePie', 'bobSat', 'pieEaten', 'sarahKnocked', 'bobHidden', 'sarahVisited',
  'chestStuck', 'crowbar', 'bobHome', 'level2', 'noCash', 'loan', 'coffee', 'exercised'];
const WEDNESDAY = [...TUESDAY, 'tractorKeys', 'plowed', 'wellTop', 'wellBottom', 'choresDone'];

// Start again on day `n` (0: Monday), with the story done up to then.
export function startDay(n) {
  resetFlags();
  ([[], MONDAY, TUESDAY][n] ?? WEDNESDAY).forEach(setFlag);
  if (n >= 2) setValue('loanDay', 1); // Derik lent him the R15 on Tuesday
  setValue('day', n);
}

export function hasFlag(name) {
  return !!flags[name];
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // private mode: remember for this visit only
  }
}

export function setFlag(name) {
  if (flags[name]) return;
  flags[name] = true;
  save();
}

export function clearFlag(name) {
  if (!(name in flags)) return;
  delete flags[name];
  save();
}

// A number kept with the flags (null if not set).
export function getValue(name) {
  return flags[name] ?? null;
}

export function setValue(name, value) {
  flags[name] = value;
  save();
}

export function resetFlags() {
  flags = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    // private mode: nothing was stored
  }
}

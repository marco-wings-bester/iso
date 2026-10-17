import { getSetting } from './settings.js';
import { hasFlag } from './state.js';

// What Farmer Jones thinks when he can't do something yet (or has just done
// something), at the hint level chosen in the menu: 'none' is just his
// reaction, 'subtle' a nudge, 'explicit' says what to do next. A line can
// depend on how far the story has got; null means he thinks nothing.
const LINES = {
  // the farmhouse door, before he has his key back from the tractor
  doorLocked: {
    none: 'Locked.',
    subtle: 'Locked! Where did I leave my key…? I was out on the tractor all day.',
    explicit: 'Locked! I left my key in the tractor: tap the tractor and take it.',
  },
  // sitting in the tractor while the key's still in the ignition
  tractorKey: {
    none: null,
    subtle: "Hmm… what's that dangling by the wheel?",
    explicit: "There's my house key! Tap it to take it.",
  },
  idea: {
    none: 'Apple pie… I could bake that!',
    subtle: "Apple pie… I could bake that! I'll need an apple.",
    explicit: () => (hasFlag('apple')
      ? 'Apple pie! I have an apple, so I can bake it at the kitchen cupboard.'
      : 'Apple pie! I need an apple from one of the apple trees first.'),
  },
  cupboardNoRecipe: {
    none: 'Nothing I need in here right now.',
    subtle: "I don't know any recipes… maybe a book would help.",
    explicit: 'I need a recipe first: the recipe book is on the bookshelf.',
  },
  cupboardNoApple: {
    none: 'No apples in here.',
    subtle: 'No apples in the cupboard… the apple trees are full of them.',
    explicit: () => (hasFlag('picker')
      ? 'I need an apple. Tap an apple tree and pick one with the apple picker.'
      : 'I need an apple. Get the apple picker from the tool shed, then pick one from an apple tree.'),
  },
  bedEarly: {
    none: "I'm not sleepy yet.",
    subtle: () => {
      if (!hasFlag('read')) return "I'm not sleepy yet. Maybe I'll read a book.";
      if (!hasFlag('baked')) return "I'm not sleepy yet. I fancy baking something.";
      return "I'm not sleepy yet. That pie smells good…";
    },
    explicit: () => {
      if (!hasFlag('read')) return 'Not sleepy yet. First, read the recipe book on the bookshelf.';
      if (!hasFlag('apple')) return 'Not sleepy yet. First I need an apple for the pie.';
      if (!hasFlag('baked')) return 'Not sleepy yet. Bake the pie at the kitchen cupboard first.';
      return 'Not sleepy yet. Have some of the pie first: tap it on the table.';
    },
  },
  // just baked: the pie's on the table
  baked: {
    none: 'There! It smells delicious.',
    subtle: 'There! It smells delicious… maybe just a slice.',
    explicit: "There! Now I'll have some: tap the pie on the table.",
  },
  // after eating half the pie
  full: {
    none: "Mmm… I'm full. Now I'm sleepy.",
    subtle: "Mmm… I'm full. Now I'm sleepy.",
    explicit: "Mmm… I'm full. Now I'm sleepy: time for bed.",
  },
  tooHigh: {
    none: "Too high. I can't reach.",
    subtle: 'Too high… if only I had something long to reach with.',
    explicit: 'Too high! The apple picker in the tool shed would reach it.',
  },
  // looking up into an apple tree while he still needs an apple
  treeEnter: {
    none: null,
    subtle: () => (hasFlag('picker') ? 'Now, which apple…?' : 'Lovely apples… right up high.'),
    explicit: () => (hasFlag('picker') ? 'Tap an apple to pick it with the apple picker.' : 'The apples are too high. The apple picker is in the tool shed.'),
  },
  // Sarah at the door, Bob begging to be hidden
  hideBob: {
    none: null,
    subtle: 'Where could Bob hide…? Somewhere big enough for him…',
    explicit: 'Quick! Tap the big chest in the corner so Bob can hide in it.',
  },
  // trying to go out (or to bed) before Bob is hidden
  notNow: {
    none: 'Not now!',
    subtle: "Not now: Sarah's at the door, and Bob needs hiding!",
    explicit: 'Not now: hide Bob first! Tap the big chest in the corner.',
  },
  pickerFound: {
    none: 'An apple picker.',
    subtle: 'An apple picker… handy for high branches.',
    explicit: 'An apple picker! Now I can pick apples from the apple trees.',
  },
};

export function line(key) {
  const l = LINES[key][getSetting('hints')] ?? LINES[key].subtle;
  return typeof l === 'function' ? l() : l;
}

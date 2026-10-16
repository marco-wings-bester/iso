import { getSetting } from './settings.js';
import { hasFlag } from './state.js';

// What Farmer Jones thinks when he can't do something yet (or has just done
// something), at the hint level chosen in the menu: 'none' is just his
// reaction, 'subtle' a nudge, 'explicit' says what to do next. A line can
// depend on how far the story has got; null means he thinks nothing.
const LINES = {
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
    subtle: () => (hasFlag('read') ? "I'm not sleepy yet. I fancy baking something." : "I'm not sleepy yet. Maybe I'll read a book."),
    explicit: () => {
      if (!hasFlag('read')) return 'Not sleepy yet. First, read the recipe book on the bookshelf.';
      if (!hasFlag('apple')) return 'Not sleepy yet. First I need an apple for the pie.';
      return 'Not sleepy yet. Bake the pie at the kitchen cupboard first.';
    },
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

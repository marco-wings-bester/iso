import { getSetting } from './settings.js';
import { hasFlag } from './state.js';
import { t } from './i18n.js';

// What Farmer Jones (Boer Johan) thinks when he can't do something yet (or
// has just done something), at the hint level chosen in the menu: 'none' is
// just his reaction, 'subtle' a nudge, 'explicit' says what to do next. Each
// is { af, en } (src/i18n.js). A line can depend on how far the story has
// got; null means he thinks nothing.
const LINES = {
  // the farmhouse door, before he has his key back from the tractor
  doorLocked: {
    none: { af: 'Gesluit.', en: 'Locked.' },
    subtle: {
      af: 'Gesluit! Waar het ek my sleutel gelos…? Ek was die hele dag op die trekker.',
      en: 'Locked! Where did I leave my key…? I was out on the tractor all day.',
    },
    explicit: {
      af: 'Gesluit! Ek het my sleutel in die trekker gelos: tik op die trekker en vat dit.',
      en: 'Locked! I left my key in the tractor: tap the tractor and take it.',
    },
  },
  // sitting in the tractor while the key's still in the ignition
  tractorKey: {
    none: null,
    subtle: { af: 'Hmm… wat hang daar by die stuurwiel?', en: "Hmm… what's that dangling by the wheel?" },
    explicit: { af: 'Daar is my huissleutel! Tik daarop om dit te vat.', en: "There's my house key! Tap it to take it." },
  },
  idea: {
    none: { af: 'Appeltert… dit kan ek bak!', en: 'Apple pie… I could bake that!' },
    subtle: { af: 'Appeltert… dit kan ek bak! Ek sal ’n appel nodig hê.', en: "Apple pie… I could bake that! I'll need an apple." },
    explicit: () => (hasFlag('apple')
      ? { af: 'Appeltert! Ek het ’n appel, so ek kan dit by die kombuiskas bak.', en: 'Apple pie! I have an apple, so I can bake it at the kitchen cupboard.' }
      : { af: 'Appeltert! Ek moet eers ’n appel van een van die appelbome kry.', en: 'Apple pie! I need an apple from one of the apple trees first.' }),
  },
  cupboardNoRecipe: {
    none: { af: 'Niks hierin wat ek nou nodig het nie.', en: 'Nothing I need in here right now.' },
    subtle: { af: 'Ek ken nie een resep nie… dalk sal ’n boek help.', en: "I don't know any recipes… maybe a book would help." },
    explicit: { af: 'Ek het eers ’n resep nodig: die resepteboek is op die boekrak.', en: 'I need a recipe first: the recipe book is on the bookshelf.' },
  },
  cupboardNoApple: {
    none: { af: 'Geen appels hierin nie.', en: 'No apples in here.' },
    subtle: { af: 'Geen appels in die kas nie… die appelbome is vol daarvan.', en: 'No apples in the cupboard… the apple trees are full of them.' },
    explicit: () => (hasFlag('picker')
      ? { af: 'Ek het ’n appel nodig. Tik op ’n appelboom en pluk een met die appelplukker.', en: 'I need an apple. Tap an apple tree and pick one with the apple picker.' }
      : {
        af: 'Ek het ’n appel nodig. Gaan haal die appelplukker in die gereedskapskuur en pluk dan een van ’n appelboom af.',
        en: 'I need an apple. Get the apple picker from the tool shed, then pick one from an apple tree.',
      }),
  },
  bedEarly: {
    none: { af: 'Ek is nog nie vaak nie.', en: "I'm not sleepy yet." },
    subtle: () => {
      if (!hasFlag('read')) return { af: 'Ek is nog nie vaak nie. Miskien lees ek ’n boek.', en: "I'm not sleepy yet. Maybe I'll read a book." };
      if (!hasFlag('baked')) return { af: 'Ek is nog nie vaak nie. Ek is lus om iets te bak.', en: "I'm not sleepy yet. I fancy baking something." };
      return { af: 'Ek is nog nie vaak nie. Daai tert ruik lekker…', en: "I'm not sleepy yet. That pie smells good…" };
    },
    explicit: () => {
      if (!hasFlag('read')) return { af: 'Nog nie vaak nie. Lees eers die resepteboek op die boekrak.', en: 'Not sleepy yet. First, read the recipe book on the bookshelf.' };
      if (!hasFlag('apple')) return { af: 'Nog nie vaak nie. Eers het ek ’n appel vir die tert nodig.', en: 'Not sleepy yet. First I need an apple for the pie.' };
      if (!hasFlag('baked')) return { af: 'Nog nie vaak nie. Bak eers die tert by die kombuiskas.', en: 'Not sleepy yet. Bake the pie at the kitchen cupboard first.' };
      return { af: 'Nog nie vaak nie. Eet eers van die tert: tik daarop op die tafel.', en: 'Not sleepy yet. Have some of the pie first: tap it on the table.' };
    },
  },
  // just baked: the pie's on the table
  baked: {
    none: { af: 'So! Dit ruik heerlik.', en: 'There! It smells delicious.' },
    subtle: { af: 'So! Dit ruik heerlik… dalk net ’n stukkie.', en: 'There! It smells delicious… maybe just a slice.' },
    explicit: { af: 'So! Nou eet ek ’n bietjie: tik op die tert op die tafel.', en: "There! Now I'll have some: tap the pie on the table." },
  },
  // after eating half the pie
  full: {
    none: { af: 'Mmm… ek is vol. Nou is ek vaak.', en: "Mmm… I'm full. Now I'm sleepy." },
    subtle: { af: 'Mmm… ek is vol. Nou is ek vaak.', en: "Mmm… I'm full. Now I'm sleepy." },
    explicit: { af: 'Mmm… ek is vol. Nou is ek vaak: tyd vir bed.', en: "Mmm… I'm full. Now I'm sleepy: time for bed." },
  },
  tooHigh: {
    none: { af: 'Te hoog. Ek kan nie daarby uitkom nie.', en: "Too high. I can't reach." },
    subtle: { af: 'Te hoog… as ek net iets lanks gehad het om mee by te kom.', en: 'Too high… if only I had something long to reach with.' },
    explicit: { af: 'Te hoog! Die appelplukker in die gereedskapskuur sal daarby uitkom.', en: 'Too high! The apple picker in the tool shed would reach it.' },
  },
  // looking up into an apple tree while he still needs an apple
  treeEnter: {
    none: null,
    subtle: () => (hasFlag('picker')
      ? { af: 'Nou, watter appel…?', en: 'Now, which apple…?' }
      : { af: 'Pragtige appels… heel bo.', en: 'Lovely apples… right up high.' }),
    explicit: () => (hasFlag('picker')
      ? { af: 'Tik op ’n appel om dit met die appelplukker te pluk.', en: 'Tap an apple to pick it with the apple picker.' }
      : { af: 'Die appels is te hoog. Die appelplukker is in die gereedskapskuur.', en: 'The apples are too high. The apple picker is in the tool shed.' }),
  },
  // Sarah at the door, Bob begging to be hidden
  hideBob: {
    none: null,
    subtle: { af: 'Waar kan Pieter wegkruip…? Iewers wat groot genoeg vir hom is…', en: 'Where could Bob hide…? Somewhere big enough for him…' },
    explicit: { af: 'Gou! Tik op die groot kis in die hoek sodat Pieter daarin kan wegkruip.', en: 'Quick! Tap the big chest in the corner so Bob can hide in it.' },
  },
  // trying to go out (or to bed) before Bob is hidden
  notNow: {
    none: { af: 'Nie nou nie!', en: 'Not now!' },
    subtle: { af: 'Nie nou nie: Sarah is by die deur, en Pieter moet wegkruip!', en: "Not now: Sarah's at the door, and Bob needs hiding!" },
    explicit: { af: 'Nie nou nie: steek eers vir Pieter weg! Tik op die groot kis in die hoek.', en: 'Not now: hide Bob first! Tap the big chest in the corner.' },
  },
  // the chest Bob's hiding in won't open
  chestStuck: {
    none: null,
    subtle: { af: 'As ek net iets gehad het om dit mee oop te wrik…', en: 'If only I had something to prise it open with…' },
    explicit: { af: 'Ek het ’n koevoet nodig om dit oop te wrik. Daar is een in die gereedskapskuur.', en: 'I need a crowbar to prise it open. There is one in the tool shed.' },
  },
  crowbarFound: {
    none: { af: '’n Koevoet.', en: 'A crowbar.' },
    subtle: { af: '’n Koevoet… net die ding om goed mee oop te wrik.', en: 'A crowbar… just the thing for prising things open.' },
    explicit: () => (hasFlag('chestStuck')
      ? { af: '’n Koevoet! Daarmee kry ek die kis oop wat vassit.', en: 'A crowbar! That will open the stuck chest.' }
      : { af: '’n Koevoet. Handig om goed mee oop te wrik.', en: 'A crowbar. Handy for prising things open.' }),
  },
  pickerFound: {
    none: { af: '’n Appelplukker.', en: 'An apple picker.' },
    subtle: { af: '’n Appelplukker… handig vir hoë takke.', en: 'An apple picker… handy for high branches.' },
    explicit: { af: '’n Appelplukker! Nou kan ek appels van die appelbome af pluk.', en: 'An apple picker! Now I can pick apples from the apple trees.' },
  },
};

// The line in the current language, or null.
export function line(key) {
  return t(LINES[key][getSetting('hints')] ?? LINES[key].subtle);
}

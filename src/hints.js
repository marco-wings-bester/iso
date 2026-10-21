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
  // bed when he isn't tired: before the pie, or (after it) without a good
  // long bike ride
  bedEarly: {
    none: { af: 'Ek is nog nie vaak nie.', en: "I'm not sleepy yet." },
    subtle: () => {
      if (hasFlag('ate') && !hasFlag('coffee')) return { af: 'Ek is nog nie vaak nie. Daar is nog baie om vandag te doen.', en: "I'm not sleepy yet. There's still lots to do today." };
      if (hasFlag('ate')) return { af: 'Ek is nog nie vaak nie. Ek sal my eers bietjie moeg moet maak.', en: "I'm not sleepy yet. I'll have to tire myself out first." };
      if (!hasFlag('read')) return { af: 'Ek is nog nie vaak nie. Miskien lees ek ’n boek.', en: "I'm not sleepy yet. Maybe I'll read a book." };
      if (!hasFlag('baked')) return { af: 'Ek is nog nie vaak nie. Ek is lus om iets te bak.', en: "I'm not sleepy yet. I fancy baking something." };
      return { af: 'Ek is nog nie vaak nie. Daai tert ruik lekker…', en: "I'm not sleepy yet. That pie smells good…" };
    },
    explicit: () => {
      if (hasFlag('ate') && !hasFlag('coffee')) return { af: 'Nog nie vaak nie. Daar is nog baie om vandag te doen.', en: "Not sleepy yet. There's still lots to do today." };
      if (hasFlag('ate')) return { af: 'Nog nie vaak nie. ’n Lang fietsrit sal my moeg maak: my fiets is in die skuur.', en: 'Not sleepy yet. A long bike ride will tire me out: my bike is in the barn.' };
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
  // Bob's wife at the door, Bob begging to be hidden
  hideBob: {
    none: null,
    subtle: { af: 'Waar kan Pieter wegkruip…? Iewers wat groot genoeg vir hom is…', en: 'Where could Bob hide…? Somewhere big enough for him…' },
    explicit: { af: 'Gou! Tik op die groot kis in die hoek sodat Pieter daarin kan wegkruip.', en: 'Quick! Tap the big chest in the corner so Bob can hide in it.' },
  },
  // trying to go out (or to bed) before Bob is hidden
  notNow: {
    none: { af: 'Nie nou nie!', en: 'Not now!' },
    subtle: { af: 'Nie nou nie: Wiesie is by die deur, en Pieter moet wegkruip!', en: "Not now: Louise's at the door, and Bob needs hiding!" },
    explicit: { af: 'Nie nou nie: steek eers vir Pieter weg! Tik op die groot kis in die hoek.', en: 'Not now: hide Bob first! Tap the big chest in the corner.' },
  },
  // the chest Bob's hiding in won't open
  chestStuck: {
    none: null,
    subtle: { af: 'As ek net iets gehad het om dit mee oop te wrik…', en: 'If only I had something to prise it open with…' },
    explicit: { af: 'Ek het ’n koevoet nodig om dit oop te wrik. Daar is een in die gereedskapskuur.', en: 'I need a crowbar to prise it open. There is one in the tool shed.' },
  },
  // Pieter's gone home; Johan wants to go to the beach
  toBeach: {
    none: null,
    subtle: { af: 'Die pad strand toe loop verby die plaashek…', en: 'The road to the beach goes out past the farm gate…' },
    explicit: { af: 'Tik heel onder, verby die plaashek, en by die kruispad links om strand toe te loop.', en: 'Tap right at the bottom, past the farm gate, and go left at the crossroads to walk to the beach.' },
  },
  crowbarFound: {
    none: { af: '’n Koevoet.', en: 'A crowbar.' },
    subtle: { af: '’n Koevoet… net die ding om goed mee oop te wrik.', en: 'A crowbar… just the thing for prising things open.' },
    explicit: () => (hasFlag('chestStuck')
      ? { af: '’n Koevoet! Daarmee kry ek die kis oop wat vassit.', en: 'A crowbar! That will open the stuck chest.' }
      : { af: '’n Koevoet. Handig om goed mee oop te wrik.', en: 'A crowbar. Handy for prising things open.' }),
  },
  // the cafe's coffee, and no cash to pay for it (src/cafe.js)
  noCash: {
    none: null,
    subtle: { af: 'Miskien sal iemand by die strand vir my ’n paar rand leen…', en: 'Maybe someone at the beach would lend me a few rand…' },
    explicit: { af: 'Derik visvang op die pier: dalk sal hy vir my R15 leen.', en: "Derek's fishing on the jetty: maybe he'll lend me R15." },
  },
  // out of the cafe, his coffee finished (the bike only in the hints)
  afterCoffee: {
    none: { af: 'Sjoe, daai koffie was sterk! Ek is wawyd wakker… en reg vir ’n bietjie oefening.', en: "Wow, that coffee was strong! I'm wide awake… and ready for some exercise." },
    subtle: { af: 'Sjoe, daai koffie was sterk! Ek is wawyd wakker… en reg vir ’n bietjie oefening. Iets met twee wiele, dalk…', en: "Wow, that coffee was strong! I'm wide awake… and ready for some exercise. Something with two wheels, maybe…" },
    explicit: { af: 'Sjoe, daai koffie was sterk! Ek is wawyd wakker… en reg vir ’n bietjie oefening. My fiets staan in die skuur!', en: "Wow, that coffee was strong! I'm wide awake… and ready for some exercise. My bike's in the barn!" },
  },
  // bed, after the cafe's coffee, before a ride on his bike (src/bike.js)
  wideAwake: {
    none: { af: 'Ek is nie moeg genoeg nie. Daai koffie het my wakker! Ek sal eers bietjie oefening moet doen.', en: "I'm not tired enough. That coffee's woken me right up! I'll have to get some exercise first." },
    subtle: { af: 'Ek is nie moeg genoeg nie. Daai koffie het my wakker! Ek sal eers bietjie oefening moet doen. Waar is my fiets nou weer…?', en: "I'm not tired enough. That coffee's woken me right up! I'll have to get some exercise first. Now where's my bike…?" },
    explicit: { af: 'Ek is nie moeg genoeg nie. Daai koffie het my wakker! Ek sal eers bietjie oefening moet doen: my fiets is in die skuur.', en: "I'm not tired enough. That coffee's woken me right up! I'll have to get some exercise first: my bike's in the barn." },
  },
  // a good long ride on it
  tired: {
    none: { af: 'Pff! Dit was lekker oefening. Nou is ek moeg.', en: "Phew! That was good exercise. Now I'm tired." },
    explicit: { af: 'Pff! Dit was lekker oefening. Nou is ek moeg genoeg om te gaan slaap.', en: "Phew! That was good exercise. Now I'm tired enough to go to bed." },
  },
  // Wednesday, in the tractor: its keys are gone (src/chores.js)
  tractorKeysLost: {
    none: { af: 'O nee, die trekker se sleutels is weg! Ek het hulle seker weer in die huis gelos…', en: "Oh no, the tractor's keys are gone! I must have left them in the house again…" },
    subtle: { af: 'O nee, die trekker se sleutels is weg! Ek het hulle seker in die huis gelos… dalk by my boeke?', en: "Oh no, the tractor's keys are gone! I must have left them in the house… maybe by my books?" },
    explicit: { af: 'O nee, die trekker se sleutels is weg! Ek dink hulle lê op die boekrak in die huis.', en: "Oh no, the tractor's keys are gone! I think they're on the bookshelf in the house." },
  },
  tractorKeysFound: {
    none: { af: 'Die trekker se sleutels! Op die boekrak, nogal.', en: 'The tractor keys! On the bookshelf, of all places.' },
    explicit: { af: 'Die trekker se sleutels! Nou kan ek gaan ploeg: tik op die trekker.', en: 'The tractor keys! Now I can go ploughing: tap the tractor.' },
  },
  // Thursday: Derik's asked for meat for the braai (src/derik.js)
  needMeat: {
    none: null,
    subtle: { af: 'Vleis vir die braai… ek het mos hoenders by die huis.', en: "Meat for the braai… I've got chickens at home." },
    explicit: { af: 'Ek kan twee hoenders uit my hoenderhok op die plaas gaan haal.', en: 'I can fetch two chickens from my hen house on the farm.' },
  },
  // in the hen house, without a knife (src/views/coop.js)
  coopNoKnife: {
    none: { af: 'Ek het nie ’n mes nie.', en: "I haven't got a knife." },
    subtle: { af: 'Ek het nie ’n mes nie. Waar het ek laas een gesien…?', en: "I haven't got a knife. Where did I last see one…?" },
    explicit: { af: 'Ek het nie ’n mes nie. Daar lê een op die werkbank in die gereedskapskuur.', en: "I haven't got a knife. There's one on the workbench in the tool shed." },
  },
  knifeFound: {
    none: { af: '’n Mes.', en: 'A knife.' },
    explicit: { af: '’n Mes! Nou kan ek twee hoenders uit die hoenderhok vir die braai kry.', en: 'A knife! Now I can get two chickens from the hen house for the braai.' },
  },
  // two chickens for the braai
  chickens: {
    none: { af: 'Twee hoenders vir Derik se braai!', en: "Two chickens for Derek's braai!" },
    explicit: { af: 'Twee hoenders vir Derik se braai! Nou terug na sy plek toe.', en: "Two chickens for Derek's braai! Now back to his place." },
  },
  // Derik has no salt for the chicken either
  needSalt: {
    none: null,
    subtle: { af: 'Sout… daar is seker sout in my kombuis.', en: "Salt… there's bound to be salt in my kitchen." },
    explicit: { af: 'Ek gaan kyk in my kombuis by die huis vir sout.', en: "I'll look in my kitchen at home for salt." },
  },
  // home, and the salt pot's empty
  noSalt: {
    none: { af: 'Ag nee, my soutpot is leeg!', en: 'Oh no, my salt pot is empty!' },
    subtle: { af: 'Ag nee, my soutpot is leeg! By wie kan ek sout leen…?', en: 'Oh no, my salt pot is empty! Who could I borrow salt from…?' },
    explicit: { af: 'Ag nee, my soutpot is leeg! Sannie by die kafee by die strand sal seker vir my sout leen.', en: 'Oh no, my salt pot is empty! Sally at the cafe by the beach will surely lend me some salt.' },
  },
  // Sannie's lent him her salt
  saltLent: {
    none: { af: 'Sout vir die hoender!', en: 'Salt for the chicken!' },
    explicit: { af: 'Sout vir die hoender! Nou terug na Derik toe.', en: 'Salt for the chicken! Now back to Derek.' },
  },
  // Friday: Derik and Abraham have asked him to look at the town's fountain (src/derikHouse.js)
  fixFountain: {
    none: null,
    subtle: { af: 'Die fontein in die dorp… kom ek gaan kyk wat makeer.', en: "The fountain in town… let's go and see what's wrong." },
    explicit: { af: 'Ek moet na die fontein op die dorpsplein gaan kyk: die pad dorp toe is af by die kruispad.', en: 'I must go and look at the fountain on the town square: the road to town is down from the crossroads.' },
  },
  pickerFound: {
    none: { af: '’n Appelplukker.', en: 'An apple picker.' },
    subtle: { af: '’n Appelplukker… handig vir hoë takke.', en: 'An apple picker… handy for high branches.' },
    explicit: { af: '’n Appelplukker! Nou kan ek appels van die appelbome af pluk.', en: 'An apple picker! Now I can pick apples from the apple trees.' },
  },
};

// The line in the current language, or null.
export function line(key) {
  const lines = LINES[key];
  const level = getSetting('hints');
  return t(level in lines ? lines[level] : lines.none);
}

import { hasFlag, setFlag, setValue } from './state.js';
import { today, daysToBraai } from './days.js';
import { converse } from './dialog.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// Derik, fishing off the end of the jetty at the beach (src/villagers.js).
// Once Boer Johan has found he can't pay for his coffee ('noCash',
// src/cafe.js), Derik lends him R15 ('loan', on `loanDay`): bring it back
// the day after tomorrow, in the evening, when he comes over for a braai.
// Before that he just says hello; after, he reminds Johan of the braai:
// the day after tomorrow, tomorrow, tonight (src/days.js).

// Where Johan stands to talk to him: beside him on the jetty, behind Lientjie.
export const BY_DERIK = { x: 346, y: 2466 };

// At his place on the evening of the braai (Thursday: src/DerikScene.js),
// by the fire in his boma. Johan pays him back the R15 ('repaid'); Derik's
// lit the fire, but he hasn't got any meat: would Johan bring some
// ('needMeat')? Two chickens from Johan's hen house, with the knife from his
// tool shed (src/views/coop.js: 'chickens'), and they're on the grill
// ('meatBrought', src/derikLife.js). But he hasn't any salt either
// ('needSalt'): there's none in Johan's kitchen, but Sannie at the cafe lends
// him hers (src/cafe.js: 'salt'), and the chicken's salted ('salted').
export async function braaiWithDerik(scene, derik) {
  const cast = {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    derik: { sprite: derik.sprite, name: derik.name, color: '#3a6a98' },
  };
  scene.player.face(derik.x < scene.player.x ? 'left' : 'right');
  derik.notice(scene.player);
  await scene.talk(async () => {
    if (hasFlag('salted')) {
      await converse(scene, cast, [['derik', { af: 'Kom sit, Johan! Die hoender is amper gaar.', en: "Come and sit, Jones! The chicken's nearly done." }]]);
      return;
    }
    if (hasFlag('salt')) {
      await converse(scene, cast, [
        ['derik', { af: 'Sout! Jy’s ’n ster, Johan.', en: "Salt! You're a star, Jones." }],
        async () => {
          setFlag('salted');
          await scene.saltChicken?.();
        },
        ['derik', { af: 'So, nou is dit ’n braai! Kom sit, die hoender is amper gaar.', en: "There, now it's a braai! Come and sit, the chicken's nearly done." }],
      ]);
      return;
    }
    if (hasFlag('needSalt')) {
      await converse(scene, cast, [['derik', { af: 'Die hoender wag net vir die sout!', en: "The chicken's just waiting for the salt!" }]]);
      return;
    }
    if (hasFlag('chickens')) {
      await converse(scene, cast, [
        ['derik', { af: 'Hoender! Pragtig, Johan. Kom ons gooi dit op die rooster.', en: "Chicken! Beautiful, Jones. Let's get it on the grill." }],
        () => {
          setFlag('meatBrought');
          scene.grill?.();
        },
        ['derik', { af: 'Ag nee… ek het ook nie sout nie! Het jy dalk sout by die huis?', en: "Oh no… I haven't got any salt either! Have you got some at home?" }],
        ['jones', { af: 'Seker! Ek gaan kyk gou.', en: "Surely! I'll go and look." }],
        () => setFlag('needSalt'),
      ]);
      return;
    }
    if (hasFlag('needMeat')) {
      await converse(scene, cast, [['derik', { af: 'Die vuur is reg, net die vleis kort nog!', en: "The fire's ready, it's just the meat we're missing!" }]]);
      return;
    }
    const steps = [['derik', { af: 'Johan! Welkom, welkom! Die vuur brand lekker.', en: 'Jones! Welcome, welcome! The fire is going nicely.' }]];
    if (hasFlag('loan') && !hasFlag('repaid')) {
      steps.push(
        ['jones', { af: 'Hier is jou R15. Baie dankie, Derik!', en: "Here's your R15. Thanks so much, Derek!" }],
        () => coins(scene, scene.player.sprite, derik.sprite),
        () => setFlag('repaid'),
        ['derik', { af: 'Dankie, ou maat!', en: 'Thanks, old friend!' }],
      );
    }
    steps.push(
      ['derik', { af: 'Ek het die vuur al aangesteek… maar ek het glad nie vleis nie! Sal jy omgee om vir ons vleis te bring?', en: "I've already got the fire going… but I haven't got any meat at all! Would you mind bringing us some?" }],
      ['jones', { af: 'Glad nie! Ek kry gou vir ons iets.', en: "Not at all! I'll fetch us something." }],
      () => setFlag('needMeat'),
      ['derik', { af: 'Lekker! Die vuur sal wag.', en: 'Great! The fire will wait.' }],
    );
    await converse(scene, cast, steps);
  });
  const hint = hasFlag('needSalt') && !hasFlag('salt') ? line('needSalt')
    : hasFlag('needMeat') && !hasFlag('chickens') ? line('needMeat') : null;
  if (hint) think(scene, scene.player.sprite, hint);
}

export async function talkToDerik(scene, derik) {
  const cast = {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    derik: { sprite: derik.sprite, name: derik.name, color: '#3a6a98' },
  };
  scene.player.face('left');
  await scene.talk(async () => {
    if (hasFlag('loan')) {
      const days = daysToBraai();
      await converse(scene, cast, [['derik', days >= 2 ? { af: 'Onthou, oormore aand braai ons!', en: "Remember, it's a braai at ours the day after tomorrow!" }
        : days === 1 ? { af: 'Onthou, môreaand braai ons!', en: "Remember, it's a braai at ours tomorrow evening!" }
          : { af: 'Vanaand braai ons by my plek, regs by die kruispad! Sien jou daar.', en: "Tonight's the braai at my place, right from the crossroads! See you there." }]]);
      return;
    }
    if (!hasFlag('noCash')) {
      await converse(scene, cast, [['derik', { af: 'Middag, Johan! Sjuut, netnou skrik die visse weg.', en: "Afternoon, Jones! Shh, you'll scare the fish away." }]]);
      return;
    }
    await converse(scene, cast, [
      ['derik', { af: 'Haai, Johan! Jy lyk bietjie bekaf. Wat makeer?', en: "Hey, Jones! You look a bit down. What's up?" }],
      ['jones', { af: 'Ek wou ’n koffie koop, maar ek het nie kontant nie.', en: "I wanted to buy a coffee, but I haven't got any cash." }],
      ['derik', { af: 'Ag, is dit al? Hier, ek leen vir jou R15.', en: "Oh, is that all? Here, I'll lend you R15." }],
      () => coins(scene, derik.sprite, scene.player.sprite),
      async () => {
        setFlag('loan');
        setValue('loanDay', today());
      },
      ['derik', { af: 'Bring dit sommer oormore aand as jy by ons kom braai.', en: 'Just bring it back the day after tomorrow, in the evening, when you come over to ours for a braai.' }],
      ['jones', { af: 'Baie dankie, Derik! Ek sal dit bring.', en: "Thanks so much, Derek! I'll bring it." }],
      ['derik', { af: 'Plesier. Gaan geniet jou koffie!', en: 'Pleasure. Go and enjoy your coffee!' }],
    ]);
  });
}

// Three coins, one after the other, from one's hand to the other's, in an arc.
function coins(scene, from, to) {
  const a = { x: from.x - 4, y: from.y - 34 };
  const b = { x: to.x, y: to.y - 34 };
  return new Promise((done) => {
    [0, 1, 2].forEach((i) => {
      const coin = scene.add.circle(a.x, a.y, 6, 0xf8d050).setStrokeStyle(3, 0x2e1d0c).setDepth(1e4);
      const shine = scene.add.rectangle(a.x, a.y, 3, 3, 0xfff8d0).setDepth(1e4 + 1);
      const path = { t: 0 };
      scene.tweens.add({
        targets: path, t: 1, duration: 520, delay: i * 220,
        onUpdate: () => {
          const { t } = path;
          const x = a.x + (b.x - a.x) * t;
          const y = a.y + (b.y - a.y) * t - 36 * Math.sin(Math.PI * t);
          coin.setPosition(x, y);
          shine.setPosition(x - 2, y - 2);
        },
        onComplete: () => {
          coin.destroy();
          shine.destroy();
          if (i === 2) done();
        },
      });
    });
  });
}

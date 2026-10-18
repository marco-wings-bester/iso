import { hasFlag, setFlag, setValue } from './state.js';
import { today, daysToBraai } from './days.js';
import { converse } from './dialog.js';

// Derik, fishing off the end of the jetty at the beach (src/villagers.js).
// Once Boer Johan has found he can't pay for his coffee ('noCash',
// src/cafe.js), Derik lends him R15 ('loan', on `loanDay`): bring it back
// the day after tomorrow, in the evening, when he comes over for a braai.
// Before that he just says hello; after, he reminds Johan of the braai:
// the day after tomorrow, tomorrow, tonight (src/days.js).

// Where Johan stands to talk to him: beside him on the jetty, behind Lientjie.
export const BY_DERIK = { x: 346, y: 2466 };

export async function talkToDerik(scene, derik) {
  const cast = {
    jones: { get sprite() { return scene.player.sprite; } },
    derik: { sprite: derik.sprite, name: derik.name, color: '#3a6a98' },
  };
  scene.player.face('left');
  await scene.talk(async () => {
    if (hasFlag('loan')) {
      const days = daysToBraai();
      await converse(scene, cast, [['derik', days >= 2 ? { af: 'Onthou, oormore aand braai ons!', en: "Remember, it's a braai at ours the day after tomorrow!" }
        : days === 1 ? { af: 'Onthou, môreaand braai ons!', en: "Remember, it's a braai at ours tomorrow evening!" }
          : { af: 'Vanaand braai ons by my huis in die dorpie! Sien jou daar.', en: "Tonight's the braai at my house in the village! See you there." }]]);
      return;
    }
    if (!hasFlag('noCash')) {
      await converse(scene, cast, [['derik', { af: 'Middag, Johan! Sjuut, netnou skrik die visse weg.', en: "Afternoon, Jones! Shh, you'll scare the fish away." }]]);
      return;
    }
    await converse(scene, cast, [
      ['derik', { af: 'Haai, Johan! Jy lyk bietjie bekaf. Wat makeer?', en: "Hey, Jones! You look a bit down. What's up?" }],
      { choose: [
        { say: { af: 'Ek wou ’n koffie koop, maar ek het nie kontant nie.', en: "I wanted to buy a coffee, but I haven't got any cash." } },
        { say: { af: 'My beursie is leeg, en ek is so lus vir ’n koffie.', en: "My wallet's empty, and I'm dying for a coffee." } },
      ] },
      ['derik', { af: 'Ag, is dit al? Hier, ek leen vir jou R15.', en: "Oh, is that all? Here, I'll lend you R15." }],
      () => coins(scene, derik.sprite, scene.player.sprite),
      async () => {
        setFlag('loan');
        setValue('loanDay', today());
      },
      ['derik', { af: 'Bring dit sommer oormore aand as jy by ons kom braai.', en: 'Just bring it back the day after tomorrow, in the evening, when you come over to ours for a braai.' }],
      { choose: [
        { say: { af: 'Baie dankie, Derik! Ek sal dit bring.', en: "Thanks so much, Derek! I'll bring it." } },
        { say: { af: 'Jy’s ’n held! Sien jou oormore by die braai.', en: "You're a star! See you at the braai the day after tomorrow." } },
      ] },
      ['derik', { af: 'Plesier. Gaan geniet jou koffie!', en: 'Pleasure. Go and enjoy your coffee!' }],
    ]);
  });
}

// Three coins, one after the other, from his hand to Johan's, in an arc.
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

import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { createVillager } from './CharacterSprite.js';
import { dateReady } from './datePlan.js';

// The restaurant on the town square (ROOMS.restaurant): tables laid for
// dinner, and Lize at her stand by the door with the bookings book. On
// Saturday, with his date with Steffi tonight ('datePlan', src/datePlan.js),
// Johan books the table for two by the window, at seven ('tableBooked').
// (She mentions they dress up for dinner here: a tuxedo would be just the
// thing, src/tailor.js.)

const LIZE = {
  name: { af: 'Lize', en: 'Lize' }, color: '#7a2a30',
  look: {
    hair: 'bob', skirt: true,
    palette: {
      S: '#f8d0b0', s: '#e0a888', B: '#2a2a2a', d: '#141414',
      R: '#2a1a12', r: '#1a0e08', C: '#f8f4ec', c: '#d8d0c0', O: '#2a2a32', o: '#18181e',
    },
  },
};

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

function cast(scene) {
  return {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    lize: { get sprite() { return scene.lize; }, ...LIZE },
  };
}

// Lize behind her stand; the candles on the tables flickering.
export function setUpRestaurant(scene) {
  const { room } = scene;
  createVillager(scene, 'lize-px', LIZE.look, 1);
  const { x, y } = room.lize;
  scene.lize = scene.add.sprite(x, y, 'lize-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('lize-px-idle-left');
  [[35, 54], [121, 54], [35, 98]].forEach(([cx, cy]) => {
    const flame = scene.add.rectangle(cx, cy, 1, 2, 0xffc040).setOrigin(0).setDepth(200);
    scene.tweens.add({ targets: flame, alpha: 0.5, scaleY: 0.7, duration: 200 + Math.random() * 200, yoyo: true, repeat: -1 });
  });
}

// At the stand: talk to Lize.
export async function atLize(scene) {
  scene.player.face('right');
  scene.lize.play('lize-px-idle-down');
  lock(scene, true);
  const talk = steps => converse(scene, cast(scene), steps);
  if (hasFlag('tableBooked')) {
    await talk([['lize', { af: 'Sien julle vanaand om seweuur, Johan!', en: 'See you both tonight at seven, Jones!' }]]);
  } else if (!hasFlag('datePlan')) {
    await talk([
      ['lize', { af: 'Goeiemiddag! Ons is eers vanaand oop vir aandete.', en: "Good afternoon! We're only open for dinner tonight." }],
      ['jones', { af: 'Dankie, ek sal dit onthou.', en: "Thanks, I'll remember that." }],
    ]);
  } else {
    await talk([
      ['lize', { af: 'Goeiemiddag, meneer! Kan ek help?', en: 'Good afternoon, sir! Can I help?' }],
      ['jones', { af: 'Goeiemiddag! Ek wil graag ’n tafel vir twee bespreek, vir vanaand.', en: "Good afternoon! I'd like to book a table for two, for tonight." }],
      ['lize', { af: 'Vir vanaand… kom ek kyk.', en: "For tonight… let me see." }],
      async () => {
        // she leafs through the bookings book
        scene.lize.play('lize-px-idle-left');
        await new Promise(r => scene.time.delayedCall(1200, r));
        scene.lize.play('lize-px-idle-down');
      },
      ['lize', { af: 'Jy is gelukkig! Ons het nog net een tafel oop: die een by die venster. Seweuur?', en: "You're in luck! We've just one table left: the one by the window. Seven o'clock?" }],
      ['jones', { af: 'Seweuur is perfek.', en: "Seven is perfect." }],
      ['lize', { af: 'Op watter naam?', en: 'In what name?' }],
      ['jones', { af: 'Johan.', en: 'Jones.' }],
      () => setFlag('tableBooked'),
      ['lize', hasFlag('tuxedo')
        ? { af: 'Klaar bespreek! En mag ek sê, meneer, jy lyk baie deftig.', en: 'All booked! And may I say, sir, you look very smart.' }
        : { af: 'Klaar bespreek! O, en net een ding: vir aandete trek ons gaste formeel aan.', en: 'All booked! Oh, and just one thing: our dinner guests dress formally.' }],
    ]);
    if (!hasFlag('tuxedo')) await scene.think({ af: 'Formeel… nog ’n rede vir daai tuxedo.', en: 'Formal… another reason for that tuxedo.' });
    await dateReady(scene);
  }
  scene.lize.play('lize-px-idle-left');
  lock(scene, false);
}

// The table by the window.
export function atOurTable(scene) {
  scene.player.face('up');
  scene.think(hasFlag('tableBooked')
    ? { af: 'Ons tafel, by die venster. Perfek!', en: 'Our table, by the window. Perfect!' }
    : { af: '’n Mooi tafel by die venster.', en: 'A lovely table by the window.' });
}

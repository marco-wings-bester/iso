import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { createVillager } from './CharacterSprite.js';
import { dateReady } from './datePlan.js';
import { think } from './bubble.js';
import { walkSprite } from './bob.js';
import { hearts } from './steffi.js';

// The restaurant on the town square (ROOMS.restaurant): tables laid for
// dinner, and Lize at her stand by the door with the bookings book. On
// Saturday, with his date with Steffi tonight ('datePlan', src/datePlan.js),
// Johan books the table for two by the window, at seven ('tableBooked').
// (She mentions they dress up for dinner here: a tuxedo would be just the
// thing, src/tailor.js.) That evening, Johan comes in with Steffi
// (src/follower.js): Lize shows them to their table, they sit down to dinner
// and a glass of wine, and talk; then Steffi thanks him for a lovely evening,
// and Johan offers to walk her home ('walkHome'): to her door at the beach,
// where they say goodnight (src/beachDoors.js).

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
  if (scene.follower) scene.time.delayedCall(500, () => dinner(scene)); // (with Steffi, on their date)
}

const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

// Their seats, either side of the table by the window, facing each other,
// and the way there from the door; their plates and glasses on it.
const SEATS = {
  johan: { x: 105, y: 72, via: [{ x: 92, y: 120 }, { x: 94, y: 88 }] },
  steffi: { x: 138, y: 72, via: [{ x: 112, y: 120 }, { x: 148, y: 100 }, { x: 146, y: 80 }] },
};
const PLATES = [{ x: 114, y: 63 }, { x: 127, y: 63 }];

// Dinner with Steffi: to the table, sit, eat and talk, a toast; then she
// goes home.
async function dinner(scene) {
  const { player, follower } = scene;
  const steffi = follower.sprite;
  lock(scene, true);
  const cast2 = { ...cast(scene), steffi: { sprite: steffi, name: { af: 'Steffi', en: 'Steffi' }, color: '#c04a7a' } };
  const talk = steps => converse(scene, cast2, steps);
  scene.lize.play('lize-px-idle-down');
  await talk([
    ['lize', { af: 'Goeienaand, Johan en Steffi! Julle tafel by die venster is gereed. Kom maar saam.', en: 'Good evening, Jones and Steffi! Your table by the window is ready. Come this way.' }],
  ]);
  scene.lize.play('lize-px-idle-left');
  // to their chairs
  follower.pause();
  const { johan: J, steffi: S } = SEATS;
  await Promise.all([
    new Promise(r => player.follow([...J.via, J], r)),
    new Promise(r => walkSprite(scene, steffi, follower.key, [...S.via, { x: S.x, y: S.y }], player.speed, r)),
  ]);
  player.sprite.setPosition(J.x, J.y).setDepth(J.y);
  player.act('player-px-sit-right');
  steffi.setPosition(S.x, S.y).setDepth(S.y).play(`${follower.key}-sit-left`);
  await wait(scene, 600);
  // the food comes: a steak, veg, and a glass of red each
  const food = scene.add.graphics().setDepth(80);
  PLATES.forEach(({ x, y }) => {
    food.fillStyle(0x6a3a1e).fillRect(x - 2, y - 1, 3, 2);
    food.fillStyle(0x5f9e38).fillRect(x + 1, y - 1, 1, 1);
    food.fillStyle(0xf08a30).fillRect(x + 1, y, 1, 1);
  });
  const glasses = scene.add.graphics().setDepth(81);
  [[118, 62], [123, 62]].forEach(([x, y]) => glasses.fillStyle(0x2e1d0c).fillRect(x - 1, y - 3, 3, 4).fillStyle(0x8a1a2a).fillRect(x, y - 2, 1, 2));
  // now and then a bite
  const nibble = scene.time.addEvent({
    delay: 1300, loop: true,
    callback: () => scene.tweens.add({ targets: Math.random() < 0.5 ? player.sprite : steffi, y: '-=1', duration: 120, yoyo: true }),
  });
  await talk([
    ['lize', { af: 'Smaaklike ete!', en: 'Enjoy your meal!' }],
    ['steffi', { af: 'Mmm, die kos is heerlik!', en: 'Mmm, the food is delicious!' }],
    ['jones', { af: 'Amper so lekker soos Derik se braaihoender.', en: "Almost as good as Derek's braai chicken." }],
    ['steffi', { af: 'Vertel my, hoe het jy die fontein reggekry?', en: 'Tell me, how did you fix the fountain?' }],
    ['jones', { af: 'Met ’n wilgerstok van die rivier! Hy het my reguit na die lek gelei.', en: 'With a willow stick from the river! It led me straight to the leak.' }],
    ['steffi', { af: '’n Boer, ’n loodgieter, én ’n towenaar!', en: 'A farmer, a plumber, and a wizard!' }],
    () => hearts(scene, player.sprite),
    ['jones', { af: 'Op jou, Steffi.', en: 'To you, Steffi.' }],
    ['steffi', { af: 'Op ons. Gesondheid!', en: 'To us. Cheers!' }],
    () => { hearts(scene, steffi); hearts(scene, player.sprite); },
  ]);
  nibble.remove();
  await wait(scene, 800);
  food.clear(); // (all eaten)
  await talk([
    ['steffi', { af: 'Dankie vir ’n wonderlike aand, Johan.', en: 'Thank you for a wonderful evening, Jones.' }],
    ['jones', { af: 'Nee, dankie vir jóú. Ek het dit baie geniet.', en: 'No, thank yóú. I really enjoyed it.' }],
    ['jones', { af: 'Dis al donker buite… Kan ek saam met jou huis toe stap?', en: "It's dark out already… May I walk you home?" }],
    ['steffi', { af: 'Dis baie gaaf van jou, Johan. Ja, graag!', en: "That's very sweet of you, Jones. Yes, please!" }],
    () => hearts(scene, player.sprite),
  ]);
  setFlag('walkHome');
  glasses.destroy();
  // up from the table, and off they go together (src/follower.js)
  const { room } = scene;
  const { stand } = room.spots.ourTable;
  player.stop();
  Object.assign(player, { x: stand.x, y: stand.y });
  player.sprite.setPosition(stand.x, stand.y).setDepth(stand.y);
  player.face('down');
  steffi.setPosition(S.via[2].x, S.via[2].y + 6).setDepth(S.via[2].y + 6);
  follower.face('left');
  follower.resume();
  await think(scene, player.sprite, { af: 'Kom ons stap Steffi huis toe, strand toe.', en: "Let's walk Steffi home, down to the beach." });
  lock(scene, false);
}

// At the stand: talk to Lize.
export async function atLize(scene) {
  scene.player.face('right');
  scene.lize.play('lize-px-idle-down');
  lock(scene, true);
  const talk = steps => converse(scene, cast(scene), steps);
  if (hasFlag('dateDone')) {
    await talk([['lize', { af: 'Dankie dat julle by ons kom eet het! Nag, Johan.', en: 'Thanks for dining with us! Goodnight, Jones.' }]]);
  } else if (hasFlag('tableBooked')) {
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

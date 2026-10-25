import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { think } from './bubble.js';
import { park } from './bike.js';
import { voice, jones, nobody, inHouse, wait } from './doors.js';
import { steffiDressed, hearts } from './steffi.js';

// The houses along the road at the beach (BeachScene), to knock at
// (src/doors.js). The pink one is Steffi's: once Johan has his tuxedo for
// their date (src/tailor.js) she's home from the river, and asks him in for
// a glass of wine first (ROOMS.steffi, src/steffiHouse.js). At the others,
// nobody wants visitors just now, or nobody's home.

const STEFFI = { name: { af: 'Steffi', en: 'Steffi' }, color: '#c04a7a' };

export const HOUSES = [
  // the pink house, at the top of the road: Steffi's
  {
    id: 'steffi', area: { x: 700, y: 750, w: 245, h: 300 },
    via: [{ x: 884, y: 1036 }], door: { x: 885, y: 1012 }, rect: { x: 871, y: 937, w: 28, h: 76 }, stand: { x: 885, y: 1036 },
    answer: atSteffis,
    ownDoor: () => hasFlag('walkHome') && !hasFlag('dateDone'), // (walking her home: no knocking)
  },
  // the little light blue one beside it
  {
    id: 'blue1', area: { x: 480, y: 920, w: 220, h: 280 },
    via: [{ x: 700, y: 1212 }], door: { x: 636, y: 1192 }, stand: { x: 640, y: 1206 },
    answer: nobody,
  },
  // the blue one below: a baby just gone to sleep
  {
    id: 'blue2', area: { x: 375, y: 1160, w: 275, h: 320 },
    via: [{ x: 580, y: 1500 }], door: { x: 550, y: 1468 }, stand: { x: 553, y: 1484 },
    answer: (scene, h) => converse(scene, { mom: voice(h.door, { af: 'Agter die deur', en: 'Behind the door' }, '#3e72a0') }, [
      ['mom', { af: 'Sjuut! Die baba het nou net aan die slaap geraak. Nie nou nie, asseblief!', en: "Shh! The baby's only just gone to sleep. Not now, please!" }],
    ]),
  },
  // the yellow thatched one, over the road: sitting down to supper
  {
    id: 'yellow', area: { x: 1145, y: 700, w: 263, h: 350 },
    via: [{ x: 1100, y: 956 }], door: { x: 1202, y: 990 }, stand: { x: 1196, y: 1004 },
    answer: (scene, h) => converse(scene, { them: voice(h.door, { af: 'Agter die deur', en: 'Behind the door' }, '#a87040') }, [
      ['them', { af: 'Ons sit net aan tafel! Kom ’n ander keer, hoor!', en: "We're just sitting down to eat! Come another time, all right!" }],
    ]),
  },
];

export const beachHouseAt = (x, y) => inHouse(HOUSES, x, y);

// Steffi's door: before Saturday she's down at the river; dressed for their
// date, she opens up and asks him in (once he's booked their table);
// walking her home after dinner, they say goodnight at her door; on the date she's with him already;
// after it, she calls goodnight through the door.
async function atSteffis(scene, house) {
  const { door, rect } = house;
  const who = scene.player.sprite;
  if (hasFlag('dateDone')) {
    await converse(scene, { steffi: voice(door, STEFFI.name, STEFFI.color) }, [
      ['steffi', { af: 'Nag, Johan! Dankie vir ’n heerlike aand!', en: 'Goodnight, Jones! Thanks for a lovely evening!' }],
    ]);
    hearts(scene, who);
    return null;
  }
  if (hasFlag('walkHome')) return goodnight(scene, house);
  if (hasFlag('withSteffi')) {
    await think(scene, who, { af: 'Ons is op pad restaurant toe!', en: "We're on our way to the restaurant!" });
    return null;
  }
  if (!hasFlag('tuxedo')) return nobody(scene);
  const booked = hasFlag('tableBooked');
  // she opens the door, in her dress
  const k = scene.map.scale;
  const hall = scene.add.rectangle(rect.x, rect.y, rect.w, rect.h, 0x3a2418).setOrigin(0).setDepth(door.y - 1);
  const key = steffiDressed(scene);
  const steffi = scene.add.sprite(door.x, door.y, key).setOrigin(0.5, FEET_Y / FRAME_H).setScale(k).setDepth(door.y).play(`${key}-idle-down`);
  await wait(scene, 400);
  hearts(scene, who);
  const cast = { jones: jones(scene), steffi: { sprite: steffi, ...STEFFI } };
  if (!booked) {
    // (no table yet: off to book one first, src/restaurant.js)
    await converse(scene, cast, [
      ['steffi', { af: 'Johan! Jy’s vroeg! Het jy al vir ons ’n tafel bespreek?', en: "Jones! You're early! Have you booked us a table yet?" }],
      ['jones', { af: 'O… nog nie!', en: 'Oh… not yet!' }],
      ['steffi', { af: 'Gaan bespreek gou, dan kom drink ons eers ’n glasie wyn.', en: "Go and book one quickly, then come and have a glass of wine first." }],
    ]);
    steffi.destroy();
    hall.destroy();
    return null;
  }
  await converse(scene, cast, [
    ['steffi', { af: 'Johan! Kyk net hoe deftig lyk jy in jou tuxedo!', en: 'Jones! Just look how smart you are in your tuxedo!' }],
    ['jones', { af: 'En jy lyk pragtig, Steffi.', en: 'And you look beautiful, Steffi.' }],
    () => hearts(scene, who),
    ['steffi', { af: 'Ag, dankie! Kom binne, kom binne. Ons drink gou ’n glasie wyn voor ons gaan.', en: "Oh, thank you! Come in, come in. Let's have a glass of wine before we go." }],
  ]);
  // in after her
  park(scene, { x: house.stand.x - 40, y: house.stand.y });
  scene.leaving = true;
  scene.player.stop();
  const cam = scene.cameras.main;
  cam.fadeOut(250);
  cam.once('camerafadeoutcomplete', () => scene.scene.start('Interior', { building: 'steffi' }));
  return 'in';
}

// Walked home after dinner: goodnight on her doorstep, and in she goes
// ('dateDone'); Johan's tired out.
async function goodnight(scene, house) {
  const { player, follower } = scene;
  const steffi = follower?.sprite;
  if (!steffi) return null;
  follower.pause();
  const { door } = house;
  // she steps up beside him at her door
  await new Promise(r => scene.tweens.add({ targets: steffi, x: door.x + 30 * scene.map.scale, y: door.y + 10, duration: 500, onComplete: r }));
  steffi.setDepth(steffi.y);
  follower.face('left');
  player.face('right');
  const cast = { jones: jones(scene), steffi: { sprite: steffi, ...STEFFI } };
  await converse(scene, cast, [
    ['steffi', { af: 'Hier’s ek tuis. Dankie dat jy my huis toe gestap het, Johan.', en: "Here's home. Thank you for walking me home, Jones." }],
    ['jones', { af: 'Dit was ’n plesier. Dankie vir ’n wonderlike aand, Steffi.', en: 'It was a pleasure. Thank you for a wonderful evening, Steffi.' }],
    () => { hearts(scene, steffi); hearts(scene, player.sprite); },
    ['steffi', { af: 'Nag, Johan. Ek hoop ons sien mekaar gou weer.', en: 'Goodnight, Jones. I hope we see each other again soon.' }],
    ['jones', { af: 'Ek ook. Nag, Steffi.', en: 'Me too. Goodnight, Steffi.' }],
  ]);
  setFlag('dateDone');
  setFlag('tired');
  // in she goes
  await new Promise(r => scene.tweens.add({ targets: steffi, x: door.x, y: door.y, duration: 400, onComplete: r }));
  await new Promise(r => scene.tweens.add({ targets: steffi, alpha: 0, duration: 300, onComplete: r }));
  steffi.destroy();
  scene.follower = null;
  await think(scene, player.sprite, { af: 'Wat ’n aand… Nou is ek moeg. Tyd vir bed.', en: "What an evening… Now I'm tired. Time for bed." });
  return null;
}

import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { steffiDressed, hearts } from './steffi.js';
import { followMe } from './follower.js';

// Inside Steffi's beach house (ROOMS.steffi), on Saturday evening before
// their date: she pours them each a glass of red wine and they drink to the
// evening ('hadWine'); then he's free to look about her house: the photo on
// the wall, her shells and her jar of gold, her surfboard, the sea out of
// the window, her sofa. Once he's looked at the photo (her and her oupa,
// panning for gold), it's nearly seven: time to go ('dateGo'), and from
// then on she's with him wherever he goes ('withSteffi', src/follower.js)
// till dinner's done (src/restaurant.js). Not before: she won't hear of him
// leaving without finishing his wine.

const STEFFI = { name: { af: 'Steffi', en: 'Steffi' }, color: '#c04a7a' };

const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

function cast(scene) {
  return {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    steffi: { get sprite() { return scene.follower?.sprite ?? scene.steffi; }, ...STEFFI },
  };
}

// A glass of red wine (room px), for one of them to hold.
function glass(scene) {
  if (!scene.textures.exists('wine-glass')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x2e1d0c).fillRect(0, 0, 5, 8);
    g.fillStyle(0xe8f4f8).fillRect(1, 1, 3, 4).fillRect(2, 5, 1, 2).fillRect(1, 6, 3, 1);
    g.fillStyle(0x8a1a2a).fillRect(1, 2, 3, 3);
    g.generateTexture('wine-glass', 5, 8);
    g.destroy();
  }
  return scene.add.image(0, 0, 'wine-glass').setOrigin(0.5, 1);
}

export function setUpSteffiHouse(scene) {
  const { room } = scene;
  if (hasFlag('dateGo')) return; // (with him already: src/follower.js)
  const key = steffiDressed(scene, true);
  const { x, y } = room.steffi;
  scene.steffi = scene.add.sprite(x, y, key).setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play(`${key}-idle-left`);
  scene.steffiGlass = null;
  // (the glass on the table, till she pours)
  const onTable = glass(scene).setPosition(room.glass.x, room.glass.y).setDepth(room.glass.y + 12);
  if (hasFlag('hadWine')) {
    onTable.destroy();
    pourWine(scene, true);
    return;
  }
  scene.time.delayedCall(600, async () => {
    lock(scene, true);
    const { stand } = room.spots.wine;
    await new Promise(r => scene.player.walkTo(stand.x, stand.y, r));
    scene.player.face('right');
    onTable.destroy();
    await converse(scene, cast(scene), [
      ['steffi', { af: 'Welkom in my huisie! Hier, ’n glas rooiwyn vir jou.', en: 'Welcome to my little house! Here, a glass of red wine for you.' }],
      () => pourWine(scene),
      ['jones', { af: 'Dankie, Steffi. Op ’n mooi aand!', en: 'Thank you, Steffi. To a lovely evening!' }],
      ['steffi', { af: 'Op ’n mooi aand! Gesondheid!', en: 'To a lovely evening! Cheers!' }],
      () => clink(scene),
      ['steffi', { af: 'Kyk gerus rond, ek is amper reg. Net gou my oorbelle insit.', en: "Have a look around, I'm nearly ready. Just putting my earrings in." }],
      () => setFlag('hadWine'),
    ]);
    lock(scene, false);
    const hint = line('steffiLook');
    if (hint) scene.think(hint);
  });
}

// Their glasses: his in his hands (he carries it about: InteriorScene's
// `carry`), hers in her hand.
function pourWine(scene, quiet = false) {
  scene.carry = glass(scene);
  const s = scene.steffi;
  scene.steffiGlass = glass(scene).setPosition(s.x - 4, s.y - 7).setDepth(s.y + 0.5);
  if (!quiet) hearts(scene, scene.player.sprite);
}

// Glasses together: a sparkle, a sip, hearts.
async function clink(scene) {
  const { player } = scene;
  const at = { x: (player.x + scene.steffi.x) / 2, y: player.y - 16 };
  for (let i = 0; i < 6; i++) {
    const sp = scene.add.star(at.x, at.y, 4, 0.5, 2, 0xfff0a0).setDepth(1e3);
    scene.tweens.add({ targets: sp, x: at.x + (Math.random() - 0.5) * 16, y: at.y - 4 - Math.random() * 8, alpha: 0, duration: 600, onComplete: () => sp.destroy() });
  }
  hearts(scene, player.sprite);
  await wait(scene, 700);
}

// Looking about her house.
export async function atPortrait(scene) {
  scene.player.face('up');
  lock(scene, true);
  await (async () => {
    await think(scene, scene.player.sprite, { af: '’n Ou foto: ’n dogtertjie met rooi vlegsels en ’n oubaas, met ’n goudpan by die rivier…', en: 'An old photo: a little girl with red pigtails and an old man, with a gold pan by the river…' });
    if (hasFlag('dateGo')) return;
    await converse(scene, cast(scene), [
      ['steffi', { af: 'Dis ek en my oupa. Hy het my geleer om goud te pan.', en: 'That’s me and my oupa. He taught me to pan for gold.' }],
      ['jones', { af: 'Dis seker hoekom jy so lief is vir die rivier.', en: "That must be why you love the river so much." }],
      ['steffi', { af: 'Presies! O jinne, kyk hoe laat is dit! Dis amper seweuur. Ek dink ons moet nou gaan.', en: "Exactly! Oh goodness, look at the time! It's nearly seven. I think we ought to go now." }],
      ['jones', { af: 'Kom ons gaan!', en: "Let's go!" }],
    ]);
    // the glasses back on the table, and she's with him from here
    scene.carry?.destroy();
    scene.carry = null;
    scene.steffiGlass?.destroy();
    setFlag('dateGo');
    setFlag('withSteffi');
    const { x, y } = scene.steffi;
    scene.steffi.destroy();
    scene.steffi = null;
    followMe(scene)?.sprite.setPosition(x, y);
  })();
  lock(scene, false);
}

// Leaving before they're ready: she stops him.
export function stayForWine(scene) {
  if (hasFlag('dateGo') || !hasFlag('hadWine')) return null;
  return () => converse(scene, cast(scene), [
    ['steffi', { af: 'Haai, waarheen? Drink eers jou wyn klaar. Kyk gerus rond!', en: "Hey, where are you off to? Finish your wine first. Have a look around!" }],
  ]);
}

const LOOKS = {
  shelf: { af: 'Skulpe, ’n seester… en ’n flessie vol goudvlokkies! Sy is regtig goed met daai pan.', en: "Shells, a starfish… and a little jar full of gold flakes! She's really good with that pan." },
  surfboard: { af: '’n Branderplank. Sy ry seker die golwe hier voor die deur.', en: 'A surfboard. She must ride the waves right outside her door.' },
  seaWindow: { af: 'Die see, net hier onder. Wat ’n uitsig!', en: 'The sea, right down there. What a view!' },
  wine: { af: 'Die bottel rooiwyn.', en: 'The bottle of red wine.' },
};

export function lookAround(scene, what) {
  scene.player.face(what === 'surfboard' ? 'right' : 'up');
  scene.think(LOOKS[what]);
}

// Her sofa: he sits a moment (till a tap gets him up again).
export function atSofa(scene) {
  const { player, room } = scene;
  const { seat, stand } = room.spots.sofa;
  Object.assign(player, { x: seat.x, y: seat.y });
  player.sprite.setPosition(seat.x, seat.y).setDepth(seat.y + 10);
  player.act('player-px-sit-down', () => {
    Object.assign(player, { x: stand.x, y: stand.y });
    player.sprite.setPosition(stand.x, stand.y).setDepth(stand.y);
    player.face('down');
  });
  scene.think({ af: 'Lekker sag. Ek kan sien hoekom sy hier tuis voel.', en: 'Nice and soft. I can see why she feels at home here.' });
}

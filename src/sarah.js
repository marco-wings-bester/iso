import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { converse } from './dialog.js';
import { line } from './hints.js';
import { walkSprite } from './bob.js';
import { createBob, createSarah } from './CharacterSprite.js';

// When Bob has eaten the pie, someone knocks at the farmhouse door: his wife
// (Louise in English, Wiesie in Afrikaans; `sarah` in the code). Bob jumps up
// from the table — he should be out working — and it's up to Farmer Jones to
// hide him: tap the big chest in the corner and Bob hops in. Then she comes in
// for a chat (Jones's replies are picked from two each time). Asked if he's
// seen Bob, Jones can keep mum (she goes off to keep looking) or own up (she
// waits). Either way the chest is stuck fast: the crowbar from the tool shed
// prises it open, Bob climbs out, and home he goes, with her or alone. Lines
// move along with a tap. (In Afrikaans, the default, Jones is Boer Johan and
// Bob is Pieter: every line is { af, en }, src/i18n.js.)

const SPEED = 40; // room px/s, walking about
const SARAH = { name: { af: 'Wiesie', en: 'Louise' }, color: '#b0408a' };

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

const walk = (scene, sprite, key, route, speed = SPEED) => new Promise(r => walkSprite(scene, sprite, key, route, speed, r));

// Bob standing in his waiting spot, facing the room. (His sprite sheet may
// not be made yet, after a reload: the game picks up where it was saved.)
function standingBob(scene, x, y) {
  createBob(scene);
  return scene.add.sprite(x, y, 'bob-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('bob-px-idle-down');
}

// Who's talking, for converse(): sprites looked up when they speak.
function cast(scene) {
  const { room } = scene;
  const door = { x: room.door.x + room.door.w / 2, y: room.h, below: true }; // a voice outside it
  return {
    jones: { get sprite() { return scene.player.sprite; } },
    bob: { get sprite() { return scene.bob; } },
    sarah: { get sprite() { return scene.sarah; }, ...SARAH },
    knock: door,
    sarahOutside: { ...door, ...SARAH },
    // from inside the chest
    bobChest: {
      x: room.chest.inside.x, y: room.chest.inside.y - 2, name: { af: 'Pieter (in die kis)', en: 'Bob (in the chest)' }, color: '#447a34',
    },
    chest: { x: room.chest.inside.x, y: room.chest.inside.y - 2 },
  };
}

// Someone walking out of the farmhouse door and away (then gone).
async function goOut(scene, sprite, key) {
  const { room, player } = scene;
  const x = room.door.x + room.door.w / 2;
  const route = player.grid.findRoute(sprite.x, sprite.y, x, room.h - 14);
  await walk(scene, sprite, key, [...route, { x, y: room.h + 8 }]);
  sprite.destroy();
}

function standingSarah(scene, x, y, dir = 'down') {
  createSarah(scene);
  return scene.add.sprite(x, y, 'sarah-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play(`sarah-px-idle-${dir}`);
}

// Back in the farmhouse while Bob still needs hiding: there he is, waiting.
export function bobWaiting(scene) {
  const { x, y } = scene.room.bobWaits;
  const bob = standingBob(scene, x, y);
  scene.time.delayedCall(900, () => {
    if (!scene.busy) converse(scene, cast(scene), [['bob', { af: 'Gou, steek my weg!', en: 'Quick, hide me!' }]]);
  });
  return bob;
}

// The knock (once Bob has finished the pie, Jones in the house).
export async function knock(scene) {
  if (scene.leaving || hasFlag('sarahKnocked')) return;
  const { player, room } = scene;
  player.stop(); // and wakes him, if he's dozing
  lock(scene, true);
  scene.cameras.main.shake(300, 0.005);
  const sarahAnswers = [['sarahOutside', { af: 'Dis Wiesie!', en: "It's Louise!" }]];
  await converse(scene, cast(scene), [
    ['knock', { af: 'Klop, klop!', en: 'Knock, knock!' }],
    { choose: [
      { say: { af: 'Wie is dit?', en: 'Who is it?' }, then: sarahAnswers },
      { say: { af: 'Net ’n oomblik! Wie is daar?', en: "Just a minute! Who's there?" }, then: sarahAnswers },
    ] },
    // Bob jumps up from the table and steps out from behind it
    async () => {
      const { seat } = room.kitchen.table;
      scene.bob?.destroy();
      scene.bob = standingBob(scene, seat.x, seat.y + 4);
      await new Promise(r => scene.tweens.add({ targets: scene.bob, y: seat.y - 1, duration: 180, ease: 'Quad.easeOut', onComplete: r }));
      await walk(scene, scene.bob, 'bob-px', [{ x: seat.x + 12, y: seat.y - 2 }, room.bobWaits]);
      scene.bob.play('bob-px-idle-down');
    },
    ['bob', {
      af: 'O nee, ek wil nie hê my vrou moet my hier vang nie! Ek moet buite aan die werk wees. Gou, steek my weg!',
      en: "Oh no, I don't want my wife to catch me here! I should be out doing my work. Quick, hide me!",
    }],
  ]);
  setFlag('sarahKnocked');
  lock(scene, false);
  const hint = line('hideBob');
  if (hint) think(scene, player.sprite, hint);
}

// Tapping the chest while Sarah's at the door: Jones (beside it) lifts the
// lid, Bob hurries round behind it and hops in, and the lid goes down on him.
// Then Sarah comes in.
export async function hideBob(scene) {
  const { player, room } = scene;
  const { chest } = room;
  const bob = scene.bob;
  lock(scene, true);
  player.face('right');
  const open = scene.roomImage('chest-open', chest.open).setDepth(0.4);
  await walk(scene, bob, 'bob-px', player.grid.findRoute(bob.x, bob.y, chest.behind.x, chest.behind.y), SPEED * 1.5);
  bob.play('bob-px-idle-down');
  await converse(scene, cast(scene), [['bob', { af: 'Dankie, Johan!', en: 'Thanks, Jones!' }]]);
  // a hop up and down into the chest
  const { x, y } = chest.inside;
  await new Promise(r => scene.tweens.add({ targets: bob, x, y: y - 5, duration: 260, ease: 'Quad.easeOut', onComplete: r }));
  await new Promise(r => scene.tweens.add({ targets: bob, y: y + 4, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: r }));
  bob.destroy();
  scene.bob = null;
  await new Promise(r => scene.time.delayedCall(300, r));
  open.destroy();
  setFlag('bobHidden');
  bobInChest(scene);
  await think(scene, player.sprite, { af: 'Sjoe! Net betyds.', en: 'Phew! Just in time.' });
  await sarahVisits(scene);
}

// Bob in the chest: now and then the lid gives a little wobble (or when
// told to: `scene.wobbleChest()`), until he's out.
export function bobInChest(scene) {
  const lid = scene.roomImage('chest-lid', scene.room.chest.lid).setDepth(0.41);
  const x = lid.x;
  scene.chestLid = lid;
  scene.wobbleChest = () => scene.tweens.add({ targets: lid, x: x + 1, duration: 60, yoyo: true, repeat: 2 });
  scene.time.addEvent({ delay: 4200, loop: true, callback: () => scene.wobbleChest?.() });
}

// Sarah comes in, greets Jones and chats: the smell of pie, how clever he
// is, how Bob loves pie (the chest wobbles), and would he let her know if he
// sees Bob. Then she goes off to keep looking.
export async function sarahVisits(scene) {
  if (hasFlag('sarahVisited')) return;
  const { player, room } = scene;
  createSarah(scene);
  lock(scene, true);
  const doorX = room.door.x + room.door.w / 2;
  const meet = { sarah: { x: doorX - 8, y: room.h - 30 }, jones: { x: doorX + 12, y: room.h - 30 } };
  scene.sarah = standingSarah(scene, doorX, room.h + 6, 'up');
  // Jones goes to meet her as she comes in
  const jonesThere = new Promise((r) => {
    player.locked = true;
    player.walkTo(meet.jones.x, meet.jones.y, r);
    player.marker.clear();
  });
  await walk(scene, scene.sarah, 'sarah-px', [{ x: doorX, y: room.h - 14 }, meet.sarah]);
  scene.sarah.play('sarah-px-idle-right');
  await jonesThere;
  player.face('left');

  const bye = [['sarah', { af: 'Dankie, Johan. Totsiens!', en: 'Thank you, Jones. Bye now!' }]];
  await converse(scene, cast(scene), [
    ['sarah', { af: 'Hallo, Johan! Jammer dat ek so by jou inval.', en: 'Hello, Jones! Sorry to barge in on you.' }],
    { choose: [
      { say: { af: 'Hallo, Wiesie! Kom binne, kom binne.', en: 'Hello, Louise! Come in, come in.' }, then: [
        ['sarah', { af: 'Mmm! Wat ruik so lekker? Het jy ’n tert gebak?', en: "Mmm! What's that lovely smell? Have you been baking a pie?" }],
      ] },
      { say: { af: 'O! Wiesie! Wat ’n… verrassing.', en: 'Oh! Louise! What a… surprise.' }, then: [
        ['sarah', { af: 'Goeie genade, jy lyk skrikkerig! Mmm… ruik ek tert?', en: 'Goodness, you look jumpy! Mmm… is that pie I can smell?' }],
      ] },
    ] },
    { choose: [
      { say: { af: 'Appeltert. My eie resep!', en: 'Apple pie. My own recipe!' }, then: [
        ['sarah', {
          af: 'Ag, maar jy is slim! Dit ruik wonderlik. Jy is ’n puik bakker, Johan.',
          en: "Well, aren't you clever! It smells wonderful. You're a fine baker, Jones.",
        }],
      ] },
      { say: { af: 'Net ’n kleintjie. Dis niks besonders nie.', en: "Just a little one. It's nothing special." }, then: [
        ['sarah', {
          af: 'Moenie so beskeie wees nie! Dit ruik wonderlik. Jy is ’n puik bakker, Johan.',
          en: "Don't be modest! It smells wonderful. You're a fine baker, Jones.",
        }],
      ] },
    ] },
    async () => scene.wobbleChest?.(),
    ['sarah', { af: 'Pieter sou dit geniet het. Daai man is mal oor tert!', en: 'Bob would have loved it. That man really loves pie!' }],
    { choose: [
      { say: { af: 'Is hy? Ek het geen idee gehad nie.', en: 'Does he now? I had no idea.' }, then: [
        ['sarah', { af: 'O, ja. Hy sal enigiets doen vir ’n stukkie tert.', en: "Oh, yes. He'd do anything for a slice of pie." }],
      ] },
      { say: { af: 'Ha… ja… almal hou van tert.', en: 'Ha… yes… everyone loves pie.' }, then: [
        ['sarah', { af: 'Nie soos Pieter nie!', en: 'Not like Bob does!' }],
      ] },
    ] },
    ['sarah', {
      af: 'Van Pieter gepraat, hy moet eintlik ons heining regmaak. Het jy hom gesien?',
      en: "Speaking of Bob, he's meant to be mending our fence. Have you seen him?",
    }],
    { choose: [
      // keep mum: she goes off to keep looking
      { say: { af: 'Pieter? Nee, nie vandag nie.', en: 'Bob? Not today, no.' }, then: [
        ['sarah', { af: 'Hmm. Nou ja, as jy hom sien, laat weet my, sal jy?', en: "Hmm. Well, if you see him, let me know, won't you?" }],
        { choose: [
          { say: { af: 'Natuurlik, Wiesie. Ek sê jou dadelik.', en: "Of course, Louise. I'll tell you straight away." }, then: bye },
          { say: { af: 'Ek sal my oë oophou!', en: "I'll keep my eyes peeled!" }, then: bye },
        ] },
      ] },
      // own up: she waits for him to come out
      { say: { af: 'Ag, ek kan nie vir jou jok nie… hy kruip in die kis weg!', en: "Oh, I can't lie to you… he's hiding in the chest!" }, then: [
        async () => {
          setFlag('toldSarah');
          scene.wobbleChest?.();
        },
        ['sarah', { af: 'In die KIS?! Pieter! Kom dadelik daar uit!', en: 'In the CHEST?! Bob! Come out of there this minute!' }],
        ['bobChest', { af: 'Mmmf… jammer, skat!', en: 'Mmmph… sorry, dear!' }],
        ['sarah', { af: 'Nou moenie net daar staan nie, Johan. Maak oop!', en: "Well, don't just stand there, Jones. Open it!" }],
      ] },
    ] },
  ]);

  if (hasFlag('toldSarah')) {
    // she waits by the chest
    await walk(scene, scene.sarah, 'sarah-px', player.grid.findRoute(scene.sarah.x, scene.sarah.y, room.sarahWaits.x, room.sarahWaits.y));
    scene.sarah.play('sarah-px-idle-right');
    setFlag('sarahVisited');
    lock(scene, false);
    return;
  }
  // off she goes, out of the door
  await goOut(scene, scene.sarah, 'sarah-px');
  scene.sarah = null;
  setFlag('sarahVisited');
  lock(scene, false);
  think(scene, player.sprite, { af: 'Sjoe… sy is weg.', en: "Phew… she's gone." });
}

// Back in the farmhouse with Sarah still waiting for the chest to be opened.
export function sarahWaiting(scene) {
  const { x, y } = scene.room.sarahWaits;
  scene.sarah = standingSarah(scene, x, y, 'right');
  scene.time.delayedCall(900, () => {
    if (!scene.busy) converse(scene, cast(scene), [['sarah', { af: 'En, Johan? Is dit al oop?', en: 'Well, Jones? Is it open yet?' }]]);
  });
}

// Tapping the chest once Sarah's been: it's stuck fast — until he has the
// crowbar to prise it open. Then Bob climbs out and goes home, with Sarah if
// she's waiting.
export async function openChest(scene) {
  const { player, room } = scene;
  const { chest } = room;
  lock(scene, true);
  if (!hasFlag('crowbar')) {
    await think(scene, player.sprite, { af: 'Hè? Dit wil nie roer nie… die deksel sit styf vas!', en: "Huh? It won't budge… the lid's stuck fast!" });
    scene.wobbleChest?.();
    await converse(scene, cast(scene), [
      ['bobChest', { af: 'Mmmf! Kry my hier uit, Johan!', en: 'Mmmph! Get me out of here, Jones!' }],
      ...(scene.sarah ? [['sarah', { af: 'Vas? Ag, goeie genade!', en: "Stuck? Oh, for goodness' sake!" }]] : []),
    ]);
    setFlag('chestStuck');
    lock(scene, false);
    const hint = line('chestStuck');
    if (hint) think(scene, player.sprite, hint);
    return;
  }

  // prise it open: the crowbar in the lid's seam, levered until it gives
  await think(scene, player.sprite, hasFlag('chestStuck')
    ? { af: 'Reg. Kom ons kry dit oop!', en: "Right. Let's get this open!" }
    : { af: 'Vas? Gelukkig het ek hierdie koevoet!', en: "Stuck? Good thing I've got this crowbar!" });
  const bar = scene.roomImage('chest-crowbar', chest.bar).setOrigin(0.9, 0.5).setPosition(chest.bar.at.x, chest.bar.at.y)
    .setAngle(25).setDepth(chest.bar.at.y + 20);
  for (let i = 0; i < 3; i++) {
    await new Promise(r => scene.tweens.add({ targets: bar, angle: 5, duration: 220, yoyo: true, ease: 'Sine.easeInOut', onComplete: r }));
    scene.wobbleChest?.();
  }
  await converse(scene, cast(scene), [['chest', { af: 'Kraak… KRAK!', en: 'Creak… CRACK!' }]]);
  bar.destroy();
  scene.chestLid?.setVisible(false);
  const open = scene.roomImage('chest-open', chest.open).setDepth(0.4);

  // out pops Bob
  const { x, y } = chest.inside;
  createBob(scene);
  const bob = scene.add.sprite(x, y + 4, 'bob-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y + 4).setAlpha(0).play('bob-px-idle-down');
  scene.bob = bob;
  await new Promise(r => scene.tweens.add({ targets: bob, y: y - 6, alpha: 1, duration: 300, ease: 'Quad.easeOut', onComplete: r }));
  await new Promise(r => scene.tweens.add({ targets: bob, y: chest.behind.y, duration: 220, ease: 'Quad.easeIn', onComplete: r }));
  bob.setDepth(chest.behind.y);
  open.destroy();
  scene.chestLid?.setVisible(true);
  scene.wobbleChest = null;

  const thanks = ['bob', {
    af: 'Dankie vir die tert, Johan. Die beste tert wat ek nog ooit geëet het!',
    en: 'Thanks for the pie, Jones. Best pie I ever had!',
  }];
  const sarah = scene.sarah;
  if (sarah) {
    await converse(scene, cast(scene), [
      ['bob', { af: 'Hallo, skat… mooi dag, nè?', en: "Hello, dear… lovely day, isn't it?" }],
      ['sarah', { af: 'Pieter! Wegkruip in ’n kis? Jy moet ons heining regmaak!', en: "Bob! Hiding in a chest? You're meant to be mending our fence!" }],
      { choose: [
        { say: {
          af: 'Moenie kwaad wees nie, Wiesie. Dit was my tert wat hom hier gehou het.',
          en: "Don't be cross, Louise. It was my pie that kept him.",
        }, then: [
          ['sarah', { af: 'Hmf. Nou ja… dit hét baie lekker geruik.', en: 'Hmph. Well… it did smell very good.' }],
        ] },
        { say: { af: 'Hy het wel vanoggend ’n jakkals by my henne weggejaag…', en: 'He did chase a fox off my hens this morning…' }, then: [
          ['sarah', { af: 'Regtig? Hmf. Nou ja, dit was gaaf van hom.', en: 'Did he now? Hmph. Well, that was good of him.' }],
        ] },
      ] },
      thanks,
      ['sarah', { af: 'Kom, Pieter. Huis toe, en daai heining!', en: 'Come along, Bob. Home, and that fence!' }],
    ]);
    // home they go, Sarah following Bob out
    const bobGoes = goOut(scene, bob, 'bob-px');
    await new Promise(r => scene.time.delayedCall(500, r));
    await goOut(scene, sarah, 'sarah-px');
    await bobGoes;
  } else {
    await converse(scene, cast(scene), [
      ['bob', {
        af: 'Sjoe! Dankie, Johan! Ek het gedink ek sit vir altyd daarin vas. Is sy weg?',
        en: 'Phew! Thanks, Jones! I thought I was stuck in there for good. Is she gone?',
      }],
      { choose: [
        { say: { af: 'Sy is weg. Jy is veilig… vir eers.', en: "She's gone. You're safe… for now." }, then: [
          ['bob', {
            af: 'Dan moet ek liewer huis toe gaan en daai heining regmaak voor sy uitvind!',
            en: "Then I'd best get home and mend that fence before she finds out!",
          }],
        ] },
        { say: { af: 'Sy soek jou oral!', en: "She's out looking for you everywhere!" }, then: [
          ['bob', { af: 'O-o! Ek moet gou huis toe gaan en daai heining regmaak!', en: "Uh-oh! I'd best get home and mend that fence, quick!" }],
        ] },
      ] },
      thanks,
    ]);
    await goOut(scene, bob, 'bob-px');
  }
  scene.bob = null;
  scene.sarah = null;
  setFlag('bobHome');
  lock(scene, false);
  think(scene, player.sprite, { af: 'Wat ’n dag!', en: 'What a day!' });
}

import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { converse } from './dialog.js';
import { line } from './hints.js';
import { walkSprite } from './bob.js';
import { createBob, createSarah } from './CharacterSprite.js';

// When Bob has eaten the pie, someone knocks at the farmhouse door: Sarah,
// Bob's wife. Bob jumps up from the table — he should be out working — and
// it's up to Farmer Jones to hide him: tap the big chest in the corner and
// Bob hops in. Then Sarah comes in for a chat (Jones's replies are picked
// from two each time). Asked if he's seen Bob, Jones can keep mum (she goes
// off to keep looking) or own up (she waits). Either way the chest is stuck
// fast: the crowbar from the tool shed prises it open, Bob climbs out, and
// home he goes, with Sarah or alone. Lines move along with a tap.

const SPEED = 40; // room px/s, walking about
const SARAH = { name: 'Sarah', color: '#b0408a' };

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
    bobChest: { x: room.chest.inside.x, y: room.chest.inside.y - 2, name: 'Bob (in the chest)', color: '#447a34' },
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
    if (!scene.busy) converse(scene, cast(scene), [['bob', 'Quick, hide me!']]);
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
  const sarahAnswers = [['sarahOutside', "It's Sarah!"]];
  await converse(scene, cast(scene), [
    ['knock', 'Knock, knock!'],
    { choose: [
      { say: 'Who is it?', then: sarahAnswers },
      { say: "Just a minute! Who's there?", then: sarahAnswers },
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
    ['bob', "Oh no, I don't want my wife to catch me here! I should be out doing my work. Quick, hide me!"],
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
  await converse(scene, cast(scene), [['bob', 'Thanks, Jones!']]);
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
  await think(scene, player.sprite, 'Phew! Just in time.', 1600);
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

  await converse(scene, cast(scene), [
    ['sarah', 'Hello, Jones! Sorry to barge in on you.'],
    { choose: [
      { say: 'Hello, Sarah! Come in, come in.', then: [
        ['sarah', "Mmm! What's that lovely smell? Have you been baking a pie?"],
      ] },
      { say: 'Oh! Sarah! What a… surprise.', then: [
        ['sarah', 'Goodness, you look jumpy! Mmm… is that pie I can smell?'],
      ] },
    ] },
    { choose: [
      { say: 'Apple pie. My own recipe!', then: [
        ['sarah', "Well, aren't you clever! It smells wonderful. You're a fine baker, Jones."],
      ] },
      { say: "Just a little one. It's nothing special.", then: [
        ['sarah', "Don't be modest! It smells wonderful. You're a fine baker, Jones."],
      ] },
    ] },
    async () => scene.wobbleChest?.(),
    ['sarah', 'Bob would have loved it. That man really loves pie!'],
    { choose: [
      { say: 'Does he now? I had no idea.', then: [
        ['sarah', "Oh, yes. He'd do anything for a slice of pie."],
      ] },
      { say: 'Ha… yes… everyone loves pie.', then: [
        ['sarah', 'Not like Bob does!'],
      ] },
    ] },
    ['sarah', "Speaking of Bob, he's meant to be mending our fence. Have you seen him?"],
    { choose: [
      // keep mum: she goes off to keep looking
      { say: 'Bob? Not today, no.', then: [
        ['sarah', "Hmm. Well, if you see him, let me know, won't you?"],
        { choose: [
          { say: "Of course, Sarah. I'll tell you straight away.", then: [['sarah', 'Thank you, Jones. Bye now!']] },
          { say: "I'll keep my eyes peeled!", then: [['sarah', 'Thank you, Jones. Bye now!']] },
        ] },
      ] },
      // own up: she waits for him to come out
      { say: "Oh, I can't lie to you… he's hiding in the chest!", then: [
        async () => {
          setFlag('toldSarah');
          scene.wobbleChest?.();
        },
        ['sarah', 'In the CHEST?! Bob! Come out of there this minute!'],
        ['bobChest', 'Mmmph… sorry, dear!'],
        ['sarah', "Well, don't just stand there, Jones. Open it!"],
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
  think(scene, player.sprite, 'Phew… she\'s gone.');
}

// Back in the farmhouse with Sarah still waiting for the chest to be opened.
export function sarahWaiting(scene) {
  const { x, y } = scene.room.sarahWaits;
  scene.sarah = standingSarah(scene, x, y, 'right');
  scene.time.delayedCall(900, () => {
    if (!scene.busy) converse(scene, cast(scene), [['sarah', 'Well, Jones? Is it open yet?']]);
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
    await think(scene, player.sprite, "Huh? It won't budge… the lid's stuck fast!", 2200);
    scene.wobbleChest?.();
    await converse(scene, cast(scene), [
      ['bobChest', 'Mmmph! Get me out of here, Jones!'],
      ...(scene.sarah ? [['sarah', "Stuck? Oh, for goodness' sake!"]] : []),
    ]);
    setFlag('chestStuck');
    lock(scene, false);
    const hint = line('chestStuck');
    if (hint) think(scene, player.sprite, hint);
    return;
  }

  // prise it open: the crowbar in the lid's seam, levered until it gives
  await think(scene, player.sprite, hasFlag('chestStuck') ? "Right. Let's get this open!" : "Stuck? Good thing I've got this crowbar!", 1600);
  const bar = scene.roomImage('chest-crowbar', chest.bar).setOrigin(0.9, 0.5).setPosition(chest.bar.at.x, chest.bar.at.y)
    .setAngle(25).setDepth(chest.bar.at.y + 20);
  for (let i = 0; i < 3; i++) {
    await new Promise(r => scene.tweens.add({ targets: bar, angle: 5, duration: 220, yoyo: true, ease: 'Sine.easeInOut', onComplete: r }));
    scene.wobbleChest?.();
  }
  await converse(scene, cast(scene), [['chest', 'Creak… CRACK!']]);
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

  const sarah = scene.sarah;
  if (sarah) {
    await converse(scene, cast(scene), [
      ['bob', "Hello, dear… lovely day, isn't it?"],
      ['sarah', "Bob! Hiding in a chest? You're meant to be mending our fence!"],
      { choose: [
        { say: "Don't be cross, Sarah. It was my pie that kept him.", then: [
          ['sarah', 'Hmph. Well… it did smell very good.'],
        ] },
        { say: 'He did chase a fox off my hens this morning…', then: [
          ['sarah', 'Did he now? Hmph. Well, that was good of him.'],
        ] },
      ] },
      ['bob', 'Thanks for the pie, Jones. Best pie I ever had!'],
      ['sarah', 'Come along, Bob. Home, and that fence!'],
    ]);
    // home they go, Sarah following Bob out
    const bobGoes = goOut(scene, bob, 'bob-px');
    await new Promise(r => scene.time.delayedCall(500, r));
    await goOut(scene, sarah, 'sarah-px');
    await bobGoes;
  } else {
    await converse(scene, cast(scene), [
      ['bob', 'Phew! Thanks, Jones! I thought I was stuck in there for good. Is she gone?'],
      { choose: [
        { say: "She's gone. You're safe… for now.", then: [
          ['bob', "Then I'd best get home and mend that fence before she finds out!"],
        ] },
        { say: "She's out looking for you everywhere!", then: [
          ['bob', "Uh-oh! I'd best get home and mend that fence, quick!"],
        ] },
      ] },
      ['bob', 'Thanks for the pie, Jones. Best pie I ever had!'],
    ]);
    await goOut(scene, bob, 'bob-px');
  }
  scene.bob = null;
  scene.sarah = null;
  setFlag('bobHome');
  lock(scene, false);
  think(scene, player.sprite, 'What a day!');
}

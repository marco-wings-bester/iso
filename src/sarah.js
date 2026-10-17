import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { converse } from './dialog.js';
import { line } from './hints.js';
import { walkSprite } from './bob.js';
import { createSarah } from './CharacterSprite.js';

// When Bob has eaten the pie, someone knocks at the farmhouse door: Sarah,
// Bob's wife. Bob jumps up from the table — he should be out working — and
// it's up to Farmer Jones to hide him: tap the big chest in the corner and
// Bob hops in. Then Sarah comes in for a chat (Jones's replies are picked
// from two each time), and off she goes to keep looking for Bob.
// Lines move along with a tap.

const SPEED = 40; // room px/s, walking about
const SARAH = { name: 'Sarah', color: '#b0408a' };

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

const walk = (scene, sprite, key, route, speed = SPEED) => new Promise(r => walkSprite(scene, sprite, key, route, speed, r));

// Bob standing in his waiting spot, facing the room.
function standingBob(scene, x, y) {
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
  };
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
// told to: `scene.wobbleChest()`).
export function bobInChest(scene) {
  const lid = scene.roomImage('chest-lid', scene.room.chest.lid).setDepth(0.41);
  scene.wobbleChest = () => scene.tweens.add({ targets: lid, x: lid.x + 1, duration: 60, yoyo: true, repeat: 2 });
  scene.time.addEvent({ delay: 4200, loop: true, callback: scene.wobbleChest });
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
  scene.sarah = scene.add.sprite(doorX, room.h + 6, 'sarah-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(room.h);
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
      { say: 'Bob? Not today, no.', then: [
        ['sarah', "Hmm. Well, if you see him, let me know, won't you?"],
      ] },
      { say: "I… er… haven't seen a thing!", then: [
        ['sarah', "Hmm. Well, if you do see him, let me know, won't you?"],
      ] },
    ] },
    { choose: [
      { say: "Of course, Sarah. I'll tell you straight away.", then: [['sarah', 'Thank you, Jones. Bye now!']] },
      { say: "I'll keep my eyes peeled!", then: [['sarah', 'Thank you, Jones. Bye now!']] },
    ] },
  ]);

  // off she goes, out of the door
  await walk(scene, scene.sarah, 'sarah-px', [{ x: doorX, y: room.h - 14 }, { x: doorX, y: room.h + 8 }]);
  scene.sarah.destroy();
  scene.sarah = null;
  setFlag('sarahVisited');
  lock(scene, false);
  think(scene, player.sprite, 'Phew… she\'s gone.');
}

import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { say, think } from './bubble.js';
import { line } from './hints.js';
import { walkSprite } from './bob.js';

// When Bob has eaten the pie, someone knocks at the farmhouse door. "Who is
// it?" "It's Sarah!" — Bob's wife. Bob jumps up from the table: he should be
// out working. It's up to Farmer Jones to hide him: tap the big chest in the
// corner and Bob climbs in. Taps cut the lines short while they talk.

const BOB_SPEED = 40; // room px/s
const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

function lock(scene, on) {
  scene.busy = on;
  scene.skippable = on;
  scene.player.locked = on;
}

// Bob standing in his waiting spot, facing the room.
function standingBob(scene, x, y) {
  return scene.add.sprite(x, y, 'bob-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('bob-px-idle-down');
}

// Back in the farmhouse while Bob still needs hiding: there he is, waiting.
export function bobWaiting(scene) {
  const { x, y } = scene.room.bobWaits;
  const bob = standingBob(scene, x, y);
  scene.time.delayedCall(900, () => { if (!scene.busy) say(scene, bob, 'Quick, hide me!'); });
  return bob;
}

// The knock (once Bob has finished the pie, Jones in the house).
export async function knock(scene) {
  if (scene.leaving || hasFlag('sarahKnocked')) return;
  const { player, room } = scene;
  const door = { x: room.door.x + room.door.w / 2, y: room.h }; // the voice is outside it
  player.stop(); // and wakes him, if he's dozing
  lock(scene, true);
  scene.cameras.main.shake(300, 0.005);
  await say(scene, door, 'Knock, knock!', { ms: 1600, below: true });
  player.face('down');
  await say(scene, player.sprite, 'Who is it?');
  await say(scene, door, "It's Sarah!", { name: 'Sarah', color: '#b0408a', below: true });

  // Bob jumps up from the table and steps out from behind it
  const { seat } = room.kitchen.table;
  scene.bob?.destroy();
  const bob = standingBob(scene, seat.x, seat.y + 4);
  scene.bob = bob;
  await new Promise(r => scene.tweens.add({ targets: bob, y: seat.y - 1, duration: 180, ease: 'Quad.easeOut', onComplete: r }));
  await new Promise(r => walkSprite(scene, bob, 'bob-px', [{ x: seat.x + 12, y: seat.y - 2 }, room.bobWaits], BOB_SPEED, r));
  bob.play('bob-px-idle-down');
  await say(scene, bob, "Oh no, I don't want my wife to catch me here! I should be out doing my work. Quick, hide me!");

  setFlag('sarahKnocked');
  lock(scene, false);
  const hint = line('hideBob');
  if (hint) think(scene, player.sprite, hint);
}

// Tapping the chest while Sarah's at the door: Jones (beside it) lifts the
// lid, Bob hurries round behind it and hops in, and the lid goes down on him.
export async function hideBob(scene) {
  const { player, room } = scene;
  const { chest } = room;
  const bob = scene.bob;
  lock(scene, true);
  scene.skippable = false;
  player.face('right');
  const open = scene.roomImage('chest-open', chest.open).setDepth(0.4);
  await say(scene, player.sprite, 'In here, Bob!', { ms: 1200 });
  const route = player.grid.findRoute(bob.x, bob.y, chest.behind.x, chest.behind.y);
  await new Promise(r => walkSprite(scene, bob, 'bob-px', route, BOB_SPEED * 1.5, r));
  bob.play('bob-px-idle-down');
  await say(scene, bob, 'Thanks, Jones!', { ms: 1200 });
  // a hop up and down into the chest
  const { x, y } = chest.inside;
  await new Promise(r => scene.tweens.add({ targets: bob, x, y: y - 5, duration: 260, ease: 'Quad.easeOut', onComplete: r }));
  await new Promise(r => scene.tweens.add({ targets: bob, y: y + 4, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: r }));
  bob.destroy();
  scene.bob = null;
  await wait(scene, 300);
  open.destroy();
  setFlag('bobHidden');
  bobInChest(scene);
  lock(scene, false);
  think(scene, player.sprite, 'Phew! Just in time.');
}

// Bob in the chest: now and then the lid gives a little wobble.
export function bobInChest(scene) {
  const lid = scene.roomImage('chest-lid', scene.room.chest.lid).setDepth(0.41);
  scene.time.addEvent({
    delay: 4200,
    loop: true,
    callback: () => scene.tweens.add({ targets: lid, x: lid.x + 1, duration: 60, yoyo: true, repeat: 2 }),
  });
}

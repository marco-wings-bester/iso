import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { createVillager } from './CharacterSprite.js';

// Inside the Cozy Seaside Cafe at the beach (ROOMS.cafe): Sannie (Sally in
// English) behind the counter, the coffee machine steaming. Boer Johan comes
// in wanting a coffee; at the counter he orders one, checks his wallet (his
// view of it, ViewScene 'wallet') and finds he hasn't a cent in cash
// ('noCash'). Sannie doesn't mind: come back when he has some.

const SANNIE = { name: { af: 'Sannie', en: 'Sally' }, color: '#2a7ab0' };
const LOOK = {
  hair: 'bob', skirt: true,
  palette: {
    S: '#f8c8a0', s: '#d89870', B: '#7a4a2a', d: '#4a2a14',
    R: '#4a3020', r: '#2e1c10', C: '#f8c850', c: '#d09c30', O: '#2a7ab0', o: '#1e5a88',
  },
};

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

function cast(scene) {
  return {
    jones: { get sprite() { return scene.player.sprite; } },
    sannie: { get sprite() { return scene.sannie; }, ...SANNIE },
  };
}

// Sannie at her place behind the counter, its front drawn over her; steam
// curling up off the coffee machine. And, coming in, he's after a coffee.
export function setUpCafe(scene) {
  const { room } = scene;
  createVillager(scene, 'sannie-px', LOOK, 1);
  const { x, y } = room.sannie;
  scene.sannie = scene.add.sprite(x, y, 'sannie-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('sannie-px-idle-down');
  scene.roomImage('cafe-counter', room.counter).setDepth(room.counter.depth);
  scene.time.addEvent({
    delay: 380, loop: true,
    callback: () => {
      const { x: sx, y: sy } = room.steam;
      const wisp = scene.add.rectangle(sx + Math.random() * 4 - 2, sy, 2, 2, 0xffffff, 0.8).setDepth(room.counter.depth + 1);
      scene.tweens.add({ targets: wisp, y: sy - 10 - Math.random() * 5, x: wisp.x + Math.random() * 4 - 2, alpha: 0, duration: 1500, onComplete: () => wisp.destroy() });
    },
  });
  // now and then she looks up from her work
  const look = () => scene.time.delayedCall(3000 + Math.random() * 4000, () => {
    if (!scene.busy) {
      scene.sannie.play(`sannie-px-idle-${Math.random() < 0.5 ? 'left' : 'right'}`);
      scene.time.delayedCall(1200, () => scene.sannie.play('sannie-px-idle-down'));
    }
    look();
  });
  look();
  if (!hasFlag('noCash')) {
    scene.time.delayedCall(700, () => {
      if (!scene.busy && !scene.thought) scene.think({ af: 'Mmm, dit ruik na vars koffie! Ek wil vir my ’n koppie koop.', en: "Mmm, fresh coffee! I'd like to buy myself a cup." });
    });
  }
}

// At the counter: order a coffee, and find out he can't pay for it.
export async function atCounter(scene) {
  const { player, sannie } = scene;
  player.face('up');
  sannie.play('sannie-px-idle-down');
  lock(scene, true);
  if (hasFlag('noCash')) {
    await converse(scene, cast(scene), [
      ['sannie', { af: 'En? Het jy al geld gekry?', en: 'Well? Got some money yet?' }],
      () => scene.think({ af: 'Nog nie… my beursie is nog leeg.', en: 'Not yet… my wallet is still empty.' }),
    ]);
    lock(scene, false);
    return;
  }
  const price = [['sannie', { af: 'Een koffie, kom reg! Dis R15, asseblief.', en: "One coffee, coming up! That's R15, please." }]];
  await converse(scene, cast(scene), [
    ['sannie', { af: 'Welkom by die Cozy Seaside Cafe! Wat kan ek vir jou kry?', en: 'Welcome to the Cozy Seaside Cafe! What can I get you?' }],
    { choose: [
      { say: { af: '’n Koppie koffie, asseblief.', en: 'A cup of coffee, please.' }, then: price },
      { say: { af: 'Een koffie, sterk en soet!', en: 'One coffee, strong and sweet!' }, then: price },
    ] },
    () => scene.think({ af: 'Kom ek kyk in my beursie…', en: 'Let me check my wallet…' }),
    () => scene.lookInWallet(),
    async () => setFlag('noCash'),
    { choose: [
      { say: { af: 'Jammer, ek het nie kontant nie…', en: "Sorry, I haven't got any cash…" } },
      { say: { af: 'Ehm… kan ek later betaal?', en: 'Um… can I pay later?' } },
    ] },
    ['sannie', {
      af: 'Ag, toe maar. Kom terug as jy geld het, dan maak ek vir jou ’n lekker koppie.',
      en: "Oh, never mind. Come back when you've got some money, and I'll make you a lovely cup.",
    }],
  ]);
  lock(scene, false);
}

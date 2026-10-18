import Phaser from 'phaser';
import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag, clearFlag } from './state.js';
import { bike } from './bike.js';
import { converse } from './dialog.js';
import { createVillager } from './CharacterSprite.js';
import { obj } from './pixelArt.js';
import { line } from './hints.js';

// Inside the Cozy Seaside Cafe at the beach (ROOMS.cafe): Sannie (Sally in
// English) behind the counter, the coffee machine steaming. Boer Johan comes
// in wanting a coffee; at the counter he orders one, checks his wallet (his
// view of it, ViewScene 'wallet') and finds he hasn't a cent in cash
// ('noCash'). Sannie doesn't mind: come back when he has some. Once Derik
// has lent him R15 ('loan', src/derik.js), he pays, she makes it, and he
// carries his steaming cup about ('coffee'): he can sit down at a table with
// it, sipping, or look out of the window at the garden behind the cafe
// (ViewScene 'garden'). Out of the door, it's finished ('coffeeDone'), and
// at the beach he says how wide awake he is (BeachScene).

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
  const thought = !hasFlag('noCash')
    ? { af: 'Mmm, dit ruik na vars koffie! Ek wil vir my ’n koppie koop.', en: "Mmm, fresh coffee! I'd like to buy myself a cup." }
    : hasFlag('loan') && !hasFlag('coffee') && { af: 'Nou kan ek my koffie koop!', en: 'Now I can buy my coffee!' };
  if (thought) {
    scene.time.delayedCall(700, () => {
      if (!scene.busy && !scene.thought) scene.think(thought);
    });
  }
}

// A cup of coffee, a few room px across.
function cup(scene, x, y) {
  if (!scene.textures.exists('coffee-cup')) {
    const tex = scene.textures.createCanvas('coffee-cup', 8, 7);
    obj(tex.getContext(), 1, 1, 6, 5, (r) => {
      r(0, 0, 5, 5, '#f8f0e0'); r(5, 1, 1, 2, '#f8f0e0'); r(3, 1, 2, 4, '#d8ccb8');
      r(1, 0, 3, 1, '#6a3a1e');
    });
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return scene.add.image(x, y, 'coffee-cup').setOrigin(0.5, 1);
}

// A wisp of steam off a cup (or the machine) at (x, y).
function wisp(scene, x, y, depth) {
  const w = scene.add.rectangle(x + Math.random() * 2 - 1, y, 1.5, 1.5, 0xffffff, 0.8).setDepth(depth);
  scene.tweens.add({ targets: w, y: y - 6 - Math.random() * 3, x: w.x + Math.random() * 2 - 1, alpha: 0, duration: 1100, onComplete: () => w.destroy() });
}

// He pays with Derik's R15; she turns to the machine, it hisses away, and
// there's his coffee on the counter.
async function makeCoffee(scene) {
  const { room, sannie, player } = scene;
  const wait = ms => new Promise(r => scene.time.delayedCall(ms, r));
  setFlag('coffee');
  setFlag('wired'); // wide awake now, however tired he was
  clearFlag('tired');
  bike.pedalled = 0;
  sannie.play('sannie-px-idle-left');
  const hiss = scene.time.addEvent({ delay: 90, loop: true, callback: () => wisp(scene, room.steam.x, room.steam.y, room.counter.depth + 1) });
  await wait(1600);
  hiss.remove();
  sannie.play('sannie-px-idle-down');
  await wait(300);
  scene.coffee = cup(scene, player.x, 59).setDepth(room.counter.depth + 1);
}

// He picks it up and turns round with it; he carries it about, steaming
// (and it steams on the table, when he's sitting).
function takeCoffee(scene) {
  const c = scene.coffee;
  scene.carry = c;
  scene.player.face('down');
  scene.time.addEvent({
    delay: 450, loop: true,
    callback: () => { if (c.active) wisp(scene, c.x, c.y - 6, c.depth + 0.01); },
  });
}

// A table: with his coffee, he sits down at it (on its chair, facing it),
// puts his cup down and sips it now and then, till the next tap gets him up
// again, cup in hand.
export function atTable(scene, id) {
  const { player, room } = scene;
  const cupNow = scene.coffee;
  if (!cupNow || scene.carry !== cupNow) {
    scene.think(hasFlag('coffee')
      ? { af: 'Lekker plekkie. Ek sal weer kom sit as ek weer ’n koffie het.', en: "Lovely spot. I'll sit here again when I've another coffee." }
      : { af: 'Eers ’n koffie, dan sit ek.', en: "A coffee first, then I'll sit." });
    return;
  }
  const { stand, seat } = room.spots[id];
  scene.carry = null;
  Object.assign(player, { x: seat.x, y: seat.y });
  player.sprite.setPosition(seat.x, seat.y).setDepth(seat.y);
  cupNow.setPosition(seat.cup.x, seat.cup.y).setDepth(seat.y + 1);
  const mouth = { x: seat.x + (seat.face === 'left' ? -4 : 4), y: seat.y - 15 };
  const sips = scene.time.addEvent({
    delay: 3200, startAt: 1600, loop: true,
    callback: () => scene.tweens.add({
      targets: cupNow, x: mouth.x, y: mouth.y, duration: 450, yoyo: true, hold: 700, ease: 'Sine.easeInOut',
      onYoyo: () => cupNow.setDepth(seat.y + 2),
      onComplete: () => cupNow.setPosition(seat.cup.x, seat.cup.y).setDepth(seat.y + 1),
    }),
  });
  player.act(`player-px-sit-${seat.face}`, () => {
    sips.remove();
    scene.tweens.killTweensOf(cupNow);
    Object.assign(player, { x: stand.x, y: stand.y });
    player.sprite.setPosition(stand.x, stand.y).setDepth(stand.y);
    scene.carry = cupNow;
  });
  scene.time.delayedCall(400, () => {
    if (!scene.thought) scene.think({ af: 'Aah… niks klop ’n koppie koffie nie.', en: 'Aah… nothing beats a cup of coffee.' });
  });
}

// The window at the back: he looks out at the garden behind the cafe
// (sipping his coffee, if he has it).
export function atWindow(scene) {
  scene.player.face('up');
  scene.look('garden', scene.coffee && scene.carry === scene.coffee ? 'coffee' : null);
}

// At the counter: order a coffee, and find out he can't pay for it.
export async function atCounter(scene) {
  const { player, sannie } = scene;
  player.face('up');
  sannie.play('sannie-px-idle-down');
  lock(scene, true);
  if (hasFlag('coffee')) {
    await converse(scene, cast(scene), [['sannie', { af: 'Lekker, nè? Kom gerus weer!', en: "Lovely, isn't it? Do come again!" }]]);
    lock(scene, false);
    return;
  }
  if (hasFlag('loan')) {
    await converse(scene, cast(scene), [
      ['sannie', { af: 'Welkom terug, Johan! Het jy geld gekry?', en: 'Welcome back, Jones! Got some money?' }],
      { choose: [
        { say: { af: 'Ja! Derik het vir my R15 geleen.', en: 'Yes! Derek lent me R15.' }, then: [
          ['sannie', { af: 'Ag, Derik is ’n goeie mens. Een koffie, kom reg!', en: "Ah, Derek's a good sort. One coffee, coming up!" }],
        ] },
        { say: { af: 'Hier is R15. Een koffie, asseblief!', en: "Here's R15. One coffee, please!" }, then: [
          ['sannie', { af: 'Dankie! Een koffie, kom reg!', en: 'Thank you! One coffee, coming up!' }],
        ] },
      ] },
      () => makeCoffee(scene),
      ['sannie', { af: 'Hier is jou koffie. Geniet dit!', en: "Here's your coffee. Enjoy!" }],
      async () => takeCoffee(scene),
      () => scene.think({ af: 'Mmm! Die lekkerste koffie aan die kus. Kom ek gaan sit.', en: "Mmm! The best coffee on the coast. Let's find a seat." }),
    ]);
    lock(scene, false);
    return;
  }
  if (hasFlag('noCash')) {
    await converse(scene, cast(scene), [
      ['sannie', { af: 'En? Het jy al geld gekry?', en: 'Well? Got some money yet?' }],
      () => scene.think(line('noCash') ?? { af: 'Nog nie… my beursie is nog leeg.', en: 'Not yet… my wallet is still empty.' }),
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
  const hint = line('noCash');
  if (hint) scene.think(hint);
}

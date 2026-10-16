import Phaser from 'phaser';
import { obj } from './pixelArt.js';
import { pieTexture } from './interiors.js';
import { setFlag } from './state.js';
import { think } from './bubble.js';

// Farmer Jones bakes the pie, once he's read the recipe book: "I think I'll
// make a pie", a bowl from the kitchen cupboard, mixing and rolling pastry at
// the table, the pie into the oven and back out onto the table, steaming.
// You just watch (taps and keys are ignored meanwhile); then the 'baked'
// flag is set and he's free again. Returns the pie on the table.

// Little props, drawn once: bowl of flour, wooden spoon, pastry, rolling pin.
const PROPS = {
  'bake-bowl': [11, 7, r => { r(0, 0, 9, 5, '#5b86c4'); r(0, 0, 9, 2, '#f8f0e0'); r(1, 0, 7, 1, '#ffffff'); r(0, 4, 9, 1, '#3f5f96'); }],
  'bake-spoon': [3, 6, r => r(0, 0, 1, 4, '#c88a52')],
  'bake-dough': [12, 7, r => { r(0, 0, 10, 5, '#f0d8a8'); r(0, 0, 10, 1, '#fff0c8'); r(0, 4, 10, 1, '#d8b880'); }],
  'bake-pin': [16, 4, r => { r(0, 0, 14, 2, '#c88a52'); r(2, 0, 10, 1, '#e0a868'); r(0, 0, 2, 2, '#8c5838'); r(12, 0, 2, 2, '#8c5838'); }],
};

function prop(scene, key) {
  if (!scene.textures.exists(key)) {
    const [w, h, paint] = PROPS[key];
    const tex = scene.textures.createCanvas(key, w, h);
    obj(tex.getContext(), 1, 1, w - 2, h - 2, paint);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return key;
}

// An overlay from the room's kitchen (cupboard or oven opened).
function overlay(scene, key, o) {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, o.w, o.h);
    o.draw(tex.getContext());
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return scene.add.image(o.x, o.y, key).setOrigin(0).setDepth(0.4);
}

// Wisps rising from (x, y): white for flour, grey for steam.
function puff(scene, x, y, color, rise) {
  const p = scene.add.rectangle(Math.round(x), Math.round(y), 1, 1, color).setOrigin(0).setDepth(1e4);
  scene.tweens.add({ targets: p, y: y - rise, x: x + (Math.random() - 0.5) * 4, alpha: 0, duration: 900 + Math.random() * 500, onComplete: () => p.destroy() });
}

export async function bakePie(scene) {
  const { player } = scene;
  const { cupboard, stove, table } = scene.room.kitchen;
  const wait = ms => new Promise(r => scene.time.delayedCall(ms, r));
  // walk somewhere; if he's somehow stuck, put him there after a while
  const walk = ({ x, y }) => new Promise((resolve) => {
    const safety = scene.time.delayedCall(8000, () => {
      player.stop();
      Object.assign(player, { x, y });
      player.sprite.setPosition(x, y);
      resolve();
    });
    player.walkTo(x, y, () => { safety.remove(); resolve(); });
    player.marker.clear(); // no tap-to-walk marker: he's walking himself
  });
  const hold = (key) => { scene.carry = scene.add.image(player.x, player.y, key).setOrigin(0.5, 1); };
  const putDown = (at, depth = 0.46) => {
    const item = scene.carry.setOrigin(0).setPosition(at.x, at.y).setDepth(depth);
    scene.carry = null;
    return item;
  };

  scene.busy = true;
  player.locked = true;

  // "I think I'll make a pie" — and out of the cupboard comes a bowl of flour
  player.face('left');
  await think(scene, player.sprite, "I think I'll make a pie.", 2000);
  const open = overlay(scene, 'kitchen-cupboard-open', cupboard.open);
  await wait(600);
  hold(prop(scene, 'bake-bowl'));
  await wait(400);
  open.destroy();

  // at the table: mix, roll the pastry, fill the dish
  await walk(table.stand);
  player.face('down');
  const bowl = putDown(table.bowl);
  const spoon = scene.add.image(table.bowl.x + 5, table.bowl.y - 3, prop(scene, 'bake-spoon')).setOrigin(0.5, 0).setDepth(0.47);
  scene.tweens.add({ targets: spoon, x: spoon.x + 2, duration: 160, yoyo: true, repeat: -1 });
  const flour = scene.time.addEvent({ delay: 220, loop: true, callback: () => puff(scene, table.bowl.x + 2 + Math.random() * 7, table.bowl.y, 0xffffff, 6) });
  await wait(1800);
  flour.remove();
  bowl.destroy();
  spoon.destroy();
  const dough = scene.add.image(table.bowl.x, table.bowl.y, prop(scene, 'bake-dough')).setOrigin(0).setDepth(0.46);
  const pin = scene.add.image(table.bowl.x - 2, table.bowl.y + 1, prop(scene, 'bake-pin')).setOrigin(0).setDepth(0.47);
  scene.tweens.add({ targets: pin, x: pin.x + 4, duration: 260, yoyo: true, repeat: -1 });
  await wait(1800);
  dough.destroy();
  pin.destroy();
  const raw = scene.add.image(table.pie.x, table.pie.y, pieTexture(scene, 8, true)).setOrigin(0).setDepth(0.46);
  await wait(700);

  // into the oven
  raw.destroy();
  hold(pieTexture(scene, 8, true));
  await walk(stove.stand);
  player.face('left');
  let oven = overlay(scene, 'kitchen-oven-open', stove.open);
  await wait(500);
  scene.carry.destroy();
  scene.carry = null;
  await wait(300);
  oven.destroy();
  const v = stove.vent;
  const glow = scene.add.rectangle(v.x, v.y, v.w, v.h, 0xffa040).setOrigin(0).setDepth(0.4);
  scene.tweens.add({ targets: glow, alpha: 0.4, duration: 180, yoyo: true, repeat: -1 });
  const steam = scene.time.addEvent({ delay: 260, loop: true, callback: () => puff(scene, v.x + Math.random() * v.w, v.y + 3, 0xd8d8d8, 10) });
  await think(scene, player.sprite, 'Mmm… it smells good already.', 2600);
  steam.remove();
  glow.destroy();

  // out of the oven, golden, and onto the table
  oven = overlay(scene, 'kitchen-oven-open', stove.open);
  await wait(400);
  hold(pieTexture(scene));
  await wait(300);
  oven.destroy();
  await walk(table.stand);
  player.face('down');
  const pie = putDown(table.pie, 0.45);
  scene.time.addEvent({ delay: 240, repeat: 24, callback: () => puff(scene, table.pie.x + 2 + Math.random() * 8, table.pie.y, 0xe8e8e8, 9) });

  setFlag('baked');
  scene.busy = false;
  player.locked = false;
  think(scene, player.sprite, "There! Now I'm sleepy.");
  return pie;
}

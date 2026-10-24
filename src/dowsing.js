import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// Dowsing in town (TownScene), with the forked willow stick from the river
// (src/willow.js): at the dry fountain Johan holds it out in front of him and
// its tip dips: the water comes from up the hill. He follows it up the path,
// the tip dipping now and then, and out across the grass at the top of the
// town, till it pulls hard down: there, under the grass, the water's leaking
// away instead of running down to the fountain ('foundLeak'): a soggy patch,
// water seeping up through it.

const ROUTE = [{ x: 950, y: 1060 }, { x: 940, y: 800 }, { x: 880, y: 600 }, { x: 960, y: 430 }]; // up the path
const PATCH = { x: 730, y: 300 }; // the soggy patch on the grass
const ACROSS = [{ x: 860, y: 340 }, { x: 760, y: 312 }]; // off the path to it
const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

// The stick in his hands, held out in front of him the way he's facing,
// his arms reaching out to it (as if it's leading them), its tip dipping on
// `dip()`. Always drawn over him, so it shows even with his back to us.
function stick(scene) {
  const { sprite } = scene.player;
  const g = scene.add.graphics();
  let tilt = 0;
  const AIM = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  const SKIN = 0xf8c8a0;
  const SLEEVE = 0xd04c3a; // (his red shirt)
  const draw = () => {
    const k = sprite.scaleX * 2; // (sprite px → picture px)
    const [ax, ay] = AIM[scene.player.dir] ?? AIM.down;
    const side = ax !== 0;
    // his shoulders, and his hands reaching out from them in front of him
    // (with his back to us: out level with his shoulders, either side)
    const sy = sprite.y - 13 * k;
    const hx = sprite.x + ax * 6 * k;
    const hy = sy + (ay > 0 ? 4 : ay < 0 ? -3 : 2) * k;
    const spread = side ? 1.2 * k : (ay < 0 ? 6 : 4) * k; // the fork's two ends, in his two hands
    const hands = side ? [[hx, hy - spread], [hx + ax * k, hy + spread]] : [[hx - spread, hy], [hx + spread, hy]];
    const len = (ay < 0 ? 15 : 9) * k; // (held up and out ahead, past his hat, with his back to us)
    const tx = hx + ax * len;
    const ty = hy + (ay < 0 ? -len : ay > 0 ? len * 0.5 : -2 * k) + tilt * 5 * k;
    g.clear().setDepth(sprite.depth + 0.5);
    // his arms, out to the stick (red sleeves)
    hands.forEach(([x, y], i) => {
      const shx = sprite.x + (side ? ax * 1.5 : i ? 4.5 : -4.5) * k;
      g.lineStyle(2.6 * k, 0x2e1d0c).lineBetween(shx, sy, x, y);
      g.lineStyle(1.6 * k, SLEEVE).lineBetween(shx, sy, x, y);
    });
    [[8, 0x2e1d0c], [4, 0xb08a50]].forEach(([w, c]) => {
      g.lineStyle(w * k / 4, c);
      hands.forEach(([x, y]) => g.lineBetween(x, y, tx, ty));
    });
    // his fists round the fork's ends
    hands.forEach(([x, y]) => g.fillStyle(0x2e1d0c).fillCircle(x, y, 1.4 * k).fillStyle(SKIN).fillCircle(x, y, 0.9 * k));
  };
  scene.events.on('update', draw);
  const off = () => { scene.events.off('update', draw); g.destroy(); };
  scene.events.once('shutdown', off);
  return {
    dip: (hard = false) => new Promise((r) => {
      const t = { v: 0 };
      scene.tweens.add({
        targets: t, v: hard ? 1 : 0.6, duration: hard ? 180 : 260, yoyo: true, repeat: hard ? 3 : 0, ease: 'Sine.easeInOut',
        onUpdate: () => { tilt = t.v; }, onComplete: () => { tilt = hard ? 1 : 0; r(); },
      });
    }),
    put: off,
  };
}

// A soggy patch on the grass, water seeping up through it.
export function leak(scene) {
  const { x, y } = PATCH;
  scene.leakPatch = [
    scene.add.ellipse(x, y, 150, 56, 0x2e5a3a, 0.55).setDepth(y - 30),
    scene.add.ellipse(x - 10, y + 2, 80, 26, 0x6aa8d0, 0.75).setDepth(y - 29),
  ];
  scene.leakBubbles = scene.time.addEvent({
    delay: 700, loop: true,
    callback: () => {
      const b = scene.add.circle(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 18, 4, 0xeaf6ff, 0.9).setDepth(y - 28);
      scene.tweens.add({ targets: b, scale: 2.4, alpha: 0, duration: 900, onComplete: () => b.destroy() });
    },
  });
}

// Walk him along `route` (picture px), smoothly, as he walks anywhere.
function walk(scene, route) {
  return new Promise(r => scene.player.follow(route, r));
}

// At the fountain with the stick: off he goes, following the water.
export function dowse(scene) {
  return scene.talk(async () => {
    const { player } = scene;
    player.face('up');
    await think(scene, player.sprite, { af: 'Kom ek probeer die wilgerstok…', en: "Let's try the willow stick…" });
    const s = stick(scene);
    await wait(scene, 500);
    await s.dip();
    await think(scene, player.sprite, line('dowseStart'));
    for (const p of ROUTE) {
      await walk(scene, [p]);
      await s.dip();
    }
    await think(scene, player.sprite, { af: 'Dit trek my van die pad af, oor die gras…', en: 'It pulls me off the path, over the grass…' });
    await walk(scene, ACROSS);
    await s.dip(true);
    leak(scene);
    setFlag('foundLeak');
    await think(scene, player.sprite, { af: 'Hier! Die stok trek hard na onder, en die grond is papnat!', en: 'Here! The stick pulls hard down, and the ground is soaking wet!' });
    await think(scene, player.sprite, line('foundLeak'));
    s.put();
    // back onto the path
    await walk(scene, [ACROSS[0], ROUTE[ROUTE.length - 1]]);
  });
}

export const hasLeak = () => hasFlag('foundLeak');

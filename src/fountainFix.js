import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { asset } from './asset.js';
import { planDate } from './datePlan.js';

// Fixing the town's fountain (TownScene). Once Johan has found where its
// water leaks away under the grass at the top of the town (src/dowsing.js:
// 'foundLeak'), and has the spade from his tool shed ('shovel'), tapping the
// wet patch he digs down to the pipe: a tree root has pushed it out of its
// joint. He fits it back together, packs the earth round it and fills the
// hole; the puddle's gone, and the fountain runs again ('fountainFixed'): its
// water back in the basin (public/assets/fountain-water.png, cut from the
// picture before it dried) and jets splashing. Then, if Steffi's said yes,
// his thoughts turn to tonight (src/datePlan.js).

export const PATCH = { x: 730, y: 300, w: 170, h: 80 }; // the wet patch (its middle, and how far round)
const STAND = { x: 790, y: 312 }; // where he digs from
const PATH_END = { x: 960, y: 430 }; // back on the path
const FOUNTAIN = { x: 686, y: 1300 }; // the fountain's basin, top left (as cut)
const SPOUTS = [[748, 1340], [796, 1340]];
const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

export function preloadFountain(scene) {
  scene.load.image('fountain-water', asset('fountain-water.png'));
}

// The fountain running: its water, and jets from the spouts.
export function fountainRuns(scene) {
  const fit = scene.fit('fountain-water');
  scene.add.image(FOUNTAIN.x, FOUNTAIN.y, fit.key).setOrigin(0).setScale(fit.sx, fit.sy).setDepth(1300);
  scene.time.addEvent({
    delay: 90, loop: true,
    callback: () => {
      const [x, y] = SPOUTS[Math.floor(Math.random() * SPOUTS.length)];
      const d = scene.add.circle(x, y, 3, 0xeaf6ff, 0.9).setDepth(1440);
      const dx = (x < 770 ? -1 : 1) * (14 + Math.random() * 14);
      scene.tweens.add({ targets: d, x: x + dx, duration: 600, ease: 'Linear' });
      scene.tweens.add({ targets: d, y: y + 40 + Math.random() * 10, duration: 600, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    },
  });
}

export function onPatch(x, y) {
  return Math.abs(x - PATCH.x) < PATCH.w / 2 && Math.abs(y - PATCH.y) < PATCH.h / 2 + 20;
}

// (smoothly, as he walks anywhere: Player.follow)
function walk(scene, route) {
  return new Promise(r => scene.player.follow(route, r));
}

// Tapping the wet patch: up the path to it, and over onto the grass.
export function atPatch(scene) {
  if (!hasFlag('foundLeak') || hasFlag('fountainFixed')) return false;
  scene.player.walkTo(PATH_END.x, PATH_END.y, () => scene.talk(async () => {
    await walk(scene, [STAND]);
    scene.player.face('left');
    if (!hasFlag('shovel')) {
      await think(scene, scene.player.sprite, line('leakNoShovel'));
    } else {
      await dig(scene);
    }
    await walk(scene, [PATH_END]);
  }));
  return true;
}

async function dig(scene) {
  const { player } = scene;
  const { x, y } = PATCH;
  // the spade in his hands, going in and out, earth flying
  const spade = scene.add.graphics().setDepth(player.y + 1);
  const drawSpade = (down) => {
    const sx = player.x - 26;
    const sy = player.y - 40 + (down ? 16 : 0);
    spade.clear().lineStyle(6, 0x2e1d0c).lineBetween(sx + 10, sy - 30, sx, sy + 20).lineStyle(3, 0xa86a3c).lineBetween(sx + 10, sy - 30, sx, sy + 20);
    spade.fillStyle(0x2e1d0c).fillRect(sx - 8, sy + 16, 16, 18).fillStyle(0xa0a8b4).fillRect(sx - 6, sy + 18, 12, 14);
  };
  const hole = scene.add.ellipse(x + 20, y + 6, 10, 6, 0x4a2e18).setDepth(y - 27);
  for (let i = 0; i < 8; i++) {
    drawSpade(true);
    await wait(scene, 180);
    drawSpade(false);
    for (let j = 0; j < 4; j++) {
      const clod = scene.add.rectangle(x + 20, y, 8, 8, 0x6a4428).setDepth(1e4);
      scene.tweens.add({ targets: clod, x: clod.x + 30 + Math.random() * 40, y: clod.y - 30 - Math.random() * 30, duration: 300, yoyo: true, ease: 'Quad.easeOut', onComplete: () => clod.destroy() });
    }
    hole.setSize(10 + i * 9, 6 + i * 4);
    await wait(scene, 220);
  }
  spade.destroy();
  // the pipe in the hole, out of its joint, water spurting from the gap
  const pipe = scene.add.graphics().setDepth(y - 26);
  pipe.fillStyle(0x2e1d0c).fillRect(x - 22, y - 2, 30, 14).fillRect(x + 22, y + 2, 30, 14);
  pipe.fillStyle(0x8a8a90).fillRect(x - 20, y, 26, 10).fillRect(x + 24, y + 4, 26, 10);
  const root = scene.add.graphics().setDepth(y - 25);
  root.lineStyle(5, 0x5a3a20).lineBetween(x - 4, y - 10, x + 14, y + 16).lineBetween(x + 14, y + 16, x + 30, y + 20);
  const spurt = scene.time.addEvent({
    delay: 70, loop: true,
    callback: () => {
      const d = scene.add.circle(x + 14, y + 6, 3, 0xbfe4f8, 0.9).setDepth(y - 24);
      scene.tweens.add({ targets: d, y: d.y - 20 - Math.random() * 10, x: d.x + (Math.random() - 0.5) * 16, alpha: 0, duration: 400, onComplete: () => d.destroy() });
    },
  });
  await think(scene, player.sprite, { af: 'Daar is die pyp! ’n Boomwortel het dit uit sy las uitgedruk. Die water spuit hier uit.', en: "There's the pipe! A tree root has pushed it out of its joint. The water's spurting out here." });
  await think(scene, player.sprite, { af: 'Kom ek kap die wortel weg en druk die pyp terug in sy las…', en: "Let me chop the root away and push the pipe back into its joint…" });
  root.destroy();
  await wait(scene, 300);
  spurt.remove();
  pipe.clear().fillStyle(0x2e1d0c).fillRect(x - 22, y + 1, 76, 14).fillStyle(0x8a8a90).fillRect(x - 20, y + 3, 72, 10);
  await wait(scene, 600);
  // filled in again, and dry
  scene.tweens.add({ targets: [pipe, hole], alpha: 0, duration: 800 });
  scene.leakPatch?.forEach(o => scene.tweens.add({ targets: o, alpha: 0, duration: 1200, onComplete: () => o.destroy() }));
  scene.leakBubbles?.remove();
  await wait(scene, 1000);
  pipe.destroy();
  hole.destroy();
  setFlag('fountainFixed');
  fountainRuns(scene);
  await think(scene, player.sprite, { af: 'So! Die pyp sit weer reg. Hoor net… die fontein loop weer!', en: "There! The pipe's back in place. Just listen… the fountain's running again!" });
  await planDate(scene); // (and now for tonight, with Steffi: src/datePlan.js)
}

import Phaser from 'phaser';
import { say } from './bubble.js';

// Conversations in a room. `cast` names who's talking — a sprite, or a spot
// {x, y} with a `name`, a `color` and `below` for a voice outside the door —
// and `steps` are, in order:
//   [who, text]       they say it; a tap moves it along
//   { choose: [...] } Farmer Jones's reply, picked from the options at the
//                     bottom of the screen; each { say, then } (his pick isn't
//                     shown again: whoever he's talking to just answers it)
//   () => promise     something happening between lines
// While it runs the scene is busy (taps only move the talk along).
export async function converse(scene, cast, steps, choiceNext = false) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const next = i + 1 < steps.length ? steps[i + 1] : choiceNext && { choose: true };
    if (typeof step === 'function') {
      await step();
    } else if (step.choose) {
      const pick = step.choose[await choose(scene, step.choose.map(o => o.say))];
      await converse(scene, cast, pick.then ?? [], !!next?.choose);
    } else {
      const [who, text] = step;
      const c = cast[who];
      const said = say(scene, c.sprite ?? c, text, c);
      // a reply to pick next? the line stays up above the choices
      if (next?.choose) continue;
      await said;
    }
  }
}

// Replies to pick from at the bottom of the screen, under "Your reply" (as
// in the talk at the gate): tap one, or press its number. Resolves with its
// index; the line it answers (if still up) goes once it's picked.
export function choose(scene, options) {
  const cam = scene.cameras.main;
  const z = cam.zoom;
  const u = Math.max(1, Math.round(3 / z));
  const view = cam.worldView;
  const dpr = window.devicePixelRatio || 1;
  const style = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#2e1d0c', resolution: dpr };
  const width = Math.min(scene.scale.width - 24, 360) / z;
  const x = view.centerX - width / 2;
  const parts = [];
  const boxes = [];
  let y = view.bottom - 5 * u;
  [...options].reverse().forEach((text) => {
    const arrow = scene.add.text(0, 0, '▶', { ...style, color: '#b8402e' }).setScale(1 / z);
    const words = scene.add.text(0, 0, text, { ...style, wordWrap: { width: width * z - 40 } }).setScale(1 / z);
    const h = words.height / z + 4 * u;
    y -= h;
    const g = scene.add.graphics();
    arrow.setPosition(x + 3 * u, y + 2 * u);
    words.setPosition(x + 3 * u + arrow.width / z + u, y + 2 * u);
    parts.push(g, arrow, words);
    boxes.unshift({ g, x, y, w: width, h });
    y -= 3 * u;
  });
  const label = scene.add.text(x + u, y, 'Your reply', {
    ...style, fontSize: '12px', color: '#fffcf2', stroke: '#2e1d0c', strokeThickness: 4,
  }).setScale(1 / z).setOrigin(0, 1);
  parts.push(label);
  const paint = (selected) => boxes.forEach(({ g, x: bx, y: by, w, h }, i) => {
    g.clear().fillStyle(0x2e1d0c).fillRect(bx + u, by - u, w - 2 * u, h + 2 * u).fillRect(bx, by, w, h);
    g.fillStyle(i === selected ? 0xf8d870 : 0xfff3c4).fillRect(bx + u, by, w - 2 * u, h);
  });
  paint(-1);
  parts.forEach(p => p.setDepth(p.type === 'Graphics' ? 1e5 + 2 : 1e5 + 3)); // words over their boxes
  scene.tweens.add({ targets: parts, alpha: { from: 0, to: 1 }, duration: 200 });
  document.body.classList.add('choosing'); // the menu button would sit on the replies

  return new Promise((resolve) => {
    const pick = (i) => {
      scene.choice = null;
      scene.input.keyboard.off('keydown', onKey);
      document.body.classList.remove('choosing');
      paint(i);
      scene.time.delayedCall(120, () => {
        parts.forEach(p => p.destroy());
        scene.thought?.destroy();
        resolve(i);
      });
    };
    const onKey = (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < boxes.length) pick(i);
    };
    scene.input.keyboard.on('keydown', onKey);
    scene.choice = {
      tap(px, py) {
        const i = boxes.findIndex(b => Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(b.x, b.y - 1.5 * u, b.w, b.h + 3 * u), px, py));
        if (i >= 0) pick(i);
      },
    };
  });
}

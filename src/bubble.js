import Phaser from 'phaser';

// Bubbles over someone's head (in a room or out on the farm): a pixel-art box
// with the words drawn at screen resolution so they stay sharp at any zoom.
// `think` trails two little bubbles down to them; `say` is speech, with a
// pointed tail (and, with `name`, who's speaking: for a voice from behind a
// door; `below` puts it under the spot, pointing up). `who` is a sprite, or
// just a spot {x, y} to point at. It follows them while it's up, kept on
// screen (one at a time per scene: `scene.thought`), and the promise resolves
// when it's gone. Thoughts fade by themselves; speech stays up (a blinking ▼)
// until a tap moves it along: the scene calls `scene.thought.destroy()`.
export function think(scene, who, text, ms = 2600) {
  return bubble(scene, who, text, { ms });
}

export function say(scene, who, text, { name, color, below } = {}) {
  return bubble(scene, who, text, { ms: Infinity, name, color, below, speech: true });
}

function bubble(scene, who, text, { ms, name, color = '#447a34', speech = false, below = false }) {
  scene.thought?.destroy();
  const cam = scene.cameras.main;
  const z = cam.zoom;
  const u = Math.max(1, Math.round(3 / z)); // a 'pixel' of the bubble: about 3 screen px
  const style = {
    fontFamily: 'monospace', fontStyle: 'bold', fontSize: '13px', color: '#2e1d0c', align: 'center',
    wordWrap: { width: 200 }, resolution: window.devicePixelRatio || 1,
  };
  const words = scene.add.text(0, 0, text, style).setScale(1 / z).setOrigin(0.5, 1).setDepth(1e5 + 1);
  const label = name ? scene.add.text(0, 0, name, { ...style, fontSize: '12px', color }).setScale(1 / z).setOrigin(0.5, 0).setDepth(1e5 + 1) : null;
  const more = ms === Infinity ? scene.add.text(0, 0, '▼', { ...style, fontSize: '9px' }).setScale(1 / z).setOrigin(1, 1).setDepth(1e5 + 1) : null;
  const g = scene.add.graphics().setDepth(1e5);
  const w = Math.ceil(Math.max(words.width, label ? label.width : 0) / z) + 6 * u;
  const h = Math.ceil((words.height + (label ? label.height : 0)) / z) + 4 * u;

  const place = () => {
    const view = cam.worldView;
    const head = who.y - (who.displayHeight ?? 0) * (who.originY ?? 0);
    const bx = Phaser.Math.Clamp(Math.round(who.x - w / 2), view.x + 2 * u, view.right - w - 2 * u);
    const by = below
      ? Math.min(view.bottom - h - 2 * u, Math.round(who.y + 6 * u))
      : Math.max(view.y + 2 * u, Math.round(head - 10 * u - h));
    const tx = Phaser.Math.Clamp(Math.round(who.x), bx + 4 * u, bx + w - 6 * u);
    const b = by + h;
    g.clear().fillStyle(0x2e1d0c);
    g.fillRect(bx + u, by, w - 2 * u, h).fillRect(bx, by + u, w, h - 2 * u);
    if (below) g.fillRect(tx - 3 * u, by - u, 6 * u, u).fillRect(tx - 2 * u, by - 2 * u, 4 * u, u).fillRect(tx - u, by - 4 * u, 2 * u, 2 * u);
    else if (speech) g.fillRect(tx - 3 * u, b, 6 * u, u).fillRect(tx - 2 * u, b + u, 4 * u, u).fillRect(tx - u, b + 2 * u, 2 * u, 2 * u);
    else g.fillRect(tx - u, b + u, 4 * u, 4 * u).fillRect(tx + u, b + 6 * u, 3 * u, 3 * u);
    g.fillStyle(0xfffcf2);
    g.fillRect(bx + u, by + u, w - 2 * u, h - 2 * u);
    if (below) g.fillRect(tx - 2 * u, by - u, 4 * u, 2 * u).fillRect(tx - u, by - 2 * u, 2 * u, u);
    else if (speech) g.fillRect(tx - 2 * u, b - u, 4 * u, 2 * u).fillRect(tx - u, b + u, 2 * u, u);
    else g.fillRect(tx, b + 2 * u, 2 * u, 2 * u).fillRect(tx + 2 * u, b + 7 * u, u, u);
    label?.setPosition(bx + w / 2, by + 2 * u);
    words.setPosition(bx + w / 2, b - 2 * u);
    more?.setPosition(bx + w - u, b - u);
  };
  place();
  scene.events.on('update', place);

  const parts = [g, words, label, more].filter(Boolean);
  scene.tweens.add({ targets: parts, alpha: { from: 0, to: 1 }, duration: 150 });
  if (more) scene.tweens.add({ targets: more, alpha: 0.2, duration: 450, yoyo: true, repeat: -1, delay: 300 });
  return new Promise((resolve) => {
    let gone = false;
    const handle = {
      speech,
      destroy() {
        if (gone) return;
        gone = true;
        scene.events.off('update', place);
        scene.events.off('shutdown', handle.destroy);
        parts.forEach(p => p.destroy());
        if (scene.thought === handle) scene.thought = null;
        resolve();
      },
    };
    scene.thought = handle;
    scene.events.once('shutdown', handle.destroy); // listeners outlive the scene's objects
    if (ms === Infinity) return;
    scene.time.delayedCall(ms, () => {
      if (scene.thought !== handle) return;
      scene.tweens.add({ targets: parts, alpha: 0, duration: 200, onComplete: () => handle.destroy() });
    });
  });
}

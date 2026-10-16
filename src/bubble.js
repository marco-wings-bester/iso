import Phaser from 'phaser';

// A thought bubble over someone's head (in a room or out on the farm): a
// pixel-art box with two little bubbles trailing down to them, the words
// drawn at screen resolution so they stay sharp at any zoom. It follows them
// while it's up, kept on screen (one at a time per scene), and the promise
// resolves when it's gone.
export function think(scene, who, text, ms = 2600) {
  scene.thought?.destroy();
  const cam = scene.cameras.main;
  const z = cam.zoom;
  const u = Math.max(1, Math.round(3 / z)); // a 'pixel' of the bubble: about 3 screen px
  const words = scene.add.text(0, 0, text, {
    fontFamily: 'monospace', fontStyle: 'bold', fontSize: '13px', color: '#2e1d0c', align: 'center',
    wordWrap: { width: 200 }, resolution: window.devicePixelRatio || 1,
  }).setScale(1 / z).setOrigin(0.5, 1).setDepth(1e5 + 1);
  const g = scene.add.graphics().setDepth(1e5);
  const w = Math.ceil(words.width / z) + 6 * u;
  const h = Math.ceil(words.height / z) + 4 * u;

  const place = () => {
    const view = cam.worldView;
    const head = who.y - who.displayHeight * who.originY;
    const bx = Phaser.Math.Clamp(Math.round(who.x - w / 2), view.x + 2 * u, view.right - w - 2 * u);
    const by = Math.max(view.y + 2 * u, Math.round(head - 10 * u - h));
    const tx = Phaser.Math.Clamp(Math.round(who.x), bx + 4 * u, bx + w - 6 * u);
    g.clear().fillStyle(0x2e1d0c);
    g.fillRect(bx + u, by, w - 2 * u, h).fillRect(bx, by + u, w, h - 2 * u);
    g.fillRect(tx - u, by + h + u, 4 * u, 4 * u).fillRect(tx + u, by + h + 6 * u, 3 * u, 3 * u);
    g.fillStyle(0xfffcf2);
    g.fillRect(bx + u, by + u, w - 2 * u, h - 2 * u);
    g.fillRect(tx, by + h + 2 * u, 2 * u, 2 * u).fillRect(tx + 2 * u, by + h + 7 * u, u, u);
    words.setPosition(bx + w / 2, by + h - 2 * u);
  };
  place();
  scene.events.on('update', place);

  const parts = [g, words];
  scene.tweens.add({ targets: parts, alpha: { from: 0, to: 1 }, duration: 150 });
  return new Promise((resolve) => {
    let gone = false;
    const bubble = {
      destroy() {
        if (gone) return;
        gone = true;
        scene.events.off('update', place);
        scene.events.off('shutdown', bubble.destroy);
        parts.forEach(p => p.destroy());
        if (scene.thought === bubble) scene.thought = null;
        resolve();
      },
    };
    scene.thought = bubble;
    scene.events.once('shutdown', bubble.destroy); // listeners outlive the scene's objects
    scene.time.delayedCall(ms, () => {
      if (scene.thought !== bubble) return;
      scene.tweens.add({ targets: parts, alpha: 0, duration: 200, onComplete: () => bubble.destroy() });
    });
  });
}

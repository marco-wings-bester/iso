import Phaser from 'phaser';

// A thought bubble over someone's head in a room: a pixel-art box with two
// little bubbles trailing down to them, the words drawn at screen resolution
// so they stay sharp at any zoom. It follows them while it's up (one at a
// time per scene) and the promise resolves when it's gone.
export function think(scene, who, text, ms = 2600) {
  scene.thought?.destroy();
  const z = scene.cameras.main.zoom;
  const words = scene.add.text(0, 0, text, {
    fontFamily: 'monospace', fontStyle: 'bold', fontSize: '13px', color: '#2e1d0c', align: 'center',
    wordWrap: { width: 200 }, resolution: window.devicePixelRatio || 1,
  }).setScale(1 / z).setOrigin(0.5, 1).setDepth(1e5 + 1);
  const g = scene.add.graphics().setDepth(1e5);
  const w = Math.ceil(words.width / z) + 6;
  const h = Math.ceil(words.height / z) + 4;

  const place = () => {
    const bx = Phaser.Math.Clamp(Math.round(who.x - w / 2), 2, scene.room.w - w - 2);
    const by = Math.max(2, Math.round(who.y - 36 - h));
    const tx = Phaser.Math.Clamp(Math.round(who.x), bx + 4, bx + w - 6);
    g.clear().fillStyle(0x2e1d0c);
    g.fillRect(bx + 1, by, w - 2, h).fillRect(bx, by + 1, w, h - 2);
    g.fillRect(tx - 1, by + h + 1, 4, 4).fillRect(tx + 1, by + h + 6, 3, 3);
    g.fillStyle(0xfffcf2);
    g.fillRect(bx + 1, by + 1, w - 2, h - 2);
    g.fillRect(tx, by + h + 2, 2, 2).fillRect(tx + 2, by + h + 7, 1, 1);
    words.setPosition(bx + w / 2, by + h - 2);
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

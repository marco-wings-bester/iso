import Phaser from 'phaser';
import well from './views/well.js';
import pond from './views/pond.js';
import tractor from './views/tractor.js';
import fire from './views/fire.js';
import apple from './views/apple.js';

// First-person views: what Farmer Jones sees down a well, out over the pond
// from the jetty, from the tractor's seat, into the fire at home, or up into
// an apple tree. Each view draws a pixel-art
// picture (160px on the short side, scaled up crisp) and may animate it.
// Tap or any key returns to the scene it came from (`from`: the farm, or the
// farmhouse for the fire). A view can take taps itself (`tap` returns true,
// e.g. picking an apple), hold the scene `busy` meanwhile, and show his
// thoughts along the bottom with `scene.say()`.
const VIEWS = { well, pond, tractor, fire, apple };
const ART = 160;
const FADE_MS = 300;

export default class ViewScene extends Phaser.Scene {
  constructor() {
    super({ key: 'View' });
  }

  create({ view, from = 'Game' }) {
    const v = VIEWS[view];
    const { width: W, height: H } = this.scale;
    const s = Math.min(W, H) / ART;
    const w = Math.ceil(W / s);
    const h = Math.ceil(H / s);
    if (this.textures.exists('pov')) this.textures.remove('pov');
    const tex = this.textures.createCanvas('pov', w, h);
    v.draw(tex.getContext(), w, h);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'pov').setOrigin(0);
    this.pov = { w, h };
    this.busy = false;
    this.caption = null;
    v.animate?.(this, w, h);

    // Nothing but his view: hide page buttons (e.g. Install app) meanwhile.
    document.body.classList.add('pov-view');
    this.events.once('shutdown', () => document.body.classList.remove('pov-view'));

    // Ease in: start slightly zoomed out and settle.
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000').setZoom(s * 0.92).centerOn(w / 2, h / 2).fadeIn(FADE_MS);
    this.tweens.add({ targets: cam, zoom: s, duration: 900, ease: 'Sine.easeOut' });

    // Tap or press any key to stop looking.
    this.leaving = false;
    const done = () => {
      if (this.leaving) return;
      this.leaving = true;
      cam.fadeOut(FADE_MS);
      cam.once('camerafadeoutcomplete', () => {
        this.scene.resume(from);
        this.scene.stop();
      });
    };
    this.time.delayedCall(400, () => {
      this.input.on('pointerdown', (p) => {
        if (this.leaving || this.busy || v.tap?.(this, p.worldX, p.worldY)) return;
        done();
      });
      this.input.keyboard.on('keydown', () => { if (!this.busy) done(); });
    });
  }

  // A thought of his along the bottom of the view, in a box like the room's
  // thought bubbles; the words are kept at screen resolution while the
  // camera zooms.
  say(text, ms = 2800) {
    this.caption?.destroy();
    const cam = this.cameras.main;
    const words = this.add.text(0, 0, text, {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: '15px', color: '#2e1d0c', align: 'center',
      wordWrap: { width: Math.min(this.scale.width - 56, 320) }, resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5, 1).setDepth(1e5 + 1);
    const box = this.add.graphics().setDepth(1e5);
    const place = () => {
      const z = cam.zoom;
      const v = cam.worldView;
      const bw = (words.width + 20) / z;
      const bh = (words.height + 14) / z;
      const x = v.centerX - bw / 2;
      const y = v.bottom - bh - 28 / z;
      const q = 3 / z;
      words.setScale(1 / z).setPosition(v.centerX, y + bh - 7 / z);
      box.clear().fillStyle(0x2e1d0c).fillRect(x, y - q, bw, bh + 2 * q).fillRect(x - q, y, bw + 2 * q, bh);
      box.fillStyle(0xfffcf2).fillRect(x, y, bw, bh);
    };
    place();
    this.events.on('update', place);
    let gone = false;
    const caption = {
      destroy: () => {
        if (gone) return;
        gone = true;
        this.events.off('update', place);
        this.events.off('shutdown', caption.destroy);
        words.destroy();
        box.destroy();
        if (this.caption === caption) this.caption = null;
      },
    };
    this.caption = caption;
    this.events.once('shutdown', caption.destroy); // listeners outlive the scene's objects
    this.tweens.add({ targets: [words, box], alpha: { from: 0, to: 1 }, duration: 150 });
    this.time.delayedCall(ms, () => {
      if (this.caption === caption) this.tweens.add({ targets: [words, box], alpha: 0, duration: 200, onComplete: caption.destroy });
    });
  }
}

import Phaser from 'phaser';
import well from './views/well.js';
import pond from './views/pond.js';
import tractor from './views/tractor.js';

// First-person views: what Farmer Jones sees down a well, out over the pond
// from the jetty, or from the tractor's seat. Each view draws a pixel-art
// picture (160px on the short side, scaled up crisp) and may animate it.
// Tap or any key returns to the farm.
const VIEWS = { well, pond, tractor };
const ART = 160;
const FADE_MS = 300;

export default class ViewScene extends Phaser.Scene {
  constructor() {
    super({ key: 'View' });
  }

  create({ view }) {
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
        this.scene.resume('Game');
        this.scene.stop();
      });
    };
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', done);
      this.input.keyboard.once('keydown', done);
    });
  }
}

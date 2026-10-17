import Phaser from 'phaser';
import { t } from './i18n.js';
import { UI } from './screen.js';

const STYLE = { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${25 * UI}px`, fill: '#ffffff', stroke: '#000000', strokeThickness: 5 * UI, align: 'center' };

// Screen-space overlay above the game: shows the name of the place you just
// walked into (or news, like someone at the gate). Scenes report location via
// game event 'location' ({ af, en }: src/i18n.js). It stays until the next
// tap or key press, so there's time to read it; that tap still does what it
// would anyway (walk, go somewhere…).
export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI', active: true });
  }

  create() {
    this.label = this.add.text(this.scale.width / 2, 72 * UI, '', STYLE).setOrigin(0.5).setAlpha(0);
    const fit = (width) => this.label.setX(width / 2).setWordWrapWidth(width - 32 * UI);
    fit(this.scale.width);
    this.scale.on('resize', ({ width }) => fit(width));

    this.game.events.on('location', (info) => {
      if (!info?.name) return;
      this.tweens.killTweensOf(this.label);
      this.label.setText(t(info.name)).setAlpha(1);
    });
    const hide = () => {
      if (this.label.alpha < 1 || this.tweens.isTweening(this.label)) return;
      this.tweens.add({ targets: this.label, alpha: 0, duration: 300 });
    };
    this.input.on('pointerdown', hide);
    this.input.keyboard.on('keydown', (e) => { if (!e.repeat) hide(); });
  }
}

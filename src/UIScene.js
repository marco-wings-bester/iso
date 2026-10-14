import Phaser from 'phaser';

const STYLE = { fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 };
const FARM_HINT = 'Tap a building to go inside';

// Screen-space overlay above the game: controls hint and the name of the
// place you just walked into. Scenes report location via game event 'location'.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI', active: true });
  }

  create() {
    this.add.text(12, 10, 'Tap to walk  •  WASD / Arrow Keys', STYLE);
    this.hint = this.add.text(12, 28, FARM_HINT, STYLE);
    this.label = this.add
      .text(this.scale.width / 2, 72, '', { ...STYLE, fontSize: '24px', strokeThickness: 5 })
      .setOrigin(0.5)
      .setAlpha(0);

    this.game.events.on('location', (info) => {
      this.hint.setText(info?.hint ?? FARM_HINT);
      if (!info?.name) return;
      this.tweens.killTweensOf(this.label);
      this.label.setText(info.name).setAlpha(1);
      this.tweens.add({ targets: this.label, alpha: 0, delay: 1400, duration: 600 });
    });
  }
}

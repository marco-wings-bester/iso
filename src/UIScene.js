import Phaser from 'phaser';

const STYLE = { fontSize: '24px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

// Screen-space overlay above the game: briefly shows the name of the place
// you just walked into. Scenes report location via game event 'location'.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI', active: true });
  }

  create() {
    this.label = this.add.text(this.scale.width / 2, 72, '', STYLE).setOrigin(0.5).setAlpha(0);
    this.scale.on('resize', ({ width }) => this.label.setX(width / 2));

    this.game.events.on('location', (info) => {
      if (!info?.name) return;
      this.tweens.killTweensOf(this.label);
      this.label.setText(info.name).setAlpha(1);
      this.tweens.add({ targets: this.label, alpha: 0, delay: 1400, duration: 600 });
    });
  }
}

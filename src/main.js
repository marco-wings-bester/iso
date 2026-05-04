import Phaser from 'phaser';
import GameScene from './GameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#5a9e4a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
});

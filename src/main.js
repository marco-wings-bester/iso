import Phaser from 'phaser';
import GameScene from './GameScene.js';
import InteriorScene from './InteriorScene.js';
import UIScene from './UIScene.js';
import ViewScene from './ViewScene.js';
import TalkScene from './TalkScene.js';
import RoadScene from './RoadScene.js';
import BeachScene from './BeachScene.js';
import { setupMenu } from './menu.js';
import { resetFlags, setFlag, LEVEL2_STORY } from './state.js';
import { watchForUpdates } from './updates.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#5a9e4a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, InteriorScene, ViewScene, TalkScene, RoadScene, BeachScene, UIScene],
});

// Hide the "Loading farm…" message from index.html once the farm is up.
game.events.once('ready', () => {
  window.farmWalkStarted = true;
  document.getElementById('boot')?.remove();
  try { sessionStorage.removeItem('farm-walk-recovered'); } catch (e) { /* private mode */ }
});

// New game (menu): forget the story and start again at the farm gate, from
// wherever he is (a building, or out on the farm). The secret level select
// (two pine cones under the big pine, src/views/pine.js) starts Level 1 the
// same way, or Level 2 at the crossroads with the story done up to there.
const scenes = ['Interior', 'View', 'Talk', 'Road', 'Beach'];
const menu = setupMenu({
  onNewGame() {
    resetFlags();
    scenes.forEach(key => game.scene.stop(key));
    game.scene.start('Game');
  },
  onLevel(n) {
    resetFlags();
    scenes.forEach(key => game.scene.stop(key));
    if (n === 1) {
      game.scene.start('Game');
      return;
    }
    LEVEL2_STORY.forEach(setFlag);
    game.scene.stop('Game');
    game.scene.start('Road');
  },
});
game.events.on('levels', () => menu.showLevels());
watchForUpdates();

// Register the service worker so the game can be installed and played offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
  });
}

import Phaser from 'phaser';
import GameScene from './GameScene.js';
import InteriorScene from './InteriorScene.js';
import UIScene from './UIScene.js';
import ViewScene from './ViewScene.js';
import TalkScene from './TalkScene.js';
import RoadScene from './RoadScene.js';
import BeachScene from './BeachScene.js';
import { setupMenu } from './menu.js';
import { resetFlags, setFlag, setValue, LEVEL2_STORY } from './state.js';
import { resetBike } from './bike.js';
import { watchForUpdates } from './updates.js';
import { UI } from './screen.js';

// Drawn at the screen's own resolution, so text and pictures are sharp on a
// phone: the canvas is UI times the page's size, shown at the page's size
// (src/screen.js), and kept so when the window changes size.
const pageSize = () => [Math.round(window.innerWidth * UI), Math.round(window.innerHeight * UI)];
const [startW, startH] = pageSize();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#5a9e4a',
  scale: {
    mode: Phaser.Scale.NONE,
    width: startW,
    height: startH,
    zoom: 1 / UI,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { pixelArt: false, antialias: true },
  scene: [GameScene, InteriorScene, ViewScene, TalkScene, RoadScene, BeachScene, UIScene],
});
window.addEventListener('resize', () => {
  const [w, h] = pageSize();
  if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
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
    resetBike();
    window.dispatchEvent(new Event('farmwalk-day')); // Monday again
    scenes.forEach(key => game.scene.stop(key));
    game.scene.start('Game');
  },
  onLevel(n) {
    resetFlags();
    resetBike();
    window.dispatchEvent(new Event('farmwalk-day'));
    scenes.forEach(key => game.scene.stop(key));
    if (n === 1) {
      game.scene.start('Game');
      return;
    }
    LEVEL2_STORY.forEach(setFlag);
    setValue('day', 1); // Tuesday: the night after the pie, Bob came by
    window.dispatchEvent(new Event('farmwalk-day'));
    game.scene.stop('Game');
    game.scene.start('Road');
  },
});
game.events.on('levels', () => menu.showLevels());
// opened in a browser: how to install it, and where the menu is
if (window.farmWalkStarted) menu.welcome();
else game.events.once('ready', () => menu.welcome());
watchForUpdates();

// Register the service worker so the game can be installed and played offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
  });
}

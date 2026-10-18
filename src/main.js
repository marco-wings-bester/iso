import Phaser from 'phaser';
import GameScene from './GameScene.js';
import InteriorScene from './InteriorScene.js';
import UIScene from './UIScene.js';
import ViewScene from './ViewScene.js';
import TalkScene from './TalkScene.js';
import RoadScene from './RoadScene.js';
import BeachScene from './BeachScene.js';
import TownScene from './TownScene.js';
import PieterScene from './PieterScene.js';
import RiverScene from './RiverScene.js';
import { setupMenu } from './menu.js';
import { resetFlags, startDay } from './state.js';
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
  scene: [GameScene, InteriorScene, ViewScene, TalkScene, RoadScene, BeachScene, TownScene, PieterScene, RiverScene, UIScene],
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

// New game (menu, or the week done: src/night.js): forget the story and
// start again on Monday at the farm gate, from wherever he is (a building, or
// out on the farm). The secret day select (two pine cones under the big pine,
// src/views/pine.js) starts on the day chosen the same way, with the story
// done up to then (src/state.js).
const scenes = ['Interior', 'View', 'Talk', 'Road', 'Beach', 'Town', 'Pieter', 'River'];
function startOn(day) {
  if (day) startDay(day);
  else resetFlags();
  resetBike();
  window.dispatchEvent(new Event('farmwalk-day'));
  scenes.forEach(key => game.scene.stop(key));
  game.scene.stop('Game');
  game.scene.start('Game', { fresh: true }); // (data, or it'd be the last trip's)
}
const menu = setupMenu({ onNewGame: () => startOn(0), onDay: startOn });
game.events.on('days', () => menu.showDays());
window.addEventListener('farmwalk-newgame', () => startOn(0));
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

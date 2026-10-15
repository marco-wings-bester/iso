import Phaser from 'phaser';
import GameScene from './GameScene.js';
import InteriorScene from './InteriorScene.js';
import UIScene from './UIScene.js';
import WellScene from './WellScene.js';
import { setupInstallButton } from './install.js';
import { watchForUpdates } from './updates.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#5a9e4a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, InteriorScene, WellScene, UIScene],
});

// Hide the "Loading farm…" message from index.html once the farm is up.
game.events.once('ready', () => {
  window.farmWalkStarted = true;
  document.getElementById('boot')?.remove();
  try { sessionStorage.removeItem('farm-walk-recovered'); } catch (e) { /* private mode */ }
});

setupInstallButton();
watchForUpdates();

// Register the service worker so the game can be installed and played offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
  });
}

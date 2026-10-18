import Phaser from 'phaser';
import { createCharacter, createBike } from './CharacterSprite.js';
import { createAmbient } from './ambient.js';
import { spawnBob, BOB_AREA, BOB_STAND } from './bob.js';
import { hasFlag, setFlag } from './state.js';
import { FIRST_MEETING, AGAIN } from './dialogue.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import Player from './Player.js';
import { farmGrid } from './WalkGrid.js';
import { BUILDINGS, ROAD, SPOTS, inRect, rectCenter } from './buildings.js';
import { IMG_W, IMG_H, PLAYER_SPEED, DEBUG_PATH, FRAME_H, FEET_Y } from './constants.js';
import { bike, SPEED as BIKE_SPEED, TIRING } from './bike.js';
import { asset } from './asset.js';
import { UI } from './screen.js';

const SPAWN = { x: 387, y: 1265 }; // farm gate, image px
const FADE_MS = 250;

// The farm. World coordinates are map image pixels; the camera zooms the map
// to cover the screen (like CSS background-size: cover).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  preload() {
    this.load.image('map', asset('map.png'));
  }

  create(data = {}) {
    const cam = this.cameras.main;
    cam.fadeIn(FADE_MS);
    const coverZoom = () => Math.max(this.scale.width / IMG_W, this.scale.height / IMG_H);
    const zoom = coverZoom();

    this.add.image(0, 0, 'map').setOrigin(0).setDepth(0);
    createAmbient(this);
    createCharacter(this);
    createBike(this);

    // Coming back out of a building: stand outside its door, facing out (or
    // back up the road from the crossroads, facing the farm).
    const from = data.from === 'road' ? { exit: ROAD.back, face: 'up' } : BUILDINGS[data.from];
    const start = from ? from.exit : SPAWN;
    this.player = new Player(this, {
      x: start.x,
      y: start.y,
      dir: from ? from.face ?? 'down' : 'up',
      texture: bike.riding ? 'player-bike' : 'player',
      speed: PLAYER_SPEED * UI / zoom * (bike.riding ? BIKE_SPEED : 1), // page px/s → image px/s
      grid: farmGrid,
      markerScale: UI / zoom,
    });
    this.leaving = false;
    this.parked = null; // his bike, standing where he left it
    if (typeof bike.at === 'object') this.parkBike();

    // After a read and a sleep, Bob is waiting at the gate (until he's been
    // given the pie: then he's in the farmhouse eating it).
    this.bob = null;
    if (hasFlag('ate') && hasFlag('slept') && !hasFlag('gavePie')) {
      this.bob = spawnBob(this, { showMark: !hasFlag('metBob') });
      const news = { af: 'Daar is iemand by die hek!', en: 'Someone is at the gate!' };
      if (from && !hasFlag('metBob')) this.time.delayedCall(600, () => this.game.events.emit('location', { name: news }));
    }

    // Keep the map covering the screen if the window size changes.
    const fit = () => {
      const z = coverZoom();
      cam.setZoom(z).centerOn(IMG_W / 2, IMG_H / 2);
      this.player.speed = PLAYER_SPEED * UI / z * (bike.riding ? BIKE_SPEED : 1);
      this.player.markerScale = UI / z;
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));

    // Tap to walk; tapping a building walks to its door; tapping a well, the
    // pond or a tractor walks there and shows what he sees; tapping right at
    // the bottom walks down the road off the farm; tapping his bike, standing
    // where he left it, gets him back on. A thought of his
    // stays up until a tap (or Space/Enter) moves it along, and that's all
    // that tap does.
    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && this.thought) this.thought.destroy();
    });
    this.input.on('pointerdown', (pointer) => {
      if (this.leaving) return;
      if (this.thought) {
        this.thought.destroy();
        return;
      }
      const { worldX: x, worldY: y } = pointer;
      if (this.parked && this.parked.getBounds().contains(x, y)) {
        const { x: bx, y: by } = this.parked;
        this.player.walkTo(bx, by, () => this.getOnBike());
        return;
      }
      if (this.bob && inRect(x, y, BOB_AREA)) {
        this.player.walkTo(BOB_STAND.x, BOB_STAND.y, () => this.talkToBob());
        return;
      }
      const spot = SPOTS.find(s => inRect(x, y, s.area));
      if (spot) {
        this.player.walkTo(spot.stand.x, spot.stand.y, () => this.lookAt(spot));
        return;
      }
      if (y >= ROAD.tap) {
        this.player.walkTo(x, IMG_H - 2);
        return;
      }
      const b = Object.values(BUILDINGS).find(bd => inRect(x, y, bd.area));
      const target = b ? rectCenter(b.door) : { x, y };
      this.player.walkTo(target.x, target.y);
    });

    if (DEBUG_PATH) {
      const g = this.add.graphics().setDepth(999);
      const { cols, rows, cell } = farmGrid;
      g.fillStyle(0x00ff00, 0.35);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (farmGrid.cellWalkable(c, r)) g.fillRect(c * cell, r * cell, cell, cell);
        }
      }
      g.lineStyle(2, 0x00ffff, 1);
      Object.values(BUILDINGS).forEach(b => g.strokeRect(b.door.x, b.door.y, b.door.w, b.door.h));
    }

    if (!(from && this.bob && !hasFlag('metBob'))) this.game.events.emit('location', { name: from ? { af: 'Plaas', en: 'Farm' } : null });
  }

  update(_time, delta) {
    if (this.leaving) return;
    const { x: x0, y: y0 } = this.player;
    this.player.update(delta / 1000);
    if (bike.riding && (this.player.x !== x0 || this.player.y !== y0)) this.pedal(delta / 1000);

    const { x, y } = this.player;
    if (y >= ROAD.edge) {
      this.offTheFarm();
      return;
    }
    const id = Object.keys(BUILDINGS).find(k => inRect(x, y, BUILDINGS[k].door));
    if (id === 'house' && !hasFlag('key')) this.locked();
    else if (id) this.enter(id);
  }

  // The farmhouse before he's found his key (left in the tractor): locked.
  // He steps back out of the doorway and wonders where it is.
  locked() {
    const { exit } = BUILDINGS.house;
    this.player.stop();
    Object.assign(this.player, { x: exit.x, y: exit.y });
    this.player.sprite.setPosition(exit.x, exit.y);
    this.player.face('down');
    think(this, this.player.sprite, line('doorLocked'));
  }

  // Down the road past the gate to the crossroads (Level 2), once Pieter has
  // gone home and Johan's off to town; until then he turns back.
  offTheFarm() {
    const { player } = this;
    player.stop();
    if (!hasFlag('bobHome')) {
      Object.assign(player, ROAD.back);
      player.sprite.setPosition(ROAD.back.x, ROAD.back.y);
      player.face('up');
      think(this, player.sprite, { af: 'Nog nie; daar is nog werk op die plaas.', en: "Not yet; there's still work to do on the farm." });
      return;
    }
    if (bike.riding) this.ride(false, ROAD.bike); // he walks on from the gate
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Road'));
  }

  // Switch to his eyes: down the well, over the pond, or from the tractor seat.
  lookAt(spot) {
    this.player.face(spot.face);
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', () => {
        this.leaving = false;
        cam.fadeIn(300);
      });
      this.scene.launch('View', { view: spot.view });
      this.scene.pause();
    });
  }

  // Close-up of the two of them talking (TalkScene), then back to the farm.
  // Bob's "!" stays until a talk is heard to the end (not closed early).
  talkToBob() {
    this.player.face('right');
    this.bob.faceJones();
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', (_sys, { finished } = {}) => {
        if (finished) {
          setFlag('metBob');
          this.bob.hideMark();
        }
        if (hasFlag('gavePie')) this.sendBobForPie();
        else this.bob.faceFarm();
        this.leaving = false;
        cam.fadeIn(300);
      });
      this.scene.launch('Talk', { lines: hasFlag('metBob') ? AGAIN : FIRST_MEETING });
      this.scene.pause();
    });
  }

  // Offered the pie, Bob walks up the path to the farmhouse and goes in.
  sendBobForPie() {
    const bob = this.bob;
    this.bob = null; // nobody to talk to at the gate now
    const door = rectCenter(BUILDINGS.house.door);
    bob.walkInto(farmGrid.findRoute(bob.sprite.x, bob.sprite.y, door.x, door.y), this.player.speed * 0.8);
    this.game.events.emit('location', { name: { af: 'Pieter is op pad na sy tert!', en: "Bob's off for his pie!" } });
  }

  // His bike standing where he left it (bike.at).
  parkBike() {
    const { x, y } = bike.at;
    this.parked = this.add.image(x, y, 'bike').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y);
  }

  // On his bike, or off it (leaving it at `at`, or in the barn).
  ride(on, at = null) {
    bike.riding = on;
    bike.at = on ? 'riding' : at ?? 'barn';
    const { player } = this;
    player.texture = on ? 'player-bike' : 'player';
    player.speed = PLAYER_SPEED * UI / this.cameras.main.zoom * (on ? BIKE_SPEED : 1);
    player.face(player.dir);
  }

  getOnBike() {
    const { x, y } = this.parked;
    if (farmGrid.isWalkable(x, y)) Object.assign(this.player, { x, y });
    this.player.sprite.setPosition(this.player.x, this.player.y);
    this.parked.destroy();
    this.parked = null;
    this.ride(true);
  }

  // Pedalling: after the cafe's coffee, a good long ride tires him out.
  pedal(dt) {
    if (!hasFlag('coffee') || hasFlag('exercised')) return;
    bike.pedalled += dt;
    if (bike.pedalled < TIRING) return;
    setFlag('exercised');
    think(this, this.player.sprite, line('tired'));
  }

  enter(id) {
    if (bike.riding) this.ride(false, BUILDINGS[id].bike); // the barn's: put away inside
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Interior', { building: id }));
  }
}

import { FRAME_H, FEET_Y } from './constants.js';
import { obj } from './pixelArt.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { createVillager } from './CharacterSprite.js';
import { BEACH_VILLAGERS } from './villagers.js';
import { line } from './hints.js';

// Inside Derik's farmhouse (ROOMS.derik), on Friday, the day it rains:
// Derik and his friend Abraham at the kitchen table over coffee. They're
// talking about the rain as he comes in, then call him over to join them; he sits down on the stool, and they're talking
// about the fountain on the town square: it's stopped working (dry as a
// bone: scripts/dry-fountain.py). Johan's handy with pumps and wells…
// could he have a look? ('metAbraham', 'fixFountain'). Tapping the table
// afterwards, he sits with them again. Once he's seen the fountain for
// himself ('fountainLooked'), the bookshelf has the answer: a book on how a
// dowsing rod finds water under the ground ('readDowsing'). By then Derik and
// Abraham are on to beer; he thanks them, says he's off to bed, and has a
// plan to find the fountain's water tomorrow ('dowsePlan', and he's tired).

const ABRAM = {
  name: { af: 'Abraham', en: 'Abraham' }, color: '#7a4a9a',
  look: {
    hair: 'short',
    palette: {
      S: '#e8b080', s: '#c08458', B: '#5a3a22', d: '#3a2414',
      R: '#a8a8a8', r: '#7a7a7a', C: '#c8603a', c: '#9a4428', O: '#4a5a78', o: '#344058',
    },
  },
};

function cast(scene) {
  return {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    derik: { get sprite() { return scene.derik; }, name: { af: 'Derik', en: 'Derek' }, color: '#3a6a98' },
    abraham: { get sprite() { return scene.abraham; }, ...ABRAM },
  };
}

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

// Derik and Abraham in their chairs, the coffee steaming; and, Johan in the
// door, they ask him to join them (the first time).
export function setUpDerikHouse(scene) {
  const { room } = scene;
  const derik = BEACH_VILLAGERS.find(v => v.id === 'derik');
  createVillager(scene, 'derik-px', derik.look, 1);
  createVillager(scene, 'abraham-px', ABRAM.look, 1);
  const sit = (key, { x, y, face }) => scene.add.sprite(x, y, key).setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play(`${key}-sit-${face}`);
  scene.derik = sit('derik-px', room.seats.derik);
  scene.abraham = sit('abraham-px', room.seats.abraham);
  if (hasFlag('readDowsing')) beer(scene);
  scene.time.addEvent({
    delay: 600, loop: true,
    callback: () => {
      if (scene.beer) return; // (beer doesn't steam)
      const { x, y } = room.cups[Math.floor(Math.random() * room.cups.length)];
      const wisp = scene.add.rectangle(x + Math.random() * 2 - 1, y - 4, 1.5, 1.5, 0xffffff, 0.8).setDepth(200);
      scene.tweens.add({ targets: wisp, y: y - 12, alpha: 0, duration: 1200, onComplete: () => wisp.destroy() });
    },
  });
  if (!hasFlag('metAbraham')) {
    scene.time.delayedCall(700, async () => {
      lock(scene, true);
      await converse(scene, cast(scene), [
        ['abraham', { af: 'Jinne, maar dit reën darem straf vandag!', en: "Goodness, it's raining hard today!" }],
        ['derik', { af: 'Ja, dit reën katte en honde!', en: "Yes, it's raining cats and dogs!" }],
        ['derik', { af: 'Johan! Kom in, kom in. Kom sit en drink ’n koppie koffie saam met ons.', en: "Jones! Come in, come in. Come and sit and have a cup of coffee with us." }],
      ]);
      lock(scene, false);
      const { stand } = room.spots.derikTable;
      scene.player.walkTo(stand.x, stand.y, () => atDerikTable(scene));
    });
  }
}

// At the table: he sits down on the stool with them (till a tap gets him up
// again); the first time, they talk about the fountain.
export async function atDerikTable(scene) {
  const { player, room } = scene;
  const { johan } = room.seats;
  const { stand } = room.spots.derikTable;
  Object.assign(player, { x: johan.x, y: johan.y });
  player.sprite.setPosition(johan.x, johan.y).setDepth(johan.y);
  player.act(`player-px-sit-${johan.face}`, () => {
    Object.assign(player, { x: stand.x, y: stand.y });
    player.sprite.setPosition(stand.x, stand.y).setDepth(stand.y);
    player.face('down');
  });
  lock(scene, true);
  if (hasFlag('metAbraham')) {
    await converse(scene, cast(scene), [['derik', { af: 'Nog ’n koppie, Johan? Dis mos weer reënweer.', en: "Another cup, Jones? It's that rainy weather again." }]]);
    lock(scene, false);
    return;
  }
  await converse(scene, cast(scene), [
    ['derik', { af: 'Johan, ken jy vir Abraham? Hy bly in die dorp.', en: 'Jones, do you know Abraham? He lives in town.' }],
    ['jones', { af: 'Aangename kennis, Abraham!', en: 'Pleased to meet you, Abraham!' }],
    ['abraham', { af: 'Aangename kennis, Johan. Derik praat baie van jou.', en: 'Pleased to meet you, Jones. Derek talks about you a lot.' }],
    ['abraham', { af: 'Ons praat net oor die fontein op die dorpsplein. Dit het ’n paar dae gelede net skielik opgehou werk.', en: "We were just talking about the fountain on the town square. A few days ago it just suddenly stopped working." }],
    ['derik', { af: 'Kurkdroog! En die kinders het altyd so lekker daar in die water gespeel.', en: 'Bone dry! And the children always loved playing in the water there.' }],
    ['jones', { af: 'Ag nee. Weet iemand wat makeer?', en: "Oh no. Does anyone know what's wrong?" }],
    ['abraham', { af: 'Niemand nie. Die munisipaliteit sê hulle sal kom kyk, maar jy weet mos hoe dit gaan…', en: 'Nobody. The council says they will come and look, but you know how it goes…' }],
    ['derik', { af: 'Johan, jy is mos handig met pompe en putte. Kan jy nie dalk gaan kyk nie?', en: "Jones, you're handy with pumps and wells. Couldn't you have a look?" }],
    ['jones', { af: 'Ek sal gaan kyk wat ek kan doen.', en: "I'll go and see what I can do." }],
    ['abraham', { af: 'Dankie, Johan! Die hele dorp sal bly wees.', en: 'Thank you, Jones! The whole town will be glad.' }],
    () => {
      setFlag('metAbraham');
      setFlag('fixFountain');
    },
  ]);
  lock(scene, false);
  const hint = line('fixFountain');
  if (hint) scene.think(hint);
}

// A mug of beer in front of each of them (over their coffee cups).
function beer(scene) {
  if (scene.beer) return;
  if (!scene.textures.exists('beer-mug')) {
    const tex = scene.textures.createCanvas('beer-mug', 8, 8);
    obj(tex.getContext(), 1, 1, 6, 6, (r) => {
      r(0, 0, 5, 2, '#fffaf0');   // the head
      r(0, 2, 5, 4, '#e8a030');   // the beer
      r(1, 3, 1, 2, '#f8c860');
      r(5, 2, 1, 3, '#c8d0d8');   // the handle
    });
    tex.refresh();
  }
  const { cups } = scene.room;
  scene.beer = [cups[0], cups[1]].map(({ x, y }) => scene.add.image(x, y + 1, 'beer-mug').setOrigin(0.5, 1).setDepth(y + 1));
}

// The bookshelf: once he's seen the dry fountain, a book on dowsing.
export async function atDerikBooks(scene) {
  scene.player.face('up');
  if (!hasFlag('fountainLooked')) {
    scene.think({ af: 'Derik het ’n hele paar boeke. Niks wat ek nou nodig het nie.', en: "Derek has quite a few books. Nothing I need right now." });
    return;
  }
  if (hasFlag('dowsePlan')) {
    scene.think({ af: 'Môre gaan ek die water vir die fontein soek, met ’n mikstok!', en: "Tomorrow I'll find the fountain's water, with a dowsing rod!" });
    return;
  }
  lock(scene, true);
  await scene.think({ af: 'Hmm… “Water onder die grond vind: die mikstok en die waterwyser.” Dit klink nuttig!', en: 'Hmm… "Finding water under the ground: the dowsing rod and the water diviner." That sounds useful!' });
  await scene.think({ af: '’n Gevurkte stok van ’n wilgerboom, een punt in elke hand… en waar daar water onder die grond loop, trek die punt na onder.', en: 'A forked willow stick, one end in each hand… and where there is water running underground, the tip pulls down.' });
  await scene.think({ af: 'Natuurlik! Die fontein kry sy water van onder die grond. As ek die waterlaag kry, kry ek uit waarom dit opgedroog het.', en: 'Of course! The fountain gets its water from under the ground. If I find the water, I find out why it dried up.' });
  setFlag('readDowsing');
  beer(scene);
  await converse(scene, cast(scene), [
    ['abraham', { af: 'Gesondheid! Kom, Johan, ’n biertjie?', en: 'Cheers! Come on, Jones, a beer?' }],
    ['jones', { af: 'Baie dankie, Derik en Abraham, vir die koffie en die geselskap!', en: 'Thanks so much, Derek and Abraham, for the coffee and the company!' }],
    ['jones', { af: 'Maar ek gaan nou slaap. Ek het ’n goeie plan: môre gaan ek die water vir die fontein opspoor.', en: "But I'm off to bed now. I've got a good plan: tomorrow I'll track down the water for the fountain." }],
    ['derik', { af: 'Nou toe! Lekker slaap, Johan.', en: 'Well then! Sleep well, Jones.' }],
    ['abraham', { af: 'Sterkte môre! Die dorp reken op jou.', en: 'Good luck tomorrow! The town is counting on you.' }],
    () => { setFlag('dowsePlan'); setFlag('tired'); },
  ]);
  lock(scene, false);
}

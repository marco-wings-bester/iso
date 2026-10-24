import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { createVillager, createCharacter } from './CharacterSprite.js';
import { line } from './hints.js';
import { dateReady } from './datePlan.js';

// Faan's tailor shop in town (ROOMS.tailor): suits to rent. On Saturday,
// with his date with Steffi tonight ('datePlan', src/datePlan.js), Johan
// asks for a tuxedo; it's R300 to rent, and he hasn't a cent. But he's a
// farmer: would Faan take two hens and a basket of tomatoes? Done
// ('tuxAsked'). With the hens from the hen house ('faanHens',
// src/views/coop.js) and the tomatoes from the vegetable garden
// ('tomatoes', src/views/veg.js), Faan's pleased, and Johan changes into it
// in the cubicle in the corner: from then on he's in his tuxedo ('tuxedo',
// src/CharacterSprite.js).

const FAAN = {
  name: { af: 'Faan', en: 'Faan' }, color: '#3e6a4a',
  look: {
    hair: 'short',
    palette: {
      S: '#f0c098', s: '#d09470', B: '#3a2a1a', d: '#24180e',
      R: '#d8d8d8', r: '#a8a8a8', C: '#f4f0e8', c: '#c8c0b0', O: '#6a4a6a', o: '#4a304a',
    },
  },
};

function lock(scene, on) {
  scene.busy = on;
  scene.player.locked = on;
}

function cast(scene) {
  return {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    faan: { get sprite() { return scene.faan; }, ...FAAN },
  };
}

const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

// Faan behind his counter, a tape measure round his neck, now and then
// looking round the shop.
export function setUpTailor(scene) {
  const { room } = scene;
  createVillager(scene, 'faan-px', FAAN.look, 1);
  const { x, y } = room.faan;
  scene.faan = scene.add.sprite(x, y, 'faan-px').setOrigin(0.5, FEET_Y / FRAME_H).setDepth(y).play('faan-px-idle-down');
  const tape = scene.add.graphics().setDepth(y + 0.1);
  tape.fillStyle(0xf8d870).fillRect(x - 3, y - 14, 1, 5).fillRect(x + 2, y - 14, 1, 5);
  const look = () => scene.time.delayedCall(3000 + Math.random() * 4000, () => {
    if (!scene.busy) {
      scene.faan.play(`faan-px-idle-${Math.random() < 0.5 ? 'left' : 'right'}`);
      tape.setVisible(false);
      scene.time.delayedCall(1200, () => { scene.faan.play('faan-px-idle-down'); tape.setVisible(true); });
    }
    look();
  });
  look();
}

// At the counter: talk to Faan.
export async function atFaan(scene) {
  scene.player.face('up');
  lock(scene, true);
  const talk = steps => converse(scene, cast(scene), steps);
  if (hasFlag('tuxedo')) {
    await talk([['faan', { af: 'Jy lyk baie deftig, Johan! Geniet die aand.', en: 'You look very smart, Jones! Enjoy the evening.' }]]);
  } else if (!hasFlag('datePlan')) {
    await talk([
      ['faan', { af: 'Goeiedag! Welkom by my kleremakery. Kan ek help?', en: 'Good day! Welcome to my tailor shop. Can I help?' }],
      ['jones', { af: 'Nee dankie, ek kyk net rond.', en: "No thanks, I'm just looking." }],
    ]);
  } else if (!hasFlag('tuxAsked')) {
    await talk([
      ['faan', { af: 'Goeiedag, meneer! Welkom by my kleremakery. Ek is Faan.', en: "Good day, sir! Welcome to my tailor shop. I'm Faan." }],
      ['jones', { af: 'Goeiedag, Faan! Ek is Johan. Ek gaan vanaand uit met ’n baie mooi meisie, en ek het ’n tuxedo nodig.', en: "Good day, Faan! I'm Jones. I'm going out tonight with a very pretty girl, and I need a tuxedo." }],
      ['faan', { af: '’n Afspraak! Dan het ek net die regte een vir jou. Dit kos R300 om te huur.', en: 'A date! Then I have just the one for you. It costs R300 to rent.' }],
      ['jones', { af: 'R300… Ek het ongelukkig nie ’n sent nie.', en: "R300… Unfortunately I haven't got a cent." }],
      ['faan', { af: 'Hmm. Dis ’n probleem.', en: "Hmm. That's a problem." }],
      ['jones', { af: 'Wag… ek is ’n boer. Sal jy nie dalk iets van my plaas aanvaar nie? Ek het hoenders, en tamaties.', en: "Wait… I'm a farmer. Would you take something from my farm instead? I have hens, and tomatoes." }],
      ['faan', { af: 'Hoenders en tamaties? Nou praat jy my taal! My vrou maak die beste tamatiebredie in die dorp.', en: 'Hens and tomatoes? Now you’re talking! My wife makes the best tomato stew in town.' }],
      ['faan', { af: 'Bring vir my twee hoenders en ’n mandjie tamaties, dan is die tuxedo joune vir die aand.', en: "Bring me two hens and a basket of tomatoes, and the tuxedo's yours for the evening." }],
      ['jones', { af: 'Afgespreek! Ek is nou terug.', en: "Deal! I'll be right back." }],
      () => setFlag('tuxAsked'),
    ]);
    const hint = line('tuxTrade');
    if (hint) await scene.think(hint);
  } else if (!hasFlag('faanHens') || !hasFlag('tomatoes')) {
    const still = !hasFlag('faanHens') && !hasFlag('tomatoes')
      ? { af: 'Nog nie… ek gaan haal hulle nou.', en: "Not yet… I'm off to fetch them now." }
      : !hasFlag('faanHens')
        ? { af: 'Ek het die tamaties, maar nog nie die hoenders nie.', en: "I have the tomatoes, but not the hens yet." }
        : { af: 'Ek het die hoenders, maar nog nie die tamaties nie.', en: "I have the hens, but not the tomatoes yet." };
    await talk([
      ['faan', { af: 'En, Johan? Het jy die hoenders en die tamaties?', en: 'Well, Jones? Have you got the hens and the tomatoes?' }],
      ['jones', still],
    ]);
  } else {
    await talk([
      ['jones', { af: 'Hier is jou twee hoenders, Faan, en ’n mandjie vol tamaties!', en: 'Here are your two hens, Faan, and a basket full of tomatoes!' }],
      ['faan', { af: 'Pragtig! Mooi vet hoenders. En kyk net hierdie tamaties, so rooi soos ’n brandweerwa!', en: 'Splendid! Nice plump hens. And just look at these tomatoes, as red as a fire engine!' }],
      ['faan', { af: 'Die tuxedo is joune vir die aand. Gaan pas hom aan, daar in die hoek.', en: "The tuxedo's yours for the evening. Go and try it on, there in the corner." }],
    ]);
    await change(scene);
    await talk([
      ['faan', { af: 'Kyk net hoe lyk jy! Soos ’n filmster.', en: 'Just look at you! Like a film star.' }],
      ['jones', { af: 'Dankie, Faan! Steffi gaan haar oë nie glo nie.', en: "Thanks, Faan! Steffi won't believe her eyes." }],
    ]);
    await dateReady(scene);
  }
  lock(scene, false);
}

// Into the cubicle, the curtain drawn; a rustle and a thump or two behind
// it; then out he comes in his tuxedo.
async function change(scene) {
  const { player, room } = scene;
  const { stand } = room.spots.cubicle;
  await new Promise(r => player.walkTo(stand.x, stand.y, r));
  player.face('up');
  await wait(scene, 200);
  player.sprite.setVisible(false);
  const curtain = scene.roomImage('cubicle-shut', room.cubicle.shut).setDepth(60);
  for (let i = 0; i < 6; i++) {
    scene.tweens.add({ targets: curtain, x: curtain.x + (i % 2 ? 1 : -1), duration: 90, yoyo: true });
    await wait(scene, 380);
  }
  setFlag('tuxedo');
  createCharacter(scene); // (drawn again, in his tuxedo)
  await wait(scene, 300);
  curtain.destroy();
  player.sprite.setVisible(true);
  player.face('down');
  await wait(scene, 500);
}

// The cubicle, when it's not time to change.
export function atCubicle(scene) {
  scene.player.face('up');
  scene.think(hasFlag('tuxedo')
    ? { af: 'My oorpak kan maar hier wag tot môre.', en: 'My overalls can wait here till tomorrow.' }
    : { af: '’n Paskamer.', en: 'A changing room.' });
}

// The suits on the rail, and the tuxedo on the dummy.
export function atSuits(scene) {
  scene.player.face('up');
  scene.think(hasFlag('tuxedo')
    ? { af: 'Ek dink myne is die deftigste van almal.', en: 'I think mine is the smartest of them all.' }
    : { af: 'Pakke en baadjies… en ’n tuxedo. Baie deftig.', en: 'Suits and jackets… and a tuxedo. Very smart.' });
}

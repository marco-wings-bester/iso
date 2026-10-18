import { t } from './i18n.js';
import { today, dayName, daysToBraai } from './days.js';

// The night has passed: a sunrise over the hills, the new day's name ("the
// next morning… Tuesday") and, if Derik's braai is coming up, a reminder.
// Stays until a tap or key (after a moment, so a tap meant for the night
// doesn't skip it); resolves once it has faded away.
export function morning() {
  const braai = daysToBraai();
  const note = braai === 1 ? { af: 'Môreaand is Derik se braai.', en: "Tomorrow evening is Derek's braai." }
    : braai === 0 ? { af: 'Vanaand is Derik se braai!', en: "Tonight is Derek's braai!" }
      : null;
  const div = (className, text = '') => Object.assign(document.createElement('div'), { className, textContent: text });
  const card = div('');
  card.id = 'morning';
  const words = div('words');
  words.append(
    div('sub', t({ af: 'Die volgende oggend…', en: 'The next morning…' })),
    div('day', t(dayName(today()))),
  );
  if (note) words.append(div('note', t(note)));
  words.append(div('tap', t({ af: 'Tik om aan te gaan ▼', en: 'Tap to carry on ▼' })));
  card.append(div('sky'), div('sun'), div('hills'), div('night'), words);
  document.body.append(card);

  return new Promise((resolve) => {
    const go = (e) => {
      if (e.repeat) return;
      e.preventDefault?.();
      removeEventListener('pointerdown', go, true);
      removeEventListener('keydown', go, true);
      card.classList.add('done');
      setTimeout(() => {
        card.remove();
        resolve();
      }, 500);
    };
    setTimeout(() => {
      addEventListener('pointerdown', go, true);
      addEventListener('keydown', go, true);
    }, 1200);
  });
}

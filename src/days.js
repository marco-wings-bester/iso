import { getValue, setValue } from './state.js';

// The days of the week: the story starts on a Monday, and each night Boer
// Johan sleeps it's the next day (src/InteriorScene.js, src/morning.js).

const NAMES = {
  af: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag', 'Sondag'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

// Days since the story started (0: Monday).
export function today() {
  return getValue('day') ?? 0;
}

// Day `n`'s name, { af, en }.
export function dayName(n = today()) {
  return { af: NAMES.af[n % 7], en: NAMES.en[n % 7] };
}

export function nextDay() {
  setValue('day', today() + 1);
}

// Derik's braai, the evening of the day after tomorrow from when he lent
// Johan the R15: how many days off it is now (0: tonight), or null if
// he hasn't asked him yet.
export function daysToBraai() {
  const lent = getValue('loanDay');
  return lent == null ? null : lent + 2 - today();
}

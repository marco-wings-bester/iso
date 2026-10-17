import { getSetting } from './settings.js';

// The game speaks Afrikaans (the default) or English, chosen in the menu.
// Farmer Jones is Boer Johan in Afrikaans, and Bob is Pieter. Text is
// written in both languages side by side, as { af, en }, and `t` picks the
// one for the current language when it's shown (bubbles, captions, labels
// and replies all go through it). A function is called first (a line can
// depend on how far the story has got); plain strings and null pass through.
export function lang() {
  return getSetting('lang') === 'en' ? 'en' : 'af';
}

export function t(text) {
  if (typeof text === 'function') return t(text());
  return text && typeof text === 'object' ? text[lang()] : text;
}

// Menu button (bottom-left) opening a small settings card:
// - Install app: Chrome's real install prompt when available; otherwise how
//   to install (and, on Android, a button to open the game in Chrome, since
//   in-app browsers such as a link opened from a chat app can't install).
// - Share game: the phone's share sheet with the game's link, or copy the
//   link where sharing isn't available.
// - Update game: load the newest version now, or say it's already the latest.
// - Language: Afrikaans (the default) or English (src/i18n.js); the menu
//   switches straight away, and the game from its next line.
// - Hints: how much Farmer Jones lets on about what to do next (None /
//   Subtle / Explicit; src/settings.js, src/hints.js).
// All of it in the chosen language: each text is { af, en }.
// - New game: after a confirm, forget the story so far and start again at the
//   gate (so Bob isn't there yet); `onNewGame` does the restart (main.js).

import { updateNow } from './updates.js';
import { getSetting, setSetting } from './settings.js';
import { t } from './i18n.js';
import { toast } from './toast.js';

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const GAME_URL = `${location.origin}${import.meta.env.BASE_URL}`;
const share = () => ({
  title: 'Farm Walk',
  text: t({ af: 'Kom stap saam met Boer Johan op die plaas rond! 🚜', en: 'Come and walk around the farm with Farmer Jones! 🚜' }),
  url: GAME_URL,
});

function runningAsApp() {
  return ['fullscreen', 'standalone', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches)
    || navigator.standalone === true;
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// A dimmed overlay with a card; tapping outside the card closes it.
function overlay(id, ...content) {
  const o = el('div', { id, className: 'overlay' }, el('div', { className: 'card' }, ...content));
  o.onclick = (e) => { if (e.target === o) o.remove(); };
  document.body.append(o);
  return o;
}

export function setupMenu({ onNewGame }) {
  // index.html captures the browser's install prompt as early as possible.
  let prompt = window.farmWalkInstallPrompt || null;
  window.addEventListener('farmwalk-installable', () => { prompt = window.farmWalkInstallPrompt; });
  let installed = runningAsApp();
  window.addEventListener('appinstalled', () => { installed = true; });

  const button = el('button', { id: 'menu-btn', type: 'button', textContent: '☰' });
  const showLang = () => {
    document.documentElement.lang = getSetting('lang') === 'en' ? 'en' : 'af';
    button.setAttribute('aria-label', t({ af: 'Kieslys', en: 'Menu' }));
  };
  showLang();
  document.body.append(button);

  let menu = null;
  const closeMenu = () => {
    menu?.remove();
    menu = null;
  };

  async function install() {
    closeMenu();
    if (!prompt) {
      showInstallHelp();
      return;
    }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null; // a prompt can only be used once
    window.farmWalkInstallPrompt = null;
    if (outcome === 'accepted') installed = true;
  }

  async function shareGame() {
    const SHARE = share();
    if (navigator.share) {
      try {
        await navigator.share(SHARE);
        closeMenu();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // they closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(`${SHARE.text} ${GAME_URL}`);
      closeMenu();
      toast(t({ af: 'Skakel gekopieer — plak dit vir ’n vriend!', en: 'Link copied — paste it to a friend!' }));
    } catch {
      showLink();
    }
  }

  // Last resort: show the link so it can be copied by hand.
  function showLink() {
    closeMenu();
    const input = el('input', { className: 'link', value: GAME_URL, readOnly: true });
    const done = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Klaar', en: 'Done' }) });
    const o = overlay('share-link',
      el('h2', { textContent: t({ af: 'Deel Farm Walk', en: 'Share Farm Walk' }) }),
      el('p', { textContent: t({ af: 'Kopieer hierdie skakel en stuur dit vir ’n vriend:', en: 'Copy this link and send it to a friend:' }) }),
      input, el('div', { className: 'actions' }, done));
    done.onclick = () => o.remove();
    input.focus();
    input.select();
  }

  async function update(btn) {
    btn.disabled = true;
    btn.textContent = t({ af: '⏳ Kyk tans…', en: '⏳ Checking…' });
    const result = await updateNow();
    if (result === 'updating') {
      btn.textContent = t({ af: '⏳ Dateer op…', en: '⏳ Updating…' });
      return;
    }
    closeMenu();
    toast(result === 'latest'
      ? t({ af: '✓ Jy het die nuutste weergawe', en: '✓ You have the latest version' })
      : t({ af: 'Kan nie nou kyk nie — vanlyn?', en: "Can't check right now — offline?" }));
  }

  function confirmNewGame() {
    closeMenu();
    const cancel = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Kanselleer', en: 'Cancel' }) });
    const start = el('button', { type: 'button', className: 'btn primary', textContent: t({ af: 'Begin oor', en: 'Start over' }) });
    const o = overlay('new-game',
      el('h2', { textContent: t({ af: 'Begin ’n nuwe speletjie?', en: 'Start a new game?' }) }),
      el('p', { textContent: t({
        af: 'Boer Johan begin weer by die plaashek en Pieter gaan huis toe. Alles wat jy tot dusver gedoen het, word vergeet.',
        en: 'Farmer Jones starts again at the farm gate and Bob goes home. Everything done so far is forgotten.',
      }) }),
      el('div', { className: 'actions' }, cancel, start));
    cancel.onclick = () => o.remove();
    start.onclick = () => {
      o.remove();
      onNewGame();
      toast(t({ af: '🌅 Nuwe speletjie begin', en: '🌅 New game started' }));
    };
  }

  function showInstallHelp() {
    const b = text => el('b', { textContent: text });
    const steps = el('p');
    const actions = el('div', { className: 'actions' });
    // (Chrome's and Safari's own menus are named as the phone shows them)
    if (isAndroid) {
      const openIn = t({ af: 'Maak oop in Chrome', en: 'Open in Chrome' });
      steps.append(...t({
        af: [
          'Installeer werk net in Chrome. As jy dit uit ’n ander app oopgemaak het, tik ', b(openIn), ', maak dan die ',
          b('☰ kieslys'), ' oop en tik weer ', b('Installeer app'), '.', el('br'), el('br'),
          'Reeds in Chrome? Tik ', b('⋮'), ' (regs bo) → ', b('Install app'), ' of ', b('Add to Home screen'), '.',
        ],
        en: [
          'Installing only works in Chrome. If you opened this from another app, tap ', b(openIn), ', then open the ',
          b('☰ menu'), ' and tap ', b('Install app'), ' again.', el('br'), el('br'),
          'Already in Chrome? Tap ', b('⋮'), ' (top right) → ', b('Install app'), ' or ', b('Add to Home screen'), '.',
        ],
      }));
      const url = `${location.host}${location.pathname}`;
      const fallback = encodeURIComponent(`https://${url}`);
      actions.append(el('a', {
        className: 'btn primary',
        href: `intent://${url}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`,
        textContent: openIn,
      }));
    } else if (isIOS) {
      steps.append(...t({
        af: ['Tik in Safari op die ', b('Share'), '-knoppie, dan op ', b('Add to Home Screen'), '.'],
        en: ['In Safari, tap the ', b('Share'), ' button, then ', b('Add to Home Screen'), '.'],
      }));
    } else {
      steps.append(...t({
        af: ['Maak hierdie bladsy in Chrome op jou foon oop, en tik dan ', b('⋮'), ' → ', b('Install app'), '.'],
        en: ['Open this page in Chrome on your phone, then tap ', b('⋮'), ' → ', b('Install app'), '.'],
      }));
    }
    const close = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Maak toe', en: 'Close' }) });
    actions.append(close);
    const o = overlay('install-help', el('h2', { textContent: t({ af: 'Installeer Farm Walk', en: 'Install Farm Walk' }) }), steps, actions);
    close.onclick = () => o.remove();
  }

  // A row of the menu choosing a setting: a label, then buttons side by side
  // (the chosen one pressed).
  function setting(label, name, options, onPick) {
    const seg = el('div', { className: 'seg' });
    options.forEach(([value, text]) => {
      const b = el('button', { type: 'button', textContent: text });
      b.setAttribute('aria-pressed', String(getSetting(name) === value));
      b.onclick = () => {
        setSetting(name, value);
        seg.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        onPick?.();
      };
      seg.append(b);
    });
    return el('div', { className: 'setting' }, el('span', { textContent: label }), seg);
  }

  function openMenu() {
    const installBtn = el('button', { type: 'button', className: 'btn primary', textContent: t({ af: '⬇ Installeer app', en: '⬇ Install app' }) });
    if (installed) {
      installBtn.textContent = t({ af: '✓ Geïnstalleer', en: '✓ Installed' });
      installBtn.disabled = true;
    }
    installBtn.onclick = install;
    const shareBtn = el('button', { type: 'button', className: 'btn share', textContent: t({ af: '📤 Deel speletjie', en: '📤 Share game' }) });
    shareBtn.onclick = shareGame;
    const updateBtn = el('button', { type: 'button', className: 'btn update', textContent: t({ af: '🔄 Dateer speletjie op', en: '🔄 Update game' }) });
    updateBtn.onclick = () => update(updateBtn);
    const newBtn = el('button', { type: 'button', className: 'btn new', textContent: t({ af: '🌅 Nuwe speletjie', en: '🌅 New game' }) });
    newBtn.onclick = confirmNewGame;
    // the language: the menu redraws in it straight away
    const language = setting(t({ af: '🌐 Taal', en: '🌐 Language' }), 'lang', [['af', 'Afrikaans'], ['en', 'English']], () => {
      showLang();
      closeMenu();
      openMenu();
    });
    const hints = setting(t({ af: '💡 Wenke', en: '💡 Hints' }), 'hints', [
      ['none', t({ af: 'Geen', en: 'None' })],
      ['subtle', t({ af: 'Subtiel', en: 'Subtle' })],
      ['explicit', t({ af: 'Duidelik', en: 'Explicit' })],
    ]);
    const close = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Maak toe', en: 'Close' }) });
    close.onclick = closeMenu;
    menu = overlay('menu', el('h2', { textContent: 'Farm Walk' }), el('div', { className: 'menu-buttons' }, installBtn, shareBtn, updateBtn, newBtn, language, hints, close));
  }

  button.onclick = () => {
    if (menu?.isConnected) closeMenu(); // (it may have been closed by a tap outside it)
    else openMenu();
  };
}

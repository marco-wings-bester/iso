// Played in a browser (not installed): a welcome card each time it's opened,
// on how to install it (step by step, for the phone and browser it's in, or
// Chrome's own install prompt in one tap when it offers one) and where the
// menu is; closing it points out the menu button. And, until it's installed,
// an "Install" button beside the menu button.
//
// The day of the week, always at the top of the screen (src/days.js).
//
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
// - Which day of the week it is in the story (src/days.js).
// - New game: after a confirm, forget the story so far and start again at the
//   gate (so Bob isn't there yet); `onNewGame` does the restart (main.js).
// And, not in the menu: the day select (`showDays`, opened by a secret under
// the big pine), starting on any day of the week; `onDay` does it (main.js).

import { updateNow } from './updates.js';
import { getSetting, setSetting } from './settings.js';
import { t } from './i18n.js';
import { toast } from './toast.js';
import { dayName, today } from './days.js';
import { chores } from './chores.js';

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// an app's own browser (a link opened in Facebook, Instagram…), which can't
// install; on an iPhone, any without Safari's name in it
const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|Twitter|TikTok/i.test(navigator.userAgent)
  || (isIOS && !/Safari\//.test(navigator.userAgent));
const iosOtherBrowser = isIOS && /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent); // Chrome, Firefox, Edge
const ICON = `${import.meta.env.BASE_URL}icons/icon-192.png`;
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

// The share button as iPhones draw it: a box with an arrow out of the top.
function shareIcon() {
  return el('span', {
    className: 'ico',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2a6fd6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9H6v11h12V9h-2"/><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/></svg>',
  });
}

// A dimmed overlay with a card; tapping outside the card closes it.
function overlay(id, ...content) {
  const o = el('div', { id, className: 'overlay' }, el('div', { className: 'card' }, ...content));
  o.onclick = (e) => { if (e.target === o) o.remove(); };
  document.body.append(o);
  return o;
}

export function setupMenu({ onNewGame, onDay }) {
  // index.html captures the browser's install prompt as early as possible.
  let prompt = window.farmWalkInstallPrompt || null;
  window.addEventListener('farmwalk-installable', () => { prompt = window.farmWalkInstallPrompt; });
  let installed = runningAsApp();

  const button = el('button', { id: 'menu-btn', type: 'button', textContent: '☰' });
  // until it's installed: an Install button beside the menu button
  const pill = el('button', { id: 'install-pill', type: 'button' });
  pill.onclick = () => install();
  // the day of the week, at the top (a new day, a new game, another language):
  // shown only for a few seconds, waking up to a new day and coming into a
  // new place (`flashDay`), and through the night (index.html), then hidden
  let dayTimer = null;
  const day = el('div', { id: 'day' });
  const flashDay = () => {
    day.classList.add('shown');
    clearTimeout(dayTimer);
    dayTimer = setTimeout(() => day.classList.remove('shown'), 3000);
  };
  const showDay = () => { day.textContent = t(dayName()); };
  window.addEventListener('farmwalk-day', () => { showDay(); flashDay(); });
  const showLang = () => {
    document.documentElement.lang = getSetting('lang') === 'en' ? 'en' : 'af';
    button.setAttribute('aria-label', t({ af: 'Kieslys', en: 'Menu' }));
    pill.textContent = t({ af: '⬇ Installeer', en: '⬇ Install' });
    showDay();
  };
  showLang();
  document.body.append(day, button);
  if (!installed) document.body.append(pill);
  window.addEventListener('appinstalled', () => {
    installed = true;
    pill.remove();
  });

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
    document.getElementById('install-help')?.remove();
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null; // a prompt can only be used once
    window.farmWalkInstallPrompt = null;
    if (outcome === 'accepted') {
      installed = true;
      pill.remove();
    }
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

  // How to install it, for the phone and browser it's open in: `body` (the
  // steps) and `buttons`. Chrome's and Safari's own menus are named as the
  // phone shows them.
  function installHow() {
    const b = text => el('b', { textContent: text });
    const key = text => el('span', { className: 'key', textContent: text });
    const steps = (...items) => el('ol', { className: 'steps' }, ...items.map(item => el('li', {}, ...item)));
    const body = [];
    const buttons = [];
    if (prompt) {
      // Chrome offers its own install: one tap
      body.push(el('p', { textContent: t({ af: 'Een tik, en Farm Walk is op jou tuisskerm.', en: "One tap, and Farm Walk is on your home screen." }) }));
      const now = el('button', { type: 'button', className: 'btn primary big', textContent: t({ af: '⬇ Installeer nou', en: '⬇ Install now' }) });
      now.onclick = () => install();
      buttons.push(now);
    } else if (isAndroid) {
      body.push(steps(...t({
        af: [['Tik ', key('⋮'), ' regs bo in Chrome.'], ['Tik ', b('Install app'), ' of ', b('Add to Home screen'), '.'], ['Tik ', b('Install'), '.']],
        en: [['Tap ', key('⋮'), ' at the top right in Chrome.'], ['Tap ', b('Install app'), ' or ', b('Add to Home screen'), '.'], ['Tap ', b('Install'), '.']],
      })));
      body.push(el('p', { className: 'note', textContent: t({
        af: 'Oopgemaak uit WhatsApp of ’n ander app? Dit installeer net in Chrome: maak dit eers daar oop.',
        en: 'Opened from WhatsApp or another app? It only installs in Chrome: open it there first.',
      }) }));
      const url = `${location.host}${location.pathname}`;
      const fallback = encodeURIComponent(`https://${url}`);
      buttons.push(el('a', {
        className: 'btn primary',
        href: `intent://${url}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`,
        textContent: t({ af: 'Maak oop in Chrome', en: 'Open in Chrome' }),
      }));
    } else if (isIOS && inAppBrowser) {
      body.push(el('p', { textContent: t({
        af: 'Hierdie app se blaaier kan dit nie installeer nie. Maak dit in Safari oop:',
        en: "This app's browser can't install it. Open it in Safari:",
      }) }));
      body.push(steps(...t({
        af: [['Tik ', key('···'), ' of ', key('🧭'), ' en kies ', b('Open in Safari'), ' (of kopieer die skakel en plak dit in Safari).'],
          ['Tik dan die deel-knoppie ', shareIcon(), ' en ', b('Add to Home Screen'), '.']],
        en: [['Tap ', key('···'), ' or ', key('🧭'), ' and choose ', b('Open in Safari'), ' (or copy the link and paste it into Safari).'],
          ['Then tap the share button ', shareIcon(), ' and ', b('Add to Home Screen'), '.']],
      })));
      buttons.push(copyLink());
    } else if (isIOS) {
      body.push(steps(...t({
        af: [
          iosOtherBrowser
            ? ['Tik die deel-knoppie ', shareIcon(), ' by die adresbalk.']
            : ['Tik die deel-knoppie ', shareIcon(), ' onder aan die skerm (op nuwer iPhones eers ', key('···'), ').'],
          ['Rol af en tik ', b('Add to Home Screen'), '.'],
          ['Tik ', b('Add'), '.'],
        ],
        en: [
          iosOtherBrowser
            ? ['Tap the share button ', shareIcon(), ' by the address bar.']
            : ['Tap the share button ', shareIcon(), ' at the bottom of the screen (on newer iPhones, ', key('···'), ' first).'],
          ['Scroll down and tap ', b('Add to Home Screen'), '.'],
          ['Tap ', b('Add'), '.'],
        ],
      })));
    } else {
      // a computer
      body.push(el('p', {}, ...t({
        af: ['Op jou foon: maak hierdie skakel daar oop en installeer dit. Op ’n rekenaar: klik die installeer-ikoon regs in die adresbalk, of ', key('⋮'), ' → ', b('Install Farm Walk'), '.'],
        en: ['On your phone: open this link there and install it. On a computer: click the install icon at the right of the address bar, or ', key('⋮'), ' → ', b('Install Farm Walk'), '.'],
      })));
      buttons.push(copyLink());
    }
    return { body, buttons };
  }

  // A button copying the game's link (to paste into another browser).
  function copyLink() {
    const btn = el('button', { type: 'button', className: 'btn share', textContent: t({ af: '📋 Kopieer die skakel', en: '📋 Copy the link' }) });
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(GAME_URL);
        btn.textContent = t({ af: '✓ Gekopieer', en: '✓ Copied' });
      } catch {
        showLink();
      }
    };
    return btn;
  }

  function showInstallHelp() {
    document.getElementById('install-help')?.remove();
    const { body, buttons } = installHow();
    const close = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Maak toe', en: 'Close' }) });
    const o = overlay('install-help',
      el('h2', { textContent: t({ af: '📲 Installeer Farm Walk', en: '📲 Install Farm Walk' }) }),
      el('p', { className: 'perks', textContent: t({ af: 'Gratis · speel sonder internet · begin met een tik van jou tuisskerm af', en: 'Free · plays offline · starts with one tap from your home screen' }) }),
      ...body,
      el('div', { className: 'menu-buttons' }, ...buttons, close));
    close.onclick = () => o.remove();
  }

  // Each time it's opened in a browser: welcome, how to install it, and
  // where the menu is. (Its language can be picked right here.)
  let welcomeCard = null;
  function welcome() {
    if (installed) return;
    const render = () => {
      welcomeCard?.remove();
      const { body, buttons } = installHow();
      const play = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: '▶ Speel eers in die blaaier', en: '▶ Play in the browser for now' }) });
      const language = setting('🌐', 'lang', [['af', 'Afrikaans'], ['en', 'English']], () => {
        showLang();
        render();
      });
      welcomeCard = overlay('welcome',
        el('div', { className: 'welcome-head' },
          el('img', { src: ICON, alt: '' }),
          el('h2', { textContent: t({ af: 'Welkom by Farm Walk!', en: 'Welcome to Farm Walk!' }) })),
        language,
        el('p', { textContent: t({ af: 'Tik op die skerm om Boer Johan te laat loop, en tik op goed om dit te gebruik.', en: 'Tap the screen to walk Farmer Jones about, and tap things to use them.' }) }),
        el('div', { className: 'section install' },
          el('h3', { textContent: t({ af: '📲 Installeer dit as ’n app', en: '📲 Install it as an app' }) }),
          el('p', { className: 'perks', textContent: t({ af: 'Gratis · speel sonder internet · begin met een tik van jou tuisskerm af', en: 'Free · plays offline · starts with one tap from your home screen' }) }),
          ...body,
          el('div', { className: 'menu-buttons' }, ...buttons)),
        el('div', { className: 'section' },
          el('h3', {}, el('span', { className: 'menu-icon', textContent: '☰' }), ' ', t({ af: 'Die kieslys', en: 'The menu' })),
          el('p', { textContent: t({
            af: 'Links onder op die skerm: installeer, deel die speletjie, taal, wenke en ’n nuwe speletjie. Tot dit geïnstalleer is, is daar ook ’n geel Installeer-knoppie langsaan.',
            en: "At the bottom left of the screen: install, share the game, language, hints and a new game. Until it's installed, there's a yellow Install button beside it too.",
          }) })),
        el('div', { className: 'menu-buttons' }, play));
      const close = () => {
        welcomeCard.remove();
        welcomeCard = null;
        pointToMenu();
      };
      play.onclick = close;
      welcomeCard.onclick = (e) => { if (e.target === welcomeCard) close(); };
    };
    render();
    // Chrome may offer its install prompt a moment later: then it's one tap
    window.addEventListener('farmwalk-installable', () => { if (welcomeCard?.isConnected) render(); });
  }

  // The menu button, pulsing, with a note pointing at it, until the next tap.
  function pointToMenu() {
    document.getElementById('menu-tip')?.remove();
    const tip = el('div', { id: 'menu-tip', className: 'tip', textContent: t({ af: '☰ Die kieslys: installeer, deel, taal en meer', en: '☰ The menu: install, share, language and more' }) });
    document.body.append(tip);
    button.classList.add('pulse');
    const done = () => {
      tip.remove();
      button.classList.remove('pulse');
      removeEventListener('pointerdown', done, true);
      removeEventListener('keydown', done, true);
    };
    setTimeout(() => {
      addEventListener('pointerdown', done, true);
      addEventListener('keydown', done, true);
    });
    setTimeout(done, 10000);
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
    const day = dayName();
    const today = el('p', { className: 'today', textContent: t({ af: `Vandag is dit ${day.af}`, en: `Today is ${day.en}` }) });
    // the day's farm work, ticked off as it's done
    chores().forEach(j => today.append(el('br'), `${j.done ? '✅' : '⬜'} ${t(j.text)}`));
    menu = overlay('menu', el('h2', { textContent: 'Farm Walk' }), today, el('div', { className: 'menu-buttons' }, installBtn, shareBtn, updateBtn, newBtn, language, hints, close));
  }

  button.onclick = () => {
    if (menu?.isConnected) closeMenu(); // (it may have been closed by a tap outside it)
    else openMenu();
  };

  // The secret day select: a button for each day of the week (today's
  // pressed); the game starts again on the one chosen.
  function showDays() {
    closeMenu();
    document.getElementById('days')?.remove();
    const now = today();
    const cancel = el('button', { type: 'button', className: 'btn secondary', textContent: t({ af: 'Kanselleer', en: 'Cancel' }) });
    const buttons = [0, 1, 2, 3, 4, 5, 6].map((n) => {
      const name = t(dayName(n));
      const b = el('button', { type: 'button', className: `btn ${n === now ? 'update' : 'new'}`, textContent: name });
      b.onclick = () => {
        o.remove();
        onDay(n);
        toast(name);
      };
      return b;
    });
    const o = overlay('days',
      el('h2', { textContent: t({ af: '🌲 Kies ’n dag', en: '🌲 Choose a day' }) }),
      el('p', { textContent: t({ af: 'Jy het die geheim van die dennebolle gevind!', en: 'You found the secret of the pine cones!' }) }),
      el('div', { className: 'day-grid' }, ...buttons),
      el('div', { className: 'menu-buttons' }, cancel));
    cancel.onclick = () => o.remove();
  }

  return { showDays, welcome, flashDay };
}

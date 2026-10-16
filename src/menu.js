// Menu button (bottom-left) opening a small settings card:
// - Install app: Chrome's real install prompt when available; otherwise how
//   to install (and, on Android, a button to open the game in Chrome, since
//   in-app browsers such as a link opened from a chat app can't install).
// - Share game: the phone's share sheet with the game's link, or copy the
//   link where sharing isn't available.
// - Update game: load the newest version now, or say it's already the latest.
// - Hints: how much Farmer Jones lets on about what to do next (None /
//   Subtle / Explicit; src/settings.js, src/hints.js).
// - New game: after a confirm, forget the story so far and start again at the
//   gate (so Bob isn't there yet); `onNewGame` does the restart (main.js).

import { updateNow } from './updates.js';
import { getSetting, setSetting } from './settings.js';

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const GAME_URL = `${location.origin}${import.meta.env.BASE_URL}`;
const SHARE = {
  title: 'Farm Walk',
  text: 'Come and walk around the farm with Farmer Jones! 🚜',
  url: GAME_URL,
};

function runningAsApp() {
  return ['fullscreen', 'standalone', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches)
    || navigator.standalone === true;
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function toast(text) {
  document.getElementById('menu-toast')?.remove();
  const t = el('div', { id: 'menu-toast', className: 'toast', textContent: text });
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
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
  button.setAttribute('aria-label', 'Menu');
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

  async function share() {
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
      toast('Link copied — paste it to a friend!');
    } catch {
      showLink();
    }
  }

  // Last resort: show the link so it can be copied by hand.
  function showLink() {
    closeMenu();
    const input = el('input', { className: 'link', value: GAME_URL, readOnly: true });
    const done = el('button', { type: 'button', className: 'btn secondary', textContent: 'Done' });
    const o = overlay('share-link', el('h2', { textContent: 'Share Farm Walk' }), el('p', { textContent: 'Copy this link and send it to a friend:' }), input, el('div', { className: 'actions' }, done));
    done.onclick = () => o.remove();
    input.focus();
    input.select();
  }

  async function update(btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Checking…';
    const result = await updateNow();
    if (result === 'updating') {
      btn.textContent = '⏳ Updating…';
      return;
    }
    closeMenu();
    toast(result === 'latest' ? '✓ You have the latest version' : "Can't check right now — offline?");
  }

  function confirmNewGame() {
    closeMenu();
    const cancel = el('button', { type: 'button', className: 'btn secondary', textContent: 'Cancel' });
    const start = el('button', { type: 'button', className: 'btn primary', textContent: 'Start over' });
    const o = overlay('new-game',
      el('h2', { textContent: 'Start a new game?' }),
      el('p', { textContent: "Farmer Jones starts again at the farm gate and Bob goes home. Everything done so far is forgotten." }),
      el('div', { className: 'actions' }, cancel, start));
    cancel.onclick = () => o.remove();
    start.onclick = () => {
      o.remove();
      onNewGame();
      toast('🌅 New game started');
    };
  }

  function showInstallHelp() {
    const steps = el('p');
    const actions = el('div', { className: 'actions' });
    if (isAndroid) {
      steps.append(
        'Installing only works in Chrome. If you opened this from another app, tap ',
        el('b', { textContent: 'Open in Chrome' }), ', then open the ',
        el('b', { textContent: '☰ menu' }), ' and tap ', el('b', { textContent: 'Install app' }), ' again.',
        el('br'), el('br'),
        'Already in Chrome? Tap ', el('b', { textContent: '⋮' }), ' (top right) → ',
        el('b', { textContent: 'Install app' }), ' or ', el('b', { textContent: 'Add to Home screen' }), '.',
      );
      const url = `${location.host}${location.pathname}`;
      const fallback = encodeURIComponent(`https://${url}`);
      actions.append(el('a', {
        className: 'btn primary',
        href: `intent://${url}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`,
        textContent: 'Open in Chrome',
      }));
    } else if (isIOS) {
      steps.append(
        'In Safari, tap the ', el('b', { textContent: 'Share' }), ' button, then ',
        el('b', { textContent: 'Add to Home Screen' }), '.',
      );
    } else {
      steps.append(
        'Open this page in Chrome on your phone, then tap ', el('b', { textContent: '⋮' }), ' → ',
        el('b', { textContent: 'Install app' }), '.',
      );
    }
    const close = el('button', { type: 'button', className: 'btn secondary', textContent: 'Close' });
    actions.append(close);
    const o = overlay('install-help', el('h2', { textContent: 'Install Farm Walk' }), steps, actions);
    close.onclick = () => o.remove();
  }

  button.onclick = () => {
    if (menu) {
      closeMenu();
      return;
    }
    const installBtn = el('button', { type: 'button', className: 'btn primary', textContent: '⬇ Install app' });
    if (installed) {
      installBtn.textContent = '✓ Installed';
      installBtn.disabled = true;
    }
    installBtn.onclick = install;
    const shareBtn = el('button', { type: 'button', className: 'btn share', textContent: '📤 Share game' });
    shareBtn.onclick = share;
    const updateBtn = el('button', { type: 'button', className: 'btn update', textContent: '🔄 Update game' });
    updateBtn.onclick = () => update(updateBtn);
    const newBtn = el('button', { type: 'button', className: 'btn new', textContent: '🌅 New game' });
    newBtn.onclick = confirmNewGame;
    const seg = el('div', { className: 'seg' });
    [['none', 'None'], ['subtle', 'Subtle'], ['explicit', 'Explicit']].forEach(([value, label]) => {
      const b = el('button', { type: 'button', textContent: label });
      b.setAttribute('aria-pressed', String(getSetting('hints') === value));
      b.onclick = () => {
        setSetting('hints', value);
        seg.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      };
      seg.append(b);
    });
    const hints = el('div', { className: 'hints' }, el('span', { textContent: '💡 Hints' }), seg);
    const close = el('button', { type: 'button', className: 'btn secondary', textContent: 'Close' });
    close.onclick = closeMenu;
    menu = overlay('menu', el('h2', { textContent: 'Farm Walk' }), el('div', { className: 'menu-buttons' }, installBtn, shareBtn, updateBtn, newBtn, hints, close));
  };
}

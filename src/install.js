// "Install app" button. On Android Chrome it opens the browser's real install
// prompt. Where that isn't available (e.g. an in-app browser such as a link
// opened from a chat app), it explains how and offers to open the game in
// Chrome, where the button works. Hidden once the game runs as an app.

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function runningAsApp() {
  return ['fullscreen', 'standalone', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches)
    || navigator.standalone === true;
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function setupInstallButton() {
  if (runningAsApp()) return;

  // index.html captures the browser's install prompt as early as possible.
  let prompt = window.farmWalkInstallPrompt || null;
  window.addEventListener('farmwalk-installable', () => { prompt = window.farmWalkInstallPrompt; });

  const button = el('button', { id: 'install-btn', type: 'button', textContent: '⬇ Install app' });
  document.body.append(button);
  window.addEventListener('appinstalled', () => { button.remove(); closeHelp(); });

  let help = null;
  function closeHelp() {
    help?.remove();
    help = null;
  }

  function showHelp() {
    closeHelp();
    const steps = el('p');
    const actions = el('div', { className: 'install-actions' });

    if (isAndroid) {
      steps.append(
        'Installing only works in Chrome. If you opened this from another app, tap ',
        el('b', { textContent: 'Open in Chrome' }),
        ', then tap ',
        el('b', { textContent: '⬇ Install app' }),
        ' again.',
        el('br'), el('br'),
        'Already in Chrome? Tap ', el('b', { textContent: '⋮' }), ' (top right) → ',
        el('b', { textContent: 'Install app' }), ' or ', el('b', { textContent: 'Add to Home screen' }), '.',
      );
      const url = `${location.host}${location.pathname}`;
      const fallback = encodeURIComponent(`https://${url}`);
      actions.append(el('a', {
        className: 'install-primary',
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
        'In Chrome or Edge, click the install icon at the right end of the address bar, or open the menu and choose ',
        el('b', { textContent: 'Install Farm Walk' }), '.',
      );
    }

    const close = el('button', { type: 'button', className: 'install-secondary', textContent: 'Close' });
    close.onclick = closeHelp;
    actions.append(close);

    help = el('div', { id: 'install-help' }, el('div', { className: 'install-card' },
      el('h2', { textContent: 'Install Farm Walk' }), steps, actions));
    help.onclick = (e) => { if (e.target === help) closeHelp(); };
    document.body.append(help);
  }

  button.onclick = async () => {
    if (!prompt) {
      showHelp();
      return;
    }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null; // a prompt can only be used once
    window.farmWalkInstallPrompt = null;
    if (outcome === 'accepted') button.remove();
  };
}

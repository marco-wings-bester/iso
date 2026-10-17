// Offline support: precache the shell + maps, then cache everything else
// (hashed JS bundles) the first time it is fetched. Built into dist/sw.js by
// vite.config.js with this build's id in the cache's name, so every new
// version starts a fresh cache (and the old one is dropped): pictures never
// get out of step with the code that uses them.
const CACHE = 'farm-walk-__BUILD_ID__';
const PICTURES = ['map.png', 'crossroads.jpg', 'seaside.jpg', 'seaside-sprites.png', 'seaside-overhead.png'];
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', ...PICTURES.map(p => `assets/${p}?v=__BUILD_ID__`)];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  // Version checks must always reach the server.
  if (url.pathname.endsWith('/version.json')) return;

  // Pages: network first so updates show up, fall back to cache offline.
  // 'no-cache' revalidates with the server instead of trusting a page the
  // browser cached before the latest deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Assets: cache first, fill cache on miss.
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }))
  );
});

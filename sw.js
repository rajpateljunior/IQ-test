/* IQ Test service worker: cache-first so the app works fully offline.
   The cache name carries the build (stamped by tools/release.py together with
   IQ.BUILD in js/update.js, version.json and the ?v= tags in index.html), so
   every release installs fresh files. version.json is never cached: the app
   reads it to show the "New update available" bar. Saves live in
   localStorage and are never touched by any of this. */
const CACHE = 'iqtest-2026.10.14a';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/core.js',
  './js/gen-matrix.js',
  './js/gen-series.js',
  './js/gen-rotation.js',
  './js/gen-verbal.js',
  './js/tasks.js',
  './js/subtests.js',
  './js/ui.js',
  './js/review.js',
  './js/update.js',
  './js/app.js',
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png',
  './icons/icon-maskable-512-v2.png',
  './icons/apple-touch-icon-v2.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's own HTTP cache, so a new release really gets the new files
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // always the network: this is how the app spots a new version
  // Page navigations (including challenge links with #ch=...) get the cached app shell
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then((c) => c.match('./index.html')).then((r) => r || fetch(req)));
    return;
  }
  // Serve only from THIS release's cache (ignoring ?v=), so files from two releases never mix
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && !url.pathname.endsWith('/sw.js')) c.put(req, res.clone());
      return res;
    })))
  );
});

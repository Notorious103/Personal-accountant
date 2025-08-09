
const CACHE = 'pa-cache-v1';
const ASSETS = [
  'index.html',
  'styles.css',
  'app.js',
  'db.js',
  'manifest.webmanifest',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => {
      return resp || fetch(e.request).catch(() => caches.match('index.html'));
    })
  );
});

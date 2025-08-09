const CACHE_NAME = 'random-spinner-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/script.js',
  './assets/cursor.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => (name !== CACHE_NAME ? caches.delete(name) : undefined))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone)).catch(() => {});
        return response;
      }).catch(() => cached)
    )
  );
});



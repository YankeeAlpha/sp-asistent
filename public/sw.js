const CACHE_NAME = 'sp-asistent-v2.5';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first: vždy načítaj najnovšiu verziu zo servera
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

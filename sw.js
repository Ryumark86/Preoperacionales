const CACHE_NAME = 'sitoc-vehiculo-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './styles.css',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Caché del sistema SITOC Vehicular activada');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(function () {
                return caches.match('./index.html');
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (cached) {
            var fetchPromise = fetch(event.request).then(function (response) {
                return caches.open(CACHE_NAME).then(function (cache) {
                    if (event.request.url.startsWith(self.location.origin)) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                });
            }).catch(function () {
                return cached;
            });
            return cached || fetchPromise;
        })
    );
});

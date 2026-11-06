const CACHE_NAME = 'asintech-static-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './js/core.js',
  './js/data.js',
  './js/guideline_renders.js',
  './js/main.js',
  './js/manager_admin.js',
  './js/manager_memos.js',
  './js/manager_photos.js',
  './js/managers.js',
  './js/map_interaction.js',
  './js/map_measure.js',
  './js/map_styles.js',
  './js/project_info.js',
  './js/search_db.js',
  './js/search_engine.js',
  './js/search_gis.js',
  './js/viewers.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames
          .filter(function (cacheName) {
            return cacheName !== CACHE_NAME;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          }));
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('./index.html', responseCopy);
          });
          return response;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(function (response) {
          if (response.ok && response.type === 'basic') {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseCopy);
            });
          }
          return response;
        });
      })
  );
});

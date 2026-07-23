const CACHE_NAME = 'ccets-app-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico'
];

const isCacheableRequest = (request) => {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return false;

  return true;
};

const putInCache = async (request, response) => {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!isCacheableRequest(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => putInCache(event.request, networkResponse))
            .catch(() => {})
        );
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          event.waitUntil(putInCache(event.request, networkResponse));
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
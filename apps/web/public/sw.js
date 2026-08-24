// Get My Moment Service Worker (v1.0.0)
const CACHE_NAME = 'getmymoment-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue install even if caching fails
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass all API, photo streams, uploads, downloads, and auth routes completely
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/download') ||
    url.pathname.includes('/thumbnail') ||
    url.pathname.includes('/events/') ||
    url.pathname.includes('/photos/') ||
    event.request.method !== 'GET'
  ) {
    return; // Direct network pass-through
  }

  // 2. Network-first strategy with cache fallback for static shell
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

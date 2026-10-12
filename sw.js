const CACHE_NAME = 'vibecheck-shell-v9';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './youtube.js',
  './data.js',
  './manifest.json',
  './Lil%20arielagrande.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

// Install: pre-cache static shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    })
  );
});

// Activate: clean up outdated caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation/HTML, stale-while-revalidate for static shell assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Bypass YouTube API, video streams, or external CDNs
  if (
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('ytimg.com')
  ) {
    return;
  }

  // Network-first for HTML pages so latest changes are always shown immediately
  const isHtml = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

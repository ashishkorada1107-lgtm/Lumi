self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: '2'
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      // Fallback if not JSON
      event.waitUntil(
        self.registration.showNotification('DailyFlow', {
          body: event.data.text(),
          icon: '/icon-192.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

const CACHE_NAME = 'dailyflow-static-cache-v1';
const PAGE_CACHE_NAME = 'dailyflow-page-cache-v1';
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];
const OFFLINE_ROUTES = new Set(['/', '/schedule', '/tasks', '/focus', '/settings']);

function isOfflinePageRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;

  const isRoute = OFFLINE_ROUTES.has(url.pathname);
  const isNavigation = request.mode === 'navigate';
  const isNextServerComponentRequest = request.headers.get('RSC') === '1';

  return isRoute && (isNavigation || isNextServerComponentRequest);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== PAGE_CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  // Only cache GET requests for static assets or Next.js static chunks
  // DO NOT cache Next.js chunks during localhost development to prevent stale HMR!
  if (event.request.method === 'GET' && (
    (!isLocalhost && url.pathname.startsWith('/_next/static/')) ||
    STATIC_ASSETS.includes(url.pathname)
  )) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Keep the latest authenticated page data available for read-only offline viewing.
  // API, Supabase, auth, and mutation requests are intentionally never cached.
  if (isOfflinePageRequest(event.request, url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          event.waitUntil(
            caches.open(PAGE_CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))
          );
        }
        return response;
      }).catch(() => {
        return caches.match(
          event.request,
          event.request.mode === 'navigate' ? { ignoreSearch: true } : undefined
        ).then((cachedResponse) => cachedResponse || Response.error());
      })
    );
    return;
  }

  // Pass-through everything else, including API and Supabase requests.
  event.respondWith(fetch(event.request));
});

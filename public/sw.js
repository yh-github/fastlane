/* Fast Lane Modernized — Offline-First & Vercel-Optimized Service Worker */
const BUILD_HASH = /* __FASTLANE_BUILD_HASH__ */ 'dev-v1';
const SHELL_CACHE = `fastlane-shell-${BUILD_HASH}`;
const MEDIA_CACHE = 'fastlane-media-v1';

const PRECACHE_URLS = /* __FASTLANE_PRECACHE_URLS__ */ [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/campaigns/campaigns.json'
];

const MEDIA_URLS = /* __FASTLANE_MEDIA_URLS__ */ [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignore transient individual fetch failure during install
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== MEDIA_CACHE && key.startsWith('fastlane-')) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );

      if (MEDIA_URLS.length > 0) {
        const validMediaSet = new Set(MEDIA_URLS);
        const mediaCache = await caches.open(MEDIA_CACHE);
        const cachedRequests = await mediaCache.keys();
        await Promise.all(
          cachedRequests.map((req) => {
            const { pathname } = new URL(req.url);
            if (!validMediaSet.has(pathname)) {
              return mediaCache.delete(req);
            }
            return Promise.resolve(false);
          })
        );
      }

      await self.clients.claim();
    })()
  );
});

async function warmMediaCache() {
  if (!MEDIA_URLS.length) return;
  const mediaCache = await caches.open(MEDIA_CACHE);
  const batchSize = 6;
  for (let i = 0; i < MEDIA_URLS.length; i += batchSize) {
    const batch = MEDIA_URLS.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const existing = await mediaCache.match(url);
          if (existing) return;
          const response = await fetch(url);
          if (response.ok) {
            await mediaCache.put(url, response);
          }
        } catch {
          // Stop quietly on offline/network errors
        }
      })
    );
  }
}

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'WARM_MEDIA_CACHE') {
    event.waitUntil(warmMediaCache());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  // SPA navigation requests: serve precached index.html immediately, with network fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(SHELL_CACHE);
        const cachedIndex =
          (await shellCache.match('/index.html')) || (await shellCache.match('/'));
        if (cachedIndex) {
          return cachedIndex;
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            await shellCache.put('/index.html', networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  const isMediaAsset =
    url.pathname.startsWith('/assets/authentic/') ||
    url.pathname.startsWith('/assets/chars/') ||
    url.pathname.startsWith('/assets/raw_images/');

  event.respondWith(
    (async () => {
      const targetCacheName = isMediaAsset ? MEDIA_CACHE : SHELL_CACHE;
      const primaryCache = await caches.open(targetCacheName);
      const cached = await primaryCache.match(url.pathname);
      if (cached) {
        return cached;
      }

      // Check secondary cache in case of shared paths
      const secondaryCache = await caches.open(isMediaAsset ? SHELL_CACHE : MEDIA_CACHE);
      const secondaryCached = await secondaryCache.match(url.pathname);
      if (secondaryCached) {
        return secondaryCached;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.status === 200) {
          await primaryCache.put(url.pathname, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        throw err;
      }
    })()
  );
});

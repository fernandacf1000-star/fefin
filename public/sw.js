const CACHE_NAME = 'fina-v3';
const SUPABASE_HOST_RE = /supabase\.co/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.json',
        '/fina-mascot.png',
        '/fina-logo.png',
        '/fina-icon-192.png',
        '/fina-icon-512.png',
      ]).catch(() => undefined)
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (request.method === 'GET' && response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (request.method === 'GET' && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    return cache.match(request);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (SUPABASE_HOST_RE.test(url.hostname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

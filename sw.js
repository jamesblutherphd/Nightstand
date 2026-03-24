const CACHE = 'nightstand-v1';

// Files to cache for offline use
const OFFLINE_FILES = [
  '/nightstand/',
  '/nightstand/index.html',
  '/nightstand/manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght=100;200;300;400&family=DM+Sans:wght=300;400&display=swap'
];

// Install — cache core files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache what we can, ignore failures (e.g. font CDN)
      return Promise.allSettled(OFFLINE_FILES.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache when offline, network first when online
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for weather API calls
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('nominatim')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // For everything else: try network, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses for our own files
        if (response.ok && (url.origin === self.location.origin || url.hostname.includes('fonts'))) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

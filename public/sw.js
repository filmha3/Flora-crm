const CACHE_NAME = "flora-crm-v5";
const TILE_CACHE = "flora-map-tiles-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // keep the tile cache across app updates; only drop old app shells
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== TILE_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Is this an OpenStreetMap map tile? (any subdomain)
function isMapTile(url) {
  return /tile\.openstreetmap\.org\/.+\.png$/.test(url) ||
         /tile\.opentopomap\.org\/.+\.png$/.test(url);
}

// Leaflet library + its assets, loaded from CDN. Cache them so the map engine
// itself is available offline, not just the tiles.
function isMapLib(url) {
  return /cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\//.test(url);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = request.url;

  // Map tiles: cache-first and keep forever, so any area you've viewed once
  // stays visible offline (and loads instantly next time). This is what makes
  // the Sarein maps usable without a live connection.
  if (isMapTile(url) || isMapLib(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && (response.status === 200 || response.type === "opaque")) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // App navigations: network first, fall back to cached shell so the app opens offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (new URL(url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

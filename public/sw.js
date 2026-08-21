const CACHE_NAME = "flora-crm-v111";
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

// ---------- Web Push ----------
// A push message from the server has no window/tab to run in — this is the
// only place a notification can actually be shown from. If the payload
// itself is missing or unparsable, fail quietly rather than showing a
// blank/broken system notification.
self.addEventListener("push", (event) => {
  let payload = { title: "Flora", body: "" };
  if (event.data) {
    try { payload = event.data.json(); } catch (e) {
      try { payload = { title: "Flora", body: event.data.text() }; } catch (e2) { /* nothing usable in this push */ }
    }
  }
  const title = payload.title || "Flora";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    data: { url: payload.url || "/", ...(payload.data || {}) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification should land on the specific Flora screen it's
// about (an appointment, a case, a file) — reuse an already-open tab if
// there is one instead of always spawning a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "flora-notification-click", url: targetUrl });
        return;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// The push service can rotate a subscription's endpoint on its own
// (independent of the browser's own expiry) — resubscribing here with the
// same key keeps the device from silently going dark until the app is next
// opened, though the new subscription still needs the page to persist it
// to Supabase on next launch (a SW event has no authenticated Supabase
// session of its own to call the API with).
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldKey = event.oldSubscription?.options?.applicationServerKey;
  if (!oldKey) return;
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: oldKey }).catch(() => {})
  );
});

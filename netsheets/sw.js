/* =====================================================
   Catena Net Sheet — Service Worker
   Cache version: bump CACHE_VERSION when files change
   ===================================================== */

const CACHE_VERSION = "catena-netsheet-v1";

// App-shell files to pre-cache on install
const APP_SHELL = [
  "./index.html",
  "./catena-logo.png",
  "./catena-logo-pdf.jpg",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

// External origins that should always go network-first (ZIP lookup APIs)
const NETWORK_FIRST_ORIGINS = [
  "api.zippopotam.us",
  "nominatim.openstreetmap.org"
];

// ── Install: pre-cache the app shell ─────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete stale caches ────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: strategy selection ─────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for external APIs (ZIP lookup)
  if (NETWORK_FIRST_ORIGINS.includes(url.hostname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for everything else (app shell, images, etc.)
  if (event.request.method === "GET") {
    event.respondWith(cacheFirst(event.request));
  }
});

// Cache-first: serve from cache, fall back to network and update cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a minimal offline fallback if we have nothing cached
    return new Response(
      "<h1>You're offline</h1><p>Please reconnect and reload to use the Net Sheet.</p>",
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

// Network-first: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

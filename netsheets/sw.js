/* =====================================================
   Catena Net Sheet — Service Worker
   Cache version: bump CACHE_VERSION when files change
   ===================================================== */

const CACHE_VERSION = "catena-netsheet-v2";

const APP_SHELL = [
  "./index.html",
  "./catena-logo.png",
  "./catena-logo-pdf.jpg",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

const NETWORK_FIRST_ORIGINS = [
  "api.zippopotam.us",
  "nominatim.openstreetmap.org"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (NETWORK_FIRST_ORIGINS.includes(url.hostname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (event.request.method === "GET") {
    event.respondWith(cacheFirst(event.request));
  }
});

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
    return new Response(
      "<h1>You're offline</h1><p>Please reconnect and reload to use the Net Sheet.</p>",
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

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

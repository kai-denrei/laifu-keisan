const CB_TOKEN = "5ae02070";
const CACHE_NAME = `lifecounter-${CB_TOKEN}`;

const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  `/css/tokens.css?v=${CB_TOKEN}`,
  `/css/base.css?v=${CB_TOKEN}`,
  `/css/layout.css?v=${CB_TOKEN}`,
  `/css/skins.css?v=${CB_TOKEN}`,
  `/js/main.js?v=${CB_TOKEN}`,
  `/js/state.js?v=${CB_TOKEN}`,
  `/js/render.js?v=${CB_TOKEN}`,
  `/js/input.js?v=${CB_TOKEN}`,
  `/js/wakelock.js?v=${CB_TOKEN}`,
  `/js/skins.js?v=${CB_TOKEN}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

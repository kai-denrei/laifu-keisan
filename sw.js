const CB_TOKEN = "58235a1b";
const CACHE_NAME = `lifecounter-${CB_TOKEN}`;

const BADGE_CELLS = [0, 1, 2].map(i =>
  String(parseInt(CB_TOKEN.slice(i * 2, i * 2 + 2), 16) % 64).padStart(2, "0")
);

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  `./css/tokens.css?v=${CB_TOKEN}`,
  `./css/base.css?v=${CB_TOKEN}`,
  `./css/layout.css?v=${CB_TOKEN}`,
  `./css/skins.css?v=${CB_TOKEN}`,
  `./js/main.js?v=${CB_TOKEN}`,
  `./js/state.js?v=${CB_TOKEN}`,
  `./js/render.js?v=${CB_TOKEN}`,
  `./js/input.js?v=${CB_TOKEN}`,
  `./js/wakelock.js?v=${CB_TOKEN}`,
  `./js/skins.js?v=${CB_TOKEN}`,
  `./icons/apple-touch-icon.png?v=${CB_TOKEN}`,
  `./icons/icon-192.png?v=${CB_TOKEN}`,
  `./icons/icon-512.png?v=${CB_TOKEN}`,
  ...BADGE_CELLS.map(c => `./cb-shapes/${c}.svg?v=${CB_TOKEN}`),
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

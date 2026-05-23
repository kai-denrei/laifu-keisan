const CB_TOKEN = "27cff48a";
const CACHE_NAME = `lifecounter-${CB_TOKEN}`;

const BADGE_CELLS = [0, 1, 2].map(i =>
  String(parseInt(CB_TOKEN.slice(i * 2, i * 2 + 2), 16) % 64).padStart(2, "0")
);

// Two URL flavours per asset, because the browser fetches them with and
// without ?v=<token> depending on how they're referenced:
//   - HTML <link>/<script> with ?v= → fetched WITH query
//   - manifest icon hrefs → fetched WITHOUT query (manifest paths are bare)
//   - ES-module `import` specifiers → fetched WITHOUT query (URL resolution
//     against the importing module's URL strips the query)
// Pre-caching both forms is much simpler than chasing query mismatches at
// runtime, and the server returns identical content for both.
const ASSETS_WITH_QUERY = [
  `./css/tokens.css?v=${CB_TOKEN}`,
  `./css/base.css?v=${CB_TOKEN}`,
  `./css/layout.css?v=${CB_TOKEN}`,
  `./css/skins.css?v=${CB_TOKEN}`,
  `./js/main.js?v=${CB_TOKEN}`,
];
const ASSETS_BARE = [
  "./js/main.js",
  "./js/state.js",
  "./js/render.js",
  "./js/input.js",
  "./js/wakelock.js",
  "./js/skins.js",
  "./js/particles.js",
  "./js/dev-sliders.js",
  "./css/tokens.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/skins.css",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  ...BADGE_CELLS.map(c => `./cb-shapes/${c}.svg`),
];

const PRECACHE = [
  "./",
  "./?src=pwa",            // manifest start_url — iOS PWA launches at this URL
  "./index.html",
  `./manifest.webmanifest?v=${CB_TOKEN}`,
  ...ASSETS_WITH_QUERY,
  ...ASSETS_BARE,
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
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    // 1. Exact cache hit — fastest path, preserves cache-busting semantics
    //    (different ?v= = different URL = different cache entry).
    let resp = await caches.match(req);
    if (resp) return resp;

    // 2. Navigation request: fall back to a cached document so the app boots
    //    even on an unfamiliar path or query (e.g. ?src=pwa not precached,
    //    or a future start_url change).
    if (req.mode === "navigate") {
      resp = (await caches.match("./?src=pwa")) ||
             (await caches.match("./index.html")) ||
             (await caches.match("./"));
      if (resp) return resp;
    }

    // 3. Try network; if offline, fall back to a query-loose cache match so
    //    a stale build's assets still resolve.
    try {
      return await fetch(req);
    } catch (e) {
      resp = await caches.match(req, { ignoreSearch: true });
      if (resp) return resp;
      return new Response("offline", {
        status: 504,
        statusText: "Gateway Timeout (offline)",
        headers: { "Content-Type": "text/plain" },
      });
    }
  })());
});

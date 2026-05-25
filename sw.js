const CB_TOKEN = "9fbe74cd";
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
  "./js/sevenseg.js",
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
  // No skipWaiting() here — let the new SW enter the "waiting" state and
  // wait for the page to post a SKIP_WAITING message. Gives the user a
  // chance to see the update toast and accept the swap on their terms.
});

// Pages send this when the user taps "Refresh" on the update toast.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
    // 1. Navigation requests AND bare same-origin asset URLs (no ?v= query)
    //    use NETWORK-FIRST with a 2s timeout. The bare-URL case covers ES
    //    module imports: `import "./state.js"` from `main.js?v=NEW` strips
    //    the query when resolving, so the SW must NOT serve an exact-match
    //    cached OLD `./state.js` against a request from new code — that's
    //    the version-skew hole that ships an old `state.js` next to a new
    //    `main.js` and silently breaks `import { SLIDERS } from ...`.
    //    Fingerprinted `?v=<token>` URLs keep their cache-first treatment
    //    below since the URL itself changes per build.
    const reqUrl = new URL(req.url);
    const sameOrigin = reqUrl.origin === self.location.origin;
    const isBareAsset = sameOrigin && !reqUrl.search &&
      /\.(?:js|mjs|css|webmanifest)$/i.test(reqUrl.pathname);

    if (req.mode === "navigate" || isBareAsset) {
      try {
        const fresh = await Promise.race([
          fetch(req),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("nav-timeout")), 2000)
          ),
        ]);
        // Refresh cache in the background; don't block the response on it.
        caches.open(CACHE_NAME).then((c) => c.put(req, fresh.clone())).catch(() => {});
        return fresh;
      } catch (e) {
        // Try exact cache first for either request kind.
        const exactCached = await caches.match(req);
        if (exactCached) return exactCached;
        // Only navigation falls back to the cached HTML shell —
        // returning HTML to a JS/CSS request would break imports.
        if (req.mode === "navigate") {
          const cached =
            (await caches.match("./?src=pwa")) ||
            (await caches.match("./index.html")) ||
            (await caches.match("./"));
          if (cached) return cached;
        }
        // Bare-asset offline miss → try query-loose match before giving up.
        const loose = await caches.match(req, { ignoreSearch: true });
        if (loose) return loose;
        return new Response("offline", {
          status: 504,
          statusText: "Gateway Timeout (offline)",
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // 2. Non-navigation: exact cache hit — fastest path, preserves cache-
    //    busting semantics (different ?v= = different URL = different entry).
    let resp = await caches.match(req);
    if (resp) return resp;

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

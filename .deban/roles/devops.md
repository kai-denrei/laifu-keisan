---
role: devops
owner: Gerald
status: active
last-updated: 2026-05-23
---

# DevOps

## Scope
Static hosting, deploy pipeline, server-side Cache-Control headers, and the cache-busting + service-worker invalidation integration. Owns the "user gets the new build without manual cache clear" property.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-23 | Cache-busting layer installed at scaffold time | `?v=<token>` on every same-origin asset, anti-cache `<meta>` tags on HTML, shape-favicon + corner badge as visual confirmation that a bump took effect | [[dev]] |
| 2026-05-23 | Service worker cache name keyed off cache-bust token | One token bump = SW cache invalidation + asset URL invalidation + visible favicon change. Single point of truth for "what build is live?". | [[dev]] |
| 2026-05-23 | `bust.sh` extended to rewrite `__CB_TOKEN__` placeholder in `sw.js` | Without this, the SW would cache against an inert placeholder string and never invalidate. See cache-busting skill `references/service-worker.md`. | [[dev]] |
| 2026-05-23 | v1: GitHub Pages chosen as host (`kai-denrei/laifu-keisan` → `kai-denrei.github.io/laifu-keisan/`). | Public, free, HTTPS auto-provisioned, sufficient for solo PWA shipping. Alternatives: Netlify (more config), S3+CloudFront (overkill), `kai-denrei.github.io` user page (reserves Gerald's primary namespace). | [[pm]] |
| 2026-05-23 | v1: All HTML/JS/CSS/icon references use RELATIVE paths (no leading `/`). | GH Pages serves the project at a sub-path (`/laifu-keisan/`); absolute paths would 404 to root. Relative paths work on both localhost root AND the sub-path. | [[dev]] |
| 2026-05-23 | v1: `bust.sh` favicon-cell regex made leading-slash-optional. | Aligns with relative-path scheme. Preserves the prefix via capture group so absolute paths still work elsewhere. | [[dev]] |
| 2026-05-23 | v3.1: SW PRECACHE lists each asset in BOTH bare and `?v=<token>` forms; also adds `./?src=pwa` (manifest start_url) and the two maskable icons. Fetch handler is 3-step: exact match → cached-navigation fallback → network with loose-match-then-504 offline. | First-cut PRECACHE missed three asset shapes — iPhone PWA airplane-mode launch failed with "FetchEvent.respondWith received an error: TypeError: Load Failed". See Dead Ends + Lessons. | [[dev]] |
| 2026-05-23 | v4: `scripts/fingerprint-urls.py` patched — `is_external()` now recognises `%23` (URL-encoded `#`) as a fragment marker, not just literal `#`. | Without this, the fingerprinter appended `?v=token` to SVG filter references like `url(%23n)` inside data URIs in CSS, breaking the heroic patina noise filter. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v1→v3 SW PRECACHE only listed `?v=<token>` URLs for assets. | iOS PWA navigated to `start_url` (`./?src=pwa`) on Home Screen launch — exact URL not in cache → fetch() threw offline. ES module imports (state.js, render.js, etc.) are fetched WITHOUT `?v=` because URL resolution strips the query — bare lookups missed. Maskable icons referenced from manifest were never precached. Fixed in v3.1. |
| 2026-05-23 | v4: `scripts/fingerprint-urls.py` rewriting `url(%23n)` inside SVG data URIs in CSS. | `%23` is URL-encoded `#` — used inside data URIs to reference SVG filter IDs. The fingerprinter saw it as an asset URL and appended `?v=token`, breaking the filter reference. Patched in v4. |

## Lessons
- ES modules ignore the cache-bust `?v=<token>` query when resolving relative imports — URL resolution strips the query against the importer's base. PRECACHE must list both bare and query forms of every asset; the server returns identical content for both, and the duplication is cheap. — from dead end on 2026-05-23
- A URL fingerprinter that walks CSS must treat URL-encoded fragment markers (`%23`) as fragments too, not just literal `#`. SVG data URIs in CSS routinely use `url(%23filterId)`; ignoring this corrupts the SVG. — from dead end on 2026-05-23

## Open Questions
- [x] ~~Hosting target~~ — Resolved in v1: GitHub Pages.
- [ ] **CI/CD hook for bump** — `bust.sh` runs on dev save (via `watch.sh`). On deploy: currently manual (run `./scripts/bust.sh` before each commit). Could wire as a pre-commit hook or a GitHub Actions workflow. — owner: Gerald — since: 2026-05-23

## Assumptions
- [Hosting will set `Cache-Control: no-cache` on HTML and `immutable, max-age=31536000` on `?v=`-fingerprinted assets] — status: untested for GH Pages — since: 2026-05-23 — GH Pages defaults: `Cache-Control: max-age=600`. Not ideal but acceptable for a hobby project; the cache-busting layer's `<meta http-equiv>` + `?v=` fingerprinting mostly compensates.

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-23 — SYNC v6: codified GH Pages choice, relative-path scheme, SW PRECACHE bare+query rule (from the airplane-mode Dead End), and the fingerprinter `%23`-fragment patch. Two Lessons distilled.
- 2026-05-23 — INIT: scope set; cache-busting + SW versioning wiring decided; hosting target and CI hook flagged as open.

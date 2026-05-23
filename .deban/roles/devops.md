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

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Hosting target** — GitHub Pages? Netlify? Static S3+CloudFront? Affects `Cache-Control` recipe (`references/server-headers.md` in cache-busting skill has each). — owner: Gerald — since: 2026-05-23
- [ ] **CI/CD hook for bump** — `bust.sh` runs on dev save (via `watch.sh`). On deploy: `prebuild` script, or git pre-push hook? — owner: Gerald — since: 2026-05-23

## Assumptions
- [Hosting will set `Cache-Control: no-cache` on HTML and `immutable, max-age=31536000` on `?v=`-fingerprinted assets] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-23 — INIT: scope set; cache-busting + SW versioning wiring decided; hosting target and CI hook flagged as open.

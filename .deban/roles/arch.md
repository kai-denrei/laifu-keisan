---
role: arch
owner: Gerald
status: active
last-updated: 2026-05-26
---

# Architecture

## Scope
Module boundaries, state shape, render contract, and the "leave clean seams for deferred features" property. Owns the rule that adding poison/commander/skins/layoutVariants must not require touching unrelated modules.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-23 | Vanilla HTML+CSS+ES modules, no build step | Spec hard constraint; lowest possible runtime surface; serve via `python3 -m http.server` for dev | [[dev]], [[devops]] |
| 2026-05-23 | Module split per spec (state/render/input/wakelock/skins/main) | Single-responsibility; deferred features slot in via state-shape extension rather than module refactor | [[dev]] |
| 2026-05-23 | Single `state` object → idempotent `render(state)` → DOM; persist to localStorage on every mutation | Spec; eliminates "is the screen in sync with state?" class of bugs | [[dev]] |
| 2026-05-23 | Render strategy = shell + fast path: `renderShell(state, root)` rebuilds panels on count/variant change; `renderPlayer(state, id)` updates one panel per tap. `render(state, root)` orchestrates via data-attribute diff. | Full DOM rewrite per ±1 tap would flash. Shell+fast-path keeps idempotency contract while avoiding mass-mutation. | [[dev]] |
| 2026-05-23 | State shape uses `players[i].counters = { life }` from v1 — not `players[i].life` directly. | Slots in poison/commander/energy via state-shape extension without renaming. Deferred-feature seam confirmed. | [[dev]] |
| 2026-05-23 | v2: 3P/5P radial layouts via JS-computed clip-path polygons that fill the viewport including corners; recompute on resize. 2P/4P remain on CSS Grid. | Two layout systems coexist via `#board[data-radial="1"]` toggle. Clean seam, no refactor of grid path. Player at any rotation reads the number upright because panel-inner rotates with seat-rotation. | [[ux]], [[dev]] |
| 2026-05-23 | v5: `.panel-inner` MUST remain `position: absolute; inset: 0`. Stacking adjustments use z-index ALONE, never re-declaration of `position`. | v4 heroic skin tried `position: relative` to set z-index above patina ::after; broke the overlay model on grid layouts (see Dead Ends). Hard-learned invariant. | [[dev]], [[ux]] |
| 2026-05-23 | v6: settings popover gains a full-viewport `.menu-backdrop` (position: fixed, z-index 5, below `.menu-pill`'s z-index 6) that intercepts taps on panels and dispatches `menu-close`. | Prevents accidental life changes when user "taps outside" to close the settings. The zone underneath never receives the tap. | [[dev]], [[ux]] |
| 2026-05-25 | **Experimental skins may use Canvas 2D.** Overrides the mainline spec's "DOM + CSS Grid, not Canvas" rule for the experimental track only. | Particle-rendered numerals and 7-segment glyphs are not viable in pure DOM at iPhone framerates. Resolves [[pm]]'s long-running Open Question. Still no WebGL, still no runtime deps. | [[pm]], [[dev]] |
| 2026-05-25 | **Experimental view architecture = SKIN.** Each experimental view registers as a new `data-skin` value, reuses mainline panels/layout/input, overlays a full-viewport canvas (z-index 4, pointer-events: none) for visuals. | Option (a) from earlier OQ. Keeps install URL + SW scope unified; deferred features still slot in. Alternatives: separate sub-route or full fork — rejected (double install paths, state-sharing pain). | [[pm]], [[dev]] |
| 2026-05-25 | **SW update-toast pattern** replaces silent skipWaiting. New SW enters "waiting" on install; page listens for `updatefound`, shows "New version available — Refresh" toast; user click posts `SKIP_WAITING`; SW activates, `controllerchange` fires, page reloads. | Silent activation breaks in-flight sessions and skews loaded JS vs cached HTML. Consent + reload is the standard PWA pattern (see mobile-pwa skill). | [[devops]], [[dev]] |
| 2026-05-25 | **SW NetworkFirst with 2s timeout for navigation requests AND bare same-origin `.js`/`.mjs`/`.css`/`.webmanifest` URLs.** Cache-busted `?v=<token>` asset URLs stay cache-first. | Bare-import asset URLs strip the importer's `?v=` query; cache-first served stale modules against fresh HTML and broke ES imports (see Dead Ends). NetworkFirst with offline fallback closes the version-skew hole. | [[devops]], [[dev]] |
| 2026-05-25 | Each experimental skin owns its own canvas + renderer module + lifecycle. main.js dispatches start/stop via MutationObserver on `body[data-skin]`. Two canvases never live at once. | Parallel, independently-testable modules. Keeps mainline untouched. dev-sliders.js is generalised so each renderer supplies its own SLIDERS schema. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v4 heroic skin: `[data-skin="heroic-fantasy"] .panel > .panel-inner { position: relative; z-index: 1 }` to stack panel-inner above the patina `::after`. | The override REPLACED base `position: absolute; inset: 0`. On grid layouts (2P/4P), panel-inner dropped out of full-panel coverage; `place-items: center` lost its container and the life number miscentered. Removed in v5; replaced with z-index-only adjustments + explicit absolute centering on `.life`. |
| 2026-05-25 | `[data-skin="X"] body` / `[data-skin="X"] body::after` descendant selectors for cyber neon gradient, heroic woodgrain, particles bg override, and 7-Seg CRT overlay. | `applySkin()` sets `data-skin` on body itself, so no ancestor carries the attribute — the descendant selector never matches. Silently broken since cyber was first written; the CRT overlay was the trigger that surfaced it. Fixed by rewriting as `body[data-skin="X"]` / `body[data-skin="X"]::after`. |
| 2026-05-25 | SW with cache-first for navigations AND cache-first for ES-module bare imports. | Cache-first navigations served old HTML to a returning user after a fresh deploy (broke the "I bumped the token, why isn't it updating" promise). Cache-first bare imports served OLD `particles.js` (no SLIDERS export) against fresh `main.js` (imports SLIDERS) → import threw → blank beige page. Fixed by NetworkFirst for both cases. |

## Lessons
- Per-skin (or per-state) CSS must NOT override positioning that downstream layout depends on. Use `z-index` for stacking, never `position: <other>`. The base panel-inner's `position: absolute; inset: 0` is load-bearing for the overlay model — overriding it breaks layouts silently. — from dead end on 2026-05-23
- A `data-*` attribute set on `body` is matched by `body[data-x]`, NOT by `[data-x] body` (the latter wants body to be a descendant of something with the attribute, which body never is). Selectors that target an element which IS the styled element need the attribute-on-element form. — from dead end on 2026-05-25
- Bare ES-module import specifiers strip the importer's `?v=<token>` query when resolving — relative URLs are resolved against the importer's base WITHOUT preserving the query string. SWs MUST treat bare same-origin asset URLs as NetworkFirst, not cache-first, or fresh HTML will pull stale modules and import will silently fail. — from dead end on 2026-05-25
- SW `self.skipWaiting()` in `install` causes silent mid-session activation that desyncs loaded JS from cached HTML. Default to "waiting + toast-consented activation" — the small UX cost of asking "Refresh?" prevents an entire class of "I'm running half-old code" bugs. — from dead end on 2026-05-25

## Open Questions
- [x] ~~Render: full vs incremental~~ — Resolved in v1: shell + fast path split.
- [x] ~~State shape for deferred features~~ — Resolved in v1: `players[i].counters = { life }` shape.
- [x] ~~Experimental view architecture: separate route vs. skin vs. fork.~~ — Resolved 2026-05-25: SKIN. Each experimental view = a `data-skin` value, canvas overlay at z-index 4.
- [x] ~~Canvas/WebGL allowance for experimental views.~~ — Resolved 2026-05-25: Canvas 2D YES, WebGL no, no runtime deps.

## Assumptions
- [Per-player log is bounded enough to keep in state without compaction for MVP] — status: validated — since: 2026-05-23 — `log.slice(-200)` cap in saveState handles unbounded growth.

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
- 2026-05-26 — SYNC v8: codified Canvas-allowance + view-as-skin for experimental track; recorded SW update-toast + NetworkFirst bare-import decisions; 2 new Dead Ends + 3 new Lessons. Both experimental views shipped via mutation-observer-dispatched canvas overlays.
- 2026-05-23 — SYNC v6: codified panel-inner-as-overlay invariant (after v4 heroic Dead End); recorded radial-layout decision; opened 2 experimental-track architectural questions (route vs skin vs fork; Canvas allowance).
- 2026-05-23 — INIT: scope set; three structural decisions transcribed from the spec; render strategy and counter-shape left open.

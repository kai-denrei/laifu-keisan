---
role: arch
owner: Gerald
status: active
last-updated: 2026-05-23
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

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v4 heroic skin: `[data-skin="heroic-fantasy"] .panel > .panel-inner { position: relative; z-index: 1 }` to stack panel-inner above the patina `::after`. | The override REPLACED base `position: absolute; inset: 0`. On grid layouts (2P/4P), panel-inner dropped out of full-panel coverage; `place-items: center` lost its container and the life number miscentered. Removed in v5; replaced with z-index-only adjustments + explicit absolute centering on `.life`. |

## Lessons
- Per-skin (or per-state) CSS must NOT override positioning that downstream layout depends on. Use `z-index` for stacking, never `position: <other>`. The base panel-inner's `position: absolute; inset: 0` is load-bearing for the overlay model — overriding it breaks layouts silently. — from dead end on 2026-05-23

## Open Questions
- [x] ~~Render: full vs incremental~~ — Resolved in v1: shell + fast path split.
- [x] ~~State shape for deferred features~~ — Resolved in v1: `players[i].counters = { life }` shape.
- [ ] **Experimental view architecture: separate route vs. skin vs. fork.** — Three options: (a) mainline + opt-in via `state.viewMode` (clean seams exist; parallels skin); (b) `/experimental/` sub-route with its own JS entry (keeps mainline bundle untouched); (c) full fork as a separate PWA. (a) keeps install URL and SW scope unified but bloats mainline; (b) isolates risk but doubles install paths; (c) loses shared state. — owner: Gerald (via [[pm]]) — since: 2026-05-23
- [ ] **Canvas/WebGL allowance for experimental views** — Mainline spec said NOT Canvas. Experimental view likely needs it. If allowed, runtime-deps story changes (still no npm — hand-rolled WebGL or a tiny inline lib). — owner: Gerald — since: 2026-05-23

## Assumptions
- [Per-player log is bounded enough to keep in state without compaction for MVP] — status: validated — since: 2026-05-23 — `log.slice(-200)` cap in saveState handles unbounded growth.

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
- 2026-05-23 — SYNC v6: codified panel-inner-as-overlay invariant (after v4 heroic Dead End); recorded radial-layout decision; opened 2 experimental-track architectural questions (route vs skin vs fork; Canvas allowance).
- 2026-05-23 — INIT: scope set; three structural decisions transcribed from the spec; render strategy and counter-shape left open.

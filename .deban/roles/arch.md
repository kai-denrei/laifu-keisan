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
| 2026-05-23 | Module split per spec (state/render/input/wakelock/skins/main) | Single-responsibility, makes deferred features slot in via state-shape extension rather than refactor | [[dev]] |
| 2026-05-23 | Single `state` object → idempotent `render(state)` → DOM; persist to localStorage on every mutation | Spec; eliminates "is the screen in sync with state?" class of bugs | [[dev]] |
| 2026-05-23 | Render strategy: shell-vs-fast-path split. `renderShell(state)` rebuilds the panel grid only when `playerCount` or `layoutVariant` changes (rare). `renderPlayer(state, id)` updates a single panel's number / preview / log button — fast path on every tap. State diff is implicit: `data-*` attributes carry `data-life`, `data-delta` so render is idempotent. | A full rewrite on every ±1 tap would flash, lose CSS animations, and trash the floating delta. Splitting shell from fast path keeps DOM stable. | [[dev]] |
| 2026-05-23 | State shape: `players[i].counters = { life: N }` with `life` as the only counter for MVP. Top-level still exposes `players[i].life` as a read-only getter for callers that don't care. Deferred features (poison, commander, energy) slot in by extending `counters`. | Naming `players[i].life` directly locks in life-as-the-thing. Wrapping in `counters` is a single layer of indirection that pays for itself the day we add poison. The read-only top-level `life` getter prevents a rewrite of consumers. | [[dev]] |
| 2026-05-23 | Pointer events (`pointerdown`/`pointerup`/`pointercancel`) over touch events. Fallback to mouse for desktop dev. | Modern unified API; iOS 13+ supports it well; eliminates the touch-vs-mouse branching that's a known source of phantom taps. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- ~~Render: full vs incremental~~ — RESOLVED 2026-05-23: shell + fast path. See Decisions.
- ~~State shape for deferred features~~ — RESOLVED 2026-05-23: `players[i].counters = { life }`. See Decisions.

## Assumptions
- [Per-player log is bounded enough to keep in state without compaction for MVP] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
- 2026-05-23 — INIT: scope set; three structural decisions transcribed from the spec; render strategy and counter-shape left open.

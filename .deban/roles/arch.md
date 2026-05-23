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

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Render: full vs incremental** — spec says idempotent `render(state)` but a full DOM rewrite per ±1 tap will flash. Pick a strategy: (a) one-pass diff against `data-*` attributes, (b) split into `renderShell(state)` + `renderNumber(state, playerId)` fast path, (c) DOM mutation observers. — owner: Gerald — since: 2026-05-23
- [ ] **State shape for deferred features** — `players[i].life` is named for life specifically. To slot in poison/commander/energy without rework, consider `players[i].counters = { life, poison?, commander?, ... }` from day one and just expose `life` as the only one in MVP. Decide which shape to commit to. — owner: Gerald — since: 2026-05-23

## Assumptions
- [Per-player log is bounded enough to keep in state without compaction for MVP] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
- 2026-05-23 — INIT: scope set; three structural decisions transcribed from the spec; render strategy and counter-shape left open.

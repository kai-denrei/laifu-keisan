---
role: dev
owner: Gerald
status: active
last-updated: 2026-05-23
---

# Development

## Scope
Implementation of the six modules (state, render, input, wakelock, skins, main), service worker, and manifest. Owns the property that no module imports from `index.html` or makes assumptions about CSS class names beyond what `render.js` controls.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-23 | v1: Pointer events (`pointerdown`/`pointerup`/`pointercancel`) over touch+mouse | Modern path; single code path for iOS / Android / desktop. | [[ux]] |
| 2026-05-23 | v1: Wake Lock degrades silently when unsupported. One-time "Keep your phone's display set to never sleep" hint banner covers the iOS device-sleep gap. | API surface is small; failed acquire returns false → user gets hint banner once instead of an error. | [[ux]] |
| 2026-05-23 | v1: Input commit lifecycle — pointer-interaction state and batch state are INDEPENDENT. commit() never touches pointerId. | First PM caught the bug: clearing pointerId mid-batch (during a sign-flip commit) broke endZoneInteraction's pointerId-match check, leaving the hold timer running unchecked. | [[qa]] |
| 2026-05-23 | v5: `.life` centered via explicit `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` — not grid-flow centering on `.panel-inner`. | Removes any ambiguity introduced by the absolute-positioned siblings (`.delta`, `.history-btn`). | [[arch]] |
| 2026-05-23 | v5: Radial `.life` translateY = 32vmin (3P) / 28vmin (5P) | Stays inside the side-facing wedges in portrait (shortest radial-to-perimeter ≈ 50vmin). Larger values clipped numbers off-screen. | [[ux]] |
| 2026-05-23 | v5: History "…" button at bottom-center of player's rotated frame. Grid: `bottom: 14px; left: 50%; transform: translateX(-50%)`. Radial: `translate(-50%, -50%) translateY(72vmin)` (3P) / `64vmin` (5P). | Per Gerald: button must sit at the player's near edge, far from the table-center where +/- taps cluster — eliminates accidental presses. | [[ux]] |
| 2026-05-23 | v6: `menu-close` action dispatched by both the × button inside the popover and the full-viewport `.menu-backdrop`. menu-toggle and reset-confirm both sync backdrop with popover. | Clean exit affordance per Gerald; backdrop blocks zone underneath so life doesn't change when user taps to close. | [[ux]], [[arch]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v1: `commit()` originally cleared `pointerId` along with batch state. | When sign-flip mid-batch invoked commit() from inside a pointerdown handler, the new pointerId got nulled before endZoneInteraction's match check. Hold timer ran unchecked → life crashed on rapid +/- taps. Fixed by separating pointer lifecycle from batch lifecycle. |
| 2026-05-23 | v1: `[hidden]` attribute used to hide overlays. | Overridden silently by author CSS (`display: flex` on `.modal`, `.menu-popover`, `.log-popover`, `.hint-banner`). UA default `[hidden]{display:none}` doesn't survive author rules. Fixed: added explicit `[hidden] { display: none !important; }` in base.css. |
| 2026-05-23 | v1: `.life` button inside `.panel-inner` at z-index 1, `.zone` at z-index 2. | Tapping the number routed to the zone instead — log popover never opened. Fixed: `.panel-inner` z-index raised + `pointer-events: none` with `.life` opting in to `auto`. |

## Lessons
- Pointer-interaction lifecycle and batch-commit lifecycle are INDEPENDENT. Clearing pointer state from a batch-commit code path looks tidy but corrupts event matching. — from dead end on 2026-05-23
- UA-default `[hidden]{display:none}` does not survive author rules. Use `!important` on the hidden-state rule when overlays default to `display: flex`. — from dead end on 2026-05-23

## Open Questions
- [x] ~~Wake Lock fallback strategy~~ — Resolved in v1: silent degrade + one-time hint banner.
- [x] ~~Long-press detection that survives hold-to-accelerate path~~ — Resolved in v1: long-press-to-reset removed in favour of menu-pill confirm modal. No race.
- [x] ~~Pointer events vs touch events~~ — Resolved in v1: pointer events.
- [ ] **Particle system implementation language** — If we stay DOM: a small element pool (~50 divs) with `transform: translate3d(...)` and `will-change: transform`; JS animates via rAF, GPU compositor handles compositing. If Canvas/WebGL allowed: a thin custom particle shader (no library) is cheaper per-particle and freer effects. Depends on the Canvas-allowance decision in [[arch]]. — owner: Gerald — since: 2026-05-23
- [ ] **rAF coordination with the existing render(state) loop** — Mainline render is event-driven and idempotent. Particles run continuously. Need a clean side-channel: probably an event emitter on `applyDelta` that triggers a "burst" effect without breaking idempotency. — owner: Gerald — since: 2026-05-23
- [ ] **Particle-glyph rendering technique** — (a) point-sample the digit's outline path with ~40–60 particles tracing the contour; (b) signed-distance-field sample over a grid (denser, flexible); (c) keep the numeral as DOM/SVG text and only add a burst around it on delta. Option (c) gives the best entertainment-to-cost ratio if Gerald is OK with the number itself staying flat-rendered. — owner: Gerald (via [[ux]]) — since: 2026-05-23

## Assumptions

## Dependencies
Blocked by: [[arch]]
Feeds into: [[qa]]

## Session Log
- 2026-05-23 — SYNC v6: recorded v1→v6 implementation decisions and 3 Dead Ends caught during Playwright verification; opened 3 particle-system-implementation questions tied to [[arch]]'s Canvas-allowance call.
- 2026-05-23 — INIT: scope set; three implementation questions surfaced (wake lock fallback, long-press race, pointer event choice).

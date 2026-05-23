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
| 2026-05-23 | Wake Lock fallback: silent. No "device may sleep" hint at the system level — only the one-time first-game hint about manual screen settings (see [[pm]] decision). If `navigator.wakeLock` is absent, the lock attempt is a no-op. | Showing a fallback hint to every Android Firefox user is noise. The first-game hint already covers the case; users who care will lengthen Display timeout in OS settings. | [[ux]] |
| 2026-05-23 | Long-press / hold-to-accelerate race: separate gesture domains. +/− zones own hold-to-accelerate (no long-press semantics). The number itself owns long-press (peek log / reset). Zones do not overlap pixel-wise, so no race. | Easier to reason about than gesture arbitration. The number is centered in the panel; +/− tap zones are top/bottom. Long-press on the number opens the log popover. Reset is in the corner menu, not via long-press on the number (avoids the "I held too long and lost my game" disaster). | [[ux]] |
| 2026-05-23 | Pointer events with `setPointerCapture` on `pointerdown` and `releasePointerCapture` on commit/cancel. `touch-action: manipulation` at base.css level kills double-tap zoom. | Per [[arch]]. Capture ensures the same finger that started the hold drives accel even if it drifts inside the panel. | [[arch]] |
| 2026-05-23 | Reset moved to the corner menu (cog icon, top-center pill); destructive, requires explicit confirm modal. Long-press on the number opens the log popover (peek + per-player undo button). | Spec said long-press number = reset. Inverting: long-press = peek log (the non-destructive thing). Reset moves to a deliberate UI affordance with confirm. Removes the "held too long and reset the game" failure mode. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- ~~Wake Lock fallback strategy~~ — RESOLVED 2026-05-23: silent. See Decisions.
- ~~Long-press detection that survives the hold-to-accelerate path~~ — RESOLVED 2026-05-23: separate gesture domains; reset moved to corner menu. See Decisions.
- ~~Pointer events vs touch events~~ — RESOLVED 2026-05-23: pointer events with capture. See Decisions.

## Assumptions

## Dependencies
Blocked by: [[arch]]
Feeds into: [[qa]]

## Session Log
- 2026-05-23 — INIT: scope set; three implementation questions surfaced (wake lock fallback, long-press race, pointer event choice).

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

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Wake Lock fallback strategy** — Wake Lock API is sufficient on Android/recent iOS, but missing on older browsers. Spec says "degrade gracefully where unsupported". Decide: silent fallback, or show a "device may sleep" hint? — owner: Gerald — since: 2026-05-23
- [ ] **Long-press detection that survives the hold-to-accelerate path** — long-press on number triggers reset/log peek; hold on +/- triggers acceleration. The handlers must not race or trigger each other. — owner: Gerald — since: 2026-05-23
- [ ] **Pointer events vs touch events** — `pointerdown`/`pointerup`/`pointercancel` is the modern path. iOS has historically had quirks. Pick one and commit. — owner: Gerald — since: 2026-05-23

## Assumptions

## Dependencies
Blocked by: [[arch]]
Feeds into: [[qa]]

## Session Log
- 2026-05-23 — INIT: scope set; three implementation questions surfaced (wake lock fallback, long-press race, pointer event choice).

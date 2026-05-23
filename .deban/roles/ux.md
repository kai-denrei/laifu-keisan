---
role: ux
owner: Gerald
status: active
last-updated: 2026-05-23
---

# User Experience

## Scope
Legibility across a table at an angle, tap-target sizing, motion (the floating delta indicator), and skin token contracts. Owns the "WCAG AA for large text" floor in every skin. Owns the decision that decoration must not bleed into tap zones or reduce contrast on the number.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Tap-zone split: 55% + / 45% −, or invert?** — most life changes are negative; the larger zone might belong to `−`. The spec's split is a guess. — owner: Gerald — since: 2026-05-23
- [ ] **Floating delta indicator: where does it sit?** — near the number is the obvious answer, but the panel is rotated. Position must respect rotation per seat. — owner: Gerald — since: 2026-05-23
- [ ] **Numeral font size** — must be readable across a table from the opposite seat (60–80 cm). Test against real distances, not browser dev tools. — owner: Gerald — since: 2026-05-23

## Assumptions
- [System font stack suffices for `--font-ui`; only display fonts vary per skin] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-23 — INIT: scope set; tap-zone split, indicator placement, and numeral sizing flagged as open.

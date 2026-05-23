---
role: qa
owner: Gerald
status: active
last-updated: 2026-05-23
---

# Quality Assurance

## Scope
Acceptance checklist verification, especially the items only a human can confirm: legibility at a table angle, "never misfires" under reaching hands, wake-lock survival across backgrounding, install-and-airplane-mode flow. Owns the no-go list.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Test on which devices for v1?** — at minimum: one iOS phone, one Android phone, one iPad (the tabletop case). — owner: Gerald — since: 2026-05-23
- [ ] **Acceptance for "no accidental input"** — how do we test? Manual repro of pull-to-refresh, double-tap zoom, text selection, context menu — checklist needs a script. — owner: Gerald — since: 2026-05-23
- [ ] **Acceptance for "opens to a playable board in under a second, offline"** — Lighthouse timing, or stopwatch on a real device after airplane mode? — owner: Gerald — since: 2026-05-23

## Assumptions

## Dependencies
Blocked by: [[dev]]
Feeds into:

## Session Log
- 2026-05-23 — INIT: scope set; device list, "no accidental input" script, and offline-startup timing flagged as open.

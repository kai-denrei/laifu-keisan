---
role: pm
owner: Gerald
status: active
last-updated: 2026-05-23
---

# Project Manager

## Scope
Prioritization, scope creep defense, and milestone tracking against the acceptance checklist. Owns the "is this MVP or deferred?" call. Tracks cross-role open questions that span more than one discipline.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] **Hold-to-accelerate cadence and ramp curve** — spec says ~500 ms hold then "increasing rate" but does not specify the ramp (1→2→5→10? when does it stop?). Sluggish curve frustrates a "drop from 20 to 4" moment; runaway curve overshoots. — owner: Gerald (via [[ux]] + [[dev]]) — since: 2026-05-23
- [ ] **Batched-delta commit window of ~1.5 s** — arbitrary number. In real play, players adjust life while talking across multiple seconds. Too short = the "one undoable event" promise breaks; too long = the player doesn't know when their change is final. Needs playtest, not a guess. — owner: Gerald (via [[ux]]) — since: 2026-05-23
- [ ] **iOS Wake Lock hole when the device itself sleeps** — spec assumes the only failure mode is tab backgrounding (re-acquire on `visibilitychange`). A user-initiated power-button press or system idle sleep is unrecoverable; the "screen never sleeps" promise has a hole. Either accept the limit and document it, or surface a "phone on display" hint at game start. — owner: Gerald (via [[dev]] + [[qa]]) — since: 2026-05-23
- [ ] **3P and 5P "predictable default" without playtest** — spec admits these counts are inherently awkward, then ships an untested default. The pinwheel variant is deferred but may be required at launch for 3P to be usable. Decide whether to ship default-only or default + pinwheel-for-3P. — owner: Gerald (via [[ux]] + [[arch]]) — since: 2026-05-23
- [ ] **Browser-tab degradation** — the "open → playing in under a second" promise depends on PWA install. Many users will tap the URL in Safari without installing. Wake Lock works in browser tabs with a user gesture, but Safari chrome eats screen space and complicates "never misfires". Needs explicit testing in browser mode, not just installed mode. — owner: Gerald (via [[qa]]) — since: 2026-05-23

## Assumptions
- [Two-player is 90% of use] — status: untested — since: 2026-05-23
- [Skins are pure token swaps with no JS or layout impact] — status: untested — since: 2026-05-23
- [Starting-life default of 20 covers MTG; other games (Yu-Gi-Oh 8000, Lorcana, custom) handled by `startingLife` field but UI hasn't been sized for 4–5 digit totals] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[arch]], [[ux]], [[qa]]

## Session Log
- 2026-05-23 — INIT: brief recorded; 5 untested assumptions surfaced from the spec; deferred features (poison, commander, history, sound) explicitly noted as out of MVP scope.

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
| 2026-05-23 | Hold-to-accelerate: 500 ms initial delay, then ±1 every 220 ms for 1.2 s (x6), then ±1 every 120 ms (x12), then ±5 every 120 ms thereafter. Capped at one half-second of "x5" before topping out. | Spec demands "drop from 20 to 4" feel without overshoot. Real-world: a 16-point swing should arrive in ~2 s of held hold. Ramp gives the player visible "rate change" feedback so they release at the right moment. Symmetric for +/−. | [[ux]], [[dev]] |
| 2026-05-23 | Batched-delta commit window: 1200 ms idle since last tap/release. Indicator visible for whole window; commits on first idle expiry or on a foreign tap (different player/sign). | 1.5 s is too long — the player loses confidence that the change took. 1.2 s is the conversational-pause floor in card-game play. Foreign-tap forces commit so the next event can't bleed in. | [[ux]], [[dev]] |
| 2026-05-23 | iOS Wake Lock device-sleep hole: accept and document. Show one-time hint "keep phone display on" on first game start (dismissable, persists dismissal). Re-acquire lock on `visibilitychange` covers tab/app switches. Power-button sleep cannot be intercepted by web. | Spec promises "screen never sleeps while game is active" — only achievable via the OS Display setting. Document the constraint via a tiny, dismissable banner so users see it once. Do not over-engineer a polling solution that drains battery. | [[dev]], [[qa]], [[ux]] |
| 2026-05-23 | 3P/5P: ship the spec's "predictable default" only. Expose `layoutVariant` in state shape so a pinwheel can be added later. No pinwheel UI for v1. | Spec explicitly defers pinwheel. Shipping two variants without playtest doubles the surface area we can't validate. One predictable default is honest — let players install and feed back. | [[ux]], [[arch]] |
| 2026-05-23 | Browser-tab degradation: build for tab first, install second. All features work in browser tab. Bottom badge encourages install when not standalone (single subtle "install" pill in the corner menu, not a popup). | Most users will never install. If the tab is unusable, they will not get to "install" — they will close it. Tab parity is the floor; install is the optimization. | [[qa]], [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- ~~Hold-to-accelerate cadence and ramp curve~~ — RESOLVED 2026-05-23: 500 ms → 220 ms (x6) → 120 ms (x12) → ±5/120 ms. See Decisions.
- ~~Batched-delta commit window of ~1.5 s~~ — RESOLVED 2026-05-23: 1200 ms idle. See Decisions.
- ~~iOS Wake Lock hole~~ — RESOLVED 2026-05-23: accept, document, one-time hint. See Decisions.
- ~~3P/5P "predictable default" without playtest~~ — RESOLVED 2026-05-23: ship default only; `layoutVariant` in state. See Decisions.
- ~~Browser-tab degradation~~ — RESOLVED 2026-05-23: tab-first; install is optimization. See Decisions.

## Assumptions
- [Two-player is 90% of use] — status: untested — since: 2026-05-23
- [Skins are pure token swaps with no JS or layout impact] — status: untested — since: 2026-05-23
- [Starting-life default of 20 covers MTG; other games (Yu-Gi-Oh 8000, Lorcana, custom) handled by `startingLife` field but UI hasn't been sized for 4–5 digit totals] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[arch]], [[ux]], [[qa]]

## Session Log
- 2026-05-23 — INIT: brief recorded; 5 untested assumptions surfaced from the spec; deferred features (poison, commander, history, sound) explicitly noted as out of MVP scope.

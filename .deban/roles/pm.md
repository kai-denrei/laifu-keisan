---
role: pm
owner: Gerald
status: active
last-updated: 2026-05-26
---

# Project Manager

## Scope
Prioritization, scope creep defense, and milestone tracking against the acceptance checklist. Owns the "is this MVP or deferred?" call. Tracks cross-role open questions that span more than one discipline.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-23 | v1 ships per spec; all 8 acceptance items pass under Playwright at iPhone-14-Pro emulation. | First PM sub-agent verified. Foundation for iteration. Alternatives considered: continue refining v1 before branching. Rejected — checklist passed, time to iterate on UX. | [[dev]], [[qa]] |
| 2026-05-23 | v2: replace 3P/5P spec defaults with TRUE RADIAL layouts (120° / 72° wedges). | The spec's "predictable default" was a hedge against playtest absence. Gerald exercised the playtest call. Alternative: pinwheel for 3P only (per spec). Rejected — going all-radial keeps 3P and 5P consistent. | [[ux]], [[arch]] |
| 2026-05-23 | v2: history disabled by default; opt-in via settings toggle. Per-player "…" buttons only render when enabled. | Per-player log was MVP scope but every-panel UI clutter was not. Toggle keeps the seam open without the clutter cost. | [[ux]] |
| 2026-05-23 | v3: cache-bust visual badge moved from fixed bottom-right corner into a "Build" row inside settings. | Corner widget is dev affordance, not UX. Settings is the right home. | [[ux]], [[devops]] |
| 2026-05-23 | v4: PWA Home Screen name = "laifukeisan". | Branding. Aligns icon label with repo + project identity. | [[ux]] |
| 2026-05-23 | **v6 is the "good base" milestone — pause mainline feature work.** Next phase: experimental alternative views, starting with isometric-3D particle numerals. | Mainline satisfies the spec's 8-item acceptance checklist + Gerald's UX iteration (radial 3P/5P, history toggle, weathered heroic skin, in-settings build badge, settings close affordances). Stable enough to branch. Alternative: keep iterating on mainline (real-device wake-lock, dismiss-banner polish). Rejected — diminishing returns vs. experimental novelty. | [[arch]], [[ux]], [[dev]] |
| 2026-05-24 | Drop the isometric-3D direction; do 2D particles only. | Gerald's call after pushback on isometric math + budget tension. "Numbers made of particles in 2D + per-player burst" captures the entertainment value without the 3D scene-graph cost. | [[arch]], [[ux]] |
| 2026-05-25 | **Ryūshi (particles) merged to main as the 4th selectable skin.** | First experimental view ships. Sci-fi palette, Canvas 2D, per-digit particle tracking, ?admin sliders for tuning. Alternative: keep isolated on a branch. Rejected — feature complete + tested. | [[arch]], [[ux]], [[dev]] |
| 2026-05-25 | **7-Seg (retro CRT) merged to main as the 5th selectable skin.** Phase-1 experimental track complete. | Hexagonal-segment VFD aesthetic with Apollo-style white hot core. Defaults locked from live ?admin tuning. Alternatives: ship as a third "marquee" mode only. Rejected — coexists with Ryūshi as user choice. | [[arch]], [[ux]], [[dev]] |
| 2026-05-25 | Skin selector laid out as a 2-column grid (was paginated). Settings popover widened to fit. | Pagination was overkill for 5 skins; future skins wrap to additional rows. "Reset game" relabelled to "Reset Counter" per Gerald. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons
- Shipping a "predictable default" because no playtest is available defers the real call to the user. Gerald immediately replaced 3P/5P spec defaults with radial — the spec was telegraphing this need. — from v2 decision on 2026-05-23
- Live ?admin sliders + an FPS readout beats setting a formal "computationally cheap" budget upfront. Empirical tuning lands defaults that match what the operator actually wants. — from v8 7-Seg tuning on 2026-05-26

## Open Questions
- [x] ~~Hold-to-accelerate cadence and ramp curve~~ — Resolved in v1: 3-tier ramp (initial → 220ms → 120ms → 5-step). Verified.
- [x] ~~Batched-delta commit window of ~1.5 s~~ — Resolved in v1: 1200ms idle commit. No complaints to date.
- [ ] **iOS Wake Lock hole when the device itself sleeps** — deferred behind the one-time "Keep your phone's display set to never sleep" hint banner. Acceptable workaround for v6 but the spec's "screen never sleeps" promise still has a hole on a user-initiated power-button press. Needs real-iOS verification before declaring v6 fully shippable. — owner: Gerald (via [[dev]] + [[qa]]) — since: 2026-05-23
- [x] ~~3P/5P "predictable default" without playtest~~ — Resolved in v2: replaced with radial layouts at 120° / 72°.
- [ ] **Browser-tab degradation** — still untested. iPhone PWA install is the assumed primary path; Safari tab use deferred. — owner: Gerald (via [[qa]]) — since: 2026-05-23
- [x] ~~Experimental views: bypass the "DOM + CSS Grid, not Canvas" mainline constraint?~~ — Resolved 2026-05-25: experimental views opt out (option a). Both Ryūshi and 7-Seg use Canvas 2D. No WebGL, no runtime deps. See [[arch]].
- [x] ~~"Computationally cheap but entertaining" — define the budget.~~ — Resolved 2026-05-26: empirically, via live ?admin sliders + FPS readout. No formal floor; Gerald tunes and locks defaults.
- [x] ~~Experimental view scope — is it ALSO a counter, or just a visualisation?~~ — Resolved 2026-05-25: full counter. Taps work in both Ryūshi and 7-Seg; the canvas overlay sits above the panels but is `pointer-events: none`, so the underlying zones still receive +/- taps.

## Assumptions
- [Two-player is 90% of use] — status: untested — since: 2026-05-23
- [Skins are pure token swaps with no JS or layout impact] — status: INVALIDATED — since: 2026-05-23 — v4 heroic added a SVG noise patina ::after on .panel; v7/v8 experimental skins added entire Canvas modules. The mainline DOM-only constraint applied to MAINLINE skins, not experimental ones (see [[arch]] Canvas-allowance decision).
- [Starting-life default of 20 covers MTG; other games handled by `startingLife` field but UI hasn't been sized for 4–5 digit totals] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[arch]], [[ux]], [[qa]]

## Session Log
- 2026-05-26 — SYNC v8: experimental phase 1 complete. Both Ryūshi (particles) and 7-Seg (retro CRT) shipped to main as the 4th and 5th skins. Recorded 4 cross-cutting decisions; resolved 3 experimental-track Open Questions (Canvas allowance YES, budget = empirical, counter+visualisation both). New Lesson on empirical tuning via ?admin.
- 2026-05-23 — SYNC v6: marked "good base" milestone; recorded v1→v6 decisions; opened 3 experimental-track questions (Canvas allowance, performance budget, view-as-counter-or-demo) plus cross-role challenges in [[arch]] and [[ux]].
- 2026-05-23 — INIT: brief recorded; 5 untested assumptions surfaced from the spec; deferred features (poison, commander, history, sound) explicitly noted as out of MVP scope.

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
| 2026-05-23 | v1 ships per spec; all 8 acceptance items pass under Playwright at iPhone-14-Pro emulation. | First PM sub-agent verified. Foundation for iteration. Alternatives considered: continue refining v1 before branching. Rejected — checklist passed, time to iterate on UX. | [[dev]], [[qa]] |
| 2026-05-23 | v2: replace 3P/5P spec defaults with TRUE RADIAL layouts (120° / 72° wedges). | The spec's "predictable default" was a hedge against playtest absence. Gerald exercised the playtest call. Alternative: pinwheel for 3P only (per spec). Rejected — going all-radial keeps 3P and 5P consistent. | [[ux]], [[arch]] |
| 2026-05-23 | v2: history disabled by default; opt-in via settings toggle. Per-player "…" buttons only render when enabled. | Per-player log was MVP scope but every-panel UI clutter was not. Toggle keeps the seam open without the clutter cost. | [[ux]] |
| 2026-05-23 | v3: cache-bust visual badge moved from fixed bottom-right corner into a "Build" row inside settings. | Corner widget is dev affordance, not UX. Settings is the right home. | [[ux]], [[devops]] |
| 2026-05-23 | v4: PWA Home Screen name = "laifukeisan". | Branding. Aligns icon label with repo + project identity. | [[ux]] |
| 2026-05-23 | **v6 is the "good base" milestone — pause mainline feature work.** Next phase: experimental alternative views, starting with isometric-3D particle numerals. | Mainline satisfies the spec's 8-item acceptance checklist + Gerald's UX iteration (radial 3P/5P, history toggle, weathered heroic skin, in-settings build badge, settings close affordances). Stable enough to branch. Alternative: keep iterating on mainline (real-device wake-lock, dismiss-banner polish). Rejected — diminishing returns vs. experimental novelty. | [[arch]], [[ux]], [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons
- Shipping a "predictable default" because no playtest is available defers the real call to the user. Gerald immediately replaced 3P/5P spec defaults with radial — the spec was telegraphing this need. — from v2 decision on 2026-05-23

## Open Questions
- [x] ~~Hold-to-accelerate cadence and ramp curve~~ — Resolved in v1: 3-tier ramp (initial → 220ms → 120ms → 5-step). Verified.
- [x] ~~Batched-delta commit window of ~1.5 s~~ — Resolved in v1: 1200ms idle commit. No complaints to date.
- [ ] **iOS Wake Lock hole when the device itself sleeps** — deferred behind the one-time "Keep your phone's display set to never sleep" hint banner. Acceptable workaround for v6 but the spec's "screen never sleeps" promise still has a hole on a user-initiated power-button press. Needs real-iOS verification before declaring v6 fully shippable. — owner: Gerald (via [[dev]] + [[qa]]) — since: 2026-05-23
- [x] ~~3P/5P "predictable default" without playtest~~ — Resolved in v2: replaced with radial layouts at 120° / 72°.
- [ ] **Browser-tab degradation** — still untested. iPhone PWA install is the assumed primary path; Safari tab use deferred. — owner: Gerald (via [[qa]]) — since: 2026-05-23
- [ ] **Experimental views: bypass the "DOM + CSS Grid, not Canvas" mainline constraint?** — Particle-rendered numerals in isometric 3D fundamentally need either WebGL (Canvas) or thousands of DOM elements (slow on iOS). Decide: (a) experimental views opt out of the original constraint; (b) stay DOM-only and accept a limited effect (e.g. ~20 burst particles around a still-DOM-rendered numeral); (c) ship experimental as a separate sub-route. — owner: Gerald (via [[arch]] + [[dev]]) — since: 2026-05-23
- [ ] **"Computationally cheap but entertaining" — define the budget.** — Without a target (FPS floor, particle cap, battery cost on a flat iPhone), "cheap" is wishful. Suggested floor: 60fps idle, 30fps under burst, ≤100 simultaneous particles, no GC pressure (typed arrays). Needs sign-off before implementation. — owner: Gerald — since: 2026-05-23
- [ ] **Experimental view scope — is it ALSO a counter, or just a visualisation?** — If users actually play with the experimental view, it must keep the +/- input semantics (taps still adjust life). If purely a demo, it can be view-only. Affects whether tap zones survive the isometric projection. — owner: Gerald (via [[ux]]) — since: 2026-05-23

## Assumptions
- [Two-player is 90% of use] — status: untested — since: 2026-05-23
- [Skins are pure token swaps with no JS or layout impact] — status: INVALIDATED — since: 2026-05-23 — v4 heroic added a SVG noise patina ::after on .panel, inset shadow on .panel, and text-shadow on .life. Pure-token contract broken; accepted because the effect stays inside skins.css and doesn't touch geometry.
- [Starting-life default of 20 covers MTG; other games handled by `startingLife` field but UI hasn't been sized for 4–5 digit totals] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[arch]], [[ux]], [[qa]]

## Session Log
- 2026-05-23 — SYNC v6: marked "good base" milestone; recorded v1→v6 decisions; opened 3 experimental-track questions (Canvas allowance, performance budget, view-as-counter-or-demo) plus cross-role challenges in [[arch]] and [[ux]].
- 2026-05-23 — INIT: brief recorded; 5 untested assumptions surfaced from the spec; deferred features (poison, commander, history, sound) explicitly noted as out of MVP scope.

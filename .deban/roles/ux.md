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
| 2026-05-23 | v1: tap-zone split 55% top (+) / 45% bottom (−). | Per spec. Untested but ships as the starting point. Alternative: invert (larger − because most life changes are negative). Deferred until real-table playtest. | [[dev]] |
| 2026-05-23 | v2: Pastel skin per-player palette — P1 white-cream, P2 black, P3 powder blue, P4 lavender, P5 sandy brown. | Soft pastel variants; WCAG AA-large holds on all bg/fg pairs. | [[pm]] |
| 2026-05-23 | v2: Cyber skin — P1 deep-yellow-black, P2 fuchsia-dark, P3 teal-dark, P4 orange-dark, P5 blue-dark; with neon-glow text-shadow scaled to each player's --p_i-fg. | Neon-on-deep-dark; high contrast preserved by deep bg + bright fg. | [[pm]] |
| 2026-05-23 | v4: Heroic skin reworked — darker, grittier, weathered. Palette = deep forest, oxblood, deep midnight, tobacco-stained parchment, charcoal-soot. Patina = SVG feTurbulence noise overlay on `.panel::after` (clipped to wedges in 3P/5P), inset vignette shadows, etched serif text-shadow. | Per Gerald: original heroic was too close to pastel. Aged-leather/heraldic mood + actual texture. Patina overlay z-indexed below `.panel-inner` / `.zone` so tap targets stay live. | [[pm]] |
| 2026-05-23 | v2: Stepper UI for starting-life `[−5][−1] value [+1][+5]`, clamped 1..999. | Replaces the discrete 20/30/40 chips per Gerald; supports any tabletop game without enumeration. | [[dev]] |
| 2026-05-23 | v2: History off by default, opt-in toggle in settings. Per-player "…" button only renders when enabled. | Avoid every-panel UI clutter; keeps the seam open. | [[pm]] |
| 2026-05-23 | v3: Cache-bust "Build" badge inside the settings popover (3 cb-shape glyphs + 8-char token hex). | Per Gerald: corner widget on main view was dev affordance, not part of game UX. Settings is the right home. | [[devops]] |
| 2026-05-23 | v5: History "…" button at bottom-center of each player's rotated frame, far from the table center. | Per Gerald: must not be tap-by-mistake-able. The +/- zones cluster around the number; placing "…" at the player's perimeter edge keeps it out of normal play. | [[dev]] |
| 2026-05-23 | v6: Settings close = `×` button at top-right of popover OR tap anywhere outside (full-viewport transparent backdrop). | Per Gerald: must have a clean exit. Backdrop also blocks the zone underneath so life totals don't tick when user taps to close. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v1: hint banner positioned bottom-center, full-width-ish. | Overlapped the cb-badge (then at bottom-right corner). cb-badge intercepted the "Got it" dismiss tap. Fixed: anchored hint bottom-left with `max-width: calc(100vw - 160px)`. (cb-badge later moved into settings, but the hint banner positioning stuck.) |

## Lessons

## Open Questions
- [ ] **Tap-zone split: 55% / 45%, or invert?** — Still untested. Most life changes are negative; larger − zone might be the right call. Needs real-table playtest. — owner: Gerald — since: 2026-05-23
- [x] ~~Floating delta indicator placement~~ — Resolved in v1: above the number in the rotated frame, repositioned for radial.
- [ ] **Numeral font size in 5P** — Currently `clamp(44px, 18vmin, 140px)`. Across-the-table-at-an-angle legibility still untested at real distance. — owner: Gerald — since: 2026-05-23
- [ ] **Experimental view: isometric camera definition.** — "Each facing its owner" in isometric is ambiguous. Two interpretations: (a) 5 separate isometric viewports per player (each a tilted prism, like the current 2D radial with depth); (b) one shared 3D scene with the numerals rotated to face their respective seats but a fixed bird's-eye camera. (a) preserves the table-around-phone mental model; (b) is more visually striking but harder to read at angle. — owner: Gerald — since: 2026-05-23
- [ ] **Experimental view: particle-glyph rendering technique.** — (i) outline-trace ~40–60 particles per digit; (ii) signed-distance-field sample over a grid; (iii) keep the digit as flat DOM text and add a burst-only particle layer on delta. (iii) is by far the cheapest; (i)/(ii) are "numbers made of particles" literally. Gerald's wording suggests (i)/(ii); the budget constraint pushes toward (iii). — owner: Gerald (via [[dev]]) — since: 2026-05-23
- [ ] **Experimental view: accent palette.** — Reuse mainline `--pN-fg` tokens or define a brighter "experimental" palette tuned for dark background + glow? Glow on a dark BG reads differently than the same color on pastel/heroic. — owner: Gerald — since: 2026-05-23

## Assumptions
- [System font stack suffices for `--font-ui`; only display fonts vary per skin] — status: validated — since: 2026-05-23 — pastel uses system stack; cyber uses monospace; heroic uses serif. UI font system-stack everywhere.

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-23 — SYNC v6: recorded v2→v6 skin/layout/UX decisions; opened 3 experimental-view UX questions (camera, particle-glyph technique, accent palette).
- 2026-05-23 — INIT: scope set; tap-zone split, indicator placement, and numeral sizing flagged as open.

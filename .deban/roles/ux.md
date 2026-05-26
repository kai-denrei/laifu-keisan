---
role: ux
owner: Gerald
status: active
last-updated: 2026-05-26
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
| 2026-05-25 | **Ryūshi (Particles) skin** — Sci-fi palette per Gerald: P1 teal / P2 yellow / P3 terminal-green / P4 danger-orange / P5 alert-red on deep-void bg. Numbers traced by Canvas-rendered particle clouds; per-tap burst (radial velocity + alpha-pulse glow); per-digit retargeting so tens doesn't move when ones rolls. | First experimental skin. 1-px grey radial/cross/horizontal player-boundary lines drawn on the canvas (per layout). Player colour stays stable on burst (alpha-pulse, no hue switch). | [[pm]], [[dev]] |
| 2026-05-25 | **7-Seg (Retro CRT) skin** — Hexagonal-segment VFD aesthetic. Per-player phosphor palette: P1 red / P2 green / P3 white / P4 orange / P5 electric blue (#0ad4ff per Marantz reference). Apollo-style white "hot core" on top of every coloured segment; faint "ghost" stroke on off segments forming the 8-outline. Numbers face each player (seat-rotation respected). | Per Gerald: retro tube-display vibe. Hex polygons with pointed tips give the classic LCD/VFD corner notch; multi-pass shadowBlur gives the bloom. | [[pm]], [[dev]] |
| 2026-05-25 | **CRT overlay applies only to lit segments**, not the empty bg. Implemented via `body[data-skin="seven-seg"]::after` with `mix-blend-mode: multiply`, BLACK scanlines + aperture + vignette. Anything × black = black (bg untouched); × digit = darker digit, classic stripe pattern. | Gerald's call: CRT pattern over empty space looked wrong. Multiply blend mode is the standard way to gate an overlay on luminance. | [[pm]] |
| 2026-05-26 | 7-Seg defaults locked in from live ?admin tuning: digitScale 0.55 / segmentThickness 0.18 / digitAspect 1.7 / digitGap 0.25 / glowBlur 25 / ghostAlpha 0.06 / jitter 0.5 / coreWhite 1 / coreThickness 0.7 / scanlines 0.14 / aperture 0 / vignette 0 / flicker 0. | Locked across DEFAULTS, SLIDERS init, AND CSS fallback values so a no-slider load matches a touched-slider load. Net: thicker segments, generous gaps, max hot-core, strong glow, scanlines-only CRT. | [[pm]], [[dev]] |
| 2026-05-25 | Skin grid layout: 2 columns × N rows (currently 4 skins on 2 rows, 5th wraps to row 3). Settings popover widened 260/360 → 300/420. Reset button label "Reset game" → "Reset Counter". | Per Gerald: pagination was overkill; future skins flow to row 3+. | [[dev]] |
| 2026-05-25 | "New version available — Refresh" toast at top-center of viewport when SW detects an update. | Replaces silent skipWaiting per [[arch]]. Pill-shaped, transparent backdrop blur, accent-teal Refresh button + × dismiss. Respects safe-area-inset-top for iOS notch. | [[devops]], [[dev]] |
| 2026-05-26 | v9: History "…" button must stay on-screen for EVERY seat, not just the south one. Now per-seat capped (see [[dev]]); south-seat placement unchanged. | Gerald: "toggling history fails in 3P/5P on mobile — history for several players is off-screen." The v5 "perimeter edge" intent was right; the uniform offset silently made history unreachable for the side seats. | [[dev]] |
| 2026-05-26 | v9: Settings modal centered on screen (was top-anchored, overflowed the bottom on short phones). | Per Gerald. | [[dev]] |
| 2026-05-26 | v9: Build section gains a PWA self-description + platform-aware "Add To Screen" — Chrome/Android: real install button; iOS Safari: "tap Share ↑ then Add to Home Screen" hint; already-installed: "installed, works offline ✓". | Per Gerald: "This is a Mobile PWA, you can [Add To Screen] and use it offline." Asked functional-vs-static; Gerald chose functional-where-supported. iOS can't trigger install programmatically (no beforeinstallprompt), so it gets a manual hint instead of a dead button. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v1: hint banner positioned bottom-center, full-width-ish. | Overlapped the cb-badge (then at bottom-right corner). cb-badge intercepted the "Got it" dismiss tap. Fixed: anchored hint bottom-left with `max-width: calc(100vw - 160px)`. (cb-badge later moved into settings, but the hint banner positioning stuck.) |
| 2026-05-25 | Isometric-3D particle numerals as the first experimental view (per pm.md). | Gerald accepted the architectural pushback (camera ambiguity, budget tension, 3D scene-graph cost). Dropped to 2D particles only — captures the entertainment value without the geometry pain. |
| 2026-05-25 | Original 7-Seg "Hot-core white" defaulted to 0.45 with thickness 0.4. | Looked dim against the bloom. Live ?admin tuning raised to coreWhite=1, coreThickness=0.7 — the Apollo-VFD overexposed-centre look only emerges when the core is bright and fills most of the segment. |

## Lessons
- Per-player palettes for canvas-rendered skins SHOULD reuse the mainline `--pN-fg` tokens read via getComputedStyle(panelEl). Defining a parallel "experimental palette" duplicates state and risks drift. — from Ryūshi + 7-Seg shipping on 2026-05-25
- A CRT/scanline overlay only sells the illusion when it's gated on luminance. Apply it via `mix-blend-mode: multiply` with BLACK scanlines so the empty bg passes through unchanged. — from CRT decision on 2026-05-25
- "Place it at the player's perimeter edge" is a per-seat instruction, not a single measurement — radial seats face different screen edges, so a placement that's at-the-edge for one seat is off-screen for another. Verify the affordance for every seat, not just the one in front of you. — from the off-screen history button on 2026-05-26

## Open Questions
- [ ] **Tap-zone split: 55% / 45%, or invert?** — Still untested. Most life changes are negative; larger − zone might be the right call. Needs real-table playtest. — owner: Gerald — since: 2026-05-23
- [x] ~~Floating delta indicator placement~~ — Resolved in v1: above the number in the rotated frame, repositioned for radial.
- [ ] **Numeral font size in 5P** — Currently `clamp(44px, 18vmin, 140px)`. Across-the-table-at-an-angle legibility still untested at real distance. — owner: Gerald — since: 2026-05-23
- [x] ~~Experimental view: isometric camera definition.~~ — Dropped 2026-05-25: Gerald moved to 2D-only.
- [x] ~~Experimental view: particle-glyph rendering technique.~~ — Resolved 2026-05-25: option (a) outline-sample.
- [x] ~~Experimental view: accent palette.~~ — Resolved 2026-05-25: reuse mainline `--pN-fg` per skin.
- [ ] **Marquee experimental view** — Ryūshi (sci-fi particles) and 7-Seg (retro CRT) coexist as user choices. No need to pick one as "the experimental view" — but eventually one may emerge as the default for screenshots / Home Screen install preview. — owner: Gerald — since: 2026-05-26

## Assumptions
- [System font stack suffices for `--font-ui`; only display fonts vary per skin] — status: validated — since: 2026-05-23 — pastel uses system stack; cyber + 7-seg use monospace; heroic uses serif. UI font system-stack everywhere.

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-26 — SYNC v9: history "…" button reachability fixed for 3P/5P side seats; settings modal centered; Build section gains platform-aware PWA "Add To Screen". 3 Decisions, 1 Lesson.
- 2026-05-26 — SYNC v8: recorded Ryūshi + 7-Seg skin decisions, CRT-on-digits-only via multiply blend, tuned 7-Seg defaults; 2 new Dead Ends + 2 new Lessons. 3 experimental UX OQs resolved. New OQ: which skin is "the marquee" for install previews.
- 2026-05-23 — SYNC v6: recorded v2→v6 skin/layout/UX decisions; opened 3 experimental-view UX questions (camera, particle-glyph technique, accent palette).
- 2026-05-23 — INIT: scope set; tap-zone split, indicator placement, and numeral sizing flagged as open.

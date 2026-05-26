---
role: dev
owner: Gerald
status: active
last-updated: 2026-05-26
---

# Development

## Scope
Implementation of the six modules (state, render, input, wakelock, skins, main), service worker, and manifest. Owns the property that no module imports from `index.html` or makes assumptions about CSS class names beyond what `render.js` controls.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-23 | v1: Pointer events (`pointerdown`/`pointerup`/`pointercancel`) over touch+mouse | Modern path; single code path for iOS / Android / desktop. | [[ux]] |
| 2026-05-23 | v1: Wake Lock degrades silently when unsupported. One-time "Keep your phone's display set to never sleep" hint banner covers the iOS device-sleep gap. | API surface is small; failed acquire returns false → user gets hint banner once instead of an error. | [[ux]] |
| 2026-05-23 | v1: Input commit lifecycle — pointer-interaction state and batch state are INDEPENDENT. commit() never touches pointerId. | First PM caught the bug: clearing pointerId mid-batch (during a sign-flip commit) broke endZoneInteraction's pointerId-match check, leaving the hold timer running unchecked. | [[qa]] |
| 2026-05-23 | v5: `.life` centered via explicit `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` — not grid-flow centering on `.panel-inner`. | Removes any ambiguity introduced by the absolute-positioned siblings (`.delta`, `.history-btn`). | [[arch]] |
| 2026-05-23 | v5: Radial `.life` translateY = 32vmin (3P) / 28vmin (5P) | Stays inside the side-facing wedges in portrait (shortest radial-to-perimeter ≈ 50vmin). Larger values clipped numbers off-screen. | [[ux]] |
| 2026-05-23 | v5: History "…" button at bottom-center of player's rotated frame. Grid: `bottom: 14px; left: 50%; transform: translateX(-50%)`. Radial: `translate(-50%, -50%) translateY(72vmin)` (3P) / `64vmin` (5P). | Per Gerald: button must sit at the player's near edge, far from the table-center where +/- taps cluster — eliminates accidental presses. | [[ux]] |
| 2026-05-23 | v6: `menu-close` action dispatched by both the × button inside the popover and the full-viewport `.menu-backdrop`. menu-toggle and reset-confirm both sync backdrop with popover. | Clean exit affordance per Gerald; backdrop blocks zone underneath so life doesn't change when user taps to close. | [[ux]], [[arch]] |
| 2026-05-24 | `js/particles.js` as canvas renderer for Ryūshi skin. Single full-viewport canvas, bbox-driven layout (reads `.life` getBoundingClientRect + computed font), lifecycle hooked to body[data-skin] mutations. | Per [[arch]] view-as-skin + Canvas-allowance. Sample text in offscreen canvas, rotate per panel seat-rotation, place particles at screen-space targets. | [[arch]], [[ux]] |
| 2026-05-25 | `input.js` dispatches CustomEvents `lifechange` on batch commit AND `life-preview` on per-tap accumulate. Carries `{ playerId, delta, sign, newValue }`. | Side-channel for renderers that need to react without breaking the idempotent render contract. Previews drive immediate visual feedback before the 1.2s commit lands. | [[arch]], [[ux]] |
| 2026-05-25 | Per-digit particle tracking in particles.js — each particle carries a `digitIndex`. On value change, only changed-digit particles burst + retarget; unchanged digits stay still. | Gerald: "tens should not change when ones rolls 20→21". Implemented via per-digit pixel-region tagging at sample time + diff oldStr vs newStr at change time. | [[ux]] |
| 2026-05-25 | `js/sevenseg.js` as canvas renderer for 7-Seg skin. Parallel structure to particles.js. Hexagonal-polygon segments with pointed tips (no overlap at digit corners). | Per [[arch]]. Standard 7-segment a-g topology; multi-pass shadowBlur for CRT halo; faint "ghost" stroke on off segments; stable per-segment brightness jitter. | [[ux]] |
| 2026-05-26 | 7-Seg digit lookup keyed by string char (`SEGMENTS_FOR_CHAR`), NOT by `parseInt(char)`. "-" → `["g"]` (middle bar only). | `parseInt("-")` returns NaN; lookup missed; minus sign rendered as a blank ghost slot. Negative life totals now render correctly. | [[ux]] |
| 2026-05-25 | `js/dev-sliders.js` generalised to take `{ title, sliders, onChange, getFps }` config. Each renderer module exports its own `SLIDERS` schema. | Was hardcoded for particles only; sharing the mount logic across Ryūshi + 7-Seg + future skins requires a config-driven panel. | [[arch]] |
| 2026-05-25 | Admin gate via `?admin` URL flag. Dev sliders only mount when present; otherwise hidden completely. | Keeps tuning UI off normal users while staying one URL away. Gerald: tune live, lock defaults, push without removing sliders. | [[ux]] |
| 2026-05-26 | v9: Radial history "…" button offset is now **per-seat edge-aware**, not uniform: `min(72vmin/64vmin, (50vw−36px)/\|sinθ\|, (50vh−22px)/\|cosθ\|)` keyed on `data-seat-rotation`. South seat (0°) keeps the tuned 72/64vmin on real phones; only seats whose bisector hits the near 50vw edge get pulled in. Reads vw/vh directly → adapts to landscape. | Corrects the v5 uniform-offset decision (now a Dead End): 72/64vmin shot the side-seat buttons off-screen. Alternative — uniform reduced offset (44/40vmin) — rejected: it pulls the south seat in too, regressing Gerald's tuned placement. The per-seat cap is surgical. | [[ux]] |
| 2026-05-26 | v9: `js/pwa-install.js` — new module owning the "Add To Screen" affordance. Captures `beforeinstallprompt` (preventDefault + stash), exposes `triggerInstall()` + `updatePwaUI()`. `renderMenu()` calls `updatePwaUI()` (re-syncs on every menu rebuild); input.js wires `data-action="pwa-install"` + re-syncs on menu open; main.js calls `initPwaInstall()` before first render. | Platform-aware install per Gerald (chose functional-button-where-supported over static text). State: standalone → installed confirmation; deferredPrompt set → button; iOS → Share hint; else → desktop fallback. | [[ux]], [[arch]] |
| 2026-05-26 | v9: Settings popover centered on screen — `top/left:50% + translate(-50%,-50%)` anchored on the already-centered `.menu-pill`, plus `max-height:90vh; overflow-y:auto` guard. | Was top-anchored at `top:56px` and overflowed the bottom on short viewports (Reset button fell off-screen); the new PWA row made it taller. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-23 | v1: `commit()` originally cleared `pointerId` along with batch state. | When sign-flip mid-batch invoked commit() from inside a pointerdown handler, the new pointerId got nulled before endZoneInteraction's match check. Hold timer ran unchecked → life crashed on rapid +/- taps. Fixed by separating pointer lifecycle from batch lifecycle. |
| 2026-05-23 | v1: `[hidden]` attribute used to hide overlays. | Overridden silently by author CSS (`display: flex` on `.modal`, `.menu-popover`, `.log-popover`, `.hint-banner`). UA default `[hidden]{display:none}` doesn't survive author rules. Fixed: added explicit `[hidden] { display: none !important; }` in base.css. |
| 2026-05-23 | v1: `.life` button inside `.panel-inner` at z-index 1, `.zone` at z-index 2. | Tapping the number routed to the zone instead — log popover never opened. Fixed: `.panel-inner` z-index raised + `pointer-events: none` with `.life` opting in to `auto`. |
| 2026-05-25 | particles.js read seat-rotation from `panel-inner.dataset.seatRotation`. | The data attribute is set on the `.panel` section (render.js makePanel: `section.dataset.seatRotation = ...`), NOT on `.panel-inner` which only gets the CSS variable. Read always returned 0; every player's particles rendered upright in screen space regardless of seat. Fixed: read from `panel.dataset.seatRotation` (and same for sevenseg.js). |
| 2026-05-25 | 7-Seg segments drawn as round-cap stroked lines (3-pass: halo + inner + crisp). | Round caps extended past the segment endpoint by T/2; at digit corners (a-meets-f etc.) the rounded caps of adjacent segments overlapped, creating visible alpha-doubling smudges. Switched to hexagonal-polygon fill with pointed tips at the exact endpoints — adjacent segments leave a small notch, classic VFD signature. |
| 2026-05-26 | 7-Seg `SEGMENTS_FOR_DIGIT` keyed by integer (`parseInt(char)`). | `parseInt("-")` returns NaN, lookup returned undefined, empty segment set. Minus sign rendered as a blank ghost slot — 7-Seg silently couldn't display negative life totals. Renamed to `SEGMENTS_FOR_CHAR`, keyed by string. |
| 2026-05-26 | v5 radial history "…" button at a UNIFORM `translateY(72vmin)` (3P) / `64vmin` (5P) along each seat's bisector. | Assumed every seat reaches the perimeter at the same radial distance. False: side-facing seats' bisectors hit the near viewport edge at only ~50vmin, so 72/64vmin overshot by 12–22vmin — buttons landed off-screen for 2/3 (3P) and 2/5 (5P) players, making history unreachable for them (Gerald's bug report). The adjacent `.life` rule documented this exact ≈50vmin limit and obeyed it (32/28vmin); the button ignored its neighbour's lesson. Fixed v9 with a per-seat edge-aware cap. |

## Lessons
- Pointer-interaction lifecycle and batch-commit lifecycle are INDEPENDENT. Clearing pointer state from a batch-commit code path looks tidy but corrupts event matching. — from dead end on 2026-05-23
- UA-default `[hidden]{display:none}` does not survive author rules. Use `!important` on the hidden-state rule when overlays default to `display: flex`. — from dead end on 2026-05-23
- Read a `data-*` attribute from the element that SET it. Grep the renderer's `dataset.*` lookups against `render.js`'s `dataset.*` writes; don't guess from DOM hierarchy. The compiler can't catch this. — from dead end on 2026-05-25
- For canvas shape primitives that meet at corners (a-meets-f in 7-seg, segment-to-segment), prefer pointed-tip polygons (hexagons) over round-cap strokes. Round caps extend past the endpoint and create alpha overlap at joints. — from dead end on 2026-05-25
- `parseInt()` is a trap for any character that isn't an integer digit. For glyph lookups, key by string char directly. — from dead end on 2026-05-26
- A control placed by radial offset from viewport center has a safe distance that DEPENDS on seat orientation — side-facing seats reach the screen edge at 50vmin, vertical seats reach the taller edge much further out. Cap each seat by the real edge distance along its own bisector (`min(desired, (50vw−clear)/\|sinθ\|, (50vh−clear)/\|cosθ\|)`), never a single uniform value. — from dead end on 2026-05-26

## Open Questions
- [x] ~~Wake Lock fallback strategy~~ — Resolved in v1: silent degrade + one-time hint banner.
- [x] ~~Long-press detection that survives hold-to-accelerate path~~ — Resolved in v1: long-press-to-reset removed in favour of menu-pill confirm modal. No race.
- [x] ~~Pointer events vs touch events~~ — Resolved in v1: pointer events.
- [x] ~~Particle system implementation language~~ — Resolved 2026-05-25: Canvas 2D, no library, no WebGL.
- [x] ~~rAF coordination with the existing render(state) loop~~ — Resolved 2026-05-25: `lifechange` + `life-preview` CustomEvents dispatched by input.js; renderers subscribe.
- [x] ~~Particle-glyph rendering technique~~ — Resolved 2026-05-25: option (a) outline-sample. Each digit rasterized in an offscreen canvas at the .life font, alpha-passing pixels tagged with digitIndex by x-range, sampled into screen-space targets.

## Assumptions

## Dependencies
Blocked by: [[arch]]
Feeds into: [[qa]]

## Session Log
- 2026-05-26 — SYNC v9: per-seat edge-aware cap for the radial history button (corrects the v5 uniform-offset Dead End); new `js/pwa-install.js` (platform-aware "Add To Screen"); centered the settings popover. 3 Decisions, 1 Dead End, 1 Lesson.
- 2026-05-26 — SYNC v8: recorded Ryūshi + 7-Seg implementation decisions and 3 new Dead Ends (seat-rotation-on-wrong-element, round-cap alpha overlap, parseInt-of-minus). 3 new Lessons. All 3 prior implementation Open Questions resolved.
- 2026-05-23 — SYNC v6: recorded v1→v6 implementation decisions and 3 Dead Ends caught during Playwright verification; opened 3 particle-system-implementation questions tied to [[arch]]'s Canvas-allowance call.
- 2026-05-23 — INIT: scope set; three implementation questions surfaced (wake lock fallback, long-press race, pointer event choice).

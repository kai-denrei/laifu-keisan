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
| 2026-05-23 | Tap zones: top 50% = `+`, bottom 50% = `−`. Equal split. | Spec's 55/45 favoring `+` is backwards (most life changes are damage = −). Equal split avoids encoding a guess. The number sits at the seam, centered. The corner reset button is outside both zones. | [[dev]] |
| 2026-05-23 | Floating delta indicator: positioned in the panel's *upright* coordinate system. For a panel rotated 180°, the indicator sits above the number from the panel's perspective (which is below the number from screen perspective). Rendered as a child of the rotated `.panel-inner` element so it inherits the rotation. Shows `+N` / `−N`, fades in on first tap of a batch, animates to commit on idle expiry. | If the indicator is screen-absolute it's upside down for the opponent. Inheriting rotation = correct orientation for every seat for free. | [[dev]] |
| 2026-05-23 | Numeral size: `clamp(min, vmin-based, max)`. For 2P: target ~32% of panel min-dimension; clamp 96px..240px. For 4P: ~26% of panel min-dim; clamp 64px..160px. Display font: skin-controlled. Confirms at the floor: 96px on a phone read upright is ~16mm = visible across 60cm. | Vmin-based scaling means the number fills the panel proportionally regardless of orientation; clamps prevent absurd sizes on tablets. Aspirational floor: a phone in 2P should show a number that fills ~⅓ of its panel. | [[dev]] |
| 2026-05-23 | `--font-ui` is system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`). Display fonts: pastel = same system stack (max legibility); cyberpunk = monospace stack (`ui-monospace, 'SF Mono', Menlo, monospace`); heroic-fantasy = serif stack (`'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif`). No web fonts. | Self-host fonts is the spec, but system stacks meet legibility floor without any font files. Saves bandwidth, removes a class of FOUT bugs, keeps offline-first promise honest. | [[arch]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- ~~Tap-zone split~~ — RESOLVED 2026-05-23: 50/50, equal. See Decisions.
- ~~Floating delta indicator placement~~ — RESOLVED 2026-05-23: rendered inside the rotated panel-inner. See Decisions.
- ~~Numeral font size~~ — RESOLVED 2026-05-23: vmin-clamped per layout. See Decisions.

## Assumptions
- [System font stack suffices for `--font-ui`; only display fonts vary per skin] — status: untested — since: 2026-05-23

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]]

## Session Log
- 2026-05-23 — INIT: scope set; tap-zone split, indicator placement, and numeral sizing flagged as open.

---
project: laifu-keisan
created: 2026-05-23
status: active
mode: solo
stale_threshold_days: 30
---

# laifu-keisan — Index

## Brief
Tabletop Life Counter — a vanilla HTML/CSS/JS Progressive Web App for 2–5 player tabletop card games. Phone-flat-on-a-shared-table use case: players reach across at angles, lighting is bad, hands are full of cards. Mission: change a number fast, unambiguously, reversibly; legible across the table; never sleeps; never misfires. Constraints: no build step, no framework, no runtime dependencies, no network calls after first load.

## Active Roles
- [[pm]] — owner: Gerald
- [[arch]] — owner: Gerald
- [[dev]] — owner: Gerald
- [[ux]] — owner: Gerald
- [[qa]] — owner: Gerald
- [[devops]] — owner: Gerald

## Key Decisions
<!-- Cross-role summary, maintained by COMPACT -->

## Open Questions (cross-role)
- Hold-to-accelerate cadence and tap-zone split — feel/UX choices that need playtest, owned by [[ux]] with [[dev]] implementation hooks
- iOS Wake Lock degradation when the device itself sleeps (not just tab backgrounded) — [[dev]] + [[qa]]
- 3P/5P "predictable default" ships untested; pinwheel variant deferred but may be needed for 3P at launch — [[ux]] + [[arch]]

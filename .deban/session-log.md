# Session Log

<!-- Append-only event log. Most recent at bottom. -->

2026-05-23 11:10 — INIT — mode: solo, roles: pm, arch, dev, ux, qa, devops
2026-05-23 11:14 — SCAFFOLD — vanilla skeleton (index.html, manifest.webmanifest, sw.js, css/, js/, icons/) + cache-busting layer installed (token 5ae02070); SW cache name keyed off CB_TOKEN; bust.sh extended to rewrite sw.js on each bump; public/ flattened to project root (cb-badge.js, cb-shapes/) to match HTML root references
2026-05-23 11:41 — V1 BUILD (PM sub-agent, 27 min, 122 tool calls) — full implementation of state/render/input/wakelock/skins/main + CSS for base/tokens/skins/layout + icons via `scripts/make-icons.py` (Pillow, dev-only). Playwright-driven verification at iPhone-14-Pro viewport: 8/8 acceptance items pass, with caveats — Wake Lock not testable in headless (degrades silently per [[dev]]); Lighthouse not run (needs Gerald's Chrome). 4 critical bugs found and fixed during verification: (1) `commit()` was clearing `pointerId` mid-batch, breaking sign-flip + leaving hold timer running; (2) `[hidden]` overridden by author `display: flex` on overlays — added `[hidden]{display:none!important}` to base.css; (3) `.life` button unreachable due to z-index ordering — fixed with `pointer-events` opt-in; (4) hint banner overlapped cb-badge — anchored bottom-left with width cap. Long-press-to-reset removed in favor of menu-pill confirm modal (eliminates "held too long" failure). Token at this milestone: 68d5fae3. 9 screenshots in `screenshots/`. NOT committed — full diff in working tree pending Gerald's review.


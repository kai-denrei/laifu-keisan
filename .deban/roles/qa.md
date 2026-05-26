---
role: qa
owner: Gerald
status: active
last-updated: 2026-05-26
---

# Quality Assurance

## Scope
Acceptance checklist verification, especially the items only a human can confirm: legibility at a table angle, "never misfires" under reaching hands, wake-lock survival across backgrounding, install-and-airplane-mode flow. Owns the no-go list.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-26 | v9: Layout/PWA changes verified via headless Google Chrome (puppeteer-core → installed Chrome.app), seeding localStorage to force 3P/5P + history-on and measuring each control's `getBoundingClientRect` against the viewport across 320–412px widths + landscape. Written as pass/fail assertions, run failing-first then after the fix. | Off-screen-button geometry and modal centering are objectively measurable. A failing-first assertion proved the bug (side seats off by 57–77px) and then the fix (all on-screen, ≥9px margin). Not a substitute for the human-only acceptance items, but the right tool for viewport math. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-26 | Simulating "real iOS Safari / non-installable browser" by setting an iPhone User-Agent in headless Chrome, to test the PWA install affordance's iOS branch. | UA spoofing doesn't stop Chrome's own install engine — `beforeinstallprompt` still fired, `deferredPrompt` got set, and the app (correctly) showed the install button, not the iOS hint. Blocking the manifest also failed (the registered SW served it from cache). Working approach: drop the `beforeinstallprompt` listener at the source via `page.evaluateOnNewDocument` (a browser that never fires it); test the standalone branch via injected `navigator.standalone=true`. |

## Lessons
- You cannot fake "this browser can't install a PWA" by spoofing the User-Agent in headless Chrome — its install engine ignores the UA and fires `beforeinstallprompt` anyway. To exercise the iOS / non-installable code path, prevent the event from being captured (suppress the listener), don't disguise the browser. — from dead end on 2026-05-26
- Verify viewport-relative layout (vmin/vw offsets) by measuring `getBoundingClientRect` against the viewport across a spread of widths AND orientations, as pass/fail assertions — not by eyeballing one screenshot. The off-screen seats only surfaced because every seat was measured. — from the history-button verification on 2026-05-26

## Open Questions
- [ ] **Test on which devices for v1?** — at minimum: one iOS phone, one Android phone, one iPad (the tabletop case). — owner: Gerald — since: 2026-05-23
- [ ] **Acceptance for "no accidental input"** — how do we test? Manual repro of pull-to-refresh, double-tap zoom, text selection, context menu — checklist needs a script. — owner: Gerald — since: 2026-05-23
- [ ] **Acceptance for "opens to a playable board in under a second, offline"** — Lighthouse timing, or stopwatch on a real device after airplane mode? — owner: Gerald — since: 2026-05-23

## Assumptions

## Dependencies
Blocked by: [[dev]]
Feeds into:

## Session Log
- 2026-05-26 — SYNC v9: first QA entries. Headless-Chrome measurement harness for the radial-history-button + modal-centering + PWA-install-state checks; recorded the UA-spoof-doesn't-simulate-iOS Dead End. 1 Decision, 1 Dead End, 2 Lessons.
- 2026-05-23 — INIT: scope set; device list, "no accidental input" script, and offline-startup timing flagged as open.

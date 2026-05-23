# Tabletop Life Counter — Build Spec (PWA)

> Instruction document for a Claude Code CLI session. Build the project described
> below. Read the **Mission** and **Hostile environment** sections first — they
> govern every micro-decision. When in doubt, cut.

---

## Mission

Change a number fast, unambiguously, reversibly; legible across a table at an
angle; never sleeping; never misfiring. That is the entire product. Everything
else is garnish.

## The hostile environment (design from this, not from a feature list)

The device lies flat on a shared table. Players reach across it from opposite
seats. Lighting is bad. Hands are full of cards. It gets bumped. An auto-lock or
a stray touch mid-game is a disaster. Standard app-design intuitions mostly do
not apply here — design for this physical situation specifically.

---

## MVP scope (build exactly this)

- Life tracking, **2–5 players**, configurable starting life (default **20**).
- **Per-seat rotation** appropriate to each player count.
- **Reversible input**: batched-tap deltas with a floating preview, a per-player
  change log, and per-player undo. This is core, not a flourish.
- **Screen never sleeps** while a game is active (Wake Lock).
- **Offline, installable PWA.** Open → playing in under a second. No login, no
  network, no first-run wizard.
- **Skin system**: three skins at launch — `pastel` (default), `cyberpunk`,
  `heroic-fantasy`.

## Explicitly deferred — do NOT build now, but leave clean seams

Poison / energy / commander-damage and other extra counters; format presets
beyond a starting-life number; cross-game stats and history; dice / coin /
random seat select; sound. Architect the state shape and the token/skin system
so these slot in later **without rework**. Do not stub UI for them.

---

## Hard constraints (non-negotiable)

- **Vanilla.** HTML + CSS + ES modules. No build step, no framework, no bundler,
  no runtime dependencies. The project must run by serving static files.
- **DOM + CSS Grid, not Canvas.** This is legibility-critical, rotation-heavy,
  and text-first. Per-seat rotation is `transform: rotate()`; numerals stay
  crisp and scalable; hit zones are trivial; it stays accessible. Do not reach
  for Canvas.
- **Single source of truth.** One `state` object → a render pass → the DOM.
  Persist to `localStorage` on every mutation; restore on load.
- **Mobile-first.** Must work on a phone lying flat. Targets are iOS Safari and
  Android Chrome.
- **No runtime network calls.** Self-host any fonts or use a system stack.

---

## Architecture

A single state object drives everything. Suggested shape:

```js
const state = {
  startingLife: 20,
  playerCount: 2,            // 2..5
  skin: "pastel",            // "pastel" | "cyberpunk" | "heroic-fantasy"
  layoutVariant: "default",  // per-count; e.g. 3P "default" | "pinwheel"
  players: [
    { id: 0, life: 20, log: [ /* { delta, life, t } */ ] },
    // ...
  ],
};
```

Module split (keep minimal, single-responsibility):

- `state.js` — create / mutate / serialize state; localStorage read+write.
- `render.js` — pure-ish `render(state)`: build/update panels, numbers, layout.
- `input.js` — tap zones, hold-to-accelerate, batched-delta accumulation/commit.
- `wakelock.js` — acquire / re-acquire / release; visibility handling.
- `skins.js` — apply + persist `data-skin`.
- `main.js` — wire it together; restore-or-new on load.

Render must be idempotent: calling `render(state)` always produces the current
truth. Every committed mutation pushes one undoable event to that player's `log`
and writes state to storage.

---

## Layout & seat rotation (the hard part)

**Convention.** Rotation is degrees **clockwise** via `transform: rotate()`. A
panel at **0°** reads upright to the player at the **bottom edge** ("you"); a
panel at **180°** reads upright to a player across the **top edge**. Verify
orientation by physically rotating a phone — it is easy to invert. Build with
CSS Grid: panels fill grid cells; rotate the *content inside* each cell; each
panel is a full-bleed tap target.

| Count | Layout | Rotations |
|---|---|---|
| **2** (90% of use) | 1 col × 2 rows | bottom P1 **0°**, top P2 **180°** |
| **3** (judgment call — get it right) | bottom full-width + top split in two | P1 bottom **0°**; P2, P3 top **180°** each |
| **4** | 2 × 2 grid | bottom two **0°**, top two **180°** (two players per long side) |
| **5** | top row of 3 + bottom row of 2 | top three **180°**, bottom two **0°** |

Notes:

- **2P** is the case to perfect. Two stacked half-screen panels, opponent's
  inverted. If only one layout is flawless, make it this one.
- **3P and 5P are inherently awkward** — no seating is universally correct. Ship
  the predictable default above. Expose `layoutVariant` so a pinwheel variant
  can be added (3P: P2 left **90°**, P3 right **−90°**) without touching other
  counts.
- Hairline gutters between seats so panels read as distinct.
- The **reset / menu / player-count control must never sit inside a tap zone** —
  put it in a small center pill or a corner that is explicitly not a +/− target.

---

## Input model

- Each panel splits into a **+ zone (top ~55%)** and a **− zone (bottom ~45%)**,
  or equivalently two oversized +/− buttons filling the panel. Tap = ±1.
- **Hold to accelerate**: after ~500 ms of hold, repeat at an increasing rate.
- **Batched delta**: rapid taps accumulate and show a floating indicator near
  the number (e.g. `−5`); commit after ~1.5 s idle. The commit is **one**
  undoable event, not five.
- **Per-player change log**: timestamped deltas resolve "wait, when did I drop
  to 12?" Tap the number to peek the log; offer per-player undo of the last
  change.
- **Reset / new game**: long-press the number or use the menu; confirm before
  destroying state.
- **Kill accidental input**: `touch-action: manipulation` (no double-tap zoom),
  `user-select: none`, `overscroll-behavior: none` (no pull-to-refresh), and
  suppress the context menu on long-press where it conflicts.

---

## Skins (the one flourish)

- A skin is a **token set, never a layout change.** Geometry and ergonomics are
  byte-identical across skins.
- Apply via a root attribute: `:root[data-skin="cyberpunk"] { … }`. Switching is
  instant and the choice persists.
- **Token contract** — every skin defines all of these:
  `--bg`, `--panel-bg`, `--panel-bg-alt` (optional per-seat tint), `--text`,
  `--text-dim`, `--accent-pos` (the `+`), `--accent-neg` (the `−`),
  border/contour treatment, `--font-display` (the big numerals), `--font-ui`,
  and an optional `--frame` decoration layer.
- **Legibility floor overrides vibe.** The big number must hold high contrast
  against its panel in *every* skin (treat WCAG AA for large text as the floor).
  A skin that fails this is a bug, not a style choice.
- Launch skins:
  - `pastel` — default; soft, neutral, low-drama, maximum legibility.
  - `cyberpunk` — dark base, neon accents, angular contour, monospaced display.
  - `heroic-fantasy` — muted earth/parchment, serif display, restrained ornament.
- Decoration is CSS/SVG only and must not bleed into tap zones or reduce the
  number's contrast.
- **Adding a skin later = one token block + optional decoration. No JS or layout
  changes.** Verify this property holds.

---

## PWA requirements

- **`manifest.webmanifest`**: `name` / `short_name`, `display: fullscreen` (or
  `standalone`), `orientation: any`, `theme_color`, `background_color`, maskable
  icons at 192 and 512, plus an `apple-touch-icon`.
- **Service worker (`sw.js`)**: cache the app shell (html/css/js/icons)
  cache-first; fully functional offline after first load; versioned cache name
  with cleanup of old caches on `activate`.
- **Wake Lock**: acquire on game start; **re-acquire on `visibilitychange` when
  the page becomes visible** — iOS drops the lock on backgrounding; release on
  explicit exit. Degrade gracefully where unsupported.
- **iOS specifics**: `apple-mobile-web-app-capable` + status-bar-style meta tags;
  honor safe-area insets with `env(safe-area-inset-*)`; **do not depend on
  `navigator.vibrate`** (absent on iOS); the Orientation Lock API is unreliable
  on iOS, so handle rotation gracefully rather than locking it.

---

## Suggested file layout

```
/index.html
/manifest.webmanifest
/sw.js
/css/{base.css, tokens.css, skins.css, layout.css}
/js/{state.js, render.js, input.js, wakelock.js, skins.js, main.js}
/icons/{icon-192.png, icon-512.png, maskable-192.png, maskable-512.png, apple-touch-icon.png}
```

Keep it flat and minimal. No tooling directories.

---

## Acceptance checklist (all must pass)

- [ ] Opens to a playable board in under a second, offline, with no login;
      resuming restores the exact prior state.
- [ ] 2/3/4/5-player layouts render; each seat's number is upright to its
      player; the reset/menu control is never under a +/− tap zone.
- [ ] Tap ±1 and hold-to-accelerate work; batched-delta preview commits as one
      undoable event; per-player undo and log are usable.
- [ ] Screen does not sleep during a game and survives backgrounding (wake lock
      re-acquired on return).
- [ ] No accidental zoom, scroll, text-selection, or pull-to-refresh on a flat
      phone.
- [ ] Three skins switch instantly and persist; the numerals stay legible in all
      three; geometry is identical across skins.
- [ ] Installable to the home screen; runs fullscreen; fully usable in airplane
      mode after first load.
- [ ] Lighthouse PWA checks pass; zero runtime network calls; zero dependencies.

---

## Notes to the implementing agent

- **Bias to less.** If something is not in MVP scope, do not add it — leave a
  clean seam instead.
- The product is the *feel*: instant, legible, forgiving, never-sleeps. Spend
  effort there, not on chrome.
- Test against the real moment: a phone flat on a table, four hands reaching, a
  dim room, a contested life total. If the design wins that moment, it's done.

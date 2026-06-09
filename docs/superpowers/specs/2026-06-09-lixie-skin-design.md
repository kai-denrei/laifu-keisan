# Lixie skin — design

**Date:** 2026-06-09
**Status:** approved (review via local URL)

## Goal

Add a fifth canvas-overlay skin, **"Lixie"**, porting the dexipurei-galore
edge-lit engraved-acrylic "Lixie Tube" display into the life counter. Source:
`dexipurei-galore` `displays/lixie.js` (captured in `lixie-standalone.html`),
tuned to `lixie-params.json`.

Decisions (confirmed with operator):
- **Per-player glow color** — each panel glows in its own `--player-fg`, like
  the 7-Seg skin, so players stay visually distinct.
- **Full tube atmosphere** — dark `#04080c` page background; vignette + dust +
  scratches drawn full-frame so the glowing numerals float in a deep glass tube.
- **Self-hosted JetBrains Mono** — the standalone tuned its look against
  JetBrains Mono (its declared Cormorant Garamond is never actually loaded);
  bundle the woff2 so the PWA stays offline.

## Architecture

Skins are canvas-overlay modules following one contract, wired in `main.js`
via `syncSkinRenderer()` keyed on `body[data-skin]`. Existing examples:
`particles.js` (Ryūshi) and `sevenseg.js` (7-Seg). Lixie mirrors `sevenseg.js`.

### New module: `js/lixie.js`

Exports the standard skin contract: `startLixie`, `stopLixie`, `updateConfig`,
`getFps`, `refreshPanels`, `SLIDERS`.

Inlines the core helpers the standalone uses (self-contained, no new deps):
`mulberry32` / `hash` / `makeRng`, `hex2rgb` / `mix` / `rgba`, `bloom`,
`vignette`, `dust`, `scratches`.

- Full-screen `position:fixed` canvas, `pointer-events:none`, `z-index:4` —
  same layering as the other canvas skins (above panels, below menu).
- `refreshPanels()` samples each `.panel .life` bbox + `data-seat-rotation` +
  computed `--player-fg`, identical to `sevenseg.js`.
- Per panel: `translate(cx,cy) → rotate(seatRotation)`, then draw the number's
  digit-stacks sized to fit the bbox, glowing in that player's color. The
  standalone's single-display `render(ctx,p,t,rng)` is refactored into a
  per-cell `drawDigitStack(...)` so it can be placed/rotated per panel.

**Static / render-on-change.** Lixie's render never reads `t` — all variance is
seeded `rng.hash`. So instead of a 60fps RAF loop, redraw once on: start,
`refreshPanels`, `lifechange` / `life-preview`, resize / orientation, and
`updateConfig` (so `?admin` sliders update live). This avoids a full-canvas
bloom blur every frame. `getFps()` returns `0` (no loop) to satisfy the
dev-sliders wiring.

### Locked params (become `DEFAULTS`, from `lixie-params.json`)

`glow 5 · bloomInt 45 · coreWhite 34 · etchW 14 · offset 10 · ghost 100 ·
edgeBleed 0 · ledVary 35 · chroma 60 · dust 55 · scratch 34 · vignette 60`.

`color` is per-panel `--player-fg` (not a fixed value); `bg` is owned by CSS.
`edgeBleed` is 0, so the edge-LED color is effectively invisible — derive it
from the player color and don't sweat it. `SLIDERS` exposes the same 12
tunables under `?admin`.

### Fidelity refinements

- **Non-digit chars** (the `−` in negative totals): skip the 10-ghost stack,
  draw only the bright glyph — otherwise a minus sign sits over ten ghost
  numerals and reads as noise.
- Per-panel `bloom()` inside the rotated frame (correct under rotation; cheap
  because we render on-change, not per-frame).

### CSS: `css/skins.css` → `[data-skin="lixie"]`

Modeled on the `seven-seg` block: dark `#04080c` page background, hide the DOM
`.life` glyph while preserving its layout box (`color:transparent`), disable
`.panel::after` patina, theme the menu/chrome. Plus an `@font-face` for
JetBrains Mono.

### Font

`fonts/JetBrainsMono.woff2` + `@font-face`. `ETCH_FONT =
'"JetBrains Mono", ui-monospace, monospace'`. Bundle in SW precache; let
`bust.sh`'s URL fingerprinter version the `url()`.

## Registration / plumbing

1. `js/skins.js` — add `"lixie"` to `VALID`.
2. `js/state.js` — add `"lixie"` to `SKINS` (+ comment).
3. `js/render.js` — add a **Lixie** button to the skin grid.
4. `js/main.js` — import lixie fns; add start/stop + dev-sliders branch in
   `syncSkinRenderer()`; add lixie case to the `layout-change` handler.
5. `sw.js` — add `js/lixie.js` (bare + `?v=` query) and the font to precache.
6. `scripts/bust.sh` — run last to bump the cache token + fingerprint URLs.

## Testing / verification

No test framework in repo — verification is visual:
- Load with `?admin`; confirm 2P / 3P / 4P / 5P render glowing stacks rotated
  correctly to each seat.
- Negative (`−3`) and two-digit (`40`) totals render correctly; minus sign is
  clean (no ghost stack).
- Dark tube atmosphere reads; no console errors.
- `scripts/verify-v2.mjs` still passes.
- Screenshots into `screenshots/`.

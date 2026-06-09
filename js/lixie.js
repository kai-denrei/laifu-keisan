// lixie.js — edge-lit engraved-acrylic "Lixie Tube" renderer for the "lixie" skin.
//
// Ported from dexipurei-galore displays/lixie.js. Per digit position there are
// EXACTLY 10 stacked transparent panels, each etched with one numeral 0-9 and
// lit edge-on. The active numeral's etched lines scatter the edge-LED light so
// the glyph appears to float in the stack; the other nine are faint
// always-visible ghosts. Deeper panels are pushed back/down (Z/parallax).
// Wear (dust + scratches + uneven LED brightness + chromatic edge) is seeded
// by rng.hash, so the look is stable per seed across renders.
//
// Differences from the standalone:
//   - Per-PANEL: each player's number is drawn at its `.life` bbox, rotated to
//     the seat, glowing in that player's `--player-fg`.
//   - STATIC / render-on-change: the source render() never reads `t` (all
//     variance is seeded), so there is no animation loop. We redraw once on
//     start / lifechange / resize / config change. Far lighter than a 60fps
//     full-canvas bloom blur.
//   - The dark background is owned by CSS ([data-skin="lixie"]); the canvas is
//     transparent and only paints the glowing numerals + the full-frame
//     vignette / dust / scratches atmosphere.
//
// Wired via main.js — start/stop when body[data-skin] becomes / leaves "lixie".

// ---------------------------------------------------------------------------
// Inlined core helpers (from dexipurei-galore core/*). Self-contained, no deps.
// ---------------------------------------------------------------------------

function mulberry32(a) {
  a = a >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable per-element hash → [0,1). Same (x, y, seed) always yields the same
// value, so wear stays pinned across renders.
function hash(x, y, seed = 0) {
  let n = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function makeRng(seed) {
  const s = (seed >>> 0) || 0;
  return { seed: s, rand: mulberry32(s), hash: (x, y) => hash(x, y, s) };
}

function hex2rgb(h) {
  h = String(h).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// linear sRGB interpolation. t in [0,1].
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// bloom — render a bright pass to an offscreen canvas, blur it, composite
// additively. drawFn(g) paints in the SAME transform as ctx.
let _fxScratch = null;
function fxScratchCanvas(w, h) {
  if (!_fxScratch) _fxScratch = document.createElement("canvas");
  if (_fxScratch.width !== w || _fxScratch.height !== h) {
    _fxScratch.width = w;
    _fxScratch.height = h;
  }
  return _fxScratch;
}
function bloom(ctx, drawFn, blur, intensity) {
  if (intensity <= 0 || blur <= 0) return;
  const cv = ctx.canvas;
  const off = fxScratchCanvas(cv.width, cv.height);
  const g = off.getContext("2d");
  // Clear the FULL backing store under identity first — bloom() runs inside a
  // rotated/translated per-panel transform here, so clearing in that transform
  // would miss most of the buffer and leave stale glow from prior panels /
  // frames to recomposite (the "previous states stay on" bug). Clear flat,
  // then adopt ctx's transform so drawFn paints in matching coords.
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(ctx.getTransform());
  drawFn(g);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = intensity;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
  ctx.filter = "none";
}

function vignette(ctx, w, h, amount) {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${amount * 0.85})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// scatter faint dust specks across the frame (light + dark flecks)
function dust(ctx, rng, density, w, h) {
  if (density <= 0) return;
  const n = Math.floor((density * (w * h)) / 1400);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rng.hash(i + 1, 7) * w;
    const y = rng.hash(i + 3, 11) * h;
    const r = 0.4 + rng.hash(i + 5, 13) * 1.4;
    const light = rng.hash(i, 9) > 0.5;
    ctx.fillStyle = `rgba(${light ? "255,255,255" : "0,0,0"},${0.04 + rng.hash(i + 2, 4) * 0.06})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// thin hairline scratches
function scratches(ctx, rng, count, w, h) {
  if (count <= 0) return;
  ctx.save();
  ctx.lineWidth = 0.6;
  for (let i = 0; i < count; i++) {
    const x = rng.hash(i + 1, 21) * w;
    const y = rng.hash(i + 2, 23) * h;
    const a = rng.hash(i + 3, 25) * Math.PI;
    const len = 8 + rng.hash(i + 4, 27) * 40;
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + rng.hash(i + 5, 29) * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Lixie config + module state.
// ---------------------------------------------------------------------------

// Etch glyph font — JetBrains Mono is self-hosted (see @font-face in skins.css)
// so the etched lines read like the tuned reference, offline.
const ETCH_FONT = '"JetBrains Mono", ui-monospace, monospace';

// Physical panel stacking order (front-to-back) — NOT numeric, so neighbouring
// digits don't line up and the layered overlap stays believable.
const PANEL_ORDER = [4, 7, 1, 9, 2, 6, 0, 8, 3, 5];
const LAYERS = 10; // EXACTLY ten panels per digit — the whole point of a Lixie.
const SEED = 1;

// Defaults locked from lixie-params.json. color/bg are NOT here: color is the
// per-panel --player-fg, bg is owned by CSS.
const DEFAULTS = {
  glow: 5,
  bloomInt: 45,
  coreWhite: 34,
  etchW: 14,
  offset: 25,
  ghost: 100,
  edgeBleed: 0,
  ledVary: 35,
  chroma: 60,
  dust: 55,
  scratch: 34,
  vignette: 60,
};

const STATE = {
  canvas: null,
  ctx: null,
  panels: [],     // [{ playerId, bbox, rotation, color, value }]
  enabled: false,
  needsDraw: false,
  rafPending: false,
};

export const SLIDERS = [
  { key: "glow", label: "Glow radius", min: 0, max: 50, step: 1, default: 5 },
  { key: "bloomInt", label: "Bloom", min: 0, max: 100, step: 1, default: 45 },
  { key: "coreWhite", label: "Hot core", min: 0, max: 100, step: 1, default: 34 },
  { key: "etchW", label: "Etch width", min: 4, max: 26, step: 1, default: 14 },
  { key: "offset", label: "Layer offset", min: 0, max: 100, step: 1, default: 25 },
  { key: "ghost", label: "Ghost panels", min: 0, max: 100, step: 1, default: 100 },
  { key: "edgeBleed", label: "Edge bleed", min: 0, max: 100, step: 1, default: 0 },
  { key: "ledVary", label: "LED variance", min: 0, max: 100, step: 1, default: 35 },
  { key: "chroma", label: "Chromatic", min: 0, max: 100, step: 1, default: 60 },
  { key: "dust", label: "Dust", min: 0, max: 100, step: 1, default: 55 },
  { key: "scratch", label: "Scratches", min: 0, max: 40, step: 1, default: 34 },
  { key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, default: 60 },
];

export function updateConfig(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULTS) DEFAULTS[k] = v;
  }
  requestDraw();
}

// Static renderer: report 0 (no animation loop) for the dev-sliders FPS read.
export function getFps() {
  return 0;
}

export function startLixie() {
  if (STATE.enabled) return;
  STATE.enabled = true;
  if (!STATE.canvas) {
    const c = document.createElement("canvas");
    c.id = "lixie-canvas";
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:4;";
    document.body.appendChild(c);
    STATE.canvas = c;
    STATE.ctx = c.getContext("2d");
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  document.addEventListener("lifechange", refreshOnChange);
  document.addEventListener("life-preview", refreshOnChange);
  requestAnimationFrame(() => {
    refreshPanels();
  });
}

export function stopLixie() {
  STATE.enabled = false;
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("orientationchange", resizeCanvas);
  document.removeEventListener("lifechange", refreshOnChange);
  document.removeEventListener("life-preview", refreshOnChange);
  if (STATE.canvas) {
    STATE.canvas.remove();
    STATE.canvas = null;
    STATE.ctx = null;
  }
  STATE.panels = [];
}

export function refreshPanels() {
  if (!STATE.enabled || !STATE.ctx) return;
  STATE.panels = [];
  document.querySelectorAll(".panel .life").forEach((life) => {
    const panel = life.closest(".panel");
    if (!panel) return;
    const playerId = parseInt(panel.dataset.playerId, 10);
    if (Number.isNaN(playerId)) return;
    const bbox = life.getBoundingClientRect();
    if (bbox.width < 8 || bbox.height < 8) return;
    const rotationDeg = parseFloat(panel.dataset.seatRotation || "0");
    const rotation = (rotationDeg * Math.PI) / 180;
    const color = getComputedStyle(panel).getPropertyValue("--player-fg").trim() || "#36d6ff";
    const value = (life.textContent || "").trim();
    STATE.panels.push({ playerId, bbox, rotation, color, value });
  });
  requestDraw();
}

function refreshOnChange(ev) {
  const { playerId, newValue } = ev.detail || {};
  if (playerId == null) return;
  const panel = STATE.panels.find((p) => p.playerId === playerId);
  if (!panel) return;
  const lifeEl = document.querySelector(`.panel[data-player-id="${playerId}"] .life`);
  if (!lifeEl) return;
  panel.bbox = lifeEl.getBoundingClientRect();
  panel.value = String(newValue);
  requestDraw();
}

function resizeCanvas() {
  if (!STATE.canvas || !STATE.ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  STATE.canvas.width = Math.floor(window.innerWidth * dpr);
  STATE.canvas.height = Math.floor(window.innerHeight * dpr);
  STATE.canvas._dpr = dpr;
  STATE.canvas.style.width = window.innerWidth + "px";
  STATE.canvas.style.height = window.innerHeight + "px";
  STATE.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (STATE.enabled) requestAnimationFrame(() => refreshPanels());
}

// Coalesce redraws into the next frame (render-on-change, not a loop).
function requestDraw() {
  if (!STATE.enabled || STATE.rafPending) return;
  STATE.rafPending = true;
  requestAnimationFrame(() => {
    STATE.rafPending = false;
    draw();
  });
}

// ---------------------------------------------------------------------------
// Drawing.
// ---------------------------------------------------------------------------

const isDigit = (ch) => ch >= "0" && ch <= "9";

// Draw one player's number, centered at (0,0) in the already-rotated frame.
// Cells are laid out left→right; the whole run is centered horizontally.
function drawNumber(ctx, str, cellW, cellH, glowC, edgeC, rng) {
  const p = DEFAULTS;
  const n = str.length;
  const gapFrac = 0.3;
  const gp = cellW * gapFrac;
  const totalW = cellW * n + gp * (n - 1);
  const fontPx = cellH * 0.74;

  const push = (p.offset / 100) * fontPx * 0.085;     // parallax push per layer
  const ghostA = p.ghost / 100;
  const ledV = p.ledVary / 100;
  const chroma = (p.chroma / 100) * fontPx * 0.012;
  const etchPx = Math.max(1, fontPx * (p.etchW / 1000));
  const coreC = mix(glowC, [255, 255, 255], p.coreWhite / 100);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const etch = (g, ch, gx, gy, stroke, fill, lw) => {
    g.font = `${fontPx}px ${ETCH_FONT}`;
    g.lineWidth = lw;
    g.lineJoin = "round";
    if (fill) { g.fillStyle = fill; g.fillText(ch, gx, gy); }
    if (stroke) { g.strokeStyle = stroke; g.strokeText(ch, gx, gy); }
  };

  const startX = -totalW / 2;
  const lit = []; // active glyphs for one additive bloom pass at the end

  for (let i = 0; i < n; i++) {
    const ch = str[i];
    const cx = startX + cellW * (i + 0.5) + gp * i;
    const y = 0;

    // per-cell edge-LED brightness is uneven (stable per seed)
    const ledB = Math.max(0.4, 1 - ledV * rng.hash(i + 5, 71));

    // 1) edge-LED colour bleed along the panel border (off by default; edgeBleed=0)
    if (p.edgeBleed > 0) {
      const bw = cellW * 0.5, bh = cellH * 0.5, bx = cx, by = y;
      const eb = (p.edgeBleed / 100) * ledB;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const side of [-1, 1]) {
        const gy = by + side * bh;
        const grd = ctx.createLinearGradient(bx, gy, bx, by);
        grd.addColorStop(0, rgba(edgeC, 0.5 * eb));
        grd.addColorStop(1, rgba(edgeC, 0));
        ctx.fillStyle = grd;
        ctx.fillRect(bx - bw, Math.min(gy, by), bw * 2, bh);
      }
      ctx.restore();
    }

    // 2) ghost stack — ALL ten etched numerals, faint & always visible, with
    //    Z/parallax. Only for digit cells; a "−" etc. skips the stack so it
    //    doesn't sit over ten ghost numerals.
    if (ghostA > 0 && isDigit(ch)) {
      for (let s = 0; s < LAYERS; s++) {
        const gnum = PANEL_ORDER[s];
        if (String(gnum) === ch) continue;            // active panel drawn bright below
        const z = s / (LAYERS - 1);                    // 0 = closest, 1 = deepest
        const dz = push * s;
        const a = ghostA * (0.05 + 0.13 * (1 - z)) * ledB;
        const gx = cx + dz * 0.5, gy = y + dz;
        etch(ctx, String(gnum), gx, gy, rgba(mix([4, 8, 12], glowC, 0.55), a), rgba(mix([4, 8, 12], glowC, 0.32), a * 0.4), etchPx * 0.7);
      }
    }

    // 3) active numeral: bright edge-lit etch, glow halo + hot core
    const bright = ledB;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (chroma > 0) {
      etch(ctx, ch, cx - chroma, y, rgba([255, 40, 40], 0.28 * bright), null, etchPx);
      etch(ctx, ch, cx + chroma, y, rgba([40, 80, 255], 0.28 * bright), null, etchPx);
    }
    ctx.shadowColor = rgba(glowC, 1);
    ctx.shadowBlur = p.glow;
    etch(ctx, ch, cx, y, rgba(glowC, 0.55 * bright), rgba(glowC, 0.12 * bright), etchPx);
    ctx.shadowBlur = p.glow * 0.4;
    etch(ctx, ch, cx, y, rgba(glowC, 0.9 * bright), null, etchPx * 0.85);
    if (p.coreWhite > 0) {
      ctx.shadowBlur = 0;
      etch(ctx, ch, cx, y, rgba(coreC, 0.7 * bright), null, etchPx * 0.45);
    }
    ctx.restore();
    ctx.shadowBlur = 0;

    lit.push({ ch, x: cx, y, bright });
  }

  // 4) one soft additive bloom over all lit numerals (light scattering out of
  //    the acrylic faces). Runs in the current (rotated) transform.
  bloom(ctx, (g) => {
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.font = `${fontPx}px ${ETCH_FONT}`;
    for (const L of lit) {
      g.strokeStyle = rgba(glowC, 0.9 * L.bright);
      g.lineWidth = etchPx;
      g.strokeText(L.ch, L.x, L.y);
    }
  }, p.glow * 0.85, p.bloomInt / 100);
}

function draw() {
  if (!STATE.enabled || !STATE.ctx) return;
  const ctx = STATE.ctx;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const rng = makeRng(SEED);

  // Full clear under identity (independent of any leftover transform), then
  // re-establish the dpr transform for logical-coordinate drawing.
  const dpr = STATE.canvas._dpr || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, STATE.canvas.width, STATE.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (const p of STATE.panels) {
    if (!p.value) continue;
    const cx = p.bbox.left + p.bbox.width / 2;
    const cy = p.bbox.top + p.bbox.height / 2;

    // Acrylic block aspect ~ 0.66 wide : 1 tall. Fit the number run inside the
    // bbox: pick a cell height, derive width, scale down if the run overflows.
    const str = p.value;
    const n = str.length;
    const gapFrac = 0.3;
    const aspect = 0.66;
    let cellH = p.bbox.height;
    let cellW = cellH * aspect;
    const runW = (k) => cellW * k + cellW * gapFrac * (k - 1);
    if (runW(n) > p.bbox.width) {
      const s = p.bbox.width / runW(n);
      cellW *= s;
      cellH *= s;
    }

    const glowC = hex2rgb(p.color);
    // edge-LED hue derived from the player colour (only visible if edgeBleed>0).
    const edgeC = mix(glowC, [26, 140, 255], 0.5);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotation);
    drawNumber(ctx, str, cellW, cellH, glowC, edgeC, rng);
    ctx.restore();
  }

  // 5) full-frame atmosphere: dust + hairline scratches + vignette over the
  //    whole tube (deterministic per seed).
  dust(ctx, rng, DEFAULTS.dust / 25, W, H);
  scratches(ctx, rng, DEFAULTS.scratch, W, H);
  vignette(ctx, W, H, DEFAULTS.vignette / 100);
}

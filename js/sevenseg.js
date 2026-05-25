// sevenseg.js — retro 7-segment CRT renderer for the "seven-seg" skin.
//
// Each digit drawn as up to 7 thick rounded-cap segments in the standard
// a-b-c-d-e-f-g layout:
//
//   aaa
//  f   b
//  f   b
//   ggg
//  e   c
//  e   c
//   ddd
//
// Glow / halo via multi-pass shadowBlur + a faint outer bloom rectangle.
// "Off" segments draw very faintly (LCD ghost). Per-segment brightness
// and length jitter are stable (seeded by segment index + digit position),
// not per-frame, so the imperfections look like physical-display character
// rather than visual noise.
//
// Wired via main.js — start/stop when body[data-skin] becomes / leaves
// "seven-seg". Listens for `lifechange` + `life-preview` events from
// input.js to refresh per-panel values.

const SEGMENTS_FOR_DIGIT = {
  0: ["a", "b", "c", "d", "e", "f"],
  1: ["b", "c"],
  2: ["a", "b", "g", "e", "d"],
  3: ["a", "b", "g", "c", "d"],
  4: ["f", "g", "b", "c"],
  5: ["a", "f", "g", "c", "d"],
  6: ["a", "f", "g", "e", "c", "d"],
  7: ["a", "b", "c"],
  8: ["a", "b", "c", "d", "e", "f", "g"],
  9: ["a", "b", "c", "d", "f", "g"],
};
const ALL_SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"];

const DEFAULTS = {
  segmentThickness: 0.14,   // fraction of digit width
  digitAspect: 1.7,         // height / width — taller looks more retro
  digitGap: 0.18,           // gap between digits as fraction of digit width
  digitScale: 0.55,         // scale applied after bbox-fit (smaller = neater)
  glowBlur: 16,             // shadow blur in CSS px for the outer halo
  innerGlowBlur: 4,
  ghostAlpha: 0.06,         // visibility of "off" segments
  jitterAmount: 0.25,       // 0-1, how much per-segment brightness varies
  bloomAlpha: 0.10,         // faint rect bloom drawn behind each segment
};

const STATE = {
  canvas: null,
  ctx: null,
  panels: [],       // [{ playerId, bbox, rotation, color, value }]
  enabled: false,
  rafId: null,
};

export function startSevenSeg() {
  if (STATE.enabled) return;
  STATE.enabled = true;
  if (!STATE.canvas) {
    const c = document.createElement("canvas");
    c.id = "sevenseg-canvas";
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
    if (!STATE.rafId) STATE.rafId = requestAnimationFrame(loop);
  });
}

export function stopSevenSeg() {
  STATE.enabled = false;
  if (STATE.rafId) cancelAnimationFrame(STATE.rafId);
  STATE.rafId = null;
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
    const color = getComputedStyle(panel).getPropertyValue("--player-fg").trim() || "#ff2030";
    const value = (life.textContent || "").trim();
    STATE.panels.push({ playerId, bbox, rotation, color, value });
  });
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
}

function resizeCanvas() {
  if (!STATE.canvas || !STATE.ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  STATE.canvas.width = Math.floor(window.innerWidth * dpr);
  STATE.canvas.height = Math.floor(window.innerHeight * dpr);
  STATE.canvas.style.width = window.innerWidth + "px";
  STATE.canvas.style.height = window.innerHeight + "px";
  STATE.ctx.setTransform(1, 0, 0, 1, 0, 0);
  STATE.ctx.scale(dpr, dpr);
  if (STATE.enabled) requestAnimationFrame(() => refreshPanels());
}

// Stable 0..1 hash by integer key (used for per-segment jitter).
function hash(k) {
  let h = (k | 0) * 2654435761;
  h ^= h >>> 16;
  h = (h * 2246822507) | 0;
  h ^= h >>> 13;
  h = (h * 3266489909) | 0;
  return ((h >>> 0) & 0xfff) / 0xfff;
}

// Compute segment endpoints in local digit coords (origin = top-left of
// the digit cell, x → right, y → down).
function segmentEndpoints(seg, w, h, t) {
  const halfT = t / 2;
  const halfH = h / 2;
  switch (seg) {
    case "a": return [t, halfT, w - t, halfT];
    case "b": return [w - halfT, t, w - halfT, halfH - halfT];
    case "c": return [w - halfT, halfH + halfT, w - halfT, h - t];
    case "d": return [t, h - halfT, w - t, h - halfT];
    case "e": return [halfT, halfH + halfT, halfT, h - t];
    case "f": return [halfT, t, halfT, halfH - halfT];
    case "g": return [t, halfH, w - t, halfH];
  }
  return [0, 0, 0, 0];
}

function drawSegment(ctx, x1, y1, x2, y2, thickness, color, brightness, isOn) {
  if (!isOn) {
    // Ghost — barely visible, no glow.
    ctx.shadowBlur = 0;
    ctx.globalAlpha = DEFAULTS.ghostAlpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness * 0.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.strokeStyle = color;

  // Outer halo — broad, low alpha.
  ctx.globalAlpha = 0.55 * brightness;
  ctx.shadowBlur = DEFAULTS.glowBlur;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner glow — tighter, brighter.
  ctx.globalAlpha = 0.85 * brightness;
  ctx.shadowBlur = DEFAULTS.innerGlowBlur;
  ctx.stroke();

  // Crisp core — no shadow.
  ctx.globalAlpha = Math.min(1, 1.0 * brightness);
  ctx.shadowBlur = 0;
  ctx.lineWidth = thickness * 0.65;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawDigit(ctx, digitChar, x, y, w, h, color, panelSeed) {
  const t = w * DEFAULTS.segmentThickness;
  const digit = parseInt(digitChar, 10);
  const onSet = new Set(Number.isFinite(digit) ? SEGMENTS_FOR_DIGIT[digit] || [] : []);

  ctx.save();
  ctx.translate(x, y);

  for (let i = 0; i < ALL_SEGMENTS.length; i++) {
    const seg = ALL_SEGMENTS[i];
    const [x1, y1, x2, y2] = segmentEndpoints(seg, w, h, t);
    const isOn = onSet.has(seg);
    // Stable per-segment brightness jitter.
    const jitter = hash(panelSeed * 7 + i);
    const brightness = 1 - DEFAULTS.jitterAmount * jitter;
    drawSegment(ctx, x1, y1, x2, y2, t, color, brightness, isOn);
  }

  ctx.restore();
}

function loop() {
  if (!STATE.enabled) return;
  STATE.rafId = requestAnimationFrame(loop);
  const ctx = STATE.ctx;
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let i = 0; i < STATE.panels.length; i++) {
    const p = STATE.panels[i];
    if (!p.value) continue;

    const cx = p.bbox.left + p.bbox.width / 2;
    const cy = p.bbox.top + p.bbox.height / 2;

    // Digit sizing: fit inside the bbox.
    const text = p.value;
    const n = text.length;
    const gapFactor = DEFAULTS.digitGap;
    // bbox.width = n*digitWidth + (n-1)*gapFactor*digitWidth = digitWidth * (n + (n-1)*gapFactor)
    let digitWidth = p.bbox.width / (n + Math.max(0, n - 1) * gapFactor);
    let digitHeight = digitWidth * DEFAULTS.digitAspect;
    // If the computed height blows past the bbox, scale back to fit.
    if (digitHeight > p.bbox.height) {
      digitHeight = p.bbox.height;
      digitWidth = digitHeight / DEFAULTS.digitAspect;
    }
    // Apply the global digitScale so the digits sit smaller inside the
    // available bbox — leaves room for the bloom/halo without dominating.
    digitWidth *= DEFAULTS.digitScale;
    digitHeight *= DEFAULTS.digitScale;
    const gapPx = digitWidth * gapFactor;
    const totalWidth = n * digitWidth + (n - 1) * gapPx;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotation);
    let drawX = -totalWidth / 2;
    const drawY = -digitHeight / 2;
    for (let j = 0; j < n; j++) {
      // Seed combines playerId + digit position so per-segment jitter is
      // stable per player AND per digit slot.
      const seed = p.playerId * 1009 + j * 17;
      drawDigit(ctx, text[j], drawX, drawY, digitWidth, digitHeight, p.color, seed);
      drawX += digitWidth + gapPx;
    }
    ctx.restore();
  }
}

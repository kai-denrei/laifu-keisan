// particles.js — Canvas 2D particle renderer for the experimental "particles" skin.
//
// MAINLINE CONSTRAINT BREAK: the original spec banned Canvas. This is the
// first place where the experimental track opts out — DOM-only particle
// glyph rendering is not viable at iPhone framerates. Canvas 2D only (no WebGL),
// no runtime deps, single full-viewport canvas.
//
// Pipeline:
//   1. For each .panel .life, rasterize its current value into an offscreen
//      canvas (upright), sample N "on" pixels.
//   2. Rotate sample positions by the panel's seat-rotation; translate by the
//      .life bbox centre — gives screen-space targets that match the rotated
//      digit position.
//   3. Each particle drifts + seeks its target with small per-frame jitter.
//   4. On a "lifechange" CustomEvent, particles in that panel burst (radial
//      velocity), briefly flash to accent-pos/accent-neg, then re-seek the
//      new value's targets.
//
// Tunable via a config object; updateConfig() merges in slider changes.

// Defaults per Gerald 2026-05-23: 300, 1, 0.2, 0.6, 110, 80, 740, 0.8.
// flashDuration is now a "post-burst glow" — same player colour, brighter
// alpha pulse — NOT a hue switch. Earlier defaults flashed green/red on
// burst which read as the digit changing colour; player colour now stays
// stable through the whole sequence.
const DEFAULTS = {
  particlesPerDigit: 300,
  particleSize: 1,
  driftAmp: 0.2,
  seekStrength: 0.6,
  burstVelocity: 110,
  burstLifetime: 80,     // fast explosion
  flashDuration: 740,    // post-burst glow length (same-colour, alpha pulse)
  burstFriction: 0.8,
};

const STATE = {
  canvas: null,
  ctx: null,
  panels: [],     // [{ playerId, bbox, rotation, color, value, targets }]
  particles: [],
  enabled: false,
  rafId: null,
  config: { ...DEFAULTS },
  // FPS sample for the dev-sliders panel.
  fps: 0,
  _frameCount: 0,
  _frameWindowStart: 0,
};

export function startParticles() {
  if (STATE.enabled) return;
  STATE.enabled = true;

  if (!STATE.canvas) {
    const c = document.createElement("canvas");
    c.id = "particles-canvas";
    c.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:4;";
    document.body.appendChild(c);
    STATE.canvas = c;
    STATE.ctx = c.getContext("2d");
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  document.addEventListener("lifechange", onLifeChange);
  document.addEventListener("life-preview", onLifePreview);

  // Defer the first sample one frame so the freshly-rendered DOM has bbox.
  requestAnimationFrame(() => {
    refreshPanels();
    if (!STATE.rafId) {
      STATE._frameWindowStart = performance.now();
      STATE.rafId = requestAnimationFrame(loop);
    }
  });
}

export function stopParticles() {
  STATE.enabled = false;
  if (STATE.rafId) cancelAnimationFrame(STATE.rafId);
  STATE.rafId = null;
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("orientationchange", resizeCanvas);
  document.removeEventListener("lifechange", onLifeChange);
  document.removeEventListener("life-preview", onLifePreview);
  if (STATE.canvas) {
    STATE.canvas.remove();
    STATE.canvas = null;
    STATE.ctx = null;
  }
  STATE.panels = [];
  STATE.particles = [];
}

export function updateConfig(patch) {
  Object.assign(STATE.config, patch);
  // Re-sample with the new density.
  if (STATE.enabled) refreshPanels();
}

export function refreshPanels() {
  if (!STATE.enabled || !STATE.ctx) return;
  STATE.panels = [];
  STATE.particles = [];

  const lifeEls = document.querySelectorAll(".panel .life");
  lifeEls.forEach((life) => {
    const panel = life.closest(".panel");
    if (!panel) return;
    const playerId = parseInt(panel.dataset.playerId, 10);
    if (Number.isNaN(playerId)) return;

    const value = (life.textContent || "").trim();
    if (!value) return;

    const bbox = life.getBoundingClientRect();
    if (bbox.width < 8 || bbox.height < 8) return;

    // seat-rotation lives on the .panel SECTION (set in render.js makePanel),
    // not on .panel-inner. Reading the wrong element silently gave 0 rotation
    // for every seat — particles rendered upright in screen-space regardless
    // of player orientation. Fixed: read from panel.
    const rotationDeg = parseFloat(panel.dataset.seatRotation || "0");
    const rotation = (rotationDeg * Math.PI) / 180;

    const cs = getComputedStyle(life);
    const playerColor = readPlayerColor(panel);

    const targets = sampleDigitTargets(value, bbox, rotation, cs);

    STATE.panels.push({ playerId, bbox, rotation, color: playerColor, value, targets, cs });

    // Seed particles: start at random positions around the panel anchor,
    // each assigned to a target.
    const cx = bbox.left + bbox.width / 2;
    const cy = bbox.top + bbox.height / 2;
    targets.forEach((t) => {
      STATE.particles.push({
        playerId,
        digitIndex: t.digitIndex,
        x: cx + (Math.random() - 0.5) * bbox.width,
        y: cy + (Math.random() - 0.5) * bbox.height,
        tx: t.x,
        ty: t.y,
        vx: 0,
        vy: 0,
        burstUntil: 0,
        flashUntil: 0,
        flashColor: null,
      });
    });
  });
}

function readPlayerColor(panelEl) {
  // The CSS var --player-fg is set on each .panel via per-player rules;
  // getComputedStyle resolves it for that element.
  const v = getComputedStyle(panelEl).getPropertyValue("--player-fg").trim();
  return v || "#1bf0c8";
}

function resizeCanvas() {
  if (!STATE.canvas || !STATE.ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for cheap iOS
  STATE.canvas.width = Math.floor(window.innerWidth * dpr);
  STATE.canvas.height = Math.floor(window.innerHeight * dpr);
  STATE.canvas.style.width = window.innerWidth + "px";
  STATE.canvas.style.height = window.innerHeight + "px";
  STATE.ctx.setTransform(1, 0, 0, 1, 0, 0);
  STATE.ctx.scale(dpr, dpr);
  if (STATE.enabled) {
    // bboxes are stale — re-sample.
    requestAnimationFrame(() => refreshPanels());
  }
}

function sampleDigitTargets(text, bbox, rotation, computedStyle) {
  // Render the WHOLE text upright into an offscreen canvas; measure per-char
  // widths so each "on" pixel can be tagged with its digit index. Returns a
  // flat list of { x, y, digitIndex } targets in screen-space (post-rotation).
  // Per-digit tagging lets onLifePreview / onLifeChange burst+retarget only
  // the digits that actually changed (e.g. tens stays still when ones rolls).
  const W = Math.max(64, Math.ceil(bbox.width * 2.0));
  const H = Math.max(64, Math.ceil(bbox.height * 2.0));
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const o = off.getContext("2d");

  o.fillStyle = "#fff";
  o.textAlign = "center";
  o.textBaseline = "middle";
  const fontPx = parseFloat(computedStyle.fontSize) || 64;
  const family = computedStyle.fontFamily || "system-ui, sans-serif";
  const weight = computedStyle.fontWeight || "700";
  o.font = `${weight} ${fontPx}px ${family}`;

  // Per-character widths to partition the rendered text into digit slots.
  const charWidths = [];
  let totalW = 0;
  for (const c of text) {
    const m = o.measureText(c);
    charWidths.push(m.width);
    totalW += m.width;
  }
  o.fillText(text, W / 2, H / 2);

  // x-bounds per digit (in canvas-pixel coords).
  const charBounds = [];
  let cursor = W / 2 - totalW / 2;
  for (let i = 0; i < text.length; i++) {
    charBounds.push({ minX: cursor, maxX: cursor + charWidths[i] });
    cursor += charWidths[i];
  }

  const data = o.getImageData(0, 0, W, H).data;
  const onByDigit = text.split("").map(() => []);
  const stride = 2;
  for (let y = 0; y < H; y += stride) {
    for (let x = 0; x < W; x += stride) {
      const i = (y * W + x) * 4;
      if (data[i + 3] <= 48) continue;
      for (let d = 0; d < charBounds.length; d++) {
        if (x >= charBounds[d].minX && x < charBounds[d].maxX) {
          onByDigit[d].push({ x: x - W / 2, y: y - H / 2 });
          break;
        }
      }
    }
  }

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const N = STATE.config.particlesPerDigit;
  const cx = bbox.left + bbox.width / 2;
  const cy = bbox.top + bbox.height / 2;
  const targets = [];
  onByDigit.forEach((pixels, digitIndex) => {
    if (pixels.length === 0) return;
    for (let i = 0; i < N; i++) {
      const p = pixels[(Math.random() * pixels.length) | 0];
      const rx = p.x * cosR - p.y * sinR;
      const ry = p.x * sinR + p.y * cosR;
      targets.push({ x: cx + rx, y: cy + ry, digitIndex });
    }
  });
  return targets;
}

function onLifePreview(ev) {
  const { playerId, sign, newValue } = ev.detail;
  applyValueChange(playerId, sign, String(newValue));
}

function onLifeChange(ev) {
  const { playerId, delta, newValue } = ev.detail;
  applyValueChange(playerId, Math.sign(delta) || 1, String(newValue));
}

// Single code path for both preview (per-tap) and commit (per-batch). Diffs
// old vs new value per digit position; only digits that actually changed get
// burst + retarget. Unchanged digits (e.g. the tens when ones rolls 20→21)
// keep their existing particles in place — no flicker, no swim.
function applyValueChange(playerId, sign, newStr) {
  const panel = STATE.panels.find((p) => p.playerId === playerId);
  if (!panel) return;
  const oldStr = panel.value;
  if (oldStr === newStr) return; // no-op (commit after the matching preview)

  // Length change → re-init this panel's particles. Alignment shifts, so
  // partial-diff would be wrong.
  if (oldStr.length !== newStr.length) {
    rebuildPanelParticles(playerId, newStr);
    return;
  }

  // Per-digit diff.
  const changedDigits = new Set();
  for (let i = 0; i < newStr.length; i++) {
    if (oldStr[i] !== newStr[i]) changedDigits.add(i);
  }
  if (changedDigits.size === 0) {
    panel.value = newStr;
    return;
  }

  // Re-sample for the new value (cheap — once per change, ≤1ms).
  const lifeEl = document.querySelector(`.panel[data-player-id="${playerId}"] .life`);
  if (!lifeEl) return;
  const newBbox = lifeEl.getBoundingClientRect();
  const newTargets = sampleDigitTargets(newStr, newBbox, panel.rotation, panel.cs);
  const byDigit = new Map();
  for (const t of newTargets) {
    let arr = byDigit.get(t.digitIndex);
    if (!arr) { arr = []; byDigit.set(t.digitIndex, arr); }
    arr.push(t);
  }

  const now = performance.now();
  const cfg = STATE.config;

  // Burst + retarget ONLY the changed-digit particles. The retarget is set
  // simultaneously with the burst — particles fly outward then seek the new
  // position; no setTimeout, no extra delay before re-ordering begins.
  // The flash period uses the player's OWN colour (alpha pulse only), not a
  // green/red hue switch — keeps each player's colour stable.
  const ctr = new Map();
  for (let i = 0; i < STATE.particles.length; i++) {
    const p = STATE.particles[i];
    if (p.playerId !== playerId) continue;
    if (!changedDigits.has(p.digitIndex)) continue;

    const ang = Math.random() * Math.PI * 2;
    const sp = cfg.burstVelocity * (0.4 + Math.random() * 0.9);
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.burstUntil = now + cfg.burstLifetime;
    p.flashUntil = now + cfg.flashDuration;

    const slot = byDigit.get(p.digitIndex);
    if (slot && slot.length) {
      const idx = ctr.get(p.digitIndex) || 0;
      ctr.set(p.digitIndex, idx + 1);
      const t = slot[idx % slot.length];
      p.tx = t.x;
      p.ty = t.y;
    }
  }

  panel.value = newStr;
  panel.bbox = newBbox;
  panel.targets = newTargets;
}

function rebuildPanelParticles(playerId, newStr) {
  STATE.particles = STATE.particles.filter((p) => p.playerId !== playerId);
  const lifeEl = document.querySelector(`.panel[data-player-id="${playerId}"] .life`);
  if (!lifeEl) return;
  const panelEl = lifeEl.closest(".panel");
  const bbox = lifeEl.getBoundingClientRect();
  // seat-rotation is on the .panel section, not .panel-inner.
  const rotationDeg = parseFloat(panelEl.dataset.seatRotation || "0");
  const rotation = (rotationDeg * Math.PI) / 180;
  const cs = getComputedStyle(lifeEl);
  const playerColor = readPlayerColor(panelEl);
  const targets = sampleDigitTargets(newStr, bbox, rotation, cs);

  const idx = STATE.panels.findIndex((p) => p.playerId === playerId);
  const panelData = { playerId, bbox, rotation, color: playerColor, value: newStr, targets, cs };
  if (idx >= 0) STATE.panels[idx] = panelData;
  else STATE.panels.push(panelData);

  const cx = bbox.left + bbox.width / 2;
  const cy = bbox.top + bbox.height / 2;
  for (const t of targets) {
    STATE.particles.push({
      playerId,
      digitIndex: t.digitIndex,
      x: cx + (Math.random() - 0.5) * bbox.width,
      y: cy + (Math.random() - 0.5) * bbox.height,
      tx: t.x,
      ty: t.y,
      vx: 0,
      vy: 0,
      burstUntil: 0,
      flashUntil: 0,
      flashColor: null,
    });
  }
}

function drawBoundaryLines(ctx) {
  const n = STATE.panels.length;
  if (n < 2) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = w / 2;
  const cy = h / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(160, 168, 184, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (n === 2) {
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
  } else if (n === 4) {
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
  } else {
    // Radial: 3 or 5 wedges. Boundary angles (clockwise from south) at the
    // half-angle between adjacent seat rotations.
    for (let i = 0; i < n; i++) {
      const angle = ((i + 0.5) * (360 / n) * Math.PI) / 180;
      const dx = -Math.sin(angle);
      const dy = Math.cos(angle);
      // Smallest positive t to the viewport edge.
      const cand = [];
      if (dx > 1e-6) cand.push((w - cx) / dx);
      else if (dx < -1e-6) cand.push((0 - cx) / dx);
      if (dy > 1e-6) cand.push((h - cy) / dy);
      else if (dy < -1e-6) cand.push((0 - cy) / dy);
      const t = Math.min(...cand.filter((v) => v > 0));
      if (!isFinite(t)) continue;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * t, cy + dy * t);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function loop(now) {
  if (!STATE.enabled) return;
  STATE.rafId = requestAnimationFrame(loop);

  const ctx = STATE.ctx;
  if (!ctx) return;

  const cfg = STATE.config;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // 1px grey player-boundary lines, drawn before particles so particles
  // render over the seams. For 2P: horizontal across centre. For 4P: full
  // cross. For 3P / 5P: radial spokes from centre to each wedge boundary
  // (perimeter intersection at angle = (i + 0.5) * 360 / N from south).
  drawBoundaryLines(ctx);

  const size = cfg.particleSize;
  const half = size / 2;

  // FPS sample (rolling 500ms).
  STATE._frameCount++;
  const winLen = now - STATE._frameWindowStart;
  if (winLen >= 500) {
    STATE.fps = Math.round((STATE._frameCount * 1000) / winLen);
    STATE._frameCount = 0;
    STATE._frameWindowStart = now;
  }

  // Map playerId → color (cached per panel).
  const colorByPlayer = new Map();
  for (const panel of STATE.panels) colorByPlayer.set(panel.playerId, panel.color);

  for (let i = 0; i < STATE.particles.length; i++) {
    const p = STATE.particles[i];
    const baseColor = colorByPlayer.get(p.playerId) || "#fff";

    if (now < p.burstUntil) {
      // Bursting — drift on velocity, friction down.
      p.x += p.vx * (1 / 60);
      p.y += p.vy * (1 / 60);
      p.vx *= cfg.burstFriction;
      p.vy *= cfg.burstFriction;
    } else {
      // Seeking target + tiny jitter.
      p.x += (p.tx - p.x) * cfg.seekStrength + (Math.random() - 0.5) * cfg.driftAmp;
      p.y += (p.ty - p.y) * cfg.seekStrength + (Math.random() - 0.5) * cfg.driftAmp;
    }

    // Same-colour glow during flash window: drop a slightly larger,
    // half-alpha rect behind the main particle. Player colour preserved.
    ctx.fillStyle = baseColor;
    if (now < p.flashUntil) {
      const g = size + 2;
      const hg = g / 2;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(p.x - hg, p.y - hg, g, g);
      ctx.globalAlpha = 1;
    }
    ctx.fillRect(p.x - half, p.y - half, size, size);
  }
}

export function getFps() {
  return STATE.fps;
}

export const SLIDERS = [
  { key: "particlesPerDigit", label: "Particles / digit", min: 5, max: 500, step: 5, default: 300 },
  { key: "particleSize", label: "Particle size (px)", min: 1, max: 8, step: 1, default: 1 },
  { key: "driftAmp", label: "Drift amplitude", min: 0, max: 3, step: 0.1, default: 0.2 },
  { key: "seekStrength", label: "Seek strength", min: 0.02, max: 0.8, step: 0.02, default: 0.6 },
  { key: "burstVelocity", label: "Burst velocity", min: 20, max: 400, step: 10, default: 110 },
  { key: "burstLifetime", label: "Burst lifetime (ms)", min: 40, max: 1500, step: 20, default: 80 },
  { key: "flashDuration", label: "Glow duration (ms)", min: 40, max: 1500, step: 20, default: 740 },
  { key: "burstFriction", label: "Burst friction", min: 0.70, max: 0.99, step: 0.01, default: 0.8 },
];

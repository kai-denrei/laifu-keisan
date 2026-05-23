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

const DEFAULTS = {
  particlesPerDigit: 35,
  particleSize: 2,
  driftAmp: 0.6,
  seekStrength: 0.08,
  burstCount: 20,        // currently unused — burst applies to ALL existing particles in the panel
  burstVelocity: 140,
  burstLifetime: 600,
  flashDuration: 220,
  burstFriction: 0.93,
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

    const inner = panel.querySelector(".panel-inner");
    const rotationDeg = parseFloat(inner?.dataset.seatRotation || "0");
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
  // Render text UPRIGHT into an offscreen canvas at the same intrinsic font
  // metrics as the .life element. Sample alpha-passing pixels, then rotate
  // the sample positions by the panel's seat-rotation when assigning targets.
  // Working in the rotated frame at sample-time keeps the sampling resolution
  // even (no axis-aligned bias).
  const W = Math.max(48, Math.ceil(bbox.width * 1.4));
  const H = Math.max(48, Math.ceil(bbox.height * 1.4));
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const o = off.getContext("2d");

  o.fillStyle = "#fff";
  o.textAlign = "center";
  o.textBaseline = "middle";
  // Best-effort font reconstruction — getComputedStyle returns shorthand on
  // most browsers, but compose explicitly to handle the cases where it doesn't.
  const fontPx = parseFloat(computedStyle.fontSize) || 64;
  const family = computedStyle.fontFamily || "system-ui, sans-serif";
  const weight = computedStyle.fontWeight || "700";
  o.font = `${weight} ${fontPx}px ${family}`;
  o.fillText(text, W / 2, H / 2);

  const data = o.getImageData(0, 0, W, H).data;
  const onPixels = [];
  const stride = 2;
  for (let y = 0; y < H; y += stride) {
    for (let x = 0; x < W; x += stride) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 48) onPixels.push({ x: x - W / 2, y: y - H / 2 });
    }
  }

  if (onPixels.length === 0) return [];

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const N = Math.min(STATE.config.particlesPerDigit * text.length, onPixels.length);
  const cx = bbox.left + bbox.width / 2;
  const cy = bbox.top + bbox.height / 2;
  const targets = new Array(N);
  for (let i = 0; i < N; i++) {
    const p = onPixels[(Math.random() * onPixels.length) | 0];
    const rx = p.x * cosR - p.y * sinR;
    const ry = p.x * sinR + p.y * cosR;
    targets[i] = { x: cx + rx, y: cy + ry };
  }
  return targets;
}

function onLifeChange(ev) {
  const { playerId, delta, newValue } = ev.detail;
  const now = performance.now();
  const cfg = STATE.config;

  const root = getComputedStyle(document.documentElement);
  const flashColor =
    (delta > 0
      ? root.getPropertyValue("--accent-pos").trim()
      : root.getPropertyValue("--accent-neg").trim()) || (delta > 0 ? "#39ff14" : "#ff1744");

  // Burst on all existing particles for this player. The current particles
  // become the "explosion" — no separate burst-only particle pool.
  for (let i = 0; i < STATE.particles.length; i++) {
    const p = STATE.particles[i];
    if (p.playerId !== playerId) continue;
    const ang = Math.random() * Math.PI * 2;
    const sp = cfg.burstVelocity * (0.4 + Math.random() * 0.9);
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.burstUntil = now + cfg.burstLifetime;
    p.flashUntil = now + cfg.flashDuration;
    p.flashColor = flashColor;
  }

  // After the burst window, re-sample targets for the new value and re-seek.
  setTimeout(() => {
    const panel = STATE.panels.find((pp) => pp.playerId === playerId);
    if (!panel) return;
    const lifeEl = document.querySelector(`.panel[data-player-id="${playerId}"] .life`);
    if (!lifeEl) return;
    const newBbox = lifeEl.getBoundingClientRect();
    const newValueStr = (lifeEl.textContent || "").trim() || String(newValue);
    const newTargets = sampleDigitTargets(newValueStr, newBbox, panel.rotation, panel.cs);
    panel.bbox = newBbox;
    panel.value = newValueStr;
    panel.targets = newTargets;

    let ti = 0;
    for (let i = 0; i < STATE.particles.length; i++) {
      const p = STATE.particles[i];
      if (p.playerId !== playerId) continue;
      const t = newTargets[ti % newTargets.length];
      if (t) { p.tx = t.x; p.ty = t.y; }
      ti++;
    }
  }, cfg.burstLifetime);
}

function loop(now) {
  if (!STATE.enabled) return;
  STATE.rafId = requestAnimationFrame(loop);

  const ctx = STATE.ctx;
  if (!ctx) return;

  const cfg = STATE.config;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

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

    ctx.fillStyle = now < p.flashUntil ? p.flashColor : baseColor;
    ctx.fillRect(p.x - half, p.y - half, size, size);
  }
}

export function getFps() {
  return STATE.fps;
}

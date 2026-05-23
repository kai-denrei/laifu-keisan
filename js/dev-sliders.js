// dev-sliders.js — runtime tuning UI for the experimental particles skin.
// Mounts a fixed-position panel top-right with range inputs + live FPS read.
// On every change calls back with (key, value) so particles.js can re-config
// and (where relevant) re-sample its particle targets.

const SLIDERS = [
  { key: "particlesPerDigit", label: "Particles / digit", min: 5, max: 500, step: 5, default: 300 },
  { key: "particleSize", label: "Particle size (px)", min: 1, max: 8, step: 1, default: 1 },
  { key: "driftAmp", label: "Drift amplitude", min: 0, max: 3, step: 0.1, default: 0.2 },
  { key: "seekStrength", label: "Seek strength", min: 0.02, max: 0.8, step: 0.02, default: 0.6 },
  { key: "burstVelocity", label: "Burst velocity", min: 20, max: 400, step: 10, default: 110 },
  { key: "burstLifetime", label: "Burst lifetime (ms)", min: 40, max: 1500, step: 20, default: 80 },
  { key: "flashDuration", label: "Glow duration (ms)", min: 40, max: 1500, step: 20, default: 740 },
  { key: "burstFriction", label: "Burst friction", min: 0.70, max: 0.99, step: 0.01, default: 0.8 },
];

export function mountDevSliders(onChange, getFps) {
  if (document.getElementById("dev-sliders")) return;

  const root = document.createElement("div");
  root.id = "dev-sliders";
  root.dataset.collapsed = "1";
  root.innerHTML = `
    <header>
      <span>Ryūshi · dev</span>
      <button type="button" data-action="dev-sliders-toggle" aria-label="Expand">+</button>
    </header>
    <div class="dev-sliders-body" style="display:none">

      ${SLIDERS.map(s => `
        <div class="dev-slider-row">
          <label>
            <span>${s.label}</span>
            <span class="dev-slider-value" data-key="${s.key}">${s.default}</span>
          </label>
          <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.default}">
        </div>
      `).join("")}
      <div class="dev-slider-row dev-slider-fps">
        FPS: <span id="dev-fps">--</span>
        <span class="dev-particle-count" id="dev-particle-count"></span>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  root.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener("input", () => {
      const k = input.dataset.key;
      const raw = input.value;
      const v = (k === "particlesPerDigit" || k === "particleSize") ? parseInt(raw, 10) : parseFloat(raw);
      root.querySelector(`.dev-slider-value[data-key="${k}"]`).textContent = v;
      onChange(k, v);
    });
  });

  root.querySelector('[data-action="dev-sliders-toggle"]').addEventListener("click", e => {
    const body = root.querySelector(".dev-sliders-body");
    const open = body.style.display !== "none";
    body.style.display = open ? "none" : "";
    e.currentTarget.textContent = open ? "+" : "−";
    root.dataset.collapsed = open ? "1" : "0";
  });

  // Live FPS read.
  if (getFps) {
    let lastFps = -1;
    setInterval(() => {
      const fps = getFps();
      if (fps !== lastFps) {
        const el = document.getElementById("dev-fps");
        if (el) el.textContent = String(fps);
        // Color the FPS by health.
        if (el) el.style.color = fps >= 50 ? "#39ff14" : fps >= 30 ? "#ffd400" : "#ff1744";
        lastFps = fps;
      }
      // Particle count read — count #particles-canvas-anchor children? We
      // can't easily peek particle count from outside; expose via window for now.
      const pc = window.__particleCount;
      const el2 = document.getElementById("dev-particle-count");
      if (el2 && typeof pc === "number") el2.textContent = ` · ${pc} particles`;
    }, 500);
  }
}

export function unmountDevSliders() {
  const root = document.getElementById("dev-sliders");
  if (root) root.remove();
}

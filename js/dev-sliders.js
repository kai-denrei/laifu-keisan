// dev-sliders.js — runtime tuning UI used by experimental skins.
// Mounts a fixed-position collapsed panel top-right with range inputs +
// live FPS readout. Caller passes a slider config so this module stays
// skin-agnostic (Ryūshi, 7-Seg, future).

export function mountDevSliders({ title, sliders, onChange, getFps }) {
  if (document.getElementById("dev-sliders")) return;

  const intKeys = new Set(
    sliders.filter(s => Number.isInteger(s.default) && s.step >= 1).map(s => s.key)
  );

  const root = document.createElement("div");
  root.id = "dev-sliders";
  root.dataset.collapsed = "1";
  root.innerHTML = `
    <header>
      <span>${title}</span>
      <button type="button" data-action="dev-sliders-toggle" aria-label="Expand">+</button>
    </header>
    <div class="dev-sliders-body" style="display:none">

      ${sliders.map(s => `
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
      const v = intKeys.has(k) ? parseInt(raw, 10) : parseFloat(raw);
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

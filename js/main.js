// main.js — wire everything together; restore-or-new on load; register SW.

import { createState, loadState, saveState } from "./state.js";
import { render, computeRadialClipPaths } from "./render.js";
import { bindInput } from "./input.js";
import { applySkin } from "./skins.js";
import { acquire, bindVisibilityReacquire } from "./wakelock.js";
import { startParticles, stopParticles, updateConfig as updateParticleConfig, getFps as getParticleFps, refreshPanels as refreshParticlePanels } from "./particles.js";
import { mountDevSliders, unmountDevSliders } from "./dev-sliders.js";

// 1. Restore-or-new.
let state = loadState() || createState();

// 2. Apply skin to body before first paint of dynamic content.
applySkin(state.skin);

// 3. Initial render into #board.
const root = document.getElementById("board");
render(state, root);

// 4. Save once after load to upgrade any legacy storage shape.
saveState(state);

// 5. Bind input.
bindInput(root, () => state, () => {
  // onChange hook — currently a no-op; render is performed directly inside input.js.
  // Reserved for telemetry / external listeners later.
});

// 6. Wake Lock — acquire on first user gesture (browsers require this).
let wakeLockArmed = false;
function armWakeLock() {
  if (wakeLockArmed) return;
  wakeLockArmed = true;
  acquire();
  bindVisibilityReacquire();
}
// Try immediately (works in standalone PWA in most cases).
window.addEventListener("load", () => {
  acquire().then((ok) => {
    if (ok) wakeLockArmed = true;
    bindVisibilityReacquire();
  });
});
// Fallback: first pointerdown re-attempts.
window.addEventListener("pointerdown", armWakeLock, { once: false, passive: true });

// 7. Recompute radial clip-paths on resize / orientation change.
let resizeTimer = null;
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    computeRadialClipPaths(state);
  }, 60);
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", onResize);

// 8. Particles skin — start/stop the canvas renderer when the skin changes.
// The body[data-skin] attribute is the source of truth; applySkin updates it.
// A MutationObserver reacts to skin changes from the menu without weaving
// start/stop calls into every code path that touches skin.
function syncParticlesWithSkin() {
  const skin = document.body.getAttribute("data-skin");
  if (skin === "particles") {
    startParticles();
    mountDevSliders(
      (key, value) => updateParticleConfig({ [key]: value }),
      getParticleFps,
    );
  } else {
    stopParticles();
    unmountDevSliders();
  }
}
syncParticlesWithSkin();
new MutationObserver(syncParticlesWithSkin).observe(document.body, {
  attributes: true,
  attributeFilter: ["data-skin"],
});
// Layout changes (player count, layoutVariant) move .life bboxes; re-sample.
document.addEventListener("layout-change", () => {
  if (document.body.getAttribute("data-skin") === "particles") {
    requestAnimationFrame(() => refreshParticlePanels());
  }
});

// 9. Register service worker + wire the update-toast flow.
//
// The SW no longer skipWaiting()s itself on install. Instead, when an update
// reaches "installed" state with an existing controller on the page, we show
// a small "New version — Refresh" toast. On Refresh we postMessage
// SKIP_WAITING to the waiting SW; it activates, controllerchange fires, and
// we reload. First-time installs (no prior controller) don't show the toast
// — they just work.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      // SW already in waiting state on page load (user closed tab during a
      // previous waiting window, e.g.) — surface the toast immediately.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg);
      }
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        });
      });
    }).catch(() => {});

    let _swRefreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (_swRefreshing) return;
      _swRefreshing = true;
      window.location.reload();
    });
  });
}

function showUpdateToast(reg) {
  if (document.getElementById("sw-update-toast")) return;
  const toast = document.createElement("div");
  toast.id = "sw-update-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <span class="sw-update-msg">New version available</span>
    <button type="button" class="sw-update-refresh">Refresh</button>
    <button type="button" class="sw-update-dismiss" aria-label="Dismiss">×</button>
  `;
  document.body.appendChild(toast);
  toast.querySelector(".sw-update-refresh").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    // controllerchange listener will reload once the new SW takes over.
  });
  toast.querySelector(".sw-update-dismiss").addEventListener("click", () => {
    toast.remove();
  });
}

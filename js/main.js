// main.js — wire everything together; restore-or-new on load; register SW.

import { createState, loadState, saveState } from "./state.js";
import { render, computeRadialClipPaths } from "./render.js";
import { bindInput } from "./input.js";
import { applySkin } from "./skins.js";
import { initPwaInstall } from "./pwa-install.js";
import { acquire, bindVisibilityReacquire } from "./wakelock.js";
import { startParticles, stopParticles, updateConfig as updateParticleConfig, getFps as getParticleFps, refreshPanels as refreshParticlePanels, SLIDERS as PARTICLE_SLIDERS } from "./particles.js";
import { mountDevSliders, unmountDevSliders } from "./dev-sliders.js";
import { startSevenSeg, stopSevenSeg, updateConfig as updateSevenSegConfig, getFps as getSevenSegFps, refreshPanels as refreshSevenSegPanels, SLIDERS as SEVENSEG_SLIDERS } from "./sevenseg.js";
import { startLixie, stopLixie, updateConfig as updateLixieConfig, getFps as getLixieFps, refreshPanels as refreshLixiePanels, SLIDERS as LIXIE_SLIDERS } from "./lixie.js";

// Dev sliders are hidden behind `?admin` to keep them off prod for normal
// users while staying one URL away for tuning. Presence-only flag — value
// doesn't matter, so `?admin`, `?admin=1`, etc. all work.
const IS_ADMIN = new URLSearchParams(window.location.search).has("admin");

// 1. Restore-or-new.
let state = loadState() || createState();

// 2. Apply skin to body before first paint of dynamic content.
applySkin(state.skin);

// 3. Initial render into #board.
const root = document.getElementById("board");
// Capture beforeinstallprompt before first render so the Build section's
// "Add To Screen" button reflects install availability immediately.
initPwaInstall();
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
function syncSkinRenderer() {
  const skin = document.body.getAttribute("data-skin");
  unmountDevSliders();
  // Particles (Ryūshi)
  if (skin === "particles") {
    stopSevenSeg();
    stopLixie();
    startParticles();
    if (IS_ADMIN) {
      mountDevSliders({
        title: "Ryūshi · dev",
        sliders: PARTICLE_SLIDERS,
        onChange: (key, value) => updateParticleConfig({ [key]: value }),
        getFps: getParticleFps,
      });
    }
  // 7-segment (Retro)
  } else if (skin === "seven-seg") {
    stopParticles();
    stopLixie();
    startSevenSeg();
    if (IS_ADMIN) {
      mountDevSliders({
        title: "7-Seg · dev",
        sliders: SEVENSEG_SLIDERS,
        onChange: (key, value) => updateSevenSegConfig({ [key]: value }),
        getFps: getSevenSegFps,
      });
    }
  // Lixie (edge-lit acrylic tube)
  } else if (skin === "lixie") {
    stopParticles();
    stopSevenSeg();
    startLixie();
    if (IS_ADMIN) {
      mountDevSliders({
        title: "Lixie · dev",
        sliders: LIXIE_SLIDERS,
        onChange: (key, value) => updateLixieConfig({ [key]: value }),
        getFps: getLixieFps,
      });
    }
  // Static skins
  } else {
    stopParticles();
    stopSevenSeg();
    stopLixie();
  }
}
syncSkinRenderer();
new MutationObserver(syncSkinRenderer).observe(document.body, {
  attributes: true,
  attributeFilter: ["data-skin"],
});
// Layout changes (player count, layoutVariant) move .life bboxes; re-sample
// in whichever canvas renderer is active.
document.addEventListener("layout-change", () => {
  const skin = document.body.getAttribute("data-skin");
  if (skin === "particles") {
    requestAnimationFrame(() => refreshParticlePanels());
  } else if (skin === "seven-seg") {
    requestAnimationFrame(() => refreshSevenSegPanels());
  } else if (skin === "lixie") {
    requestAnimationFrame(() => refreshLixiePanels());
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

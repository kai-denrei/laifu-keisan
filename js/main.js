// main.js — wire everything together; restore-or-new on load; register SW.

import { createState, loadState, saveState } from "./state.js";
import { render, computeRadialClipPaths } from "./render.js";
import { bindInput } from "./input.js";
import { applySkin } from "./skins.js";
import { acquire, bindVisibilityReacquire } from "./wakelock.js";

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

// 8. Register service worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

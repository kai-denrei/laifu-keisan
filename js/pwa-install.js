// pwa-install.js — "Add To Screen" affordance for the Build section.
//
// Cross-platform reality (see mobile-pwa skill):
//   - Chrome / Edge / Android fire `beforeinstallprompt`. We stash it and turn
//     "Add To Screen" into a real button that calls deferredPrompt.prompt().
//   - iOS Safari NEVER fires it — install is a manual Share → "Add to Home
//     Screen" gesture, so we render a hint instead of a (dead) button.
//   - Already installed (standalone) → show a confirmation, no install UI.
//
// The Build markup lives in render.js; updatePwaUI() reflects current state
// onto it and is called from renderMenu() so it re-syncs on every menu rebuild.

let deferredPrompt = null;

export function initPwaInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome's mini-infobar; we surface our own button instead.
    e.preventDefault();
    deferredPrompt = e;
    updatePwaUI();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updatePwaUI();
  });
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true; // iOS
}

function isIOS() {
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/.test(ua)
    // iPadOS 13+ reports as MacIntel but has a touch screen.
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const BASE_NOTE = "This is a Mobile PWA — you can add it to your home screen and use it offline.";

/**
 * Reflect install state onto the Build section's PWA block. Safe to call
 * whenever the menu exists; no-ops if the markup isn't mounted.
 */
export function updatePwaUI() {
  const root = document.getElementById("board");
  if (!root) return;
  const block = root.querySelector(".pwa-block");
  if (!block) return;
  const note = block.querySelector(".pwa-note");
  const btn = block.querySelector(".pwa-install");
  const hint = block.querySelector(".pwa-hint");

  if (isStandalone()) {
    if (note) note.textContent = "This is a Mobile PWA — installed and ready to use offline. ✓";
    if (btn) btn.hidden = true;
    if (hint) hint.hidden = true;
    return;
  }

  if (note) note.textContent = BASE_NOTE;

  if (deferredPrompt) {
    // Chrome/Android/Edge — real, working install button.
    if (btn) btn.hidden = false;
    if (hint) hint.hidden = true;
  } else if (isIOS()) {
    if (btn) btn.hidden = true;
    if (hint) {
      hint.hidden = false;
      hint.innerHTML = 'On iPhone/iPad: tap Share <span class="pwa-share-glyph" aria-hidden="true">↑</span> then “Add to Home Screen”.';
    }
  } else {
    // Desktop Chrome before the event, or a browser without the API.
    if (btn) btn.hidden = true;
    if (hint) {
      hint.hidden = false;
      hint.textContent = 'Open your browser menu and choose “Install” / “Add to Home Screen”.';
    }
  }
}

/**
 * Fire the native install prompt (Chrome/Android/Edge). No-op elsewhere.
 */
export async function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try {
    await deferredPrompt.userChoice;
  } catch {
    // User dismissed or the prompt errored — either way the event is spent.
  }
  deferredPrompt = null;
  updatePwaUI();
}

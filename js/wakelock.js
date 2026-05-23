// wakelock.js — acquire / re-acquire / release; visibility handling.
//
// Uses Screen Wake Lock API. Silent fallback when unsupported.
// Re-acquires on visibilitychange when the page becomes visible (iOS drops
// the lock on tab backgrounding).

let sentinel = null;
let active = false;

export async function acquire() {
  if (!("wakeLock" in navigator)) return false;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    active = true;
    sentinel.addEventListener("release", () => {
      sentinel = null;
      // Don't flip `active` here — `active` tracks intent. We may want to
      // re-acquire when visibility returns even if the OS released us.
    });
    return true;
  } catch {
    return false;
  }
}

export async function release() {
  active = false;
  if (sentinel) {
    try { await sentinel.release(); } catch {}
    sentinel = null;
  }
}

export function isActive() {
  return active;
}

/**
 * Wire up visibility-change re-acquisition. Call once at app start after
 * acquire(). Safe to call before acquire (it just won't fire until intent
 * has been set).
 */
export function bindVisibilityReacquire() {
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && active && !sentinel) {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        // Could not re-acquire (user gesture may be required); silently degrade.
      }
    }
  });
}

// input.js — tap zones, hold-to-accelerate, batched-delta accumulate+commit.
//
// Behavioral contract (per [[pm]] decisions, 2026-05-23):
//   - Tap = ±1.
//   - Hold ≥ 500 ms = enter accel mode.
//       * 0–500 ms: just shows the initial ±1 from pointerdown.
//       * 500 ms – 1700 ms (12 steps): ±1 every 220 ms.
//       * 1700 ms – 3140 ms (12 steps): ±1 every 120 ms.
//       * 3140 ms+: ±5 every 120 ms.
//   - Rapid taps and hold both feed the *same* pending-delta accumulator
//     scoped to (playerId, sign). The first foreign event (different player,
//     or sign-flip) commits the in-flight batch immediately.
//   - 1200 ms idle since the last accumulation event = auto-commit.
//
// Commit = applyDelta(state, playerId, accumulatedDelta), save, then a fresh
// renderPlayer with pendingDelta=0. The log gains one entry (not many).

import { applyDelta, undoLast, setPlayerCount, setSkin, setStartingLife, setHistoryEnabled, resetGame, dismissHint, saveState } from "./state.js";
import { renderPlayer, renderLog, renderShell, renderMenu, render } from "./render.js";
import { applySkin } from "./skins.js";

const HOLD_DELAY_MS = 500;
const ACCEL_TIER_1_INTERVAL = 220;
const ACCEL_TIER_1_STEPS = 12;     // 500 → 500 + 12*220 = 3140? wait — see init
const ACCEL_TIER_2_INTERVAL = 120;
const ACCEL_TIER_2_STEPS = 12;
const ACCEL_TIER_3_INTERVAL = 120;
const ACCEL_TIER_3_DELTA = 5;
const COMMIT_IDLE_MS = 1200;

/**
 * Bind input handlers to the board root. `getState` is a function returning
 * the live state object so we always see the latest. `onChange` is called
 * after any state mutation (save + re-render happens here too).
 */
export function bindInput(root, getState, onChange) {
  // Pending per (playerId): { delta, sign, holdTimer, accelTimer, idleTimer, accelStartedAt }
  const pending = new Map();

  function getPending(playerId) {
    if (!pending.has(playerId)) {
      pending.set(playerId, {
        delta: 0,
        sign: 0,
        holdTimer: null,
        accelTimer: null,
        idleTimer: null,
        accelStartedAt: 0,
        pointerId: null,
      });
    }
    return pending.get(playerId);
  }

  // Clears ALL timers (used by commit when finalizing a batch).
  function clearTimers(p) {
    if (p.holdTimer) { clearTimeout(p.holdTimer); p.holdTimer = null; }
    if (p.accelTimer) { clearTimeout(p.accelTimer); p.accelTimer = null; }
    if (p.idleTimer) { clearTimeout(p.idleTimer); p.idleTimer = null; }
  }

  // Clears only hold/accel timers; preserves the idle-commit timer.
  // Used when transitioning between tap and hold states.
  function clearHoldTimers(p) {
    if (p.holdTimer) { clearTimeout(p.holdTimer); p.holdTimer = null; }
    if (p.accelTimer) { clearTimeout(p.accelTimer); p.accelTimer = null; }
  }

  function scheduleIdleCommit(playerId) {
    const p = getPending(playerId);
    if (p.idleTimer) clearTimeout(p.idleTimer);
    p.idleTimer = setTimeout(() => commit(playerId), COMMIT_IDLE_MS);
  }

  function commit(playerId) {
    const p = getPending(playerId);
    if (!p) return;
    const delta = p.delta;
    clearTimers(p);
    p.delta = 0;
    p.sign = 0;
    p.accelStartedAt = 0;
    // NOTE: do NOT clear p.pointerId here. The pointer interaction lifecycle
    // is independent of the batch lifecycle. Clearing it confuses
    // endZoneInteraction's pointerId-match check, causing the hold timer to
    // run unchecked when sign-flip-mid-batch fires commit() inside the same
    // pointerdown handler that just set pointerId.
    if (delta !== 0) {
      const state = getState();
      applyDelta(state, playerId, delta);
      saveState(state);
      onChange();
      renderPlayer(state, playerId, 0);
      // Side-channel for the experimental particles skin (and anything else
      // that wants to react to commits without breaking the idempotent render
      // contract). Carries delta + newValue so listeners don't have to peek
      // at state.
      document.dispatchEvent(new CustomEvent("lifechange", {
        detail: { playerId, delta, newValue: state.players[playerId].life },
      }));
    } else {
      // Nothing to commit; still need to clear preview.
      const state = getState();
      renderPlayer(state, playerId, 0);
    }
  }

  function commitAll() {
    for (const playerId of pending.keys()) {
      commit(playerId);
    }
  }

  /**
   * Add `step` to the pending delta with the given sign. If sign flips, the
   * existing batch commits first.
   */
  function accumulate(playerId, sign, step = 1) {
    const p = getPending(playerId);
    if (p.sign !== 0 && p.sign !== sign) {
      // Sign flip: commit existing batch first, then start fresh.
      const otherSign = p.sign;
      commit(playerId);
      // Re-fetch after commit clears state.
    }
    const pp = getPending(playerId);
    pp.sign = sign;
    pp.delta += sign * step;
    const state = getState();
    renderPlayer(state, playerId, pp.delta);
    scheduleIdleCommit(playerId);
  }

  /**
   * Foreign-event commit: when a different player taps, force-commit any
   * other player's in-flight batch (prevents stale previews).
   */
  function commitOthers(exceptPlayerId) {
    for (const id of pending.keys()) {
      if (id !== exceptPlayerId) commit(id);
    }
  }

  function startHold(playerId, sign) {
    const p = getPending(playerId);
    clearHoldTimers(p);  // preserve idle-commit timer scheduled by accumulate()
    // After HOLD_DELAY_MS, kick off tier-1 accel.
    p.holdTimer = setTimeout(() => {
      p.accelStartedAt = performance.now();
      stepAccel(playerId, sign);
    }, HOLD_DELAY_MS);
  }

  function stepAccel(playerId, sign) {
    const p = getPending(playerId);
    const elapsed = performance.now() - p.accelStartedAt;
    let interval;
    let step;
    if (elapsed < ACCEL_TIER_1_STEPS * ACCEL_TIER_1_INTERVAL) {
      interval = ACCEL_TIER_1_INTERVAL;
      step = 1;
    } else if (elapsed < ACCEL_TIER_1_STEPS * ACCEL_TIER_1_INTERVAL + ACCEL_TIER_2_STEPS * ACCEL_TIER_2_INTERVAL) {
      interval = ACCEL_TIER_2_INTERVAL;
      step = 1;
    } else {
      interval = ACCEL_TIER_3_INTERVAL;
      step = ACCEL_TIER_3_DELTA;
    }
    accumulate(playerId, sign, step);
    p.accelTimer = setTimeout(() => stepAccel(playerId, sign), interval);
  }

  function endHold(playerId) {
    const p = getPending(playerId);
    clearHoldTimers(p);
    p.accelStartedAt = 0;
    scheduleIdleCommit(playerId);
  }

  // --- Pointer handlers on zones ---

  root.addEventListener("pointerdown", (ev) => {
    const zone = ev.target.closest?.(".zone");
    if (!zone) return;
    if (ev.button !== undefined && ev.button !== 0) return;

    const playerId = parseInt(zone.dataset.playerId, 10);
    const action = zone.dataset.action;
    if (Number.isNaN(playerId) || (action !== "plus" && action !== "minus")) return;

    // Determine sign.
    //
    // RADIAL panels (3P/5P): the zone elements live INSIDE .panel-inner and
    // rotate with the wedge. Plus = inner-half (near table center), minus =
    // outer-half (near screen edge / the seated player). Since the rotation
    // is applied to a wrapper around the zones themselves, the sign is
    // determined purely by which button was hit — no rotation flip needed.
    //
    // GRID panels (2P/4P): the zone elements live OUTSIDE .panel-inner and
    // stay screen-aligned. For a 180°-rotated panel, "screen top" = "my
    // bottom" from the player's perspective, so we invert the sign.
    const panel = zone.closest(".panel");
    const rotation = parseInt(panel?.dataset.seatRotation || "0", 10);
    const isRadialZone = zone.classList.contains("zone-radial");
    let sign = action === "plus" ? 1 : -1;
    if (!isRadialZone && rotation === 180) sign = -sign;

    ev.preventDefault();
    commitOthers(playerId);
    const p = getPending(playerId);
    p.pointerId = ev.pointerId;
    try { zone.setPointerCapture(ev.pointerId); } catch {}
    // Immediate ±1.
    accumulate(playerId, sign, 1);
    // Begin hold timer.
    startHold(playerId, sign);
  });

  function endZoneInteraction(ev) {
    const zone = ev.target.closest?.(".zone");
    if (!zone) return;
    const playerId = parseInt(zone.dataset.playerId, 10);
    if (Number.isNaN(playerId)) return;
    const p = getPending(playerId);
    if (p.pointerId !== ev.pointerId) {
      return;
    }
    try { zone.releasePointerCapture(ev.pointerId); } catch {}
    p.pointerId = null;
    endHold(playerId);
  }

  root.addEventListener("pointerup", endZoneInteraction);
  root.addEventListener("pointercancel", endZoneInteraction);
  root.addEventListener("pointerleave", endZoneInteraction);

  // --- Click handlers for non-zone affordances (menu, log, modal, hint) ---

  root.addEventListener("click", (ev) => {
    const t = ev.target.closest?.("[data-action]");
    if (!t) return;
    const action = t.dataset.action;
    const state = getState();

    switch (action) {
      case "noop": {
        // Tapping the big number is a no-op now — history is opened via the
        // per-panel "…" button when state.historyEnabled is true.
        break;
      }
      case "peek-log": {
        if (!state.historyEnabled) break;
        const playerId = parseInt(t.dataset.playerId, 10);
        // Force-commit this player's in-flight batch before showing log.
        commit(playerId);
        renderLog(state, playerId);
        const popover = root.querySelector(".log-popover");
        if (popover) popover.hidden = false;
        break;
      }
      case "log-close": {
        const popover = root.querySelector(".log-popover");
        if (popover) popover.hidden = true;
        break;
      }
      case "undo": {
        const popover = root.querySelector(".log-popover");
        const playerId = parseInt(popover?.dataset.playerId || "-1", 10);
        if (Number.isNaN(playerId) || playerId < 0) break;
        const undone = undoLast(state, playerId);
        if (undone) {
          saveState(state);
          onChange();
          renderPlayer(state, playerId, 0);
          renderLog(state, playerId);
        }
        break;
      }
      case "menu-toggle": {
        const popover = root.querySelector(".menu-popover");
        if (popover) {
          popover.hidden = !popover.hidden;
          const backdrop = root.querySelector(".menu-backdrop");
          if (backdrop) backdrop.hidden = popover.hidden;
        }
        break;
      }
      case "menu-close": {
        const popover = root.querySelector(".menu-popover");
        if (popover) popover.hidden = true;
        const backdrop = root.querySelector(".menu-backdrop");
        if (backdrop) backdrop.hidden = true;
        break;
      }
      case "set-player-count": {
        const n = parseInt(t.dataset.value, 10);
        commitAll();
        setPlayerCount(state, n);
        saveState(state);
        onChange();
        render(state, root);
        document.dispatchEvent(new CustomEvent("layout-change"));
        break;
      }
      case "set-skin": {
        const skin = t.dataset.value;
        setSkin(state, skin);
        applySkin(skin);
        saveState(state);
        onChange();
        renderMenu(state);
        break;
      }
      case "starting-life-step": {
        const step = parseInt(t.dataset.step, 10);
        if (Number.isNaN(step)) break;
        setStartingLife(state, (state.startingLife || 20) + step);
        saveState(state);
        onChange();
        renderMenu(state);
        break;
      }
      case "toggle-history": {
        const want = t.dataset.value === "on";
        setHistoryEnabled(state, want);
        saveState(state);
        onChange();
        // Re-render all panels so the "…" buttons appear/disappear.
        for (let i = 0; i < state.players.length; i++) {
          renderPlayer(state, i, 0);
        }
        renderMenu(state);
        // If turning OFF while popover is open, close it.
        if (!want) {
          const pop = root.querySelector(".log-popover");
          if (pop) pop.hidden = true;
        }
        break;
      }
      case "reset-confirm": {
        const modal = root.querySelector('[data-modal="reset-confirm"]');
        if (modal) modal.hidden = false;
        const menu = root.querySelector(".menu-popover");
        if (menu) menu.hidden = true;
        const backdrop = root.querySelector(".menu-backdrop");
        if (backdrop) backdrop.hidden = true;
        break;
      }
      case "reset-cancel": {
        const modal = root.querySelector('[data-modal="reset-confirm"]');
        if (modal) modal.hidden = true;
        break;
      }
      case "reset": {
        commitAll();
        resetGame(state);
        saveState(state);
        onChange();
        render(state, root);
        document.dispatchEvent(new CustomEvent("layout-change"));
        const modal = root.querySelector('[data-modal="reset-confirm"]');
        if (modal) modal.hidden = true;
        break;
      }
      case "dismiss-hint": {
        dismissHint(state);
        saveState(state);
        onChange();
        const banner = root.querySelector('.hint-banner');
        if (banner) banner.remove();
        break;
      }
    }
  });

  // Dismiss menu on outside tap (escape close affordance). Belt-and-braces
  // alongside the .menu-backdrop overlay: this fires for taps that miss the
  // backdrop too (e.g. on the hint-banner or in tiny gaps).
  root.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest(".menu-pill, .log-popover, .modal, .hint-banner")) return;
    const menu = root.querySelector(".menu-popover");
    if (menu && !menu.hidden) {
      menu.hidden = true;
      const backdrop = root.querySelector(".menu-backdrop");
      if (backdrop) backdrop.hidden = true;
    }
  }, true);

  // Visibility-driven cleanup: commit any in-flight batches when the tab
  // hides so the state we restore is the truth.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      commitAll();
    }
  });
}

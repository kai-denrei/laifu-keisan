// render.js — idempotent render(state) → DOM.
//
// Strategy: shell + fast path.
//   - renderShell(state, root): build the panel grid. Only re-runs when
//     playerCount or layoutVariant change. Sets data-player-count and
//     data-layout-variant on root.
//   - renderPlayer(state, id): update one panel's number, log button state,
//     and floating delta indicator. Fast path; runs per tap.
//   - render(state, root): orchestrator. Diffs against root's data attributes
//     to decide whether shell needs rebuild.
//
// Each panel structure:
//   <section class="panel" data-player-id="0" data-life="20">
//     <button class="zone zone-plus" data-action="plus" aria-label="add one">
//     <div class="panel-inner">
//       <div class="delta" aria-live="polite" hidden></div>
//       <div class="life" aria-label="life total">20</div>
//       <button class="log-toggle" aria-label="show log">·</button>
//     </div>
//     <button class="zone zone-minus" data-action="minus" aria-label="subtract one">
//   </section>
//
// .panel-inner carries `transform: rotate(<seat-rotation>)` via layout.css
// based on data-seat. Children of .panel-inner (delta, life, log) inherit it.
// The .zone buttons are *outside* .panel-inner so they fill the panel's
// screen-aligned hit area (tap targets must remain finger-natural even though
// the number is rotated).

// Seat rotation per spec.
// Layout rotation is per-count, per-seat-index.
const SEAT_ROTATIONS = {
  2: [0, 180],
  3: [0, 180, 180],          // P1 bottom, P2 P3 top
  4: [0, 0, 180, 180],       // bottom-left, bottom-right, top-left, top-right (visual order; layout decides position)
  5: [180, 180, 180, 0, 0],  // top three, bottom two
};

// For the menu pill positioning we put it dead center for 2P (between the two
// panels along the gutter) and as a small top-center pill for other counts.
// Layout CSS handles positioning.

function makePanel(playerId, rotation) {
  const section = document.createElement("section");
  section.className = "panel";
  section.dataset.playerId = String(playerId);
  section.dataset.seatRotation = String(rotation);

  // + zone (top in screen space, but "+" semantically — see below for inversion).
  const plus = document.createElement("button");
  plus.className = "zone zone-plus";
  plus.type = "button";
  plus.dataset.action = "plus";
  plus.dataset.playerId = String(playerId);
  plus.setAttribute("aria-label", "Add one");
  plus.tabIndex = -1;

  const minus = document.createElement("button");
  minus.className = "zone zone-minus";
  minus.type = "button";
  minus.dataset.action = "minus";
  minus.dataset.playerId = String(playerId);
  minus.setAttribute("aria-label", "Subtract one");
  minus.tabIndex = -1;

  const inner = document.createElement("div");
  inner.className = "panel-inner";
  inner.style.setProperty("--seat-rotation", `${rotation}deg`);

  const delta = document.createElement("div");
  delta.className = "delta";
  delta.setAttribute("aria-live", "polite");
  delta.hidden = true;

  const life = document.createElement("button");
  life.className = "life";
  life.type = "button";
  life.dataset.action = "peek-log";
  life.dataset.playerId = String(playerId);
  life.setAttribute("aria-label", "Show log and undo");

  inner.appendChild(delta);
  inner.appendChild(life);

  // For a 180°-rotated panel: the natural "up" (where + is) is screen-bottom.
  // So we order DOM: plus (screen-top), inner, minus (screen-bottom) — and
  // for 180° panels we visually swap which zone is + vs −. To keep tap
  // semantics intuitive (the player's reach toward the screen-top of their
  // own panel = +), we mark the screen-top zone as + for 0°-rotated seats
  // and as − for 180°-rotated seats; layout.css handles this via
  // [data-seat-rotation="180"] selectors. Here we just put plus first.
  section.appendChild(plus);
  section.appendChild(inner);
  section.appendChild(minus);

  return section;
}

/**
 * Build (or rebuild) the panel grid. Idempotent against playerCount +
 * layoutVariant; bails out if nothing structural changed.
 */
export function renderShell(state, root) {
  const count = state.playerCount;
  const variant = state.layoutVariant;
  const currentCount = parseInt(root.dataset.playerCount || "0", 10);
  const currentVariant = root.dataset.layoutVariant || "";

  if (currentCount === count && currentVariant === variant) {
    return; // shell already correct
  }

  root.dataset.playerCount = String(count);
  root.dataset.layoutVariant = variant;
  root.replaceChildren();

  const rotations = SEAT_ROTATIONS[count] || SEAT_ROTATIONS[2];
  for (let i = 0; i < count; i++) {
    root.appendChild(makePanel(i, rotations[i] ?? 0));
  }

  // Center menu pill (reset / settings / player count / skin).
  const menu = document.createElement("div");
  menu.className = "menu-pill";
  menu.innerHTML = `
    <button class="menu-toggle" type="button" data-action="menu-toggle" aria-label="Menu">☰</button>
    <div class="menu-popover" hidden role="dialog" aria-label="Settings">
      <div class="menu-row">
        <span class="menu-label">Players</span>
        <div class="menu-choices" data-choice-group="player-count">
          <button type="button" data-action="set-player-count" data-value="2">2</button>
          <button type="button" data-action="set-player-count" data-value="3">3</button>
          <button type="button" data-action="set-player-count" data-value="4">4</button>
          <button type="button" data-action="set-player-count" data-value="5">5</button>
        </div>
      </div>
      <div class="menu-row">
        <span class="menu-label">Skin</span>
        <div class="menu-choices" data-choice-group="skin">
          <button type="button" data-action="set-skin" data-value="pastel">Pastel</button>
          <button type="button" data-action="set-skin" data-value="cyberpunk">Cyber</button>
          <button type="button" data-action="set-skin" data-value="heroic-fantasy">Heroic</button>
        </div>
      </div>
      <div class="menu-row">
        <span class="menu-label">Start at</span>
        <div class="menu-choices" data-choice-group="starting-life">
          <button type="button" data-action="set-starting-life" data-value="20">20</button>
          <button type="button" data-action="set-starting-life" data-value="30">30</button>
          <button type="button" data-action="set-starting-life" data-value="40">40</button>
        </div>
      </div>
      <div class="menu-row menu-row-actions">
        <button type="button" class="menu-reset" data-action="reset-confirm">Reset game</button>
      </div>
    </div>
  `;
  root.appendChild(menu);

  // First-game hint banner (one-time).
  if (!state.hintDismissed) {
    const hint = document.createElement("div");
    hint.className = "hint-banner";
    hint.dataset.role = "screen-on-hint";
    hint.innerHTML = `
      <span>Keep your phone's display set to "never sleep" during play.</span>
      <button type="button" data-action="dismiss-hint" aria-label="Dismiss hint">Got it</button>
    `;
    root.appendChild(hint);
  }

  // Log popover (single, reused, positioned over the active panel).
  const logPopover = document.createElement("div");
  logPopover.className = "log-popover";
  logPopover.hidden = true;
  logPopover.setAttribute("role", "dialog");
  logPopover.setAttribute("aria-label", "Player log");
  logPopover.innerHTML = `
    <div class="log-popover-inner">
      <header>
        <span class="log-title">Player <span data-bind="player-num"></span></span>
        <button type="button" class="log-close" data-action="log-close" aria-label="Close">✕</button>
      </header>
      <ul class="log-list"></ul>
      <footer>
        <button type="button" class="log-undo" data-action="undo">Undo last</button>
      </footer>
    </div>
  `;
  root.appendChild(logPopover);

  // Reset confirmation modal.
  const confirm = document.createElement("div");
  confirm.className = "modal";
  confirm.dataset.modal = "reset-confirm";
  confirm.hidden = true;
  confirm.setAttribute("role", "alertdialog");
  confirm.setAttribute("aria-label", "Confirm reset");
  confirm.innerHTML = `
    <div class="modal-inner">
      <p>Reset all life totals and clear the log?</p>
      <div class="modal-actions">
        <button type="button" data-action="reset-cancel">Cancel</button>
        <button type="button" class="modal-danger" data-action="reset">Reset</button>
      </div>
    </div>
  `;
  root.appendChild(confirm);
}

/**
 * Update a single panel's life number and floating delta.
 * `pendingDelta` is the in-flight batched delta (or 0). Caller passes it.
 */
export function renderPlayer(state, playerId, pendingDelta = 0) {
  const root = document.getElementById("board");
  if (!root) return;
  const panel = root.querySelector(`.panel[data-player-id="${playerId}"]`);
  if (!panel) return;

  const p = state.players[playerId];
  if (!p) return;

  const lifeEl = panel.querySelector(".life");
  const deltaEl = panel.querySelector(".delta");

  const currentLife = p.counters.life;
  panel.dataset.life = String(currentLife);

  // Showing the *preview* life so the player sees where they'll land.
  const previewLife = currentLife + pendingDelta;
  if (lifeEl.textContent !== String(previewLife)) {
    lifeEl.textContent = String(previewLife);
  }

  if (pendingDelta === 0) {
    deltaEl.hidden = true;
    deltaEl.textContent = "";
    panel.dataset.delta = "";
    panel.dataset.deltaSign = "";
  } else {
    deltaEl.hidden = false;
    const sign = pendingDelta > 0 ? "+" : "−";
    deltaEl.textContent = `${sign}${Math.abs(pendingDelta)}`;
    panel.dataset.delta = String(pendingDelta);
    panel.dataset.deltaSign = pendingDelta > 0 ? "plus" : "minus";
  }
}

/**
 * Update menu-pill highlight state to reflect current settings.
 */
export function renderMenu(state) {
  const root = document.getElementById("board");
  if (!root) return;
  root.querySelectorAll('[data-choice-group="player-count"] button').forEach(b => {
    b.dataset.active = (parseInt(b.dataset.value, 10) === state.playerCount) ? "1" : "";
  });
  root.querySelectorAll('[data-choice-group="skin"] button').forEach(b => {
    b.dataset.active = (b.dataset.value === state.skin) ? "1" : "";
  });
  root.querySelectorAll('[data-choice-group="starting-life"] button').forEach(b => {
    b.dataset.active = (parseInt(b.dataset.value, 10) === state.startingLife) ? "1" : "";
  });
}

/**
 * Full render. Calls shell (which short-circuits if structure unchanged) and
 * fast-paths each player.
 */
export function render(state, root, pendingDeltas = {}) {
  renderShell(state, root);
  renderMenu(state);
  for (let i = 0; i < state.players.length; i++) {
    renderPlayer(state, i, pendingDeltas[i] || 0);
  }
}

/**
 * Render the log popover for a player.
 */
export function renderLog(state, playerId) {
  const root = document.getElementById("board");
  if (!root) return;
  const popover = root.querySelector(".log-popover");
  if (!popover) return;
  const p = state.players[playerId];
  if (!p) return;

  popover.dataset.playerId = String(playerId);
  const numEl = popover.querySelector('[data-bind="player-num"]');
  if (numEl) numEl.textContent = String(playerId + 1);

  const list = popover.querySelector(".log-list");
  list.replaceChildren();

  if (p.log.length === 0) {
    const li = document.createElement("li");
    li.className = "log-empty";
    li.textContent = "No changes yet.";
    list.appendChild(li);
  } else {
    // Most recent at top.
    const recent = p.log.slice().reverse().slice(0, 12);
    for (const entry of recent) {
      const li = document.createElement("li");
      const sign = entry.delta > 0 ? "+" : "−";
      const time = new Date(entry.t);
      const hh = String(time.getHours()).padStart(2, "0");
      const mm = String(time.getMinutes()).padStart(2, "0");
      li.innerHTML = `
        <span class="log-delta" data-sign="${entry.delta > 0 ? "plus" : "minus"}">${sign}${Math.abs(entry.delta)}</span>
        <span class="log-life">→ ${entry.life}</span>
        <span class="log-time">${hh}:${mm}</span>
      `;
      list.appendChild(li);
    }
  }
}

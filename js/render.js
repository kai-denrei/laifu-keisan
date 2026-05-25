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
// Per-count layouts:
//   - 2P, 4P: CSS Grid (handled in layout.css).
//   - 3P, 5P: RADIAL — wedges 120° / 72° apart, clip-path computed in JS to
//     cover the entire viewport including corners. Recomputed on resize.
//
// Tap zone semantics:
//   - Grid (2P/4P): zones are child <button class="zone"> elements OUTSIDE
//     .panel-inner. Sign is flipped for rotation==180 panels (see input.js).
//   - Radial (3P/5P): zones are INSIDE .panel-inner so they rotate with the
//     wedge. Outer-side (near the screen edge / the seated player) = MINUS.
//     Inner-side (near the screen center / the center of the table) = PLUS.
//     This matches the convention "+ at panel-top, − at panel-bottom" once
//     the panel is rotated to face the player.

// Seat rotation per spec.
//   2P: south + north
//   3P RADIAL: P0 south (0°), P1 120° CW from south, P2 240°
//             — seats at 6 / 10 / 2 o'clock
//   4P: bottom two 0°, top two 180°
//   5P RADIAL: 72° apart, starting at south (P0=0°)
const SEAT_ROTATIONS = {
  2: [0, 180],
  3: [0, 120, 240],
  4: [0, 0, 180, 180],
  5: [0, 72, 144, 216, 288],
};

// Counts that use the radial layout (full-viewport wedges).
const RADIAL_COUNTS = new Set([3, 5]);

function isRadial(count) {
  return RADIAL_COUNTS.has(count);
}

function makePanel(playerId, rotation, radial) {
  const section = document.createElement("section");
  section.className = "panel";
  section.dataset.playerId = String(playerId);
  section.dataset.seatRotation = String(rotation);
  if (radial) section.dataset.radial = "1";

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
  life.dataset.action = "noop"; // no longer the primary log affordance; "…" button is
  life.dataset.playerId = String(playerId);
  life.setAttribute("aria-label", "Life total");

  // Per-player history "…" button — corner of the rotated frame.
  // Rendered always; hidden via CSS when history disabled.
  const histBtn = document.createElement("button");
  histBtn.className = "history-btn";
  histBtn.type = "button";
  histBtn.dataset.action = "peek-log";
  histBtn.dataset.playerId = String(playerId);
  histBtn.setAttribute("aria-label", "Show history");
  histBtn.textContent = "…";

  inner.appendChild(delta);
  inner.appendChild(life);
  inner.appendChild(histBtn);

  if (radial) {
    // Radial: tap zones live inside .panel (not .panel-inner), so they
    // inherit the wedge clip-path but DON'T rotate. They don't need to
    // rotate because both shapes are radially symmetric:
    //   - inner zone: a circle centered on the viewport
    //   - outer zone: everything else inside the wedge clip
    // Inner = + (near table center). Outer = − (near player's screen edge).
    const outer = document.createElement("button");
    outer.className = "zone zone-minus zone-radial zone-radial-outer";
    outer.type = "button";
    outer.dataset.action = "minus";
    outer.dataset.playerId = String(playerId);
    outer.setAttribute("aria-label", "Subtract one");
    outer.tabIndex = -1;

    const innerZone = document.createElement("button");
    innerZone.className = "zone zone-plus zone-radial zone-radial-inner";
    innerZone.type = "button";
    innerZone.dataset.action = "plus";
    innerZone.dataset.playerId = String(playerId);
    innerZone.setAttribute("aria-label", "Add one");
    innerZone.tabIndex = -1;

    // Outer first (lower z-index via DOM order); inner on top.
    section.appendChild(outer);
    section.appendChild(innerZone);
    section.appendChild(inner);
  } else {
    // Grid path: zones are screen-aligned, OUTSIDE the rotated content.
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

    section.appendChild(plus);
    section.appendChild(inner);
    section.appendChild(minus);
  }

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
  root.dataset.radial = isRadial(count) ? "1" : "";
  root.replaceChildren();

  const rotations = SEAT_ROTATIONS[count] || SEAT_ROTATIONS[2];
  const radial = isRadial(count);
  for (let i = 0; i < count; i++) {
    root.appendChild(makePanel(i, rotations[i] ?? 0, radial));
  }

  // Center menu pill (reset / settings / player count / skin / history / starting life stepper).
  const menu = document.createElement("div");
  menu.className = "menu-pill";
  menu.innerHTML = `
    <button class="menu-toggle" type="button" data-action="menu-toggle" aria-label="Menu">☰</button>
    <div class="menu-popover" hidden role="dialog" aria-label="Settings">
      <button class="menu-close" type="button" data-action="menu-close" aria-label="Close settings">×</button>
      <div class="menu-row">
        <span class="menu-label">Players</span>
        <div class="menu-choices" data-choice-group="player-count">
          <button type="button" data-action="set-player-count" data-value="2">2</button>
          <button type="button" data-action="set-player-count" data-value="3">3</button>
          <button type="button" data-action="set-player-count" data-value="4">4</button>
          <button type="button" data-action="set-player-count" data-value="5">5</button>
        </div>
      </div>
      <div class="menu-row menu-row-skin">
        <span class="menu-label">Skin</span>
        <div class="skin-grid" data-choice-group="skin">
          <button type="button" data-action="set-skin" data-value="pastel">Pastel</button>
          <button type="button" data-action="set-skin" data-value="cyberpunk">Cyber</button>
          <button type="button" data-action="set-skin" data-value="heroic-fantasy">Heroic</button>
          <button type="button" data-action="set-skin" data-value="particles">Ryūshi</button>
          <button type="button" data-action="set-skin" data-value="seven-seg">7-Seg</button>
        </div>
      </div>
      <div class="menu-row">
        <span class="menu-label">Start at</span>
        <div class="stepper" data-choice-group="starting-life">
          <button type="button" data-action="starting-life-step" data-step="-5" aria-label="Decrease by 5">−5</button>
          <button type="button" data-action="starting-life-step" data-step="-1" aria-label="Decrease by 1">−1</button>
          <span class="stepper-value" data-bind="starting-life">20</span>
          <button type="button" data-action="starting-life-step" data-step="1" aria-label="Increase by 1">+1</button>
          <button type="button" data-action="starting-life-step" data-step="5" aria-label="Increase by 5">+5</button>
        </div>
      </div>
      <div class="menu-row">
        <span class="menu-label">History</span>
        <div class="menu-choices" data-choice-group="history">
          <button type="button" data-action="toggle-history" data-value="off">Off</button>
          <button type="button" data-action="toggle-history" data-value="on">On</button>
        </div>
      </div>
      <div class="menu-row menu-row-build">
        <span class="menu-label">Build</span>
        <div class="build-badge" data-bind="build-badge" aria-label="Cache-bust build token"></div>
      </div>
      <div class="menu-row menu-row-actions">
        <button type="button" class="menu-reset" data-action="reset-confirm">Reset Counter</button>
      </div>
    </div>
  `;

  // Populate the build badge from <meta name="cb"> — three cb-shapes tiles + token hex.
  const badgeMount = menu.querySelector('[data-bind="build-badge"]');
  if (badgeMount) {
    const cbMeta = document.querySelector('meta[name="cb"]');
    const hex = ((cbMeta && cbMeta.getAttribute("content")) || "").toLowerCase().slice(0, 8);
    if (/^[0-9a-f]{8}$/.test(hex)) {
      const pad2 = (n) => String(n).padStart(2, "0");
      const cells = [0, 1, 2].map((i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16) % 64);
      badgeMount.innerHTML =
        cells
          .map((c) => `<img src="cb-shapes/${pad2(c)}.svg?v=${hex}" alt="" width="18" height="18">`)
          .join("") +
        `<span class="build-badge-hex">${hex}</span>`;
    }
  }
  root.appendChild(menu);

  // Backdrop overlay — intercepts taps outside the popover so any tap on a
  // panel / zone closes the settings instead of changing life. Tracks the
  // popover's hidden state via input.js's menu-toggle / menu-close handlers.
  const backdrop = document.createElement("div");
  backdrop.className = "menu-backdrop";
  backdrop.dataset.action = "menu-close";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  root.appendChild(backdrop);

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

  // Compute radial geometry if needed.
  if (radial) {
    computeRadialClipPaths(state);
  }
}

/**
 * Compute clip-path polygons for radial wedges so they fill the entire
 * viewport including corners. Each wedge spans an angular slice
 *   (startAngle, endAngle) measured clockwise from south (6 o'clock).
 *
 * Algorithm: walk around the viewport rectangle from startAngle to endAngle.
 * Start vertex: center. Then the perimeter intersection at startAngle.
 * Then any corner points whose angle from center lies inside (startAngle,
 * endAngle). Then the perimeter intersection at endAngle. Close with the
 * center.
 *
 * Returned CSS clip-path uses absolute px from the panel's top-left. Since
 * each panel is absolute-positioned at (0,0) with width/height = viewport,
 * the math is in viewport coords directly.
 */
export function computeRadialClipPaths(state) {
  const root = document.getElementById("board");
  if (!root) return;
  const count = state.playerCount;
  if (!isRadial(count)) return;

  const rect = root.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;
  const rotations = SEAT_ROTATIONS[count];
  const wedgeAngle = 360 / count;

  // Angles: we want P0 centered at south (angle 90° in standard math, but
  // we work in "clockwise from south" because that matches seat-rotation).
  // Convert "clockwise from south" → screen-space (x right, y down) by:
  //   theta_screen = (90° + rotation) in degrees, where +90° is south.
  // But we'll just operate in "clockwise-from-south" everywhere and convert
  // at the boundary intersection step.

  // For each player i, the wedge center angle = rotations[i] (CW from south).
  // The wedge spans [center - wedgeAngle/2, center + wedgeAngle/2].
  for (let i = 0; i < count; i++) {
    const centerAngle = rotations[i]; // CW from south, degrees
    const startAngle = normalize(centerAngle - wedgeAngle / 2);
    const endAngle = normalize(centerAngle + wedgeAngle / 2);

    const points = computeWedgePolygon(cx, cy, W, H, startAngle, endAngle);
    const clipPath = `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(", ")})`;

    const panel = root.querySelector(`.panel[data-player-id="${i}"]`);
    if (panel) {
      panel.style.clipPath = clipPath;
      panel.style.webkitClipPath = clipPath;
    }
  }
}

function normalize(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Convert "clockwise from south" angle to a screen-space ray from (cx,cy).
 *
 * Spec maps 3P seats at the 6 / 10 / 2 o'clock positions with rotations
 * 0° / 120° / 240°. On a clock face, 6 → 10 is 4 hours = 120° CLOCKWISE
 * (the conventional clock-rotation direction). Going visually clockwise
 * from 6: 6 → 7 → 8 → 9 → 10 → 11 → 12 → 1 → 2 etc.
 *
 * In screen coords (y-axis points DOWN), visually-clockwise motion is the
 * same direction as math-counterclockwise. So rotating the south vector
 * (0, +1) clockwise (visually) by angle a:
 *   Math CCW rotation of (0, 1):
 *     x' = 0·cos a - 1·sin a = -sin a
 *     y' = 0·sin a + 1·cos a = cos a
 *
 * Quick checks:
 *   angle   0   → (0, 1)         = south (6 o'clock) ✓
 *   angle 120°  → (-0.866, -0.5) = upper-left (10 o'clock) ✓
 *   angle 240°  → (+0.866, -0.5) = upper-right (2 o'clock) ✓
 *   angle  72°  → (-0.951, 0.309) = 7-ish o'clock ✓
 */
function rayDir(angleCwFromSouth) {
  const rad = (angleCwFromSouth * Math.PI) / 180;
  return { x: -Math.sin(rad), y: Math.cos(rad) };
}

/**
 * Ray-rectangle intersection. Ray starts at (cx,cy) with direction (dx,dy).
 * Rectangle is [0,W]×[0,H]. Returns the (x,y) on the perimeter.
 */
function rayHitRect(cx, cy, dx, dy, W, H) {
  // Find smallest positive t such that cx + t*dx ∈ [0,W] AND cy + t*dy ∈ [0,H]
  // and lands ON the boundary.
  let tBest = Infinity;
  const eps = 1e-9;
  if (dx > eps) {
    const t = (W - cx) / dx;
    if (t > 0 && t < tBest) tBest = t;
  } else if (dx < -eps) {
    const t = (0 - cx) / dx;
    if (t > 0 && t < tBest) tBest = t;
  }
  if (dy > eps) {
    const t = (H - cy) / dy;
    if (t > 0 && t < tBest) tBest = t;
  } else if (dy < -eps) {
    const t = (0 - cy) / dy;
    if (t > 0 && t < tBest) tBest = t;
  }
  return [cx + tBest * dx, cy + tBest * dy];
}

/**
 * Compute polygon vertices for a wedge from startAngle → endAngle (clockwise
 * from south), going CW around the wedge interior. The wedge always spans
 * less than 360° and is contiguous (handles wrap-around).
 */
function computeWedgePolygon(cx, cy, W, H, startAngle, endAngle) {
  // The four corners of the rectangle expressed as "clockwise from south"
  // angle from center:
  //   bottom-left  (0, H)   → angle ≈ atan2 of (dx=-cx, dy=H-cy)
  //   top-left     (0, 0)   → (dx=-cx, dy=-cy)
  //   top-right    (W, 0)   → (dx=W-cx, dy=-cy)
  //   bottom-right (W, H)   → (dx=W-cx, dy=H-cy)
  const corners = [
    [0, H], [0, 0], [W, 0], [W, H],
  ];
  // Compute angle CW-from-south for each corner.
  // Inverse of rayDir: given (dx, dy) (unnormalized direction), angle CW-from-south:
  //   x = -sin(angle), y = cos(angle)
  //   → angle = atan2(-dx, dy)  (in radians)
  const cornerAngles = corners.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    let deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
    return normalize(deg);
  });
  // Pair (corner, angle) and we'll pick those whose angle is strictly within
  // (startAngle, endAngle) going clockwise.

  // The wedge spans startAngle → endAngle in the CW direction.
  // A corner with angle θ is inside the wedge iff
  //   inCW(startAngle, endAngle, θ) — i.e. θ comes between start and end
  //   when traversing clockwise from start.

  function inCW(start, end, theta) {
    // Going CW from start to end. CW from south in our scheme means
    // increasing angle (since 0→south, 90→west, 180→north, 270→east).
    // So inCW = does theta lie in (start, end) on the increasing circle?
    if (start === end) return false;
    const s = normalize(start);
    const e = normalize(end);
    const t = normalize(theta);
    if (s < e) {
      return t > s && t < e;
    } else {
      // Wraps past 360.
      return t > s || t < e;
    }
  }

  // Collect corners in CW order from startAngle.
  const cornerOrder = [];
  for (let k = 0; k < 4; k++) {
    if (inCW(startAngle, endAngle, cornerAngles[k])) {
      cornerOrder.push({ pt: corners[k], angle: cornerAngles[k] });
    }
  }
  // Sort by CW distance from startAngle.
  cornerOrder.sort((a, b) => {
    const da = normalize(a.angle - startAngle);
    const db = normalize(b.angle - startAngle);
    return da - db;
  });

  const startDir = rayDir(startAngle);
  const endDir = rayDir(endAngle);
  const startHit = rayHitRect(cx, cy, startDir.x, startDir.y, W, H);
  const endHit = rayHitRect(cx, cy, endDir.x, endDir.y, W, H);

  const poly = [];
  poly.push([cx, cy]);
  poly.push(startHit);
  for (const c of cornerOrder) poly.push(c.pt);
  poly.push(endHit);
  return poly;
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

  // History button visibility tracks state.historyEnabled.
  const histBtn = panel.querySelector(".history-btn");
  if (histBtn) {
    histBtn.hidden = !state.historyEnabled;
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
  root.querySelectorAll('[data-choice-group="history"] button').forEach(b => {
    const want = b.dataset.value === "on";
    b.dataset.active = (want === !!state.historyEnabled) ? "1" : "";
  });
  const stepperVal = root.querySelector('[data-bind="starting-life"]');
  if (stepperVal) stepperVal.textContent = String(state.startingLife);
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
  if (isRadial(state.playerCount)) {
    computeRadialClipPaths(state);
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

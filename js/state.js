// state.js — single source of truth.
//
// Shape:
//   {
//     version: 1,
//     startingLife: 20,
//     playerCount: 2,            // 2..5
//     skin: "pastel",            // "pastel" | "cyberpunk" | "heroic-fantasy"
//     layoutVariant: "default",  // future: "pinwheel"
//     hintDismissed: false,      // first-game "keep screen on" hint
//     players: [
//       { id: 0, counters: { life: 20 }, log: [ { delta, life, t } ] },
//       ...
//     ],
//   }
//
// `players[i].counters.life` is the canonical life value.
// `players[i].life` is exposed as a read-only getter for convenience.
// Deferred counters (poison, commander, energy) slot into `counters` without
// touching consumers.

const STORAGE_KEY = "laifu-keisan/state/v1";
const VERSION = 1;

const DEFAULTS = Object.freeze({
  startingLife: 20,
  playerCount: 2,
  skin: "pastel",
  layoutVariant: "default",
  hintDismissed: false,
  historyEnabled: false,
});

const SKINS = ["pastel", "cyberpunk", "heroic-fantasy", "particles"];

function makePlayer(id, startingLife) {
  const p = {
    id,
    counters: { life: startingLife },
    log: [],
  };
  Object.defineProperty(p, "life", {
    get() { return this.counters.life; },
    enumerable: false,
    configurable: true,
  });
  return p;
}

export function createState(overrides = {}) {
  const merged = { ...DEFAULTS, ...overrides };
  const players = Array.from({ length: merged.playerCount }, (_, i) =>
    makePlayer(i, merged.startingLife)
  );
  return {
    version: VERSION,
    ...merged,
    players,
  };
}

/**
 * Read state from localStorage. Returns null if absent or invalid.
 * Rehydrates the `life` getter on each player.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;
    if (!Array.isArray(parsed.players)) return null;
    // Rehydrate getters.
    parsed.players = parsed.players.map(p => {
      const rehydrated = {
        id: p.id,
        counters: { ...(p.counters || { life: parsed.startingLife }) },
        log: Array.isArray(p.log) ? p.log : [],
      };
      Object.defineProperty(rehydrated, "life", {
        get() { return this.counters.life; },
        enumerable: false,
        configurable: true,
      });
      return rehydrated;
    });
    if (!SKINS.includes(parsed.skin)) parsed.skin = "pastel";
    // Backfill new flags from older saves.
    if (typeof parsed.historyEnabled !== "boolean") parsed.historyEnabled = false;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    // counters are own enumerable, log too; `life` getter is non-enumerable so it round-trips fine.
    const serializable = {
      version: state.version,
      startingLife: state.startingLife,
      playerCount: state.playerCount,
      skin: state.skin,
      layoutVariant: state.layoutVariant,
      hintDismissed: !!state.hintDismissed,
      historyEnabled: !!state.historyEnabled,
      players: state.players.map(p => ({
        id: p.id,
        counters: { ...p.counters },
        log: p.log.slice(-200), // bounded; log is for the current game, not history
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Quota / private-browsing: best-effort, swallow.
  }
}

/**
 * Mutate one player's life by delta and append a log entry. Returns the
 * updated player. Caller is responsible for calling saveState + render.
 */
export function applyDelta(state, playerId, delta) {
  const p = state.players[playerId];
  if (!p) return null;
  const next = p.counters.life + delta;
  p.counters.life = next;
  p.log.push({ delta, life: next, t: Date.now() });
  return p;
}

/**
 * Undo the most recent log entry for a player. Returns the entry that was
 * undone, or null if there's nothing to undo.
 */
export function undoLast(state, playerId) {
  const p = state.players[playerId];
  if (!p || p.log.length === 0) return null;
  const last = p.log.pop();
  p.counters.life -= last.delta;
  return last;
}

/**
 * Set the player count, preserving life values for surviving seats and adding
 * fresh seats at startingLife for new ones.
 */
export function setPlayerCount(state, n) {
  n = Math.max(2, Math.min(5, n | 0));
  if (n === state.playerCount) return;
  if (n > state.playerCount) {
    for (let i = state.playerCount; i < n; i++) {
      state.players.push(makePlayer(i, state.startingLife));
    }
  } else {
    state.players.length = n;
  }
  state.playerCount = n;
}

export function setSkin(state, skin) {
  if (!SKINS.includes(skin)) return;
  state.skin = skin;
}

export function setStartingLife(state, n) {
  n = Math.max(1, Math.min(999, n | 0));
  state.startingLife = n;
}

export function setHistoryEnabled(state, enabled) {
  state.historyEnabled = !!enabled;
}

/**
 * Reset all players to startingLife and clear logs. Keeps playerCount, skin,
 * layoutVariant, hintDismissed.
 */
export function resetGame(state) {
  for (const p of state.players) {
    p.counters.life = state.startingLife;
    p.log.length = 0;
  }
}

export function dismissHint(state) {
  state.hintDismissed = true;
}

export const STATE_DEFAULTS = DEFAULTS;
export const SKIN_LIST = SKINS;

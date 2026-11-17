/*
 * storage.js - Safe reading and writing of browser storage.
 *   'local'   = localStorage   (kept after the browser closes)
 *   'session' = sessionStorage (cleared when the tab closes)
 * Storage can be blocked (e.g. private mode), so every call is wrapped in try/catch.
 */

const stores = {
  local: () => window.localStorage,
  session: () => window.sessionStorage,
};

/** Read a saved value, or null if missing or unreadable. */
export function readJson(where, name) {
  try {
    return JSON.parse(stores[where]().getItem(name));
  } catch {
    return null;
  }
}

/** Save a value. Returns false if the browser refused. */
export function writeJson(where, name, value) {
  try {
    stores[where]().setItem(name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Delete a saved value. */
export function removeItem(where, name) {
  try {
    stores[where]().removeItem(name);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

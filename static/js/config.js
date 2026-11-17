/*
 * config.js - Settings used by the JavaScript. Change behaviour here.
 * (Colours are in tailwind.config.js and templates/styles/components.css.)
 */

export const SETTINGS = {
  keyStorageName: 'playfair.activeKey',        // localStorage entry for the saved key
  historyStorageName: 'playfair.history',      // sessionStorage entry for the history
  originalsStorageName: 'playfair.originals',  // sessionStorage entry for original texts
  historyLimit: 50,                            // how many operations the history keeps
  playIntervalMs: 1400,                        // delay between steps when "Play all" runs
  toastMs: 4500,                               // how long a notification stays visible
  errorToastMs: 7000,                          // errors stay a little longer
};

// Label and style class for each Playfair rule (classes in components.css).
export const RULES = {
  row: { label: 'Rule 1 · Same row', pillClass: 'pill-row' },
  column: { label: 'Rule 2 · Same column', pillClass: 'pill-column' },
  rectangle: { label: 'Rule 3 · Rectangle', pillClass: 'pill-rectangle' },
};

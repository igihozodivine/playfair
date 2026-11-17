/*
 * history.js - Section 4: list of operations done in this browser tab.
 * Only the type, time, input and output are stored - never the key.
 */
import { SETTINGS } from './config.js';
import { byId, make, setVisible } from './dom.js';
import { toast } from './notify.js';
import { state } from './state.js';
import { readJson, removeItem, writeJson } from './storage.js';
import { selectTab } from './tabs.js';
import { formatTime, truncate } from './text.js';

const el = {
  list: byId('historyList'),
  empty: byId('historyEmpty'),
  clearBtn: byId('clearHistoryBtn'),
};

/** Add an operation at the top of the history and save it. */
export function addHistory(type, input, output) {
  state.history.unshift({ type, time: new Date().toISOString(), input, output });
  state.history = state.history.slice(0, SETTINGS.historyLimit);
  writeJson('session', SETTINGS.historyStorageName, state.history);
  renderHistory();
}

/** Draw the history list. Each entry opens to show the full texts. */
function renderHistory() {
  const isEmpty = state.history.length === 0;
  setVisible(el.empty, isEmpty);
  el.clearBtn.disabled = isEmpty;
  el.list.replaceChildren(...state.history.map(historyEntry));
}

/** Build one history entry. */
function historyEntry(entry) {
  const encrypting = entry.type === 'encrypt';

  // Closed view: type, time and a short preview.
  const badge = make('span', `pill ${encrypting ? 'pill-encrypt' : 'pill-decrypt'}`, encrypting ? 'Encryption' : 'Decryption');
  const time = make('time', 'text-base text-slate-600', formatTime(entry.time));
  time.dateTime = entry.time;
  const preview = make('span', 'min-w-0 flex-1 basis-full truncate font-mono text-base text-slate-800 sm:basis-auto',
    `${truncate(entry.input.replace(/\s+/g, ' '), 40)}  →  ${truncate(entry.output, 40)}`);
  const openHint = make('span', 'text-base font-semibold text-brand-700 group-open:hidden', 'View');
  const closeHint = make('span', 'hidden text-base font-semibold text-brand-700 group-open:inline', 'Hide');
  const summary = make('summary', 'history-summary');
  summary.append(badge, time, preview, openHint, closeHint);

  // Open view: full input, full output and a button to reuse the input.
  const textBlock = (label, value) => {
    const block = make('div');
    block.append(make('p', 'tile-label', label), make('p', 'history-text', value));
    return block;
  };
  const loadBtn = make('button', 'btn-outline', `Load into ${encrypting ? 'Encrypt' : 'Decrypt'}`);
  loadBtn.type = 'button';
  loadBtn.addEventListener('click', () => loadIntoWorkspace(entry));
  const body = make('div', 'space-y-4 border-t border-slate-100 p-4');
  body.append(
    textBlock(encrypting ? 'Text' : 'Ciphertext', entry.input),
    textBlock(encrypting ? 'Ciphertext' : 'Decrypted text', entry.output),
    loadBtn,
  );

  const details = make('details', 'group');
  details.append(summary, body);
  const item = make('li', 'history-item');
  item.append(details);
  return item;
}

/** Put a past input back into the Encrypt or Decrypt box. */
function loadIntoWorkspace(entry) {
  const encrypting = entry.type === 'encrypt';
  const input = byId(encrypting ? 'encryptInput' : 'decryptInput');
  selectTab(entry.type);
  input.value = entry.input;
  byId('workspace').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => input.focus({ preventScroll: true }), 400);
  toast('info', `Loaded. Click “${encrypting ? 'Encrypt' : 'Decrypt'}” to run it with the active key.`);
}

/** "Clear history" button. */
function clearHistory() {
  if (!window.confirm('Clear the history for this tab?')) return;
  state.history = [];
  removeItem('session', SETTINGS.historyStorageName);
  renderHistory();
  toast('info', 'History cleared.');
}

/** Load the saved history and connect the "Clear history" button. */
export function initHistory() {
  const saved = readJson('session', SETTINGS.historyStorageName);
  state.history = Array.isArray(saved) ? saved : [];
  el.clearBtn.addEventListener('click', clearHistory);
  renderHistory();
}

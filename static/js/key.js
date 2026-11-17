/*
 * key.js - Section 1: saving, changing, showing and forgetting the key,
 * and drawing the key's matrix.
 */
import { postJson } from './api.js';
import { SETTINGS } from './config.js';
import { byId, setVisible } from './dom.js';
import { drawMatrix, enableRowColumnHover } from './matrix.js';
import { toast, setLoading } from './notify.js';
import { state } from './state.js';
import { readJson, removeItem, writeJson } from './storage.js';
import { normalizeKey, normalizeLetters } from './text.js';

const el = {
  status: byId('keyStatus'),
  statusText: byId('keyStatusText'),
  form: byId('keyForm'),
  input: byId('keyInput'),
  preview: byId('keyPreview'),
  previewValue: byId('keyPreviewValue'),
  saveBtn: byId('saveKeyBtn'),
  changeBtn: byId('changeKeyBtn'),
  activeKey: byId('activeKeyDisplay'),
  toggleBtn: byId('toggleKeyBtn'),
  forgetBtn: byId('forgetKeyBtn'),
  matrixEmpty: byId('matrixEmpty'),
  matrixGrid: byId('matrixGrid'),
  matrixInfo: byId('matrixInfo'),
  matrixCaption: byId('matrixCaption'),
};

/** Update everything in section 1 (and the header badge) from `state`. */
export function renderKeyState() {
  const hasKey = Boolean(state.key);

  // Header badge: green when a key is saved, amber when not.
  el.status.classList.toggle('status-ready', hasKey);
  el.status.classList.toggle('status-missing', !hasKey);
  el.statusText.textContent = hasKey ? 'Key saved' : 'No key';

  // The input is usable when there is no key yet, or after "Change key".
  const canType = !hasKey || state.editingKey;
  el.input.disabled = !canType;
  el.saveBtn.disabled = !canType;
  el.changeBtn.disabled = !hasKey;
  el.changeBtn.textContent = state.editingKey ? 'Cancel' : 'Change key';
  el.input.placeholder = canType ? 'e.g. PLAYFAIR EXAMPLE' : 'Key saved';
  if (!canType) el.input.value = '';
  updatePreview();

  // Active key: hidden behind dots unless "Show key" is on.
  el.toggleBtn.disabled = !hasKey;
  el.forgetBtn.disabled = !hasKey;
  el.toggleBtn.textContent = state.keyVisible ? 'Hide key' : 'Show key';
  el.toggleBtn.setAttribute('aria-pressed', String(state.keyVisible));
  el.activeKey.classList.toggle('active-key-empty', !hasKey);
  if (!hasKey) el.activeKey.textContent = 'Not set';
  else el.activeKey.textContent = state.keyVisible ? state.key : '••••••••';

  renderMatrix();
}

/** Draw the matrix, colouring the letters that came from the key. */
function renderMatrix() {
  const hasMatrix = Boolean(state.matrix);
  setVisible(el.matrixEmpty, !hasMatrix);
  setVisible(el.matrixGrid, hasMatrix);
  setVisible(el.matrixInfo, hasMatrix);
  if (!hasMatrix) return;

  const { grid, key_length: keyLength } = state.matrix;
  // The first `keyLength` cells (reading row by row) are the key letters.
  drawMatrix(el.matrixGrid, grid, (row, col) => (row * 5 + col < keyLength ? 'cell-key' : 'cell-plain'));
  // Make the cells appear one after another, then remove the animation
  // so it does not block the hover effect.
  [...el.matrixGrid.children].forEach((cell, i) => {
    cell.classList.add('animate-pop');
    cell.style.animationDelay = `${i * 18}ms`;
    cell.addEventListener('animationend', () => cell.classList.remove('animate-pop'), { once: true });
  });
}

/** Show the cleaned-up key letters while the user types. */
function updatePreview() {
  const letters = normalizeKey(el.input.value);
  setVisible(el.preview, Boolean(letters) && !el.input.disabled);
  el.previewValue.textContent = letters;
}

/** "Save key": check the key, ask the server for the matrix, then store it. */
async function saveKey(event) {
  event.preventDefault();   // stop the form from reloading the page
  const key = el.input.value;

  if (!key.trim()) {
    toast('warning', 'Please enter a secret key before saving.');
    el.input.focus();
    return;
  }
  if (!normalizeLetters(key)) {
    toast('error', 'The key must contain at least one letter from A to Z.');
    el.input.focus();
    return;
  }

  const isChange = Boolean(state.key);
  setLoading(el.saveBtn, true, 'Generating…');
  try {
    const matrix = await postJson('/api/matrix', { key });
    state.key = key;
    state.matrix = matrix;
    state.editingKey = false;
    state.keyVisible = false;
    if (!writeJson('local', SETTINGS.keyStorageName, { key })) {
      toast('warning', 'The key is active, but this browser blocked storage, so it will be lost on refresh.');
    }
    toast('success', isChange
      ? 'Key changed. The matrix was regenerated and new operations will use it.'
      : 'Key saved. The 5×5 matrix has been generated.');
  } catch (error) {
    toast('error', error.message);
  } finally {
    setLoading(el.saveBtn, false);
    renderKeyState();
  }
}

/** "Change key" opens the input; "Cancel" closes it again. */
function toggleChangeKey() {
  state.editingKey = !state.editingKey;
  renderKeyState();
  if (state.editingKey) el.input.focus();
}

/** "Forget key": remove the key from the page and from the browser. */
function forgetKey() {
  if (!window.confirm('Remove the active key from this browser?')) return;
  state.key = null;
  state.matrix = null;
  state.keyVisible = false;
  state.editingKey = false;
  removeItem('local', SETTINGS.keyStorageName);
  renderKeyState();
  toast('info', 'The key was removed from this browser.');
}

/** On page load: bring back a key saved earlier and rebuild its matrix. */
export async function restoreKey() {
  const saved = readJson('local', SETTINGS.keyStorageName);
  if (typeof saved?.key === 'string' && saved.key.trim()) {
    try {
      state.matrix = await postJson('/api/matrix', { key: saved.key });
      state.key = saved.key;
      toast('info', 'Your saved key was restored.');
    } catch (error) {
      toast('error', `Could not restore the saved key: ${error.message}`);
    }
  }
  renderKeyState();
}

/** Returns true if a key is saved; otherwise warns and jumps to the key box. */
export function requireKey() {
  if (state.key) return true;
  toast('warning', 'No key configured. Enter and save a secret key first.');
  byId('key-section').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => el.input.focus({ preventScroll: true }), 400);
  return false;
}

/** Connect the buttons and inputs of section 1. */
export function initKey() {
  el.form.addEventListener('submit', saveKey);
  el.input.addEventListener('input', updatePreview);
  el.input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.editingKey) toggleChangeKey();
  });
  el.changeBtn.addEventListener('click', toggleChangeKey);
  el.toggleBtn.addEventListener('click', () => {
    state.keyVisible = !state.keyVisible;
    renderKeyState();
  });
  el.forgetBtn.addEventListener('click', forgetKey);
  enableRowColumnHover(el.matrixGrid, el.matrixCaption, 'Point at a letter to see its row and column.');
  renderKeyState();
}

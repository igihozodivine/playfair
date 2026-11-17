/*
 * cipher.js - Section 2: the Encrypt and Decrypt tabs.
 * The actual cipher runs in Python (playfair.py); this file sends the text
 * to the server and shows the answer.
 */
import { postJson } from './api.js';
import { byId, make, setOutput, setVisible, showPairsLine } from './dom.js';
import { addHistory } from './history.js';
import { requireKey } from './key.js';
import { copyText, setLoading, toast } from './notify.js';
import { findOriginal, rememberOriginal } from './originals.js';
import { state } from './state.js';
import { clearExplanation, showExplanation } from './steps.js';
import { normalizeLetters, plural } from './text.js';

const el = {
  encryptInput: byId('encryptInput'),
  encryptBtn: byId('encryptBtn'),
  encryptClearBtn: byId('encryptClearBtn'),
  encryptOutput: byId('encryptOutput'),
  encryptPairs: byId('encryptPairs'),
  encryptCopyBtn: byId('encryptCopyBtn'),
  encryptStepsBtn: byId('encryptStepsBtn'),

  decryptInput: byId('decryptInput'),
  removeFillers: byId('removeFillers'),
  decryptBtn: byId('decryptBtn'),
  decryptClearBtn: byId('decryptClearBtn'),
  decryptOutput: byId('decryptOutput'),
  decryptInfo: byId('decryptInfo'),
  decryptPairs: byId('decryptPairs'),
  decryptCopyBtn: byId('decryptCopyBtn'),
  decryptStepsBtn: byId('decryptStepsBtn'),
};

/* ===================================================================== */
/* Encryption                                                             */
/* ===================================================================== */

/** Show the last encryption result (or empty boxes). */
function renderEncryption() {
  const result = state.lastEncrypt;
  setOutput(el.encryptOutput, result?.result);
  showPairsLine(el.encryptPairs, result?.digraphs);
  el.encryptCopyBtn.disabled = !result;
  el.encryptStepsBtn.disabled = !result;
}

/** "Encrypt" button. */
async function encrypt() {
  if (!requireKey()) return;
  const text = el.encryptInput.value;

  if (!text.trim()) {
    toast('warning', 'Please enter some text to encrypt.');
    el.encryptInput.focus();
    return;
  }
  if (!normalizeLetters(text)) {
    toast('error', 'The text must contain at least one letter (A–Z).');
    return;
  }

  setLoading(el.encryptBtn, true, 'Encrypting…');
  try {
    const result = await postJson('/api/encrypt', { key: state.key, text });
    state.lastEncrypt = result;
    await rememberOriginal(result);
    renderEncryption();
    addHistory('encrypt', text, result.result);
    showExplanation('encrypt');
    toast('success', `Encrypted ${plural(result.steps.length, 'letter pair')}.`);
  } catch (error) {
    toast('error', error.message);
  } finally {
    setLoading(el.encryptBtn, false);
  }
}

/** "Clear" button on the Encrypt tab. */
function clearEncryption() {
  el.encryptInput.value = '';
  state.lastEncrypt = null;
  renderEncryption();
  clearExplanation('encrypt');
  el.encryptInput.focus();
}

/* ===================================================================== */
/* Decryption                                                             */
/* ===================================================================== */

/**
 * Show the last decryption result. Three cases:
 *  1. The text was encrypted earlier in this tab -> show the original text.
 *  2. "Remove filler X" is ticked                -> show text without fillers.
 *  3. Otherwise                                  -> show exact output, fillers highlighted.
 */
function renderDecryption() {
  const result = state.lastDecrypt;
  el.decryptCopyBtn.disabled = !result;
  el.decryptStepsBtn.disabled = !result;
  showPairsLine(el.decryptPairs, result?.digraphs);
  setVisible(el.decryptInfo, Boolean(result));
  if (!result) {
    setOutput(el.decryptOutput, '');
    return;
  }

  const removeFillers = el.removeFillers.checked;
  const fillerCount = result.suspected_fillers.length;
  result.fillers_removed = removeFillers;

  if (result.original_text) {
    // Case 1
    result.result = result.original_text;
    setOutput(el.decryptOutput, result.original_text);
    const playfairText = removeFillers ? result.cleaned_result : result.raw_result;
    el.decryptInfo.textContent = `Original text restored. Playfair output: ${playfairText}`;
  } else if (removeFillers) {
    // Case 2
    result.result = result.cleaned_result;
    setOutput(el.decryptOutput, result.cleaned_result);
    const removed = fillerCount ? `Removed ${plural(fillerCount, 'filler letter')}. ` : '';
    el.decryptInfo.textContent = `${removed}Spaces and punctuation are not kept by the Playfair cipher.`;
  } else {
    // Case 3
    result.result = result.raw_result;
    const fillers = new Set(result.suspected_fillers);
    const letters = [...result.raw_result].map((letter, i) => (
      fillers.has(i) ? make('span', 'filler', letter) : document.createTextNode(letter)
    ));
    el.decryptOutput.replaceChildren(...letters);
    el.decryptOutput.classList.remove('output-empty');
    el.decryptInfo.textContent = fillerCount
      ? `${plural(fillerCount, 'likely filler letter')} highlighted.`
      : 'No filler letters found.';
  }
}

/** "Decrypt" button. */
async function decrypt() {
  if (!requireKey()) return;
  const text = el.decryptInput.value;
  const letters = normalizeLetters(text);

  if (!text.trim()) {
    toast('warning', 'Please enter some ciphertext to decrypt.');
    el.decryptInput.focus();
    return;
  }
  if (!letters) {
    toast('error', 'The ciphertext must contain letters (A–Z).');
    return;
  }
  if (letters.length % 2 !== 0) {
    toast('error', `Invalid ciphertext: it has ${letters.length} letters, but Playfair ciphertext always has an even number.`);
    return;
  }

  setLoading(el.decryptBtn, true, 'Decrypting…');
  try {
    const result = await postJson('/api/decrypt', {
      key: state.key,
      text,
      remove_fillers: el.removeFillers.checked,
    });
    result.original_text = await findOriginal(result);
    state.lastDecrypt = result;
    renderDecryption();
    addHistory('decrypt', text, result.result);
    showExplanation('decrypt');
    toast('success', `Decrypted ${plural(result.steps.length, 'letter pair')}.`);
  } catch (error) {
    toast('error', error.message);
  } finally {
    setLoading(el.decryptBtn, false);
  }
}

/** "Clear" button on the Decrypt tab. */
function clearDecryption() {
  el.decryptInput.value = '';
  state.lastDecrypt = null;
  renderDecryption();
  clearExplanation('decrypt');
  el.decryptInput.focus();
}

/* ===================================================================== */
/* Wiring                                                                 */
/* ===================================================================== */

/** Ctrl+Enter (or Cmd+Enter) inside a text box runs the action. */
function runOnCtrlEnter(input, action) {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) action();
  });
}

/** Connect the buttons of section 2. */
export function initCipher() {
  el.encryptBtn.addEventListener('click', encrypt);
  el.encryptClearBtn.addEventListener('click', clearEncryption);
  el.encryptCopyBtn.addEventListener('click', () => {
    copyText(state.lastEncrypt.result, el.encryptCopyBtn, 'Ciphertext copied.');
  });
  el.encryptStepsBtn.addEventListener('click', () => showExplanation('encrypt', true));
  runOnCtrlEnter(el.encryptInput, encrypt);

  el.decryptBtn.addEventListener('click', decrypt);
  el.decryptClearBtn.addEventListener('click', clearDecryption);
  el.removeFillers.addEventListener('change', () => {
    renderDecryption();
    if (state.explainOp === 'decrypt') showExplanation('decrypt');
  });
  el.decryptCopyBtn.addEventListener('click', () => {
    copyText(state.lastDecrypt.result, el.decryptCopyBtn, 'Decrypted text copied.');
  });
  el.decryptStepsBtn.addEventListener('click', () => showExplanation('decrypt', true));
  runOnCtrlEnter(el.decryptInput, decrypt);

  renderEncryption();
  renderDecryption();
}

/*
 * originals.js - Remembers the exact text you encrypted, so decrypting the
 * same ciphertext with the same key gives back that text (with spaces,
 * punctuation and lowercase letters, which Playfair itself cannot keep).
 *
 * The lookup id is a SHA-256 fingerprint of "key letters | ciphertext",
 * so the key itself is never written to storage.
 */
import { SETTINGS } from './config.js';
import { state } from './state.js';
import { readJson, writeJson } from './storage.js';

/** Build the lookup id. Without Web Crypto it is kept in memory only. */
async function fingerprint(keyLetters, ciphertext) {
  const text = `${keyLetters}|${ciphertext}`;
  if (!window.crypto?.subtle) return { id: text, canSave: false };
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { id: hex, canSave: true };
}

/** After encrypting: remember original text for this key + ciphertext. */
export async function rememberOriginal(encryption) {
  const { id, canSave } = await fingerprint(encryption.matrix.normalized_key, encryption.result);
  state.originals.delete(id);                                    // move to newest position
  state.originals.set(id, { text: encryption.original, canSave });

  // Keep the list short: drop the oldest entries.
  while (state.originals.size > SETTINGS.historyLimit) {
    state.originals.delete(state.originals.keys().next().value);
  }

  // Save the fingerprinted entries for this browser tab.
  const toSave = {};
  state.originals.forEach((entry, entryId) => { if (entry.canSave) toSave[entryId] = entry.text; });
  writeJson('session', SETTINGS.originalsStorageName, toSave);
}

/** After decrypting: return the original text, or null if unknown. */
export async function findOriginal(decryption) {
  const { id } = await fingerprint(decryption.matrix.normalized_key, decryption.normalized);
  return state.originals.get(id)?.text ?? null;
}

/** On page load: read entries saved earlier in this tab. */
export function loadOriginals() {
  const saved = readJson('session', SETTINGS.originalsStorageName) || {};
  Object.entries(saved).forEach(([id, text]) => state.originals.set(id, { text, canSave: true }));
}

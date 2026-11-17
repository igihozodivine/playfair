/*
 * state.js - Everything the page currently "remembers", in one object.
 * Every module imports this same object, so they all see the same values.
 */

export const state = {
  key: null,            // the active key exactly as typed (null = no key)
  matrix: null,         // { normalized_key, key_length, grid } from the server
  keyVisible: false,    // true when "Show key" is on
  editingKey: false,    // true while the user is typing a new key

  lastEncrypt: null,    // full result of the last encryption (from /api/encrypt)
  lastDecrypt: null,    // full result of the last decryption (from /api/decrypt)

  explainOp: null,      // which result section 3 explains: 'encrypt' or 'decrypt'
  stepIndex: 0,         // which letter pair is selected in section 3
  playTimer: null,      // timer id while "Play all" is running

  history: [],          // list of past operations shown in section 4
  originals: new Map(), // fingerprint of key + ciphertext -> original text
};

/*
 * text.js - Text helpers.
 * normalizeLetters/normalizeKey copy the rules in playfair.py. They are only
 * used for instant previews and checks; the real cipher work is done in Python.
 */

/** Uppercase, keep only A-Z, and replace J with I. */
export function normalizeLetters(text) {
  return text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
}

/** Normalise a key and remove repeated letters ("HELLO" -> "HELO"). */
export function normalizeKey(key) {
  return [...new Set(normalizeLetters(key))].join('');
}

/** Shorten long text for previews: "ABCDEFGHIJ" -> "ABCDE…". */
export function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/** Format an ISO date as a readable local date and time. */
export function formatTime(isoDate) {
  return new Date(isoDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "1 pair" / "3 pairs". */
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

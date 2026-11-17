/*
 * learn.js - The "Learn Playfair" pop-up with a short summary of the cipher.
 * Uses the browser's built-in <dialog>, so the Esc key closes it automatically.
 */
import { byId } from './dom.js';

/** Connect the "Learn Playfair" button and the pop-up's close buttons. */
export function initLearn() {
  const dialog = byId('learnDialog');
  const close = () => dialog.close();

  byId('learnBtn').addEventListener('click', () => dialog.showModal());
  byId('learnCloseBtn').addEventListener('click', close);
  byId('learnOkBtn').addEventListener('click', close);

  // Clicking the dark area outside the box also closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
}

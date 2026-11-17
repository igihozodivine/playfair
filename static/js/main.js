/*
 * main.js - Starting point of the page's JavaScript.
 * Each section of the page has its own module; this file starts them all.
 *
 *   key.js      Section 1  secret key and matrix
 *   tabs.js     Section 2  Encrypt / Decrypt tabs
 *   cipher.js   Section 2  encryption and decryption
 *   steps.js    Section 3  step-by-step explanation
 *   history.js  Section 4  operation history
 *   learn.js    "Learn Playfair" pop-up
 */
import { initCipher } from './cipher.js';
import { initHistory } from './history.js';
import { initKey, restoreKey } from './key.js';
import { initLearn } from './learn.js';
import { loadOriginals } from './originals.js';
import { initSteps } from './steps.js';
import { initTabs } from './tabs.js';

initLearn();
initTabs();
initKey();
initSteps();
initCipher();
initHistory();
loadOriginals();
restoreKey();   // last: brings back a key saved in an earlier visit

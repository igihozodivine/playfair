/*
 * tabs.js - The Encrypt / Decrypt tabs in section 2.
 */
import { byId, setVisible } from './dom.js';

const tabs = {
  encrypt: { tab: byId('tabEncrypt'), panel: byId('panelEncrypt') },
  decrypt: { tab: byId('tabDecrypt'), panel: byId('panelDecrypt') },
};

/** Show one tab ('encrypt' or 'decrypt') and hide the other. */
export function selectTab(name, moveFocus = false) {
  Object.entries(tabs).forEach(([tabName, { tab, panel }]) => {
    const active = tabName === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    setVisible(panel, active);
  });
  if (moveFocus) tabs[name].tab.focus();
}

/** Clicking a tab opens it; the left/right arrow keys switch tabs. */
export function initTabs() {
  Object.entries(tabs).forEach(([name, { tab }]) => {
    tab.addEventListener('click', () => selectTab(name));
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        selectTab(name === 'encrypt' ? 'decrypt' : 'encrypt', true);
      }
    });
  });
}

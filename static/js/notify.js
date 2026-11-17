/*
 * notify.js - User feedback: notifications, loading buttons and copying.
 */
import { SETTINGS } from './config.js';
import { byId, make } from './dom.js';

const TOAST_ICONS = { success: '✓', error: '!', warning: '!', info: 'i' };

/** Show a notification. type: 'success' | 'error' | 'warning' | 'info'. */
export function toast(type, message) {
  const box = make('div', `toast toast-${type}`);
  box.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = make('span', 'toast-icon', TOAST_ICONS[type]);
  const text = make('p', 'flex-1 pt-0.5 font-medium', message);
  const close = make('button', 'toast-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close notification');
  close.addEventListener('click', () => box.remove());

  box.append(icon, text, close);
  byId('toasts').append(box);

  // Remove it automatically after a few seconds.
  const delay = type === 'error' ? SETTINGS.errorToastMs : SETTINGS.toastMs;
  setTimeout(() => box.remove(), delay);
}

/** Show a spinner and a label in a button while waiting for the server. */
export function setLoading(button, isLoading, label = 'Working…') {
  if (isLoading) {
    button.dataset.label = button.textContent;   // remember the normal label
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.replaceChildren(make('span', 'spinner'), label);
  } else {
    button.textContent = button.dataset.label;   // restore the normal label
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

/** Copy text to the clipboard and briefly show "Copied!" on the button. */
export async function copyText(text, button, successMessage) {
  if (button.dataset.copying) return;            // ignore double clicks

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    if (!copyWithTextarea(text)) {
      toast('error', 'Copy failed. Please select the text and copy it manually.');
      return;
    }
  }

  button.dataset.copying = 'true';
  const label = button.textContent;
  button.textContent = 'Copied!';
  setTimeout(() => {
    button.textContent = label;
    delete button.dataset.copying;
  }, 1500);
  toast('success', successMessage);
}

/** Older copy method, used when the clipboard API is not available. */
function copyWithTextarea(text) {
  const area = make('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied;
}

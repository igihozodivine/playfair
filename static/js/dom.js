/*
 * dom.js - Small helpers for creating and updating page elements.
 */

/** Find an element by its id. */
export const byId = (id) => document.getElementById(id);

/** Create an element with optional classes and text. */
export function make(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Show or hide an element (uses Tailwind's "hidden" class). */
export function setVisible(node, visible) {
  node.classList.toggle('hidden', !visible);
}

/** Put text in a result box, or a grey dash when there is no text. */
export function setOutput(box, text) {
  box.textContent = text || '—';
  box.classList.toggle('output-empty', !text);
}

/**
 * Turn a letter pair from the server, e.g. { pair: "LX", inserted: [null, "separator"] },
 * into page nodes. Inserted filler letters get the yellow "filler" highlight.
 */
export function pairNodes(digraph) {
  return [...digraph.pair].map((letter, i) => {
    const kind = digraph.inserted[i];
    if (!kind) return document.createTextNode(letter);
    const span = make('span', 'filler', letter);
    span.title = kind === 'padding' ? 'Padding letter' : 'Separator between repeated letters';
    return span;
  });
}

/** Write "Pairs: HI DE TH ..." into a line under a result, or hide the line. */
export function showPairsLine(line, digraphs) {
  line.replaceChildren();
  setVisible(line, Boolean(digraphs));
  if (!digraphs) return;
  const pairs = make('span', 'font-mono font-semibold tracking-wider text-slate-800');
  digraphs.forEach((digraph, i) => {
    if (i > 0) pairs.append(' ');
    pairs.append(...pairNodes(digraph));
  });
  line.append('Pairs: ', pairs);
}

/** Scroll a child into view inside a scrollable box, without moving the page. */
export function scrollWithin(box, child, topSpace = 0) {
  const boxRect = box.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (childRect.top < boxRect.top + topSpace) {
    box.scrollTop -= boxRect.top + topSpace - childRect.top + 8;
  } else if (childRect.bottom > boxRect.bottom) {
    box.scrollTop += childRect.bottom - boxRect.bottom + 8;
  }
}

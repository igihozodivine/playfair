/*
 * matrix.js - Draws a 5x5 Playfair matrix. Both matrices on the page use
 * drawMatrix(), so they always look the same.
 */
import { make } from './dom.js';

/**
 * Draw the 25 letters of `grid` into `container`.
 * `styleOf(row, col)` returns the colour class of each cell
 * (cell-plain, cell-key, cell-input, ... in components.css).
 */
export function drawMatrix(container, grid, styleOf) {
  container.replaceChildren();
  grid.forEach((letters, row) => {
    letters.forEach((letter, col) => {
      const cell = make('div', `matrix-cell ${styleOf(row, col)}`, letter);
      cell.setAttribute('role', 'gridcell');
      // Remember where the cell is, for the hover effect below.
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.letter = letter;
      // I and J share one cell, so show a small "/J" next to the I.
      if (letter === 'I') {
        cell.append(make('span', 'matrix-cell-j', '/J'));
        cell.setAttribute('aria-label', 'I or J');
      }
      container.append(cell);
    });
  });
}

/**
 * When the mouse is over a cell, outline its whole row and column and
 * describe the position in `caption`. Helps students read coordinates.
 */
export function enableRowColumnHover(container, caption, defaultText) {
  const reset = () => {
    container.querySelectorAll('.cell-cross, .cell-hovered')
      .forEach((cell) => cell.classList.remove('cell-cross', 'cell-hovered'));
    caption.textContent = defaultText;
  };

  container.addEventListener('mouseover', (event) => {
    const cell = event.target.closest('.matrix-cell');
    if (!cell) return;
    reset();
    const { row, col, letter } = cell.dataset;
    container.querySelectorAll('.matrix-cell').forEach((other) => {
      if (other.dataset.row === row || other.dataset.col === col) other.classList.add('cell-cross');
    });
    cell.classList.add('cell-hovered');
    const name = letter === 'I' ? 'I/J' : letter;
    caption.textContent = `${name} is in row ${Number(row) + 1}, column ${Number(col) + 1}.`;
  });

  container.addEventListener('mouseleave', reset);
  reset();
}

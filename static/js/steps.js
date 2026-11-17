/*
 * steps.js - Section 3: the step-by-step explanation of the last
 * encryption or decryption, with the matrix highlighted for each pair.
 */
import { RULES, SETTINGS } from './config.js';
import { byId, make, pairNodes, scrollWithin, setVisible } from './dom.js';
import { drawMatrix } from './matrix.js';
import { state } from './state.js';
import { plural } from './text.js';

const el = {
  subtitle: byId('explainSubtitle'),
  encBtn: byId('explainEncBtn'),
  decBtn: byId('explainDecBtn'),
  content: byId('explainContent'),
  pairs: byId('exPairs'),
  matrix: byId('stepMatrix'),
  index: byId('stepIndex'),
  total: byId('stepTotal'),
  rule: byId('stepRule'),
  input: byId('stepInput'),
  output: byId('stepOutput'),
  mapping: byId('stepMapping'),
  explanation: byId('stepExplanation'),
  prevBtn: byId('stepPrevBtn'),
  playBtn: byId('stepPlayBtn'),
  nextBtn: byId('stepNextBtn'),
  // "Show full details" area
  original: byId('exOriginal'),
  normalized: byId('exNormalized'),
  preparedLabel: byId('exPreparedLabel'),
  prepared: byId('exPrepared'),
  resultLabel: byId('exResultLabel'),
  result: byId('exResult'),
  notes: byId('exNotes'),
  table: byId('stepTable'),
};

const EMPTY_SUBTITLE = 'Encrypt or decrypt something to see each letter pair transformed.';

/** The result currently being explained (or null). */
function currentResult() {
  return state.explainOp === 'encrypt' ? state.lastEncrypt : state.lastDecrypt;
}

/** Enable the Encryption/Decryption toggle buttons that have a result. */
function updateToggles() {
  el.encBtn.disabled = !state.lastEncrypt;
  el.decBtn.disabled = !state.lastDecrypt;
  el.encBtn.setAttribute('aria-pressed', String(state.explainOp === 'encrypt'));
  el.decBtn.setAttribute('aria-pressed', String(state.explainOp === 'decrypt'));
}

/** Explain the last 'encrypt' or 'decrypt' result. */
export function showExplanation(op, scrollToSection = false) {
  stopPlay();
  state.explainOp = op;
  state.stepIndex = 0;
  render();
  if (scrollToSection) byId('explanation').scrollIntoView({ behavior: 'smooth' });
}

/** Called when a result is cleared: hide the section if it showed that result. */
export function clearExplanation(op) {
  if (state.explainOp === op) {
    stopPlay();
    state.explainOp = null;
  }
  render();
}

/** Fill in section 3 from the current result. */
function render() {
  updateToggles();
  const result = currentResult();
  setVisible(el.content, Boolean(result));
  if (!result) {
    el.subtitle.textContent = EMPTY_SUBTITLE;
    return;
  }

  const encrypting = result.operation === 'encrypt';
  el.subtitle.textContent = `${encrypting ? 'Encryption' : 'Decryption'} of ${plural(result.steps.length, 'letter pair')}.`;

  renderPairButtons(result);
  renderDetails(result, encrypting);
  selectStep(0);
}

/** One button per letter pair, e.g. "HI → BM". */
function renderPairButtons(result) {
  el.pairs.replaceChildren(...result.steps.map((step, i) => {
    const button = make('button', 'chip');
    button.type = 'button';
    button.append(
      make('span', '', step.input),
      make('span', 'chip-arrow', '→'),
      make('span', 'chip-out', step.output),
    );
    button.addEventListener('click', () => { stopPlay(); selectStep(i); });
    return button;
  }));
}

/** The "Show full details" area: text stages, notes and the full table. */
function renderDetails(result, encrypting) {
  el.original.textContent = result.original;
  el.normalized.textContent = result.normalized;

  el.preparedLabel.textContent = encrypting ? 'Prepared pairs' : 'Ciphertext pairs';
  el.prepared.replaceChildren();
  result.digraphs.forEach((digraph, i) => {
    if (i > 0) el.prepared.append(' ');
    el.prepared.append(...pairNodes(digraph));
  });

  if (encrypting) el.resultLabel.textContent = 'Ciphertext';
  else if (result.original_text) el.resultLabel.textContent = 'Plaintext (original text restored)';
  else if (result.fillers_removed) el.resultLabel.textContent = 'Plaintext (fillers removed)';
  else el.resultLabel.textContent = 'Plaintext';
  el.result.textContent = result.result;

  el.notes.replaceChildren(...result.notes.map((note) => make('li', '', note)));

  el.table.replaceChildren(...result.steps.map((step, i) => {
    const row = make('tr');
    const rulePill = make('span', `pill ${RULES[step.rule].pillClass}`, RULES[step.rule].label);
    const positions = step.positions.map(([r, c], k) => `${step.input[k]}(${r + 1},${c + 1})`).join('  ');
    const ruleCell = make('td');
    ruleCell.append(rulePill);
    row.append(
      make('td', 'text-slate-500', String(i + 1)),
      make('td', 'font-mono font-bold tracking-widest text-brand-700', step.input),
      make('td', 'font-mono text-slate-700', positions),
      ruleCell,
      make('td', 'font-mono font-bold tracking-widest text-accent-700', step.output),
    );
    row.addEventListener('click', () => { stopPlay(); selectStep(i); });
    return row;
  }));
}

/** Choose the colour of each matrix cell for one step. */
function cellStyleForStep(step) {
  const [[r1, c1], [r2, c2]] = step.positions;
  const isInput = (r, c) => step.positions.some(([pr, pc]) => pr === r && pc === c);
  const isOutput = (r, c) => step.output_positions.some(([pr, pc]) => pr === r && pc === c);
  const inRuleArea = (r, c) => {
    if (step.rule === 'row') return r === r1;
    if (step.rule === 'column') return c === c1;
    // Rectangle: every cell between the two letters.
    return r >= Math.min(r1, r2) && r <= Math.max(r1, r2) && c >= Math.min(c1, c2) && c <= Math.max(c1, c2);
  };

  return (r, c) => {
    if (isInput(r, c) && isOutput(r, c)) return 'cell-both';
    if (isInput(r, c)) return 'cell-input';
    if (isOutput(r, c)) return 'cell-output';
    if (inRuleArea(r, c)) return 'cell-region';
    return 'cell-faded';
  };
}

/** Show letter pair number `index` (0-based). */
function selectStep(index) {
  const result = currentResult();
  if (!result) return;
  const step = result.steps[index];
  const rule = RULES[step.rule];
  state.stepIndex = index;

  el.index.textContent = String(index + 1);
  el.total.textContent = String(result.steps.length);
  el.rule.className = `pill ${rule.pillClass}`;
  el.rule.textContent = rule.label;
  el.input.textContent = step.input;
  el.output.textContent = step.output;
  el.explanation.textContent = step.explanation;

  // One line per letter: "H (row 3, col 5)  →  B (row 3, col 1)".
  el.mapping.replaceChildren(...[0, 1].map((k) => {
    const [r, c] = step.positions[k];
    const [outR, outC] = step.output_positions[k];
    return make('span', 'block',
      `${step.input[k]} (row ${r + 1}, col ${c + 1})  →  ${step.output[k]} (row ${outR + 1}, col ${outC + 1})`);
  }));

  drawMatrix(el.matrix, result.matrix.grid, cellStyleForStep(step));

  el.prevBtn.disabled = index === 0;
  el.nextBtn.disabled = index === result.steps.length - 1;

  // Mark the selected pair button and table row.
  [...el.pairs.children].forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index));
    if (i === index) scrollWithin(el.pairs, button);
  });
  [...el.table.children].forEach((row, i) => {
    row.setAttribute('aria-selected', String(i === index));
    if (i === index) scrollWithin(el.table.closest('.table-wrap'), row, 48);
  });
}

/** Stop "Play all". */
function stopPlay() {
  clearInterval(state.playTimer);
  state.playTimer = null;
  el.playBtn.textContent = 'Play all';
}

/** "Play all" walks through every pair automatically; click again to pause. */
function togglePlay() {
  const result = currentResult();
  if (!result) return;
  if (state.playTimer) {
    stopPlay();
    return;
  }
  if (state.stepIndex === result.steps.length - 1) selectStep(0);   // restart from the beginning
  el.playBtn.textContent = 'Pause';
  state.playTimer = setInterval(() => {
    if (state.stepIndex >= result.steps.length - 1) stopPlay();
    else selectStep(state.stepIndex + 1);
  }, SETTINGS.playIntervalMs);
}

/** Connect the buttons of section 3. */
export function initSteps() {
  el.encBtn.addEventListener('click', () => showExplanation('encrypt'));
  el.decBtn.addEventListener('click', () => showExplanation('decrypt'));
  el.prevBtn.addEventListener('click', () => { stopPlay(); selectStep(state.stepIndex - 1); });
  el.nextBtn.addEventListener('click', () => { stopPlay(); selectStep(state.stepIndex + 1); });
  el.playBtn.addEventListener('click', togglePlay);
  render();
}

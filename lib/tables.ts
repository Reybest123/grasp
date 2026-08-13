// Tables inside the note editor.
//
// Built and navigated by hand for the same reason lists are (see lib/richText.ts):
// execCommand has no table support at all, and letting contentEditable's default
// Enter/Tab handling loose inside a table quickly produces rows with the wrong
// number of cells. Everything here works on the DOM directly.

export type Cell = HTMLTableCellElement;

export const MAX_ROWS = 8;
export const MAX_COLS = 6;

/** An empty cell still needs a line box, or it collapses to nothing. */
function blankCell(tag: "td" | "th"): Cell {
  const cell = document.createElement(tag) as Cell;
  cell.appendChild(document.createElement("br"));
  return cell;
}

function blankRow(cols: number, tag: "td" | "th"): HTMLTableRowElement {
  const tr = document.createElement("tr");
  for (let i = 0; i < cols; i += 1) tr.appendChild(blankCell(tag));
  return tr;
}

/**
 * A `rows` x `cols` table whose first row is a header — a table in class notes
 * is nearly always labelled, and a plain grid is one Backspace away anyway.
 */
export function buildTable(rows: number, cols: number): HTMLTableElement {
  const r = Math.min(Math.max(rows, 1), MAX_ROWS);
  const c = Math.min(Math.max(cols, 1), MAX_COLS);

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  tbody.appendChild(blankRow(c, "th"));
  for (let i = 1; i < r; i += 1) tbody.appendChild(blankRow(c, "td"));
  table.appendChild(tbody);
  return table;
}

export function closestCell(editorEl: HTMLElement, node: Node | null): Cell | null {
  if (!node || !editorEl.contains(node)) return null;
  const start = node instanceof Element ? node : node.parentElement;
  const cell = start?.closest("td, th") as Cell | null;
  return cell && editorEl.contains(cell) ? cell : null;
}

/** Every cell of `table` in reading order. */
function cellsOf(table: HTMLTableElement): Cell[] {
  return Array.from(table.querySelectorAll<Cell>("td, th"));
}

/** True when no cell in the table holds anything the student typed. */
export function tableIsEmpty(table: HTMLTableElement): boolean {
  return cellsOf(table).every((cell) => !cell.textContent?.trim());
}

/**
 * The cell `step` places along in reading order. Stepping past the last cell
 * grows the table by a row, which is how Tab behaves in Word and Docs.
 */
export function stepCell(cell: Cell, step: 1 | -1): Cell | null {
  const table = cell.closest("table");
  if (!table) return null;

  const cells = cellsOf(table);
  const next = cells.indexOf(cell) + step;
  if (next >= 0 && next < cells.length) return cells[next];
  if (step === -1) return null;

  return appendRow(table);
}

/** Adds a row matching the table's width and returns its first cell. */
export function appendRow(table: HTMLTableElement): Cell | null {
  const body = table.tBodies[0] ?? table;
  const cols = table.rows[0]?.cells.length ?? 0;
  if (!cols) return null;

  const row = blankRow(cols, "td");
  body.appendChild(row);
  return row.cells[0] as Cell;
}

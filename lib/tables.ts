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

/* ------------------------------ cell geometry ------------------------------ */

/** Where a cell sits in its table, as row and column indices. */
export function cellPosition(cell: Cell): { row: number; col: number } | null {
  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = cell.closest("table");
  if (!row || !table) return null;
  const r = Array.from(table.rows).indexOf(row);
  const c = Array.from(row.cells).indexOf(cell);
  return r < 0 || c < 0 ? null : { row: r, col: c };
}

/**
 * Every cell in the rectangle two cells span.
 *
 * Selection inside a table is a *block*, not a run. A native Range between two
 * cells covers everything in document order between them, so dragging up a
 * column swept in whole rows either side of it — the table behaved like one
 * flat sequence of cells. Callers work from this rectangle instead.
 */
export function cellsBetween(a: Cell, b: Cell): Cell[] {
  const table = a.closest("table") as HTMLTableElement | null;
  if (!table || b.closest("table") !== table) return [];

  const pa = cellPosition(a);
  const pb = cellPosition(b);
  if (!pa || !pb) return [];

  const cells: Cell[] = [];
  for (let r = Math.min(pa.row, pb.row); r <= Math.max(pa.row, pb.row); r += 1) {
    const row = table.rows[r];
    if (!row) continue;
    for (let c = Math.min(pa.col, pb.col); c <= Math.max(pa.col, pb.col); c += 1) {
      const cell = row.cells[c] as Cell | undefined;
      if (cell) cells.push(cell);
    }
  }
  return cells;
}

/** The first and last row and column a set of cells covers. */
export function blockSpan(cells: Cell[]): { r0: number; r1: number; c0: number; c1: number } | null {
  const spots = cells.map(cellPosition).filter(Boolean) as { row: number; col: number }[];
  if (!spots.length) return null;
  const rows = spots.map((p) => p.row);
  const cols = spots.map((p) => p.col);
  return {
    r0: Math.min(...rows),
    r1: Math.max(...rows),
    c0: Math.min(...cols),
    c1: Math.max(...cols),
  };
}

/** A block's text the way a spreadsheet copies it: cells split by tabs, rows by newlines. */
export function blockText(cells: Cell[]): string {
  const rows = new Map<number, string[]>();
  cells.forEach((cell) => {
    const row = cellPosition(cell)?.row ?? 0;
    rows.set(row, [...(rows.get(row) ?? []), (cell.innerText ?? "").trim()]);
  });
  return [...rows.keys()]
    .sort((a, b) => a - b)
    .map((r) => rows.get(r)!.join("\t"))
    .join("\n");
}

/** Empties cells without removing them — a cell always keeps its line box. */
export function clearCells(cells: Cell[]): void {
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.appendChild(document.createElement("br"));
  });
}

/* ---------------------------- structural editing --------------------------- */

/** Swaps a cell's tag while keeping its contents, returning the replacement. */
function retag(cell: Cell, tag: "td" | "th"): void {
  if (cell.tagName.toLowerCase() === tag) return;
  const next = document.createElement(tag);
  while (cell.firstChild) next.appendChild(cell.firstChild);
  cell.replaceWith(next);
}

/**
 * Re-asserts "the first row is the header" after a structural edit. The rule is
 * positional, the way it is in Word: insert a row above the header and the new
 * top row becomes the header, delete the header and the row beneath inherits it.
 * Without this, deleting row 0 would leave a table with no header at all, and
 * `buildTable`'s invariant — which the CSS and the plain-text conversion both
 * lean on — would only hold for tables nobody had edited.
 */
export function syncHeaderRow(table: HTMLTableElement): void {
  Array.from(table.rows).forEach((row, i) => {
    Array.from(row.cells).forEach((cell) => retag(cell as Cell, i === 0 ? "th" : "td"));
  });
}

export function insertRow(
  table: HTMLTableElement,
  index: number,
  where: "above" | "below"
): void {
  const cols = table.rows[0]?.cells.length ?? 0;
  const ref = table.rows[index];
  if (!cols || !ref?.parentElement) return;

  const row = blankRow(cols, "td");
  ref.parentElement.insertBefore(row, where === "above" ? ref : ref.nextSibling);
  syncHeaderRow(table);
}

export function insertColumn(
  table: HTMLTableElement,
  index: number,
  where: "left" | "right"
): void {
  const at = where === "left" ? index : index + 1;
  Array.from(table.rows).forEach((row) => {
    row.insertBefore(blankCell("td"), row.cells[at] ?? null);
  });
  syncHeaderRow(table);
}

/**
 * Removes rows `from`..`to`. Returns false when that would be every row — the
 * caller drops the whole table rather than leaving an empty one behind, since
 * a table with no rows renders as nothing but is still in the note.
 */
export function deleteRows(table: HTMLTableElement, from: number, to: number): boolean {
  const rows = Array.from(table.rows);
  if (to - from + 1 >= rows.length) return false;
  for (let i = to; i >= from; i -= 1) rows[i]?.remove();
  syncHeaderRow(table);
  return true;
}

/** Removes columns `from`..`to`. Returns false when that would be every column. */
export function deleteColumns(table: HTMLTableElement, from: number, to: number): boolean {
  const cols = table.rows[0]?.cells.length ?? 0;
  if (to - from + 1 >= cols) return false;
  Array.from(table.rows).forEach((row) => {
    for (let c = to; c >= from; c -= 1) row.cells[c]?.remove();
  });
  return true;
}

/**
 * Takes a table out of the note and returns the block the caret should land
 * in: whatever followed it, or a fresh empty paragraph when it was the last
 * thing in the note, so the editor is never left with nowhere to type.
 */
export function removeTable(table: HTMLTableElement): HTMLElement {
  let after = table.nextElementSibling as HTMLElement | null;
  if (!after) {
    after = document.createElement("p");
    after.appendChild(document.createElement("br"));
    table.after(after);
  }
  table.remove();
  return after;
}

/**
 * Delete pressed on a block of cells. A block covering whole rows removes those
 * rows, one covering whole columns removes those columns, and anything smaller
 * only empties its cells. Returns the cell the caret should land in, or null
 * when the block was the whole table and the caller should remove it.
 */
export function deleteBlock(table: HTMLTableElement, cells: Cell[]): Cell | null {
  const span = blockSpan(cells);
  if (!span) return cells[0] ?? null;
  const { r0, r1, c0, c1 } = span;
  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.cells.length ?? 0;
  const wholeRows = c0 === 0 && c1 === colCount - 1;
  const wholeCols = r0 === 0 && r1 === rowCount - 1;

  if (wholeRows && wholeCols) return null;
  if (wholeRows) {
    deleteRows(table, r0, r1);
    const row = table.rows[Math.min(r0, table.rows.length - 1)];
    return (row?.cells[0] as Cell | undefined) ?? null;
  }
  if (wholeCols) {
    deleteColumns(table, c0, c1);
    const row = table.rows[0];
    return (row?.cells[Math.min(c0, row.cells.length - 1)] as Cell | undefined) ?? null;
  }
  clearCells(cells);
  return cells[0];
}

export type ArrowDir = "up" | "down" | "left" | "right";

/** The cell one step from `cell` in a direction, or null at the table's edge. */
export function neighbourCell(cell: Cell, dir: ArrowDir): Cell | null {
  const table = cell.closest("table") as HTMLTableElement | null;
  const pos = cellPosition(cell);
  if (!table || !pos) return null;
  const row = pos.row + (dir === "up" ? -1 : dir === "down" ? 1 : 0);
  const col = pos.col + (dir === "left" ? -1 : dir === "right" ? 1 : 0);
  return (table.rows[row]?.cells[col] as Cell | undefined) ?? null;
}

/**
 * Whether the caret still has somewhere to go inside its cell, given `edge`:
 * the stretch of the cell between the caret and the side it is moving towards.
 * Sideways that is any text; up or down it is another line.
 */
export function moreInCell(edge: Range, dir: ArrowDir): boolean {
  const visible = (s: string) => !!s.replace(/[\u200b\ufeff]/g, "").trim();
  if (dir === "left" || dir === "right") return visible(edge.toString());

  // A long line that wraps has no <br> in it, so the stretch's own line boxes
  // are measured too: spanning more than one line means there is one to go.
  const rects = Array.from(edge.getClientRects()).filter((r) => r.height > 0);
  if (rects.length > 1) {
    const tops = rects.map((r) => r.top);
    const lineHeight = Math.min(...rects.map((r) => r.height));
    if (Math.max(...tops) - Math.min(...tops) > lineHeight / 2) return true;
  }

  const part = edge.cloneContents();
  const breaks = part.querySelectorAll("br");
  if (dir === "up") return breaks.length > 0;
  // A cell usually ends in a <br> with nothing after it, which is not a line.
  if (!breaks.length) return false;
  const below = document.createRange();
  below.setStartAfter(breaks[0]);
  below.setEnd(part, part.childNodes.length);
  return visible(below.toString());
}

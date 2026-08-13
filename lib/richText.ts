// Note bodies are stored as HTML so formatting (bold, colour, size, checklists)
// survives a save. The AI layer still speaks plain text, so everything crossing
// that boundary goes through htmlToText / textToHtml.

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);

/** Wrappers that hold blocks rather than being one — never a caret's own block. */
const CONTAINER_TAGS = new Set(["UL", "OL", "TABLE", "THEAD", "TBODY", "TR"]);

/** A table cell owns its content directly: there is no <p> inside it. */
const CELL_TAGS = new Set(["TD", "TH"]);

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain text (seed notes, AI replies, transcripts) -> paragraph HTML. */
export function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * HTML -> plain text for the AI. Blocks become blank-line-separated paragraphs
 * and checklist items keep their state as `[x]` / `[ ]` so the model can see
 * what the student has already ticked off.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  // No DOM (SSR): fall back to a tag strip rather than throwing.
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-4])>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  // Equations read back as the expression the student typed, not the glyph
  // soup the renderer built from it.
  root.querySelectorAll<HTMLElement>(".math").forEach((el) => {
    el.replaceWith(document.createTextNode(el.dataset.tex ?? el.textContent ?? ""));
  });
  root.querySelectorAll<HTMLElement>(".check").forEach((el) => {
    el.prepend(document.createTextNode(el.dataset.done === "true" ? "[x] " : "[ ] "));
  });
  // Keep bullets looking like bullets so the model doesn't flatten a list.
  root.querySelectorAll("ul, ol").forEach((list) => {
    const ordered = list.tagName === "OL";
    const start = Number(list.getAttribute("start")) || 1;
    Array.from(list.children).forEach((li, i) => {
      if (li.tagName === "LI") {
        li.prepend(document.createTextNode(ordered ? `${start + i}. ` : "- "));
      }
    });
  });
  // Tables flatten to pipe-separated rows — enough shape for the model to read
  // them as a table without inventing markup it would have to round-trip.
  // Runs last so cell text already carries its bullet/checklist prefixes.
  root.querySelectorAll("table").forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children)
        .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim())
        .join(" | ")
    );
    table.replaceWith(document.createTextNode(rows.join("\n")));
  });

  const blocks: string[] = [];
  const pushText = (value: string | null) => {
    const trimmed = (value ?? "").trim();
    if (trimmed) blocks.push(trimmed);
  };

  const walk = (parent: Element) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        pushText(node.textContent);
      } else if (node instanceof HTMLElement) {
        if (node.tagName === "UL" || node.tagName === "OL") walk(node);
        else if (BLOCK_TAGS.has(node.tagName)) pushText(node.textContent);
        else pushText(node.textContent);
      }
    }
  };
  walk(root);

  return blocks.join("\n\n");
}

/** Older notes (and seed data) are plain text — upgrade them on the way in. */
export function ensureHtml(body: string): string {
  if (!body) return "";
  return /<(p|div|br|b|i|u|font|ul|ol|li|span|sup|sub|table|h[1-4])\b/i.test(body)
    ? body
    : textToHtml(body);
}

/* -------------------------------- sanitiser ------------------------------- */

/**
 * Tags the editor produces, mapped to the attributes each may keep. Anything
 * outside this table is unwrapped — the text survives, the markup does not.
 */
const ALLOWED: Record<string, readonly string[]> = {
  P: ["class", "data-done"],
  DIV: ["class", "data-done"],
  BR: [],
  B: [],
  STRONG: [],
  I: [],
  EM: [],
  U: [],
  FONT: ["size", "color"],
  SPAN: ["class", "contenteditable", "data-tex"],
  SUP: [],
  SUB: [],
  UL: [],
  OL: ["start"],
  LI: ["class"],
  TABLE: [],
  THEAD: [],
  TBODY: [],
  TR: [],
  TD: ["class", "data-done"],
  TH: ["class", "data-done"],
};

/** Alignment is a class rather than execCommand's own `align`/style output, so
 *  it survives the sanitiser the same deterministic way checklists do. */
const ALIGN_CLASSES = new Set(["align-center", "align-right"]);

/**
 * The only class names the editor produces: block state on <p>/<div>, and the
 * equation vocabulary from lib/math.ts on <span>. Anything else is dropped.
 */
const ALLOWED_CLASSES: Record<string, ReadonlySet<string>> = {
  P: new Set(["check", "eq", ...ALIGN_CLASSES]),
  DIV: new Set(["check", "eq", ...ALIGN_CLASSES]),
  LI: new Set(ALIGN_CLASSES),
  TD: new Set(["check", ...ALIGN_CLASSES]),
  TH: new Set(["check", ...ALIGN_CLASSES]),
  SPAN: new Set(["math", "frac", "num", "den", "sqrt", "rad", "sqrt-body"]),
};

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

function copyAttributes(from: Element, to: Element, allowed: readonly string[]) {
  for (const name of allowed) {
    const value = from.getAttribute(name);
    if (value === null) continue;

    if (name === "class") {
      // A block can carry more than one class (a centred checklist item, say),
      // so each token is checked on its own rather than the whole value at once.
      const permitted = ALLOWED_CLASSES[from.tagName];
      const kept = value.split(/\s+/).filter((token) => permitted?.has(token));
      if (kept.length) to.setAttribute("class", kept.join(" "));
      continue;
    }
    // Equations are atomic in the editor; nothing else may opt out of editing.
    if (name === "contenteditable" && value !== "false") continue;
    if (name === "data-done" && value !== "true" && value !== "false") continue;
    if (name === "size" && !/^[1-7]$/.test(value)) continue;
    if (name === "color" && !HEX_COLOR.test(value)) continue;
    // <ol start> only ever carries a small counter from a split list.
    if (name === "start" && !/^\d{1,4}$/.test(value)) continue;

    to.setAttribute(name, value);
  }
}

function cleanInto(source: Node, target: Node, doc: Document) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ""));
      continue;
    }
    if (!(child instanceof Element)) continue;

    const allowed = ALLOWED[child.tagName];
    if (!allowed) {
      // Unknown tag: drop it, keep whatever it wrapped.
      cleanInto(child, target, doc);
      continue;
    }

    const el = doc.createElement(child.tagName.toLowerCase());
    copyAttributes(child, el, allowed);
    cleanInto(child, el, doc);
    target.appendChild(el);
  }
}

/**
 * Strip note HTML down to the tags the editor understands.
 *
 * Everything reaching the editor from outside — the AI enhance response, a
 * paste from another site — passes through here before it becomes innerHTML,
 * so scripts, event handlers, inline styles and embeds can never ride along.
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") return escapeHtml(html.replace(/<[^>]*>/g, ""));

  // DOMParser builds an inert document: nothing loads, nothing executes.
  const doc = new DOMParser().parseFromString("<body></body>", "text/html");
  const source = doc.createElement("div");
  source.innerHTML = html;

  const target = doc.createElement("div");
  cleanInto(source, target, doc);
  return target.innerHTML;
}

/** True when the editor holds nothing but empty blocks — drives the placeholder. */
export function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  // A blank table or a bare equation has no text but is very much content.
  if (/<table\b|class="math"/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/[\s ]/g, "") === "";
}

/* ------------------------------- block lookup ------------------------------ */

/**
 * Climbs from `node` to the block that "owns" it: a `<li>` if inside a list,
 * otherwise the direct child of the editor (`<p>`, including checklist items).
 * Shared by the toolbar (deciding what a toggle applies to) and the editor's
 * Backspace handling (deciding what a caret-at-start keypress should detach).
 */
export function closestOwnBlock(editorEl: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node || !editorEl.contains(node)) return null;
  const start = node instanceof Element ? node : node.parentElement;
  const inner = start?.closest("li, td, th");
  if (inner && editorEl.contains(inner)) return inner as HTMLElement;

  let cur: Node | null = node;
  while (cur && cur !== editorEl && cur.parentNode !== editorEl) cur = cur.parentNode;
  return cur && cur !== editorEl && cur instanceof HTMLElement ? cur : null;
}

/** Every block the caret could sit in, in document order. */
function ownBlocks(editorEl: HTMLElement): HTMLElement[] {
  return Array.from(editorEl.querySelectorAll<HTMLElement>(":scope > *, li, td, th")).filter(
    (el) => !CONTAINER_TAGS.has(el.tagName)
  );
}

/**
 * The blocks a selection actually covers, so a toolbar toggle can apply to all
 * of them the way Word and Docs do rather than only to the block holding the
 * caret.
 *
 * Overlap is tested against each block rather than resolved from the range's
 * endpoints: a select-all leaves both endpoints on the editor itself, which
 * belongs to no block, and a selection dragged one block too far ends at the
 * very start of a block it never really reached into.
 */
export function blocksInRange(editorEl: HTMLElement, range: Range): HTMLElement[] {
  if (!range.collapsed) {
    const covered = ownBlocks(editorEl).filter((block) => {
      const own = document.createRange();
      own.selectNodeContents(block);
      return (
        // starts before the block ends, and ends after the block starts
        range.compareBoundaryPoints(Range.END_TO_START, own) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, own) > 0
      );
    });
    if (covered.length) return covered;
  }

  const block = closestOwnBlock(editorEl, range.startContainer);
  return block ? [block] : [];
}

/** True when `range`'s caret sits at the very start of `block`'s content. */
export function isCaretAtBlockStart(block: HTMLElement, range: Range): boolean {
  const probe = document.createRange();
  probe.selectNodeContents(block);
  probe.setEnd(range.startContainer, range.startOffset);
  return probe.toString().length === 0;
}

/**
 * Pulls `li` out of its list into a standalone `<p>`, splitting the list
 * around it if it sat in the middle. Built by hand rather than via
 * `execCommand("insertUnorderedList")` toggling off — Chrome's version of that,
 * when splitting a multi-item list, sometimes drops the extracted content as
 * bare text next to the lists instead of wrapping it in a block, which broke
 * both the bullet toolbar button and Backspace-to-detach.
 */
export function detachListItem(li: HTMLElement): HTMLElement | null {
  const list = li.parentElement;
  const parent = list?.parentElement;
  if (!list || !parent) return null;

  const p = document.createElement("p");
  while (li.firstChild) p.appendChild(li.firstChild);
  if (!p.hasChildNodes()) p.appendChild(document.createElement("br"));

  const items = Array.from(list.children);
  const index = items.indexOf(li);
  const after = items.slice(index + 1);

  parent.insertBefore(p, list.nextSibling);
  if (after.length) {
    const rest = document.createElement(list.tagName);
    // A numbered list split around a pulled-out item keeps counting, the way
    // Word and Docs do — the tail must not restart at 1.
    if (list.tagName === "OL") {
      const first = Number(list.getAttribute("start")) || 1;
      rest.setAttribute("start", String(first + index));
    }
    after.forEach((item) => rest.appendChild(item));
    parent.insertBefore(rest, p.nextSibling);
  }

  li.remove();
  if (!list.children.length) list.remove();
  return p;
}

export type ListTag = "UL" | "OL";

/**
 * Turns `block` (a `<p>`) into a `<li>` of a `tag` list, merging into an
 * adjacent list of the same kind on either side if one is already there,
 * otherwise wrapping it in a new one. Hand-rolled for the same reason as
 * `detachListItem`: Chrome's `execCommand("insertUnorderedList")` can nest the
 * new `<ul>` *inside* the existing block instead of replacing it, producing
 * invalid markup.
 */
export function wrapInList(block: HTMLElement, tag: ListTag = "UL"): HTMLElement | null {
  const parent = block.parentElement;
  if (!parent) return null;

  const li = document.createElement("li");
  while (block.firstChild) li.appendChild(block.firstChild);
  if (!li.hasChildNodes()) li.appendChild(document.createElement("br"));

  // A cell holds its content directly, so the list nests inside it rather than
  // replacing it — a <ul> where a <td> should be would break the row.
  if (CELL_TAGS.has(block.tagName)) {
    const nested = document.createElement(tag.toLowerCase());
    nested.appendChild(li);
    block.appendChild(nested);
    return li;
  }

  const prev = block.previousElementSibling;
  const next = block.nextElementSibling;

  if (prev?.tagName === tag) {
    prev.appendChild(li);
    block.remove();
    if (next?.tagName === tag) {
      while (next.firstChild) prev.appendChild(next.firstChild);
      next.remove();
    }
    return li;
  }
  if (next?.tagName === tag) {
    next.insertBefore(li, next.firstChild);
    // The tail now starts one item earlier, so its counter walks back with it.
    const first = Number(next.getAttribute("start")) || 1;
    if (tag === "OL" && first > 1) next.setAttribute("start", String(first - 1));
    block.remove();
    return li;
  }

  const list = document.createElement(tag.toLowerCase());
  list.appendChild(li);
  parent.replaceChild(list, block);
  return li;
}

/**
 * Makes `block` an item of a `tag` list whatever it is now. An item of the
 * *other* kind of list goes out through `detachListItem` and back in through
 * `wrapInList`, so converting one item mid-list splits the run around it
 * instead of renumbering the whole thing.
 */
export function setBlockList(block: HTMLElement, tag: ListTag): HTMLElement | null {
  if (block.tagName === "LI") {
    if (block.parentElement?.tagName === tag) return block;
    const p = detachListItem(block);
    return p ? wrapInList(p, tag) : null;
  }
  setBlockCheck(block, false);
  return wrapInList(block, tag);
}

/**
 * Turns checklist formatting on or off for `block`. Bullets and checklists are
 * mutually exclusive, so switching one on steps out of any list first.
 */
export function setBlockCheck(block: HTMLElement, on: boolean): HTMLElement {
  if (!on) {
    block.classList.remove("check");
    block.removeAttribute("data-done");
    return block;
  }
  const target = block.tagName === "LI" ? (detachListItem(block) ?? block) : block;
  target.classList.add("check");
  target.setAttribute("data-done", "false");
  return target;
}

/** The kind of list `block` belongs to, if any. */
export function listKindOf(block: HTMLElement | null): ListTag | null {
  if (block?.tagName !== "LI") return null;
  const tag = block.parentElement?.tagName;
  return tag === "UL" || tag === "OL" ? tag : null;
}

export type Align = "left" | "center" | "right";

/** Left has no class of its own — it's just the absence of the other two. */
export function setBlockAlign(block: HTMLElement, align: Align): void {
  block.classList.remove("align-center", "align-right");
  if (align !== "left") block.classList.add(`align-${align}`);
}

export function alignOf(block: HTMLElement | null): Align {
  if (block?.classList.contains("align-center")) return "center";
  if (block?.classList.contains("align-right")) return "right";
  return "left";
}

/** Collapses the caret to the very start of `el`'s content. */
export function placeCaretAtStart(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Selects everything inside `el` — what Tab does when it lands in a table cell. */
export function selectContents(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Where `block`'s own text begins on its first line, in viewport coordinates.
 *
 * This is the anchor for anything that has to sit exactly where the first typed
 * character would land: the empty-note placeholder, and the checklist box's hit
 * area (the box is a ::before, so it has no rect of its own — it occupies the
 * 26px immediately left of this point).
 *
 * The range is deliberately left uncollapsed. A collapsed one reports no client
 * rects at all — not even in a block with text — which silently dropped every
 * caller through to the fallback below; that fallback happens to be right for
 * left-aligned text, so the bug only surfaced once blocks could be centred.
 * Selecting the contents instead reports the first line's rect in every case,
 * including a block holding only a <br>, where it is zero-width but correctly
 * placed. The fallback is a true last resort.
 */
export function blockTextStart(block: HTMLElement): { left: number; top: number; height: number } {
  const range = document.createRange();
  range.selectNodeContents(block);
  const [rect] = Array.from(range.getClientRects());
  if (rect) return { left: rect.left, top: rect.top, height: rect.height };

  const box = block.getBoundingClientRect();
  const style = getComputedStyle(block);
  const left = box.left + (parseFloat(style.paddingLeft) || 0);
  const right = box.right - (parseFloat(style.paddingRight) || 0);
  const align = style.textAlign;

  return {
    left: align === "center" ? (left + right) / 2 : align === "right" ? right : left,
    top: box.top + (parseFloat(style.paddingTop) || 0),
    height: parseFloat(style.lineHeight) || box.height,
  };
}

/* --------------------------- caret as an offset --------------------------- */
/* Undo/redo swaps the editor's whole innerHTML, which invalidates any Range
 * held across the change. A plain character count into the editor's text
 * survives that, so the caret can be put back where the student left it. */

/** How many characters of the editor's text sit before the caret. */
export function caretOffset(editorEl: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  if (!editorEl.contains(range.endContainer)) return 0;

  const probe = document.createRange();
  probe.selectNodeContents(editorEl);
  probe.setEnd(range.endContainer, range.endOffset);
  return probe.toString().length;
}

/** Puts the caret back `offset` characters into the editor. */
export function restoreCaret(editorEl: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let remaining = offset;
  let placed = false;

  let node = walker.nextNode() as Text | null;
  while (node) {
    const length = node.data.length;
    if (remaining <= length) {
      // Equations are atomic: land after the whole span, never inside it.
      const atomic = node.parentElement?.closest('[contenteditable="false"]');
      if (atomic) range.setStartAfter(atomic);
      else range.setStart(node, remaining);
      placed = true;
      break;
    }
    remaining -= length;
    node = walker.nextNode() as Text | null;
  }

  if (!placed) {
    range.selectNodeContents(editorEl);
    range.collapse(false);
  } else {
    range.collapse(true);
  }

  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

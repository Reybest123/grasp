// Editing an equation in place, inside the note — the way Word and OneNote do
// it after Alt+=, rather than in a separate box.
//
// At rest an equation is a `contenteditable="false"` span (lib/math.ts): one
// object the caret steps over. Opening it for editing ("activating") drops that
// attribute and adds `.active`, so the student types straight into its
// structure — the base, an exponent, a numerator — while the equation bar
// (components/workspace/EquationEditor.tsx) only ever *adds* structure. Closing
// it writes the structure back out as LaTeX-lite on data-tex and redraws it
// from that, so what is stored is always one canonical form.
//
// The awkward part of editing structure in a contentEditable is the caret.
// "End of the exponent" and "just after the exponent" are the same pixel, so
// the browser treats them as one position and there is no way to type after
// x² without the digit landing in the exponent. Two things fix that:
//
//  - Anchors. Every structure has a text node on either side of it, and every
//    empty slot holds one, each at least a zero-width space (ZW). Every caret
//    position is then a real spot inside a real text node, and the browser
//    types into whichever one the caret is in.
//  - Stops. The left/right arrows are driven from an explicit list of caret
//    positions (`stopsOf`) instead of the browser's, which would stop twice on
//    either side of every ZW and skip straight past the boundary between an
//    exponent and what follows it.
//
// ZWs never reach storage: `mathTex` strips them, and the saved note is always
// the canonical redraw (`canonicalEditorHtml`).

import { fracHtml, mathToHtml, sqrtHtml } from "@/lib/math";

export const ZW = "\u200B";
const ZW_ANY = /[\u200B\uFEFF]/g;

/** Elements that are a piece of structure, each holding one or more slots. */
const STRUCTS = "sup, sub, .frac, .sqrt";
/** Elements the caret can type into. The equation itself is one too. */
const SLOTS = "sup, sub, .num, .den, .sqrt-body, .root-idx";

export type MathStructure = "sup" | "sub" | "frac" | "sqrt" | "paren";

function isZ(ch: string): boolean {
  return ch === ZW || ch === "\uFEFF";
}

function isStruct(n: Node | null): n is HTMLElement {
  return n instanceof HTMLElement && n.matches(STRUCTS);
}

function realText(n: Node): string {
  return (n.textContent ?? "").replace(ZW_ANY, "");
}

/** Nothing typed in it and no structure inside it. */
function isBlank(el: HTMLElement): boolean {
  return !realText(el).trim() && !el.querySelector(STRUCTS);
}

/** The equation the selection is in, if it is the one being edited. */
export function selectionInside(math: HTMLElement | null): boolean {
  if (!math || !math.isConnected) return false;
  const sel = window.getSelection();
  return !!(sel?.anchorNode && math.contains(sel.anchorNode) && math.contains(sel.focusNode));
}

/* --------------------------------- source --------------------------------- */

function escapeTex(s: string): string {
  return s.replace(/[\\{}^_]/g, (ch) => (ch === "\\" ? "\\backslash " : `\\${ch}`));
}

function texOf(parent: Node): string {
  let out = "";
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escapeTex((child as Text).data.replace(ZW_ANY, ""));
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === "SUP") out += `^{${texOf(child)}}`;
    else if (child.tagName === "SUB") out += `_{${texOf(child)}}`;
    else if (child.classList.contains("frac")) {
      const num = child.querySelector(":scope > .num");
      const den = child.querySelector(":scope > .den");
      out += `\\frac{${num ? texOf(num) : ""}}{${den ? texOf(den) : ""}}`;
    } else if (child.classList.contains("sqrt")) {
      const idx = child.querySelector(":scope > .root-idx");
      const body = child.querySelector(":scope > .sqrt-body");
      const index = idx && realText(idx).trim() ? `[${texOf(idx)}]` : "";
      out += `\\sqrt${index}{${body ? texOf(body) : ""}}`;
    } else if (child.classList.contains("rad") || child.tagName === "BR") {
      continue;
    } else {
      // Formatting the browser slipped in (a <b> from Ctrl+B) carries no
      // meaning in an equation: keep what it wraps.
      out += texOf(child);
    }
  }
  return out;
}

/** The LaTeX-lite source an equation's structure stands for. */
export function mathTex(math: HTMLElement): string {
  return texOf(math).trim();
}

/* ------------------------------ open / close ------------------------------ */

/** A fresh equation, already open for editing, holding `text` if any. */
export function createBlankMath(text = ""): HTMLElement {
  const m = document.createElement("span");
  m.className = "math active";
  m.setAttribute("data-tex", "");
  m.appendChild(document.createTextNode(ZW + text));
  return m;
}

/** Opens a resting equation for editing in place. */
export function activateMath(math: HTMLElement): void {
  math.removeAttribute("contenteditable");
  math.classList.add("active");
  // Operator spacing is a resting-state nicety; while editing, an operator is
  // plain text like everything typed next to it, so the caret has one text
  // node to move through rather than a span per "=".
  math.querySelectorAll(".op").forEach((op) => op.replaceWith(op.textContent ?? ""));
  ensureAnchors(math);
}

/**
 * Closes an equation: writes its source to data-tex and swaps it for the
 * canonical redraw of that source. Returns the new element, or null when
 * there was nothing in it and it was removed.
 */
export function lockMath(math: HTMLElement): HTMLElement | null {
  const parent = math.parentElement;
  if (!realText(math).trim()) {
    math.remove();
    // An empty display line goes back to being an ordinary empty paragraph.
    if (parent?.classList.contains("eq") && !realText(parent).trim() && !parent.querySelector(".math")) {
      parent.classList.remove("eq");
      if (!parent.classList.length) parent.removeAttribute("class");
      parent.innerHTML = "<br>";
    }
    return null;
  }
  const holder = math.ownerDocument.createElement("span");
  holder.innerHTML = mathToHtml(mathTex(math), false);
  const locked = holder.firstElementChild as HTMLElement;
  math.replaceWith(locked);
  return locked;
}

/**
 * The editor's HTML as it should be stored: an equation open for editing is
 * written out in its resting form. Works on a copy, so the live equation —
 * and the caret in it — is untouched.
 */
export function canonicalEditorHtml(el: HTMLElement): string {
  if (!el.querySelector(".math.active")) return el.innerHTML;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>(".math.active").forEach((m) => lockMath(m));
  return clone.innerHTML;
}

/* --------------------------------- anchors -------------------------------- */

/**
 * Restores the invariants the caret depends on after any edit: whole
 * structures, a text node either side of every structure, something in every
 * slot, and the placeholder class on each slot that is empty.
 */
export function ensureAnchors(math: HTMLElement): void {
  math.querySelectorAll("br").forEach((b) => b.remove());

  math.querySelectorAll<HTMLElement>(".frac").forEach((f) => {
    let num = f.querySelector<HTMLElement>(":scope > .num");
    let den = f.querySelector<HTMLElement>(":scope > .den");
    if (!num) {
      num = document.createElement("span");
      num.className = "num";
      f.prepend(num);
    }
    if (!den) {
      den = document.createElement("span");
      den.className = "den";
      f.append(den);
    }
    for (const n of Array.from(f.childNodes)) if (n !== num && n !== den) den.append(n);
  });

  math.querySelectorAll<HTMLElement>(".sqrt").forEach((s) => {
    let rad = s.querySelector<HTMLElement>(":scope > .rad");
    let body = s.querySelector<HTMLElement>(":scope > .sqrt-body");
    const idx = s.querySelector<HTMLElement>(":scope > .root-idx");
    if (!rad) {
      rad = document.createElement("span");
      rad.className = "rad";
      s.prepend(rad);
    }
    if (!body) {
      body = document.createElement("span");
      body.className = "sqrt-body";
      s.append(body);
    }
    // The sign is drawn by CSS; an older note may still hold a "√" glyph here.
    rad.textContent = "";
    rad.setAttribute("contenteditable", "false");
    for (const n of Array.from(s.childNodes)) if (n !== rad && n !== body && n !== idx) body.append(n);
  });

  math.normalize();

  const slots = [math, ...Array.from(math.querySelectorAll<HTMLElement>(SLOTS))];
  for (const slot of slots) {
    for (const child of Array.from(slot.childNodes)) {
      if (!isStruct(child)) continue;
      if (child.previousSibling?.nodeType !== Node.TEXT_NODE) child.before(ZW);
      if (child.nextSibling?.nodeType !== Node.TEXT_NODE) child.after(ZW);
    }
    if (!slot.firstChild) slot.append(ZW);
    for (const child of Array.from(slot.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && (child as Text).data === "") (child as Text).data = ZW;
    }
    slot.classList.toggle("ph", isBlank(slot));
  }

  // A text node emptied by a deletion is dropped by normalize(), which leaves
  // the caret on an element rather than in text. Put it back on a stop.
  const sel = window.getSelection();
  if (sel?.rangeCount && sel.isCollapsed && sel.anchorNode && math.contains(sel.anchorNode)) {
    if (sel.anchorNode.nodeType !== Node.TEXT_NODE) {
      const stops = stopsOf(math);
      setStop(stops[stopIndex(stops, sel.getRangeAt(0))]);
    }
  }
}

/* ---------------------------------- caret --------------------------------- */

type Stop = { node: Text; offset: number };

/**
 * Every distinct place the caret can sit in an equation, in reading order.
 * A position just before a ZW is the same place as just after it, so it is
 * left out; text nodes with no element between them would be one place too.
 */
export function stopsOf(math: HTMLElement): Stop[] {
  const out: Stop[] = [];
  const walker = document.createTreeWalker(math, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(".rad") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let prev: Text | null = null;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    for (let k = 0; k <= node.data.length; k++) {
      if (k < node.data.length && isZ(node.data[k])) continue;
      if (k === 0 && prev && prev.nextSibling === node) continue;
      out.push({ node, offset: k });
    }
    prev = node;
  }
  return out;
}

/** The first stop at or after the caret. */
function stopIndex(stops: Stop[], range: Range): number {
  for (let i = 0; i < stops.length; i++) {
    if (range.comparePoint(stops[i].node, stops[i].offset) >= 0) return i;
  }
  return stops.length - 1;
}

export function setCaret(node: Node, offset: number): void {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

function setStop(stop: Stop | undefined): void {
  if (stop) setCaret(stop.node, stop.offset);
}

/** The caret at the start of `slot`'s contents. */
function caretToStart(slot: HTMLElement, math: HTMLElement): void {
  setStop(stopsOf(math).find((s) => slot.contains(s.node)));
}

export function caretToEnd(math: HTMLElement): void {
  const stops = stopsOf(math);
  setStop(stops[stops.length - 1]);
}

/** The caret just after `el`, in the anchor that follows it. */
function caretAfter(el: HTMLElement, math: HTMLElement): void {
  const stops = stopsOf(math);
  const range = document.createRange();
  range.setStartAfter(el);
  range.collapse(true);
  setStop(stops[stopIndex(stops, range)]);
}

/** Puts the caret where the student clicked, or at the end if that misses. */
export function caretAtPoint(math: HTMLElement, x: number, y: number): void {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) [node, offset] = [r.startContainer, r.startOffset];
  } else if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) [node, offset] = [p.offsetNode, p.offset];
  }
  if (node && node.nodeType === Node.TEXT_NODE && math.contains(node) && !node.parentElement?.closest(".rad")) {
    setCaret(node, offset);
  } else {
    caretToEnd(math);
  }
}

/**
 * Left/right through the equation. Returns where the caret went: "before" or
 * "after" mean it walked off an end, which closes the equation.
 */
export function moveCaret(math: HTMLElement, dir: -1 | 1): "moved" | "before" | "after" {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return "moved";
  const stops = stopsOf(math);
  const i = stopIndex(stops, sel.getRangeAt(0));
  const next = i + dir;
  if (next < 0) return "before";
  if (next >= stops.length) return "after";
  setStop(stops[next]);
  return "moved";
}

/** Up/down between a numerator and its denominator. False when not in one. */
export function moveVertical(math: HTMLElement, dir: -1 | 1): boolean {
  const sel = window.getSelection();
  const at = sel?.anchorNode;
  const host = at instanceof HTMLElement ? at : at?.parentElement;
  const slot = host?.closest<HTMLElement>(".num, .den");
  if (!slot || !math.contains(slot)) return false;
  const frac = slot.parentElement;
  const target =
    dir > 0 && slot.classList.contains("num")
      ? frac?.querySelector<HTMLElement>(":scope > .den")
      : dir < 0 && slot.classList.contains("den")
        ? frac?.querySelector<HTMLElement>(":scope > .num")
        : null;
  if (!target) return false;
  const inTarget = stopsOf(math).filter((s) => target.contains(s.node));
  setStop(inTarget[inTarget.length - 1]);
  return true;
}

/* --------------------------------- editing -------------------------------- */

/** The structure a slot belongs to. For <sup>/<sub> that is the slot itself. */
function ownerOf(slot: HTMLElement): HTMLElement | null {
  return slot.matches("sup, sub") ? slot : slot.closest<HTMLElement>(".frac, .sqrt");
}

/**
 * Backspace (dir -1) or Delete (dir 1). Deletes one character; at the edge of
 * a structure it steps into it first, and removes it once it is empty — so a
 * fraction is never torn in half. "outside" means there was nothing left to
 * delete in that direction inside the equation.
 */
export function deleteAt(math: HTMLElement, dir: -1 | 1): "done" | "outside" {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return "done";
  const range = sel.getRangeAt(0);

  if (!range.collapsed) {
    range.deleteContents();
    ensureAnchors(math);
    return "done";
  }

  const stops = stopsOf(math);
  const i = stopIndex(stops, range);
  const { node, offset } = stops[i];

  // A character to delete in this text node, skipping anchors.
  if (dir < 0) {
    let j = offset - 1;
    while (j >= 0 && isZ(node.data[j])) j--;
    if (j >= 0) {
      setCaret(node, j);
      node.deleteData(j, 1);
      ensureAnchors(math);
      return "done";
    }
  } else {
    let j = offset;
    while (j < node.data.length && isZ(node.data[j])) j++;
    if (j < node.data.length) {
      setCaret(node, offset);
      node.deleteData(j, 1);
      ensureAnchors(math);
      return "done";
    }
  }

  // Up against a structure sitting beside this text.
  const beside = dir < 0 ? node.previousSibling : node.nextSibling;
  if (isStruct(beside)) {
    if (isBlank(beside)) {
      setCaret(node, dir < 0 ? 0 : node.data.length);
      beside.remove();
      ensureAnchors(math);
    } else {
      setStop(stops[i + dir]);
    }
    return "done";
  }

  // At the edge of a slot.
  const slot = node.parentElement;
  if (!slot || slot === math) return "outside";
  const owner = ownerOf(slot);
  if (owner && isBlank(owner)) {
    // Park the caret beside the structure before it goes, so it survives.
    const side = dir < 0 ? owner.previousSibling : owner.nextSibling;
    if (side?.nodeType === Node.TEXT_NODE) {
      setCaret(side, dir < 0 ? (side as Text).data.length : 0);
    }
    owner.remove();
    ensureAnchors(math);
    return "done";
  }
  setStop(stops[i + dir]);
  return "done";
}

/** Replaces the selection with plain text: a symbol from the bar, or a paste. */
export function insertMathText(math: HTMLElement, text: string): void {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const at = range.startContainer;
  if (at.nodeType === Node.TEXT_NODE) {
    (at as Text).insertData(range.startOffset, text);
    setCaret(at, range.startOffset + text.length);
  } else {
    const t = document.createTextNode(text);
    range.insertNode(t);
    setCaret(t, text.length);
  }
  ensureAnchors(math);
}

/**
 * The run of letters and digits just before the caret, cut out of the text —
 * what a fraction takes as its numerator, the way typing "3/" in Word does.
 */
function takeTerm(range: Range): string {
  const t = range.startContainer;
  if (t.nodeType !== Node.TEXT_NODE) return "";
  const data = (t as Text).data;
  const end = range.startOffset;
  let k = end;
  while (k > 0 && (/[\p{L}\p{N}.]/u.test(data[k - 1]) || isZ(data[k - 1]))) k--;
  const term = data.slice(k, end).replace(ZW_ANY, "");
  if (!term) return "";
  (t as Text).deleteData(k, end - k);
  range.setStart(t, k);
  range.collapse(true);
  return term;
}

function spanOf(className: string): HTMLElement {
  const s = document.createElement("span");
  s.className = className;
  return s;
}

/**
 * Adds a piece of structure at the caret. With text selected, the selection
 * goes inside it (select "2" and press x² to make it an exponent); with
 * nothing selected it arrives empty, with the caret waiting in it.
 */
export function insertStructure(math: HTMLElement, kind: MathStructure): void {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!math.contains(range.commonAncestorContainer)) return;

  const content = range.collapsed ? null : range.extractContents();
  const holder = document.createElement("span");
  let el: HTMLElement;
  // Where the caret goes afterwards: a slot to start typing in, or null for
  // "just after the new structure".
  let focus: HTMLElement | null = null;

  if (kind === "paren") {
    if (!content) {
      insertMathText(math, "()");
      // Back inside the pair, ready to type what goes in it.
      const s = window.getSelection();
      if (s?.anchorNode) setCaret(s.anchorNode, Math.max(0, s.anchorOffset - 1));
      return;
    }
    const open = document.createTextNode("(");
    const close = document.createTextNode(")");
    range.insertNode(close);
    range.insertNode(content);
    range.insertNode(open);
    // Set before the anchors are restored: merging text nodes keeps a live
    // caret in place, but not a reference to a node that was merged away.
    setCaret(close, 1);
    ensureAnchors(math);
    return;
  }

  if (kind === "sup" || kind === "sub") {
    el = document.createElement(kind);
    if (content) el.append(content);
    else focus = el;
  } else if (kind === "frac") {
    holder.innerHTML = fracHtml("", "");
    el = holder.firstElementChild as HTMLElement;
    const num = el.querySelector<HTMLElement>(".num")!;
    const den = el.querySelector<HTMLElement>(".den")!;
    const term = content ? "" : takeTerm(range);
    if (content) num.append(content);
    else if (term) num.append(term);
    focus = content || term ? den : num;
  } else {
    holder.innerHTML = sqrtHtml("");
    el = holder.firstElementChild as HTMLElement;
    const body = el.querySelector<HTMLElement>(".sqrt-body") ?? spanOf("sqrt-body");
    if (content) body.append(content);
    else focus = body;
  }

  range.insertNode(el);
  ensureAnchors(math);
  if (focus) caretToStart(focus, math);
  else caretAfter(el, math);
}

// Note bodies are stored as HTML so formatting (bold, colour, size, checklists)
// survives a save. The AI layer still speaks plain text, so everything crossing
// that boundary goes through htmlToText / textToHtml.

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);

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
    Array.from(list.children).forEach((li, i) => {
      if (li.tagName === "LI") li.prepend(document.createTextNode(ordered ? `${i + 1}. ` : "- "));
    });
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
  return /<(p|div|br|b|i|u|font|ul|ol|li|span|sup|sub|h[1-4])\b/i.test(body)
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
  OL: [],
  LI: [],
};

/**
 * The only class names the editor produces: block state on <p>/<div>, and the
 * equation vocabulary from lib/math.ts on <span>. Anything else is dropped.
 */
const ALLOWED_CLASSES: Record<string, ReadonlySet<string>> = {
  P: new Set(["check", "eq"]),
  DIV: new Set(["check", "eq"]),
  SPAN: new Set(["math", "frac", "num", "den", "sqrt", "rad", "sqrt-body"]),
};

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

function copyAttributes(from: Element, to: Element, allowed: readonly string[]) {
  for (const name of allowed) {
    const value = from.getAttribute(name);
    if (value === null) continue;

    if (name === "class" && !ALLOWED_CLASSES[from.tagName]?.has(value)) continue;
    // Equations are atomic in the editor; nothing else may opt out of editing.
    if (name === "contenteditable" && value !== "false") continue;
    if (name === "data-done" && value !== "true" && value !== "false") continue;
    if (name === "size" && !/^[1-7]$/.test(value)) continue;
    if (name === "color" && !HEX_COLOR.test(value)) continue;

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
  return html.replace(/<[^>]*>/g, "").replace(/[\s ]/g, "") === "";
}

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
  root.querySelectorAll<HTMLElement>(".check").forEach((el) => {
    el.prepend(document.createTextNode(el.dataset.done === "true" ? "[x] " : "[ ] "));
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
  return /<(p|div|br|b|i|u|font|ul|ol|li|span|h[1-4])\b/i.test(body) ? body : textToHtml(body);
}

/** True when the editor holds nothing but empty blocks — drives the placeholder. */
export function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").replace(/[\s ]/g, "") === "";
}

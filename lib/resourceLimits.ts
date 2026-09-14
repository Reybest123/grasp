// What one Resource Bank read may contain (§3.4, §9.1).
//
// Each read is one model call, and these caps are what keep one read under a
// cent however large the document. Client-safe: the add form checks the same
// numbers when Read it is pressed, and the route checks them again, since the
// form is not the only way to reach it.
//
// How the cost stays bounded, on gpt-4o-mini:
//   - Text is capped by words (and characters), so the input is a few thousand
//     tokens at most.
//   - An image is always resized by the provider to fit 2048px and then to 768px
//     on its short side, so it costs at most 8 tiles, whatever its file size.
//   - A PDF is capped by pages.
//   - The reply is capped by `max_tokens` in the route.

import { MAX_UPLOAD_BYTES } from "@/lib/fileTypes";

export const RESOURCE_MAX_WORDS = 1_500;
/**
 * A backstop to the word count, which splits on spaces: a pasted block with no
 * spaces in it is one "word" however long it is. 1,500 ordinary words run to
 * about 9,000 characters.
 */
export const RESOURCE_MAX_CHARS = 20_000;
export const RESOURCE_MAX_PDF_PAGES = 1;
export const RESOURCE_MAX_BYTES = MAX_UPLOAD_BYTES;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Whether a document's text is within both caps. */
export function textFits(text: string): boolean {
  return countWords(text) <= RESOURCE_MAX_WORDS && text.trim().length <= RESOURCE_MAX_CHARS;
}

export function textLimitProblem(text: string): string | null {
  const words = countWords(text);
  const limit = RESOURCE_MAX_WORDS.toLocaleString("en");
  if (words > RESOURCE_MAX_WORDS) {
    return `This document is ${words.toLocaleString("en")} words long, which is over the ${limit}-word limit. Please include only the section you need.`;
  }
  if (text.trim().length > RESOURCE_MAX_CHARS) {
    return `This document is over the length limit. Please include only the section you need, up to ${limit} words.`;
  }
  return null;
}

export function pageLimitProblem(pages: number): string | null {
  if (pages <= RESOURCE_MAX_PDF_PAGES) return null;
  return `This PDF has ${pages} pages. The Resource Bank reads ${
    RESOURCE_MAX_PDF_PAGES === 1 ? "one page" : `up to ${RESOURCE_MAX_PDF_PAGES} pages`
  } per PDF, so please upload only the page you need, or a screenshot of it.`;
}

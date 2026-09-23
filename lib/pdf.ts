// Counting a PDF's pages, server-side only (node:zlib).

import { inflateSync } from "node:zlib";

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

/**
 * How many pages a PDF has, or 0 when that cannot be told.
 *
 * Counts page objects rather than trusting the page tree's `/Count`, which a
 * nested tree repeats at every level. PDF 1.5 and later can pack page objects
 * into compressed object streams, where the raw bytes never show them, so each
 * object stream is inflated and searched too. No PDF library: this is the one
 * question the route needs answered, and a parser would be a dependency for it.
 */
export function pdfPageCount(bytes: Buffer): number {
  const raw = bytes.toString("latin1");
  let count = raw.match(PAGE_OBJECT)?.length ?? 0;

  const streamStart = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamStart.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const dictionary = raw.slice(raw.lastIndexOf("obj", match.index), match.index);
    if (/\/Type\s*\/ObjStm/.test(dictionary)) {
      try {
        count += inflateSync(bytes.subarray(start, end)).toString("latin1").match(PAGE_OBJECT)?.length ?? 0;
      } catch {
        // Not deflated, or damaged: it contributes nothing.
      }
    }
    streamStart.lastIndex = end + "endstream".length;
  }
  return count;
}

/** A PDF data URL's page count, or 0 when that cannot be told. */
export function dataUrlPageCount(dataUrl: string): number {
  return pdfPageCount(Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
}

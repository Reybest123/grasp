// §3.4 Resource Bank — read one uploaded document, once.
//
// This is the only route in the app that looks at a file, and it runs a single
// time per resource: what it returns is stored on the subject and every later
// call (notes, explanations, quizzes, marking) is handed that text instead. A
// rubric screenshot is therefore never re-read, however often it is used.
//
// The document itself is not persisted anywhere — it goes straight through to
// the provider and the request ends, the same treatment lecture audio gets
// (CLAUDE.md §5).
//
// Cost (§9.1): one read is held under a cent. The input is capped by
// lib/resourceLimits.ts (words for text, pages for a PDF; an image is resized
// by the provider to at most 8 tiles), the reply by MAX_OUTPUT_TOKENS, and the
// number of reads a week by the plan (lib/usage.ts). Every cap is checked
// before anything is sent.

import { NextRequest, NextResponse } from "next/server";
import { inflateSync } from "node:zlib";
import { chatCompletion } from "@/lib/openai";
import { RESOURCE_KINDS, isResourceKind, type ResourceEntry } from "@/lib/resources";
import { pageLimitProblem, textLimitProblem } from "@/lib/resourceLimits";
import { dataUrlType, isSupportedImage, tooLargeMessage, unsupportedFileMessage } from "@/lib/fileTypes";
import { requireUser } from "@/lib/session";
import { claimResourceRead } from "@/lib/usage";

/** The request body limit; base64 inflates a 3 MB file by a third. */
const MAX_DATA_URL = 4_200_000;
const MAX_ENTRIES = 20;
/** Bounds the reply, which is the most expensive side of the call per token. */
const MAX_OUTPUT_TOKENS = 2_000;
/** What is kept of a read. The extraction is stored and sent with later calls. */
const MAX_SUMMARY = 400;
const MAX_LABEL = 80;
const MAX_DETAIL = 300;

const SYSTEM = `You are Grasp, reading a document a student has just added to their subject's Resource Bank. You are reading it once and once only: what you return here is all Grasp will ever know about this document, and it will be used when writing their notes, explaining their work, generating quizzes and marking their answers.

Respond ONLY with JSON of this shape:
{"kind":"...","summary":"...","entries":[{"label":"...","detail":"..."}]}

kind — exactly one of: ${RESOURCE_KINDS.join(", ")}. Pick what the document actually is, not what it is named.

summary — one or two sentences saying what this document is and what it governs. The student reads this on the card, so make it specific: "Marking bands for the source analysis essay; the top band needs two sources compared" beats "a rubric".

entries — the document broken into the rows a student would want to see, in the order they appear. One row per criterion, band, assessment objective, week, section or question. "label" is what the document itself calls it ("Criterion A", "AO2", "Band 4 (10-12 marks)", "Week 4", "Question 7"). "detail" is what it says, in the document's own terms and specific enough to act on — "Analyse GDP data and justify which measure is more reliable", not "analysis skills". Keep each detail under 40 words.

Keep every mark allocation, weighting, percentage, date and command word ("analyse", "evaluate", "justify"): those are exactly the parts that change how Grasp writes and marks. Cover the whole document rather than stopping after the first few rows, up to ${MAX_ENTRIES} entries.

Never invent a criterion, a date, a mark or a weighting that is not in the document. If it is unreadable, blank, or holds nothing structured, return an empty entries array and say so plainly in the summary.

Write plain text in every field — no markdown, no HTML, no emojis.`;

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } }
  | { type: "file"; file: { filename: string; file_data: string } };

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
function pdfPageCount(bytes: Buffer): number {
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

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { name, kind, dataUrl, text, subjectName } = await req.json().catch(() => ({}));

  const filename = typeof name === "string" && name.trim() ? name.trim() : "document";
  const hasFile = typeof dataUrl === "string" && dataUrl.startsWith("data:");
  const hasText = typeof text === "string" && text.trim().length > 0;
  const isPdf = hasFile && dataUrl.startsWith("data:application/pdf");

  if (!hasFile && !hasText) {
    return NextResponse.json({ error: "There was nothing to read." }, { status: 400 });
  }
  if (hasFile && dataUrl.length > MAX_DATA_URL) {
    return NextResponse.json(
      { error: tooLargeMessage("resource") },
      { status: 413 }
    );
  }
  if (hasFile && !isPdf && !isSupportedImage(dataUrlType(dataUrl))) {
    return NextResponse.json(
      { error: unsupportedFileMessage({ type: dataUrlType(dataUrl) }, "resource") },
      { status: 415 }
    );
  }
  if (hasText) {
    const tooLong = textLimitProblem(text);
    if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 });
  }
  if (isPdf) {
    const pages = pdfPageCount(Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
    if (pages === 0) {
      return NextResponse.json(
        {
          error:
            "Grasp could not count the pages in this PDF. Please upload a screenshot of the page you need instead.",
        },
        { status: 400 }
      );
    }
    const tooMany = pageLimitProblem(pages);
    if (tooMany) return NextResponse.json({ error: tooMany }, { status: 400 });
  }

  // Claimed only once the document is known to be within the caps, so a
  // refused upload does not cost the student part of their week.
  const claim = await claimResourceRead(guard.user);
  if (!claim.ok) return claim.response;

  const intro =
    `Subject: ${typeof subjectName === "string" && subjectName.trim() ? subjectName.trim() : "(unknown)"}\n` +
    `File name: ${filename}\n` +
    (isResourceKind(kind) ? `The student filed it as: ${kind}. Correct this if the document is plainly something else.\n` : "") +
    `\nRead the document and return the JSON.`;

  const parts: Part[] = [{ type: "text", text: intro }];
  if (hasFile) {
    // Chat Completions takes an image as a data URL and a PDF as a file part.
    // "high" is set outright rather than left to "auto", so the image cost is
    // the known ceiling of 8 tiles rather than whatever auto picks.
    parts.push(
      isPdf
        ? { type: "file", file: { filename, file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
    );
  }
  if (hasText) {
    parts.push({ type: "text", text: `Document contents:\n\n${text.trim()}` });
  }

  // gpt-4o-mini rather than gpt-4o, to hold a read under a cent: on gpt-4o the
  // reply alone costs four times as much per token, and a full extraction does
  // not fit under a cent there.
  const result = await chatCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: parts },
    ],
    temperature: 0.2,
  });
  if (!result.ok) {
    await claim.release();
    return result.response;
  }

  try {
    const parsed = JSON.parse(result.content || "{}");
    const entries: ResourceEntry[] = (Array.isArray(parsed.entries) ? parsed.entries : [])
      .map((e: { label?: unknown; detail?: unknown }) => ({
        label: typeof e?.label === "string" ? e.label.trim().slice(0, MAX_LABEL) : "",
        detail: typeof e?.detail === "string" ? e.detail.trim().slice(0, MAX_DETAIL) : "",
      }))
      .filter((e: ResourceEntry) => e.label || e.detail)
      .slice(0, MAX_ENTRIES);

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, MAX_SUMMARY) : "";

    // A read with no entries is the model's own way of saying it got nothing
    // out of the document, and a resource that holds nothing actionable would
    // still be offered to every later call as though it did. It fails instead,
    // and the model's reason is worth passing on — "it is a photo of a desk"
    // tells the student what to do about it.
    if (!entries.length) {
      return NextResponse.json(
        {
          error: summary
            ? `Grasp could not get anything usable out of that. ${summary}`
            : "Grasp could not read anything from that document. Please try a clearer copy.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      kind: isResourceKind(parsed.kind) ? parsed.kind : isResourceKind(kind) ? kind : "Other",
      summary,
      entries,
    });
  } catch {
    // Most likely the reply hit MAX_OUTPUT_TOKENS mid-JSON: the document had
    // more rows than a read can hold.
    console.error("[grasp] resource JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      {
        error:
          "Grasp could not read all of that document. Please upload a smaller section of it.",
      },
      { status: 502 }
    );
  }
}

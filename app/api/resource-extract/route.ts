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

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { RESOURCE_KINDS, isResourceKind, type ResourceEntry } from "@/lib/resources";

/** Vercel caps a serverless request body at ~4.5MB; base64 inflates by a third. */
const MAX_DATA_URL = 4_200_000;
const MAX_TEXT = 120_000;
const MAX_ENTRIES = 30;

const SYSTEM = `You are Grasp, reading a document a student has just added to their subject's Resource Bank. You are reading it once and once only: what you return here is all Grasp will ever know about this document, and it will be used when writing their notes, explaining their work, generating quizzes and marking their answers.

Respond ONLY with JSON of this shape:
{"kind":"...","summary":"...","entries":[{"label":"...","detail":"..."}]}

kind — exactly one of: ${RESOURCE_KINDS.join(", ")}. Pick what the document actually is, not what it is named.

summary — one or two sentences saying what this document is and what it governs. The student reads this on the card, so make it specific: "Marking bands for the source analysis essay; the top band needs two sources compared" beats "a rubric".

entries — the document broken into the rows a student would want to see, in the order they appear. One row per criterion, band, assessment objective, week, section or question. "label" is what the document itself calls it ("Criterion A", "AO2", "Band 4 (10-12 marks)", "Week 4", "Question 7"). "detail" is what it says, in the document's own terms and specific enough to act on — "Analyse GDP data and justify which measure is more reliable", not "analysis skills".

Keep every mark allocation, weighting, percentage, date and command word ("analyse", "evaluate", "justify"): those are exactly the parts that change how Grasp writes and marks. Cover the whole document rather than stopping after the first few rows, up to ${MAX_ENTRIES} entries.

Never invent a criterion, a date, a mark or a weighting that is not in the document. If it is unreadable, blank, or holds nothing structured, return an empty entries array and say so plainly in the summary.

Write plain text in every field — no markdown, no HTML, no emojis.`;

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export async function POST(req: NextRequest) {
  const { name, kind, dataUrl, text, subjectName } = await req.json();

  const filename = typeof name === "string" && name.trim() ? name.trim() : "document";
  const hasFile = typeof dataUrl === "string" && dataUrl.startsWith("data:");
  const hasText = typeof text === "string" && text.trim().length > 0;

  if (!hasFile && !hasText) {
    return NextResponse.json({ error: "There was nothing to read." }, { status: 400 });
  }
  if (hasFile && dataUrl.length > MAX_DATA_URL) {
    return NextResponse.json(
      { error: "That file is too large to read. Keep it under 3 MB." },
      { status: 413 }
    );
  }

  const intro =
    `Subject: ${typeof subjectName === "string" && subjectName.trim() ? subjectName.trim() : "(unknown)"}\n` +
    `File name: ${filename}\n` +
    (isResourceKind(kind) ? `The student filed it as: ${kind}. Correct this if the document is plainly something else.\n` : "") +
    `\nRead the document and return the JSON.`;

  const parts: Part[] = [{ type: "text", text: intro }];
  if (hasFile) {
    // Chat Completions takes an image as a data URL and a PDF as a file part.
    parts.push(
      dataUrl.startsWith("data:application/pdf")
        ? { type: "file", file: { filename, file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl } }
    );
  }
  if (hasText) {
    parts.push({ type: "text", text: `Document contents:\n\n${text.trim().slice(0, MAX_TEXT)}` });
  }

  // The one place a stronger model earns its cost: this read happens once per
  // document and everything downstream inherits whatever it gets wrong.
  const result = await chatCompletion({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: parts },
    ],
    temperature: 0.2,
  });
  if (!result.ok) return result.response;

  try {
    const parsed = JSON.parse(result.content || "{}");
    const entries: ResourceEntry[] = (Array.isArray(parsed.entries) ? parsed.entries : [])
      .map((e: { label?: unknown; detail?: unknown }) => ({
        label: typeof e?.label === "string" ? e.label.trim() : "",
        detail: typeof e?.detail === "string" ? e.detail.trim() : "",
      }))
      .filter((e: ResourceEntry) => e.label || e.detail)
      .slice(0, MAX_ENTRIES);

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

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
            : "Grasp could not read anything from that document. Try a clearer copy.",
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
    console.error("[grasp] resource JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not read that document just now. Try again in a moment." },
      { status: 502 }
    );
  }
}

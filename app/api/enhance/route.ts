import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";
import { asBriefs, resourceBlock, splitUsed } from "@/lib/resources";

// Notes are HTML (see lib/richText.ts), so enhancement round-trips HTML too —
// otherwise every enhance would flatten the student's bold, colours and
// checklists. The response is sanitised client-side before it reaches the DOM.
const SYSTEM = `You are Grasp, refining a student's own class notes in place. You are rewriting the note itself — not adding a summary, a study guide, or any section commenting on the note.

The note is HTML. Return the full refined note as HTML only: no markdown, no code fences, no commentary before or after.

Do all four of these:

1. Fact-check. If something the student wrote is wrong, misleading or out of date, correct it silently in the text. Do not leave the error in place and do not add a note about having changed it.
2. Sharpen the wording. Rewrite clumsy or rushed phrasing into clear, confident, well-structured sentences. This is the main thing the student will judge you on, so make the note read noticeably better than what they typed. Keep it their note, not an essay: same voice, same level, no padding and no filler.
3. Improve the structure. Group related points, and turn long run-on passages into short paragraphs or bullets where that genuinely helps readability. Do not bullet everything.
4. Expand where it pays off. Where a point is sound but thin, develop it in place — add the definition, the mechanism, the worked reason, the example or the exception that makes it actually useful for revision. Weave the addition into the surrounding text so it reads as one continuous note. Only add what the material genuinely supports; never invent facts, figures or quotes.

Do not append a "Key takeaways", "Summary" or "Notes" section. Do not add headings the student did not ask for. The output must be the same note, better.

Preserve the student's formatting. Keep every <b>, <i>, <u>, <font size> and <font color> where it already applies, keep checklist items as <p class="check" data-done="true|false"> with their ticked state unchanged, keep any align-center/align-right class on a block exactly as it was, keep every table row and cell in place, and copy any <span class="math" data-tex="..."> equation through character for character, its inner markup included — never retype or reformat one. Never strip emphasis, colour, a checklist, an alignment, a table or an equation the student added.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, and <span class="math" data-tex="...">. Every row of a table must keep the same number of cells.

Never use emojis.`;

function line(label: string, value: unknown): string {
  return typeof value === "string" && value.trim() ? `${label}: ${value.trim()}\n` : "";
}

export async function POST(req: NextRequest) {
  const { body, instructions, subjectName, context, resources } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "No note body provided" }, { status: 400 });
  }

  // §3.4 — the student's own criteria, planners and rubrics, already read once
  // and stored, so an enhance can align the note with what is actually marked.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "marker");

  const head =
    line("Subject", subjectName) +
    line("Background on the student (never write this into the note)", context) +
    line("What the student asked you to focus on", instructions);

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: block ? `${SYSTEM}\n\n${block}` : SYSTEM },
      { role: "user", content: head ? `${head}\nThe note:\n${body}` : body },
    ],
    temperature: 0.4,
  });
  if (!result.ok) return result.response;

  const { text, used } = splitUsed(stripFence(result.content), briefs);
  return NextResponse.json({ enhanced: text || body, used });
}

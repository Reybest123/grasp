// Marks the written answers of a submitted quiz — short and long only.
//
// Multiple choice never reaches here: it is marked client-side by comparing the
// chosen index, which needs no model and can't be got wrong.

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { asBriefs, pickUsed, resourceBlock } from "@/lib/resources";

type Written = { id: string; question: string; modelAnswer: string; answer: string };

export async function POST(req: NextRequest) {
  const { written, notes, context, resources } = await req.json();

  if (!Array.isArray(written) || written.length === 0) {
    return NextResponse.json({ marks: [] });
  }

  const noteList = Array.isArray(notes) ? notes : [];
  const notesContext = noteList.length
    ? `The student's notes, for judging whether an answer matches what they were taught:\n\n${noteList
        .map((n: { title: string; body: string }) => `## ${n.title}\n${n.body}`)
        .join("\n\n")}`
    : "";

  // §3.4 — a rubric is the difference between "that reads fine" and the mark a
  // teacher would actually give it, so marking gets the bank too.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "json");

  const items = (written as Written[])
    .map(
      (w, i) =>
        `[${i + 1}] id: ${w.id}\nQuestion: ${w.question}\nFull-mark answer: ${w.modelAnswer}\nStudent wrote: ${
          w.answer?.trim() ? w.answer.trim() : "(left blank)"
        }`
    )
    .join("\n\n");

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Grasp, marking a school student's written quiz answers. Mark the substance, not the spelling, grammar or length: an answer that says the right thing badly is still correct. " +
          'Use "correct" when the answer covers the key point, "partial" when it is on the right track but misses or muddles something important, and "wrong" when it misses the point, contradicts the material, or is blank. ' +
          "Be fair rather than generous — a student who is told they were right when they were not will walk into the exam thinking they know it. " +
          "Write the feedback as one short sentence addressed to the student, saying what was missing or what earned the mark. Do not restate the whole model answer, and never use emojis. " +
          (block ? `\n\n${block}\n\n` : "") +
          'Mark every question you are given, keyed by the id it came with. Respond ONLY with JSON of the shape: {"marks":[{"id":"...","verdict":"correct","feedback":"..."}],"used":[]}.',
      },
      {
        role: "user",
        content: `${
          typeof context === "string" && context.trim()
            ? `Background on the student (never mark them on this): ${context.trim()}\n\n`
            : ""
        }${notesContext ? `${notesContext}\n\n` : ""}Answers to mark:\n\n${items}`,
      },
    ],
    temperature: 0.2,
  });
  if (!result.ok) return result.response;

  try {
    const parsed = JSON.parse(result.content || "{}");
    const marks = Array.isArray(parsed.marks) ? parsed.marks : [];
    const valid = marks.filter(
      (m: { id?: unknown; verdict?: unknown }) =>
        typeof m?.id === "string" &&
        (m.verdict === "correct" || m.verdict === "partial" || m.verdict === "wrong")
    );
    return NextResponse.json({ marks: valid, used: pickUsed(parsed.used, briefs) });
  } catch {
    console.error("[grasp] marking JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not mark those answers just now. Try again in a moment." },
      { status: 502 }
    );
  }
}

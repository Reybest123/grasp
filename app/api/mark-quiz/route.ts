// Marks the written answers of a submitted quiz — short and long only.
//
// Multiple choice never reaches here: it is marked client-side by comparing the
// chosen index, which needs no model and can't be got wrong.

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { asBriefs, pickUsed, resourceBlock } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { claimMarking } from "@/lib/usage";
import { LIMITS, joinNotes } from "@/lib/costModel";

type Written = { id: string; question: string; modelAnswer: string; answer: string };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { written, notes, context, resources } = await req.json().catch(() => ({}));

  if (!Array.isArray(written) || written.length === 0) {
    return NextResponse.json({ marks: [] });
  }

  // Capped so one marking has a ceiling on cost (lib/costModel.ts).
  const joined = joinNotes(notes);
  const notesContext = joined
    ? `The student's notes, for judging whether an answer matches what they were taught:\n\n${joined}`
    : "";
  const schedule = text(context, LIMITS.contextChars);

  // §3.4 — a rubric is the difference between "that reads fine" and the mark a
  // teacher would actually give it, so marking gets the bank too.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "json");

  const items = (written as Written[])
    .slice(0, LIMITS.markItems)
    .map((w, i) => {
      const answer = text(w?.answer, LIMITS.markAnswerChars);
      return `[${i + 1}] id: ${text(w?.id, 64)}\nQuestion: ${text(w?.question, LIMITS.markQuestionChars)}\nFull-mark answer: ${text(
        w?.modelAnswer,
        LIMITS.markModelAnswerChars
      )}\nStudent wrote: ${answer || "(left blank)"}`;
    })
    .join("\n\n");

  // Retakes can be marked again, so marking has an allowance of its own.
  const spend = await claimMarking(guard.user);
  if (!spend.ok) return spend.response;

  const result = await chatCompletion({
    // Same reasoning model as generation, so a correct working is not marked down.
    model: "gpt-5-mini",
    reasoning_effort: "low",
    max_completion_tokens: LIMITS.markOutputTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Grasp, marking a school student's written quiz answers. Work each question out yourself first and mark against that: if the full-mark answer you are given is itself wrong, mark against the right answer instead. Mark the substance, not the spelling, grammar or length: an answer that says the right thing badly is still correct. " +
          'Use "correct" when the answer covers the key point, "partial" when it is on the right track but misses or muddles something important, and "wrong" when it misses the point, contradicts the material, or is blank. ' +
          "Be fair rather than generous — a student who is told they were right when they were not will walk into the exam thinking they know it. " +
          "Write the feedback as one short sentence addressed to the student, saying what was missing or what earned the mark. Do not restate the whole model answer, and never use emojis. " +
          (block ? `\n\n${block}\n\n` : "") +
          'Mark every question you are given, keyed by the id it came with. Respond ONLY with JSON of the shape: {"marks":[{"id":"...","verdict":"correct","feedback":"..."}],"used":[]}.',
      },
      {
        role: "user",
        content: `${
          schedule ? `Background on the student (never mark them on this): ${schedule}\n\n` : ""
        }${notesContext ? `${notesContext}\n\n` : ""}Answers to mark:\n\n${items}`,
      },
    ],
  });
  if (!result.ok) {
    await spend.release();
    return result.response;
  }

  try {
    const parsed = JSON.parse(result.content || "{}");
    const marks = Array.isArray(parsed.marks) ? parsed.marks : [];
    const valid = marks.filter(
      (m: { id?: unknown; verdict?: unknown }) =>
        typeof m?.id === "string" &&
        (m.verdict === "correct" || m.verdict === "partial" || m.verdict === "wrong")
    );
    // Only a provider failure hands the marking back. Once the model has run the
    // call is paid for, and refunding an unusable reply would let a crafted
    // request be marked for free as many times as it liked.
    return NextResponse.json({ marks: valid, used: pickUsed(parsed.used, briefs) });
  } catch {
    console.error("[grasp] marking JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not mark those answers just now. Try again in a moment." },
      { status: 502 }
    );
  }
}

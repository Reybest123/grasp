import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";

/** Keeps one press from running up a large call. Mirrors the cap in the UI. */
const MAX_PER_KIND = 10;
const MAX_TOTAL = 20;

function clamp(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.min(MAX_PER_KIND, Math.max(0, v));
}

export async function POST(req: NextRequest) {
  const { topics, instructions, notes, context, counts, subjectName } = await req.json();

  const mcq = clamp(counts?.mcq);
  const short = clamp(counts?.short);
  const long = clamp(counts?.long);
  const total = mcq + short + long;

  if (total === 0) {
    return NextResponse.json({ error: "Pick at least one question." }, { status: 400 });
  }
  if (total > MAX_TOTAL) {
    return NextResponse.json(
      { error: `That's more than ${MAX_TOTAL} questions. Trim it down a little.` },
      { status: 400 }
    );
  }

  const noteList = Array.isArray(notes) ? notes : [];
  const notesContext = noteList.length
    ? `Here are the student's actual notes to base questions on:\n\n${noteList
        .map((n: { title: string; body: string }) => `## ${n.title}\n${n.body}`)
        .join("\n\n")}`
    : "";

  // A subject with no notes yet still gets a quiz — it just can't be personal.
  // Saying so in the prompt is better than refusing: a brand-new account would
  // otherwise hit a dead end on the first thing it tries.
  const grounding = noteList.length
    ? "Every question must be answerable from the notes below. Do not test material the notes never cover."
    : "The student has not written any notes for this subject yet, so base the questions on the subject itself at a normal school level. Keep them general rather than pretending to know what the class has covered.";

  const wanted = [
    mcq ? `${mcq} multiple-choice question${mcq > 1 ? "s" : ""} (kind "mcq")` : "",
    short ? `${short} short-answer question${short > 1 ? "s" : ""} (kind "short")` : "",
    long ? `${long} long-answer question${long > 1 ? "s" : ""} (kind "long")` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You are Grasp, generating a personalized quiz for a student. ' +
          grounding +
          ' Never use emojis. If the student has an assessment coming up soon, lean toward exam-style application questions. ' +
          'A "mcq" question has exactly 4 options and exactly one correct answer, given as a 0-based answerIndex; the wrong options must be plausible, not filler. ' +
          'A "short" question expects one or two sentences. A "long" question expects a paragraph and should ask the student to explain, compare or justify rather than recall. ' +
          'Both "short" and "long" carry a modelAnswer: what a full-mark answer would say. ' +
          'Do not explain the answers — explanations are generated later, only if the student asks. ' +
          'Order the questions multiple-choice first, then short, then long. ' +
          'Respond ONLY with JSON of the shape: {"questions":[{"kind":"mcq","question":"...","options":["...","...","...","..."],"answerIndex":0},{"kind":"short","question":"...","modelAnswer":"..."},{"kind":"long","question":"...","modelAnswer":"..."}]}.',
      },
      {
        role: "user",
        content: `Write exactly ${wanted}.\n${
          Array.isArray(topics) && topics.length
            ? `Topics to cover: ${topics.join(", ")}\n`
            : `Subject: ${typeof subjectName === "string" && subjectName.trim() ? subjectName.trim() : "this subject"}\n`
        }${
          typeof context === "string" && context.trim()
            ? `Student's schedule and assessments (background only — never quiz them on this): ${context.trim()}\n`
            : ""
        }${
          typeof instructions === "string" && instructions.trim()
            ? `Focus instructions from the student: ${instructions.trim()}\n`
            : ""
        }${notesContext}`,
      },
    ],
    temperature: 0.6,
  });
  if (!result.ok) return result.response;

  try {
    const parsed = JSON.parse(result.content || "{}");
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    // The model occasionally returns an mcq with a stray fifth option or an
    // answerIndex past the end. Dropping those beats rendering a broken question.
    const clean = questions.filter((q: { kind?: string; options?: unknown[]; answerIndex?: number }) => {
      if (q?.kind !== "mcq") return q?.kind === "short" || q?.kind === "long";
      return (
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.answerIndex === "number" &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length
      );
    });
    return NextResponse.json({ questions: clean });
  } catch {
    console.error("[grasp] quiz JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not build a quiz from that. Try again." },
      { status: 502 }
    );
  }
}

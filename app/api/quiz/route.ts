import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { asBriefs, pickUsed, resourceBlock } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { claimQuiz } from "@/lib/usage";
import { LIMITS, joinNotes } from "@/lib/costModel";

/** Keeps one press from running up a large call. Mirrors the cap in the UI. */
const MAX_PER_KIND = 10;
const MAX_TOTAL = 20;

function clamp(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.min(MAX_PER_KIND, Math.max(0, v));
}

/** Fisher-Yates over the option order, carrying answerIndex along with it. */
function shuffleMcqOptions<T extends { kind?: string; options?: unknown[]; answerIndex?: number }>(
  q: T
): T {
  if (q.kind !== "mcq" || !Array.isArray(q.options)) return q;
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const options = q.options;
  return {
    ...q,
    options: order.map((i) => options[i]),
    answerIndex: order.indexOf(q.answerIndex as number),
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { topics, instructions, notes, context, counts, subjectName, resources } = await req.json();

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

  // Capped so a quiz's cost has a ceiling (lib/costModel.ts). Past the cap the
  // later notes are left out rather than the request refused.
  const joined = joinNotes(notes);
  const noteList = joined ? [joined] : [];
  const notesContext = joined
    ? `Here are the student's actual notes to base questions on:\n\n${joined}`
    : "";
  const topicList = Array.isArray(topics)
    ? topics.slice(0, LIMITS.topics).map((t: unknown) => String(t).slice(0, LIMITS.topicChars))
    : [];
  const focus = typeof instructions === "string" ? instructions.trim().slice(0, LIMITS.instructionsChars) : "";
  const schedule = typeof context === "string" ? context.trim().slice(0, LIMITS.contextChars) : "";

  // A subject with no notes yet still gets a quiz — it just can't be personal.
  // Saying so in the prompt is better than refusing: a brand-new account would
  // otherwise hit a dead end on the first thing it tries.
  const grounding = noteList.length
    ? "Every question must be answerable from the notes below. Do not test material the notes never cover."
    : "The student has not written any notes for this subject yet, so base the questions on the subject itself at a normal school level. Keep them general rather than pretending to know what the class has covered.";

  // §3.4 — the whole point of the bank for quizzes: weight the questions toward
  // what is actually assessed, in the command words the student is marked on.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "json");

  const wanted = [
    mcq ? `${mcq} multiple-choice question${mcq > 1 ? "s" : ""} (kind "mcq")` : "",
    short ? `${short} short-answer question${short > 1 ? "s" : ""} (kind "short")` : "",
    long ? `${long} long-answer question${long > 1 ? "s" : ""} (kind "long")` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // §6 — taken before the model call so the cap holds, and handed back only if
  // the provider fails.
  const spend = await claimQuiz(guard.user);
  if (!spend.ok) return spend.response;

  const result = await chatCompletion({
    // A reasoning model, not gpt-4o-mini: mini wrote answer keys that were
    // simply wrong ("2x + 3 = 11" keyed as x = 5), and a quiz that marks a
    // right answer wrong is worse than no quiz. Reasoning models take no
    // temperature.
    model: "gpt-5-mini",
    reasoning_effort: "medium",
    // Reasoning counts against this too. The costliest quiz measured used 4.7k.
    max_completion_tokens: LIMITS.quizOutputTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You are Grasp, generating a personalized quiz for a student. ' +
          grounding +
          ' Never use emojis. If the student has an assessment coming up soon, lean toward exam-style application questions. ' +
          'A "mcq" question has exactly 4 options and exactly one correct answer, given as a 0-based answerIndex; the wrong options must be plausible, not filler. ' +
          'Work every question out yourself before writing it down, and check that answerIndex points at the option you worked out, and that no other option is also correct. The same goes for every modelAnswer. ' +
          'A "short" question expects one or two sentences. A "long" question expects a paragraph and should ask the student to explain, compare or justify rather than recall. ' +
          'Both "short" and "long" carry a modelAnswer: what a full-mark answer would say. ' +
          'Do not explain the answers — explanations are generated later, only if the student asks. ' +
          'Order the questions multiple-choice first, then short, then long. ' +
          (block ? `\n\n${block}\n\n` : "") +
          'Respond ONLY with JSON of the shape: {"questions":[{"kind":"mcq","question":"...","options":["...","...","...","..."],"answerIndex":0},{"kind":"short","question":"...","modelAnswer":"..."},{"kind":"long","question":"...","modelAnswer":"..."}],"used":[]}.',
      },
      {
        role: "user",
        content: `Write exactly ${wanted}.\n${
          topicList.length
            ? `Topics to cover: ${topicList.join(", ")}\n`
            : `Subject: ${typeof subjectName === "string" && subjectName.trim() ? subjectName.trim().slice(0, 100) : "this subject"}\n`
        }${
          schedule
            ? `Student's schedule and assessments (background only — never quiz them on this): ${schedule}\n`
            : ""
        }${focus ? `Focus instructions from the student: ${focus}\n` : ""}${notesContext}`,
      },
    ],
  });
  if (!result.ok) {
    await spend.release();
    return result.response;
  }

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
    // The model is asked to work out the answer before writing the options
    // down, which in practice means it writes the correct one first far more
    // often than chance — measured runs came back mostly answerIndex 0. That
    // is a real pattern a student would learn to exploit inside a few
    // quizzes, so the order is reshuffled here rather than trusted from the
    // model.
    const shuffled = clean.map(shuffleMcqOptions);
    return NextResponse.json({ questions: shuffled, used: pickUsed(parsed.used, briefs) });
  } catch {
    console.error("[grasp] quiz JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not build a quiz from that. Try again." },
      { status: 502 }
    );
  }
}

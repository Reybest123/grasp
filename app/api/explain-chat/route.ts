import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";
import { asBriefs, pickUsed, resourceBlock } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { chargeAiTokens, checkAiTokens } from "@/lib/usage";
import { LIMITS } from "@/lib/costModel";
import { EQUATION_PROMPT } from "@/lib/math";

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Two modes, chosen by the student (§3.2). Explain answers questions and never
 * touches the note; Refine rewrites the highlighted passage in place. The mode
 * is what tells the model whether changes are wanted, so it is stated plainly.
 */
const MODES = {
  explain: `You are in EXPLAIN mode. Teach it the way a good teacher sitting beside the student would: plain words, straight to the point, no filler, and no repeating back what the student already has written down.

Match the answer to what was asked:
- If the student just asks you to explain it, explain the idea in 2 to 4 sentences: what it means, why it matters, and a quick concrete example if one helps.
- If the student asks a specific question, answer that question and nothing else, in one or two sentences. Do not go on to explain the rest of the selection. For example, asked "what does HDI mean" about "Limitations of HDI: Does not account for inequality, environmental sustainability, or cultural factors", answer along the lines of "HDI is the Human Development Index, a UN measure that ranks countries by life expectancy, education and income." and stop there.
- Follow-up questions work the same way: answer what was asked, at the length it needs.

Explain never changes the note, so revisedNote is always null. If the student asks you to change, rewrite, reword or add anything to the note, do not attempt it and do not offer a workaround. Reply only: "I can't change your note in Explain. Switch to Refine to edit it." If you notice something in the note is wrong, say what is wrong in one sentence and add that Refine can fix it.`,

  refine: `You are in REFINE mode. Rewrite the selected part inside the note and return the full updated note.

If the student gave instructions (a tone, a length, a focus, something to add), do what they asked and nothing more, playful requests included, as long as nothing factual becomes wrong. Only when there are no instructions, make it clearer and better worded, fix anything factually wrong, and expand it where the point is sound but too thin to revise from: add the definition, mechanism, example or exception that makes it useful. Do not invent facts. Keep the student's voice and level.

Leave the rest of the note alone: every other part, and all of the note's structure, comes back unchanged. In your reply, say in one or two sentences what you changed, talking about the content itself (for example "I added what HDI leaves out and an example of each.").

If the student asks a question rather than for a change, answer it briefly and return revisedNote as null.`,
} as const;

const NOTE_FORMAT = `The note is HTML. The revisedNote you return must be the FULL note as HTML using only these tags: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, <span class="math" data-tex="..."> and <p class="eq">. Preserve the student's existing formatting exactly: emphasis, colours, checklist items written as <p class="check" data-done="true|false"> with their ticked state, tables with every row keeping the same number of cells, and every equation copied through with its data-tex exactly as it is, the span left empty.

${EQUATION_PROMPT}`;

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { noteBody, highlight, context, history, mode, resources } = await req
    .json()
    .catch(() => ({}));
  if (typeof noteBody !== "string" || typeof highlight !== "string" || !Array.isArray(history)) {
    return NextResponse.json(
      { error: "Grasp could not tell what to explain. Highlight the passage again." },
      { status: 400 }
    );
  }

  if (noteBody.length > LIMITS.noteChars || highlight.length > LIMITS.noteChars) {
    return NextResponse.json(
      { error: "This note is too long for Grasp to work on in one go. Split it into shorter notes and try again." },
      { status: 413 }
    );
  }

  const refine = mode === "refine";
  const modeRules = refine ? MODES.refine : MODES.explain;

  const tokens = await checkAiTokens(guard.user);
  if (!tokens.ok) return tokens.response;

  // §3.4 — this is the headline case for the Resource Bank: the student asks
  // "does this match the criteria?" and the answer comes from the criteria
  // they actually uploaded, with the panel naming what was read.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "json");

  const schedule =
    typeof context === "string" && context.trim()
      ? `\n\nThe student's schedule for this subject: ${context.trim().slice(0, LIMITS.contextChars)}
Use this naturally when it genuinely helps — e.g. tying revision advice to an upcoming exam or their next class. Do not force it in or mention it in every reply.`
      : "";

  const system = `You are Grasp, a study assistant built into a student's notes. The student has selected part of their note and is talking to you about it.

Never use emojis. Your reply is plain text, not HTML or Markdown.

Never refer to the selection itself. Do not write "the highlighted passage", "the highlighted text", "this passage", "this section", "the selected text" or "your note says". Talk about the subject directly. For "Debt Relief: Reducing or eliminating debt to allow countries to invest in development", start with something like "Debt relief is when...", never "The highlighted passage refers to debt relief".${schedule}

${modeRules}

${refine ? `${NOTE_FORMAT}\n\n` : ""}${block ? `${block}\n\n` : ""}Respond ONLY as JSON in this exact shape:
{"reply": "<your message to the student>", "revisedNote": ${refine ? `"<the full updated note as HTML, or null if nothing should change>"` : "null"}, "used": ["<ids of the resources you drew on, or empty>"]}

The student's full note:
"""${noteBody}"""

The part the student selected:
"""${highlight}"""`;

  const messages = [
    { role: "system", content: system },
    // The most recent messages only, each capped, so a long thread has a ceiling.
    ...(history as ChatMsg[]).slice(-LIMITS.historyMessages).map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? "").slice(0, LIMITS.historyMessageChars),
    })),
  ];

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    // Refine returns the whole note; Explain only a short reply.
    max_completion_tokens: refine ? LIMITS.noteOutputTokens : LIMITS.explainOutputTokens,
    response_format: { type: "json_object" },
    messages,
    temperature: 0.4,
  });
  if (!result.ok) return result.response;
  await chargeAiTokens(guard.user, result.costUsd);

  const raw = result.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    const revised = typeof parsed.revisedNote === "string" ? stripFence(parsed.revisedNote) : "";
    return NextResponse.json({
      reply: parsed.reply ?? "",
      // Explain must never write to the note, whatever the model returns.
      revisedNote: refine ? revised || null : null,
      used: pickUsed(parsed.used, briefs),
    });
  } catch {
    return NextResponse.json({ reply: raw, revisedNote: null, used: [] });
  }
}

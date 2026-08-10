import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Two modes, chosen by the student (§3.2). Explain answers questions and never
 * touches the note; Refine rewrites the highlighted passage in place. The mode
 * is what tells the model whether changes are wanted, so it is stated plainly.
 */
const MODES = {
  explain: `You are in EXPLAIN mode. Answer the student's questions about the highlighted passage and leave the note itself alone — return revisedNote as null. If you spot a mistake, say so in your reply instead of fixing it, and mention they can hit Refine to have it corrected. The only exception is a direct instruction from the student to change the note; then make that change and return the updated note.`,

  refine: `You are in REFINE mode. Improve the highlighted passage inside the note and return the full updated note.

Rewrite the highlighted passage so it is clearer and better worded, fix anything factually wrong in it, and expand it where the point is sound but too thin to revise from — add the definition, mechanism, example or exception that makes it useful. Do not invent facts. Keep the student's voice and level.

Leave the rest of the note alone: every other passage, and all of the note's structure, comes back unchanged. In your reply, tell the student in one or two sentences what you changed and why.`,
} as const;

export async function POST(req: NextRequest) {
  const { noteBody, highlight, context, history, mode } = await req.json();
  if (typeof noteBody !== "string" || typeof highlight !== "string" || !Array.isArray(history)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const modeRules = mode === "refine" ? MODES.refine : MODES.explain;

  const schedule =
    typeof context === "string" && context.trim()
      ? `\n\nThe student's schedule for this subject: ${context.trim()}
Use this naturally when it genuinely helps — e.g. tying revision advice to an upcoming exam or their next class. Do not force it in or mention it in every reply.`
      : "";

  const system = `You are Grasp, a study assistant embedded directly in a student's notes. The student highlighted a passage and is talking to you about it. Write clearly and conversationally, and keep replies fairly short.

Never use emojis.${schedule}

${modeRules}

The note is HTML. Any revisedNote you return must be the FULL note as HTML using only these tags: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol>, <li>, and <span class="math" data-tex="...">. Preserve the student's existing formatting exactly — emphasis, colours, checklist items written as <p class="check" data-done="true|false"> with their ticked state, and equations copied through character for character. Your reply text itself is plain text, not HTML.

Respond ONLY as JSON in this exact shape:
{"reply": "<your message to the student>", "revisedNote": "<the full updated note as HTML, or null if nothing should change>"}

The student's full note is:
"""${noteBody}"""

The highlighted passage is:
"""${highlight}"""`;

  const messages = [
    { role: "system", content: system },
    ...(history as ChatMsg[]).map((m) => ({ role: m.role, content: m.content })),
  ];

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages,
    temperature: 0.4,
  });
  if (!result.ok) return result.response;

  const raw = result.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    const revised = typeof parsed.revisedNote === "string" ? stripFence(parsed.revisedNote) : "";
    return NextResponse.json({
      reply: parsed.reply ?? "",
      revisedNote: revised || null,
    });
  } catch {
    return NextResponse.json({ reply: raw, revisedNote: null });
  }
}

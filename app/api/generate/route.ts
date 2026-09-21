import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";
import { asBriefs, resourceBlock, splitUsed } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { chargeAiTokens, checkAiTokens } from "@/lib/usage";
import { LIMITS } from "@/lib/costModel";
import { EQUATION_PROMPT } from "@/lib/math";

// The blank-note counterpart to /api/enhance (§3.1): writes a starting set of
// notes instead of improving existing ones, so the input is a title/subject
// rather than a body. Same HTML contract and tag allowlist as enhance, since
// the result lands in the same editor.
const SYSTEM = `You are Grasp, writing a first set of class notes for a student whose note is currently blank. Write the notes themselves — not a plan for notes, not a description of what notes would cover.

Return the notes as HTML only: no markdown, no code fences, no commentary before or after.

If the title is a specific, meaningful topic (not empty and not a placeholder like "Untitled note"), base the notes on that topic within the given subject. If the title is empty or generic, write a genuinely useful, topic-neutral starting point for revision notes in that subject instead — something the student would plausibly want to build on, not filler.

Write real content: definitions, mechanisms, worked examples, the kind of detail that's actually useful for revision. Use short paragraphs and bullet points where that helps readability, but do not bullet everything. Keep it concise enough to be a starting point the student edits further, not an exhaustive essay. Never invent specific facts, dates or figures you aren't confident are correct — stay general rather than risk being wrong.

End on the last piece of content. Never close with a sentence addressed to the student or about the notes: no "For further study, consider...", no suggestions of what to explore or read next, no offers of more help ("If you want, I can also..."), no concluding summary or wrap-up line. Do not add a "Summary", "Key takeaways", "Conclusion" or "Further study" section.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, and <span class="math" data-tex="...">, and <p class="eq"> for an equation on its own line. Every row of a table must keep the same number of cells.

${EQUATION_PROMPT}

Never use emojis.`;

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { title, instructions, subjectName, context, resources } = await req
    .json()
    .catch(() => ({}));
  if (typeof subjectName !== "string" || !subjectName.trim()) {
    return NextResponse.json(
      { error: "Give this subject a name first, so Grasp knows what to write about." },
      { status: 400 }
    );
  }

  // §3.4 — a first set of notes should already be pointed at whatever the
  // syllabus and the term planner say the class is actually covering.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "marker");

  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 200) : "";
  const schedule =
    typeof context === "string" && context.trim()
      ? `\n\n${context.trim().slice(0, LIMITS.contextChars)}`
      : "";
  const focus =
    typeof instructions === "string" && instructions.trim()
      ? `\nWhat the student asked you to focus on: ${instructions.trim().slice(0, LIMITS.instructionsChars)}`
      : "";
  const user = `Subject: ${subjectName.trim().slice(0, 100)}
Note title: ${cleanTitle || "(none given)"}${focus}${schedule}`;

  const tokens = await checkAiTokens(guard.user);
  if (!tokens.ok) return tokens.response;

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    max_completion_tokens: LIMITS.generateOutputTokens,
    messages: [
      { role: "system", content: block ? `${SYSTEM}\n\n${block}` : SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0.5,
  });
  if (!result.ok) return result.response;
  await chargeAiTokens(guard.user, result.costUsd);

  const { text, used } = splitUsed(stripFence(result.content), briefs);
  return NextResponse.json({ generated: text, used });
}

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";

// The blank-note counterpart to /api/enhance (§3.1): writes a starting set of
// notes instead of improving existing ones, so the input is a title/subject
// rather than a body. Same HTML contract and tag allowlist as enhance, since
// the result lands in the same editor.
const SYSTEM = `You are Grasp, writing a first set of class notes for a student whose note is currently blank. Write the notes themselves — not a plan for notes, not a description of what notes would cover.

Return the notes as HTML only: no markdown, no code fences, no commentary before or after.

If the title is a specific, meaningful topic (not empty and not a placeholder like "Untitled note"), base the notes on that topic within the given subject. If the title is empty or generic, write a genuinely useful, topic-neutral starting point for revision notes in that subject instead — something the student would plausibly want to build on, not filler.

Write real content: definitions, mechanisms, worked examples, the kind of detail that's actually useful for revision. Use short paragraphs and bullet points where that helps readability, but do not bullet everything. Keep it concise enough to be a starting point the student edits further, not an exhaustive essay. Never invent specific facts, dates or figures you aren't confident are correct — stay general rather than risk being wrong.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, and <span class="math" data-tex="..."> for any equation (LaTeX-lite: \\frac{}{}, ^{}, _{}, \\sqrt{}, Greek letter macros like \\pi). Every row of a table must keep the same number of cells.

Never use emojis.`;

export async function POST(req: NextRequest) {
  const { title, subjectName, context } = await req.json();
  if (typeof subjectName !== "string" || !subjectName.trim()) {
    return NextResponse.json({ error: "No subject provided" }, { status: 400 });
  }

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const schedule = typeof context === "string" && context.trim() ? `\n\n${context.trim()}` : "";
  const user = `Subject: ${subjectName}
Note title: ${cleanTitle || "(none given)"}${schedule}`;

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0.5,
  });
  if (!result.ok) return result.response;

  return NextResponse.json({ generated: stripFence(result.content) });
}

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";

// §3.1 Record — turns the lecture transcript so far into notes, re-run as more
// of the lecture arrives so the student watches the notes build.
//
// This is a third thing from /api/enhance (improve what's written) and
// /api/generate (write from a title): the input is speech, and the job is to
// throw most of it away. Same HTML contract as both, since the result lands in
// the same editor.
const SYSTEM = `You are Grasp, turning a lecture transcript into a student's class notes.

The transcript comes from automatic speech recognition, so expect mishearings, missing punctuation, false starts and repeated words. It may also stop mid-sentence, because the lecture is still running. Write notes for the material that is actually there. Never invent content to fill a gap, never speculate about what the lecturer is about to say, and never mention the transcript, the recording or yourself.

Write notes, not a tidied transcript. Pull out the definitions, mechanisms, worked examples, distinctions, and anything the lecturer flags as important or assessed. Cut greetings, admin, digressions, and repetition. Where the speaker plainly misspoke, or the transcription garbled a technical term that is obvious from context, use the correct term.

Structure it the way a strong student would: short bold headings for each topic, short paragraphs, and bullet points where they earn their place. Do not bullet everything, and do not add a "Summary" or "Key takeaways" section.

A bullet is a <ul><li>. Never fake one by starting a paragraph with a hyphen, dash or asterisk.

Return the notes as HTML only: no markdown, no code fences, no commentary before or after.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, and <span class="math" data-tex="..."> for any equation (LaTeX-lite: \\frac{}{}, ^{}, _{}, \\sqrt{}, Greek letter macros like \\pi). Every row of a table must keep the same number of cells.

Never use emojis.`;

export async function POST(req: NextRequest) {
  const { transcript, subjectName, context, final } = await req.json();

  if (typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json({ error: "Nothing to write up yet." }, { status: 400 });
  }

  const schedule = typeof context === "string" && context.trim() ? `\n\n${context.trim()}` : "";
  const stage = final
    ? "This is the complete lecture. Write the finished set of notes."
    : "The lecture is still running and this transcript is partial. Write the notes for what has been covered so far.";

  const user = `Subject: ${typeof subjectName === "string" ? subjectName : "(unknown)"}
${stage}${schedule}

Transcript:
${transcript.trim()}`;

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    // Low: this is a faithful write-up of what was said, not creative writing.
    temperature: 0.3,
  });
  if (!result.ok) return result.response;

  return NextResponse.json({ notes: stripFence(result.content) });
}

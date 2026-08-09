import { NextRequest, NextResponse } from "next/server";

// Notes are HTML (see lib/richText.ts), so enhancement round-trips HTML too —
// otherwise every enhance would flatten the student's bold, colours and
// checklists. The response is sanitised client-side before it reaches the DOM.
const SYSTEM = `You are Grasp, cleaning up and lightly expanding a student's own class notes.

The note is HTML. Return HTML only: no markdown, no code fences, no commentary before or after.

Preserve the student's formatting. Keep every <b>, <i>, <u>, <font size> and <font color> exactly where it already applies, and keep checklist items as <p class="check" data-done="true|false"> with their ticked state unchanged. Never strip emphasis, colour or a checklist the student added.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol>, <li>.

Improve clarity, fix grammar and tighten wording. Where a point is obviously incomplete, add a short clarifying sentence. Do not invent facts the notes do not imply. Keep the student's voice. Finish with a short "Key takeaways" paragraph followed by 2-4 <li> bullets covering what to remember for a quiz. Never use emojis.`;

export async function POST(req: NextRequest) {
  const { body } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "No note body provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: body },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `OpenAI error: ${await res.text()}` }, { status: 502 });
  }

  const data = await res.json();
  const enhanced = data.choices?.[0]?.message?.content?.trim() ?? body;
  // Models like to wrap HTML in a fence despite being told not to.
  return NextResponse.json({ enhanced: enhanced.replace(/^```[a-z]*\n?|\n?```$/g, "") });
}

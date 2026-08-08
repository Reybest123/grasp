import { NextRequest, NextResponse } from "next/server";

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
        {
          role: "system",
          content:
            "You are Grasp, an AI that cleans up and lightly expands a student's own class notes. Keep their original structure and meaning. Fix unclear phrasing, tighten wording, and append a short '— Key takeaways —' section (2-4 bullet points) summarizing what to remember for a quiz. Do not invent facts not implied by the original notes. Return plain text with blank lines between paragraphs, no markdown headers.",
        },
        { role: "user", content: body },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 502 });
  }

  const data = await res.json();
  const enhanced = data.choices?.[0]?.message?.content?.trim() ?? body;
  return NextResponse.json({ enhanced });
}

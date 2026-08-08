import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
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
            "You are Grasp, a study helper embedded in a student's notes. The student highlighted a passage from their own notes and wants it explained. Explain it clearly and briefly (3-5 sentences), like a helpful margin note. Use plain language, give an example or analogy if useful, and flag a common mistake/confusion if relevant. Do not repeat the passage back verbatim at length.",
        },
        { role: "user", content: `Explain this highlighted note passage:\n\n"${text}"` },
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 502 });
  }

  const data = await res.json();
  const explanation = data.choices?.[0]?.message?.content?.trim() ?? "No explanation returned.";
  return NextResponse.json({ explanation });
}

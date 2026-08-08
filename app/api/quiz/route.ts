import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { topics, instructions, notes } = await req.json();
  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json({ error: "No topics provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const notesContext =
    Array.isArray(notes) && notes.length
      ? `Here are the student's actual notes to base questions on:\n\n${notes
          .map((n: { title: string; body: string }) => `## ${n.title}\n${n.body}`)
          .join("\n\n")}`
      : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are Grasp, generating a personalized quiz from a student\'s own notes. Write 4 multiple-choice questions covering the requested topics. Each question has exactly 4 options and one correct answer. Respond ONLY with JSON of the shape: {"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"why":"one sentence explaining the correct answer"}]}.',
        },
        {
          role: "user",
          content: `Topics to cover: ${topics.join(", ")}\n${
            instructions ? `Focus instructions from the student: ${instructions}\n` : ""
          }${notesContext}`,
        },
      ],
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 502 });
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({ questions: parsed.questions ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to parse quiz JSON" }, { status: 502 });
  }
}

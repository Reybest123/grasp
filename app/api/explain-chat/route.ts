import { NextRequest, NextResponse } from "next/server";

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const { noteBody, highlight, context, history } = await req.json();
  if (typeof noteBody !== "string" || typeof highlight !== "string" || !Array.isArray(history)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const schedule =
    typeof context === "string" && context.trim()
      ? `\n\nThe student's schedule for this subject: ${context.trim()}
Use this naturally when it genuinely helps — e.g. tying revision advice to an upcoming exam or their next class. Do not force it in or mention it in every reply.`
      : "";

  const system = `You are Grasp, a study assistant embedded directly in a student's notes. The student highlighted a passage and is asking about it. Answer clearly and conversationally, and keep replies fairly short.

Never use emojis.${schedule}

Important: you can also CORRECT the student's note. If the student points out an error in the note, or you realise the note is factually wrong or misleading, agree and produce a corrected version of the FULL note. Preserve the note's structure and everything that was already correct — only change what needs fixing. If no change is warranted, do not revise.

Respond ONLY as JSON in this exact shape:
{"reply": "<your message to the student>", "revisedNote": "<the full corrected note text, or null if nothing should change>"}

The student's full note is:
"""${noteBody}"""

The highlighted passage is:
"""${highlight}"""`;

  const messages = [
    { role: "system", content: system },
    ...(history as ChatMsg[]).map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages,
      temperature: 0.4,
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
    return NextResponse.json({
      reply: parsed.reply ?? "",
      revisedNote: parsed.revisedNote ?? null,
    });
  } catch {
    return NextResponse.json({ reply: raw, revisedNote: null });
  }
}

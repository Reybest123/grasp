import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { topics, instructions, notes, context } = await req.json();
  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json({ error: "No topics provided" }, { status: 400 });
  }

  const notesContext =
    Array.isArray(notes) && notes.length
      ? `Here are the student's actual notes to base questions on:\n\n${notes
          .map((n: { title: string; body: string }) => `## ${n.title}\n${n.body}`)
          .join("\n\n")}`
      : "";

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
            'You are Grasp, generating a personalized quiz from a student\'s own notes. Write 4 multiple-choice questions covering the requested topics. Each question has exactly 4 options and one correct answer. Never use emojis. If the student has an exam coming up soon, lean toward exam-style application questions. Respond ONLY with JSON of the shape: {"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"why":"one sentence explaining the correct answer"}]}.',
      },
      {
        role: "user",
        content: `Topics to cover: ${topics.join(", ")}\n${
          typeof context === "string" && context.trim()
            ? `Student's schedule: ${context.trim()}\n`
            : ""
        }${
          instructions ? `Focus instructions from the student: ${instructions}\n` : ""
        }${notesContext}`,
      },
    ],
    temperature: 0.6,
  });
  if (!result.ok) return result.response;

  try {
    const parsed = JSON.parse(result.content || "{}");
    return NextResponse.json({ questions: parsed.questions ?? [] });
  } catch {
    console.error("[grasp] quiz JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not build a quiz from that. Try again." },
      { status: 502 }
    );
  }
}

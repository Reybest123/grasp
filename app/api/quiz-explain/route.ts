// "Explain why I'm wrong" — one question, one answer, one explanation.
//
// Deliberately not a thread (unlike /api/explain-chat): the student is reviewing
// a finished quiz, and this is only called when they press the button on a
// question they got wrong. Nothing here writes to a note.

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { asBriefs, resourceBlock, splitUsed } from "@/lib/resources";

export async function POST(req: NextRequest) {
  const { question, kind, studentAnswer, correctAnswer, notes, context, resources } = await req.json();

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Nothing to explain." }, { status: 400 });
  }

  // §3.4 — "you lost the mark because the band asks you to compare provenance"
  // is a far more useful explanation than a restatement of the right answer.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "marker");

  const noteList = Array.isArray(notes) ? notes : [];
  const notesContext = noteList.length
    ? `The student's own notes on this — explain in the same terms they used:\n\n${noteList
        .map((n: { title: string; body: string }) => `## ${n.title}\n${n.body}`)
        .join("\n\n")}`
    : "";

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are Grasp, explaining to a school student why the answer they gave to a quiz question was not right. " +
          "Start from what they actually wrote or picked: name the specific misunderstanding it points to, rather than only restating the correct answer. If their answer was close, say what it was missing. If they left it blank, skip straight to the reasoning. " +
          "Then walk through how to get to the right answer, so they could do it again on a different question. " +
          "Two or three short paragraphs at most. Plain sentences, no headings, no bullet points, no markdown, no emojis. Address the student directly as 'you'. Be matter-of-fact and encouraging without being patronising — never open by praising the attempt." +
          (block ? `\n\n${block}` : ""),
      },
      {
        role: "user",
        content: `${
          typeof context === "string" && context.trim()
            ? `Background on the student: ${context.trim()}\n\n`
            : ""
        }${notesContext ? `${notesContext}\n\n` : ""}Question (${
          kind === "mcq" ? "multiple choice" : "written answer"
        }): ${question}\n\nThe student answered: ${
          typeof studentAnswer === "string" && studentAnswer.trim()
            ? studentAnswer.trim()
            : "(left blank)"
        }\n\nThe correct answer: ${
          typeof correctAnswer === "string" ? correctAnswer : ""
        }`,
      },
    ],
    temperature: 0.4,
  });
  if (!result.ok) return result.response;

  const { text, used } = splitUsed(result.content.trim(), briefs);
  return NextResponse.json({ explanation: text, used });
}

// "Explain why I'm wrong" — one question, one answer, one explanation.
//
// Deliberately not a thread (unlike /api/explain-chat): the student is reviewing
// a finished quiz, and this is only called when they press the button on a
// question they got wrong. Nothing here writes to a note.

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";
import { asBriefs, resourceBlock, splitUsed } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { chargeAiTokens, checkAiTokens } from "@/lib/usage";
import { LIMITS, joinNotes } from "@/lib/costModel";

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const {
    question,
    kind,
    studentAnswer: rawStudentAnswer,
    correctAnswer: rawCorrectAnswer,
    notes,
    context: rawContext,
    resources,
  } = await req.json().catch(() => ({}));

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Nothing to explain." }, { status: 400 });
  }

  // §3.4 — "you lost the mark because the band asks you to compare provenance"
  // is a far more useful explanation than a restatement of the right answer.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "marker");

  const joined = joinNotes(notes);
  const notesContext = joined
    ? `The student's own notes on this — explain in the same terms they used:\n\n${joined}`
    : "";
  const cap = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const context = cap(rawContext, LIMITS.contextChars);
  const studentAnswer = cap(rawStudentAnswer, LIMITS.quizExplainAnswerChars);
  const correctAnswer = cap(rawCorrectAnswer, LIMITS.quizExplainAnswerChars);

  // AI tokens, not a weekly count: charged at what the call actually cost.
  const tokens = await checkAiTokens(guard.user);
  if (!tokens.ok) return tokens.response;

  const result = await chatCompletion({
    model: "gpt-5-mini",
    reasoning_effort: "low",
    max_completion_tokens: LIMITS.quizExplainOutputTokens,
    messages: [
      {
        role: "system",
        content:
          "You are Grasp, explaining to a school student why the answer they gave to a quiz question was not right. " +
          "Before anything else, work the question out yourself. If the student's answer is actually right and the given correct answer is wrong, say so plainly: tell them their answer was correct, the quiz's answer key was wrong, and show the working. Never invent a mistake to fit a wrong key. " +
          "Otherwise, start from what they actually wrote or picked: name the specific misunderstanding it points to, rather than only restating the correct answer. If their answer was close, say what it was missing. If they left it blank, skip straight to the reasoning. " +
          "Then walk through how to get to the right answer, so they could do it again on a different question. " +
          "Two or three short paragraphs at most. Plain sentences, no headings, no bullet points, no markdown, no emojis. Address the student directly as 'you'. Be matter-of-fact and encouraging without being patronising — never open by praising the attempt." +
          (block ? `\n\n${block}` : ""),
      },
      {
        role: "user",
        content: `${context ? `Background on the student: ${context}\n\n` : ""}${
          notesContext ? `${notesContext}\n\n` : ""
        }Question (${kind === "mcq" ? "multiple choice" : "written answer"}): ${question.slice(
          0,
          LIMITS.quizExplainAnswerChars
        )}\n\nThe student answered: ${studentAnswer || "(left blank)"}\n\nThe correct answer: ${correctAnswer}`,
      },
    ],
  });
  if (!result.ok) return result.response;
  await chargeAiTokens(guard.user, result.costUsd);

  const { text, used } = splitUsed(result.content.trim(), briefs);
  return NextResponse.json({ explanation: text, used });
}

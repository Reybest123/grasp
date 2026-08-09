// AI layer for Grasp.
//
// These functions call server-side API routes under /app/api/*, which in turn
// call the OpenAI API with your key (never exposed to the browser). See §5 of
// CLAUDE.md.
//
// extractTimetable() is still mocked because it needs image-upload handling
// (a vision model reading a screenshot) — wire that up next.

import { makeSlot } from "@/lib/demoData";
import type { ClassSlot } from "@/lib/schedule";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slot = makeSlot;

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  why: string;
};

export type NoteContext = { title: string; body: string };

export type ExtractedSubject = { name: string; classes: ClassSlot[] };

// §2 Onboarding — vision model reads the timetable screenshot -> subjects JSON.
// STILL MOCKED (needs image upload) — returns a sample set after a short delay.
export async function extractTimetable(): Promise<ExtractedSubject[]> {
  await wait(1600);
  return [
    { name: "Biology", classes: [slot(1, "09:00"), slot(3, "11:00"), slot(5, "09:00")] },
    { name: "History", classes: [slot(2, "10:00"), slot(4, "13:00")] },
    { name: "Mathematics", classes: [slot(1, "13:00"), slot(3, "09:00"), slot(5, "11:00")] },
    { name: "Chemistry", classes: [slot(2, "14:00"), slot(4, "09:00")] },
    { name: "English Lit.", classes: [slot(1, "11:00"), slot(4, "11:00")] },
  ];
}

export type ChatMsg = { role: "user" | "assistant"; content: string };

// §3.2 Highlight to Explain (threaded) — the student can ask follow-up questions,
// and the AI may return a corrected version of the whole note (e.g. if the
// student catches a mistake). Real GPT-4o-mini call via /api/explain-chat.
// `context` carries the subject's class times and exam date (lib/schedule) so
// the AI can speak to the student's actual week.
export async function explainChat(
  noteBody: string,
  highlight: string,
  context: string,
  history: ChatMsg[]
): Promise<{ reply: string; revisedNote: string | null }> {
  const res = await fetch("/api/explain-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteBody, highlight, context, history }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { reply: data.error ?? "Something went wrong.", revisedNote: null };
  }
  return { reply: data.reply as string, revisedNote: (data.revisedNote as string) ?? null };
}

// §3.2 Highlight to Explain — real GPT-4o-mini call via /api/explain.
export async function explainHighlight(text: string): Promise<string> {
  const t = text.trim();
  if (t.length < 3) return "Highlight a full phrase or sentence and I'll explain it.";
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: t }),
  });
  const data = await res.json();
  if (!res.ok) return (data.error as string) ?? "Something went wrong.";
  return data.explanation as string;
}

// §3.1 Notes — real AI cleanup / expansion via /api/enhance.
export async function enhanceNote(body: string): Promise<string> {
  const res = await fetch("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) return `${body}\n\n${data.error ?? "Enhancement failed."}`;
  return data.enhanced as string;
}

// §3.3 Subject Quiz Mode — real quiz generation from the student's notes via /api/quiz.
export async function generateQuiz(
  topics: string[],
  instructions: string,
  notes: NoteContext[] = [],
  context = ""
): Promise<QuizQuestion[]> {
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics, instructions, notes, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Quiz generation failed.");
  return data.questions as QuizQuestion[];
}

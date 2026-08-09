// Client-side AI layer.
//
// Every function here calls a route under /app/api/*, which holds the OpenAI
// key server-side (CLAUDE.md §5) — nothing here ever sees it.
//
// extractTimetable() is still mocked; it needs image upload plus a vision model.

import { makeSlot } from "@/lib/subjects";
import type { ClassSlot } from "@/lib/schedule";
import { sanitizeNoteHtml } from "@/lib/richText";

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  why: string;
};

export type NoteContext = { title: string; body: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type ExtractedSubject = { name: string; classes: ClassSlot[] };

async function postJson<T>(path: string, payload: unknown): Promise<T & { error?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return res.ok ? data : { ...data, error: data.error ?? "Something went wrong." };
}

// §2 Onboarding — a vision model reads the timetable screenshot into subjects.
// STILL MOCKED: returns a sample set after a short delay.
export async function extractTimetable(): Promise<ExtractedSubject[]> {
  await new Promise((r) => setTimeout(r, 1600));
  return [
    { name: "Biology", classes: [makeSlot(1, "09:00"), makeSlot(3, "11:00"), makeSlot(5, "09:00")] },
    { name: "History", classes: [makeSlot(2, "10:00"), makeSlot(4, "13:00")] },
    { name: "Mathematics", classes: [makeSlot(1, "13:00"), makeSlot(3, "09:00"), makeSlot(5, "11:00")] },
    { name: "Chemistry", classes: [makeSlot(2, "14:00"), makeSlot(4, "09:00")] },
    { name: "English Lit.", classes: [makeSlot(1, "11:00"), makeSlot(4, "11:00")] },
  ];
}

// §3.2 Highlight to Explain — a thread, so the student can push back and the AI
// can hand back a corrected version of the whole note. `context` carries the
// subject's class times and exams (lib/schedule).
export async function explainChat(
  noteBody: string,
  highlight: string,
  context: string,
  history: ChatMsg[]
): Promise<{ reply: string; revisedNote: string | null }> {
  const data = await postJson<{ reply: string; revisedNote: string | null }>("/api/explain-chat", {
    noteBody,
    highlight,
    context,
    history,
  });
  if (data.error) return { reply: data.error, revisedNote: null };
  return { reply: data.reply, revisedNote: data.revisedNote ?? null };
}

// §3.1 Notes — cleanup and expansion. Takes and returns note HTML so the
// student's formatting survives; the reply is sanitised before it hits the DOM.
export async function enhanceNote(html: string): Promise<string> {
  const data = await postJson<{ enhanced: string }>("/api/enhance", { body: html });
  if (data.error) return html;
  return sanitizeNoteHtml(data.enhanced);
}

// §3.3 Subject Quiz Mode — questions grounded in the student's own notes.
export async function generateQuiz(
  topics: string[],
  instructions: string,
  notes: NoteContext[] = [],
  context = ""
): Promise<QuizQuestion[]> {
  const data = await postJson<{ questions: QuizQuestion[] }>("/api/quiz", {
    topics,
    instructions,
    notes,
    context,
  });
  if (data.error) throw new Error(data.error);
  return data.questions;
}

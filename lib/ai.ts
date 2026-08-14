// Client-side AI layer.
//
// Every function here calls a route under /app/api/*, which holds the OpenAI
// key server-side (CLAUDE.md §5) — nothing here ever sees it.
//
// extractTimetable() is still mocked; it needs image upload plus a vision model.

import { makeSlot } from "@/lib/subjects";
import type { ClassSlot } from "@/lib/schedule";
import { sanitizeNoteHtml, foldHyphenBullets } from "@/lib/richText";

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

// Audio can't go through postJson: it stringifies to JSON. The Content-Type is
// deliberately left unset so fetch generates the multipart boundary itself.
// A dropped connection mid-lecture is plausible enough to catch here rather
// than let it throw into the recording loop.
async function postForm<T>(path: string, form: FormData): Promise<T & { error?: string }> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", body: form });
  } catch {
    return { error: "Grasp could not reach the AI just now. Try again in a moment." } as T & {
      error: string;
    };
  }
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : { ...data, error: data.error ?? "Something went wrong." };
}

// §3.1 Record — one segment of lecture audio through Whisper. A failed segment
// is not fatal: the tab keeps recording and only those few seconds are lost.
export async function transcribeSegment(
  blob: Blob,
  ext: string
): Promise<{ text: string; error: string | null }> {
  const form = new FormData();
  form.append("audio", blob, `segment.${ext}`);
  const data = await postForm<{ text: string }>("/api/transcribe", form);
  if (data.error) return { text: "", error: data.error };
  return { text: typeof data.text === "string" ? data.text : "", error: null };
}

// §3.1 Record — the transcript so far, written up as notes. Called again as the
// lecture goes on, then once more with `final` over the complete transcript.
// Sanitised here like every other path that ends up in the editor's HTML.
export async function liveNotes(
  transcript: string,
  subjectName: string,
  context: string,
  final: boolean
): Promise<{ html: string; error: string | null }> {
  const data = await postJson<{ notes: string }>("/api/live-notes", {
    transcript,
    subjectName,
    context,
    final,
  });
  if (data.error) return { html: "", error: data.error };
  // Sanitise first, then restructure: folding only ever produces <ul>/<li>,
  // which the sanitiser already allows.
  return { html: foldHyphenBullets(sanitizeNoteHtml(data.notes)), error: null };
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
//
// `mode` is the student's answer to "should you change my note?": Explain
// discusses the passage, Refine rewrites it. Note HTML goes both ways so a
// refine can't quietly flatten the student's formatting.
export type ExplainMode = "explain" | "refine";

export async function explainChat(
  noteHtml: string,
  highlight: string,
  context: string,
  history: ChatMsg[],
  mode: ExplainMode
): Promise<{ reply: string; revisedNote: string | null; error: string | null }> {
  const data = await postJson<{ reply: string; revisedNote: string | null }>("/api/explain-chat", {
    noteBody: noteHtml,
    highlight,
    context,
    history,
    mode,
  });
  // A failure is the panel's problem to show, not something the AI "said".
  if (data.error) return { reply: "", revisedNote: null, error: data.error };
  const revised = data.revisedNote?.trim();
  return {
    reply: data.reply,
    revisedNote: revised ? sanitizeNoteHtml(revised) : null,
    error: null,
  };
}

// §3.1 Notes — refine in place. Takes and returns note HTML so the student's
// formatting survives; the reply is sanitised before it hits the DOM. On
// failure the note comes back untouched and the caller shows `error`.
export async function enhanceNote(
  html: string
): Promise<{ html: string; error: string | null }> {
  const data = await postJson<{ enhanced: string }>("/api/enhance", { body: html });
  if (data.error) return { html, error: data.error };
  return { html: sanitizeNoteHtml(data.enhanced), error: null };
}

// §3.1 Notes — the blank-note counterpart to enhance. Writes a starting set of
// notes rather than improving existing ones, so it takes a title/subject
// instead of a body. On failure the caller shows `error` and the note stays
// untouched, same as enhanceNote.
export async function generateNote(
  title: string,
  subjectName: string,
  context: string
): Promise<{ html: string; error: string | null }> {
  const data = await postJson<{ generated: string }>("/api/generate", {
    title,
    subjectName,
    context,
  });
  if (data.error) return { html: "", error: data.error };
  return { html: sanitizeNoteHtml(data.generated), error: null };
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

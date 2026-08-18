// Client-side AI layer.
//
// Every function here calls a route under /app/api/*, which holds the OpenAI
// key server-side (CLAUDE.md §5) — nothing here ever sees it.
//
// Each call carries the subject's Resource Bank as briefs (lib/resources.ts)
// and gets back `cited`: the resources the AI says actually shaped its answer,
// resolved to something the UI can name. Ids are validated server-side against
// what was sent, so a citation can never point at a document that wasn't there.
//
// extractTimetable() is still mocked; it needs image upload plus a vision model.

import { makeSlot } from "@/lib/subjects";
import type { QuizKind, QuizQuestion } from "@/lib/subjects";
import type { ClassSlot } from "@/lib/schedule";
import {
  citationsFor,
  type Citation,
  type ResourceBrief,
  type ResourceEntry,
  type ResourceKind,
} from "@/lib/resources";
import { sanitizeNoteHtml, foldHyphenBullets } from "@/lib/richText";

// The quiz shapes live with the rest of the subject model, since a quiz is
// stored on its subject. Re-exported here so callers of this module don't need
// to import from two places.
export type { QuizKind, QuizQuestion } from "@/lib/subjects";
export type { Citation, ResourceBrief } from "@/lib/resources";

export type NoteContext = { title: string; body: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type ExtractedSubject = { name: string; classes: ClassSlot[] };

/** Every route answers with this alongside its own payload. */
type Used = { used?: string[] };

async function postJson<T>(path: string, payload: unknown): Promise<T & Used & { error?: string }> {
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

/** Ids in, resources out — one line, since every call below ends with it. */
function cite(data: Used, resources: ResourceBrief[]): Citation[] {
  return citationsFor(data.used ?? [], resources);
}

// §3.4 Resource Bank — the one call that reads a document, and the only one
// that ever sees the file. What it returns is stored on the subject; the file
// is not kept, so this never runs a second time for the same document.
export async function extractResource(params: {
  name: string;
  /** left off when the student would rather Grasp worked out what it is */
  kind?: ResourceKind;
  subjectName: string;
  /** an image or PDF as a data URL — this or `text` */
  dataUrl?: string;
  /** pasted text, or the contents of a plain-text file */
  text?: string;
}): Promise<{
  kind: ResourceKind;
  summary: string;
  entries: ResourceEntry[];
  error: string | null;
}> {
  const data = await postJson<{ kind: ResourceKind; summary: string; entries: ResourceEntry[] }>(
    "/api/resource-extract",
    params
  );
  if (data.error) return { kind: params.kind ?? "Other", summary: "", entries: [], error: data.error };
  return {
    kind: data.kind ?? params.kind ?? "Other",
    summary: data.summary ?? "",
    entries: Array.isArray(data.entries) ? data.entries : [],
    error: null,
  };
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
export async function liveNotes(params: {
  transcript: string;
  subjectName: string;
  context: string;
  final: boolean;
  resources: ResourceBrief[];
}): Promise<{ html: string; cited: Citation[]; error: string | null }> {
  const data = await postJson<{ notes: string }>("/api/live-notes", params);
  if (data.error) return { html: "", cited: [], error: data.error };
  // Sanitise first, then restructure: folding only ever produces <ul>/<li>,
  // which the sanitiser already allows.
  return {
    html: foldHyphenBullets(sanitizeNoteHtml(data.notes)),
    cited: cite(data, params.resources),
    error: null,
  };
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

export async function explainChat(params: {
  noteHtml: string;
  highlight: string;
  context: string;
  history: ChatMsg[];
  mode: ExplainMode;
  resources: ResourceBrief[];
}): Promise<{ reply: string; revisedNote: string | null; cited: Citation[]; error: string | null }> {
  const { noteHtml, ...rest } = params;
  const data = await postJson<{ reply: string; revisedNote: string | null }>("/api/explain-chat", {
    noteBody: noteHtml,
    ...rest,
  });
  // A failure is the panel's problem to show, not something the AI "said".
  if (data.error) return { reply: "", revisedNote: null, cited: [], error: data.error };
  const revised = data.revisedNote?.trim();
  return {
    reply: data.reply,
    revisedNote: revised ? sanitizeNoteHtml(revised) : null,
    cited: cite(data, params.resources),
    error: null,
  };
}

// §3.1 Notes — refine in place. Takes and returns note HTML so the student's
// formatting survives; the reply is sanitised before it hits the DOM. On
// failure the note comes back untouched and the caller shows `error`.
export async function enhanceNote(params: {
  html: string;
  /** whatever the student typed into the enhance popup, if anything */
  instructions: string;
  subjectName: string;
  context: string;
  resources: ResourceBrief[];
}): Promise<{ html: string; cited: Citation[]; error: string | null }> {
  const { html, ...rest } = params;
  const data = await postJson<{ enhanced: string }>("/api/enhance", { body: html, ...rest });
  if (data.error) return { html, cited: [], error: data.error };
  return {
    html: sanitizeNoteHtml(data.enhanced),
    cited: cite(data, params.resources),
    error: null,
  };
}

// §3.1 Notes — the blank-note counterpart to enhance. Writes a starting set of
// notes rather than improving existing ones, so it takes a title/subject
// instead of a body. On failure the caller shows `error` and the note stays
// untouched, same as enhanceNote.
export async function generateNote(params: {
  title: string;
  instructions: string;
  subjectName: string;
  context: string;
  resources: ResourceBrief[];
}): Promise<{ html: string; cited: Citation[]; error: string | null }> {
  const data = await postJson<{ generated: string }>("/api/generate", params);
  if (data.error) return { html: "", cited: [], error: data.error };
  return {
    html: sanitizeNoteHtml(data.generated),
    cited: cite(data, params.resources),
    error: null,
  };
}

// §3.3 Subject Quiz Mode — questions grounded in the student's own notes.
//
// Three calls make up a quiz's life: generate it, mark the written answers on
// submit, and — only if the student asks — explain one they got wrong.

export type QuizCounts = { mcq: number; short: number; long: number };

/**
 * The model is not asked for question ids: it would have to invent unique ones
 * and there is nothing to check them against. They are assigned here instead,
 * which also guarantees they line up with the array the student answers.
 */
export async function generateQuiz(params: {
  topics: string[];
  instructions: string;
  notes: NoteContext[];
  context: string;
  counts: QuizCounts;
  /** the fallback when there are no notes and no topics to work from */
  subjectName: string;
  resources: ResourceBrief[];
}): Promise<{ questions: QuizQuestion[]; cited: Citation[]; error: string | null }> {
  const data = await postJson<{ questions: Omit<QuizQuestion, "id">[] }>("/api/quiz", params);
  if (data.error) return { questions: [], cited: [], error: data.error };

  const questions = (data.questions ?? [])
    .filter((q) => q && typeof q.question === "string")
    .map((q, i) => ({ ...q, id: `q${i}` }));

  if (!questions.length) {
    return { questions: [], cited: [], error: "Grasp could not build a quiz from that. Try again." };
  }
  return { questions, cited: cite(data, params.resources), error: null };
}

export type QuizVerdict = "correct" | "partial" | "wrong";
export type QuizMark = { id: string; verdict: QuizVerdict; feedback: string };

/**
 * Short and long answers can't be marked by comparing strings, so one call
 * grades them all against the model answers and the student's notes. Multiple
 * choice never comes through here — it is marked client-side by index.
 */
export async function markQuiz(params: {
  written: { id: string; question: string; modelAnswer: string; answer: string }[];
  notes: NoteContext[];
  context: string;
  resources: ResourceBrief[];
}): Promise<{ marks: QuizMark[]; cited: Citation[]; error: string | null }> {
  if (!params.written.length) return { marks: [], cited: [], error: null };
  const data = await postJson<{ marks: QuizMark[] }>("/api/mark-quiz", params);
  if (data.error) return { marks: [], cited: [], error: data.error };
  return { marks: data.marks ?? [], cited: cite(data, params.resources), error: null };
}

/**
 * One-off, and only ever after the quiz is submitted — the student pressing
 * "Explain why I'm wrong" is what pays for this. There is no thread: if they
 * want to go deeper the notes themselves have Explain.
 */
export async function explainWrongAnswer(params: {
  question: string;
  kind: QuizKind;
  studentAnswer: string;
  correctAnswer: string;
  notes: NoteContext[];
  context: string;
  resources: ResourceBrief[];
}): Promise<{ explanation: string; cited: Citation[]; error: string | null }> {
  const data = await postJson<{ explanation: string }>("/api/quiz-explain", params);
  if (data.error) return { explanation: "", cited: [], error: data.error };
  return {
    explanation: data.explanation ?? "",
    cited: cite(data, params.resources),
    error: null,
  };
}

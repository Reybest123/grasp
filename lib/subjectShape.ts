// What a subject must look like before it is written (lib/subjectsDb.ts).
//
// The save routes take a subject straight from a request body, so nothing about
// its shape can be assumed. Wherever it can be, a bad field is put right rather
// than the save refused: the browser treats a refused save as one that will
// never succeed and stops sending it, and a save that fails in the database is
// retried forever, so either way one bad row would stop a whole subject from
// saving again. Only something that is not a subject at all, or that is past
// the ceilings below, is refused.
//
// The ceilings are not product limits. They are far past anything a student
// reaches (a year of daily lectures in one subject is a few hundred notes and a
// few megabytes) and exist so one account cannot fill the database.

import type { Note, Quiz, Subject } from "@/lib/subjects";
import type { ClassSlot, Exam } from "@/lib/schedule";
import type { Resource } from "@/lib/resources";
import { autoColorKey } from "@/lib/subjectColors";

/**
 * The largest request body a subject save may send. Matched to Next's own
 * limit: proxy.ts runs on every route, and Next buffers only the first 10 MB of
 * a body it passes through a proxy (experimental.proxyClientMaxBodySize), so a
 * larger body reaches the route cut off rather than refused.
 */
export const MAX_SUBJECT_BYTES = 10 * 1024 * 1024;
/** How many subjects one account may replace its list with. */
export const MAX_SUBJECTS = 200;

const MAX = {
  notes: 5000,
  noteChars: 2_000_000,
  quizzes: 2000,
  resources: 200,
  classes: 100,
  exams: 300,
} as const;

/**
 * Ids are minted by the browser (lib/subjects.ts) and have been written several
 * ways over time, so this checks only that one is a usable key, not its
 * format: a row dropped for an unfamiliar id would be a note deleted.
 */
export function isSubjectId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && !value.includes("\u0000");
}

/** Postgres refuses a NUL in text and in JSONB, and one would fail the whole save. */
const clean = (value: string) => (value.includes("\u0000") ? value.replace(/\u0000/g, "") : value);

function text(value: unknown, max: number): string {
  return typeof value === "string" ? clean(value).slice(0, max) : "";
}

function optional(value: unknown, max: number): string | undefined {
  const out = text(value, max).trim();
  return out || undefined;
}

/** A JSON value with every NUL taken out of its strings. */
function cleanJson<T>(value: T): T {
  if (typeof value === "string") return clean(value) as unknown as T;
  if (Array.isArray(value)) return value.map(cleanJson) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[clean(key)] = cleanJson(v);
    return out as T;
  }
  return value;
}

/** The rows of a list that are objects with a usable id, each id once. */
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    if (!isSubjectId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(row as Record<string, unknown>);
  }
  return out;
}

function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const strings = (value: unknown, max: number, chars: number): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string").slice(0, max).map((v) => clean(v).slice(0, chars))
    : [];

/**
 * The subject as it will be stored, or the reason it cannot be. `id` is the
 * one the route authorised, never one from the body.
 */
export function parseSubject(
  value: unknown,
  id: string
): { ok: true; subject: Subject } | { ok: false; error: string; status: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Expected a subject.", status: 400 };
  }
  if (!isSubjectId(id)) return { ok: false, error: "Expected a subject.", status: 400 };
  const v = value as Record<string, unknown>;

  const notes = rows(v.notes);
  const quizzes = rows(v.quizzes);
  const resources = rows(v.resources);
  const classes = rows(v.classes);
  const exams = rows(v.exams);
  const tooBig =
    notes.length > MAX.notes ||
    quizzes.length > MAX.quizzes ||
    resources.length > MAX.resources ||
    classes.length > MAX.classes ||
    exams.length > MAX.exams ||
    notes.some((n) => typeof n.body === "string" && n.body.length > MAX.noteChars);
  if (tooBig) {
    return { ok: false, error: "This subject holds more than Grasp can save.", status: 413 };
  }

  const subject: Subject = {
    id,
    name: text(v.name, 200).trim() || "Untitled subject",
    colorKey: text(v.colorKey, 40) || autoColorKey(0),
    teacher: optional(v.teacher, 200),
    classes: classes
      .filter((c) => Number.isInteger(c.day) && (c.day as number) >= 0 && (c.day as number) <= 6 && text(c.start, 10))
      .map<ClassSlot>((c) => ({
        id: c.id as string,
        day: c.day as number,
        start: text(c.start, 10),
        end: optional(c.end, 10),
        room: optional(c.room, 100),
      })),
    exams: exams
      .filter((e) => typeof e.date === "string" && isDay(e.date))
      .map<Exam>((e) => ({ id: e.id as string, date: e.date as string, title: optional(e.title, 300) })),
    notes: notes.map<Note>((n) => ({
      id: n.id as string,
      title: text(n.title, 500),
      body: text(n.body, MAX.noteChars),
      updated: text(n.updated, 40),
      ...(n.recorded === true ? { recorded: true as const } : {}),
    })),
    resources: resources.map<Resource>((r) => ({
      id: r.id as string,
      name: text(r.name, 300),
      kind: (text(r.kind, 60) || "Other") as Resource["kind"],
      summary: text(r.summary, 2000),
      entries: (Array.isArray(r.entries) ? r.entries : [])
        .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
        .slice(0, 100)
        .map((e) => ({ label: text(e.label, 300), detail: text(e.detail, 2000) })),
      status: r.status === "failed" ? "failed" : "ready",
      error: optional(r.error, 500),
      added: text(r.added, 40),
    })),
    quizTopics: strings(v.quizTopics, 100, 200),
    quizzes: quizzes.map<Quiz>((q) => ({
      id: q.id as string,
      title: text(q.title, 300),
      created: text(q.created, 40),
      topics: strings(q.topics, 100, 200),
      instructions: text(q.instructions, 4000),
      noteIds: strings(q.noteIds, MAX.notes, 200),
      // Read and written whole (db/schema.sql), so only their outer shape is
      // checked: a list, a map, a map.
      questions: Array.isArray(q.questions) ? (cleanJson(q.questions.slice(0, 100)) as Quiz["questions"]) : [],
      answers:
        q.answers && typeof q.answers === "object" && !Array.isArray(q.answers)
          ? (cleanJson(q.answers) as Quiz["answers"])
          : {},
      submitted: q.submitted === true,
      score:
        q.score && typeof q.score === "object" && !Array.isArray(q.score)
          ? (cleanJson(q.score) as Quiz["score"])
          : undefined,
      builtWith: Array.isArray(q.builtWith) ? (cleanJson(q.builtWith) as Quiz["builtWith"]) : undefined,
      markedWith: Array.isArray(q.markedWith) ? (cleanJson(q.markedWith) as Quiz["markedWith"]) : undefined,
      colorKey: optional(q.colorKey, 40),
      retaken: q.retaken === true ? true : undefined,
    })),
  };
  return { ok: true, subject };
}

/**
 * The request body as JSON, read no further than MAX_SUBJECT_BYTES. A declared
 * Content-Length past it is refused before anything is read, and a body sent
 * without one (chunked) is counted as it arrives and abandoned once it passes
 * the cap, so neither can make the server hold an unbounded body.
 */
export async function readCappedJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_SUBJECT_BYTES) return { ok: false, status: 413 };
  if (!req.body) return { ok: true, body: {} };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SUBJECT_BYTES) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }
  try {
    return { ok: true, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    // A body that stops at the limit was cut off on the way in (see
    // MAX_SUBJECT_BYTES), so it is too large rather than malformed.
    return size >= MAX_SUBJECT_BYTES ? { ok: false, status: 413 } : { ok: true, body: {} };
  }
}

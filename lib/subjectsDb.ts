// Subjects in Postgres — the server side of what lib/subjectsStore.tsx used to
// keep in localStorage.
//
// Everything here is scoped to a user id and every query says so, including the
// ones that look up a single record by its own primary key. A subject id is
// minted by the client and therefore guessable, so `where id = $1` alone would
// let a signed-in student read or overwrite someone else's notebook by id. The
// `and user_id = $2` is the authorisation, not decoration.
//
// Server-side only: imports lib/db.ts.

import { sql, transaction } from "@/lib/db";
import type { Subject, Note, Quiz } from "@/lib/subjects";
import type { ClassSlot, Exam } from "@/lib/schedule";
import type { Resource } from "@/lib/resources";

type SubjectRow = {
  id: string;
  name: string;
  color_key: string;
  teacher: string | null;
  position: number;
  quiz_topics: unknown;
};

/**
 * Postgres `date` comes back as a Date or an ISO string depending on driver.
 *
 * The Date branch must read *local* components, not `toISOString()`. The driver
 * parses a bare `2026-11-12` into local midnight, so converting that back
 * through UTC moves the day for anyone east of Greenwich — an exam saved for
 * the 12th read back as the 11th, and every countdown built on it was a day
 * out. `getFullYear`/`getMonth`/`getDate` reverse the parse exactly.
 *
 * An exam is a day, not an instant (db/schema.sql says so), so there is no
 * timezone question to answer here — only a formatting one.
 */
function isoDate(value: unknown): string {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function isoStamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

/**
 * A note's own last-edit time, kept across saves. Every save rewrites every
 * note in the subject, so stamping `now()` here reset "3 days ago" on all of
 * them the moment any one was touched. The value comes from the client, so an
 * unreadable or future time falls back to now rather than failing the save.
 */
function noteStamp(value: unknown): string {
  const t = typeof value === "string" ? Date.parse(value) : NaN;
  const now = Date.now();
  return new Date(Number.isNaN(t) || t > now + 60_000 ? now : t).toISOString();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * The whole workspace in one go — five queries rather than one per subject,
 * gathered by subject id client-side. The alternative is a single joined query,
 * which multiplies every note by every quiz and has to be de-duplicated back
 * out; at this size the extra round trips are cheaper than that.
 */
export async function loadSubjects(userId: string): Promise<Subject[]> {
  const subjects = (await sql`
    select id, name, color_key, teacher, position, quiz_topics
    from subjects where user_id = ${userId}
    order by position asc, created_at asc
  `) as SubjectRow[];

  if (!subjects.length) return [];

  const ids = subjects.map((s) => s.id);

  const [slots, exams, notes, resources, quizzes] = await Promise.all([
    sql`select * from class_slots where subject_id = any(${ids}) order by day asc, start_time asc`,
    sql`select * from exams where subject_id = any(${ids}) order by exam_date asc`,
    sql`select * from notes where subject_id = any(${ids}) order by position asc, updated_at desc`,
    sql`select * from resources where subject_id = any(${ids}) order by position asc, added_at asc`,
    sql`select * from quizzes where subject_id = any(${ids}) order by created_at desc`,
  ]);

  /** Rows grouped by their subject_id, so each subject is assembled in one pass. */
  function bucket<T extends { subject_id: string }>(rows: unknown): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of asArray<T>(rows)) {
      const list = map.get(row.subject_id);
      if (list) list.push(row);
      else map.set(row.subject_id, [row]);
    }
    return map;
  }

  const slotsBy = bucket<{ subject_id: string; id: string; day: number; start_time: string; end_time: string | null; room: string | null }>(slots);
  const examsBy = bucket<{ subject_id: string; id: string; exam_date: unknown; title: string | null }>(exams);
  const notesBy = bucket<{ subject_id: string; id: string; title: string; body: string; updated_at: unknown; recorded: boolean }>(notes);
  const resourcesBy = bucket<{ subject_id: string; id: string; name: string; kind: string; summary: string; entries: unknown; status: string; error: string | null; added_at: unknown }>(resources);
  const quizzesBy = bucket<Record<string, unknown> & { subject_id: string }>(quizzes);

  return subjects.map((s) => ({
    id: s.id,
    name: s.name,
    colorKey: s.color_key,
    teacher: s.teacher ?? undefined,
    classes: (slotsBy.get(s.id) ?? []).map<ClassSlot>((c) => ({
      id: c.id,
      day: c.day,
      start: c.start_time,
      end: c.end_time ?? undefined,
      room: c.room ?? undefined,
    })),
    exams: (examsBy.get(s.id) ?? []).map<Exam>((e) => ({
      id: e.id,
      date: isoDate(e.exam_date),
      title: e.title ?? undefined,
    })),
    notes: (notesBy.get(s.id) ?? []).map<Note>((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      updated: isoStamp(n.updated_at),
      // Only carried when true. Every note predating the column reads back
      // false, which is correct — they were all typed.
      ...(n.recorded ? { recorded: true as const } : {}),
    })),
    resources: (resourcesBy.get(s.id) ?? []).map<Resource>((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind as Resource["kind"],
      summary: r.summary,
      entries: asArray(r.entries),
      status: r.status === "failed" ? "failed" : "ready",
      error: r.error ?? undefined,
      added: isoStamp(r.added_at),
    })),
    quizTopics: asArray<string>(s.quiz_topics),
    quizzes: (quizzesBy.get(s.id) ?? []).map<Quiz>((q) => ({
      id: String(q.id),
      title: String(q.title ?? ""),
      created: isoStamp(q.created_at),
      topics: asArray<string>(q.topics),
      instructions: String(q.instructions ?? ""),
      noteIds: asArray<string>(q.note_ids),
      questions: asArray(q.questions),
      answers: (q.answers ?? {}) as Quiz["answers"],
      submitted: Boolean(q.submitted),
      score: (q.score ?? undefined) as Quiz["score"],
      builtWith: (q.built_with ?? undefined) as Quiz["builtWith"],
      markedWith: (q.marked_with ?? undefined) as Quiz["markedWith"],
      colorKey: q.color_key ? String(q.color_key) : undefined,
    })),
  }));
}

/**
 * Write one subject and everything under it.
 *
 * The children are deleted and re-inserted rather than diffed. The client hands
 * over the whole subject as its current truth — that is the shape the store has
 * always had — and reconciling it row by row would mean working out which of
 * fifteen notes changed, for no gain at this size. `on conflict` on the parent
 * keeps the subject row itself stable so the cascade never fires on it.
 *
 * Returns false when the id belongs to somebody else, rather than throwing:
 * a throw here reaches `query()` in lib/db.ts, which cannot tell one apart from
 * a dropped connection and so reported a refused write as "Grasp could not
 * reach its database" — a 502 for what is really a 404, logged as a database
 * fault. The caller turns this into the right status.
 *
 * One transaction: the child rows are deleted and re-inserted together, so a
 * failed insert rolls the deletes back rather than losing the notes they held.
 * The upsert locks the subject row until commit, which also makes two saves
 * of the same subject arriving at once run one after the other rather than
 * interleaving their deletes and inserts.
 */
export async function saveSubject(userId: string, subject: Subject): Promise<boolean> {
  return transaction(async (sql) => {
    await sql`
      insert into subjects (id, user_id, name, color_key, teacher, position, quiz_topics)
      values (
        ${subject.id}, ${userId}, ${subject.name}, ${subject.colorKey},
        ${subject.teacher ?? null}, ${0}, ${JSON.stringify(subject.quizTopics ?? [])}
      )
      on conflict (id) do update set
        name = excluded.name,
        color_key = excluded.color_key,
        teacher = excluded.teacher,
        quiz_topics = excluded.quiz_topics
      where subjects.user_id = ${userId}
    `;

    // If the row already existed under another account the update above matched
    // nothing, so nothing may be written beneath it either.
    const owned = (await sql`
      select 1 from subjects where id = ${subject.id} and user_id = ${userId}
    `) as unknown[];
    if (!owned.length) return false;

    // One statement at a time: a transaction runs on a single connection, and
    // the driver has deprecated queueing overlapping queries on one.
    await sql`delete from class_slots where subject_id = ${subject.id}`;
    await sql`delete from exams where subject_id = ${subject.id}`;
    await sql`delete from notes where subject_id = ${subject.id}`;
    await sql`delete from resources where subject_id = ${subject.id}`;
    await sql`delete from quizzes where subject_id = ${subject.id}`;

    // Each table's rows go in as one statement from a JSON array, rather than
    // one round trip per note, slot, exam, resource and quiz.
    if (subject.classes.length) {
      const rows = subject.classes.map((c) => ({
        id: c.id, day: c.day, start_time: c.start, end_time: c.end ?? null, room: c.room ?? null,
      }));
      await sql`
        insert into class_slots (id, subject_id, day, start_time, end_time, room)
        select r.id, ${subject.id}, r.day, r.start_time, r.end_time, r.room
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(id text, day integer, start_time text, end_time text, room text)
      `;
    }
    if (subject.exams.length) {
      const rows = subject.exams.map((e) => ({ id: e.id, exam_date: e.date, title: e.title ?? null }));
      await sql`
        insert into exams (id, subject_id, exam_date, title)
        select r.id, ${subject.id}, r.exam_date, r.title
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(id text, exam_date date, title text)
      `;
    }
    if (subject.notes.length) {
      const rows = subject.notes.map((n, i) => ({
        id: n.id, title: n.title, body: n.body, position: i,
        updated_at: noteStamp(n.updated), recorded: n.recorded ?? false,
      }));
      await sql`
        insert into notes (id, subject_id, title, body, position, updated_at, recorded)
        select r.id, ${subject.id}, r.title, r.body, r.position, r.updated_at, r.recorded
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(id text, title text, body text, position integer, updated_at timestamptz, recorded boolean)
      `;
    }
    if (subject.resources.length) {
      const rows = subject.resources.map((r, i) => ({
        id: r.id, name: r.name, kind: r.kind, summary: r.summary,
        entries: r.entries ?? [], status: r.status, error: r.error ?? null, position: i,
        added_at: noteStamp(r.added),
      }));
      await sql`
        insert into resources (id, subject_id, name, kind, summary, entries, status, error, position, added_at)
        select r.id, ${subject.id}, r.name, r.kind, r.summary, r.entries, r.status, r.error, r.position, r.added_at
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(id text, name text, kind text, summary text, entries jsonb, status text, error text, position integer, added_at timestamptz)
      `;
    }
    if (subject.quizzes.length) {
      // created_at is sent too: left to its default it was reset to now() on
      // every save, so every quiz read "just now" and the grid lost its order.
      const rows = subject.quizzes.map((q) => ({
        id: q.id, title: q.title, topics: q.topics ?? [], instructions: q.instructions ?? "",
        note_ids: q.noteIds ?? [], questions: q.questions ?? [], answers: q.answers ?? {},
        submitted: q.submitted, score: q.score ?? null, built_with: q.builtWith ?? null,
        marked_with: q.markedWith ?? null, color_key: q.colorKey ?? null, created_at: noteStamp(q.created),
      }));
      await sql`
        insert into quizzes (
          id, subject_id, title, topics, instructions, note_ids, questions, answers,
          submitted, score, built_with, marked_with, color_key, created_at
        )
        select
          r.id, ${subject.id}, r.title, r.topics, r.instructions, r.note_ids, r.questions, r.answers,
          r.submitted, r.score, r.built_with, r.marked_with, r.color_key, r.created_at
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(
            id text, title text, topics jsonb, instructions text, note_ids jsonb, questions jsonb,
            answers jsonb, submitted boolean, score jsonb, built_with jsonb, marked_with jsonb,
            color_key text, created_at timestamptz
          )
      `;
    }

    return true;
  });
}

/** Positions are rewritten whenever the grid's order can have changed. */
export async function saveOrder(userId: string, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(
      (id, i) => sql`update subjects set position = ${i} where id = ${id} and user_id = ${userId}`
    )
  );
}

export async function deleteSubject(userId: string, id: string): Promise<void> {
  // The children go with it through `on delete cascade` in db/schema.sql.
  await sql`delete from subjects where id = ${id} and user_id = ${userId}`;
}

/** Onboarding (§2): the extracted timetable becomes the whole subject list. */
export async function replaceAllSubjects(userId: string, subjects: Subject[]): Promise<void> {
  await sql`delete from subjects where user_id = ${userId}`;
  for (const [i, subject] of subjects.entries()) {
    await saveSubject(userId, subject);
    await sql`update subjects set position = ${i} where id = ${subject.id} and user_id = ${userId}`;
  }
}

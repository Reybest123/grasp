// The numbers the home dashboard shows.
//
// Derived here rather than inside the page so each figure has one definition
// and can be read without reading JSX, and so the thresholds that colour them
// are shared with the quiz results screen instead of being written twice.
//
// Everything below is computed from data the app already stores — a note's
// `updated` stamp, a quiz's `created` stamp and its marks. Nothing new is
// recorded to make the dashboard work, which also bounds what it can honestly
// claim; `weekActivity` documents the one place that matters.

import type { Subject } from "@/lib/subjects";

/**
 * The 0.8 / 0.5 bands the quiz score chip and question borders already use.
 * Kept here so the dashboard and the results screen cannot drift apart on what
 * counts as a good score.
 */
export type BandName = "strong" | "fair" | "weak";

export function bandOf(pct: number): BandName {
  if (pct >= 0.8) return "strong";
  if (pct >= 0.5) return "fair";
  return "weak";
}

/** Ring/arc stroke colour per band. */
export const BAND_RING: Record<BandName, string> = {
  strong: "text-emerald-500",
  fair: "text-amber-500",
  weak: "text-red-500",
};

/** Filled bar colour per band, for the strength bars in the subject list. */
export const BAND_BAR: Record<BandName, string> = {
  strong: "bg-emerald-500",
  fair: "bg-amber-500",
  weak: "bg-red-400",
};

/** Text colour per band, for a percentage printed beside a bar. */
export const BAND_TEXT: Record<BandName, string> = {
  strong: "text-emerald-600",
  fair: "text-amber-600",
  weak: "text-red-500",
};

export type Understanding = {
  /** 0 to 1 */
  pct: number;
  got: number;
  total: number;
  /** how many marked quizzes went into it */
  quizzes: number;
};

/**
 * How well the student is doing, across every quiz that has actually been
 * marked. Returns null when none have been — a zero would read as "you scored
 * nothing" rather than "there is nothing to score yet", and the two want
 * different words on screen.
 *
 * Weighted by marks, not by averaging each quiz's percentage: a twenty-mark
 * paper says more about a student than a three-mark one, and averaging the
 * percentages would let the small quiz shout as loudly as the big one.
 */
export function understanding(subjects: Subject[]): Understanding | null {
  let got = 0;
  let total = 0;
  let quizzes = 0;

  for (const subject of subjects) {
    for (const quiz of subject.quizzes) {
      if (!quiz.submitted || !quiz.score?.total) continue;
      got += quiz.score.got;
      total += quiz.score.total;
      quizzes += 1;
    }
  }

  if (!quizzes || !total) return null;
  return { pct: got / total, got, total, quizzes };
}

/** The same figure for one subject — what the dashboard's strength bars show. */
export function subjectUnderstanding(subject: Subject): Understanding | null {
  return understanding([subject]);
}

export type ActivityDay = {
  /** local midnight of the day this bucket covers */
  date: Date;
  notes: number;
  quizzes: number;
  total: number;
  today: boolean;
};

/** Local midnight. Never via UTC — see `isoDate` in lib/subjectsDb.ts. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Work touched on each of the last `days` days, oldest first.
 *
 * Days are built by date arithmetic and matched by a year/month/day key rather
 * than by dividing a millisecond difference by 86,400,000. The clocks go
 * forward and back, so one local day is not always that many milliseconds, and
 * the arithmetic version silently puts a day's work in the wrong column twice a
 * year — the same class of bug the exam-date formatting already had to route
 * around.
 *
 * **A known limit, worth stating:** a note carries only its *last* edit, so
 * re-editing an old note moves its whole contribution to today and it stops
 * counting for the day it was written. The chart therefore reads as "days you
 * touched something", which is what it says on screen — not a full history.
 * Recording that properly means storing an edit log, which is a lot of rows for
 * a chart this size.
 */
export function weekActivity(subjects: Subject[], now: Date, days = 7): ActivityDay[] {
  const base = startOfDay(now);
  const todayKey = dayKey(base);

  const out: ActivityDay[] = [];
  const index = new Map<string, ActivityDay>();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const bucket: ActivityDay = {
      date,
      notes: 0,
      quizzes: 0,
      total: 0,
      today: dayKey(date) === todayKey,
    };
    out.push(bucket);
    index.set(dayKey(date), bucket);
  }

  // Undated or unparseable stamps are dropped rather than guessed at — a
  // legacy note carrying the old prose timestamp belongs in no column.
  const bucketFor = (iso: string): ActivityDay | undefined => {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return undefined;
    return index.get(dayKey(new Date(ms)));
  };

  for (const subject of subjects) {
    for (const note of subject.notes) {
      const bucket = bucketFor(note.updated);
      if (!bucket) continue;
      bucket.notes += 1;
      bucket.total += 1;
    }
    for (const quiz of subject.quizzes) {
      const bucket = bucketFor(quiz.created);
      if (!bucket) continue;
      bucket.quizzes += 1;
      bucket.total += 1;
    }
  }

  return out;
}

/** How many of the last seven days had any work on them at all. */
export function activeDays(week: ActivityDay[]): number {
  return week.filter((d) => d.total > 0).length;
}

/** Quizzes generated inside the window — what the plan's weekly cap counts. */
export function quizzesIn(week: ActivityDay[]): number {
  return week.reduce((n, d) => n + d.quizzes, 0);
}

// Class times + exams.
//
// Everything here is optional per subject (CLAUDE.md §3): a student can add a
// full weekly timetable, a few exam dates, or nothing at all. Whatever they do
// add is fed to the AI as context (see `subjectContext`) so it can say things
// like "your test is Wednesday — worth revising enzymes".

export type ClassSlot = {
  id: string;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** 24h "HH:MM" */
  start: string;
  /** 24h "HH:MM", optional */
  end?: string;
  room?: string;
};

/** A subject can have any number of these — mocks, papers, essays, tests. */
export type Exam = {
  id: string;
  /** ISO "YYYY-MM-DD" */
  date: string;
  title?: string;
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:00" -> "9:00am" */
export function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? "00"}${suffix}`;
}

function minutesInto(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type NextClass = {
  slot: ClassSlot;
  daysAway: number;
  /** minutes from `now` until it starts — used to rank across subjects */
  minutesAway: number;
};

/** The soonest upcoming occurrence of any weekly slot, relative to `now`. */
export function nextClass(classes: ClassSlot[], now: Date): NextClass | null {
  if (!classes.length) return null;
  const nowDay = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  let best: NextClass | null = null;

  for (const slot of classes) {
    let daysAway = (slot.day - nowDay + 7) % 7;
    // Already started today? roll it to next week.
    if (daysAway === 0 && minutesInto(slot.start) <= nowMins) daysAway = 7;
    const minutesAway = daysAway * 1440 + minutesInto(slot.start) - nowMins;
    if (!best || minutesAway < best.minutesAway) best = { slot, daysAway, minutesAway };
  }
  return best;
}

/** "today" / "tomorrow" / "Wed" for a slot that is `daysAway` days out. */
export function relativeDay(daysAway: number, day: number): string {
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return DAY_SHORT[day];
}

/** "Next class today at 1:00pm" / "Next class Wed at 11:00am" */
export function nextClassLabel(classes: ClassSlot[], now: Date): string | null {
  const next = nextClass(classes, now);
  if (!next) return null;
  return `Next class ${relativeDay(next.daysAway, next.slot.day)} at ${formatTime(next.slot.start)}`;
}

/** Whole days between today and an ISO "YYYY-MM-DD" date. Negative = past. */
export function daysUntil(isoDate: string, now: Date): number | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * How long ago a note was touched, for the note list: "just now", "2h ago",
 * "yesterday", then a plain date once it is old enough that a count of days
 * stops meaning anything.
 *
 * `Note.updated` used to hold this string itself — "2 hours ago" was stored
 * and the list printed it verbatim, so a note saved yesterday still
 * claimed to be two hours old forever. It holds an ISO timestamp now, which is
 * the only version of this that can be stored, and the wording is derived here
 * at render time instead.
 *
 * Returns "" for anything unparseable rather than "Invalid Date", so a legacy
 * note carrying the old prose shows no timestamp instead of showing nonsense.
 */
export function updatedLabel(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const seconds = Math.round((now.getTime() - then) / 1000);
  // A clock skew between server and browser can put a save slightly in the
  // future; "in 3 seconds" would be a strange thing for a note list to say.
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;

  const days = Math.floor(seconds / 86_400);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export type ExamStatus = {
  exam: Exam;
  /** "Paper 2 mock Wednesday · in 3 days" / "Paper 2 mock · overdue by 2 weeks" */
  label: string;
  /** "in 3 months", "tomorrow", "overdue by 2 days" */
  when: string;
  /** the chip's wording: "3 months", "Tomorrow", "Overdue" */
  short: string;
  /** "Wed 12 Nov", with the year when it is not this year */
  date: string;
  /** negative once the date has passed */
  days: number;
  /** within the next week — the card highlights it */
  soon: boolean;
  /**
   * The date has passed. An assessment stays listed until the student deletes
   * it or marks it resolved, rather than vanishing the day after, which made it
   * look as though Grasp had lost it.
   */
  overdue: boolean;
};

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** Whole calendar months from `from` to `to`, not counting a month still running. */
function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  return to.getDate() < from.getDate() ? months - 1 : months;
}

/**
 * The gap between two local midnights in the unit a person would use: days
 * under a fortnight, weeks under two months, months under a year, then years.
 * A plain day count stops meaning anything past a few weeks — a date typed a
 * few digits wrong once read "in 36333005 days". `short` drops the leftover
 * months from a count of years, for a chip.
 */
export function spanLabel(from: Date, to: Date, short = false): string {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days < 14) return plural(days, "day");
  const months = monthsBetween(from, to);
  if (months < 2) return plural(Math.floor(days / 7), "week");
  if (months < 12) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest && !short ? `${plural(years, "year")} ${plural(rest, "month")}` : plural(years, "year");
}

/** Countdown for a single exam, overdue or not. Null only when it has no usable date. */
export function examStatus(exam: Exam, now: Date): ExamStatus | null {
  if (!exam.date) return null;
  const days = daysUntil(exam.date, now);
  if (days === null) return null;

  const [y, m, d] = exam.date.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const name = exam.title?.trim() || "Exam";
  const date = target.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(target.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });

  if (days < 0) {
    const when = `overdue by ${spanLabel(target, today)}`;
    return { exam, label: `${name} · ${when}`, when, short: "Overdue", date, days, soon: false, overdue: true };
  }

  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${spanLabel(today, target)}`;
  const weekday = days <= 6 ? DAY_NAMES[target.getDay()] : date;
  return {
    exam,
    label: days <= 1 ? `${name} ${when}` : `${name} ${weekday} · ${when}`,
    when,
    short: days === 0 ? "Today" : days === 1 ? "Tomorrow" : spanLabel(today, target, true),
    date,
    days,
    soon: days <= 7,
    overdue: false,
  };
}

/** Every dated exam, overdue ones first (longest overdue at the top), then soonest. */
export function examStatuses(exams: Exam[], now: Date): ExamStatus[] {
  return exams
    .map((e) => examStatus(e, now))
    .filter((s): s is ExamStatus => s !== null)
    .sort((a, b) => a.days - b.days);
}

/** The first of those — what the cards and the subject header show. */
export function nextExam(exams: Exam[], now: Date): ExamStatus | null {
  return examStatuses(exams, now)[0] ?? null;
}

/**
 * Every dated exam across every subject, in the same order — the home
 * dashboard's assessments panel, which lists them rather than showing only the
 * first one the way the cards do.
 */
export function examStatusesAcross<T extends { exams: Exam[] }>(
  subjects: T[],
  now: Date
): { subject: T; status: ExamStatus }[] {
  return subjects
    .flatMap((subject) => examStatuses(subject.exams, now).map((status) => ({ subject, status })))
    .sort((a, b) => a.status.days - b.status.days);
}

/** One-line summary of the whole weekly timetable, for the workspace header. */
export function weeklyLabel(classes: ClassSlot[]): string | null {
  if (!classes.length) return null;
  return [...classes]
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((c) => `${DAY_SHORT[c.day]} ${formatTime(c.start)}`)
    .join(" · ");
}

/**
 * Plain-English schedule context handed to the AI alongside notes, so answers
 * and quizzes can reference the student's actual week and upcoming assessment.
 */
export function subjectContext(
  name: string,
  classes: ClassSlot[],
  exams: Exam[],
  now: Date = new Date()
): string {
  const parts = [`Subject: ${name}.`, `Today is ${DAY_NAMES[now.getDay()]}.`];
  const weekly = weeklyLabel(classes);
  if (weekly) parts.push(`The student's classes for this subject are: ${weekly}.`);
  const next = nextClassLabel(classes, now);
  if (next) parts.push(`${next}.`);
  // Overdue ones are left out: the AI should weight work towards what is
  // still coming, not towards a date that has been and gone.
  const upcoming = examStatuses(exams, now).filter((e) => !e.overdue);
  if (upcoming.length) {
    parts.push(
      `Upcoming assessments (soonest first): ${upcoming.map((e) => e.label).join("; ")}.`
    );
  }
  return parts.join(" ");
}

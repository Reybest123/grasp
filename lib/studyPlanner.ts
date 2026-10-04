// The free study planner at /study-planner: turns a student's subjects and the
// time they have into a week of study blocks. It runs entirely in the browser
// and sends nothing anywhere, so it costs nothing to run and needs no account.
//
// It follows the advice in the "How to make a study timetable" guide: plan in
// short blocks, give more of them to subjects that are close and shaky, spread
// each subject across the week rather than stacking it on one day, put the
// most pressing subject first in each day, and keep a catch-up block spare.

export type Confidence = "shaky" | "ok" | "confident";

export type PlannerSubject = {
  id: string;
  name: string;
  confidence: Confidence;
  /** The next assessment, "YYYY-MM-DD", or "" for none. */
  examDate: string;
};

export type PlannerInput = {
  subjects: PlannerSubject[];
  /** Study blocks on each day, Monday first. */
  blocks: number[];
  blockMinutes: number;
  /** Keep the week's last block free for anything that ran over. */
  catchUp: boolean;
};

export type PlanCell = { kind: "study"; subjectId: string } | { kind: "catchup" };

export type Plan = {
  /** One list of blocks per day, Monday first. */
  days: PlanCell[][];
  /** Blocks each subject was given, by id. */
  counts: Record<string, number>;
  totalBlocks: number;
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MAX_SUBJECTS = 12;
export const MAX_BLOCKS_PER_DAY = 6;
export const BLOCK_MINUTES = [25, 30, 45, 60];

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  shaky: "Shaky",
  ok: "Okay",
  confident: "Confident",
};

const CONFIDENCE_WEIGHT: Record<Confidence, number> = { shaky: 3, ok: 2, confident: 1 };

/**
 * Whole days from `today` to an assessment, or null for none (or an unreadable
 * date). Counted on calendar dates in UTC, so a clock change cannot make a day
 * 23 or 25 hours long and shift the count.
 */
export function daysUntil(iso: string, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const exam = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exam - now) / 86_400_000);
}

/** How much a subject needs this week: shakier and sooner is more. */
export function subjectWeight(subject: PlannerSubject, today: Date): number {
  const days = daysUntil(subject.examDate, today);
  const soon = days === null || days < 0 ? 1 : days <= 14 ? 2 : days <= 28 ? 1.5 : 1;
  return CONFIDENCE_WEIGHT[subject.confidence] * soon;
}

/** Shares `total` blocks out by weight, whole blocks only (largest remainder). */
function share(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / sum) * total);
  const counts = exact.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x), w: weights[i] }))
    .sort((a, b) => b.rest - a.rest || b.w - a.w || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    counts[i]++;
    left--;
  }
  return counts;
}

export function buildPlan(input: PlannerInput, today: Date): Plan {
  const subjects = input.subjects.filter((s) => s.name.trim());
  const blocks = input.blocks.map((n) => Math.max(0, Math.min(MAX_BLOCKS_PER_DAY, Math.floor(n) || 0)));
  const totalBlocks = blocks.reduce((a, b) => a + b, 0);
  const days: PlanCell[][] = blocks.map(() => []);

  // The catch-up block is the week's last, and only when there is room for
  // study as well.
  const lastDay = blocks.findLastIndex((n) => n > 0);
  const catchUp = input.catchUp && totalBlocks >= 2 && lastDay >= 0;
  const studyBlocks = totalBlocks - (catchUp ? 1 : 0);

  const weights = subjects.map((s) => subjectWeight(s, today));
  const counts: Record<string, number> = {};
  if (subjects.length && studyBlocks > 0) {
    let given: number[];
    if (studyBlocks >= subjects.length) {
      // Every subject gets one block, and the rest go by need.
      const extra = share(studyBlocks - subjects.length, weights);
      given = extra.map((n) => n + 1);
    } else {
      // Too few blocks for everything: the most pressing subjects get one each.
      const top = weights
        .map((w, i) => ({ w, i }))
        .sort((a, b) => b.w - a.w || a.i - b.i)
        .slice(0, studyBlocks)
        .map((x) => x.i);
      given = subjects.map((_, i) => (top.includes(i) ? 1 : 0));
    }
    subjects.forEach((s, i) => (counts[s.id] = given[i]));

    // Spread each subject evenly through the week: its k-th block "falls due"
    // at slot (k + 0.5) * slots / count, and every slot, Monday's first to
    // Sunday's last, takes the subject most overdue. A subject already studied
    // that day waits about a day's worth of slots, and the one just studied
    // waits a whole week's, so neither happens while anything else is left.
    // A subject with many blocks falls due first, so the most pressing one
    // tends to open each day.
    const left = [...given];
    const placed = given.map(() => 0);
    const due = (i: number) => ((placed[i] + 0.5) * studyBlocks) / given[i];
    blocks.forEach((n, day) => {
      const slots = catchUp && day === lastDay ? n - 1 : n;
      const onDay: number[] = [];
      for (let k = 0; k < slots; k++) {
        const prev = onDay[onDay.length - 1];
        let best = -1;
        let bestKey = Infinity;
        for (let i = 0; i < subjects.length; i++) {
          if (left[i] <= 0) continue;
          const key =
            due(i) + (onDay.includes(i) ? studyBlocks / 7 : 0) + (i === prev ? studyBlocks : 0);
          if (key < bestKey || (key === bestKey && weights[i] > weights[best])) {
            best = i;
            bestKey = key;
          }
        }
        if (best < 0) break;
        left[best]--;
        placed[best]++;
        onDay.push(best);
        days[day].push({ kind: "study", subjectId: subjects[best].id });
      }
    });
  }

  if (catchUp) days[lastDay].push({ kind: "catchup" });
  return { days, counts, totalBlocks };
}

/** "1h 30m", "45m", "2h". */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

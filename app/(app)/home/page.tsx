"use client";

// The home dashboard.
//
// Deliberately not a second notebooks grid — the cards live in /workspace and
// repeating them here would make the two routes read as the same page. This is
// the standing-start view: how you are doing, what there is to study, and what
// is coming up.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useProfile, firstName } from "@/lib/profileStore";
import { getColor } from "@/lib/subjectColors";
import { upcomingExamsAcross, DAY_SHORT } from "@/lib/schedule";
import {
  activeDays,
  bandOf,
  quizzesIn,
  subjectUnderstanding,
  understanding,
  weekActivity,
  BAND_BAR,
  BAND_RING,
  BAND_TEXT,
  type ActivityDay,
} from "@/lib/stats";
import { CURRENT_PLAN, PLAN_LABEL, quizLimit } from "@/lib/plan";
import { AddAssessmentDialog } from "@/components/app/AddAssessmentDialog";
import { StatRing } from "@/components/StatRing";
import { makeExam } from "@/lib/subjects";
import type { Subject } from "@/lib/subjects";
import { ArrowRightIcon, ExamIcon, PlusIcon, WorkspaceIcon } from "@/components/icons";

const WEEK = 7;

export default function HomePage() {
  const router = useRouter();
  const { subjects, ready, updateSubject } = useSubjects();
  const { profile, ready: profileReady } = useProfile();
  const { guard } = useRecording();
  const now = useNow();
  const [adding, setAdding] = useState(false);

  const name = firstName(profile.name);
  const hasSubjects = subjects.length > 0;

  // Everything dated is gated on the client-only clock, so none of it renders
  // on the server and disagrees with the browser a frame later.
  const week = now ? weekActivity(subjects, now, WEEK) : null;

  function addAssessment(subjectId: string, date: string, title: string) {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    updateSubject(subjectId, { exams: [...subject.exams, makeExam(date, title || undefined)] });
  }

  const open = (id: string) => guard(() => router.push(`/workspace/${id}`));

  return (
    <section className="px-6 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        {/* Wait for storage rather than greeting nobody and then swapping the
            name in a frame later. */}
        {profileReady && name ? `Welcome back, ${name}` : "Welcome back"}
      </h1>

      {!ready ? null : !hasSubjects ? (
        <NoSubjects />
      ) : (
        <>
          {week && <StatRow subjects={subjects} week={week} />}

          {/* The assessments column is fixed-width and secondary; the week and
              the subjects take the rest. On narrow screens they stack. */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-8">
              {week && <WeekChart week={week} />}
              <StudyList subjects={subjects} onOpen={open} />
            </div>
            <Assessments
              subjects={subjects}
              now={now}
              onAdd={() => setAdding(true)}
              onOpen={open}
            />
          </div>
        </>
      )}

      <AddAssessmentDialog
        open={adding}
        subjects={subjects}
        onClose={() => setAdding(false)}
        onAdd={addAssessment}
      />
    </section>
  );
}

/**
 * With no subjects there is nothing to study and nothing to be assessed on, so
 * the assessments panel is not shown empty — it is not shown at all. Adding a
 * subject is the only useful thing to do here, and it happens in the workspace.
 */
function NoSubjects() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <WorkspaceIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-semibold text-ink">You have no subjects yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Your notebooks live in the workspace. Add a subject there and it shows up here to study.
      </p>
      <Link
        href="/workspace"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
      >
        Go to workspace <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * Three figures across the top: how well the work is landing, whether it is
 * happening at all, and how much of the week's allowance is left.
 *
 * Each is a ratio with a real denominator, which is why each gets a ring — a
 * bare running total has nothing to fill. Anything without one (notes written,
 * subjects taught) belongs in a list, not here.
 */
function StatRow({ subjects, week }: { subjects: Subject[]; week: ActivityDay[] }) {
  const marks = understanding(subjects);
  const days = activeDays(week);
  const used = quizzesIn(week);
  const limit = quizLimit();

  // Read the other way up from the score ring: a full allowance ring is the bad
  // outcome, so it warms towards red as it fills rather than cooling to green.
  const spent = limit ? used / limit : 0;
  const allowanceTone =
    spent >= 1 ? "text-red-500" : spent >= 0.66 ? "text-amber-500" : "text-brand-500";

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <StatTile
        value={marks ? marks.pct : 0}
        tone={marks ? BAND_RING[bandOf(marks.pct)] : "text-slate-200"}
        center={(t) =>
          marks ? (
            <span className="text-lg font-bold tabular-nums text-ink">
              {Math.round(marks.pct * t * 100)}%
            </span>
          ) : (
            <span className="text-lg font-bold text-slate-300">&ndash;</span>
          )
        }
        label="Understanding"
        sub={
          marks
            ? `across ${marks.quizzes} marked quiz${marks.quizzes === 1 ? "" : "zes"}`
            : "No quizzes marked yet"
        }
      />

      <StatTile
        value={days / WEEK}
        tone={days ? "text-brand-500" : "text-slate-200"}
        center={(t) => (
          <span className={`text-lg font-bold tabular-nums ${days ? "text-ink" : "text-slate-300"}`}>
            {Math.round(days * t)}
          </span>
        )}
        label="Study this week"
        sub={days ? `of the last ${WEEK} days had work on them` : "Nothing touched in the last week"}
      />

      <StatTile
        value={spent}
        tone={allowanceTone}
        center={(t) => (
          <span className={`text-lg font-bold tabular-nums ${used ? "text-ink" : "text-slate-300"}`}>
            {Math.round(used * t)}
          </span>
        )}
        label="Quiz allowance"
        sub={`of ${limit} this week on ${PLAN_LABEL[CURRENT_PLAN]}`}
      />
    </div>
  );
}

function StatTile({
  value,
  tone,
  center,
  label,
  sub,
}: {
  value: number;
  tone: string;
  center: (t: number) => React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <StatRing value={value} size={64} stroke={7} tone={tone}>
        {center}
      </StatRing>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-4 text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

/**
 * The last seven days as bars — the detail behind the "study this week" ring,
 * which can only say how many days had work on them, not which ones or how
 * much. Together they answer "am I keeping this up" and "when do I actually
 * work", which is the pair worth knowing.
 *
 * The bars grow from nothing on mount, staggered left to right. A CSS
 * transition is right here where the score ring's hand-driven clock was not:
 * there is no number counting alongside a bar that could fall out of step with
 * it, so there is nothing to keep in sync.
 */
function WeekChart({ week }: { week: ActivityDay[] }) {
  const [grown, setGrown] = useState(false);
  const max = Math.max(1, ...week.map((d) => d.total));
  const total = week.reduce((n, d) => n + d.total, 0);

  // One frame late, so the browser paints the bars at zero height first and
  // then has something to animate from. Setting it in the same frame as the
  // mount would just render them full-size with no transition at all.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Your last {WEEK} days
        </h2>
        <p className="text-xs font-medium tabular-nums text-slate-400">
          {total} {total === 1 ? "item" : "items"} touched
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-2">
          {week.map((d, i) => (
            <div key={d.date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1.5 text-[11px] font-semibold tabular-nums text-slate-400">
                {d.total || ""}
              </span>
              <div
                className={`relative h-20 w-full overflow-hidden rounded-lg bg-slate-100 ${
                  d.today ? "ring-1 ring-brand-200" : ""
                }`}
                title={`${DAY_SHORT[d.date.getDay()]}: ${d.notes} note${
                  d.notes === 1 ? "" : "s"
                }, ${d.quizzes} quiz${d.quizzes === 1 ? "" : "zes"}`}
              >
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-lg transition-[height] duration-700 ease-out motion-reduce:transition-none ${
                    d.today ? "bg-brand-600" : "bg-brand-400"
                  }`}
                  style={{
                    height: grown ? `${(d.total / max) * 100}%` : 0,
                    transitionDelay: `${i * 55}ms`,
                  }}
                />
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium ${
                  d.today ? "text-brand-700" : "text-slate-400"
                }`}
              >
                {DAY_SHORT[d.date.getDay()]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Every subject, one per line, with how it is going beside it.
 *
 * Still not a second notebooks grid — no class times, no exam countdowns, no
 * content counts, all of which live on the workspace cards and would make the
 * two pages read as one. The strength bar is the exception, and it earns the
 * exception by being the one thing that helps a student choose which subject to
 * open: it says where they are weakest, which is not on the cards at all.
 */
function StudyList({
  subjects,
  onOpen,
}: {
  subjects: Subject[];
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Some subjects you can study
      </h2>
      {/* Same card as the assessments column beside it — the two are peers on
          the dashboard and reading as one kind of thing keeps them level. */}
      <ul className="mt-3 space-y-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {subjects.map((s) => {
          const color = getColor(s.colorKey);
          const marks = subjectUnderstanding(s);
          const band = marks ? bandOf(marks.pct) : null;
          return (
            <li key={s.id}>
              <button
                onClick={() => onOpen(s.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color.gradient} text-sm font-bold text-white`}
                >
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{s.name}</span>

                {/* Words rather than an empty bar when a subject has no marked
                    quiz — a permanently flat track beside a subject reads as a
                    score of zero, which is the opposite of what is true. */}
                {marks && band ? (
                  <span className="hidden shrink-0 items-center gap-2 sm:flex">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={`block h-full rounded-full ${BAND_BAR[band]}`}
                        style={{ width: `${Math.max(3, marks.pct * 100)}%` }}
                      />
                    </span>
                    <span
                      className={`w-9 text-right text-xs font-semibold tabular-nums ${BAND_TEXT[band]}`}
                    >
                      {Math.round(marks.pct * 100)}%
                    </span>
                  </span>
                ) : (
                  <span className="hidden shrink-0 text-xs text-slate-300 sm:block">
                    Not quizzed
                  </span>
                )}

                <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Upcoming assessments across every subject, soonest first. */
function Assessments({
  subjects,
  now,
  onAdd,
  onOpen,
}: {
  subjects: Subject[];
  now: Date | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const upcoming = now ? upcomingExamsAcross(subjects, now) : [];

  return (
    <aside>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Upcoming assessments
      </h2>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {upcoming.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm font-semibold text-ink">No assessments added</p>
            <p className="mt-1 text-xs text-slate-500">
              Add one and Grasp counts down to it.
            </p>
            <button
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {upcoming.map(({ subject, status }) => (
                <li key={status.exam.id}>
                  <button
                    onClick={() => onOpen(subject.id)}
                    className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <ExamIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        status.soon ? "text-amber-600" : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {status.exam.title?.trim() || "Exam"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{subject.name}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        status.soon ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status.days === 0
                        ? "today"
                        : status.days === 1
                          ? "tomorrow"
                          : `${status.days}d`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={onAdd}
              className="mt-1 flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

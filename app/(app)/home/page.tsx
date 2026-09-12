"use client";

// The home dashboard.
//
// Sized to the viewport on desktop: everything is visible in one frame and the
// page itself never scrolls. The week chart takes whatever height is left over,
// and a long assessments list scrolls inside its own card rather than moving
// the page. Below `lg` the columns stack and the page scrolls normally, since
// crushing three tiles, a chart and a list into a phone screen helps nobody.
//
// Deliberately not a second notebooks list — the subjects live in /workspace.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useProfile, firstName } from "@/lib/profileStore";
import { upcomingExamsAcross, DAY_SHORT } from "@/lib/schedule";
import {
  activeDays,
  bandOf,
  currentStreak,
  quizzesIn,
  subjectUnderstanding,
  understanding,
  weekActivity,
  BAND_BAR,
  BAND_RING,
  BAND_TEXT,
  type ActivityDay,
  type BandName,
  type Understanding,
} from "@/lib/stats";
import { DEFAULT_PLAN, planName, quizLimit, trialDaysLeft } from "@/lib/plan";
import { fetchUsage } from "@/lib/ai";
import { AddAssessmentDialog } from "@/components/app/AddAssessmentDialog";
import { StatRing } from "@/components/StatRing";
import { Skeleton } from "@/components/Skeleton";
import { makeExam } from "@/lib/subjects";
import type { Subject } from "@/lib/subjects";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ExamIcon,
  PlusIcon,
  WorkspaceIcon,
} from "@/components/icons";

const WEEK = 7;

const VERDICT: Record<BandName, string> = {
  strong: "Strong grasp",
  fair: "Getting there",
  weak: "Worth another pass",
};

const marksLabel = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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
    <section className="flex flex-col px-6 py-6 sm:px-8 lg:h-[calc(100dvh-69px)] lg:overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 pb-5">
        {/* Wait for the account rather than greeting nobody and then swapping
            the name in a frame later. */}
        {profileReady ? (
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </h1>
        ) : (
          <Skeleton className="h-9 w-72 max-w-full" />
        )}
      </div>

      {!ready ? (
        <HomeSkeleton />
      ) : !hasSubjects ? (
        <NoSubjects />
      ) : (
        <>
          {week && <StatRow subjects={subjects} week={week} />}

          {/* One implicit row sized to the space left, so the chart can fill it
              and the assessments card can scroll within it. */}
          <div className="mt-6 grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col">{week && <WeekChart week={week} />}</div>
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
 * the assessments panel is not shown empty — it is not shown at all.
 */
function NoSubjects() {
  return (
    <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center lg:flex-1">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <WorkspaceIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">You have no subjects yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Your notebooks live in the workspace. Add a subject there and it shows up here.
        </p>
        <Link
          href="/workspace"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          Go to workspace <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/** The dashboard's own layout in grey, so nothing jumps when the data lands. */
function HomeSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading your dashboard
      </p>
      <div className="mt-5 grid shrink-0 gap-4 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-6 grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]"
      >
        <div className="flex min-h-0 flex-col">
          <Skeleton className="h-4 w-36" />
          <div className="mt-3 flex h-72 items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-auto lg:min-h-0 lg:flex-1">
            {[45, 70, 30, 85, 55, 20, 60].map((h, i) => (
              <div key={i} className="flex h-full flex-1 items-end px-[18%]">
                <Skeleton className="w-full rounded-b-none" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <Skeleton className="h-4 w-44" />
          <div className="mt-3 flex-1 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Three ratios across the top. Each tile opens a detail card on hover or focus
 * with what sits behind its number — the ring alone can only say how full.
 */
function StatRow({ subjects, week }: { subjects: Subject[]; week: ActivityDay[] }) {
  const { profile } = useProfile();
  const plan = profile.plan ?? DEFAULT_PLAN;
  const planLabel = planName(plan, profile.trialEndsAt);
  const marks = understanding(subjects);
  const days = activeDays(week);
  // The server's figures are the ones the cap is enforced against — a deleted
  // quiz still counts there. The local ones only fill the gap until it answers.
  const [server, setServer] = useState<{ used: number; limit: number } | null>(null);
  useEffect(() => {
    void fetchUsage().then((u) => u && setServer({ used: u.quizzes.used, limit: u.quizzes.limit }));
  }, []);
  const used = server?.used ?? quizzesIn(week);
  const limit = server?.limit ?? quizLimit(plan);

  // Read the other way up from the score ring: a full allowance ring is the bad
  // outcome, so it warms towards red as it fills rather than cooling to green.
  const spent = limit ? used / limit : 0;
  const allowanceTone =
    spent >= 1 ? "text-red-500" : spent >= 0.66 ? "text-amber-500" : "text-brand-500";

  return (
    <div className="mt-5 grid shrink-0 gap-4 sm:grid-cols-3">
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
        detail={<UnderstandingDetail subjects={subjects} marks={marks} />}
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
        detail={<StudyDetail week={week} />}
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
        sub={`of ${limit} this week on ${planLabel}`}
        detail={
          <AllowanceDetail
            used={used}
            limit={limit}
            planLabel={planLabel}
            trialEndsAt={profile.trialEndsAt}
          />
        }
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
  detail,
}: {
  value: number;
  tone: string;
  center: (t: number) => React.ReactNode;
  label: string;
  sub: string;
  detail: React.ReactNode;
}) {
  return (
    // Raised above the chart while open: the lift on hover makes the tile its
    // own stacking context, and without the z-index the chart card that follows
    // it in the DOM would paint over the detail card.
    <div
      tabIndex={0}
      className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition duration-200 focus-within:z-30 hover:z-30 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <StatRing
        value={value}
        size={64}
        stroke={7}
        tone={tone}
        className="transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110"
      >
        {center}
      </StatRing>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-4 text-slate-500">{sub}</p>
      </div>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-300 transition duration-200 group-hover:rotate-180 group-hover:text-slate-500 group-focus-visible:rotate-180" />

      {/* The `before:` strip bridges the gap under the tile, so moving the
          pointer down into the card does not close it on the way. */}
      <div
        role="tooltip"
        className="invisible absolute inset-x-0 top-full mt-2 translate-y-1 rounded-2xl border border-slate-200 bg-white p-4 opacity-0 shadow-lift transition duration-150 before:absolute before:inset-x-0 before:-top-2 before:h-2 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
      >
        {detail}
      </div>
    </div>
  );
}

/** The overall score, then every quizzed subject weakest first. */
function UnderstandingDetail({
  subjects,
  marks,
}: {
  subjects: Subject[];
  marks: Understanding | null;
}) {
  if (!marks) {
    return (
      <p className="text-sm text-slate-600">
        Finish a quiz in any subject and its score lands here, weighted by how many marks each
        quiz was worth.
      </p>
    );
  }

  const rows = subjects
    .map((s) => ({ subject: s, m: subjectUnderstanding(s) }))
    .filter((r): r is { subject: Subject; m: Understanding } => r.m !== null)
    .sort((a, b) => a.m.pct - b.m.pct);
  const shown = rows.slice(0, 4);
  const band = bandOf(marks.pct);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-sm font-semibold ${BAND_TEXT[band]}`}>{VERDICT[band]}</p>
        <p className="text-xs tabular-nums text-slate-500">
          {marksLabel(marks.got)} of {marksLabel(marks.total)} marks
        </p>
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        By subject, weakest first
      </p>
      <ul className="mt-2 space-y-2">
        {shown.map(({ subject, m }) => {
          const b = bandOf(m.pct);
          return (
            <li key={subject.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{subject.name}</span>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${BAND_BAR[b]}`}
                  style={{ width: `${Math.max(3, m.pct * 100)}%` }}
                />
              </span>
              <span className={`w-9 text-right font-semibold tabular-nums ${BAND_TEXT[b]}`}>
                {Math.round(m.pct * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && (
        <p className="mt-2 text-xs text-slate-400">+{rows.length - shown.length} more quizzed</p>
      )}
    </>
  );
}

/** Which of the seven days had work on them, and the run leading up to today. */
function StudyDetail({ week }: { week: ActivityDay[] }) {
  const streak = currentStreak(week);
  return (
    <>
      <div className="flex justify-between gap-1">
        {week.map((d) => (
          <div key={d.date.toISOString()} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-7 w-7 rounded-full ${d.total ? "bg-brand-500" : "bg-slate-100"} ${
                d.today ? "ring-2 ring-brand-200 ring-offset-1" : ""
              }`}
              title={`${d.total} item${d.total === 1 ? "" : "s"}`}
            />
            <span
              className={`text-[11px] font-medium ${d.today ? "text-brand-700" : "text-slate-400"}`}
            >
              {DAY_SHORT[d.date.getDay()]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {streak === 0
          ? "No streak going. Open any notebook to start one."
          : `${streak}-day streak. Keep it going.`}
      </p>
    </>
  );
}

/**
 * The week's allowance as one cell per quiz, when there are few enough to draw,
 * and how long a free trial has left.
 */
function AllowanceDetail({
  used,
  limit,
  planLabel,
  trialEndsAt,
}: {
  used: number;
  limit: number;
  planLabel: string;
  trialEndsAt: string | null;
}) {
  const now = useNow();
  const trialLeft = now ? trialDaysLeft(trialEndsAt, now) : null;
  const left = Math.max(0, limit - used);
  return (
    <>
      <p className="text-sm font-semibold text-ink">
        {left === 0 ? "None left this week" : `${left} left this week`}
      </p>
      {limit <= 12 ? (
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: limit }, (_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${i < used ? "bg-brand-500" : "bg-slate-100"}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-brand-500"
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Counts quizzes generated over the last {WEEK} days, so each one frees up a week after it
        was made.
      </p>
      {trialLeft !== null && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-semibold text-ink">
          {trialLeft === 0
            ? `Your ${planLabel} has ended.`
            : `Your ${planLabel} ends in ${trialLeft} day${trialLeft === 1 ? "" : "s"}.`}
        </p>
      )}
    </>
  );
}

/**
 * The last seven days as stacked bars — notes underneath, quizzes on top.
 * Hovering or focusing a day dims the rest and shows what went into it.
 *
 * The bars grow from nothing on mount, staggered left to right. A CSS
 * transition is right here where the score ring's hand-driven clock was not:
 * there is no number counting alongside a bar that could fall out of step.
 */
function WeekChart({ week }: { week: ActivityDay[] }) {
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...week.map((d) => d.total));
  const total = week.reduce((n, d) => n + d.total, 0);

  // One frame late, so the browser paints the bars at zero height first and
  // then has something to animate from.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Bars top out below the plot's ceiling, leaving room for the count above.
  const CEILING = 85;
  const active = hover === null ? null : week[hover];

  // Centred over its column, except at the ends, where centring would push the
  // card out of the chart.
  const tipStyle: React.CSSProperties | undefined =
    hover === null
      ? undefined
      : hover === 0
        ? { left: 0 }
        : hover === week.length - 1
          ? { right: 0 }
          : { left: `${((hover + 0.5) / week.length) * 100}%`, transform: "translateX(-50%)" };

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Your last {WEEK} days
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-400" /> Notes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-ink" /> Quizzes
          </span>
          <span className="tabular-nums text-slate-400">
            {total} {total === 1 ? "item" : "items"} touched
          </span>
        </div>
      </div>

      <div
        className="mt-3 flex h-72 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-auto lg:min-h-0 lg:flex-1"
        onMouseLeave={() => setHover(null)}
      >
        <div className="relative min-h-0 flex-1">
          {/* Guides at the tallest bar, half of it, and the baseline. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {[CEILING, CEILING / 2].map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-dashed border-slate-100"
                style={{ bottom: `${h}%` }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />
          </div>

          <div className="absolute inset-0 flex gap-2">
            {week.map((d, i) => {
              const h = grown ? (d.total / max) * CEILING : 0;
              const dimmed = hover !== null && hover !== i;
              return (
                <button
                  key={d.date.toISOString()}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${d.date.toLocaleDateString(undefined, {
                    weekday: "long",
                  })}: ${d.notes} notes, ${d.quizzes} quizzes`}
                  className={`relative min-w-0 flex-1 cursor-default rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 ${
                    hover === i ? "bg-slate-50" : ""
                  }`}
                >
                  <span
                    className={`absolute inset-x-[18%] bottom-0 flex flex-col-reverse gap-0.5 overflow-hidden rounded-t-md transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none ${
                      dimmed ? "opacity-30" : "opacity-100"
                    }`}
                    style={{ height: `${h}%`, transitionDelay: grown ? `${i * 55}ms, 0ms` : "0ms" }}
                  >
                    {d.notes > 0 && (
                      <span className="basis-0 bg-brand-400" style={{ flexGrow: d.notes }} />
                    )}
                    {d.quizzes > 0 && (
                      <span className="basis-0 bg-ink" style={{ flexGrow: d.quizzes }} />
                    )}
                  </span>
                  {d.total > 0 && hover !== i && (
                    <span
                      className={`absolute inset-x-0 text-center text-[11px] font-semibold tabular-nums text-slate-400 transition-[bottom,opacity] duration-700 ease-out motion-reduce:transition-none ${
                        dimmed ? "opacity-40" : ""
                      }`}
                      style={{ bottom: `calc(${h}% + 4px)`, transitionDelay: `${i * 55}ms, 0ms` }}
                    >
                      {d.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {active && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl bg-ink px-3 py-2.5 text-white shadow-lift"
              style={tipStyle}
            >
              <p className="text-xs font-semibold">
                {active.today
                  ? "Today"
                  : active.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
              </p>
              {active.total === 0 ? (
                <p className="mt-1 text-xs text-white/60">Nothing touched</p>
              ) : (
                <div className="mt-1.5 space-y-1 text-xs">
                  <p className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <span className="h-2 w-2 rounded-sm bg-brand-400" /> Notes
                    </span>
                    <span className="font-semibold tabular-nums">{active.notes}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <span className="h-2 w-2 rounded-sm bg-white" /> Quizzes
                    </span>
                    <span className="font-semibold tabular-nums">{active.quizzes}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex shrink-0 gap-2">
          {week.map((d, i) => (
            <span
              key={d.date.toISOString()}
              className={`min-w-0 flex-1 text-center text-[11px] font-medium transition-colors ${
                hover === i
                  ? "font-semibold text-ink"
                  : d.today
                    ? "text-brand-700"
                    : "text-slate-400"
              }`}
            >
              {DAY_SHORT[d.date.getDay()]}
            </span>
          ))}
        </div>
      </div>
    </>
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
    <aside className="flex min-h-0 flex-col">
      <h2 className="shrink-0 text-sm font-bold uppercase tracking-wide text-slate-500">
        Upcoming assessments
      </h2>

      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {upcoming.length === 0 ? (
          <div className="my-auto px-3 py-6 text-center">
            <p className="text-sm font-semibold text-ink">No assessments added</p>
            <p className="mt-1 text-xs text-slate-500">Add one and Grasp counts down to it.</p>
            <button
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </div>
        ) : (
          <>
            {/* Scrolls inside the card, so a long list never makes the page scroll. */}
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
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
              className="mt-1 flex w-full shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

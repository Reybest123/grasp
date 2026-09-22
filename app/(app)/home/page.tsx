"use client";

// The home dashboard.
//
// Sized to the viewport on desktop: everything is visible in one frame and the
// page itself never scrolls. The weekly allowance meters take whatever height is
// left over, and a long assessments list scrolls inside its own card rather than
// moving the page. Below `lg` the columns stack and the page scrolls normally,
// since crushing three tiles, four meters and a list into a phone helps nobody.
//
// Deliberately not a second notebooks list — the subjects live in /workspace.
//
// Also where onboarding ends: /onboarding sends a new student here with
// `?setup=timetable`, and the timetable upload opens as a popup over the page.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubjects, useNow, type NewSubject } from "@/lib/subjectsStore";
import { TimetableDialog } from "@/components/onboarding/TimetableDialog";
import { useRecording } from "@/lib/recordingStore";
import { useProfile, firstName } from "@/lib/profileStore";
import { examStatusesAcross, DAY_SHORT, type Exam } from "@/lib/schedule";
import {
  activeDays,
  bandOf,
  currentStreak,
  subjectCoverage,
  subjectUnderstanding,
  understanding,
  weekActivity,
  BAND_BAR,
  BAND_RING,
  BAND_TEXT,
  type ActivityDay,
  type BandName,
  type Coverage,
  type Understanding,
} from "@/lib/stats";
import { DEFAULT_PLAN, formatCount, formatDuration, planName } from "@/lib/plan";
import { fetchUsage, type Allowance, type Usage } from "@/lib/ai";
import { AddAssessmentDialog } from "@/components/app/AddAssessmentDialog";
import { AssessmentMenu } from "@/components/app/AssessmentMenu";
import { StatRing } from "@/components/StatRing";
import { ErrorNote } from "@/components/ErrorNote";
import { Skeleton } from "@/components/Skeleton";
import { LoadFailed } from "@/components/app/LoadFailed";
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
  const { subjects, ready, loadError, updateSubject, replaceSubjects } = useSubjects();
  const { profile, ready: profileReady } = useProfile();
  const { guard } = useRecording();
  const now = useNow();
  // null while closed; `editing` is null when adding a new assessment.
  const [dialog, setDialog] = useState<{ editing: { subjectId: string; exam: Exam } | null } | null>(
    null
  );

  const name = firstName(profile.name);
  const hasSubjects = subjects.length > 0;

  // Everything dated is gated on the client-only clock, so none of it renders
  // on the server and disagrees with the browser a frame later.
  const week = now ? weekActivity(subjects, now, WEEK) : null;
  const coverage = now ? subjectCoverage(subjects, now, WEEK) : null;

  function saveAssessment(subjectId: string, date: string, title: string) {
    const editing = dialog?.editing ?? null;
    const target = subjects.find((s) => s.id === subjectId);
    if (!target) return;
    const fields = { date, title: title || undefined };

    if (!editing) {
      updateSubject(subjectId, { exams: [...target.exams, makeExam(date, fields.title)] });
    } else if (editing.subjectId === subjectId) {
      updateSubject(subjectId, {
        exams: target.exams.map((e) => (e.id === editing.exam.id ? { ...e, ...fields } : e)),
      });
    } else {
      // Moved to another subject: out of the old one and onto the new one,
      // keeping its id.
      const from = subjects.find((s) => s.id === editing.subjectId);
      if (from) updateSubject(from.id, { exams: from.exams.filter((e) => e.id !== editing.exam.id) });
      updateSubject(subjectId, { exams: [...target.exams, { ...editing.exam, ...fields }] });
    }
  }

  /** Delete and Mark as resolved both land here: either way it leaves the list. */
  function removeAssessment(subjectId: string, examId: string) {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    updateSubject(subjectId, { exams: subject.exams.filter((e) => e.id !== examId) });
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
      ) : loadError ? (
        <LoadFailed className="mt-6 lg:flex-1" />
      ) : !hasSubjects ? (
        <NoSubjects />
      ) : (
        <>
          {week && coverage && <StatRow subjects={subjects} week={week} coverage={coverage} />}

          {/* One implicit row sized to the space left, so the meters can fill it
              and the assessments card can scroll within it. */}
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col">
              <WeekAllowances />
            </div>
            <Assessments
              subjects={subjects}
              now={now}
              onAdd={() => setDialog({ editing: null })}
              onOpen={open}
              onEdit={(subjectId, exam) => setDialog({ editing: { subjectId, exam } })}
              onRemove={removeAssessment}
            />
          </div>
        </>
      )}

      <AddAssessmentDialog
        open={dialog !== null}
        editing={dialog?.editing ?? null}
        subjects={subjects}
        onClose={() => setDialog(null)}
        onSave={saveAssessment}
      />

      {/* Its own Suspense boundary, since reading the URL's query can suspend. */}
      <Suspense fallback={null}>
        <TimetablePrompt save={replaceSubjects} />
      </Suspense>
    </section>
  );
}

/**
 * Skipping, or finishing the read, goes on to the notebooks. Closing it leaves
 * the student here. Either way the flag is dropped, so a refresh does not
 * reopen it.
 */
function TimetablePrompt({ save }: { save: (subjects: NewSubject[]) => Promise<void> }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <TimetableDialog
      open={params.get("setup") === "timetable"}
      save={save}
      onClose={() => router.replace("/home", { scroll: false })}
      onSkip={() => router.replace("/workspace")}
      onFinish={() => router.replace("/workspace")}
    />
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
        className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]"
      >
        <div className="flex min-h-0 flex-col">
          <Skeleton className="h-4 w-24" />
          <div className="mt-3 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 px-2 py-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-3 w-40 max-w-full" />
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
function StatRow({
  subjects,
  week,
  coverage,
}: {
  subjects: Subject[];
  week: ActivityDay[];
  coverage: Coverage;
}) {
  const marks = understanding(subjects);
  const days = activeDays(week);

  return (
    <div className="mt-5 grid shrink-0 gap-4 sm:grid-cols-3">
      <StatTile
        value={marks ? marks.pct : 0}
        tone={marks ? BAND_RING[bandOf(marks.pct)] : "text-slate-200"}
        center={(t) => {
          const pct = Math.round(marks ? marks.pct * t * 100 : 0);
          return marks ? (
            <span
              className={`font-bold tabular-nums text-ink ${pct >= 100 ? "text-sm" : "text-lg"}`}
            >
              {pct}%
            </span>
          ) : (
            <span className="text-lg font-bold text-slate-300">&ndash;</span>
          );
        }}
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

      {/* Not a second copy of the quiz allowance — that is a meter now, and a
          figure shown twice on one screen is a figure nobody reads. This is the
          one thing neither of the other tiles notices: a notebook going
          untouched while the rest of the week looks healthy. */}
      <StatTile
        value={coverage.total ? coverage.touched / coverage.total : 0}
        tone={coverage.touched ? "text-brand-500" : "text-slate-200"}
        center={(t) => (
          <span
            className={`text-lg font-bold tabular-nums ${
              coverage.touched ? "text-ink" : "text-slate-300"
            }`}
          >
            {Math.round(coverage.touched * t)}
          </span>
        )}
        label="Notebooks touched"
        sub={
          coverage.touched
            ? `of ${coverage.total} in the last ${WEEK} days`
            : `None of your ${coverage.total} opened this week`
        }
        detail={<CoverageDetail coverage={coverage} />}
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

/** Which notebooks have gone quiet, so the tile names them rather than only counting. */
function CoverageDetail({ coverage }: { coverage: Coverage }) {
  const shown = coverage.quiet.slice(0, 4);

  if (!coverage.quiet.length) {
    return (
      <p className="text-sm text-slate-600">
        Every notebook has had something written in it, or a quiz made from it, in the last {WEEK}{" "}
        days.
      </p>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold text-ink">{coverage.quiet.length} not opened this week</p>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Worth a look
      </p>
      <ul className="mt-2 space-y-1.5">
        {shown.map((subject) => (
          <li key={subject.id} className="truncate text-xs font-medium text-ink">
            {subject.name}
          </li>
        ))}
      </ul>
      {coverage.quiet.length > shown.length && (
        <p className="mt-2 text-xs text-slate-400">+{coverage.quiet.length - shown.length} more</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Counts a note edited or a quiz made. A notebook you only read does not register.
      </p>
    </>
  );
}

type MeterRow = {
  label: string;
  /** what the allowance is actually spent on; shown on the card's shared line on hover */
  hint: string;
  allowance: Allowance | undefined;
  /** `coarse` drops the seconds off a duration — a week's allowance, not a countdown */
  format: (n: number, coarse: boolean) => string;
};

/**
 * Where the student stands against each of this week's allowances (§6).
 *
 * These used to live on /plans, which is a page nobody opens twice — an
 * allowance you cannot see is one you only ever find out about by being
 * refused. The dashboard is where the student already is.
 *
 * The bars grow from nothing once the figures land, staggered top to bottom. A
 * CSS transition is right here where the score ring's hand-driven clock was
 * not: no number counts alongside a bar, so nothing can fall out of step with
 * it.
 *
 * Hovering a row dims the others and fades in what that allowance pays for. The
 * hint's line is *always* laid out and only its opacity changes, so revealing
 * it cannot move the rows underneath — and nothing has to be positioned against
 * a row whose height depends on the size of the window.
 */
function WeekAllowances() {
  const { profile } = useProfile();
  const planLabel = planName(profile.plan ?? DEFAULT_PLAN, profile.trialEndsAt);

  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchUsage().then((u) => {
      if (cancelled) return;
      if (u) setUsage(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // One frame after the figures land, not on mount: until they do there is no
  // width to grow to, so the browser has nothing to animate between.
  useEffect(() => {
    if (!usage) return;
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [usage]);

  const rows: MeterRow[] = [
    {
      label: "AI tokens",
      hint: "Explain, Refine, AI enhance, AI generate, and explaining a quiz answer. Each costs by how much work it takes.",
      allowance: usage?.tokens,
      format: (n) => formatCount(n),
    },
    {
      label: "Quizzes",
      hint: "Each quiz generated from your notes. A quiz you delete does not hand its allowance back.",
      allowance: usage?.quizzes,
      format: (n) => formatCount(n),
    },
    {
      label: "Lecture recording",
      hint: "Time actually recorded. Every recording counts as at least a minute.",
      allowance: usage?.recordings,
      format: (n, coarse) => formatDuration(n, !coarse),
    },
    {
      label: "Resource Bank",
      hint: "Each document read into a subject. A document is only read once, however often it is used after that.",
      allowance: usage?.resources,
      format: (n) => formatCount(n),
    },
  ];

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">This week</h2>
        <Link
          href="/plans"
          className="rounded text-xs text-slate-500 underline-offset-2 transition hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          {profile.unlimited ? "Unlimited mode" : `Your allowances on ${planLabel}`} · a rolling{" "}
          {WEEK} days
        </Link>
      </div>

      <div
        className="mt-3 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1"
        onMouseLeave={() => setHover(null)}
      >
        {failed ? (
          <ErrorNote message="Grasp could not load this week's allowances. Refresh to try again." />
        ) : (
          <>
            {/*
              The rows scroll, the hint below them does not. min-h-fit on a row
              against this: on a tall window they share the space out between
              them, and on a short one they keep their own height and this
              scrolls — rather than the rows squeezing their own fixed-height
              children away, which silently left the card with no bars at all on
              any window it did not fit.
            */}
            <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {rows.map((row, i) => (
                <Meter
                  key={row.label}
                  row={row}
                  grown={grown}
                  index={i}
                  dimmed={hover !== null && hover !== i}
                  active={hover === i}
                  onHover={() => setHover(i)}
                  onLeave={() => setHover(null)}
                />
              ))}
            </div>

            {/*
              One shared line rather than one reserved under every row. Still
              always laid out, so fading it in cannot shift anything — but it
              costs the card 32px instead of 112px, which is most of what the
              bars needed to fit, and it gives the hint the card's full width so
              it stays on one line.
            */}
            <p
              aria-live="polite"
              className={`mt-1 h-8 shrink-0 border-t border-slate-100 pt-2 text-[11px] leading-[14px] text-slate-500 transition-opacity duration-200 motion-reduce:transition-none ${
                hover === null ? "opacity-0" : "opacity-100"
              }`}
            >
              {hover === null ? "" : rows[hover].hint}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Meter({
  row,
  grown,
  index,
  dimmed,
  active,
  onHover,
  onLeave,
}: {
  row: MeterRow;
  grown: boolean;
  index: number;
  dimmed: boolean;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const { label, allowance, format } = row;

  if (!allowance) {
    return (
      <div className="flex min-h-fit flex-1 flex-col justify-center gap-2 px-2 py-2.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    );
  }

  const { used, limit } = allowance;
  const share = limit ? Math.min(1, used / limit) : 0;
  // Read the other way up from the quiz score ring: a full allowance is the bad
  // end, so it warms towards red as it fills rather than cooling to green.
  const tone = share >= 1 ? "bg-red-500" : share >= 0.66 ? "bg-amber-500" : "bg-brand-500";

  return (
    <Link
      href="/plans"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className={`flex min-h-fit flex-1 flex-col justify-center rounded-xl px-2 py-2.5 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-brand-200 ${
        active ? "bg-slate-50" : ""
      } ${dimmed ? "opacity-40" : "opacity-100"}`}
    >
      {/*
        One line of figures rather than a count above the bar and a second line
        under it. The share spent and what is left are the two things worth
        reading; the raw total they are out of is a click away on /plans, and
        the bar is already drawing the proportion. Three lines a row did not
        leave four allowances room to sit on a laptop without the card
        scrolling, and a meter behind a scroll is one the student never sees.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-ink">{label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 text-sm tabular-nums text-slate-500">
          {limit === null ? (
            <>
              {format(used, true)} used · <span className="font-semibold text-ink">Unlimited</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{Math.round(share * 100)}% used</span> ·{" "}
              {used >= limit ? "none left" : `${format(limit - used, true)} left`}
            </>
          )}
          {/* The row goes somewhere; nothing else on the card would say so. */}
          <ArrowRightIcon
            aria-hidden="true"
            className={`h-3.5 w-3.5 self-center transition-opacity duration-200 ${
              active ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>
      </div>

      {/* shrink-0, with min-h-fit on the row: as a shrinkable child of a flex
          column that could shrink, the bar was the thing the browser squeezed
          away on any window the card did not fit — leaving the card with no
          bars at all and nothing to say why. */}
      <span className="mt-2 block h-2.5 shrink-0 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${tone}`}
          style={{
            width: `${grown ? share * 100 : 0}%`,
            transitionDelay: grown ? `${index * 90}ms` : "0ms",
          }}
        />
      </span>
    </Link>
  );
}

/**
 * Every assessment across every subject: overdue ones first, then soonest. An
 * overdue one stays until the student marks it resolved or deletes it.
 */
function Assessments({
  subjects,
  now,
  onAdd,
  onOpen,
  onEdit,
  onRemove,
}: {
  subjects: Subject[];
  now: Date | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onEdit: (subjectId: string, exam: Exam) => void;
  onRemove: (subjectId: string, examId: string) => void;
}) {
  const listed = now ? examStatusesAcross(subjects, now) : [];

  return (
    <aside className="flex min-h-0 flex-col">
      <h2 className="shrink-0 text-sm font-bold uppercase tracking-wide text-slate-500">
        Assessments
      </h2>

      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {listed.length === 0 ? (
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
              {listed.map(({ subject, status }) => {
                const name = status.exam.title?.trim() || "Exam";
                return (
                  <li
                    key={status.exam.id}
                    className="flex items-center gap-0.5 rounded-xl pr-1 transition hover:bg-slate-50"
                  >
                    <button
                      onClick={() => onOpen(subject.id)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left"
                    >
                      <ExamIcon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          status.overdue
                            ? "text-red-600"
                            : status.soon
                              ? "text-amber-600"
                              : "text-slate-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {subject.name} · {status.date}
                        </span>
                      </span>
                      <span
                        title={status.when}
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          status.overdue
                            ? "bg-red-50 text-red-700"
                            : status.soon
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status.short}
                      </span>
                    </button>
                    <AssessmentMenu
                      name={name}
                      onEdit={() => onEdit(subject.id, status.exam)}
                      onResolve={() => onRemove(subject.id, status.exam.id)}
                      onDelete={() => onRemove(subject.id, status.exam.id)}
                    />
                  </li>
                );
              })}
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

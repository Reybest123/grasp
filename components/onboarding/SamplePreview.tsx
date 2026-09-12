"use client";

// /sample — everything a new student sees from the signup form to their
// notebooks, without creating an account to get there.
//
// Each step is the real screen in preview mode, not a copy of it: AuthForm,
// VerifyEmail, OnboardingFlow and TimetableDialog each take a preview hook that
// swaps their server calls for a move to the next step, so the preview cannot
// drift from what a student actually sees. The stand-ins are the pages behind
// the timetable popup — the dashboard it opens over, and the notebooks grid its
// two ways onward lead to — since the real ones need a signed-in account.
//
// The bar across the top can go back, skip, or jump to any step, since the
// point is to look at a screen, and making someone fill in a signup form to look
// at the timetable popup is the friction this page exists to remove.

import { useMemo, useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TimetableDialog } from "@/components/onboarding/TimetableDialog";
import { Logo } from "@/components/Logo";
import { AddSubjectCard, SubjectCard } from "@/components/SubjectCard";
import { ArrowRightIcon, BackIcon, WorkspaceIcon } from "@/components/icons";
import { createSubject } from "@/lib/subjects";
import { useNow } from "@/lib/subjectsStore";
import { DEFAULT_PLAN, PLAN_LABEL, quizLimit } from "@/lib/plan";
import type { ExtractedSubject } from "@/lib/ai";

type Step = "signup" | "verify" | "questions" | "plans" | "timetable" | "ready";

const STEPS: { id: Step; label: string }[] = [
  { id: "signup", label: "Create account" },
  { id: "verify", label: "Confirm email" },
  { id: "questions", label: "Questions" },
  { id: "plans", label: "Plans" },
  { id: "timetable", label: "Timetable" },
  { id: "ready", label: "Workspace ready" },
];

/** Shown on the confirm step when the signup form was skipped. */
const PLACEHOLDER_EMAIL = "you@school.edu";

const NONE: ExtractedSubject[] = [];

/**
 * What the last step shows when the timetable was skipped rather than read —
 * the reader needs a signed-in account, so a signed-out preview could otherwise
 * never see that screen.
 */
const SAMPLE_SUBJECTS: ExtractedSubject[] = [
  {
    name: "Mathematics",
    teacher: "Ms Patel",
    classes: [
      { id: "m1", day: 1, start: "09:00", end: "10:00" },
      { id: "m2", day: 3, start: "11:00", end: "12:00" },
      { id: "m3", day: 5, start: "09:00", end: "10:00" },
    ],
  },
  {
    name: "English",
    teacher: "Mr Okafor",
    classes: [
      { id: "e1", day: 2, start: "10:00", end: "11:00" },
      { id: "e2", day: 4, start: "13:30", end: "14:30" },
    ],
  },
  {
    name: "Chemistry",
    teacher: "Dr Lin",
    classes: [
      { id: "c1", day: 1, start: "11:00", end: "12:00" },
      { id: "c2", day: 4, start: "09:00", end: "10:00" },
    ],
  },
  {
    name: "History",
    classes: [{ id: "h1", day: 3, start: "13:30", end: "14:30" }],
  },
];

/** A brand-new dashboard's tiles, before anything has been studied. */
const EMPTY_TILES = [
  ["Understanding", "No quizzes marked yet"],
  ["Study this week", "Nothing touched in the last week"],
  ["Quiz allowance", `of ${quizLimit(DEFAULT_PLAN)} this week on ${PLAN_LABEL[DEFAULT_PLAN]} trial`],
] as const;

export function SamplePreview() {
  const [step, setStep] = useState<Step>("signup");
  const [email, setEmail] = useState(PLACEHOLDER_EMAIL);
  // Only set by a real read (and edits to it), so skipping past the timetable
  // falls back to the sample list and a real read is kept if the student steps
  // back and forward.
  const [read, setRead] = useState<ExtractedSubject[] | null>(null);
  // The popup can be closed to look at the page behind it; picking a step from
  // the bar opens it again.
  const [dialogOpen, setDialogOpen] = useState(true);
  const [behind, setBehind] = useState<"home" | "workspace">("home");

  const index = STEPS.findIndex((s) => s.id === step);
  const last = index === STEPS.length - 1;
  const subjects = step === "ready" ? (read ?? SAMPLE_SUBJECTS) : NONE;

  function go(next: Step) {
    setStep(next);
    setDialogOpen(true);
    setBehind("home");
  }

  function restart() {
    setEmail(PLACEHOLDER_EMAIL);
    setRead(null);
    go("signup");
  }

  /** Skip, or Go to my notebooks: on to the workspace, as it is for real. */
  function toNotebooks() {
    setDialogOpen(false);
    setBehind("workspace");
  }

  return (
    // The screens fill what is left below the bar, exactly as each fills the
    // whole window for real, so none of them scrolls here either.
    <div className="flex h-dvh flex-col">
      {/* Above the timetable popup (z-60), so the preview can still be driven
          while it is open. */}
      <div className="relative z-[70] shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-sm">
            <span className="font-semibold">Preview.</span>{" "}
            <span className="hidden sm:inline">What a new student sees. Nothing is saved.</span>
          </p>

          <ol className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const current = s.id === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={current ? "step" : undefined}
                    title={s.label}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                      current ? "bg-amber-200/70 text-amber-950" : "text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-[11px] tabular-nums ${
                        current ? "bg-amber-900 text-amber-50" : "bg-amber-200/80"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={current ? "" : "hidden 2xl:inline"}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(STEPS[index - 1].id)}
              disabled={index === 0}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <BackIcon className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => (last ? restart() : go(STEPS[index + 1].id))}
              className="flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-1.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-950"
            >
              {last ? (
                "Start again"
              ) : (
                <>
                  Skip step <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 [&>main]:h-full">
        {step === "signup" && (
          <AuthForm
            mode="signup"
            onPreviewSubmit={(entered) => {
              setEmail(entered);
              go("verify");
            }}
          />
        )}

        {step === "verify" && <VerifyEmail email={email} preview={{ onLogOut: restart }} />}

        {(step === "questions" || step === "plans") && (
          <OnboardingFlow
            // Remounted between the two, so the plans step opens on the plans.
            key={step}
            startOnPlans={step === "plans"}
            onReachPlans={() => go("plans")}
            onFinish={async () => {
              go("timetable");
              return null;
            }}
            onLogOut={restart}
          />
        )}

        {(step === "timetable" || step === "ready") && (
          <>
            {behind === "home" ? (
              <PreviewHome subjects={subjects} />
            ) : (
              <PreviewWorkspace subjects={subjects} />
            )}
            <TimetableDialog
              key={step}
              open={dialogOpen}
              preview
              initialSubjects={step === "ready" ? subjects : undefined}
              onSubjects={(found) => {
                setRead(found);
                if (step !== "ready") go("ready");
              }}
              onClose={() => setDialogOpen(false)}
              onSkip={toNotebooks}
              onFinish={toNotebooks}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The app's header and rail in outline, around a page that scrolls but cannot
 * be used — it is there to be seen around the popup.
 */
function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div
        inert
        className="flex h-[69px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6"
      >
        <Logo />
        <span className="h-9 w-9 rounded-full bg-ink" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div inert className="w-16 shrink-0 border-r border-slate-200 bg-white" />
        <section className="scroll-thin min-w-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div inert>{children}</div>
        </section>
      </div>
    </div>
  );
}

/** The dashboard a new student lands on, behind the popup. */
function PreviewHome({ subjects }: { subjects: ExtractedSubject[] }) {
  return (
    <PreviewFrame>
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back</h1>
      </div>

      {subjects.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <WorkspaceIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-lg font-semibold text-ink">You have no subjects yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Your notebooks live in the workspace. Add a subject there and it shows up here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {EMPTY_TILES.map(([label, sub]) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="h-16 w-16 shrink-0 rounded-full border-[7px] border-slate-200" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="mt-0.5 text-xs leading-4 text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Your last 7 days
              </h2>
              <div className="mt-3 h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Upcoming assessments
              </h2>
              <div className="mt-3 grid h-72 place-items-center rounded-2xl border border-slate-200 bg-white px-3 text-center shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-ink">No assessments added</p>
                  <p className="mt-1 text-xs text-slate-500">Add one and Grasp counts down to it.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </PreviewFrame>
  );
}

/** The notebooks grid, built from the real subject cards. */
function PreviewWorkspace({ subjects }: { subjects: ExtractedSubject[] }) {
  const now = useNow();
  const built = useMemo(
    () =>
      subjects.map((s, i) => ({
        ...createSubject(s.name, i),
        teacher: s.teacher,
        classes: s.classes,
      })),
    [subjects]
  );

  return (
    <PreviewFrame>
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your notebooks</h1>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {built.map((s) => (
          <SubjectCard key={s.id} subject={s} now={now} onOpen={() => {}} onEdit={() => {}} />
        ))}
        <AddSubjectCard onClick={() => {}} />
      </div>
    </PreviewFrame>
  );
}

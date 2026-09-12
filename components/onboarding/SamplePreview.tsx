"use client";

// /sample — everything a new student sees from the signup form onwards, without
// creating an account to get there.
//
// Each step is the real screen in preview mode, not a copy of it: AuthForm,
// VerifyEmail and OnboardingFlow each take a preview prop that swaps their
// server calls for a move to the next step. So the preview cannot drift from
// what a student actually sees; a change to any of those screens shows up here.
//
// The bar across the top can go back, skip, or jump to any step, since the
// point is to look at a screen, and making someone fill in a signup form to look
// at the timetable step is the friction this page exists to remove.

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { ArrowRightIcon, BackIcon } from "@/components/icons";
import type { ExtractedSubject } from "@/lib/ai";

type Step = "signup" | "verify" | "timetable" | "ready";

const STEPS: { id: Step; label: string }[] = [
  { id: "signup", label: "Create account" },
  { id: "verify", label: "Confirm email" },
  { id: "timetable", label: "Timetable" },
  { id: "ready", label: "Notebooks ready" },
];

/** Shown on the confirm step when the signup form was skipped. */
const PLACEHOLDER_EMAIL = "you@school.edu";

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

export function SamplePreview() {
  const [step, setStep] = useState<Step>("signup");
  const [email, setEmail] = useState(PLACEHOLDER_EMAIL);
  // Only set by a real read, so skipping past the timetable falls back to the
  // sample list and a real read is kept if the student steps back and forward.
  const [read, setRead] = useState<ExtractedSubject[] | null>(null);

  const index = STEPS.findIndex((s) => s.id === step);
  const last = index === STEPS.length - 1;

  // Every step is a fresh page in the real flow, so each opens at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  function restart() {
    setEmail(PLACEHOLDER_EMAIL);
    setRead(null);
    setStep("signup");
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 sm:px-6">
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
                    onClick={() => setStep(s.id)}
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
                    <span className={current ? "" : "hidden md:inline"}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(STEPS[index - 1].id)}
              disabled={index === 0}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <BackIcon className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => (last ? restart() : setStep(STEPS[index + 1].id))}
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

      {step === "signup" && (
        <AuthForm
          mode="signup"
          onPreviewSubmit={(entered) => {
            setEmail(entered);
            setStep("verify");
          }}
        />
      )}

      {step === "verify" && <VerifyEmail email={email} preview={{ onLogOut: restart }} />}

      {(step === "timetable" || step === "ready") && (
        <OnboardingFlow
          // Remounted between the two so each opens on its own stage.
          key={step}
          initialSubjects={step === "ready" ? read ?? SAMPLE_SUBJECTS : undefined}
          preview={{
            onRead: (subjects) => {
              setRead(subjects);
              setStep("ready");
            },
            onSkip: () => setStep("ready"),
            onRestart: restart,
          }}
        />
      )}
    </>
  );
}

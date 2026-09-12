"use client";

// §2 Onboarding — three quick questions, then the plans.
//
// It runs once, straight after the email is confirmed. Starting the Pro trial
// finishes it, and the student lands on /workspace, where the timetable upload
// opens as a popup over their notebooks (components/onboarding/TimetableDialog).
// The timetable used to be the whole of this page, full screen, which hid the
// very workspace it was building.
//
// Shared by two pages. /onboarding passes an `onFinish` that saves; /sample
// (components/onboarding/SamplePreview.tsx) passes one that moves the preview
// on, so nothing is written there.

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { PlanCard } from "@/components/PlanCard";
import { QUESTIONS, type OnboardingAnswers, type Question } from "@/lib/onboarding";
import { PLANS, PLAN_AVAILABLE, PLAN_LABEL, TRIAL_DAYS, type Plan } from "@/lib/plan";
import { AlertIcon, ArrowRightIcon, BackIcon, CheckIcon } from "@/components/icons";

/** The questions come first, one per step; the plans are the step after them. */
const PLANS_STEP = QUESTIONS.length;

const PRIMARY =
  "flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600";

export function OnboardingFlow({
  onFinish,
  onLogOut,
  startOnPlans = false,
  onReachPlans,
}: {
  /** saves (or, in the preview, moves on); resolves to an error to show, or null */
  onFinish: (answers: OnboardingAnswers, plan: Plan) => Promise<string | null>;
  onLogOut: () => void;
  /** the preview's way to open straight on the plans */
  startOnPlans?: boolean;
  onReachPlans?: () => void;
}) {
  const [step, setStep] = useState(startOnPlans ? PLANS_STEP : 0);
  const [picked, setPicked] = useState<Record<Question["id"], string[]>>({
    yearLevel: [],
    uses: [],
    focus: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const question = step < PLANS_STEP ? QUESTIONS[step] : null;

  function goTo(next: number) {
    setStep(next);
    if (next === PLANS_STEP) onReachPlans?.();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function choose(q: Question, option: string) {
    if (q.multi) {
      setPicked((p) => {
        const current = p[q.id];
        return {
          ...p,
          [q.id]: current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option],
        };
      });
      return;
    }
    // Picking replaces the answer but does not move on: every question waits for
    // Continue, the same as the pick-several one, so a misclick can be put right
    // before it counts.
    setPicked((p) => ({ ...p, [q.id]: [option] }));
  }

  async function start(plan: Plan) {
    setBusy(true);
    setError("");
    const problem = await onFinish(
      { yearLevel: picked.yearLevel[0] ?? "", uses: picked.uses, focus: picked.focus[0] ?? "" },
      plan
    );
    if (problem) {
      setError(problem);
      setBusy(false);
    }
    // Otherwise `busy` stays set through the navigation, so the button cannot
    // be pressed a second time on the way out.
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="ruled fade-out-b absolute inset-0 opacity-60" />

      <div className="relative">
        <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Logo />
          <button
            type="button"
            onClick={onLogOut}
            className="text-sm font-semibold text-slate-500 transition hover:text-ink"
          >
            Log out
          </button>
        </header>

        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {Array.from({ length: PLANS_STEP + 1 }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? "bg-brand-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {question ? `Question ${step + 1} of ${QUESTIONS.length}` : "Your plan"}
          </span>
        </div>

        {question ? (
          <section key={question.id} className="mx-auto max-w-2xl px-6 pb-20 pt-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {question.title}
            </h1>
            {question.hint && <p className="mt-2 text-slate-600">{question.hint}</p>}

            <div role="group" aria-label={question.title} className="mt-8 grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => {
                const on = picked[question.id].includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(question, option)}
                    aria-pressed={on}
                    className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left text-[15px] font-semibold transition ${
                      on
                        ? "border-brand-500 text-ink shadow-lift ring-4 ring-brand-100"
                        : "border-slate-200 text-slate-700 shadow-ring hover:-translate-y-0.5 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center border transition ${
                        question.multi ? "rounded-md" : "rounded-full"
                      } ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"}`}
                    >
                      {on && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
                >
                  <BackIcon className="h-4 w-4" /> Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                disabled={picked[question.id].length === 0}
                className={PRIMARY}
              >
                Continue <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-4xl px-6 pb-20 pt-10">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Choose your plan
              </h1>
              <p className="mx-auto mt-3 max-w-md text-slate-600">
                Start with {TRIAL_DAYS} days of Pro, free. No card needed.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <PlanCard key={plan} plan={plan}>
                  {PLAN_AVAILABLE[plan] ? (
                    <button
                      type="button"
                      onClick={() => start(plan)}
                      disabled={busy}
                      className={`${PRIMARY} w-full`}
                    >
                      {busy ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Starting your trial…
                        </>
                      ) : (
                        <>
                          {plan === "pro" ? "Start free trial" : `Choose ${PLAN_LABEL[plan]}`}
                          <ArrowRightIcon className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-base font-semibold text-slate-500"
                    >
                      Coming soon
                    </button>
                  )}
                </PlanCard>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              Paid plans are not live yet, so nothing is charged when the trial ends.
            </p>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => goTo(PLANS_STEP - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
              >
                <BackIcon className="h-4 w-4" /> Back to the questions
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

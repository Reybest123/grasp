"use client";

// §2 Onboarding — three quick questions, then the plans.
//
// It runs once, straight after the email is confirmed. Starting the Pro trial
// finishes it, and the student lands on /home, where the timetable upload
// opens as a popup over the dashboard (components/onboarding/TimetableDialog).
// The timetable used to be the whole of this page, full screen, which hid the
// app it was building.
//
// Fixed to the viewport like the dashboard: the header and progress bar stay
// put and the page never scrolls. The step below them only scrolls inside
// itself on a screen too short to hold it.

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { PlanCard } from "@/components/PlanCard";
import { useCurrency } from "@/lib/currencyStore";
import { QUESTIONS, type OnboardingAnswers, type Question } from "@/lib/onboarding";
import { BILLING_PERIOD, PLANS, PLAN_LABEL, TRIAL_DAYS, planPrice, type Plan } from "@/lib/plan";
import { ArrowRightIcon, BackIcon, CheckIcon } from "@/components/icons";
import { ErrorNote } from "@/components/ErrorNote";

/** The questions come first, one per step; the plans are the step after them. */
const PLANS_STEP = QUESTIONS.length;

const PRIMARY =
  "flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600";

export function OnboardingFlow({
  saved,
  onAnswered,
  onFinish,
  onLogOut,
}: {
  /** answers stored on an earlier visit; the flow then opens on the plans */
  saved: OnboardingAnswers | null;
  /** the last question has been answered */
  onAnswered: (answers: OnboardingAnswers) => void;
  /** saves; resolves to an error to show, or null */
  onFinish: (answers: OnboardingAnswers, plan: Plan) => Promise<string | null>;
  onLogOut: () => void;
}) {
  const currency = useCurrency();
  const [step, setStep] = useState(saved ? PLANS_STEP : 0);
  const [picked, setPicked] = useState<Record<Question["id"], string[]>>({
    yearLevel: saved?.yearLevel ? [saved.yearLevel] : [],
    uses: saved?.uses ?? [],
    focus: saved?.focus ? [saved.focus] : [],
  });
  const [busy, setBusy] = useState(false);
  // Back from Stripe's Checkout can restore this page from the browser's
  // back/forward cache exactly as it was left: mid-redirect, with both plan
  // buttons disabled. A restored page starts over as pressable.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const question = step < PLANS_STEP ? QUESTIONS[step] : null;

  function goTo(next: number) {
    setStep(next);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
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

  const answers = (): OnboardingAnswers => ({
    yearLevel: picked.yearLevel[0] ?? "",
    uses: picked.uses,
    focus: picked.focus[0] ?? "",
  });

  function next() {
    if (step + 1 === PLANS_STEP) onAnswered(answers());
    goTo(step + 1);
  }

  async function start(plan: Plan) {
    setBusy(true);
    setError("");
    const problem = await onFinish(answers(), plan);
    if (problem) {
      setError(problem);
      setBusy(false);
    }
    // Otherwise `busy` stays set through the navigation, so the button cannot
    // be pressed a second time on the way out.
  }

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden="true"
        className="ruled fade-out-b pointer-events-none absolute inset-0 opacity-60"
      />

      <header className="relative mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-4 px-6 py-4">
        <Logo />
        <button
          type="button"
          onClick={onLogOut}
          className="text-sm font-semibold text-slate-500 transition hover:text-ink"
        >
          Log out
        </button>
      </header>

      <div className="relative mx-auto flex w-full max-w-2xl shrink-0 items-center gap-4 px-6">
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

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        {question ? (
          <section key={question.id} className="rise mx-auto max-w-2xl px-6 py-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {question.title}
            </h1>
            {question.hint && <p className="mt-2 text-slate-600">{question.hint}</p>}

            <div role="group" aria-label={question.title} className="mt-7 grid gap-3 sm:grid-cols-2">
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

            <div className="mt-8 flex items-center justify-between gap-3">
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
                onClick={next}
                disabled={picked[question.id].length === 0}
                className={PRIMARY}
              >
                Continue <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
          </section>
        ) : (
          <section key="plans" className="rise mx-auto max-w-4xl px-6 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">Choose your plan</h1>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                Start with {TRIAL_DAYS} days of Pro, free, then {planPrice("pro", currency)} a {BILLING_PERIOD} unless
                you cancel. A card is needed to start, but nothing is charged during the trial.
              </p>
            </div>

            {error && <ErrorNote message={error} className="mx-auto mt-5 max-w-4xl" />}

            <div className="mx-auto mt-7 grid max-w-4xl gap-5 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <PlanCard key={plan} plan={plan} currency={currency} compact>
                  <button
                    type="button"
                    onClick={() => start(plan)}
                    disabled={busy}
                    className={`${PRIMARY} w-full`}
                  >
                    {busy ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Taking you to checkout…
                      </>
                    ) : (
                      <>
                        {plan === "pro" ? "Start free trial" : `Choose ${PLAN_LABEL[plan]}`}
                        <ArrowRightIcon className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </PlanCard>
              ))}
            </div>

            <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => goTo(PLANS_STEP - 1)}
                className="-ml-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
              >
                <BackIcon className="h-4 w-4" /> Back to the questions
              </button>
              <p className="text-xs text-slate-500">You can cancel any time before you are charged.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

"use client";

// The full-screen moment around getting a plan: "Switching you to Max" while a
// switch is being charged, then "Welcome to Max" once it has gone through. The
// welcome is also what a student lands on back from Stripe Checkout, on the
// first plan from onboarding and on renewing after a plan or free trial ended
// (`?welcome=pro|max`, added by /api/checkout/complete). Portalled to <body> so
// the header's backdrop blur cannot become its containing block.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WaitingState } from "@/components/WaitingState";
import { LogoTile } from "@/components/Logo";
import { CheckIcon } from "@/components/icons";
import {
  AI_TOKEN_LIMIT,
  PLAN_LABEL,
  QUIZ_LIMIT,
  RECORDING_SECONDS,
  RESOURCE_READ_LIMIT,
  formatCount,
  formatDuration,
  type BilledPlan,
} from "@/lib/plan";

/** What the week now holds, from the same caps the plan cards read. */
function weekOf(plan: BilledPlan): string[] {
  return [
    `${formatCount(AI_TOKEN_LIMIT[plan])} AI tokens`,
    `${QUIZ_LIMIT[plan]} quizzes`,
    `${formatDuration(RECORDING_SECONDS[plan])} of lecture recording`,
    `${RESOURCE_READ_LIMIT[plan]} Resource Bank documents`,
  ];
}

export function PlanWelcome({
  plan,
  phase,
  intro,
  actionLabel = "Start studying",
  onDone,
}: {
  plan: BilledPlan;
  /** `working` while the switch is being charged, `welcome` once it has. */
  phase: "working" | "welcome";
  /** The line under the heading; defaults to the week starting fresh. */
  intro?: string;
  actionLabel?: string;
  onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (phase === "welcome") buttonRef.current?.focus();
  }, [phase]);

  if (!mounted) return null;

  const label = PLAN_LABEL[plan];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phase === "working" ? `Switching to ${label}` : `Welcome to ${label}`}
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-50/95 px-4 py-8 backdrop-blur-sm [animation:popIn_200ms_ease-out]"
    >
      {phase === "working" ? (
        <WaitingState
          className="w-full max-w-md"
          title={`Switching you to ${label}`}
          steps={["Charging your card", `Setting up ${label}`, "Starting your new week"]}
        />
      ) : (
        <div
          key="welcome"
          className="rise w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-ring sm:px-10"
        >
          <LogoTile className="mx-auto h-14 w-14" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-ink">Welcome to {label}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {intro ?? "Your week starts today. Here is what it holds."}
          </p>

          <ul className="mx-auto mt-7 max-w-xs space-y-3 text-left">
            {weekOf(plan).map((line, i) => (
              <li
                key={line}
                className="flex items-center gap-3 text-sm font-medium text-ink [animation:stepIn_400ms_ease-out_both]"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {line}
              </li>
            ))}
          </ul>

          <button
            ref={buttonRef}
            onClick={onDone}
            className="mt-9 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

/**
 * Shows the welcome once on arrival with `?welcome=pro|max`, then drops the flag
 * from the URL so a refresh or Back does not show it again.
 */
export function WelcomeFromCheckout() {
  const [plan, setPlan] = useState<BilledPlan | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get("welcome");
    if (value !== "pro" && value !== "max") return;
    setPlan(value);
    setOnboarding(url.searchParams.get("setup") === "timetable");
    url.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  if (!plan) return null;
  return (
    <PlanWelcome
      plan={plan}
      phase="welcome"
      intro={onboarding ? "You're all set. Next, Grasp reads your timetable and builds your notebooks." : undefined}
      actionLabel={onboarding ? "Set up my notebooks" : "Start studying"}
      onDone={() => setPlan(null)}
    />
  );
}

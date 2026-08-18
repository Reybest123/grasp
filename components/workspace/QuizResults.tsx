"use client";

// The screen a student lands on the moment a quiz is marked — §3.3.
//
// Submitting used to re-render the same list of questions with marks on it,
// which gave the work no moment of payoff. This sits in front of that: one
// understanding score, what it means, and the way through to the answers.
//
// It is deliberately not persisted. `QuizRunner` holds the flag in component
// state, so it only ever appears on the submit that just happened — reopening a
// finished quiz from the grid goes straight to the marked answers, where a
// student going back to re-read something actually wants to be.

import { useEffect, useState } from "react";
import type { Quiz } from "@/lib/subjects";
import { formatScore } from "@/components/workspace/QuizCard";
import { QuizTitle } from "@/components/workspace/QuizTitle";
import { BackIcon, CheckIcon, CloseIcon, MinusIcon } from "@/components/icons";

const DURATION = 900;

/** Ring geometry. The viewBox is square and the stroke sits inside it. */
const R = 76;
const STROKE = 14;
const SIZE = (R + STROKE / 2) * 2 + 4; // +4 so the cap never clips
const CIRCUMFERENCE = 2 * Math.PI * R;

/** The same 0.8 / 0.5 bands the score chip and question borders already use. */
function bandOf(pct: number) {
  if (pct >= 0.8) {
    return {
      verdict: "Strong grasp",
      ring: "text-emerald-500",
      tint: "bg-emerald-50 text-emerald-700",
    };
  }
  if (pct >= 0.5) {
    return {
      verdict: "Getting there",
      ring: "text-amber-500",
      tint: "bg-amber-50 text-amber-800",
    };
  }
  return {
    verdict: "Worth another pass",
    ring: "text-red-500",
    tint: "bg-red-50 text-red-700",
  };
}

export function QuizResults({
  quiz,
  onRename,
  onReview,
  onBack,
}: {
  quiz: Quiz;
  onRename: (title: string) => void;
  onReview: () => void;
  onBack: () => void;
}) {
  // One clock drives the ring and the number together, so they can't drift
  // apart the way a CSS transition and a rAF count-up would.
  const [t, setT] = useState(0);

  // Submit is at the foot of the quiz, so the page is scrolled well down when
  // this mounts — the score card would come up with the subject header and its
  // tabs off-screen above it. Instant rather than smooth: `html` carries
  // `scroll-behavior: smooth`, and animating the whole length of a 20-question
  // page reads as a glitch when the content underneath has changed completely.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      setT(1 - Math.pow(1 - p, 3)); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const total = quiz.score?.total || quiz.questions.length;
  const got = quiz.score?.got ?? 0;
  const pct = total ? got / total : 0;
  const band = bandOf(pct);

  let right = 0;
  let half = 0;
  for (const q of quiz.questions) {
    const a = quiz.answers[q.id];
    if (a?.correct) right += 1;
    else if (a?.partial) half += 1;
  }
  const missed = quiz.questions.length - right - half;

  // A quiz of nothing but multiple choice can never award a half, so the cell
  // would sit at zero forever rather than telling the student anything.
  const canHalf = quiz.questions.some((q) => q.kind !== "mcq");

  const sub =
    missed === 0 && half === 0
      ? "Full marks. Nothing to fix on this one."
      : pct >= 0.8
        ? "Most of this has landed. The review covers what slipped."
        : pct >= 0.5
          ? "A solid half is there. The review shows where the gaps are."
          : "This one needs another look — the review explains each answer.";

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-ink"
      >
        <BackIcon className="h-4 w-4" /> All quizzes
      </button>

      <div className="mx-auto max-w-xl animate-[popIn_180ms_ease-out] rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <QuizTitle
          value={quiz.title}
          onRename={onRename}
          center
          className="text-sm font-semibold text-slate-500"
        />

        <div className="relative mx-auto mt-6" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="text-slate-100"
              stroke="currentColor"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - pct * t)}
              className={band.ring}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="text-5xl font-bold leading-none tabular-nums text-ink">
                {Math.round(pct * t * 100)}
                <span className="text-2xl font-semibold text-slate-400">%</span>
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Understanding
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink">{band.verdict}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{sub}</p>

        <span
          className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${band.tint}`}
        >
          {formatScore(got)} of {total} mark{total === 1 ? "" : "s"}
        </span>

        <div className={`mt-7 grid gap-3 ${canHalf ? "grid-cols-3" : "grid-cols-2"}`}>
          <Tally icon={<CheckIcon className="h-4 w-4" />} n={right} label="Correct" tone="text-emerald-600" />
          {canHalf && (
            <Tally icon={<MinusIcon className="h-4 w-4" />} n={half} label="Half marks" tone="text-amber-600" />
          )}
          <Tally icon={<CloseIcon className="h-4 w-4" />} n={missed} label="Missed" tone="text-red-500" />
        </div>

        <div className="mt-7 space-y-2">
          <button
            onClick={onReview}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Review answers
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to quizzes
          </button>
        </div>
      </div>
    </div>
  );
}

function Tally({
  icon,
  n,
  label,
  tone,
}: {
  icon: React.ReactNode;
  n: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3">
      <div className={`flex items-center justify-center gap-1.5 ${n ? tone : "text-slate-300"}`}>
        {icon}
        <span className="text-xl font-bold leading-none tabular-nums">{n}</span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

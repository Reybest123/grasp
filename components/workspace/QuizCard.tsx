"use client";

// A saved quiz in the Quizzes grid. Deliberately shaped like SubjectCard on
// /home — colour strip, title, meta, action row — so the two grids read as the
// same kind of object.

import type { Quiz } from "@/lib/subjects";
import { getColor } from "@/lib/subjectColors";
import { QuizTitle } from "@/components/workspace/QuizTitle";
import { QuizIcon, TrashIcon, PlusIcon, CheckIcon, RetakeIcon } from "@/components/icons";

/** Short relative age, e.g. "just now", "3 days ago". */
function ago(iso: string, now: Date | null): string {
  if (!now) return " ";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return " ";
  const mins = Math.floor((now.getTime() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

/** Scores can land on a half from a partially-correct written answer. */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function QuizCard({
  quiz,
  colorKey,
  now,
  onOpen,
  onRetake,
  onRename,
  onDelete,
}: {
  quiz: Quiz;
  colorKey: string;
  /** null until the client clock is available — keeps SSR markup stable */
  now: Date | null;
  onOpen: () => void;
  onRetake: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const color = getColor(colorKey);
  const total = quiz.questions.length;
  const answered = quiz.questions.filter((q) => {
    const a = quiz.answers[q.id];
    return a && (a.choice !== undefined || (a.text ?? "").trim() !== "");
  }).length;

  const pct = quiz.score && quiz.score.total ? quiz.score.got / quiz.score.total : 0;
  const scoreTone =
    pct >= 0.8 ? "bg-emerald-50 text-emerald-700" : pct >= 0.5 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";

  const mcq = quiz.questions.filter((q) => q.kind === "mcq").length;
  const written = total - mcq;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft">
      <div className={`h-1.5 bg-gradient-to-r ${color.gradient}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color.tint}`}>
            <QuizIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <QuizTitle
              value={quiz.title}
              onRename={onRename}
              className="text-base font-bold leading-tight text-ink"
            />
            <p className="truncate text-sm text-slate-500">{ago(quiz.created, now)}</p>
          </div>
          <button
            onClick={onDelete}
            aria-label={`Delete ${quiz.title}`}
            title="Delete quiz"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus-visible:outline-none group-hover:opacity-100"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        {/* The title is already built from the topics, so repeating them here
            says nothing. Show whatever actually tells two quizzes apart. */}
        <p className="mt-4 line-clamp-2 text-sm text-slate-600">
          {quiz.instructions.trim() ||
            (quiz.topics.length > 2
              ? quiz.topics.join(" · ")
              : quiz.noteIds.length
                ? `From ${quiz.noteIds.length} note${quiz.noteIds.length === 1 ? "" : "s"}`
                : "General questions for this subject")}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs font-medium text-slate-500">
          <span>
            {total} question{total === 1 ? "" : "s"}
          </span>
          {mcq > 0 && written > 0 && (
            <span className="text-slate-400">
              {mcq} choice · {written} written
            </span>
          )}
          {quiz.score ? (
            <span
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${scoreTone}`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              {formatScore(quiz.score.got)} / {quiz.score.total}
            </span>
          ) : (
            <span className="ml-auto text-slate-400">
              {answered ? `${answered} of ${total} answered` : "Not started"}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
          {quiz.submitted ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpen}
                className="rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Review answers
              </button>
              <button
                onClick={onRetake}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700"
              >
                <RetakeIcon className="h-4 w-4" />
                Retake
              </button>
            </div>
          ) : (
            <button
              onClick={onOpen}
              className="rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              {answered ? "Keep going" : "Start quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewQuizCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group grid min-h-[220px] place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/50"
    >
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-slate-400 transition group-hover:border-brand-400 group-hover:bg-white group-hover:text-brand-600">
          <PlusIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 font-semibold text-slate-700 transition group-hover:text-brand-700">
          New quiz
        </p>
        <p className="mt-1 text-xs text-slate-500">Pick your topics and question mix</p>
      </div>
    </button>
  );
}

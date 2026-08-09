"use client";

import type { Subject } from "@/lib/demoData";
import { getColor } from "@/lib/subjectColors";
import { upcomingExams, nextClassLabel } from "@/lib/schedule";
import {
  NoteIcon,
  QuizIcon,
  BankIcon,
  ClockIcon,
  ExamIcon,
  EditIcon,
  PlusIcon,
} from "@/components/icons";

export function SubjectCard({
  subject,
  now,
  onOpen,
  onEdit,
}: {
  subject: Subject;
  /** null until the client clock is available — keeps SSR markup stable */
  now: Date | null;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const color = getColor(subject.colorKey);
  const nextClass = now ? nextClassLabel(subject.classes, now) : null;
  // Only the soonest exam gets a chip; the rest are summarised as a count.
  const exams = now ? upcomingExams(subject.exams, now) : [];
  const exam = exams[0];
  const moreExams = Math.max(0, exams.length - 1);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft">
      {/* Colour identity strip — replaces the old oversized gradient block */}
      <div className={`h-1.5 bg-gradient-to-r ${color.gradient}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Title sits at the very top of the card */}
        <div className="flex items-start gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color.gradient} text-lg font-bold text-white shadow-sm`}
          >
            {subject.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold leading-tight text-ink">{subject.name}</h3>
            <p className="truncate text-sm text-slate-500">
              {subject.teacher || "No teacher set"}
            </p>
          </div>
        </div>

        {/* Schedule at a glance — just the next class, never the whole week */}
        <div className="mt-4 space-y-1.5 text-sm">
          <p className="flex items-center gap-2 text-slate-600">
            <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {nextClass ?? (now ? "No class times yet" : " ")}
            </span>
          </p>
          {exam && (
            <p className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  exam.soon ? "bg-amber-50 text-amber-700" : color.tint
                }`}
              >
                <ExamIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{exam.label}</span>
              </span>
              {moreExams > 0 && (
                <span className="text-xs font-medium text-slate-400">+{moreExams} more</span>
              )}
            </p>
          )}
        </div>

        {/* Content counts — `mt-auto` keeps the action row aligned across the
            grid even when a subject has no exam chip. */}
        <div className="mt-auto flex gap-4 pt-4 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1">
            <NoteIcon className="h-3.5 w-3.5" /> {subject.notes.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <BankIcon className="h-3.5 w-3.5" /> {subject.resources.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <QuizIcon className="h-3.5 w-3.5" /> {subject.quizTopics.length}
          </span>
        </div>

        {/* Actions fill the space the emoji block used to waste */}
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={onOpen}
            className="flex-1 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Open notes
          </button>
          <button
            onClick={onEdit}
            aria-label={`Edit ${subject.name}`}
            title="Edit subject"
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-ink"
          >
            <EditIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddSubjectCard({ onClick }: { onClick: () => void }) {
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
          Add a subject
        </p>
        <p className="mt-1 text-xs text-slate-500">Class times and exam dates optional</p>
      </div>
    </button>
  );
}

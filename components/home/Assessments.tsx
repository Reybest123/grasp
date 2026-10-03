"use client";

import { examStatusesAcross, type Exam } from "@/lib/schedule";
import { AssessmentMenu } from "@/components/app/AssessmentMenu";
import type { Subject } from "@/lib/subjects";
import { ExamIcon, PlusIcon } from "@/components/icons";

/**
 * Every assessment across every subject: overdue ones first, then soonest. An
 * overdue one stays until the student marks it resolved or deletes it.
 */
export function Assessments({
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
            <p className="mt-1 text-xs text-slate-500">Create a new assessment to track your study progress.</p>
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

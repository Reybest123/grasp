"use client";

// Add an assessment from the home dashboard.
//
// The same exam rows live in the subject editor, but reaching them from here
// would mean picking a subject, opening its panel and scrolling past colour
// swatches and class times to get to the one field the student came for. So it
// is a dialog with the subject as a field of its own — the assessment is the
// thing being added, and which subject it belongs to is just part of it.

import { useEffect, useState } from "react";
import type { Subject } from "@/lib/subjects";
import { getColor } from "@/lib/subjectColors";
import { CloseIcon, ExamIcon } from "@/components/icons";

export function AddAssessmentDialog({
  open,
  subjects,
  onClose,
  onAdd,
}: {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
  /** appends the exam onto the chosen subject */
  onAdd: (subjectId: string, date: string, title: string) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");

  // Reset each time it opens, so a cancelled attempt doesn't prefill the next.
  useEffect(() => {
    if (!open) return;
    setSubjectId(subjects[0]?.id ?? "");
    setDate("");
    setTitle("");
  }, [open, subjects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // A date is the one thing an assessment cannot do without — there is nothing
  // to count down to otherwise. The title is optional, matching the editor.
  const valid = subjectId !== "" && date !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd(subjectId, date, title.trim());
    onClose();
  }

  const chosen = subjects.find((s) => s.id === subjectId);

  return (
    <>
      <div onClick={onClose} aria-hidden className="fixed inset-0 z-[60] bg-black/40" />
      <div className="fixed inset-0 z-[60] grid place-items-center p-4">
        <form
          onSubmit={submit}
          role="dialog"
          aria-modal="true"
          aria-label="Add an assessment"
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl [animation:popIn_150ms_ease-out]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <ExamIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Add an assessment</h2>
                <p className="text-sm text-slate-500">Grasp counts down to it and factors it into quizzes.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Subject</span>
              <div className="flex items-center gap-2.5">
                {chosen && (
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${
                      getColor(chosen.colorKey).gradient
                    } text-sm font-bold text-white`}
                  >
                    {chosen.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className={`${inputCls} min-w-0 flex-1`}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
                What is it?
                <span className="text-xs font-normal text-slate-400">optional</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Paper 2 mock"
                className={`${inputCls} w-full`}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add assessment
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

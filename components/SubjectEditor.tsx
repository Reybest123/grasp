"use client";

// Edit subject sheet: rename, recolour, class times, exam date, delete.
// Every field except the name is optional — a student can add nothing here and
// the app still works. Whatever they do fill in becomes AI context (lib/schedule).

import { useEffect, useState } from "react";
import type { Subject } from "@/lib/demoData";
import { makeSlot, makeExam } from "@/lib/demoData";
import { SUBJECT_COLORS, getColor } from "@/lib/subjectColors";
import { DAY_SHORT, type ClassSlot, type Exam } from "@/lib/schedule";
import { CloseIcon, PlusIcon, TrashIcon, CheckIcon, ExamIcon, ClockIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function SubjectEditor({
  subject,
  open,
  onClose,
  onSave,
  onDelete,
}: {
  subject: Subject | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Subject>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [colorKey, setColorKey] = useState("violet");
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reload the form whenever a different subject is opened.
  useEffect(() => {
    if (!open || !subject) return;
    setName(subject.name);
    setTeacher(subject.teacher ?? "");
    setColorKey(subject.colorKey);
    setClasses(subject.classes);
    setExams(subject.exams);
    setConfirmDelete(false);
  }, [open, subject]);

  // Escape closes the panel — unless the delete dialog is up, which handles its
  // own Escape and should be dismissed first.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open && !confirmDelete) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirmDelete, onClose]);

  if (!subject) return null;

  function save() {
    onSave({
      name: name.trim() || "Untitled subject",
      teacher: teacher.trim() || undefined,
      colorKey,
      classes: classes.filter((c) => c.start),
      // Drop half-filled rows — an exam without a date can't be counted down to.
      exams: exams
        .filter((e) => e.date)
        .map((e) => ({ ...e, title: e.title?.trim() || undefined })),
    });
    onClose();
  }

  function patchSlot(id: string, patch: Partial<ClassSlot>) {
    setClasses((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function patchExam(id: string, patch: Partial<Exam>) {
    setExams((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  const preview = getColor(colorKey);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Edit subject"
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${preview.gradient} text-sm font-bold text-white`}
            >
              {(name || "?").charAt(0).toUpperCase()}
            </span>
            <h2 className="font-bold text-ink">Edit subject</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
          {/* Name + teacher */}
          <section className="space-y-3">
            <Field label="Subject name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Biology"
                className={inputCls}
              />
            </Field>
            <Field label="Teacher" hint="optional">
              <input
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="e.g. Ms. Fournier"
                className={inputCls}
              />
            </Field>
          </section>

          {/* Colour */}
          <section>
            <Legend>Colour</Legend>
            <p className="mt-0.5 text-xs text-slate-500">
              Picked for you automatically — change it if you like.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColorKey(c.key)}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={colorKey === c.key}
                  className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${
                    c.gradient
                  } text-white transition ${
                    colorKey === c.key
                      ? "ring-2 ring-ink ring-offset-2"
                      : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {colorKey === c.key && <CheckIcon className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </section>

          {/* Class times */}
          <section>
            <div className="flex items-center justify-between">
              <Legend>
                <ClockIcon className="mr-1.5 inline h-4 w-4 align-[-3px] text-slate-400" />
                Class times
              </Legend>
              <span className="text-xs text-slate-400">optional</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Your notebook shows the next one, and Grasp knows your week.
            </p>

            <div className="mt-3 space-y-2">
              {classes.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <select
                    value={c.day}
                    onChange={(e) => patchSlot(c.id, { day: Number(e.target.value) })}
                    className={`${inputCls} w-[92px] shrink-0`}
                  >
                    {DAY_SHORT.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={c.start}
                    onChange={(e) => patchSlot(c.id, { start: e.target.value })}
                    className={`${inputCls} flex-1`}
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="time"
                    value={c.end ?? ""}
                    onChange={(e) => patchSlot(c.id, { end: e.target.value || undefined })}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={() => setClasses((cur) => cur.filter((x) => x.id !== c.id))}
                    aria-label="Remove this class"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {classes.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No class times yet.
                </p>
              )}
            </div>

            <button
              onClick={() => setClasses((cur) => [...cur, makeSlot(1, "09:00")])}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" /> Add class time
            </button>
          </section>

          {/* Exams — a subject can have as many as it needs */}
          <section>
            <div className="flex items-center justify-between">
              <Legend>
                <ExamIcon className="mr-1.5 inline h-4 w-4 align-[-3px] text-slate-400" />
                Exams and assessments
              </Legend>
              <span className="text-xs text-slate-400">optional</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Add as many as you like. Grasp counts down to the soonest and factors them into
              quizzes.
            </p>

            <div className="mt-3 space-y-2">
              {exams.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={e.date}
                    onChange={(ev) => patchExam(e.id, { date: ev.target.value })}
                    className={`${inputCls} w-[150px] shrink-0`}
                  />
                  <input
                    value={e.title ?? ""}
                    onChange={(ev) => patchExam(e.id, { title: ev.target.value })}
                    placeholder="e.g. Paper 2 mock"
                    className={`${inputCls} min-w-0 flex-1`}
                  />
                  <button
                    onClick={() => setExams((cur) => cur.filter((x) => x.id !== e.id))}
                    aria-label="Remove this exam"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {exams.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No exams yet.
                </p>
              )}
            </div>

            <button
              onClick={() => setExams((cur) => [...cur, makeExam("")])}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" /> Add exam
            </button>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-800">Delete this subject</p>
            <p className="mt-0.5 text-xs text-red-700/80">
              Removes {subject.notes.length} note{subject.notes.length === 1 ? "" : "s"} and
              everything else in it. This cannot be undone.
            </p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <TrashIcon className="h-4 w-4" /> Delete subject
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Save changes
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${subject.name}?`}
        body={`This removes the subject along with its ${subject.notes.length} note${
          subject.notes.length === 1 ? "" : "s"
        }, resources and quiz topics. This cannot be undone.`}
        confirmLabel="Yes, delete it"
        cancelLabel="No, keep it"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Legend({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-ink">{children}</h3>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      <span className="block [&>input]:w-full">{children}</span>
    </label>
  );
}

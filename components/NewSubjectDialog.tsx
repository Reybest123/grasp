"use client";

// Creating a subject used to drop the student straight into the full Edit
// subject sheet -- class times, exams and a delete button, none of which mean
// anything yet for a notebook that does not exist. This is the lightweight
// counterpart: centred like QuizEditDialog, asking only for what a subject
// needs to exist (a name) plus the two things a card actually shows (teacher,
// colour). Class times and exams stay in the full editor, reached afterwards
// through the card's own Edit button -- which is what the tile's "Class times
// and exam dates optional" line already promises.

import { ColorSwatches } from "@/components/ColorSwatches";
import { useEffect, useRef, useState } from "react";
import { getColor } from "@/lib/subjectColors";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { CloseIcon, WorkspaceIcon } from "@/components/icons";

export function NewSubjectDialog({
  open,
  defaultColorKey,
  onCreate,
  onClose,
}: {
  open: boolean;
  /** the colour the next card would get automatically, previewed until changed */
  defaultColorKey: string;
  onCreate: (data: { name: string; teacher: string; colorKey: string }) => void;
  onClose: () => void;
}) {
  const visible = useEnterTransition(open);

  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [colorKey, setColorKey] = useState(defaultColorKey);
  const nameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTeacher("");
    setColorKey(defaultColorKey);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestAnimationFrame(() => nameRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultColorKey]);

  const trimmed = name.trim();
  const preview = getColor(colorKey);

  function submit() {
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }
    onCreate({ name: trimmed, teacher: teacher.trim(), colorKey });
  }

  return (
    <div
      inert={!open}
      className={`fixed inset-0 z-[60] grid place-items-center p-4 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-subject-title"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`relative w-full max-w-[420px] rounded-2xl bg-white shadow-2xl transition duration-200 ease-out motion-reduce:transition-none ${
          visible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${preview.gradient} text-white`}
            >
              <WorkspaceIcon className="h-4 w-4" />
            </span>
            <h2 id="new-subject-title" className="font-bold text-ink">
              New subject
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Subject name</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biology"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between text-sm font-semibold text-ink">
              Teacher
              <span className="text-xs font-normal text-slate-400">optional</span>
            </span>
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="e.g. Ms. Fournier"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-ink">Colour</p>
            <p className="mt-0.5 text-xs text-slate-500">Picked for you automatically — change it if you like.</p>
            <ColorSwatches value={colorKey} onChange={setColorKey} />
          </div>

          <p className="text-xs text-slate-400">Class times and exam dates are optional — add them any time from Edit subject.</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600"
          >
            Create subject
          </button>
        </div>
      </form>
    </div>
  );
}

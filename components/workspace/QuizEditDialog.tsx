"use client";

// Edit a saved quiz: its name, its colour, or delete it.
//
// Centred like ConfirmDialog rather than a slide-in sheet, since there are only
// three things on it. It stays mounted and animates on `open` in both
// directions, and holds the last quiz while closing so the content does not
// blank out mid-fade.

import { ColorSwatches } from "@/components/ColorSwatches";
import { useEffect, useRef, useState } from "react";
import type { Quiz } from "@/lib/subjects";
import { getColor } from "@/lib/subjectColors";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { CloseIcon, QuizIcon, TrashIcon } from "@/components/icons";

export function QuizEditDialog({
  quiz: quizProp,
  subjectColorKey,
  onSave,
  onDelete,
  onClose,
}: {
  /** null while closed */
  quiz: Quiz | null;
  /** what the quiz shows when it has no colour of its own */
  subjectColorKey: string;
  onSave: (patch: Partial<Quiz>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [last, setLast] = useState(quizProp);
  if (quizProp && quizProp !== last) setLast(quizProp);
  const quiz = quizProp ?? last;
  const open = quizProp !== null;
  const visible = useEnterTransition(open);

  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState(subjectColorKey);
  const nameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keyed on the id, not the object: the quiz is a fresh object on every store
  // update, and reloading off that would wipe what is being typed.
  const openId = quizProp?.id ?? null;
  useEffect(() => {
    if (!openId || !quizProp) return;
    setName(quizProp.title);
    setColorKey(quizProp.colorKey ?? subjectColorKey);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Selected, since editing usually means replacing the generated name.
    requestAnimationFrame(() => nameRef.current?.select());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  if (!quiz) return null;

  const preview = getColor(colorKey);
  const trimmed = name.trim();

  function save() {
    if (!quiz) return;
    onSave({
      // A blank name would leave the card with nothing to tell it apart by.
      title: trimmed || quiz.title,
      // Left unset while it still matches the subject, so the quiz keeps
      // following the subject's colour if that is changed later.
      colorKey: colorKey === (quiz.colorKey ?? subjectColorKey) ? quiz.colorKey : colorKey,
    });
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
        aria-labelledby="quiz-edit-title"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
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
              <QuizIcon className="h-4 w-4" />
            </span>
            <h2 id="quiz-edit-title" className="font-bold text-ink">
              Edit quiz
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
            <span className="text-sm font-semibold text-ink">Quiz name</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={quiz.title}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-ink">Colour</p>
            <p className="mt-0.5 text-xs text-slate-500">Matches the subject unless you change it.</p>
            <ColorSwatches value={colorKey} onChange={setColorKey} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onDelete}
            className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" /> Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

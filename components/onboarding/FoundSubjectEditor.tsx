"use client";

// Putting right one subject the timetable reader got wrong. It takes over the
// whole popup, sliding in from the side, with Back returning to the list. Only what the reader produces is here — name, teacher and class
// times. Colour and exams live in the full subject editor once the notebook is
// open.

import { useEffect, useRef, useState } from "react";
import type { ExtractedSubject } from "@/lib/ai";
import { makeSlot } from "@/lib/subjects";
import type { ClassSlot } from "@/lib/schedule";
import { DaySelect, TimeSelect } from "@/components/ClassTimeSelects";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@/components/icons";

const INPUT =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function FoundSubjectEditor({
  subject,
  gradient,
  onSave,
  onCancel,
  onRemove,
}: {
  subject: ExtractedSubject;
  /** the monogram tile's colour, matching the row it replaces */
  gradient: string;
  onSave: (next: ExtractedSubject) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(subject.name);
  const [teacher, setTeacher] = useState(subject.teacher ?? "");
  const [classes, setClasses] = useState<ClassSlot[]>(subject.classes);

  // Only where there is a real keyboard: on a phone this would raise the
  // on-screen one over the pane while it is still sliding in.
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) nameRef.current?.focus();
  }, []);

  function patch(id: string, p: Partial<ClassSlot>) {
    setClasses((cur) => cur.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      ...subject,
      name: trimmed,
      teacher: teacher.trim() || undefined,
      classes: classes.filter((c) => c.start),
    });
  }

  return (
    <div
      className="pane-in-right flex min-h-0 flex-auto flex-col"
      // Stopped here, or it reaches the popup's own Escape and closes the lot.
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="-ml-2 inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-ink"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>

      <div className="mt-3 flex shrink-0 items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-base font-bold text-white`}
        >
          {(name.trim() || "?").charAt(0)}
        </span>
        <h2 className="text-lg font-bold text-ink">Edit subject</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Subject name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            ref={nameRef}
            className={`${INPUT} w-full`}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
            Teacher <span className="font-normal text-slate-500">optional</span>
          </span>
          <input
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className={`${INPUT} w-full`}
          />
        </label>
      </div>

      <p className="mt-4 text-xs font-semibold text-ink">Class times</p>
      <div className="mt-1.5 space-y-2">
        {classes.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <DaySelect
              value={c.day}
              onChange={(day) => patch(c.id, { day })}
              className="w-[4.75rem] shrink-0"
            />
            <TimeSelect
              label="Starts"
              value={c.start}
              onChange={(start) => patch(c.id, { start })}
              className="min-w-0 flex-1"
            />
            <span className="text-xs text-slate-500">to</span>
            <TimeSelect
              label="Ends"
              optional
              value={c.end ?? ""}
              onChange={(end) => patch(c.id, { end: end || undefined })}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => setClasses((cur) => cur.filter((x) => x.id !== c.id))}
              aria-label="Remove this class"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {classes.length === 0 && <p className="text-sm text-slate-500">No class times.</p>}
      </div>
      <button
        type="button"
        onClick={() => setClasses((cur) => [...cur, makeSlot(1, "09:00")])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
      >
        <PlusIcon className="h-4 w-4" /> Add class time
      </button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <TrashIcon className="h-4 w-4" /> Remove subject
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

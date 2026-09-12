"use client";

// Putting right one subject the timetable reader got wrong, in place in the
// popup's list. Only what the reader produces is here — name, teacher and class
// times. Colour and exams live in the full subject editor once the notebook is
// open.

import { useState } from "react";
import type { ExtractedSubject } from "@/lib/ai";
import { makeSlot } from "@/lib/subjects";
import { DAY_SHORT, type ClassSlot } from "@/lib/schedule";
import { PlusIcon, TrashIcon } from "@/components/icons";

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
      className="bg-slate-50 px-4 py-4"
      // Stopped here, or it reaches the popup's own Escape and closes the lot.
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-base font-bold text-white`}
        >
          {(name.trim() || "?").charAt(0)}
        </span>
        <p className="text-sm font-bold text-ink">Edit subject</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Subject name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
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
            <select
              value={c.day}
              onChange={(e) => patch(c.id, { day: Number(e.target.value) })}
              aria-label="Day"
              className={`${INPUT} w-[4.75rem] shrink-0 px-2`}
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
              onChange={(e) => patch(c.id, { start: e.target.value })}
              aria-label="Starts"
              className={`${INPUT} min-w-0 flex-1`}
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="time"
              value={c.end ?? ""}
              onChange={(e) => patch(c.id, { end: e.target.value || undefined })}
              aria-label="Ends"
              className={`${INPUT} min-w-0 flex-1`}
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
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
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
          >
            Cancel
          </button>
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

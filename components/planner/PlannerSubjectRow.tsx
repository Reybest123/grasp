"use client";

import { DateSelect } from "@/components/DateSelect";
import { CloseIcon, TrashIcon } from "@/components/icons";
import { ConfidencePicker } from "@/components/planner/ConfidencePicker";
import { getColor } from "@/lib/subjectColors";
import type { PlannerSubject } from "@/lib/studyPlanner";

/** One subject in the planner: its name, how sure the student is, and its next assessment. */
export function PlannerSubjectRow({
  subject,
  colorKey,
  onChange,
  onRemove,
}: {
  subject: PlannerSubject;
  colorKey: string;
  onChange: (patch: Partial<PlannerSubject>) => void;
  onRemove: () => void;
}) {
  const name = subject.name.trim();
  const called = name || "this subject";
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-sm font-bold text-white ${getColor(colorKey).gradient}`}
        >
          {name ? name[0].toUpperCase() : ""}
        </span>
        <input
          value={subject.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Subject, e.g. Biology"
          aria-label="Subject name"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${called}`}
          title="Remove"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
        >
          <TrashIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">How confident are you?</p>
          <ConfidencePicker
            value={subject.confidence}
            onChange={(confidence) => onChange({ confidence })}
            label={`How confident you are in ${called}`}
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-medium text-slate-600">Next assessment (optional)</p>
          <div className="flex items-center gap-2">
            <DateSelect
              value={subject.examDate}
              onChange={(examDate) => onChange({ examDate })}
              label={`Next assessment for ${called}`}
              className="min-w-0 flex-1"
            />
            {subject.examDate && (
              <button
                type="button"
                onClick={() => onChange({ examDate: "" })}
                aria-label={`Clear the assessment date for ${called}`}
                title="Clear date"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

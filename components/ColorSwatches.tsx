"use client";

import { SUBJECT_COLORS } from "@/lib/subjectColors";
import { CheckIcon } from "@/components/icons";

/** The colour picker shared by the new-subject, edit-subject and quiz dialogs. */
export function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2.5">
      {SUBJECT_COLORS.map((c) => (
        <button
          type="button"
          key={c.key}
          onClick={() => onChange(c.key)}
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.key}
          className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${
            c.gradient
          } text-white transition ${
            value === c.key ? "ring-2 ring-ink ring-offset-2" : "opacity-80 hover:opacity-100"
          }`}
        >
          {value === c.key && <CheckIcon className="h-4 w-4" />}
        </button>
      ))}
    </div>
  );
}

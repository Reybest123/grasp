"use client";

import { CONFIDENCE_LABEL, type Confidence } from "@/lib/studyPlanner";

const ORDER: Confidence[] = ["shaky", "ok", "confident"];

/** Three-way "how sure are you of this subject" choice, as a radio group. */
export function ConfidencePicker({
  value,
  onChange,
  label,
}: {
  value: Confidence;
  onChange: (value: Confidence) => void;
  /** accessible name, e.g. "How confident you are in Biology" */
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-1">
      {ORDER.map((c) => {
        const on = c === value;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              on ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
            }`}
          >
            {CONFIDENCE_LABEL[c]}
          </button>
        );
      })}
    </div>
  );
}

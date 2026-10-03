"use client";

import {
  bandOf,
  subjectUnderstanding,
  BAND_BAR,
  BAND_TEXT,
  type BandName,
  type Understanding,
} from "@/lib/stats";
import type { Subject } from "@/lib/subjects";

const VERDICT: Record<BandName, string> = {
  strong: "Strong grasp",
  fair: "Getting there",
  weak: "Worth another pass",
};

const marksLabel = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The overall score, then every quizzed subject weakest first. */
export function UnderstandingDetail({
  subjects,
  marks,
}: {
  subjects: Subject[];
  marks: Understanding | null;
}) {
  if (!marks) {
    return (
      <p className="text-sm text-slate-600">
        Finish a quiz in any subject and its score lands here, weighted by how many marks each
        quiz was worth.
      </p>
    );
  }

  const rows = subjects
    .map((s) => ({ subject: s, m: subjectUnderstanding(s) }))
    .filter((r): r is { subject: Subject; m: Understanding } => r.m !== null)
    .sort((a, b) => a.m.pct - b.m.pct);
  const shown = rows.slice(0, 4);
  const band = bandOf(marks.pct);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-sm font-semibold ${BAND_TEXT[band]}`}>{VERDICT[band]}</p>
        <p className="text-xs tabular-nums text-slate-500">
          {marksLabel(marks.got)} of {marksLabel(marks.total)} marks
        </p>
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        By subject, weakest first
      </p>
      <ul className="mt-2 space-y-2">
        {shown.map(({ subject, m }) => {
          const b = bandOf(m.pct);
          return (
            <li key={subject.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{subject.name}</span>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${BAND_BAR[b]}`}
                  style={{ width: `${Math.max(3, m.pct * 100)}%` }}
                />
              </span>
              <span className={`w-9 text-right font-semibold tabular-nums ${BAND_TEXT[b]}`}>
                {Math.round(m.pct * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && (
        <p className="mt-2 text-xs text-slate-400">+{rows.length - shown.length} more quizzed</p>
      )}
    </>
  );
}

"use client";

import { WEEK, type Coverage } from "@/lib/stats";

/** Which notebooks have gone quiet, so the tile names them rather than only counting. */
export function CoverageDetail({ coverage }: { coverage: Coverage }) {
  const shown = coverage.quiet.slice(0, 4);

  if (!coverage.quiet.length) {
    return (
      <p className="text-sm text-slate-600">
        Every notebook has had something written in it, or a quiz made from it, in the last {WEEK}{" "}
        days.
      </p>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold text-ink">{coverage.quiet.length} not opened this week</p>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Worth a look
      </p>
      <ul className="mt-2 space-y-1.5">
        {shown.map((subject) => (
          <li key={subject.id} className="truncate text-xs font-medium text-ink">
            {subject.name}
          </li>
        ))}
      </ul>
      {coverage.quiet.length > shown.length && (
        <p className="mt-2 text-xs text-slate-400">+{coverage.quiet.length - shown.length} more</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Counts a note edited or a quiz made. A notebook you only read does not register.
      </p>
    </>
  );
}

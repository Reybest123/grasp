"use client";

import {
  WEEK,
  bandOf,
  understanding,
  BAND_RING,
  type ActivityDay,
  type Coverage,
  type Understanding,
} from "@/lib/stats";
import type { Subject } from "@/lib/subjects";
import { StatTile } from "@/components/home/StatTile";
import { UnderstandingDetail } from "@/components/home/UnderstandingDetail";
import { StudyDetail } from "@/components/home/StudyDetail";
import { CoverageDetail } from "@/components/home/CoverageDetail";

/**
 * Three ratios across the top. Each tile opens a detail card on hover or focus
 * with what sits behind its number — the ring alone can only say how full.
 */
export function StatRow({
  subjects,
  week,
  coverage,
  streak,
}: {
  subjects: Subject[];
  week: ActivityDay[];
  coverage: Coverage;
  streak: number;
}) {
  const marks = understanding(subjects);

  return (
    <div className="mt-5 grid shrink-0 gap-4 sm:grid-cols-3">
      <StatTile
        value={marks ? marks.pct : 0}
        tone={marks ? BAND_RING[bandOf(marks.pct)] : "text-slate-200"}
        center={(t) => {
          const pct = Math.round(marks ? marks.pct * t * 100 : 0);
          return marks ? (
            <span
              className={`font-bold tabular-nums text-ink ${pct >= 100 ? "text-sm" : "text-lg"}`}
            >
              {pct}%
            </span>
          ) : (
            <span className="text-lg font-bold text-slate-300">&ndash;</span>
          );
        }}
        label="Understanding"
        sub={
          marks
            ? `across ${marks.quizzes} marked quiz${marks.quizzes === 1 ? "" : "zes"}`
            : "No quizzes marked yet"
        }
        detail={<UnderstandingDetail subjects={subjects} marks={marks} />}
      />

      <StatTile
        value={Math.min(streak, WEEK) / WEEK}
        tone={streak ? "text-brand-500" : "text-slate-200"}
        center={(t) => (
          <span
            className={`font-bold tabular-nums ${streak >= 1000 ? "text-xs" : streak >= 100 ? "text-sm" : "text-lg"} ${
              streak ? "text-ink" : "text-slate-300"
            }`}
          >
            {Math.round(streak * t)}
          </span>
        )}
        label="Study streak"
        sub={streak ? `day${streak === 1 ? "" : "s"} in a row with work on them` : "Write a note or make a quiz to start one"}
        detail={<StudyDetail week={week} streak={streak} />}
      />

      {/* Not a second copy of the quiz allowance — that is a meter now, and a
          figure shown twice on one screen is a figure nobody reads. This is the
          one thing neither of the other tiles notices: a notebook going
          untouched while the rest of the week looks healthy. */}
      <StatTile
        value={coverage.total ? coverage.touched / coverage.total : 0}
        tone={coverage.touched ? "text-brand-500" : "text-slate-200"}
        center={(t) => (
          <span
            className={`text-lg font-bold tabular-nums ${
              coverage.touched ? "text-ink" : "text-slate-300"
            }`}
          >
            {Math.round(coverage.touched * t)}
          </span>
        )}
        label="Notebooks touched"
        sub={
          coverage.touched
            ? `of ${coverage.total} in the last ${WEEK} days`
            : `None of your ${coverage.total} opened this week`
        }
        detail={<CoverageDetail coverage={coverage} />}
      />
    </div>
  );
}

"use client";

import { DAY_SHORT } from "@/lib/schedule";
import type { ActivityDay } from "@/lib/stats";

/** Which of the seven days had work on them, and the run leading up to today. */
export function StudyDetail({ week, streak }: { week: ActivityDay[]; streak: number }) {
  return (
    <>
      <div className="flex justify-between gap-1">
        {week.map((d) => (
          <div key={d.date.toISOString()} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-7 w-7 rounded-full ${d.total ? "bg-brand-500" : "bg-slate-100"} ${
                d.today ? "ring-2 ring-brand-200 ring-offset-1" : ""
              }`}
              title={`${d.total} item${d.total === 1 ? "" : "s"}`}
            />
            <span
              className={`text-[11px] font-medium ${d.today ? "text-brand-700" : "text-slate-400"}`}
            >
              {DAY_SHORT[d.date.getDay()]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {streak === 0
          ? "No streak going. Open any notebook to start one."
          : `${streak}-day streak. Keep it going.`}
      </p>
    </>
  );
}

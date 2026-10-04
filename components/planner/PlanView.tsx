"use client";

import { CalendarIcon, PrinterIcon } from "@/components/icons";
import { getColor } from "@/lib/subjectColors";
import {
  CONFIDENCE_LABEL,
  DAYS,
  daysUntil,
  hoursLabel,
  type Plan,
  type PlannerSubject,
} from "@/lib/studyPlanner";

function untilLabel(days: number): string {
  if (days < 0) return "has passed";
  if (days === 0) return "is today";
  if (days === 1) return "is tomorrow";
  return `is in ${days} days`;
}

/** The finished week: a column per day, what each subject got and why, and a print button. */
export function PlanView({
  plan,
  subjects,
  colorOf,
  blockMinutes,
  today,
}: {
  plan: Plan;
  /** Named subjects only. */
  subjects: PlannerSubject[];
  colorOf: (id: string) => string;
  blockMinutes: number;
  today: Date;
}) {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const upcoming = subjects
    .map((s) => ({ s, days: daysUntil(s.examDate, today) }))
    .filter((x): x is { s: PlannerSubject; days: number } => x.days !== null && x.days >= 0)
    .sort((a, b) => a.days - b.days);

  return (
    <section aria-labelledby="plan-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="plan-heading" className="text-2xl font-bold text-ink">
            Your study week
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {plan.totalBlocks} {plan.totalBlocks === 1 ? "block" : "blocks"} of {blockMinutes} minutes,{" "}
            {hoursLabel(plan.totalBlocks * blockMinutes)} in all
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 print:hidden"
        >
          <PrinterIcon className="h-[18px] w-[18px]" />
          Print or save as PDF
        </button>
      </div>

      <ol className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-7 print:grid-cols-7 print:gap-2">
        {plan.days.map((cells, day) => (
          <li
            key={DAYS[day]}
            className="rounded-2xl border border-slate-200 bg-white p-3 print:break-inside-avoid print:rounded-lg print:p-2"
          >
            <p className="text-sm font-semibold text-ink">{DAYS[day]}</p>
            {cells.length ? (
              <ol className="mt-2 space-y-2">
                {cells.map((cell, k) => {
                  if (cell.kind === "catchup") {
                    return (
                      <li
                        key={k}
                        className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
                      >
                        Catch-up
                      </li>
                    );
                  }
                  const subject = byId.get(cell.subjectId);
                  return (
                    <li
                      key={k}
                      className={`rounded-xl px-3 py-2 text-sm font-medium [print-color-adjust:exact] ${
                        getColor(colorOf(cell.subjectId)).tint
                      }`}
                    >
                      <span className="block leading-snug [overflow-wrap:anywhere]">{subject?.name.trim()}</span>
                      <span className="text-xs font-normal opacity-80">{blockMinutes} min</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Free</p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 print:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 print:p-3">
          <h3 className="text-base font-bold text-ink">Why each subject got its blocks</h3>
          <ul className="mt-3 space-y-2.5">
            {subjects.map((s) => {
              const n = plan.counts[s.id] ?? 0;
              const days = daysUntil(s.examDate, today);
              return (
                <li key={s.id} className="flex items-start gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full bg-gradient-to-br [print-color-adjust:exact] ${getColor(colorOf(s.id)).gradient}`}
                  />
                  <span className="text-slate-700">
                    <span className="font-semibold text-ink">{s.name.trim()}</span>: {n}{" "}
                    {n === 1 ? "block" : "blocks"}. You marked it{" "}
                    {CONFIDENCE_LABEL[s.confidence].toLowerCase()}
                    {days !== null && days >= 0 ? `, and its assessment ${untilLabel(days)}` : ""}.
                    {n === 0 ? " There were not enough blocks for every subject this week." : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 print:p-3">
          <h3 className="text-base font-bold text-ink">Coming up</h3>
          {upcoming.length ? (
            <ul className="mt-3 space-y-2.5">
              {upcoming.map(({ s, days }) => (
                <li key={s.id} className="flex items-center gap-3 text-sm text-slate-700">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>
                    <span className="font-semibold text-ink">{s.name.trim()}</span> {untilLabel(days)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Add an assessment date to a subject and it will show here, and get more blocks as it gets close.
            </p>
          )}
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Give every block a job before you start it. &ldquo;Ten questions on quadratics, then mark
            them&rdquo; is easier to finish than &ldquo;Maths&rdquo;.
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

// Visitors per day for /admin/analytics. One series, so no legend: the title
// names it. Hovering or focusing a day shows its visitors and page views.

import { useState } from "react";

type Day = { day: string; views: number; visitors: number };

const label = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

export function DailyChart({ daily }: { daily: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const busiest = Math.max(0, ...daily.map((d) => d.visitors));
  const top = Math.max(busiest, 1);
  const shown = active === null ? null : daily[active];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-ink">Visitors per day</h3>
        <p className="text-xs text-slate-600 tabular-nums" aria-live="polite">
          {shown
            ? `${label(shown.day)}: ${shown.visitors} visitors, ${shown.views} views`
            : `Busiest day: ${busiest} visitors`}
        </p>
      </div>
      <div
        className="relative mt-4 flex h-40 items-end gap-[2px] border-b border-slate-200"
        onMouseLeave={() => setActive(null)}
      >
        {daily.map((d, i) => (
          <button
            key={d.day}
            type="button"
            aria-label={`${label(d.day)}: ${d.visitors} visitors, ${d.views} views`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group flex h-full min-w-0 flex-1 items-end outline-none"
          >
            <span
              className={`block w-full rounded-t-[4px] transition-colors ${
                active === i ? "bg-brand-600" : "bg-brand-400 group-focus-visible:bg-brand-600"
              }`}
              style={{ height: d.visitors > 0 ? `${Math.max((d.visitors / top) * 100, 2)}%` : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{label(daily[0].day)}</span>
        <span>{label(daily[daily.length - 1].day)}</span>
      </div>
    </div>
  );
}

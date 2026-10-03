"use client";

import Link from "next/link";
import type { Allowance } from "@/lib/ai";
import { Skeleton } from "@/components/Skeleton";
import { ArrowRightIcon } from "@/components/icons";

export type MeterRow = {
  label: string;
  /** what the allowance is actually spent on; shown on the card's shared line on hover */
  hint: string;
  allowance: Allowance | undefined;
  /** `coarse` drops the seconds off a duration — a week's allowance, not a countdown */
  format: (n: number, coarse: boolean) => string;
};

/** Never rounds up to 100 while anything is left: 100% means none left. */
function usedPercent(used: number, limit: number): number {
  if (used >= limit) return 100;
  return Math.min(99, Math.round((used / limit) * 100));
}

export function Meter({
  row,
  grown,
  index,
  dimmed,
  active,
  onHover,
  onLeave,
}: {
  row: MeterRow;
  grown: boolean;
  index: number;
  dimmed: boolean;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const { label, allowance, format } = row;

  if (!allowance) {
    return (
      <div className="flex min-h-fit flex-1 flex-col justify-center gap-2 px-2 py-2.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    );
  }

  const { used, limit } = allowance;
  const share = limit ? Math.min(1, used / limit) : 0;
  // Read the other way up from the quiz score ring: a full allowance is the bad
  // end, so it warms towards red as it fills rather than cooling to green.
  const tone = share >= 1 ? "bg-red-500" : share >= 0.66 ? "bg-amber-500" : "bg-brand-500";

  return (
    <Link
      href="/plans"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className={`flex min-h-fit flex-1 flex-col justify-center rounded-xl px-2 py-2.5 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-brand-200 ${
        active ? "bg-slate-50" : ""
      } ${dimmed ? "opacity-40" : "opacity-100"}`}
    >
      {/*
        One line of figures rather than a count above the bar and a second line
        under it. The share spent and what is left are the two things worth
        reading; the raw total they are out of is a click away on /plans, and
        the bar is already drawing the proportion. Three lines a row did not
        leave four allowances room to sit on a laptop without the card
        scrolling, and a meter behind a scroll is one the student never sees.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-ink">{label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 text-sm tabular-nums text-slate-500">
          {limit === null ? (
            <>
              {format(used, true)} used · <span className="font-semibold text-ink">Unlimited</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{usedPercent(used, limit)}% used</span> ·{" "}
              {used >= limit ? "none left" : `${format(limit - used, true)} left`}
            </>
          )}
          {/* The row goes somewhere; nothing else on the card would say so. */}
          <ArrowRightIcon
            aria-hidden="true"
            className={`h-3.5 w-3.5 self-center transition-opacity duration-200 ${
              active ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>
      </div>

      {/* shrink-0, with min-h-fit on the row: as a shrinkable child of a flex
          column that could shrink, the bar was the thing the browser squeezed
          away on any window the card did not fit — leaving the card with no
          bars at all and nothing to say why. */}
      <span className="mt-2 block h-2.5 shrink-0 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${tone}`}
          style={{
            width: `${grown ? share * 100 : 0}%`,
            transitionDelay: grown ? `${index * 90}ms` : "0ms",
          }}
        />
      </span>
    </Link>
  );
}

"use client";

import { StatRing } from "@/components/StatRing";
import { ChevronDownIcon } from "@/components/icons";

export function StatTile({
  value,
  tone,
  center,
  label,
  sub,
  detail,
}: {
  value: number;
  tone: string;
  center: (t: number) => React.ReactNode;
  label: string;
  sub: string;
  detail: React.ReactNode;
}) {
  return (
    // Raised above the chart while open: the lift on hover makes the tile its
    // own stacking context, and without the z-index the chart card that follows
    // it in the DOM would paint over the detail card.
    <div
      tabIndex={0}
      className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition duration-200 focus-within:z-30 hover:z-30 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <StatRing
        value={value}
        size={64}
        stroke={7}
        tone={tone}
        className="transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110"
      >
        {center}
      </StatRing>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-4 text-slate-500">{sub}</p>
      </div>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-300 transition duration-200 group-hover:rotate-180 group-hover:text-slate-500 group-focus-visible:rotate-180" />

      {/* The `before:` strip bridges the gap under the tile, so moving the
          pointer down into the card does not close it on the way. */}
      <div
        role="tooltip"
        className="invisible absolute inset-x-0 top-full mt-2 translate-y-1 rounded-2xl border border-slate-200 bg-white p-4 opacity-0 shadow-lift transition duration-150 before:absolute before:inset-x-0 before:-top-2 before:h-2 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
      >
        {detail}
      </div>
    </div>
  );
}

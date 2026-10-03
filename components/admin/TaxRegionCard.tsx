// One region's card in the tax section: red once anyone there has paid.

import type { TaxRegion } from "@/lib/taxWatch";
import { dateLabel } from "@/components/admin/TaxWatchView";

export function TaxRegionCard({ title, region, todo }: { title: string; region: TaxRegion; todo: string }) {
  const due = region.payments > 0;
  return (
    <section
      className={`rounded-2xl border p-5 ${due ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}
    >
      <p className="text-sm text-slate-600">{title}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${due ? "text-red-800" : "text-ink"}`}>
        {due ? "Registration needed" : "Nothing to do yet"}
      </p>
      <p className="mt-2 text-sm text-slate-700">
        {due && region.firstAt
          ? `${region.payments} payment${region.payments === 1 ? "" : "s"} since ${dateLabel(region.firstAt)} (${region.countries.join(", ")}). ${todo}`
          : "Nobody here has paid yet."}
      </p>
    </section>
  );
}

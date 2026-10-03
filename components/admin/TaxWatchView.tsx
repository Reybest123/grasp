// The tax section of /admin/analytics (lib/taxWatch.ts): whether anyone in the
// EU or the UK has paid yet, since VAT there is owed from the first sale, and
// every country payments have come from.

import { formatMoney, isCurrency } from "@/lib/currency";
import type { TaxWatch } from "@/lib/taxWatch";
import { TaxRegionCard } from "@/components/admin/TaxRegionCard";

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

const money = (amount: number, currency: string) =>
  isCurrency(currency) ? formatMoney(amount, currency) : `${amount.toFixed(2)} ${currency.toUpperCase()}`;

export function TaxWatchView({ tax, failed }: { tax: TaxWatch | null; failed: boolean }) {
  return (
    <section id="tax">
      <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Tax, where payments come from
      </h2>
      {failed ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Stripe could not be reached, so the tax check could not run. Refresh to try again.
        </p>
      ) : !tax ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No Stripe key is set here, so there are no payments to check.
        </p>
      ) : (
        <>
          {!tax.live && (
            <p className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              This reads Stripe in test mode, so these are test payments, not real ones. Set
              STRIPE_REPORT_KEY to a live key on this service to see real payments.
            </p>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <TaxRegionCard
              title="EU VAT"
              region={tax.eu}
              todo="Register for the EU's non-Union OSS scheme (one registration covers every EU country), then add it in Stripe Tax and switch STRIPE_TAX on."
            />
            <TaxRegionCard
              title="UK VAT"
              region={tax.uk}
              todo="Register for UK VAT with HMRC, then add it in Stripe Tax and switch STRIPE_TAX on."
            />
          </div>

          <section className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-ink">Every country, all time</h3>
            <p className="mt-1 text-xs text-slate-500">
              By the card&apos;s country, refunds left out. Other countries only need registering past a
              threshold, which Stripe Tax watches once it is on.
              {tax.truncated && " Only the newest 5,000 payments were read."}
            </p>
            {tax.countries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No payments yet.</p>
            ) : (
              <table className="mt-3 w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">Country</th>
                    <th className="pb-2 text-right font-medium">Payments</th>
                    <th className="pb-2 text-right font-medium">Taken</th>
                    <th className="pb-2 text-right font-medium">First</th>
                  </tr>
                </thead>
                <tbody>
                  {tax.countries.map((row) => (
                    <tr key={row.code} className="border-t border-slate-100">
                      <td className="py-2 pr-2 text-ink">{row.name}</td>
                      <td className="py-2 text-right tabular-nums text-slate-700">{row.payments}</td>
                      <td className="py-2 text-right tabular-nums text-slate-700">
                        {row.amounts.map((a) => money(a.amount, a.currency)).join(", ")}
                      </td>
                      <td className="py-2 text-right text-slate-700">{dateLabel(row.firstAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </section>
  );
}

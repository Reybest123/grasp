// One plan, as a card. Used by the landing page's pricing (information only),
// by onboarding's plan step, which puts its button in `children`, and by /plans.
// Every figure comes from lib/plan.ts, so they can never show different plans.

import {
  BILLING_PERIOD,
  PLAN_LABEL,
  PLAN_PERKS,
  PLAN_TAGLINE,
  FREE_PERKS,
  FREE_TRIAL_DAYS,
  planPrice,
  type Plan,
} from "@/lib/plan";
import { type Currency } from "@/lib/currency";
import { CheckIcon } from "@/components/icons";

export function PlanCard({
  plan,
  currency,
  compact = false,
  children,
}: {
  /** "free" draws the free trial the same way: no price, its own perks */
  plan: Plan;
  /**
   * What the student is charged in (lib/currency.ts). Passed in rather than
   * read from context so this stays usable from the landing page, which is a
   * server component and works it out from the request's own headers.
   */
  currency: Currency;
  /** tighter spacing, for onboarding's plan step, which has to fit the screen */
  compact?: boolean;
  children?: React.ReactNode;
}) {
  // Pro is the plan most students need, so it is the one picked out.
  const featured = plan === "pro";
  const free = plan === "free";
  const price = free ? "Free" : planPrice(plan, currency);
  const period = free ? `for ${FREE_TRIAL_DAYS} days` : `/ ${BILLING_PERIOD}`;
  const tagline = free ? "Try Grasp for a week. No card needed." : PLAN_TAGLINE[plan];
  const perks = free ? FREE_PERKS : PLAN_PERKS[plan];
  // A bare "$" reads as local dollars in Canada, New Zealand, Singapore and the
  // rest, so a USD price says which dollars it is.
  const usdNote = !free && currency === "usd" && (
    <p className="mt-1 text-xs text-slate-500">US dollars (USD)</p>
  );

  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-white text-left ${
        compact ? "p-6" : "p-8"
      } ${featured ? "border-brand-300 shadow-lift" : "border-slate-200 shadow-ring"}`}
    >
      {compact ? (
        // The price beside the name rather than under it, which is most of
        // what lets onboarding's plan step fit a laptop screen.
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-ink">{PLAN_LABEL[plan]}</h3>
            <p className="mt-1 text-sm text-slate-500">{tagline}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-extrabold tracking-tight text-ink">
                {price}
              </span>
              <span className="text-xs text-slate-500">{period}</span>
            </div>
            {usdNote}
          </div>
        </div>
      ) : (
        <>
          <h3 className="font-display text-lg font-bold text-ink">{PLAN_LABEL[plan]}</h3>
          <p className="mt-1 text-sm text-slate-500">{tagline}</p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl font-extrabold tracking-tight text-ink">
              {price}
            </span>
            <span className="text-sm text-slate-500">{period}</span>
          </div>
          {usdNote}
        </>
      )}
      <ul
        className={`flex-1 border-t border-slate-200 ${
          compact ? "mt-4 space-y-2 pt-4" : "mt-7 space-y-3 pt-7"
        }`}
      >
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {perk}
          </li>
        ))}
      </ul>
      {children && <div className={compact ? "mt-5" : "mt-8"}>{children}</div>}
    </div>
  );
}

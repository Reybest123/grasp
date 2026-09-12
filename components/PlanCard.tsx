// One plan, as a card. Used by the landing page's pricing (information only) and
// by onboarding's plan step, which puts its button in `children`. Every figure
// comes from lib/plan.ts, so the two can never show different plans.

import {
  PLAN_LABEL,
  PLAN_PERKS,
  PLAN_PRICE,
  PLAN_TAGLINE,
  TRIAL_DAYS,
  type Plan,
} from "@/lib/plan";
import { CheckIcon } from "@/components/icons";

export function PlanCard({ plan, children }: { plan: Plan; children?: React.ReactNode }) {
  // Pro is the plan with the trial, so it is the one a new student can start
  // today, and the one picked out.
  const featured = plan === "pro";

  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-white p-8 text-left ${
        featured ? "border-brand-300 shadow-lift" : "border-slate-200 shadow-ring"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
          {TRIAL_DAYS}-day free trial
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-ink">{PLAN_LABEL[plan]}</h3>
      <p className="mt-1 text-sm text-slate-500">{PLAN_TAGLINE[plan]}</p>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="font-display text-5xl font-extrabold tracking-tight text-ink">
          {PLAN_PRICE[plan]}
        </span>
        <span className="text-sm text-slate-500">/ month</span>
      </div>
      <ul className="mt-7 flex-1 space-y-3 border-t border-slate-200 pt-7">
        {PLAN_PERKS[plan].map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {perk}
          </li>
        ))}
      </ul>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

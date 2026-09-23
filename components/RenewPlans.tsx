"use client";

// What every page in the shell but Settings shows once a plan has ended
// (AppShell). The header and rail stay, so logging out and deleting the account
// from Settings work as normal. Choosing a plan always opens a fresh Stripe
// Checkout Session, since Stripe needs a card again for a subscription that no
// longer exists, and no trial is offered: the account has already had its one.

import { useEffect, useState } from "react";
import { PlanCard } from "@/components/PlanCard";
import { ErrorNote } from "@/components/ErrorNote";
import { ArrowRightIcon } from "@/components/icons";
import { useCurrency } from "@/lib/currencyStore";
import { PLANS, PLAN_LABEL, type Plan } from "@/lib/plan";

export function RenewPlans() {
  const currency = useCurrency();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  // Back from Stripe can restore this page from the back/forward cache
  // mid-redirect, with the buttons still disabled.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function choose(plan: Plan) {
    setBusy(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, returnTo: "renew" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.assign(typeof data.url === "string" ? data.url : "/home");
        return;
      }
      setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setBusy(null);
  }

  return (
    <section className="px-6 py-10 sm:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your plan has ended</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Choose a plan to keep using Grasp. Your subjects, notes and quizzes are all still here.
        </p>
      </div>

      {error && <ErrorNote message={error} className="mx-auto mt-5 max-w-4xl" />}

      <div className="mx-auto mt-7 grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard key={plan} plan={plan} currency={currency} compact trialBadge={false}>
            <button
              type="button"
              onClick={() => choose(plan)}
              disabled={busy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600"
            >
              {busy === plan ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Taking you to checkout…
                </>
              ) : (
                <>
                  Choose {PLAN_LABEL[plan]}
                  <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </PlanCard>
        ))}
      </div>
    </section>
  );
}

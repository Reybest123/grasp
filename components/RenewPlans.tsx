"use client";

// Where an account whose subscription has ended is held (lib/session.ts's
// guardAppPage). Nothing else in Grasp opens until a plan is chosen again,
// which always goes through a fresh Stripe Checkout Session: Stripe needs a
// card again for a subscription that no longer exists. No trial is offered,
// since the account has already had its one.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PlanCard } from "@/components/PlanCard";
import { ErrorNote } from "@/components/ErrorNote";
import { RenewDelete } from "@/components/RenewDelete";
import { ArrowRightIcon } from "@/components/icons";
import { useCurrency } from "@/lib/currencyStore";
import { PLANS, PLAN_LABEL, type Plan } from "@/lib/plan";

export function RenewPlans() {
  const router = useRouter();
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
      if (res.ok && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      if (res.ok) {
        router.replace("/home");
        return;
      }
      setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setBusy(null);
  }

  async function logOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The destination is the same either way.
    }
    router.replace("/");
  }

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="ruled fade-out-b pointer-events-none absolute inset-0 opacity-60" />

      <header className="relative mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-4 px-6 py-4">
        <Logo />
        <button
          type="button"
          onClick={logOut}
          className="text-sm font-semibold text-slate-500 transition hover:text-ink"
        >
          Log out
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <section className="mx-auto max-w-4xl px-6 py-6">
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

          <RenewDelete />
        </section>
      </div>
    </main>
  );
}

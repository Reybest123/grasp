"use client";

// Plans: which plan the student is on, cancelling or resuming it, and both plans
// side by side. Laid out like Settings. There is no billing yet, so neither plan
// can be switched to here; the buttons say so rather than disappearing.

import { useState } from "react";
import { useProfile } from "@/lib/profileStore";
import { useNow } from "@/lib/subjectsStore";
import { usePlanStatus } from "@/lib/usePlanStatus";
import {
  BILLING_PERIOD,
  DEFAULT_PLAN,
  PLANS,
  PLAN_AVAILABLE,
  PLAN_LABEL,
  PLAN_PRICE,
  planName,
  trialDaysLeft,
} from "@/lib/plan";
import { PlanCard } from "@/components/PlanCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorNote } from "@/components/ErrorNote";
import { Skeleton } from "@/components/Skeleton";

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

export default function PlansPage() {
  const { ready } = useProfile();
  const status = usePlanStatus();

  return (
    <section className="px-6 py-10 sm:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Plans</h1>
      </div>

      {!ready || !status.loaded ? (
        <PlansSkeleton />
      ) : (
        <>
          <CurrentPlan status={status} />

          <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-slate-500">
            All plans
          </h2>
          <AllPlans />
        </>
      )}

      {/* New tab: /legal sits outside the route group, and leaving for it in
          place would end a live recording. */}
      <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
        Billing is not set up yet, so nothing is charged.{" "}
        <a
          href="/legal/terms#refunds"
          target="_blank"
          rel="noopener"
          className="font-semibold text-slate-600 transition hover:text-ink"
        >
          Cancellation and refund policy
        </a>
      </p>
    </section>
  );
}

function CurrentPlan({ status }: { status: ReturnType<typeof usePlanStatus> }) {
  const { profile } = useProfile();
  const now = useNow();
  const plan = profile.plan ?? DEFAULT_PLAN;
  const trialLeft = now ? trialDaysLeft(profile.trialEndsAt, now) : null;
  const trialEnds = profile.trialEndsAt
    ? new Date(profile.trialEndsAt).toLocaleDateString(undefined, LONG_DATE)
    : null;
  const cancelledOn = status.cancelledAt
    ? new Date(status.cancelledAt).toLocaleDateString(undefined, LONG_DATE)
    : null;

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(cancelled: boolean) {
    setConfirming(false);
    setBusy(true);
    setError("");
    const failed = await status.setCancelled(cancelled);
    setBusy(false);
    if (failed) setError(failed);
  }

  const accessUntil = trialEnds ? `until ${trialEnds}` : "until the end of your current billing period";

  return (
    <>
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-500">Your plan</h2>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {(status.error || error) && <ErrorNote message={error || status.error} className="mb-5" />}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-lg font-bold text-ink">{planName(plan, profile.trialEndsAt)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {!trialEnds
                ? `${PLAN_PRICE[plan]} a ${BILLING_PERIOD}.`
                : trialLeft === 0
                  ? `Your free trial ended on ${trialEnds}.`
                  : `Your free trial ends on ${trialEnds}${
                      trialLeft !== null
                        ? `, ${trialLeft} day${trialLeft === 1 ? "" : "s"} from now`
                        : ""
                    }.`}
            </p>
            {profile.unlimited && (
              <p className="mt-2 text-xs font-semibold text-ink">
                Unlimited mode is on in this browser, so no limits apply.
              </p>
            )}
          </div>

          {cancelledOn ? (
            <button
              onClick={() => change(false)}
              disabled={busy}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Resuming…" : "Resume plan"}
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Cancel plan"}
            </button>
          )}
        </div>

        {cancelledOn && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You cancelled your plan on {cancelledOn}. You keep {PLAN_LABEL[plan]} {accessUntil}, and
            it will not renew. You can now delete your account from Settings.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Cancel your ${PLAN_LABEL[plan]} plan?`}
        body={`You keep ${PLAN_LABEL[plan]} ${accessUntil}, and it will not renew after that. You can resume it any time before then.`}
        confirmLabel="Cancel plan"
        cancelLabel="Keep my plan"
        onConfirm={() => change(true)}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function AllPlans() {
  const { profile } = useProfile();
  const current = profile.plan ?? DEFAULT_PLAN;

  return (
    <div className="mt-3 grid max-w-4xl gap-6 sm:grid-cols-2">
      {PLANS.map((plan) => {
        const isCurrent = plan === current;
        return (
          // No trial badge here, ever. Every account that can reach this page
          // has already been offered the trial at the end of onboarding and
          // taken or declined it, and a trial is once per student — so
          // advertising it back to them is an offer Grasp would not honour.
          <PlanCard key={plan} plan={plan} compact trialBadge={false}>
            <button
              disabled
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed ${
                isCurrent ? "bg-ink text-white" : "border border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {isCurrent
                ? "Your current plan"
                : PLAN_AVAILABLE[plan]
                  ? "Available once billing is set up"
                  : "Coming soon"}
            </button>
          </PlanCard>
        );
      })}
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <p className="sr-only" role="status">
        Loading plans
      </p>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-28 w-full rounded-2xl" />
      <Skeleton className="mt-10 h-4 w-20" />
      <div className="mt-3 grid max-w-4xl gap-6 sm:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

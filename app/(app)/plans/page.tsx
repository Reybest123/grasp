"use client";

// Plans: which plan the student is on, cancelling or resuming it, and both plans
// side by side. Laid out like Settings. There is no billing yet, so neither plan
// can be switched to here; the buttons say so rather than disappearing.

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profileStore";
import { useNow } from "@/lib/subjectsStore";
import { usePlanStatus } from "@/lib/usePlanStatus";
import { fetchUsage, type Allowance, type Usage } from "@/lib/ai";
import {
  BILLING_PERIOD,
  DEFAULT_PLAN,
  formatCount,
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
            This week
          </h2>
          <ThisWeek />

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

/**
 * Where the student stands against each weekly allowance. AI tokens lead, since
 * they are spent on the everyday features and are the one a student cannot
 * count for themselves.
 */
function ThisWeek() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchUsage().then((u) => {
      if (cancelled) return;
      if (u) setUsage(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <ErrorNote
        message="Grasp could not load this week's usage. Refresh to try again."
        className="mt-3"
      />
    );
  }

  const rows: { label: string; hint: string; allowance: Allowance | undefined }[] = [
    {
      label: "AI tokens",
      hint: "Explain, refine, enhance, generate, and explaining a quiz answer. Each uses tokens by how much work it takes.",
      allowance: usage?.tokens,
    },
    { label: "Quizzes", hint: "Generated quizzes.", allowance: usage?.quizzes },
    { label: "Lecture recordings", hint: "Recordings started.", allowance: usage?.recordings },
    {
      label: "Resource Bank documents",
      hint: "Documents read into any subject.",
      allowance: usage?.resources,
    },
  ];

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <Meter key={row.label} {...row} />
      ))}
    </div>
  );
}

function Meter({
  label,
  hint,
  allowance,
}: {
  label: string;
  hint: string;
  allowance: Allowance | undefined;
}) {
  if (!allowance) return <Skeleton className="h-[108px] rounded-2xl" />;

  const { used, limit } = allowance;
  const share = limit ? Math.min(1, used / limit) : 0;
  // Warms as it fills, like the dashboard's allowance ring: full is the bad end.
  const tone = share >= 1 ? "bg-red-500" : share >= 0.66 ? "bg-amber-500" : "bg-brand-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-sm tabular-nums text-slate-600">
          {limit === null ? (
            `${formatCount(used)} used · Unlimited`
          ) : (
            <>
              <span className="font-semibold text-ink">{formatCount(Math.min(used, limit))}</span> of{" "}
              {formatCount(limit)}
            </>
          )}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${tone}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs text-slate-500">{hint}</p>
    </div>
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
          <PlanCard key={plan} plan={plan} compact>
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

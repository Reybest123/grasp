"use client";

// Plans: which plan the student is on, cancelling or resuming it, and both
// plans side by side. Laid out like Settings. Real Stripe billing sits behind
// every button here (lib/billing.ts): switching between an active Pro and Max
// updates the existing subscription directly, and choosing a plan with no
// active subscription (never subscribed, or one that has fully ended) opens
// Stripe Checkout to take a card.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/lib/profileStore";
import { useNow } from "@/lib/subjectsStore";
import { usePlanStatus } from "@/lib/usePlanStatus";
import { BILLING_PERIOD, DEFAULT_PLAN, PLANS, PLAN_LABEL, planName, planPrice, trialDaysLeft, type Plan } from "@/lib/plan";
import { PlanCard } from "@/components/PlanCard";
import { useCurrency } from "@/lib/currencyStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorNote } from "@/components/ErrorNote";
import { Skeleton } from "@/components/Skeleton";
import { scrollToElement } from "@/lib/scrollTo";

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

// Settings sends a student here with `?cancel=1` when they try to delete an
// account whose plan is still running. Cancel plan is the last thing on the
// page, so arriving at the top leaves them to find it themselves.
const CANCEL_ANCHOR = "your-plan";

/**
 * Only rendered once the page has its data, so the section it scrolls to is
 * already in the DOM — a hash in the URL would fire against the skeleton and
 * find nothing. The flag is dropped afterwards so a refresh does not re-scroll.
 *
 * `behavior: "instant"`, for the same reason the quiz views use it: `html`
 * carries `scroll-behavior: smooth` globally, and inheriting it here left the
 * page at scrollY 0 with the section still below the fold — measured, the
 * animated scroll never lands, while instant moves the full 300px. It is also
 * the right feel regardless, since the student is arriving on a new page and
 * should simply find it already open at the part they were sent for.
 */
function CancelScroll() {
  const params = useSearchParams();
  const wanted = params.get("cancel") === "1";

  useEffect(() => {
    if (!wanted) return;
    // `history.replaceState`, not `router.replace`: the router's navigation put
    // the page back at the top even with `scroll: false`, landing after the
    // scroll and undoing it. Nothing re-reads this flag, so the URL is all that
    // needs to change, and doing it this way touches nothing else.
    // Synchronously, not in a `requestAnimationFrame`: this sits inside a
    // Suspense boundary that unmounts and remounts as the page settles, and the
    // cleanup that ran with it cancelled the frame before it ever fired —
    // measured, the scroll simply never happened. The effect only runs once the
    // page has its data, so the section is already in the DOM to scroll to.
    //
    // Smooth, not instant (2026-09-20, at the user's request): arriving from
    // Settings' Delete account notice and being teleported to the bottom of a
    // page you did not choose to scroll gives no sense of having moved, or of
    // what you moved past. The note that used to sit here claiming a smooth
    // scroll would not land was mistaken — it came from measuring through the
    // browser-automation tab, which throttles the animation while it evaluates.
    const target = document.getElementById(CANCEL_ANCHOR);
    if (target) scrollToElement(target, "center");
    window.history.replaceState(window.history.state, "", "/plans");
  }, [wanted]);

  return null;
}

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
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-500">
            All plans
          </h2>
          <AllPlans status={status} />

          <CurrentPlan status={status} heading="mt-10" />

          {/* Its own Suspense boundary, since reading the URL's query can suspend. */}
          <Suspense fallback={null}>
            <CancelScroll />
          </Suspense>
        </>
      )}

      {/* New tab: /legal sits outside the route group, and leaving for it in
          place would end a live recording. */}
      <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
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

function CurrentPlan({
  status,
  heading = "mt-8",
}: {
  status: ReturnType<typeof usePlanStatus>;
  heading?: string;
}) {
  const { profile } = useProfile();
  const currency = useCurrency();
  const now = useNow();
  const plan = profile.plan ?? DEFAULT_PLAN;
  const trialLeft = now ? trialDaysLeft(profile.trialEndsAt, now) : null;
  const trialEnds = profile.trialEndsAt
    ? new Date(profile.trialEndsAt).toLocaleDateString(undefined, LONG_DATE)
    : null;
  const cancelledOn = status.cancelledAt
    ? new Date(status.cancelledAt).toLocaleDateString(undefined, LONG_DATE)
    : null;
  const renewsOn = status.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString(undefined, LONG_DATE)
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

  const accessUntil = trialEnds
    ? `until ${trialEnds}`
    : renewsOn
      ? `until ${renewsOn}`
      : "until the end of your current billing period";

  if (status.expired) {
    return (
      <>
        <h2
          id={CANCEL_ANCHOR}
          className={`${heading} text-sm font-bold uppercase tracking-wide text-slate-500`}
        >
          Your plan
        </h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {status.error && <ErrorNote message={status.error} className="mb-5" />}
          <p className="text-lg font-bold text-ink">Your plan has ended</p>
          <p className="mt-1 text-sm text-slate-500">
            Choose a plan above to subscribe again — you will need to add a card.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h2
        id={CANCEL_ANCHOR}
        className={`${heading} text-sm font-bold uppercase tracking-wide text-slate-500`}
      >
        Your plan
      </h2>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {(status.error || error) && <ErrorNote message={error || status.error} className="mb-5" />}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-lg font-bold text-ink">{planName(plan, profile.trialEndsAt)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {!trialEnds
                ? `${planPrice(plan, currency)} a ${BILLING_PERIOD}${renewsOn && !cancelledOn ? `, renews ${renewsOn}` : ""}.`
                : trialLeft === 0
                  ? `Your free trial ended on ${trialEnds}.`
                  : `Your free trial ends on ${trialEnds}${
                      trialLeft !== null
                        ? `, ${trialLeft} day${trialLeft === 1 ? "" : "s"} from now`
                        : ""
                    }, then ${planPrice(plan, currency)} a ${BILLING_PERIOD}.`}
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

function AllPlans({ status }: { status: ReturnType<typeof usePlanStatus> }) {
  const { profile } = useProfile();
  const currency = useCurrency();
  const current = profile.plan ?? DEFAULT_PLAN;
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  async function choose(plan: Plan) {
    setBusyPlan(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, returnTo: "plans" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That did not go through. Try again.");
        setBusyPlan(null);
        return;
      }
      if (typeof data.url === "string") {
        // Stripe Checkout — a different origin, so a real navigation, not the router.
        window.location.href = data.url;
        return;
      }
      // Switched directly on the existing subscription: reload so every field
      // that reads the profile or the plan status (this page, the rail, the
      // header chip) picks up the new plan in one go, rather than each having
      // to be told individually.
      window.location.reload();
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
      setBusyPlan(null);
    }
  }

  return (
    <div className="mt-3">
      {error && <ErrorNote message={error} className="mx-auto mb-4 max-w-4xl" />}
      <div className="grid max-w-4xl gap-6 sm:grid-cols-2 mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = plan === current && !status.expired;
          const switching = !status.expired;
          const label = isCurrent
            ? "Your current plan"
            : switching
              ? `Switch to ${PLAN_LABEL[plan]}`
              : `Choose ${PLAN_LABEL[plan]}`;
          return (
            // No trial badge here, ever. Every account that can reach this page
            // has already been offered the trial at the end of onboarding and
            // taken or declined it, and a trial is once per student — so
            // advertising it back to them is an offer Grasp would not honour.
            <PlanCard key={plan} plan={plan} currency={currency} compact trialBadge={false}>
              <button
                onClick={() => choose(plan)}
                disabled={isCurrent || busyPlan !== null}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-ink text-white disabled:opacity-100"
                    : "border border-slate-200 bg-white text-ink hover:border-slate-300 disabled:opacity-50"
                }`}
              >
                {busyPlan === plan ? "Working…" : label}
              </button>
            </PlanCard>
          );
        })}
      </div>
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <p className="sr-only" role="status">
        Loading plans
      </p>
      <Skeleton className="h-4 w-20" />
      <div className="mt-3 grid max-w-4xl gap-6 sm:grid-cols-2 mx-auto">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <Skeleton className="mt-10 h-4 w-24" />
      <Skeleton className="mt-3 h-28 w-full rounded-2xl" />
    </div>
  );
}

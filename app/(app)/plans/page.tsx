"use client";

// Plans: which plan the student is on, cancelling or resuming it, and both
// plans side by side. Laid out like Settings. Real Stripe billing sits behind
// every button here (lib/billing.ts): switching between Pro and Max and choosing
// a plan after one has ended both open Stripe Checkout, so the card is always
// confirmed on Stripe's page; a switch ends the old plan once the new is paid.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/lib/profileStore";
import { useNow } from "@/lib/subjectsStore";
import { usePlanStatus } from "@/lib/usePlanStatus";
import { BILLING_PERIOD, DEFAULT_PLAN, PLANS, PLAN_LABEL, PLAN_PRICE_BY_CURRENCY, planName, planPrice, trialDaysLeft, type BilledPlan } from "@/lib/plan";
import { formatMoney, type Currency } from "@/lib/currency";
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

/**
 * What a paid plan costs and when it renews or ends, with any promotion code on
 * it: "Free with your promotion code until 29 January. Your plan ends then...",
 * or "A$11.99 a week with your promotion code (20% off) until ..., then ...".
 */
function priceLine({
  plan,
  currency,
  status,
  now,
}: {
  plan: BilledPlan;
  currency: Currency;
  status: ReturnType<typeof usePlanStatus>;
  now: Date | null;
}): string {
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, LONG_DATE);
  const cancelled = status.cancelledAt !== null;
  const renewsOn = status.currentPeriodEnd && !cancelled ? day(status.currentPeriodEnd) : null;
  const endsOn = status.planEndsAt && !cancelled ? day(status.planEndsAt) : null;
  const list = PLAN_PRICE_BY_CURRENCY[currency][plan];
  const full = `${formatMoney(list, currency)} a ${BILLING_PERIOD}`;

  const d = status.discount;
  const live = d && (!d.endsAt || !now || new Date(d.endsAt) > now) ? d : null;
  if (!live) {
    if (endsOn) return `${full}. Your plan ends on ${endsOn}.`;
    return `${full}${renewsOn ? `, renews ${renewsOn}` : ""}.`;
  }

  const off = live.percentOff ?? 0;
  const cost = live.percentOff !== null ? list * (1 - off / 100) : Math.max(0, list - (live.amountOff ?? 0));
  const offLabel = live.percentOff !== null ? `${off}% off` : `${formatMoney(live.amountOff ?? 0, currency)} off`;
  const free = cost <= 0;
  const codeEnds = live.endsAt ? day(live.endsAt) : null;
  const withCode = free
    ? "Free with your promotion code"
    : `${formatMoney(cost, currency)} a ${BILLING_PERIOD} with your promotion code (${offLabel})`;

  // A plan set to end on its own (a code that needed no card) stops there.
  if (endsOn) return `${withCode} until ${endsOn}. Your plan ends then, and nothing is charged after that.`;
  if (!codeEnds) return `${withCode}${renewsOn ? `, renews ${renewsOn}` : ""}.`;
  // The next bill is still discounted when the code outlasts it.
  const nextAt =
    status.currentPeriodEnd && live.endsAt && new Date(status.currentPeriodEnd) < new Date(live.endsAt)
      ? free
        ? "free"
        : formatMoney(cost, currency)
      : formatMoney(list, currency);
  return `${withCode} until ${codeEnds}, then ${full}.${renewsOn ? ` Renews ${renewsOn}${nextAt === "free" ? ", free" : ` at ${nextAt}`}.` : ""}`;
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

  if (plan === "free") {
    const freeEnds = profile.freeTrialEndsAt
      ? new Date(profile.freeTrialEndsAt).toLocaleDateString(undefined, LONG_DATE)
      : null;
    return (
      <>
        <h2
          id={CANCEL_ANCHOR}
          className={`${heading} text-sm font-bold uppercase tracking-wide text-slate-500`}
        >
          Your plan
        </h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-bold text-ink">Free trial</p>
          <p className="mt-1 text-sm text-slate-500">
            {freeEnds ? `Your free trial ends on ${freeEnds}.` : "Your free trial is running."} Choose
            Pro or Max above to keep using Grasp after that. Nothing is charged until you do.
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
            <p className="flex items-center gap-2 text-lg font-bold text-ink">
              {planName(plan, profile.trialEndsAt)}
              {status.discount && (!status.discount.endsAt || !now || new Date(status.discount.endsAt) > now) && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  Promotion code
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {!trialEnds
                ? priceLine({ plan, currency, status, now })
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
  const [busyPlan, setBusyPlan] = useState<BilledPlan | null>(null);
  const [error, setError] = useState("");
  // A switch on a live subscription takes effect and charges the moment it is
  // pressed, ending a trial if one is running, so it is
  // confirmed first. Choosing a plan after one has ended goes to Checkout,
  // which is its own confirmation.
  const [confirmPlan, setConfirmPlan] = useState<BilledPlan | null>(null);
  const onTrial = profile.trialEndsAt !== null;
  // The free trial has no subscription to switch, so its buttons go to Checkout.
  const onFree = current === "free";
  const switching = !status.expired && !onFree;

  // A switch is bought like a new plan, through Stripe Checkout (the card is
  // entered again there): a full week of the new plan, and the old one ends
  // the moment it is paid (settleSubscriptions in lib/billing.ts).
  function switchNotice(plan: BilledPlan): string {
    const price = planPrice(plan, currency);
    const ending = onTrial ? `your free ${PLAN_LABEL[current]} trial` : `your ${PLAN_LABEL[current]} plan`;
    return `Switching ends ${ending} as soon as you pay and starts ${PLAN_LABEL[plan]} straight away. You will be charged ${price} for a ${BILLING_PERIOD} of ${PLAN_LABEL[plan]}, then ${price} every ${BILLING_PERIOD} from today. You will confirm your card on Stripe's secure checkout page next.`;
  }

  // Back from Stripe can restore this page from the back/forward cache with a
  // button still reading "Taking you to checkout".
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusyPlan(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const [resuming, setResuming] = useState(false);
  async function resume() {
    setResuming(true);
    setError("");
    const failed = await status.setCancelled(false);
    setResuming(false);
    if (failed) setError(failed);
  }

  async function choose(plan: BilledPlan) {
    setConfirmPlan(null);
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
      setError("Grasp could not start checkout. Try again.");
      setBusyPlan(null);
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
          // A cancelled plan still running to the end of its week: its own card
          // offers to resume it, exactly as the Resume button below does.
          const resumable = isCurrent && status.cancelledAt !== null;
          const cancelled = status.cancelledAt !== null && !status.expired;
          const label = resumable
            ? `Resume ${PLAN_LABEL[plan]} plan`
            : isCurrent
            ? "Your current plan"
            : switching && cancelled
              ? `Continue with ${PLAN_LABEL[plan]}`
              : switching
              ? `Switch to ${PLAN_LABEL[plan]}`
              : `Choose ${PLAN_LABEL[plan]}`;
          return (
            <PlanCard key={plan} plan={plan} currency={currency} compact>
              <button
                onClick={() =>
                  resumable ? resume() : switching ? setConfirmPlan(plan) : choose(plan)
                }
                disabled={(isCurrent && !resumable) || busyPlan !== null || resuming}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  resumable
                    ? "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
                    : isCurrent
                    ? "bg-ink text-white disabled:opacity-100"
                    : "border border-slate-200 bg-white text-ink hover:border-slate-300 disabled:opacity-50"
                }`}
              >
                {busyPlan === plan ? "Taking you to checkout…" : resumable && resuming ? "Resuming…" : label}
              </button>
            </PlanCard>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmPlan !== null}
        tone="brand"
        title={confirmPlan ? `Switch to ${PLAN_LABEL[confirmPlan]} now?` : ""}
        body={
          confirmPlan ? (
            <>
              {switchNotice(confirmPlan)}{" "}
              {/* New tab: /legal sits outside the route group, and leaving for
                  it in place would end a live recording. */}
              <a
                href="/legal/terms#refunds"
                target="_blank"
                rel="noopener"
                className="font-semibold text-brand-600 underline-offset-2 hover:underline"
              >
                Learn more
              </a>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Continue to checkout"
        cancelLabel={onTrial ? "Keep my trial" : `Keep ${PLAN_LABEL[current]}`}
        onConfirm={() => confirmPlan && choose(confirmPlan)}
        onCancel={() => setConfirmPlan(null)}
      />
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

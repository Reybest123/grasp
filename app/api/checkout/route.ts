// Starts real billing (§6). Two very different things share this one route,
// because the client's job is the same either way — "put me on this plan" —
// and only the server knows which is actually needed:
//
//  - No subscription yet (onboarding's plan step, or resubscribing after one
//    fully ended): a Stripe Checkout Session is created and its URL handed
//    back, so the browser can send the student to Stripe's own hosted page to
//    type their card. Nothing here ever sees the card itself.
//  - An active subscription already exists (switching Pro <-> Max from
//    /plans): Stripe already has a card on file, so the subscription's price
//    is swapped directly, with no redirect and nothing for the student to
//    retype.
//
//  - The free trial (onboarding only): no Stripe at all. The account is put on
//    plan 'free' for FREE_TRIAL_DAYS, once, and nothing is handed back to
//    redirect to, so the browser goes straight to /home.
//
// The one data route an account without a plan may call, since it is how such
// an account gets one.

import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/events";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseAnswers } from "@/lib/onboarding";
import { isPastDue, needsRenewal, cancelImmediately, createCheckoutSession, readBillingRow } from "@/lib/billing";
import { appOrigin } from "@/lib/verification";
import { isBilledPlan } from "@/lib/plan";
import { resolveCurrency } from "@/lib/currencyServer";

export async function POST(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));

  const plan: unknown = body.plan;
  if (!isBilledPlan(plan) && plan !== "free") {
    return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  }

  // Onboarding sends the three answers along with the first plan choice, so
  // they are stored the moment the student commits to a plan rather than
  // waiting on Stripe to tell Grasp the payment went through.
  if (body.answers !== undefined) {
    const answers = parseAnswers(body.answers);
    if (!answers) {
      return NextResponse.json({ error: "Answer the three questions first." }, { status: 400 });
    }
    const saved = await query(
      () => sql`update users set onboarding = ${JSON.stringify(answers)}::jsonb where id = ${guard.user.id}`
    );
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  } else if (!guard.user.plan) {
    return NextResponse.json({ error: "Answer the three questions first." }, { status: 400 });
  }

  if (plan === "free") {
    // Only from onboarding: an account that has had a plan, or the trial, does
    // not get it again. The `where` is the check, so two presses at once
    // cannot both start it.
    if (guard.user.plan) {
      return NextResponse.json({ error: "The free trial is only for new accounts." }, { status: 409 });
    }
    const started = await query(
      () => sql`
        update users set plan = 'free', free_trial_started_at = now()
        where id = ${guard.user.id} and plan is null and free_trial_started_at is null
          and stripe_subscription_id is null
        returning id
      `
    );
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    if (!started.data.length) {
      return NextResponse.json({ error: "The free trial is only for new accounts." }, { status: 409 });
    }
    await track("free_trial_started", { userId: guard.user.id });
    return NextResponse.json({ ok: true });
  }

  const billing = await readBillingRow(guard.user.id);
  if (!billing.ok) return NextResponse.json({ error: billing.error }, { status: billing.status });

  const subscriptionId = billing.data?.stripeSubscriptionId ?? null;
  const status = billing.data?.subscriptionStatus ?? null;
  const hasActiveSubscription = subscriptionId && !needsRenewal(status);
  // A switch goes through Checkout like any purchase; this only stops a second
  // subscription to the plan already running.
  if (hasActiveSubscription && guard.user.plan === plan) {
    return NextResponse.json({ error: `You are already on ${plan === "max" ? "Max" : "Pro"}.` }, { status: 409 });
  }

  // A subscription that still exists in Stripe but needs renewing (the card
  // failed, so it is past_due or unpaid rather than cancelled outright) is
  // ended here before a fresh one starts, so choosing a plan while locked out
  // does not leave two subscriptions running on the same customer.
  if (subscriptionId && isPastDue(status) && !(await cancelImmediately(guard.user.id))) {
    return NextResponse.json(
      { error: "Grasp could not reach Stripe just now. Try again in a moment." },
      { status: 502 }
    );
  }

  const returnTo =
    body.returnTo === "onboarding" || body.returnTo === "renew" ? body.returnTo : "plans";
  const origin = appOrigin(req.nextUrl.origin);
  const session = await createCheckoutSession({
    userId: guard.user.id,
    email: guard.user.email,
    name: guard.user.name,
    plan,
    // The account's own currency once it has one, otherwise where this request
    // looks like it came from — the same answer the plan cards were drawn with.
    currency: await resolveCurrency(guard.user),
    successUrl: `${origin}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}&to=${returnTo}`,
    cancelUrl: `${origin}/${returnTo === "renew" ? "home" : returnTo}`,
    // Set from the account, never the request: the subscription this purchase
    // ends once it is paid.
    replaces: hasActiveSubscription ? subscriptionId : undefined,
  });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: 502 });
  await track("checkout_started", { userId: guard.user.id, detail: plan });
  return NextResponse.json({ url: session.url });
}

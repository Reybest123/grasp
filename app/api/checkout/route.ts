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
// The one data route an account without a plan may call, since it is how such
// an account gets one — it replaced the old /api/onboarding, which granted a
// plan for free the moment the three questions were answered.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseAnswers } from "@/lib/onboarding";
import { isExpired, changePlan, createCheckoutSession, readBillingRow } from "@/lib/billing";
import { appOrigin } from "@/lib/verification";
import { isPlan } from "@/lib/plan";
import { resolveCurrency } from "@/lib/currencyServer";

export async function POST(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));

  const plan: unknown = body.plan;
  if (!isPlan(plan)) {
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

  const billing = await readBillingRow(guard.user.id);
  if (!billing.ok) return NextResponse.json({ error: billing.error }, { status: billing.status });

  const hasActiveSubscription =
    billing.data?.stripeSubscriptionId && !isExpired(billing.data.subscriptionStatus);

  if (hasActiveSubscription) {
    const switched = await changePlan(guard.user.id, plan);
    if (!switched.ok) return NextResponse.json({ error: switched.error }, { status: 502 });
    return NextResponse.json({ ok: true });
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
  });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: 502 });
  return NextResponse.json({ url: session.url });
}

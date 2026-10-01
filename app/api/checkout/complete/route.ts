// Where Stripe Checkout sends the browser back after the student finishes
// typing their card. The webhook (app/api/webhooks/stripe) is the record of
// truth and will sync the subscription on its own, but it can arrive a second
// or two after this redirect does — syncing here too, from the same
// `syncSubscription`, means the dashboard the student lands on already shows
// their new plan rather than a stale "no plan yet" for a moment. Whichever of
// the two runs first does the write; the other is a harmless repeat of it.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { query, sql } from "@/lib/db";
import { isBilledPlan } from "@/lib/plan";
import { stripeClient, syncSubscription } from "@/lib/billing";
import { appOrigin } from "@/lib/verification";

export async function GET(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  const origin = appOrigin(req.nextUrl.origin);
  if (!guard.ok) return NextResponse.redirect(`${origin}/login`);

  const sessionId = req.nextUrl.searchParams.get("session_id");
  const to = req.nextUrl.searchParams.get("to");
  const destination =
    to === "onboarding"
      ? `${origin}/home?setup=timetable`
      : to === "renew"
        ? `${origin}/home`
        : `${origin}/plans?checkout=1`;

  if (sessionId) {
    try {
      const session = await stripeClient().checkout.sessions.retrieve(sessionId, {
        expand: ["subscription.default_payment_method"],
      });
      // Whoever's Checkout Session this was, it has to be the student making
      // this request — otherwise the session id in the URL could be used to
      // pull someone else's subscription onto this account.
      if (session.client_reference_id === guard.user.id && session.subscription) {
        const subscription =
          typeof session.subscription === "string" ? null : session.subscription;
        if (subscription) await syncSubscription(subscription);
      }
    } catch (err) {
      // The webhook is still coming; a student is not left stuck on a plain
      // failure here, only without the head start this route would have given.
      console.error("[grasp] checkout completion sync failed:", err);
    }
  }

  // The plan as it now stands, so the page can open on "Welcome to Max". Read
  // back rather than taken from the URL: only a plan that actually started is
  // welcomed. If the webhook has not landed yet there is simply no welcome.
  const row = await query(
    () => sql`select plan, subscription_status from users where id = ${guard.user.id}`
  );
  const current = row.ok ? (row.data as { plan: string | null; subscription_status: string | null }[])[0] : undefined;
  if (current && isBilledPlan(current.plan) && current.subscription_status !== "canceled") {
    const url = new URL(destination);
    url.searchParams.set("welcome", current.plan);
    return NextResponse.redirect(url.toString());
  }
  return NextResponse.redirect(destination);
}

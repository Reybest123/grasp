// Where Stripe Checkout sends the browser back after the student finishes
// typing their card. The webhook (app/api/webhooks/stripe) is the record of
// truth and will sync the subscription on its own, but it can arrive a second
// or two after this redirect does — syncing here too, from the same
// `syncSubscription`, means the dashboard the student lands on already shows
// their new plan rather than a stale "no plan yet" for a moment. Whichever of
// the two runs first does the write; the other is a harmless repeat of it.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { stripeClient, syncSubscription } from "@/lib/billing";
import { appOrigin } from "@/lib/verification";

export async function GET(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  const origin = appOrigin(req.nextUrl.origin);
  if (!guard.ok) return NextResponse.redirect(`${origin}/login`);

  const sessionId = req.nextUrl.searchParams.get("session_id");
  const to = req.nextUrl.searchParams.get("to") === "onboarding" ? "onboarding" : "plans";
  const destination = to === "onboarding" ? `${origin}/home?setup=timetable` : `${origin}/plans?checkout=1`;

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

  return NextResponse.redirect(destination);
}

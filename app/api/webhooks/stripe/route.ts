// Stripe's own record of what happened to a subscription — trial started,
// converted to paid, payment failed and retried, cancelled, fully ended.
// `syncSubscription` (lib/billing.ts) is the only thing this route does with
// any of it: rather than trust whatever fields a given event carries, each
// handler re-fetches the subscription by id and syncs *that*, so an event
// delivered out of order or missing an expansion still lands on the
// subscription's actual current state rather than a stale snapshot of it.
//
// No requireUser here — Stripe is the caller, not a signed-in student — so the
// signature check is the only thing standing between this route and anyone on
// the internet who can guess the URL. Never skip it.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { retrieveSubscription, stripeClient, syncSubscription, STRIPE_WEBHOOK_SECRET } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[grasp] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  // The raw body, read before anything parses it — a signature is checked
  // against the exact bytes Stripe sent, not a re-serialised object.
  const payload = await req.text();

  let event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[grasp] Stripe webhook signature check failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) await syncSubscription(await retrieveSubscription(subscriptionId));
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(await retrieveSubscription(subscription.id));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // A 500 here makes Stripe retry the event later, which is the right
    // outcome for a transient failure (a database blip): better a late sync
    // than a silently dropped one.
    console.error(`[grasp] Stripe webhook handling failed for ${event.type}:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

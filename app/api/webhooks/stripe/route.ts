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
import { cancelDeclinedRenewal, settleSubscriptions, planForPrice, retrieveSubscription, stripeClient, syncSubscription, voidUnpaidInvoices, STRIPE_WEBHOOK_SECRET } from "@/lib/billing";
import { sendRenewalFailedMail, sendRenewedMail, sendSubscribedMail, sendTrialEndingMail } from "@/lib/billingMail";

const planOf = (subscription: Stripe.Subscription) =>
  planForPrice(subscription.items.data[0]?.price?.id) ?? undefined;

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
        if (!subscriptionId) break;
        // The confirmation email goes from here and not from the Checkout
        // return route, so it is sent once per Checkout rather than once per
        // path. A failed send is logged, not answered with a 500: Stripe
        // disables an endpoint that keeps failing, and a Resend outage must not
        // be what stops every plan from syncing.
        const synced = await syncSubscription(await retrieveSubscription(subscriptionId));
        // Before the email, so a failure here (answered 500, retried by
        // Stripe) does not also send the email twice.
        const kept = await settleSubscriptions(session);
        // No "plan started" email for a duplicate purchase that was just
        // refunded, or for a delayed payment that has not cleared yet (sent
        // from async_payment_succeeded instead).
        if (session.payment_status === "unpaid" || (kept && kept !== synced.id)) break;
        if (!(await sendSubscribedMail(synced, planOf(synced)))) {
          console.error("[grasp] plan confirmation email not sent for", synced.id);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) break;
        const synced = await syncSubscription(await retrieveSubscription(subscriptionId));
        const kept = await settleSubscriptions(session);
        if (kept && kept !== synced.id) break;
        if (!(await sendSubscribedMail(synced, planOf(synced)))) {
          console.error("[grasp] plan confirmation email not sent for", synced.id);
        }
        break;
      }
      case "customer.subscription.trial_will_end": {
        const subscription = await retrieveSubscription((event.data.object as Stripe.Subscription).id);
        if (!(await sendTrialEndingMail(subscription, planOf(subscription)))) {
          console.error("[grasp] trial reminder email not sent for", subscription.id);
        }
        break;
      }
      case "invoice.paid": {
        // A week's renewal going through: the subscription itself is synced
        // by the subscription.updated that comes with it, so this only emails.
        const invoice = event.data.object as Stripe.Invoice;
        const ref = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof ref === "string" ? ref : ref?.id;
        if (!subscriptionId || invoice.billing_reason !== "subscription_cycle") break;
        const subscription = await retrieveSubscription(subscriptionId);
        if (!(await sendRenewedMail(invoice, subscription, planOf(subscription)))) {
          console.error("[grasp] renewal email not sent for", subscription.id);
        }
        break;
      }
      case "invoice.payment_failed": {
        // A weekly renewal that was declined: end the plan now rather than
        // leaving it past due until the next billing date (lib/billing.ts).
        const invoice = event.data.object as Stripe.Invoice;
        const ref = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof ref === "string" ? ref : ref?.id;
        if (!subscriptionId || !invoice.id || invoice.billing_reason !== "subscription_cycle") break;
        const ended = await cancelDeclinedRenewal(subscriptionId, invoice.id);
        if (ended && !(await sendRenewalFailedMail(ended, planOf(ended)))) {
          console.error("[grasp] payment failed email not sent for", ended.id);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(await retrieveSubscription(subscription.id));
        // A cancelled plan must never be charged again (lib/billing.ts).
        if (event.type === "customer.subscription.deleted") await voidUnpaidInvoices(subscription.id);
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

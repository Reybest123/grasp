// Real billing, server-side only (§6). One Stripe subscription per account,
// for either paid plan. The free trial never touches Stripe (lib/plan.ts).
//
// The card is taken by a Stripe-hosted Checkout Session — the student never
// types a card number into a Grasp page, so Grasp never touches raw card data
// and there is no PCI scope here beyond what Stripe already carries. Everything
// after that (what plan an account is on, whether its trial or period has
// ended, whether it is about to cancel) is kept in sync by `syncSubscription`,
// called from both the webhook (app/api/webhooks/stripe) and the browser's own
// return from Checkout (app/api/checkout/complete) — whichever reaches Grasp
// first does the write, and the other is a harmless no-op, because both write
// the same row from the same Stripe object.
//
// This module must never be imported from a client component, the same
// discipline lib/db.ts and lib/openai.ts apply to their own secrets.

import Stripe from "stripe";
import { query, sql } from "@/lib/db";
import { PLAN_AVAILABLE, isBilledPlan, type BilledPlan } from "@/lib/plan";
import { claimOrOwnTrial } from "@/lib/trialClaims";
import { track } from "@/lib/events";
import { DEFAULT_CURRENCY, isCurrency, type Currency } from "@/lib/currency";
import { chargeLabel } from "@/lib/billingMail";
import { SITE_URL } from "@/lib/site";
import { resetWeeklyUsage } from "@/lib/usage";

/**
 * Stripe Tax, switched on with STRIPE_TAX=on once it is activated in the
 * Stripe dashboard (LAUNCH_PLAN.md). Off, nothing about checkout changes. On,
 * Stripe works out tax from the billing address it collects and takes it out
 * of the price rather than adding it on top, since both Prices are
 * tax-inclusive (scripts/stripe-setup.mjs): a student still pays exactly the
 * price on the plan card. It only collects tax where a registration has been
 * added in the dashboard, so turning it on before any registration exists
 * charges no tax at all.
 */
const AUTOMATIC_TAX = process.env.STRIPE_TAX === "on";

// Built on first use, not at module load, for the same reason lib/db.ts's pool
// is: this module is imported while Next collects page data at build time,
// where there may be no STRIPE_SECRET_KEY, and a missing one should fail a
// request rather than the build.
const holder = globalThis as unknown as { graspStripe?: Stripe };

function stripe(): Stripe {
  if (!holder.graspStripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    holder.graspStripe = new Stripe(key);
  }
  return holder.graspStripe;
}

/** True when Grasp has a Stripe key to work with at all. */
export function hasBilling(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * The Stripe Price id behind each plan (lib/plan.ts's weekly prices), created
 * by `npm run billing:setup` (scripts/stripe-setup.mjs) and read from the env
 * rather than looked up by name on every request.
 */
const PRICE_ENV: Record<BilledPlan, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  max: process.env.STRIPE_PRICE_MAX,
};

function priceId(plan: BilledPlan): string {
  const id = PRICE_ENV[plan];
  if (!id) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} is not set`);
  return id;
}

export function planForPrice(id: string | null | undefined): BilledPlan | null {
  if (!id) return null;
  for (const plan of ["pro", "max"] as BilledPlan[]) {
    if (PRICE_ENV[plan] === id) return plan;
  }
  return null;
}

export type BillingRow = {
  plan: BilledPlan | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;
  /** what the account is billed in; null until it first reaches Checkout */
  currency: Currency | null;
};

async function readBillingRow(userId: string) {
  return query(async () => {
    const rows = (await sql`
      select plan, stripe_customer_id, stripe_subscription_id, subscription_status,
             current_period_end, plan_cancelled_at, trial_ends_at, currency
      from users where id = ${userId}
    `) as {
      plan: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string | null;
      current_period_end: string | Date | null;
      plan_cancelled_at: string | Date | null;
      trial_ends_at: string | Date | null;
      currency: string | null;
    }[];
    const row = rows[0];
    if (!row) return null;
    const out: BillingRow = {
      plan: isBilledPlan(row.plan) ? row.plan : null,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
      cancelledAt: row.plan_cancelled_at ? new Date(row.plan_cancelled_at).toISOString() : null,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
      currency: isCurrency(row.currency) ? row.currency : null,
    };
    return out;
  });
}

export { readBillingRow };

/** Stripe's terminal "this subscription is over" status. */
export function isExpired(status: string | null): boolean {
  return status === "canceled";
}

/**
 * A subscription that still exists in Stripe but cannot be trusted to keep
 * paying: the card failed and Stripe is retrying (`past_due`), or the
 * retries ran out without Stripe cancelling it outright (`unpaid`). Access is
 * locked the same as a plan that has fully ended (lib/session.ts) — the risk
 * to Grasp is the same, a plan running for free — but unlike a cancelled
 * subscription this one is not gone, so /api/checkout cancels it outright
 * before a fresh one can start, rather than leaving two on the same customer.
 */
export function isPastDue(status: string | null): boolean {
  return status === "past_due" || status === "unpaid";
}

/** Locks the account out (lib/session.ts's `expired`) until this is put right. */
export function needsRenewal(status: string | null): boolean {
  return isExpired(status) || isPastDue(status);
}

/**
 * Finds or creates the Stripe Customer behind an account, and stores the id
 * the first time. A student who abandons Checkout and comes back still gets
 * the same customer rather than a fresh one each time.
 *
 * Callers run this inside their own try/catch: both the database read and the
 * Stripe call can throw, and this deliberately does not swallow either — the
 * caller is what knows how to turn a failure into the right response.
 */
async function ensureCustomer(
  userId: string,
  email: string,
  name: string,
  currency: Currency
): Promise<string> {
  const existing = await readBillingRow(userId);
  if (!existing.ok) throw new Error(existing.error);
  if (existing.data?.stripeCustomerId) return existing.data.stripeCustomerId;

  const customer = await stripe().customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });
  // The currency is written beside the customer id and never rewritten. Stripe
  // fixes a customer's currency on its first invoice and will not change it
  // afterwards, so this is the only currency the account can ever be charged —
  // which is why everything else reads it from here rather than guessing again
  // from a request that may now be coming from somewhere else.
  await sql`
    update users set stripe_customer_id = ${customer.id}, currency = ${currency}
    where id = ${userId}
  `;
  return customer.id;
}

/**
 * Starts a Checkout Session for a brand new subscription: onboarding's plan
 * step for an account with none yet, or resubscribing after a subscription has
 * fully ended, or switching between Pro and Max. A switch (`replaces`) goes
 * through Checkout too, at the user's request, so the student sees the price
 * and confirms their card on Stripe's own page; the old subscription is only
 * cancelled once the new one is paid (`settleSubscriptions`).
 *
 * Neither plan has a Stripe trial: both are charged when Checkout completes.
 * The free trial is a separate, cardless state (lib/plan.ts) that never
 * reaches Stripe.
 */
export async function createCheckoutSession({
  userId,
  email,
  name,
  plan,
  currency,
  successUrl,
  cancelUrl,
  replaces,
}: {
  userId: string;
  email: string;
  name: string;
  plan: BilledPlan;
  /**
   * What to charge in (lib/currency.ts). Only a suggestion for an account that
   * has never checked out: one that already has a Stripe customer keeps the
   * currency stored against it, because Stripe will not let a customer's
   * currency change and a Checkout Session that disagreed would be refused.
   */
  currency: Currency;
  successUrl: string;
  cancelUrl: string;
  /** The account's current subscription, when this is a switch. Set by the server, never the client. */
  replaces?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!hasBilling()) return { ok: false, error: "Billing is not set up yet." };
  if (!PLAN_AVAILABLE[plan]) return { ok: false, error: "That plan is not available yet." };

  const billing = await readBillingRow(userId);
  if (!billing.ok) return { ok: false, error: billing.error };
  const charged = billing.data?.currency ?? currency;

  try {
    const customerId = await ensureCustomer(userId, email, name, charged);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      // One Price per plan holds every currency (scripts/stripe-setup.mjs), so
      // this picks the amount rather than the Price — which is what lets
      // `changePlan` swap plans later without having to choose a currency at
      // all, since the subscription already has one.
      currency: charged,
      line_items: [{ price: priceId(plan), quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: {
        // `replaces` rides on the new subscription itself, so whichever
        // Checkout's cleanup runs first still knows which plan it replaced.
        metadata: { userId, plan, ...(replaces ? { replaces } : {}) },
      },
      // Stated beside the pay button, where it is read: the price, that it
      // renews every week, and how to stop it. Auto-renewal laws (the US
      // ROSCA and state laws, the EU and UK consumer rules) want exactly this
      // before the card is taken, and "start straight away" is the EU and UK
      // consumer's request for the plan to begin inside the 14-day
      // cancellation period (Terms, #refunds).
      custom_text: { submit: { message: checkoutDisclosure(plan, charged, Boolean(replaces)) } },
      ...(AUTOMATIC_TAX
        ? {
            automatic_tax: { enabled: true },
            billing_address_collection: "auto" as const,
            customer_update: { address: "auto" as const, name: "auto" as const },
          }
        : {}),
      client_reference_id: userId,
      metadata: { userId, plan, ...(replaces ? { replaces } : {}) },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (!session.url) return { ok: false, error: "Grasp could not start checkout. Try again." };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[grasp] Stripe checkout session failed:", err);
    return { ok: false, error: "Grasp could not reach Stripe just now. Try again in a moment." };
  }
}

function checkoutDisclosure(plan: BilledPlan, currency: Currency, switching = false): string {
  const price = chargeLabel(plan, currency);
  const terms = `${SITE_URL.replace(/^https:\/\//, "")}/legal/terms`;
  const charge = `${switching ? "This replaces your current plan, which ends as soon as you pay, with no refund for its unused days. " : ""}${price} now, then ${price} every week until you cancel. Cancel any time on Grasp's Plans page.`;
  return `${charge} By subscribing you agree to Grasp's Terms of Service (${terms}) and ask for your plan to start straight away.`;
}

/** A purchase made within this long of another counts as a duplicate and is refunded. */
const DUPLICATE_WINDOW_SECONDS = 24 * 60 * 60;

const LIVE = new Set(["active", "trialing", "past_due", "unpaid"]);

/**
 * After any paid Checkout, leaves the customer with exactly one live
 * subscription: the newest. Every other one is cancelled. Called from the
 * Checkout return route and the webhook, whichever lands first, and throws on a
 * Stripe failure so the webhook answers 500 and Stripe retries; every step
 * checks what is already done, so a retry is safe. Two calls racing agree,
 * because "newest" is read off Stripe rather than off whichever call is running.
 *
 * - The plan a switch replaced (`replaces`) is cancelled with no refund for its
 *   unused days (Terms, #refunds), and the week's allowances start afresh.
 * - Any other one bought within a day is a duplicate purchase (two checkout
 *   tabs, an old checkout link, onboarding paid twice), so it is refunded too.
 * - Anything older is a plan that was already in use, and is only cancelled.
 */
export async function settleSubscriptions(session: Stripe.Checkout.Session): Promise<string | null> {
  const userId = session.client_reference_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!userId || !customerId) return null;
  // A delayed payment method completes later (checkout.session.async_payment_succeeded).
  if (session.payment_status === "unpaid") return null;

  const all = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  const live = all.data.filter((sub) => LIVE.has(sub.status)).sort((x, y) => y.created - x.created);
  const [keep, ...rest] = live;
  if (!keep) return null;
  if (!rest.length) return keep.id;

  const replacedIds = new Set(
    [keep.metadata?.replaces, session.metadata?.replaces].filter((id): id is string => Boolean(id))
  );
  for (const sub of rest) {
    const replaced = replacedIds.has(sub.id);
    // Refund and reset before cancelling: a cancelled subscription drops out
    // of `live`, so a retry after a failure would never come back to it.
    if (replaced) {
      await resetWeeklyUsage(userId);
    } else if (keep.created - sub.created < DUPLICATE_WINDOW_SECONDS) {
      await refundLatest(sub);
    }
    await stripe().subscriptions.cancel(sub.id);
  }
  await syncSubscription(keep);
  return keep.id;
}

/** Refunds a subscription's latest paid invoice, once. */
async function refundLatest(sub: Stripe.Subscription): Promise<void> {
  const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
  if (!invoiceId) return;
  const payments = await stripe().invoicePayments.list({ invoice: invoiceId, limit: 10 });
  for (const p of payments.data) {
    const intent = p.payment.payment_intent;
    const intentId = typeof intent === "string" ? intent : intent?.id;
    if (p.status !== "paid" || !intentId) continue;
    const refunded = await stripe().refunds.list({ payment_intent: intentId, limit: 1 });
    if (!refunded.data.length) await stripe().refunds.create({ payment_intent: intentId });
  }
}

export async function cancelAtPeriodEnd(
  userId: string,
  cancel: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const billing = await readBillingRow(userId);
  if (!billing.ok) return { ok: false, error: billing.error };
  const subscriptionId = billing.data?.stripeSubscriptionId;

  if (!subscriptionId) {
    // An account made before billing, or one that never finished Checkout: the
    // only thing Grasp has to go on is its own flag, so fall back to that
    // rather than failing on a subscription that does not exist.
    const updated = await query(() =>
      cancel
        ? sql`update users set plan_cancelled_at = coalesce(plan_cancelled_at, now()) where id = ${userId}`
        : sql`update users set plan_cancelled_at = null where id = ${userId}`
    );
    return updated.ok ? { ok: true } : { ok: false, error: updated.error };
  }
  if (!hasBilling()) return { ok: false, error: "Billing is not set up yet." };
  if (isExpired(billing.data?.subscriptionStatus ?? null)) {
    return {
      ok: false,
      error: "Your plan has already ended. Choose a plan on this page to subscribe again.",
    };
  }

  try {
    const updated = await stripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancel,
    });
    await syncSubscription(updated);
    return { ok: true };
  } catch (err) {
    console.error("[grasp] Stripe cancel/resume failed:", err);
    return { ok: false, error: "Grasp could not reach Stripe just now. Try again in a moment." };
  }
}

/**
 * Cancels immediately: when the account is being deleted, or a declined
 * subscription is being replaced. Returns false when Stripe could not be
 * reached, so a caller about to start a new subscription can stop first.
 */
export async function cancelImmediately(userId: string): Promise<boolean> {
  const billing = await readBillingRow(userId);
  if (!billing.ok) return false;
  const subscriptionId = billing.data?.stripeSubscriptionId;
  if (!subscriptionId || !hasBilling()) return true;
  try {
    await stripe().subscriptions.cancel(subscriptionId);
    return true;
  } catch (err) {
    // Best effort: the account row is about to be deleted either way, and a
    // subscription Stripe could not cancel here still shows up in the Stripe
    // dashboard for manual cleanup rather than silently disappearing.
    console.error("[grasp] Stripe subscription cancel failed:", err);
    return false;
  }
}

/**
 * The one place a Stripe Subscription object is turned into what `users`
 * stores. Idempotent by construction — it only ever writes the subscription's
 * own current fields — so calling it twice for the same event (a retried
 * webhook, or the webhook and the Checkout return landing within moments of
 * each other) does the same write twice rather than double-applying anything.
 *
 * Also where the one-trial-per-card rule (lib/trialClaims.ts) is actually
 * enforced, now that Checkout has revealed a real card: a subscription that
 * came in trialing on a card that already had a trial, under a different
 * account, has its trial ended immediately, which makes Stripe charge the card
 * for the current period straight away. The student still becomes a paying
 * subscriber — only the second free ride is refused, not the sale.
 *
 * Returns the subscription as it stands after that, which is the one the
 * webhook describes in its confirmation email.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<Stripe.Subscription> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[grasp] Stripe subscription has no userId metadata:", subscription.id);
    return subscription;
  }

  const plan = planForPrice(subscription.items.data[0]?.price?.id) ?? undefined;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  if (subscription.status === "trialing") {
    const fingerprint = await cardFingerprint(subscription);
    if (fingerprint) {
      const claim = await claimOrOwnTrial(fingerprint, userId);
      if (claim.ok && !claim.data) {
        try {
          const ended = await stripe().subscriptions.update(subscription.id, {
            trial_end: "now",
            proration_behavior: "none",
          });
          await writeUser(userId, ended, plan);
          await recordSubscribed(userId, ended, plan);
          return ended;
        } catch (err) {
          console.error("[grasp] ending a reused-card trial early failed:", err);
        }
      }
    }
  }

  await writeUser(userId, subscription, plan, periodEnd);
  await recordSubscribed(userId, subscription, plan);
  return subscription;
}

/**
 * The analytics event for a student's first subscription (lib/events.ts). Once
 * per account, so later syncs of the same or a later subscription are dropped
 * by the database. `detail` says whether it began as a trial.
 */
async function recordSubscribed(userId: string, subscription: Stripe.Subscription, plan: BilledPlan | undefined) {
  if (subscription.status !== "trialing" && subscription.status !== "active") return;
  await track("subscribed", { userId, detail: `${plan ?? "unknown"}:${subscription.status}` });
}

async function writeUser(
  userId: string,
  subscription: Stripe.Subscription,
  plan: BilledPlan | undefined,
  periodEndOverride?: number
) {
  const periodEnd = periodEndOverride ?? subscription.items.data[0]?.current_period_end;
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  // An ended or declined subscription never overwrites a different one: a late
  // or retried event for the old subscription of a student who has since paid
  // again would otherwise mark the new one ended and lock them out.
  //
  // Two statements rather than one with a SQL `case`, so "keep the existing
  // cancel date" can be expressed with `coalesce(plan_cancelled_at, now())` —
  // `now()` is SQL, not a bindable value, so it can only appear written
  // directly into one branch or the other.
  if (subscription.cancel_at_period_end) {
    await sql`
      update users
      set plan = coalesce(${plan ?? null}, plan),
          stripe_subscription_id = ${subscription.id},
          subscription_status = ${subscription.status},
          current_period_end = ${currentPeriodEnd},
          plan_cancelled_at = coalesce(plan_cancelled_at, now()),
          trial_ends_at = coalesce(${trialEndsAt}, trial_ends_at)
      where id = ${userId}
        and (${subscription.status} not in ('canceled', 'past_due', 'unpaid')
             or stripe_subscription_id is null
             or stripe_subscription_id = ${subscription.id})
    `;
  } else {
    await sql`
      update users
      set plan = coalesce(${plan ?? null}, plan),
          stripe_subscription_id = ${subscription.id},
          subscription_status = ${subscription.status},
          current_period_end = ${currentPeriodEnd},
          plan_cancelled_at = null,
          trial_ends_at = coalesce(${trialEndsAt}, trial_ends_at)
      where id = ${userId}
        and (${subscription.status} not in ('canceled', 'past_due', 'unpaid')
             or stripe_subscription_id is null
             or stripe_subscription_id = ${subscription.id})
    `;
  }
}

async function cardFingerprint(subscription: Stripe.Subscription): Promise<string | null> {
  const pm = subscription.default_payment_method;
  if (!pm) return null;
  try {
    const method = typeof pm === "string" ? await stripe().paymentMethods.retrieve(pm) : pm;
    return method.card?.fingerprint ?? null;
  } catch (err) {
    console.error("[grasp] could not read the subscription's payment method:", err);
    return null;
  }
}

/** For the webhook: the full Subscription object behind an id, expanded enough for `syncSubscription`. */
export async function retrieveSubscription(id: string): Promise<Stripe.Subscription> {
  return stripe().subscriptions.retrieve(id, { expand: ["default_payment_method"] });
}

/** For the webhook's signature check, and app/api/checkout/complete. */
export function stripeClient(): Stripe {
  return stripe();
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

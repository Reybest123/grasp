// Real billing, server-side only (§6). One Stripe subscription per account,
// covering both the Pro free trial and paid periods for either plan.
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
import { PLAN_AVAILABLE, TRIAL_DAYS, isPlan, type Plan } from "@/lib/plan";
import { claimOrOwnTrial } from "@/lib/trialClaims";

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
const PRICE_ENV: Record<Plan, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  max: process.env.STRIPE_PRICE_MAX,
};

function priceId(plan: Plan): string {
  const id = PRICE_ENV[plan];
  if (!id) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} is not set`);
  return id;
}

function planForPrice(id: string | null | undefined): Plan | null {
  if (!id) return null;
  for (const plan of ["pro", "max"] as Plan[]) {
    if (PRICE_ENV[plan] === id) return plan;
  }
  return null;
}

export type BillingRow = {
  plan: Plan | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;
};

async function readBillingRow(userId: string) {
  return query(async () => {
    const rows = (await sql`
      select plan, stripe_customer_id, stripe_subscription_id, subscription_status,
             current_period_end, plan_cancelled_at, trial_ends_at
      from users where id = ${userId}
    `) as {
      plan: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string | null;
      current_period_end: string | Date | null;
      plan_cancelled_at: string | Date | null;
      trial_ends_at: string | Date | null;
    }[];
    const row = rows[0];
    if (!row) return null;
    const out: BillingRow = {
      plan: isPlan(row.plan) ? row.plan : null,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
      cancelledAt: row.plan_cancelled_at ? new Date(row.plan_cancelled_at).toISOString() : null,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
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
 * Finds or creates the Stripe Customer behind an account, and stores the id
 * the first time. A student who abandons Checkout and comes back still gets
 * the same customer rather than a fresh one each time.
 *
 * Callers run this inside their own try/catch: both the database read and the
 * Stripe call can throw, and this deliberately does not swallow either — the
 * caller is what knows how to turn a failure into the right response.
 */
async function ensureCustomer(userId: string, email: string, name: string): Promise<string> {
  const existing = await readBillingRow(userId);
  if (!existing.ok) throw new Error(existing.error);
  if (existing.data?.stripeCustomerId) return existing.data.stripeCustomerId;

  const customer = await stripe().customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });
  await sql`update users set stripe_customer_id = ${customer.id} where id = ${userId}`;
  return customer.id;
}

/**
 * Starts a Checkout Session for a brand new subscription: onboarding's plan
 * step for an account with none yet, or resubscribing after a subscription has
 * fully ended. Switching between Pro and Max on an *active* subscription goes
 * through `changePlan` below instead — no need to collect the card again.
 *
 * The trial is only ever offered once per account (never re-offered to a
 * lapsed subscriber) and only for Pro, matching what the onboarding screen
 * itself already says. The one-trial-per-*card* rule can't be checked yet —
 * there is no card until Checkout collects one — so it is enforced afterwards,
 * in `syncSubscription`, once the webhook reveals which card was used.
 */
export async function createCheckoutSession({
  userId,
  email,
  name,
  plan,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!hasBilling()) return { ok: false, error: "Billing is not set up yet." };
  if (!PLAN_AVAILABLE[plan]) return { ok: false, error: "That plan is not available yet." };

  const billing = await readBillingRow(userId);
  if (!billing.ok) return { ok: false, error: billing.error };
  const neverHadTrial = !billing.data?.trialEndsAt;

  try {
    const customerId = await ensureCustomer(userId, email, name);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId(plan), quantity: 1 }],
      // A card is always collected, trial or not — the whole point of asking
      // for one up front is that the trial converts to a real charge on its
      // own, with nothing further for the student to do.
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: plan === "pro" && neverHadTrial ? TRIAL_DAYS : undefined,
        metadata: { userId, plan },
      },
      client_reference_id: userId,
      metadata: { userId, plan },
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

/**
 * Moves an *active* subscription straight to the other plan — no new Checkout,
 * no re-entering a card, because Stripe already has one on file. Prorated, so
 * the difference is billed or credited against the current period rather than
 * waiting for the next one.
 */
export async function changePlan(
  userId: string,
  plan: Plan
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasBilling()) return { ok: false, error: "Billing is not set up yet." };
  if (!PLAN_AVAILABLE[plan]) return { ok: false, error: "That plan is not available yet." };

  const billing = await readBillingRow(userId);
  if (!billing.ok) return { ok: false, error: billing.error };
  const subscriptionId = billing.data?.stripeSubscriptionId;
  if (!subscriptionId || isExpired(billing.data?.subscriptionStatus ?? null)) {
    return { ok: false, error: "You do not have an active plan to switch. Choose a plan to subscribe." };
  }

  try {
    const subscription = await stripe().subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];
    if (!item) return { ok: false, error: "Grasp could not find your subscription. Try again." };
    const updated = await stripe().subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: priceId(plan) }],
      proration_behavior: "create_prorations",
      metadata: { ...subscription.metadata, plan },
    });
    await syncSubscription(updated);
    return { ok: true };
  } catch (err) {
    console.error("[grasp] Stripe plan switch failed:", err);
    return { ok: false, error: "Grasp could not reach Stripe just now. Try again in a moment." };
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

/** Cancels immediately, called only when the account itself is being deleted. */
export async function cancelImmediately(userId: string): Promise<void> {
  const billing = await readBillingRow(userId);
  const subscriptionId = billing.ok ? billing.data?.stripeSubscriptionId : null;
  if (!subscriptionId || !hasBilling()) return;
  try {
    await stripe().subscriptions.cancel(subscriptionId);
  } catch (err) {
    // Best effort: the account row is about to be deleted either way, and a
    // subscription Stripe could not cancel here still shows up in the Stripe
    // dashboard for manual cleanup rather than silently disappearing.
    console.error("[grasp] Stripe subscription cancel on account delete failed:", err);
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
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[grasp] Stripe subscription has no userId metadata:", subscription.id);
    return;
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
          return;
        } catch (err) {
          console.error("[grasp] ending a reused-card trial early failed:", err);
        }
      }
    }
  }

  await writeUser(userId, subscription, plan, periodEnd);
}

async function writeUser(
  userId: string,
  subscription: Stripe.Subscription,
  plan: Plan | undefined,
  periodEndOverride?: number
) {
  const periodEnd = periodEndOverride ?? subscription.items.data[0]?.current_period_end;
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

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
          trial_ends_at = ${trialEndsAt}
      where id = ${userId}
    `;
  } else {
    await sql`
      update users
      set plan = coalesce(${plan ?? null}, plan),
          stripe_subscription_id = ${subscription.id},
          subscription_status = ${subscription.status},
          current_period_end = ${currentPeriodEnd},
          plan_cancelled_at = null,
          trial_ends_at = ${trialEndsAt}
      where id = ${userId}
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

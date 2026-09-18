// One free trial per payment card (§6), server-side only.
//
// The account-level guard — a Checkout Session only ever gets a
// `trial_period_days` when the account's own `trial_ends_at` is still null
// (lib/billing.ts's createCheckoutSession) — stops one account starting a
// second trial. It cannot stop the same person signing up again under a new
// email, which is the abuse that actually costs money: every trial opens a
// fresh week of AI allowances. The card is the only thing that stays the same
// across those signups, so the claim below is keyed on the payment provider's
// card fingerprint — the same card gives the same fingerprint whoever
// presents it, and under whatever email.
//
// Stored as a sha256, like session tokens and rate-limit buckets: the check is
// equality and nothing else, so there is nothing to gain from keeping the
// fingerprint in the clear and a dumped table then names no card.

import { createHash } from "node:crypto";
import { query, sql } from "@/lib/db";

function fingerprintHash(fingerprint: string): string {
  return createHash("sha256").update(`trial:${fingerprint}`).digest("hex");
}

/**
 * Records this card's free trial, and reports whether it was allowed to have
 * one — called from the Stripe webhook (lib/billing.ts's syncSubscription)
 * once a Checkout Session actually reveals which card was used, since there is
 * no card to check before then.
 *
 * `false` means the card has already claimed a trial under a *different*
 * account, and the trial in progress is ended early as a result. A webhook can
 * be retried by Stripe after a timeout or a transient failure on our side, so
 * this has to tell that apart from "this card already had a trial, under this
 * same account" — a bare insert-if-absent could not: a retried call would find
 * the claim it already made on the first attempt and wrongly read it as abuse
 * the second time round.
 *
 * The check and the insert are one statement, so there is no gap between a read
 * and a write for two requests to slip through — the same discipline lib/usage.ts
 * applies to the weekly allowances. `on conflict do nothing` makes the primary
 * key itself do the checking: a row comes back only when this call is the one
 * that created it.
 */
export async function claimOrOwnTrial(fingerprint: string, userId: string) {
  return query(async () => {
    const hash = fingerprintHash(fingerprint);
    const inserted = await sql`
      insert into trial_claims (fingerprint_hash, user_id)
      values (${hash}, ${userId})
      on conflict (fingerprint_hash) do nothing
      returning fingerprint_hash
    `;
    if (inserted.length > 0) return true;
    const existing = (await sql`
      select user_id from trial_claims where fingerprint_hash = ${hash}
    `) as { user_id: string | null }[];
    return existing[0]?.user_id === userId;
  });
}

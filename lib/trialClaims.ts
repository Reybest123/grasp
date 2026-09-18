// One free trial per payment card (§6), server-side only.
//
// The account-level guard in /api/onboarding (`where plan is null`) stops one
// account starting a second trial. It cannot stop the same person signing up
// again under a new email, which is the abuse that actually costs money: every
// trial opens a fresh week of AI allowances. The card is the only thing that
// stays the same across those signups, so the claim is keyed on the payment
// provider's card fingerprint — the same card gives the same fingerprint
// whoever presents it, and under whatever email.
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
 * one. `false` means the card has already claimed a trial, under this account
 * or any other.
 *
 * The check and the insert are one statement, so there is no gap between a read
 * and a write for two requests to slip through — the same discipline lib/usage.ts
 * applies to the weekly allowances. `on conflict do nothing` makes the primary
 * key itself do the checking: a row comes back only when this call is the one
 * that created it.
 */
export async function claimTrial(fingerprint: string, userId: string) {
  return query(async () => {
    const rows = await sql`
      insert into trial_claims (fingerprint_hash, user_id)
      values (${fingerprintHash(fingerprint)}, ${userId})
      on conflict (fingerprint_hash) do nothing
      returning fingerprint_hash
    `;
    return rows.length > 0;
  });
}

// Rate limiting for the account routes. Server-only: imports the database client.
//
// Without this, `/api/auth/login` is a password oracle that answers as fast as
// the network allows. scrypt makes each guess cost ~100ms of Grasp's CPU, which
// slows an attacker down but also means a guessing run is a denial-of-service
// against the server at the same time. Counting the failures and refusing past a
// threshold is what actually stops both.
//
// Two buckets per attempt, and they defend different things:
//
//   account — the email being tried (or the user id, for a password change).
//     This is the one that matters. An attacker working through a wordlist
//     against one student's address cannot avoid it: hitting the account IS the
//     attack, so the bucket fills whatever else they change.
//
//   address — the caller's IP. A weaker signal, and deliberately loose, because
//     schools NAT an entire site behind one address: a class logging in together
//     must not lock each other out. It is also spoofable by anyone who can set
//     `X-Forwarded-For` upstream of our proxy, which is exactly why it is the
//     secondary check and not the primary one. It catches the broad, cheap case
//     of one host spraying many addresses.
//
// Only FAILURES are recorded. A successful login clears its account bucket, so a
// student who finally remembers their password is not left locked out by the
// attempts it took to get there.

import { createHash } from "node:crypto";
import { query, sql } from "@/lib/db";

/** Which route is counting. Each gets its own buckets and its own thresholds. */
export type AuthScope = "login" | "signup" | "password";

type Rule = {
  windowMinutes: number;
  /** Failures against one email/user before that account is refused. */
  perAccount: number;
  /** Failures from one IP before it is refused, across every account. */
  perAddress: number;
};

const RULES: Record<AuthScope, Rule> = {
  // Ten tries at one address is far more than a person mistyping and far fewer
  // than a wordlist needs.
  login: { windowMinutes: 15, perAccount: 10, perAddress: 100 },
  // Each signup sends an email and opens a trial with its own AI allowance, so
  // bulk creation costs real money. The hour-long window is sized for a class
  // signing up together in one lesson, which is the intended launch scenario.
  signup: { windowMinutes: 60, perAccount: 5, perAddress: 40 },
  // Already signed in, but a session left open on a shared computer should not
  // be enough to guess the current password from.
  password: { windowMinutes: 15, perAccount: 10, perAddress: 100 },
};

/** How long a recorded failure is kept before pruning removes it. */
const PRUNE_AFTER_HOURS = 24;

/**
 * Said the same way whoever is asking and whatever they were trying, so it
 * confirms nothing: an attacker learns only that they have been counted, never
 * whether the address exists or the password was close.
 */
const REFUSED = "Too many attempts. Please wait a few minutes and try again.";

export type RateGate =
  | {
      ok: true;
      /** Record this attempt as failed. Call on every rejection, not on success. */
      record: () => Promise<void>;
      /** Forget this account's failures. Call once the attempt succeeds. */
      clear: () => Promise<void>;
    }
  | { ok: false; response: Response };

/**
 * The caller's IP, or null when it cannot be told.
 *
 * Null rather than a shared "unknown" bucket on purpose: pooling every
 * unidentifiable caller together would let one of them lock out all the others.
 * A missing address simply skips that check and leaves the account bucket, which
 * is the stronger one, doing the work.
 */
function addressOf(req: Request): string | null {
  // The left-most entry is the original client; the rest are proxies. Client
  // controlled in principle, hence the comment at the top of this file.
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-real-ip")?.trim() || "";
  return address ? address.slice(0, 64) : null;
}

/** Nothing real ever hashes to this, so it is a bucket that matches no rows. */
const NO_BUCKET = "";

/**
 * Buckets are stored as a SHA-256, never in the clear.
 *
 * Counting is equality and nothing else -- the value is never read back, listed
 * or reported on -- so there is no reason for the table to hold a student's
 * email address or a school's IP address in a form a dumped database would give
 * up. It is the same reasoning behind hashing session tokens and confirmation
 * links, applied to the one table that would otherwise log who tried to log in
 * and from where.
 */
function bucket(scope: AuthScope, kind: "account" | "address", value: string | null): string {
  if (!value) return NO_BUCKET;
  return createHash("sha256").update(`${scope}:${kind}:${value}`).digest("hex");
}

/**
 * Checks both buckets and hands back the recorder.
 *
 * Fails **open** if the database cannot be reached: the route behind this one
 * needs the same database to verify anything, so it is about to fail on its own
 * with a message that describes the real problem. Refusing here instead would
 * report a lockout that is not happening.
 *
 * @param account the email being tried, or the user id for a password change
 */
export async function authRateLimit(
  scope: AuthScope,
  req: Request,
  account: string
): Promise<RateGate> {
  const rule = RULES[scope];
  const address = addressOf(req);
  const accountBucket = bucket(scope, "account", account || null);
  const addressBucket = bucket(scope, "address", address);

  const counted = await query(async () => {
    const rows = (await sql`
      select
        count(*) filter (where bucket = ${accountBucket})::int as account_hits,
        count(*) filter (where bucket = ${addressBucket})::int as address_hits
      from auth_attempts
      where (bucket = ${accountBucket} or bucket = ${addressBucket})
        and created_at > now() - make_interval(mins => ${rule.windowMinutes})
    `) as { account_hits: number; address_hits: number }[];
    return rows[0] ?? { account_hits: 0, address_hits: 0 };
  });

  if (counted.ok) {
    const { account_hits, address_hits } = counted.data;
    if (account_hits >= rule.perAccount || address_hits >= rule.perAddress) {
      return {
        ok: false,
        response: Response.json({ error: REFUSED, rateLimited: true }, { status: 429 }),
      };
    }
  }

  return {
    ok: true,
    record: async () => {
      const buckets = [accountBucket, addressBucket].filter((b) => b !== NO_BUCKET);
      await query(async () => {
        for (const bucket of buckets) {
          await sql`insert into auth_attempts (bucket) values (${bucket})`;
        }
        // Pruned here rather than on a schedule, since there is none. Only
        // occasionally: the table is small and a sweep on every failed login
        // would cost more than it saves.
        if (Math.random() < 0.02) {
          await sql`
            delete from auth_attempts
            where created_at < now() - make_interval(hours => ${PRUNE_AFTER_HOURS})
          `;
        }
      });
    },
    clear: async () => {
      if (accountBucket === NO_BUCKET) return;
      // The address bucket is deliberately left alone. One correct login among
      // many wrong ones is exactly what a successful guessing run looks like,
      // so it must not wipe the evidence of the attempts around it.
      await query(() => sql`delete from auth_attempts where bucket = ${accountBucket}`);
    },
  };
}

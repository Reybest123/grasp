// Sessions — the cookie, the row behind it, and who the request is from.
//
// The token in the cookie is 32 random bytes and nothing else: it carries no
// claims, so there is nothing in it to forge or tamper with, and no signing key
// to manage. What the database stores is the SHA-256 of that token, so a
// dumped `sessions` table hands an attacker no usable session — the same
// reason passwords are not stored in the clear.
//
// This is the authoritative check. `proxy.ts` does an optimistic one (is there
// a cookie at all) to keep unauthenticated visitors out of the app shell, but
// it deliberately never reaches the database, so it can prove nothing — every
// route that returns or writes a student's data calls `requireUser` here.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/sessionCookie";
import { isPlan, type Plan } from "@/lib/plan";
import { isCurrency, type Currency } from "@/lib/currency";
import { SIGNED_OUT_MESSAGE } from "@/lib/accounts";
import { readAdmin } from "@/lib/admin";
import { isExpired } from "@/lib/billing";

export { SESSION_COOKIE };

/** Long enough that a student is not logged out mid-term. */
const SESSION_DAYS = 30;

/**
 * Away this long and the session ends. "Away" means no open Grasp tab: an open
 * one pings /api/auth/heartbeat (components/app/SessionHeartbeat.tsx) well
 * inside this window, so a student who stays on the site is never signed out.
 */
const IDLE_MS = 30 * 60 * 1000;

/** Writing last_seen_at on every request would be a write per debounced save. */
const TOUCH_EVERY_MS = 60 * 1000;

/** Where a page sends a stale session: it clears the cookie, then goes to /login. */
export const EXPIRED_PATH = "/api/auth/expired";

/** Where an account whose subscription has ended is sent to choose a plan again. */
export const RENEW_PATH = "/renew";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  /** null until onboarding is finished */
  plan: Plan | null;
  /** ISO; null for an account not on a free trial */
  trialEndsAt: string | null;
  /** admin override (lib/admin.ts): no weekly allowances or Resource Bank cap */
  unlimited: boolean;
  /** what the account is billed in; null until it first reaches Stripe Checkout */
  currency: Currency | null;
  /** the account had a plan and its subscription has ended; sent to /renew */
  expired: boolean;
};

/** The cookie holds the token; the database holds this. Email links too. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mints a session for a user and sets the cookie.
 *
 * `httpOnly` keeps it away from any script on the page, so an XSS bug cannot
 * read it out. `sameSite: "lax"` means it does not ride along on cross-site
 * POSTs, which is what would otherwise make every mutating route CSRF-able.
 * `secure` is off in development only because localhost is not HTTPS.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Ends the current session in the database as well as in the browser. Deleting
 * the row is the point: a cookie the browser merely forgets would still be a
 * valid credential if it had been copied anywhere.
 */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    // Best effort — if the delete fails the cookie still goes, and the row
    // expires on its own.
    try {
      await sql`delete from sessions where token_hash = ${hashToken(token)}`;
    } catch {
      // Logging out must not fail in the student's face.
    }
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Ends every session the user has except the one making this request. A
 * password change calls it, so a device that signed in with the old password
 * does not stay signed in after it is replaced.
 */
export async function endOtherSessions(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  await sql`delete from sessions where user_id = ${userId} and token_hash <> ${hashToken(token)}`;
}

/**
 * Who the request is from, or null. One query, joined, because every protected
 * route calls this before it does anything else.
 *
 * An expired row is treated as absent and deleted on sight, so the table does
 * not accumulate dead sessions without a separate sweep. So is one unused for
 * 30 minutes, which is what signs out a student who closed Grasp and came back
 * later.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const found = await lookupSession();
  return found === "none" || found === "error" ? null : found;
}

/**
 * The lookup behind `currentUser`, which also says why there is no user:
 * "none" is a missing, expired or idle session, "error" is a database that
 * could not be asked. Pages need the difference: a stale session should go to
 * log in, a database blip should not bounce a student who is fine.
 */
async function lookupSession(): Promise<SessionUser | "none" | "error"> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return "none";
  const hash = hashToken(token);

  try {
    const rows = (await sql`
      select u.id, u.email, u.name, u.email_verified_at, u.plan, u.trial_ends_at,
             u.currency, u.subscription_status, s.expires_at, s.last_seen_at
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = ${hash}
    `) as {
      id: string;
      email: string;
      name: string;
      email_verified_at: string | null;
      plan: string | null;
      trial_ends_at: string | Date | null;
      currency: string | null;
      subscription_status: string | null;
      expires_at: string | Date;
      last_seen_at: string | Date;
    }[];

    const row = rows[0];
    if (!row) return "none";

    const now = Date.now();
    const lastSeen = new Date(row.last_seen_at).getTime();
    if (new Date(row.expires_at).getTime() <= now || now - lastSeen > IDLE_MS) {
      await sql`delete from sessions where token_hash = ${hash}`;
      return "none";
    }
    if (now - lastSeen > TOUCH_EVERY_MS) {
      await sql`update sessions set last_seen_at = now() where token_hash = ${hash}`;
    }

    // Applied here, where the plan is first read, so every limit check and
    // /api/auth/me follow it without knowing it exists. Only for an account
    // that already has a plan, so it never skips anyone past onboarding.
    const plan = isPlan(row.plan) ? row.plan : null;
    const admin = plan ? await readAdmin() : null;
    const forced = admin?.plan ?? null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      verified: row.email_verified_at !== null,
      plan: forced ?? plan,
      // Only a trial still running. The column keeps its date after the trial
      // converts (it is what stops the account taking a second one), so a past
      // date means a paying student, not someone on a trial. A forced plan
      // reads as the plan itself, not as a trial of it.
      trialEndsAt:
        forced || !row.trial_ends_at || new Date(row.trial_ends_at).getTime() <= Date.now()
          ? null
          : new Date(row.trial_ends_at).toISOString(),
      unlimited: admin?.unlimited === true,
      currency: isCurrency(row.currency) ? row.currency : null,
      expired: !forced && plan !== null && isExpired(row.subscription_status),
    };
  } catch (err) {
    console.error("[grasp] session lookup failed:", err);
    return "error";
  }
}

export type Guard =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response };

/**
 * The gate every data route opens with. Returns the user or an error to hand
 * straight back, so a route can never accidentally continue unauthenticated:
 *
 *   const guard = await requireUser();
 *   if (!guard.ok) return guard.response;
 *
 * An account whose email is not confirmed is refused too, unless the route
 * opts in with `allowUnverified` — which only the routes a student needs in
 * order to get confirmed should do. So is one that has not finished onboarding
 * by choosing a plan, unless the route opts in with `allowNoPlan` — only
 * app/api/checkout does, since it is how such an account gets a plan in the
 * first place. An unconfirmed account cannot have a plan yet, so
 * `allowUnverified` implies it. An account whose subscription has ended is
 * refused too, unless the route opts in with `allowExpired`: only the account
 * and billing routes do, since they are how it logs out, deletes itself or
 * pays again. `allowNoPlan` implies it.
 */
export async function requireUser({
  allowUnverified = false,
  allowNoPlan = allowUnverified,
  allowExpired = allowNoPlan,
}: { allowUnverified?: boolean; allowNoPlan?: boolean; allowExpired?: boolean } = {}): Promise<Guard> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: SIGNED_OUT_MESSAGE }, { status: 401 }),
    };
  }
  if (!user.verified && !allowUnverified) {
    return {
      ok: false,
      response: Response.json(
        { error: "Confirm your email address first. The link is in your inbox.", unverified: true },
        { status: 403 }
      ),
    };
  }
  if (!user.plan && !allowNoPlan) {
    return {
      ok: false,
      response: Response.json(
        { error: "Finish setting up your account first.", onboarding: true },
        { status: 403 }
      ),
    };
  }
  if (user.expired && !allowExpired) {
    return {
      ok: false,
      response: Response.json(
        { error: "Your plan has ended. Choose a plan to keep using Grasp.", expired: true },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}

/**
 * The page-level counterparts, for server layouts. Each sends the student to
 * the step they have not finished before anything renders, so there is no
 * flash of a screen whose every request is about to be refused.
 *
 * An expired or idle session goes to log in through EXPIRED_PATH: the cookie is
 * still there, and proxy.ts would bounce a cookie-carrying visit to /login
 * straight back to /home. A lookup that fails because the database is down is
 * left alone, so it does not bounce a student who is fine.
 */
export async function guardAppPage(): Promise<SessionUser | null> {
  const user = await lookupSession();
  // Null rather than a throw when the database is down: the layout still
  // renders, and whatever it needed the user for falls back on its own.
  if (user === "error") return null;
  if (user === "none") redirect(EXPIRED_PATH);
  if (!user.verified) redirect("/verify-email");
  if (!user.plan) redirect("/onboarding");
  if (user.expired) redirect(RENEW_PATH);
  return user;
}

/** Onboarding runs once: after the email is confirmed, and never again once a plan is chosen. */
export async function guardOnboardingPage(): Promise<SessionUser | null> {
  const user = await lookupSession();
  if (user === "error") return null;
  if (user === "none") redirect(EXPIRED_PATH);
  if (!user.verified) redirect("/verify-email");
  if (user.plan) redirect("/home");
  return user;
}

/** The renew page is only for an account whose plan has ended; anyone else goes where they belong. */
export async function guardRenewPage(): Promise<SessionUser | null> {
  const user = await lookupSession();
  if (user === "error") return null;
  if (user === "none") redirect(EXPIRED_PATH);
  if (!user.verified) redirect("/verify-email");
  if (!user.plan) redirect("/onboarding");
  if (!user.expired) redirect("/home");
  return user;
}

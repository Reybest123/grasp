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

export { SESSION_COOKIE };

/** Long enough that a student is not logged out mid-term. */
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  /** null until onboarding is finished */
  plan: Plan | null;
  /** ISO; null for an account not on a free trial */
  trialEndsAt: string | null;
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
 * not accumulate dead sessions without a separate sweep.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const rows = (await sql`
      select u.id, u.email, u.name, u.email_verified_at, u.plan, u.trial_ends_at, s.expires_at
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = ${hashToken(token)}
    `) as {
      id: string;
      email: string;
      name: string;
      email_verified_at: string | null;
      plan: string | null;
      trial_ends_at: string | Date | null;
      expires_at: string;
    }[];

    const row = rows[0];
    if (!row) return null;

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await sql`delete from sessions where token_hash = ${hashToken(token)}`;
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      verified: row.email_verified_at !== null,
      plan: isPlan(row.plan) ? row.plan : null,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
    };
  } catch (err) {
    console.error("[grasp] session lookup failed:", err);
    return null;
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
 * by choosing a plan, unless the route opts in with `allowNoPlan`. An
 * unconfirmed account cannot have a plan yet, so `allowUnverified` implies it.
 */
export async function requireUser({
  allowUnverified = false,
  allowNoPlan = allowUnverified,
}: { allowUnverified?: boolean; allowNoPlan?: boolean } = {}): Promise<Guard> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Not signed in." }, { status: 401 }),
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
  return { ok: true, user };
}

/**
 * The page-level counterparts, for server layouts. Each sends the student to
 * the step they have not finished before anything renders, so there is no
 * flash of a screen whose every request is about to be refused.
 *
 * A missing or expired session is left alone: proxy.ts already keeps cookieless
 * visitors out, and a lookup that fails because the database is down should
 * not bounce a student who is fine.
 */
export async function guardAppPage(): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  if (!user.verified) redirect("/verify-email");
  if (!user.plan) redirect("/onboarding");
}

/** Onboarding runs once: after the email is confirmed, and never again once a plan is chosen. */
export async function guardOnboardingPage(): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  if (!user.verified) redirect("/verify-email");
  if (user.plan) redirect("/home");
}

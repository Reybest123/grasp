// Log in.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/accounts";
import { authRateLimit } from "@/lib/rateLimit";

/**
 * One message for every failure mode — wrong password, no such account, empty
 * field. Saying "no account with that email" would turn this form into a way
 * for a stranger to test whether someone has a Grasp account.
 */
const REJECTED = "The email address or password is incorrect.";

/**
 * `field` tells the form which box to show the message under. It is always the
 * password box, which says nothing about whether the email exists; the form
 * outlines both boxes, since either one could be the wrong one.
 */
const rejected = () => NextResponse.json({ error: REJECTED, field: "password" }, { status: 401 });

/**
 * A real hash of a random password, checked when the email has no account, so
 * a missing account costs the same scrypt run as a wrong password. It has to
 * be well-formed: verifyPassword refuses a malformed one before hashing
 * anything, which made unknown emails answer instantly.
 */
const DUMMY_HASH = hashPassword(crypto.randomUUID());

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  // Before the password is verified, not after: scrypt is ~100ms of CPU by
  // design, so letting an unbounded number of guesses reach it is both the
  // password-guessing hole and a way to exhaust the server.
  const gate = await authRateLimit("login", req, email);
  if (!gate.ok) return gate.response;

  // A blank field is still a failed attempt. Not recording it would leave a
  // free way to keep the bucket empty while probing with something else.
  if (!email || !password) {
    await gate.record();
    return rejected();
  }

  const result = await query(async () => {
    const rows = (await sql`
      select id, email, name, password_hash from users where email = ${email}
    `) as { id: string; email: string; name: string; password_hash: string }[];
    return rows[0] ?? null;
  });

  if (!result.ok) {
    // A database fault is Grasp's problem, not a failed attempt: counting it
    // would lock students out of an account they typed correctly.
    await gate.release();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = result.data;
  // Verified even when there is no such user, against a hash that cannot match,
  // so a missing account and a wrong password take the same time to reject.
  // Otherwise the difference between an instant 401 and a ~100ms one tells a
  // stranger which addresses are registered.
  const stored = user?.password_hash ?? (await DUMMY_HASH);
  const valid = await verifyPassword(password, stored);

  if (!user || !valid) {
    await gate.record();
    return rejected();
  }

  // Cleared on success, so the tries it took to remember the password do not
  // count against the next login.
  await gate.clear();
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}

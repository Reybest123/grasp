// Log in.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/accounts";

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) return rejected();

  const result = await query(async () => {
    const rows = (await sql`
      select id, email, name, password_hash from users where email = ${email}
    `) as { id: string; email: string; name: string; password_hash: string }[];
    return rows[0] ?? null;
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = result.data;
  // Verified even when there is no such user, against a hash that cannot match,
  // so a missing account and a wrong password take the same time to reject.
  // Otherwise the difference between an instant 401 and a ~100ms one tells a
  // stranger which addresses are registered.
  const stored = user?.password_hash ?? "scrypt$32768$8$1$00$00";
  const valid = await verifyPassword(password, stored);

  if (!user || !valid) return rejected();

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}

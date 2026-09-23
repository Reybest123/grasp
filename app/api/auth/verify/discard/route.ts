// "Wrong address?" on the check-your-email page. Deletes the account rather
// than only logging out, so the address is free to sign up with again and a
// mistyped one (someone else's inbox) is not left holding an account.
//
// Only an unconfirmed account can be removed this way, and one can hold
// nothing: every data route and Checkout refuse it until it is confirmed.

import { NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/session";

export async function POST() {
  const guard = await requireUser({ allowUnverified: true });
  if (!guard.ok) return guard.response;

  if (guard.user.verified) {
    return NextResponse.json(
      { error: "This account is already confirmed. Delete it from Settings instead." },
      { status: 409 }
    );
  }

  const deleted = await query(
    () => sql`delete from users where id = ${guard.user.id} and email_verified_at is null`
  );
  if (!deleted.ok) return NextResponse.json({ error: deleted.error }, { status: deleted.status });

  await destroySession();
  return NextResponse.json({ ok: true });
}

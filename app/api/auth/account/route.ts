// Delete the account, and through the schema's cascades everything in it.
//
// Needs the password for the same reason changing it does: an unattended
// signed-in laptop should not be one click away from wiping someone's notes.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { destroySession, requireUser } from "@/lib/session";
import { cancelImmediately, isExpired } from "@/lib/billing";

export async function DELETE(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const found = await query(async () => {
    const rows = (await sql`
      select password_hash, plan, plan_cancelled_at, subscription_status
      from users where id = ${guard.user.id}
    `) as {
      password_hash: string;
      plan: string | null;
      plan_cancelled_at: string | Date | null;
      subscription_status: string | null;
    }[];
    return rows[0] ?? null;
  });
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });

  // Checked here as well as in Settings. A subscription Stripe has already
  // ended outright never had a cancel date written, and there is nothing left
  // to cancel on the Plans page, so it does not block deletion.
  const row = found.data;
  if (row?.plan && !row.plan_cancelled_at && !isExpired(row.subscription_status)) {
    return NextResponse.json(
      { error: "Cancel your plan on the Plans page before deleting your account.", planActive: true },
      { status: 409 }
    );
  }

  if (!found.data || !(await verifyPassword(password, found.data.password_hash))) {
    return NextResponse.json({ error: "That password is not right." }, { status: 403 });
  }

  // Cancelled from Grasp's side (see the check above) is only ever scheduled
  // to stop at the period's end. The account is about to disappear entirely,
  // so the subscription is ended in Stripe right now rather than left running
  // — billed to a card nobody signed in to Grasp can see or stop any more.
  await cancelImmediately(guard.user.id);

  // Every table in db/schema.sql hangs off users with `on delete cascade`, so
  // this one row takes the sessions, subjects, notes, quizzes and resources.
  const deleted = await query(() => sql`delete from users where id = ${guard.user.id}`);
  if (!deleted.ok) return NextResponse.json({ error: deleted.error }, { status: deleted.status });

  await destroySession();
  return NextResponse.json({ ok: true });
}

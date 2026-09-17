// Whether the signed-in student's plan is cancelled, and cancelling or resuming it.
//
// There is no billing yet, so cancelling only records the choice: the plan keeps
// working until its current period ends, the same as it will once payments
// exist (see the refunds section of the Terms). It is what account deletion
// waits on, so nobody deletes an account with a plan still running.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";

async function read(userId: string) {
  return query(async () => {
    const rows = (await sql`
      select plan_cancelled_at from users where id = ${userId}
    `) as { plan_cancelled_at: string | Date | null }[];
    const at = rows[0]?.plan_cancelled_at;
    return at ? new Date(at).toISOString() : null;
  });
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const found = await read(guard.user.id);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });
  return NextResponse.json({ cancelledAt: found.data });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  if (typeof body.cancelled !== "boolean") {
    return NextResponse.json({ error: "Grasp could not tell what to change." }, { status: 400 });
  }

  // `coalesce` keeps the original date if cancel is pressed twice.
  const updated = await query(() =>
    body.cancelled
      ? sql`update users set plan_cancelled_at = coalesce(plan_cancelled_at, now()) where id = ${guard.user.id}`
      : sql`update users set plan_cancelled_at = null where id = ${guard.user.id}`
  );
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  const found = await read(guard.user.id);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });
  return NextResponse.json({ cancelledAt: found.data });
}

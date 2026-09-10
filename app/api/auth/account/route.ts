// Delete the account, and through the schema's cascades everything in it.
//
// Needs the password for the same reason changing it does: an unattended
// signed-in laptop should not be one click away from wiping someone's notes.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { destroySession, requireUser } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const found = await query(async () => {
    const rows = (await sql`
      select password_hash from users where id = ${guard.user.id}
    `) as { password_hash: string }[];
    return rows[0]?.password_hash ?? null;
  });
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });

  if (!found.data || !(await verifyPassword(password, found.data))) {
    return NextResponse.json({ error: "That password is not right." }, { status: 403 });
  }

  // Every table in db/schema.sql hangs off users with `on delete cascade`, so
  // this one row takes the sessions, subjects, notes, quizzes and resources.
  const deleted = await query(() => sql`delete from users where id = ${guard.user.id}`);
  if (!deleted.ok) return NextResponse.json({ error: deleted.error }, { status: deleted.status });

  await destroySession();
  return NextResponse.json({ ok: true });
}

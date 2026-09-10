// Change password.
//
// Asks for the current password even though the request is already signed in:
// a session left open on a shared school computer should not be enough to lock
// the account's owner out. Every other session is ended afterwards.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { endOtherSessions, requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  const problem = passwordProblem(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const found = await query(async () => {
    const rows = (await sql`
      select password_hash from users where id = ${guard.user.id}
    `) as { password_hash: string }[];
    return rows[0]?.password_hash ?? null;
  });
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });

  if (!found.data || !(await verifyPassword(current, found.data))) {
    return NextResponse.json({ error: "That is not your current password." }, { status: 403 });
  }
  if (current === next) {
    return NextResponse.json(
      { error: "That is already your password. Choose a new one." },
      { status: 400 }
    );
  }

  const hash = await hashPassword(next);
  const saved = await query(async () => {
    await sql`update users set password_hash = ${hash} where id = ${guard.user.id}`;
    await endOtherSessions(guard.user.id);
  });
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });

  return NextResponse.json({ ok: true });
}

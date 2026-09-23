// Change password.
//
// Asks for the current password even though the request is already signed in:
// a session left open on a shared school computer should not be enough to lock
// the account's owner out. Every other session is ended afterwards.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { endOtherSessions, requireUser } from "@/lib/session";
import { authRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  // Keyed on the user id rather than the email: the request is already signed
  // in, so this is not about who they claim to be but about how many guesses at
  // the current password one session gets. A laptop left open in a common room
  // is the case it covers.
  const gate = await authRateLimit("password", req, guard.user.id);
  if (!gate.ok) return gate.response;

  const problem = passwordProblem(next, guard.user.email);
  if (problem) {
    await gate.release();
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const found = await query(async () => {
    const rows = (await sql`
      select password_hash from users where id = ${guard.user.id}
    `) as { password_hash: string }[];
    return rows[0]?.password_hash ?? null;
  });
  if (!found.ok) {
    await gate.release();
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  if (!found.data || !(await verifyPassword(current, found.data))) {
    await gate.record();
    return NextResponse.json({ error: "That is not your current password." }, { status: 403 });
  }
  if (current === next) {
    await gate.release();
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
  if (!saved.ok) {
    await gate.release();
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }

  await gate.clear();
  return NextResponse.json({ ok: true });
}

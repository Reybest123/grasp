// Reset password: the link's token plus a new password.
//
// Does not sign the student in. Every session is ended by the reset, and they
// log in with the new password, which also proves they typed what they meant.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { EXPIRED_RESET_LINK, completePasswordReset, resetLinkAccount } from "@/lib/passwordReset";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  const account = await query(() => resetLinkAccount(token));
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  if (!account.data) return NextResponse.json({ error: EXPIRED_RESET_LINK, expired: true }, { status: 410 });

  const problem = passwordProblem(password, account.data.email);
  if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });

  const hash = await hashPassword(password);
  const saved = await query(() => completePasswordReset(account.data!.id, hash));
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });

  return NextResponse.json({ ok: true });
}

// Forgot password: mail a reset link.
//
// The answer is the same whether or not the address has an account, and it
// comes back before the email is sent rather than after. Waiting on the send
// would make a registered address noticeably slower to answer than an unknown
// one, which is the same leak the login route's single message closes.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { emailProblem, normalizeEmail } from "@/lib/accounts";
import { authRateLimit } from "@/lib/rateLimit";
import { sendPasswordReset } from "@/lib/passwordReset";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);

  const problem = emailProblem(email);
  if (problem) return NextResponse.json({ error: problem, field: "email" }, { status: 400 });

  const gate = await authRateLimit("reset", req, email);
  if (!gate.ok) return gate.response;
  await gate.record();

  const found = await query(async () => {
    const rows = (await sql`
      select id, email, name from users where email = ${email}
    `) as { id: string; email: string; name: string }[];
    return rows[0] ?? null;
  });
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });

  if (found.data) {
    // Not awaited, for the timing reason above. Railway runs one long-lived
    // server, so the send still finishes after the response has gone.
    sendPasswordReset(found.data, req.nextUrl.origin).catch((err) =>
      console.error("[grasp] password reset email failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}

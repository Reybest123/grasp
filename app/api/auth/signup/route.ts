// Create an account (CLAUDE.md §10 — auth is the first MVP line item).
//
// Signup is the first half of onboarding (§2): the student gives a name, an
// email and a password here, is signed in, and is sent a confirmation link.
// The app stays closed to the account until that link is clicked
// (requireUser in lib/session.ts); the timetable step comes after.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { normalizeEmail, emailProblem } from "@/lib/accounts";
import { sendVerification } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const email = normalizeEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const password = typeof body.password === "string" ? body.password : "";

  const problem = emailProblem(email) ?? passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const hash = await hashPassword(password);

  const result = await query(async () => {
    // `on conflict do nothing` rather than a select-then-insert: two signups
    // racing on the same address would both pass the select and one would then
    // violate the unique index. This way the database decides, once.
    const rows = (await sql`
      insert into users (email, name, password_hash)
      values (${email}, ${name}, ${hash})
      on conflict (email) do nothing
      returning id
    `) as { id: string }[];
    return rows[0] ?? null;
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.data) {
    // Deliberately explicit. Login pages hide whether an address exists to
    // avoid confirming it to a stranger, but a signup form cannot: it has to
    // say why it will not create the account, and "that email is taken" is
    // already implied by the fact that signup failed.
    return NextResponse.json(
      { error: "There is already an account with that email. Log in instead." },
      { status: 409 }
    );
  }

  // Signing up while logged in to another account switches accounts, so that
  // account's session is ended properly rather than left valid behind the new one.
  await destroySession();
  await createSession(result.data.id);

  // A mail that fails to send does not fail the signup: the account exists
  // either way, and the check-your-email page can send it again.
  const sent = await query(() =>
    sendVerification({ id: result.data.id, email, name }, req.nextUrl.origin)
  );
  return NextResponse.json({
    user: { id: result.data.id, email, name, verified: false },
    emailSent: sent.ok && sent.data === "sent",
  });
}

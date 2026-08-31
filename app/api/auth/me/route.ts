// Who is signed in, and rename them.
//
// The client stores hold no identity of their own now: `ProfileProvider` asks
// this on mount instead of reading localStorage, which is what makes the
// greeting and the header monogram belong to an account rather than to a
// browser.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { currentUser, requireUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  // Not an error: the landing page and the login form both ask this, and "no
  // one" is a perfectly good answer there.
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";

  const result = await query(
    () => sql`update users set name = ${name} where id = ${guard.user.id}`
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: { ...guard.user, name } });
}

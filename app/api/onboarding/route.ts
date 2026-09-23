// Stores onboarding's three answers the moment the last one is given, before
// any plan is chosen, so a student who leaves at the plan step comes back to
// it (app/onboarding/page.tsx) rather than to the first question.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseAnswers } from "@/lib/onboarding";

export async function POST(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const answers = parseAnswers(body.answers);
  if (!answers) {
    return NextResponse.json({ error: "Answer the three questions first." }, { status: 400 });
  }
  const saved = await query(
    () => sql`update users set onboarding = ${JSON.stringify(answers)}::jsonb where id = ${guard.user.id}`
  );
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ ok: true });
}

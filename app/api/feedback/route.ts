// A student flagging an AI answer as wrong (§9.2). Keeps a copy of what was
// flagged so it can be looked into; nothing is sent anywhere else.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";

const SOURCES = ["enhance", "explain", "quiz-mark", "quiz-explain", "live-notes"] as const;
const MAX_OUTPUT = 20_000;

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { source, output } = await req.json().catch(() => ({}));
  if (!SOURCES.includes(source) || typeof output !== "string" || !output.trim()) {
    return NextResponse.json({ error: "Nothing to flag." }, { status: 400 });
  }

  const result = await query(
    () => sql`
      insert into feedback (user_id, source, output)
      values (${guard.user.id}, ${source}, ${output.slice(0, MAX_OUTPUT)})
    `
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
